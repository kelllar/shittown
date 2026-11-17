#!/usr/bin/env python3
"""SHITTOWN online relay: a tiny WebSocket server with no dependencies.

Standard library only. It does not simulate the world; it relays player state,
chat, and hit events between browsers. Run it through serve.py --online.
"""
from __future__ import annotations

import base64
import hashlib
import json
import socketserver
import struct
import threading

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"


def _frame(data: bytes, opcode: int = 1) -> bytes:
    header = bytes([0x80 | opcode])
    n = len(data)
    if n < 126:
        header += bytes([n])
    elif n < 65536:
        header += bytes([126]) + struct.pack(">H", n)
    else:
        header += bytes([127]) + struct.pack(">Q", n)
    return header + data


class Room:
    def __init__(self):
        self.lock = threading.Lock()
        self.clients = {}
        self.states = {}
        self.next_id = 1

    def add(self, handler) -> int:
        with self.lock:
            cid = self.next_id
            self.next_id += 1
            self.clients[cid] = handler
        return cid

    def remove(self, cid):
        with self.lock:
            self.clients.pop(cid, None)
            self.states.pop(cid, None)
        self.broadcast({"t": "leave", "id": cid})

    def player_list(self):
        with self.lock:
            return [
                {"id": cid, "name": h.name, "state": self.states.get(cid)}
                for cid, h in self.clients.items()
            ]

    def broadcast(self, msg, exclude=None):
        raw = json.dumps(msg)
        with self.lock:
            targets = list(self.clients.items())
        dead = []
        for cid, handler in targets:
            if cid == exclude:
                continue
            try:
                handler.send_text(raw)
            except OSError:
                dead.append(cid)
        for cid in dead:
            self.remove(cid)


class WSHandler(socketserver.BaseRequestHandler):
    room: Room = None

    def setup(self):
        self.name = "PLAYER"
        self.cid = None
        self.send_lock = threading.Lock()
        self.alive = True

    def handle(self):
        sock = self.request
        sock.settimeout(60)
        data = b""
        try:
            while b"\r\n\r\n" not in data:
                chunk = sock.recv(2048)
                if not chunk:
                    return
                data += chunk
        except OSError:
            return
        head = data.split(b"\r\n\r\n", 1)[0].decode("latin-1")
        headers = {}
        for line in head.split("\r\n")[1:]:
            if ":" in line:
                k, v = line.split(":", 1)
                headers[k.strip().lower()] = v.strip()
        key = headers.get("sec-websocket-key")
        if not key:
            sock.sendall(b"HTTP/1.1 400 Bad Request\r\n\r\n")
            return
        accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        sock.sendall((
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
        ).encode())
        self.room = self.server.room
        self.cid = self.room.add(self)
        self.name = "SHITASS-%d" % self.cid
        self.send_json({"t": "welcome", "id": self.cid, "players": self.room.player_list()})
        self.room.broadcast({"t": "join", "id": self.cid, "name": self.name}, exclude=self.cid)
        try:
            while self.alive:
                opcode, payload = self.read_frame()
                if opcode == 8:
                    break
                if opcode == 9:
                    self.send_frame(payload, 10)
                    continue
                if opcode != 1:
                    continue
                try:
                    msg = json.loads(payload.decode("utf-8"))
                except (ValueError, UnicodeDecodeError):
                    continue
                t = msg.get("t")
                if t == "state":
                    msg["id"] = self.cid
                    msg["name"] = self.name
                    with self.room.lock:
                        self.room.states[self.cid] = msg
                    self.room.broadcast(msg, exclude=self.cid)
                elif t == "chat":
                    text = str(msg.get("text", ""))[:120]
                    if text:
                        self.room.broadcast({"t": "chat", "id": self.cid, "name": self.name, "text": text})
                elif t == "hit":
                    target = self.room.clients.get(msg.get("to"))
                    if target:
                        dmg = max(1, min(40, int(msg.get("dmg", 10))))
                        target.send_json({"t": "hit", "from": self.cid, "name": self.name, "dmg": dmg})
                elif t == "name":
                    name = str(msg.get("name", ""))[:18].strip()
                    if name:
                        self.name = name
                        self.room.broadcast({"t": "name", "id": self.cid, "name": name})
        except (OSError, struct.error):
            pass
        finally:
            self.alive = False
            if self.cid:
                self.room.remove(self.cid)

    def read_frame(self):
        sock = self.request
        b1, b2 = self._read(2)
        opcode = b1 & 0x0F
        masked = b2 & 0x80
        length = b2 & 0x7F
        if length == 126:
            length = struct.unpack(">H", self._read(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._read(8))[0]
        mask = self._read(4) if masked else b"\x00\x00\x00\x00"
        payload = self._read(length)
        if masked:
            payload = bytes(b ^ mask[i % 4] for i, b in enumerate(payload))
        return opcode, payload

    def _read(self, n):
        data = b""
        while len(data) < n:
            chunk = self.request.recv(n - len(data))
            if not chunk:
                raise OSError("closed")
            data += chunk
        return data

    def send_frame(self, data: bytes, opcode: int = 1):
        with self.send_lock:
            self.request.sendall(_frame(data, opcode))

    def send_text(self, text: str):
        self.send_frame(text.encode("utf-8"), 1)

    def send_json(self, msg):
        self.send_text(json.dumps(msg))


class RelayServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, addr):
        super().__init__(addr, WSHandler)
        self.room = Room()


def start(host: str, port: int) -> RelayServer:
    server = RelayServer((host, port))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4353
    srv = start("0.0.0.0", port)
    print("SHITTOWN relay on ws://0.0.0.0:%d" % port)
    try:
        while True:
            threading.Event().wait(3600)
    except KeyboardInterrupt:
        srv.shutdown()
