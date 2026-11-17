#!/usr/bin/env python3
"""Start SHITTOWN locally. Use --online to expose the town on your network.

Online mode binds the HTTP server and the WebSocket relay to 0.0.0.0, so other
machines on the same network can join. There is no matchmaking, no accounts,
and no security beyond your router; do not port-forward this to the open
internet unless you know what you are doing.
"""
from __future__ import annotations

import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

HERE = os.path.dirname(os.path.abspath(__file__))
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
ONLINE = "--online" in sys.argv
PORT = int(ARGS[0]) if ARGS else 4351
HOST = "0.0.0.0" if ONLINE else "127.0.0.1"


def lan_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=HERE, **kwargs)

    def log_message(self, fmt, *args):  # keep the console clean
        pass


def main() -> int:
    socketserver.TCPServer.allow_reuse_address = True
    try:
        httpd = socketserver.ThreadingTCPServer(("127.0.0.1", PORT), QuietHandler)
    except OSError:
        print("Port %d is busy. Try: python3 serve.py 4352" % PORT)
        return 1
    url = "http://localhost:%d/index.html" % PORT
    print("SHITTOWN: %s" % url)
    print("Press Ctrl+C to stop. Audio is off until you turn the soundtrack on.")
    threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nTown closed.")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
