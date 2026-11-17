/* SHITTOWN — multiplayer.js
   Optional online co-op: WebSocket relay, ghost avatars, chat, and punch
   events. Loads in single-player too; it only connects when you ask. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;

  function labelTexture(text, color) {
    return U.tex(512, 96, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(0,0,0,.68)";
      g.fillRect(0, 12, w, 62);
      g.strokeStyle = color || "#ffd24a";
      g.lineWidth = 3;
      g.strokeRect(2, 14, w - 4, 58);
      g.fillStyle = color || "#ffd24a";
      g.font = "bold 34px 'Arial Black', Arial";
      g.textAlign = "center";
      g.fillText(String(text).slice(0, 26), w / 2, 55);
    });
  }

  class RemotePlayer {
    constructor(mp, id, name, state) {
      this.mp = mp;
      this.id = id;
      this.name = name || ("PLAYER-" + id);
      this.game = mp.game;
      this.target = new THREE.Vector3(0, 1, 0);
      this.yaw = 0;
      this.vehicle = null;
      const g = new THREE.Group();
      this.avatar = new THREE.Group();
      g.add(this.avatar);
      const hoodie = new THREE.MeshLambertMaterial({ color: 0x1b1b24 });
      const skin = new THREE.MeshLambertMaterial({ color: 0xc89070 });
      const jeans = new THREE.MeshLambertMaterial({ color: 0x242a36 });
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.62, 8), hoodie);
      torso.position.y = 1.32;
      this.avatar.add(torso);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), hoodie);
      hood.scale.set(1, 0.9, 0.8); hood.position.set(0, 1.72, 0.03); this.avatar.add(hood);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), skin);
      head.position.y = 1.72; this.avatar.add(head);
      for (let i = 0; i < 2; i++) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.7, 7), jeans);
        leg.position.set(i ? 0.12 : -0.12, 0.55, 0); this.avatar.add(leg);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.55, 7), hoodie);
        arm.position.set(i ? 0.34 : -0.34, 1.28, 0); arm.rotation.z = i ? 0.12 : -0.12; this.avatar.add(arm);
      }
      this.car = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 4.1), new THREE.MeshLambertMaterial({ color: 0x7a3a2a }));
      body.position.y = 0.72; this.car.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 1.9), new THREE.MeshLambertMaterial({ color: 0x5a2a20 }));
      cab.position.set(0, 1.28, 0.15); this.car.add(cab);
      this.car.visible = false; g.add(this.car);
      this.plane = new THREE.Group();
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.35, 5, 8), new THREE.MeshLambertMaterial({ color: 0xc8b060 }));
      fus.rotation.x = Math.PI / 2; this.plane.add(fus);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(8, 0.14, 1.3), new THREE.MeshLambertMaterial({ color: 0xc8b060 }));
      wing.position.y = 0.2; this.plane.add(wing);
      this.plane.visible = false; g.add(this.plane);
      // name bubble
      this.label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(this.name), transparent: true, depthTest: false }));
      this.label.scale.set(4.4, 0.82, 1);
      this.label.position.y = 2.5;
      g.add(this.label);
      this.chatT = 0;
      g.position.set(0, 1, 0);
      this.group = g;
      this.game.scene.add(g);
      this.apply(state || {});
    }

    apply(s) {
      if (!s) return;
      if (s.name) this.setName(s.name);
      if (typeof s.x === "number") this.target.set(s.x, s.y || 1, s.z || 0);
      if (typeof s.yaw === "number") this.yaw = s.yaw;
      this.vehicle = s.v || null;
      if (this.chatT <= 0) this.setLabel(this.name);
      this.avatar.visible = !this.vehicle;
      this.car.visible = this.vehicle === "car";
      this.plane.visible = this.vehicle === "plane";
      this.label.position.y = this.vehicle === "plane" ? 3.0 : 2.5;
    }

    setName(name) {
      this.name = name;
      if (this.chatT <= 0) this.setLabel(name);
    }

    setLabel(text, color) {
      const spr = this.label;
      if (spr.material.map) spr.material.map.dispose();
      spr.material.map = labelTexture(text, color);
      spr.material.needsUpdate = true;
    }

    say(text) {
      this.chatT = 6;
      this.setLabel(this.name + ": " + text, "#9affb8");
    }

    update(dt) {
      const k = 1 - Math.pow(0.0005, dt);
      this.group.position.lerp(this.target, k);
      let d = this.yaw - this.group.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.group.rotation.y += d * Math.min(1, dt * 10);
      if (this.chatT > 0) {
        this.chatT -= dt;
        if (this.chatT <= 0) this.setLabel(this.name);
      }
    }

    remove() {
      this.game.scene.remove(this.group);
      if (this.label.material.map) this.label.material.map.dispose();
      this.label.material.dispose();
    }
  }

  class Multiplayer {
    constructor(game) {
      this.game = game;
      this.id = null;
      this.remotes = new Map();
      this.enabled = false;
      this.ws = null;
      this.name = "SHITASS-" + Math.floor(100 + Math.random() * 900);
      this.lastSend = 0;
      this.chatOpen = false;
      this.bindChat();
    }

    connect(url) {
      if (this.ws) return;
      if (!("WebSocket" in window)) {
        this.game.ticker("This browser has no WebSocket. Online is not happening.", "bad");
        return;
      }
      const params = new URLSearchParams(location.search);
      const raw = params.get("ws");
      const proto = location.protocol === "https:" ? "wss://" : "ws://";
      let target = url;
      if (!target) {
        if (raw && /^wss?:\/\//i.test(raw)) target = raw;
        else if (raw) target = proto + raw;
        else target = proto + location.hostname + ":" + (location.port ? String(Number(location.port) + 1) : "4353");
      }
      try {
        this.ws = new WebSocket(target);
      } catch (e) {
        this.game.ticker("Online failed to start: " + e.message, "bad");
        return;
      }
      this.enabled = true;
      this.ws.onopen = () => {
        this.game.ticker("ONLINE: connected to the relay. Other SHITASSes may be present.", "gold");
        this.ws.send(JSON.stringify({ t: "name", name: this.name }));
        this.sendState(true);
        this.setStatus(1);
      };
      this.ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        this.handle(msg);
      };
      this.ws.onclose = () => {
        this.enabled = false;
        this.game.ticker("ONLINE: disconnected. Back to being alone with the town.", "bad");
        this.setStatus(-1);
      };
      this.ws.onerror = () => {
        this.game.ticker("ONLINE: relay refused the connection. Is serve.py --online running?", "bad");
      };
    }

    handle(msg) {
      const t = msg.t;
      if (t === "welcome") {
        this.id = msg.id;
        this.name = msg.name || this.name;
        (msg.players || []).forEach((p) => {
          if (p.id !== this.id) this.remotes.set(p.id, new RemotePlayer(this, p.id, p.name, p.state));
        });
        this.setStatus(this.remotes.size + 1);
      } else if (t === "join") {
        if (msg.id === this.id) return;
        if (!this.remotes.has(msg.id)) this.remotes.set(msg.id, new RemotePlayer(this, msg.id, msg.name, null));
        this.game.ticker("ONLINE: " + msg.name + " joined Shittown.", "gold");
        this.setStatus(this.remotes.size + 1);
      } else if (t === "state") {
        if (msg.id === this.id) return;
        let r = this.remotes.get(msg.id);
        if (!r) { r = new RemotePlayer(this, msg.id, msg.name, msg); this.remotes.set(msg.id, r); }
        r.apply(msg);
      } else if (t === "chat") {
        const r = this.remotes.get(msg.id);
        if (r) r.say(msg.text);
        this.game.ticker(msg.name + ": " + msg.text, "gold");
      } else if (t === "name") {
        const r = this.remotes.get(msg.id);
        if (r) r.setName(msg.name);
      } else if (t === "hit") {
        if (msg.from === this.id) return;
        this.game.player.damage(msg.dmg || 10);
        this.game.shake(0.5);
        this.game.ticker((msg.name || "SOMEONE") + " punched you across the internet.", "bad");
      } else if (t === "leave") {
        const r = this.remotes.get(msg.id);
        if (r) { r.remove(); this.remotes.delete(msg.id); }
        this.setStatus(this.remotes.size + 1);
      }
    }

    send(obj) {
      if (!this.ws || this.ws.readyState !== 1) return;
      this.ws.send(JSON.stringify(obj));
    }

    sendState(force) {
      const now = performance.now();
      if (!force && now - this.lastSend < 80) return;
      this.lastSend = now;
      const p = this.game.player;
      let x = p.body.position.x, y = p.body.position.y, z = p.body.position.z, yaw = p.yaw, v = null;
      if (p.driving) {
        x = p.driving.group.position.x; y = 0.8; z = p.driving.group.position.z;
        yaw = p.driving.heading; v = "car";
      } else if (p.plane) {
        x = p.plane.group.position.x; y = p.plane.alt + 0.8; z = p.plane.group.position.z;
        yaw = p.plane.yaw; v = "plane";
      }
      this.send({ t: "state", x, y, z, yaw, v });
    }

    tryHit(from, dir, dmg) {
      if (!this.enabled) return;
      this.remotes.forEach((r) => {
        const dx = r.group.position.x - from.x;
        const dz = r.z - from.z;
        const dy = r.group.position.y - from.y;
        const d = Math.hypot(dx, dz);
        if (d > 2.8 || Math.abs(dy) > 2.2) return;
        const dot = (dx / d) * dir.x + (dz / d) * dir.z;
        if (dot < 0.35) return;
        this.send({ t: "hit", to: r.id, dmg });
        this.game.ui.hitmarker();
        this.game.ticker("You hit " + r.name + ". Across the network. Respect.", "gold");
      });
    }

    sendChat(text) {
      if (!text) return;
      this.send({ t: "chat", text });
      const p = this.game.player;
      this.game.ticker("YOU: " + text, "gold");
    }

    update(dt) {
      if (!this.enabled) return;
      this.remotes.forEach((r) => r.update(dt));
      this.sendState(false);
    }

    setStatus(n) {
      const el = document.getElementById("online-status");
      if (!el) return;
      el.classList.remove("hidden");
      el.textContent = n < 0 ? "OFFLINE" : "ONLINE · " + n;
    }

    bindChat() {
      const input = document.getElementById("chat-input");
      if (!input) return;
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.sendChat(input.value.trim());
          input.value = "";
          this.game.closeChat();
          e.preventDefault();
        } else if (e.key === "Escape") {
          this.game.closeChat();
          e.preventDefault();
        }
        e.stopPropagation();
      });
    }
  }

  ST.Multiplayer = Multiplayer;
})();
