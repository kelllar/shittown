#!/usr/bin/env python3
"""Headless test for the SHITTOWN WebSocket relay (stdlib only)."""
import base64
import json
import os
import socket
import struct
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import multiplayer_server as relay

FAILS = []


def check(name, ok, detail=""):
    if ok:
        print("  ok   %s" % name)
    else:
        print("  FAIL %s  %s" % (name, detail))
        FAILS.append(name)


def handshake(port):
    sock = socket.create_connection(("127.0.0.1", port), timeout=4)
    key = base64.b64encode(os.urandom(16)).decode()
    sock.sendall((
        "GET /ws HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\n"
        "Connection: Upgrade\r\nSec-WebSocket-Key: %s\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n" % key
    ).encode())
    data = b""
    # byte-by-byte so we do not swallow the first WebSocket frame
    while not data.endswith(b"\r\n\r\n"):
        chunk = sock.recv(1)
        if not chunk:
            break
        data += chunk
    ok = b"101 Switching Protocols" in data
    sock.settimeout(6)
    return sock, ok


def read_exact(sock, n):
    data = b""
    while len(data) < n:
        chunk = sock.recv(n - len(data))
        if not chunk:
            raise OSError("closed")
        data += chunk
    return data


def recv_frame(sock):
    b1, b2 = read_exact(sock, 2)
    opcode = b1 & 0x0F
    length = b2 & 0x7F
    if length == 126:
        length = struct.unpack(">H", read_exact(sock, 2))[0]
    elif length == 127:
        length = struct.unpack(">Q", read_exact(sock, 8))[0]
    return opcode, read_exact(sock, length)


def send_text(sock, obj):
    payload = json.dumps(obj).encode()
    mask = os.urandom(4)
    masked = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
    head = bytes([0x81])
    n = len(masked)
    if n < 126:
        head += bytes([0x80 | n])
    else:
        head += bytes([0x80 | 126]) + struct.pack(">H", n)
    sock.sendall(head + mask + masked)


def recv_json(sock, timeout=3):
    end = time.time() + timeout
    while time.time() < end:
        opcode, payload = recv_frame(sock)
        if opcode == 1:
            return json.loads(payload.decode())
        if opcode == 8:
            return {"t": "close"}
    return None


def main():
    server = relay.start("127.0.0.1", 0)
    port = server.server_address[1]
    print("relay:")
    a, ok_a = handshake(port)
    check("websocket handshake", ok_a)
    wa = recv_json(a)
    check("welcome assigns an id", bool(wa and wa.get("t") == "welcome" and wa.get("id")))
    b, ok_b = handshake(port)
    check("second websocket handshake", ok_b)
    wb = recv_json(b)
    check("second welcome has an id", bool(wb and wb.get("t") == "welcome"))
    join = recv_json(a)
    check("join is broadcast", bool(join and join.get("t") == "join" and join.get("id") == wb.get("id")))
    send_text(a, {"t": "state", "x": 12.5, "y": 1, "z": 4, "yaw": 1.2, "v": "car"})
    state = recv_json(b)
    check("state is relayed", bool(state and state.get("t") == "state" and state.get("x") == 12.5))
    send_text(a, {"t": "chat", "text": "hello shittown"})
    chat = recv_json(b)
    check("chat is relayed", bool(chat and chat.get("t") == "chat" and chat.get("text") == "hello shittown"))
    send_text(a, {"t": "hit", "to": wb.get("id"), "dmg": 7})
    hit = recv_json(b)
    check("punch is routed", bool(hit and hit.get("t") == "hit" and hit.get("dmg") == 7))
    a.close()
    b.close()
    time.sleep(0.2)
    server.shutdown()
    server.server_close()
    if FAILS:
        print("\nFAILED: %d" % len(FAILS))
        return 1
    print("\nWS CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
