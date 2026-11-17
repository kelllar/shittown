"""A minimal Chrome DevTools Protocol client, standard library only.

The UI tests use it to look at the panel in both system appearances at several
viewport widths, to read back computed styles and to take screenshots. Chrome is
optional: every test that needs it skips when it is not installed.

Why CDP instead of AppleScript? The things under test are CSS media queries
(``prefers-color-scheme``) and layout metrics. CDP emulates both without touching
the user's real system settings.
"""

from __future__ import annotations

import base64
import json
import os
import socket
import struct
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

CHROME_PATHS = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
)

# Every visible text node is measured against the background it is actually
# painted on: translucent layers are composited up the tree first, which is what
# a person sees. Sizes at or above 18.66px bold (or 24px) use the large-text
# threshold of 3:1; everything else must reach 4.5:1.
CONTRAST_PROBE = r"""
(() => {
  const parse = (value) => {
    const m = /^rgba?\(([^)]+)\)$/.exec(String(value).trim());
    if (!m) return null;
    const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
    return { r: parts[0], g: parts[1], b: parts[2],
             a: parts.length > 3 ? parts[3] : 1 };
  };
  const flatten = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const canvas = parse(getComputedStyle(document.documentElement).backgroundColor)
    || { r: 255, g: 255, b: 255, a: 1 };
  const backgroundOf = (node) => {
    const own = parse(getComputedStyle(node).backgroundColor);
    if (own && own.a === 1) return own;
    const parent = node.parentElement ? backgroundOf(node.parentElement) : canvas;
    return own && own.a > 0 ? flatten(own, parent) : parent;
  };
  const channel = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = (c) => 0.2126 * channel(c.r) + 0.7152 * channel(c.g)
    + 0.0722 * channel(c.b);
  const contrast = (fg, bg) => {
    const one = luminance(fg);
    const two = luminance(bg);
    return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
  };
  const visible = (node) => {
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(node);
    return style.visibility !== "hidden" && style.opacity !== "0"
      && style.display !== "none";
  };
  const offenders = [];
  let measured = 0;
  for (const node of document.querySelectorAll("body *")) {
    let hasText = false;
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && child.textContent.trim()) { hasText = true; break; }
    }
    if (!hasText || !visible(node)) continue;
    const style = getComputedStyle(node);
    const fg = flatten(parse(style.color) || { r: 0, g: 0, b: 0, a: 1 },
                       backgroundOf(node));
    const bg = backgroundOf(node);
    const size = parseFloat(style.fontSize);
    const weight = parseInt(style.fontWeight, 10) || 400;
    const need = (size >= 24 || (size >= 18.66 && weight >= 700)) ? 3.0 : 4.5;
    const value = contrast(fg, bg);
    measured += 1;
    if (value < need - 0.005) {
      offenders.push({
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        cls: String(node.className || null),
        text: node.textContent.trim().slice(0, 48),
        size: size,
        weight: weight,
        ratio: Math.round(value * 100) / 100,
        need: need,
      });
    }
  }
  return { measured: measured, offenders: offenders };
})()
"""


class CdpError(RuntimeError):
    pass


def chrome_executable():
    for path in CHROME_PATHS:
        if os.path.exists(path):
            return path
    return None


class _Conn(object):
    """A websocket connection plus the bytes Chrome has already sent."""

    def __init__(self, sock):
        self.sock = sock
        self.buffer = b""

    def read(self, count):
        while len(self.buffer) < count:
            chunk = self.sock.recv(max(4096, count - len(self.buffer)))
            if not chunk:
                raise CdpError("connection closed mid-frame")
            self.buffer += chunk
        taken, self.buffer = self.buffer[:count], self.buffer[count:]
        return taken


class Page(object):
    """One Chrome tab with just enough CDP to inspect our own UI."""

    def __init__(self, process, conn, profile):
        self.process = process
        self.conn = conn
        self.profile = profile
        self._id = 0
        self._events = []

    # -- lifecycle ---------------------------------------------------------

    @classmethod
    def open(cls, url, width=1280, height=900, appearance=None, idle_ms=800,
             ready=None):
        binary = chrome_executable()
        if binary is None:
            raise CdpError("Google Chrome is not installed")
        profile = tempfile.mkdtemp(prefix="sleepeye-chrome-")
        args = [
            binary,
            "--headless=new",
            "--enable-unsafe-swiftshader",
            "--use-angle=swiftshader",
            "--disable-dev-shm-usage",
            "--disable-background-timer-throttling",
            "--disable-renderer-backgrounding",
            "--disable-backgrounding-occluded-windows",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--disable-sync",
            "--hide-scrollbars",
            "--mute-audio",
            "--remote-debugging-port=0",
            "--user-data-dir=" + profile,
            url,
        ]
        process = subprocess.Popen(args, stdout=subprocess.DEVNULL,
                                   stderr=subprocess.PIPE)
        try:
            port = _read_devtools_port(process.stderr)
            if port is None:
                raise CdpError("Chrome did not report a DevTools endpoint")
            target = _first_page_target(port)
            sock, conn = _connect(target["webSocketDebuggerUrl"])
            page = cls(process, conn, profile)
        except BaseException:
            _close_streams(process)
            process.terminate()
            process.wait(timeout=5)
            _rmtree(profile)
            raise
        page.send("Runtime.enable")
        page.send("Log.enable")
        page.send("Page.enable")
        if appearance:
            page.set_appearance(appearance)
        page.set_viewport(width, height)
        page.wait_load(idle_ms, ready=ready)
        return page

    def close(self):
        try:
            self.conn.sock.close()
        except OSError:
            pass
        _close_streams(self.process)
        self.process.terminate()
        try:
            self.process.wait(timeout=6)
        except subprocess.TimeoutExpired:
            self.process.kill()
        _rmtree(self.profile)

    def set_appearance(self, appearance):
        self.send("Emulation.setEmulatedMedia",
                  {"features": [{"name": "prefers-color-scheme",
                                 "value": appearance}]})

    def set_viewport(self, width, height):
        self.send("Emulation.setDeviceMetricsOverride",
                  {"width": width, "height": height, "deviceScaleFactor": 2,
                   "mobile": width < 700})

    # -- protocol ----------------------------------------------------------

    def send(self, method, params=None, timeout=25.0):
        self._id += 1
        request_id = self._id
        _ws_send(self.conn, json.dumps({"id": request_id, "method": method,
                                       "params": params or {}}))
        deadline = time.time() + timeout
        while True:
            if time.time() > deadline:
                raise CdpError("timeout waiting for %s" % method)
            message = _ws_message(self.conn)
            if message is None:
                raise CdpError("Chrome closed the connection")
            if message.get("id") == request_id:
                if "error" in message:
                    raise CdpError("%s failed: %s"
                                   % (method, message["error"].get("message")))
                return message.get("result", {})
            if "method" in message:
                self._events.append(message)

    def evaluate(self, expression, timeout=25.0):
        result = self.send("Runtime.evaluate", {
            "expression": expression,
            "returnByValue": True,
            "awaitPromise": True,
        }, timeout=timeout)
        if result.get("exceptionDetails"):
            raise CdpError("page script threw: %s"
                           % json.dumps(result["exceptionDetails"])[:400])
        return result.get("result", {}).get("value")

    def evaluate_json(self, expression, timeout=25.0):
        return json.loads(self.evaluate(expression, timeout))

    def resilient(self, expression, timeout=25.0, attempts=6):
        """Evaluate, retrying across a navigation that replaces the context."""
        last = None
        for _ in range(attempts):
            try:
                return self.evaluate(expression, timeout=timeout)
            except CdpError as exc:
                last = exc
                time.sleep(0.25)
        raise last

    def wait_load(self, idle_ms=800, ready=None):
        """Block until the page reports itself usable, then let it settle.

        ``readyState`` alone is not enough: Chrome answers it for the empty
        initial document before the real one has arrived, so callers pass a
        predicate that only becomes true once the UI is on screen.
        """
        expression = ready or "document.readyState !== 'loading'"
        deadline = time.time() + 25
        while time.time() < deadline:
            try:
                if self.evaluate("(%s)" % expression):
                    break
            except CdpError:
                # The document is replacing its own context while we look; the
                # next poll will see the new one.
                pass
            time.sleep(0.15)
        else:
            raise CdpError("the page never became ready: %s" % expression)
        if idle_ms:
            # The panel polls /api/state every second; a short settle makes the
            # first render truthful without waiting on the network.
            self.resilient("new Promise((resolve) => "
                           "setTimeout(() => resolve(true), %d))" % int(idle_ms))

    def navigate(self, url, idle_ms=800, ready=None):
        self.send("Page.navigate", {"url": url})
        self.wait_load(idle_ms, ready=ready)

    def press(self, key, virtual_code):
        """Press a key the way a keyboard would, so :focus-visible applies."""
        for kind in ("rawKeyDown", "keyUp"):
            self.send("Input.dispatchKeyEvent", {
                "type": kind, "key": key, "code": key,
                "windowsVirtualKeyCode": virtual_code,
                "nativeVirtualKeyCode": virtual_code,
            })

    def console_errors(self):
        errors = []
        for event in self._events:
            name = event.get("method")
            params = event.get("params", {})
            if name == "Log.entryAdded":
                entry = params.get("entry", {})
                if entry.get("level") in ("error",):
                    errors.append("%s: %s" % (entry.get("source"),
                                              entry.get("text")))
            elif name == "Runtime.exceptionThrown":
                details = params.get("exceptionDetails", {})
                errors.append("exception: %s" % details.get("text", "")[:200])
            elif name == "Network.loadingFailed":
                errors.append("network: %s" % params.get("errorText"))
        return errors

    def screenshot(self, path, full=True):
        params = {"format": "png"}
        if full:
            size = json.loads(self.resilient(
                "JSON.stringify({w: document.documentElement.clientWidth,"
                " h: document.documentElement.scrollHeight})"))
            params["captureBeyondViewport"] = True
            params["clip"] = {"x": 0, "y": 0, "width": size["w"],
                              "height": min(int(size["h"]), 12000), "scale": 1}
        result = self.send("Page.captureScreenshot", params, timeout=60)
        with open(path, "wb") as handle:
            handle.write(base64.b64decode(result["data"]))
        return path


# -- websocket plumbing ------------------------------------------------------


def _ws_send(conn, text, opcode=0x1):
    payload = text.encode("utf-8") if isinstance(text, str) else bytes(text)
    header = bytearray([0x80 | opcode])
    length = len(payload)
    if length < 126:
        header.append(0x80 | length)
    elif length < 65536:
        header.append(0x80 | 126)
        header.extend(struct.pack("!H", length))
    else:
        header.append(0x80 | 127)
        header.extend(struct.pack("!Q", length))
    mask = os.urandom(4)
    header.extend(mask)
    conn.sock.sendall(bytes(header)
                      + bytes(b ^ mask[i % 4] for i, b in enumerate(payload)))


def _read_frame(conn):
    first = conn.read(2)
    fin = first[0] & 0x80
    opcode = first[0] & 0x0F
    length = first[1] & 0x7F
    if length == 126:
        length = struct.unpack("!H", conn.read(2))[0]
    elif length == 127:
        length = struct.unpack("!Q", conn.read(8))[0]
    payload = conn.read(length) if length else b""
    return fin, opcode, payload


def _ws_message(conn):
    """Return the next decoded JSON message, or None when Chrome closes."""
    while True:
        fin, opcode, payload = _read_frame(conn)
        while not fin:  # continuation frames
            more_fin, _, more = _read_frame(conn)
            payload += more
            fin = more_fin
        if opcode == 0x8:
            return None
        if opcode == 0x9:  # ping: answer with a pong carrying the same bytes
            _ws_send(conn, payload, opcode=0xA)
            continue
        if opcode in (0x1, 0x2):
            try:
                return json.loads(payload.decode("utf-8"))
            except (UnicodeDecodeError, ValueError):
                continue
        return {}


# -- process helpers ---------------------------------------------------------


def _close_streams(process):
    for stream in (process.stdout, process.stderr, process.stdin):
        try:
            if stream:
                stream.close()
        except OSError:
            pass


def _read_devtools_port(stream, timeout=20.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        line = stream.readline()
        if not line:
            continue
        text = line.decode("utf-8", "replace")
        if "DevTools listening on" in text:
            tail = text.split("DevTools listening on", 1)[1].strip().split()[0]
            host = tail.split("//", 1)[1].split("/", 1)[0]
            return int(host.rsplit(":", 1)[1])
    return None


def _first_page_target(port):
    request = urllib.request.Request("http://127.0.0.1:%d/json/list" % port)
    deadline = time.time() + 20
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(request, timeout=2) as response:
                targets = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, OSError, ValueError):
            time.sleep(0.2)
            continue
        pages = [t for t in targets if t.get("type") == "page"
                 and t.get("webSocketDebuggerUrl")]
        if pages:
            return pages[0]
        time.sleep(0.2)
    raise CdpError("Chrome exposed no page target")


def _connect(ws_url):
    rest = ws_url.split("://", 1)[1]
    host, path = rest.split("/", 1)
    address, port = host.split(":")
    sock = socket.create_connection((address, int(port)), timeout=25)
    key = base64.b64encode(os.urandom(16)).decode("ascii")
    sock.sendall((
        "GET /%s HTTP/1.1\r\n"
        "Host: %s\r\n"
        "Upgrade: websocket\r\n"
        "Connection: Upgrade\r\n"
        "Sec-WebSocket-Key: %s\r\n"
        "Sec-WebSocket-Version: 13\r\n\r\n" % (path, host, key)
    ).encode("ascii"))
    response = b""
    while b"\r\n\r\n" not in response:
        chunk = sock.recv(4096)
        if not chunk:
            raise CdpError("websocket handshake failed")
        response += chunk
    if b" 101 " not in response.split(b"\r\n", 1)[0]:
        raise CdpError("websocket handshake rejected: %r" % response[:160])
    conn = _Conn(sock)
    conn.buffer = response.split(b"\r\n\r\n", 1)[1]
    return sock, conn


def _rmtree(path):
    for root, dirs, files in os.walk(path, topdown=False):
        for name in files:
            try:
                os.remove(os.path.join(root, name))
            except OSError:
                pass
        for name in dirs:
            try:
                os.rmdir(os.path.join(root, name))
            except OSError:
                pass
    try:
        os.rmdir(path)
    except OSError:
        pass
