/* SHITTOWN — util.js : tiny helpers + all textures generated at runtime.
   No external assets. Everything is drawn into little canvases by hand. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = (ST.util = {});

  U.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => (b === undefined ? Math.random() * (a === undefined ? 1 : a) : a + Math.random() * (b - a));
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.clamp01 = (v) => U.clamp(v, 0, 1);
  U.amount = (n) => (n === Infinity ? "∞" : String(n));
  U.money = (n) => "$" + Math.max(0, Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  U.fmt = (n) => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  U.uid = (() => { let i = 0; return () => ++i; })();
  U.now = () => performance.now() / 1000;

  U.dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  U.dirFromYaw = (yaw) => ({ x: -Math.sin(yaw), z: -Math.cos(yaw) });

  /* ---------- texture factory ---------- */
  U.tex = function (w, h, draw, repeat) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    draw(g, w, h);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    if (repeat) {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(repeat[0], repeat[1]);
    }
    return t;
  };

  function speckle(g, w, h, colors, count, size) {
    for (let i = 0; i < count; i++) {
      g.fillStyle = colors[(Math.random() * colors.length) | 0];
      const s = size[0] + Math.random() * (size[1] - size[0]);
      g.fillRect((Math.random() * w) | 0, (Math.random() * h) | 0, s, s);
    }
  }

  function base(g, w, h, col) { g.fillStyle = col; g.fillRect(0, 0, w, h); }

  U.texBrick = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#3a2020");
      const bw = 16, bh = 8;
      for (let row = 0; row < h / bh; row++) {
        for (let col = -1; col < w / bw + 1; col++) {
          const x = col * bw + (row % 2 ? bw / 2 : 0);
          const shade = 0.75 + Math.random() * 0.4;
          const r = (110 * shade) | 0, gg = (55 * shade) | 0, b = (45 * shade) | 0;
          g.fillStyle = `rgb(${r},${gg},${b})`;
          g.fillRect(x + 1, row * bh + 1, bw - 2, bh - 2);
        }
      }
      speckle(g, w, h, ["#241212", "#1d0e0e", "#4a2a26"], 50, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texCinder = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#4b4a52");
      for (let row = 0; row < 4; row++) {
        for (let col = -1; col < 3; col++) {
          const x = col * 32 + (row % 2 ? 16 : 0);
          const sh = 0.85 + Math.random() * 0.25;
          g.fillStyle = `rgb(${(86 * sh) | 0},${(85 * sh) | 0},${(94 * sh) | 0})`;
          g.fillRect(x + 1, row * 16 + 1, 30, 14);
        }
      }
      speckle(g, w, h, ["#2f2e35", "#5a5964", "#3d3c44"], 60, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texSiding = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#6b5b42");
      for (let y = 0; y < h; y += 8) {
        g.fillStyle = y % 16 ? "#75644a" : "#5f5139";
        g.fillRect(0, y, w, 7);
        g.fillStyle = "rgba(0,0,0,.25)";
        g.fillRect(0, y + 7, w, 1);
      }
      speckle(g, w, h, ["#4a3e2c", "#847252"], 40, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texAsphalt = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#22222a");
      speckle(g, w, h, ["#2c2c36", "#191920", "#33333d", "#3a3a44"], 260, [1, 2]);
      g.strokeStyle = "#16161c";
      g.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        let x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y);
        for (let k = 0; k < 4; k++) { x += U.rand(-7, 7); y += U.rand(-7, 7); g.lineTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 0.18;
      g.fillStyle = "#15151a";
      g.fillRect(0, 24, w, 3); // faded road paint
      g.globalAlpha = 1;
    }, repeat || [1, 1]);
  };

  U.texSidewalk = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#5c5a5e");
      g.strokeStyle = "#3b3940";
      g.lineWidth = 2;
      for (let i = 0; i <= 2; i++) {
        g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke();
        g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke();
      }
      speckle(g, w, h, ["#4c4a4f", "#6b696e", "#434147"], 90, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texGrass = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#3d4a2a");
      speckle(g, w, h, ["#4a5a31", "#333d22", "#55653a", "#2a331c"], 300, [1, 2]);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = Math.random() > 0.5 ? "#5d7040" : "#313b21";
        g.beginPath();
        const x = Math.random() * w, y = Math.random() * h;
        g.moveTo(x, y); g.lineTo(x + U.rand(-2, 2), y - U.rand(2, 5)); g.stroke();
      }
    }, repeat || [1, 1]);
  };

  U.texWood = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#4a3320");
      for (let x = 0; x < w; x += 8) {
        g.fillStyle = Math.random() > 0.5 ? "#553a24" : "#412c1b";
        g.fillRect(x, 0, 7, h);
        g.fillStyle = "rgba(0,0,0,.3)";
        g.fillRect(x + 7, 0, 1, h);
        g.fillStyle = "rgba(0,0,0,.15)";
        for (let i = 0; i < 4; i++) g.fillRect(x + U.randInt(1, 5), U.randInt(0, h), 1, U.randInt(2, 10));
      }
    }, repeat || [1, 1]);
  };

  U.texTile = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? "#2a2536" : "#3d3650";
          g.fillRect(x * 16, y * 16, 16, 16);
        }
      }
      speckle(g, w, h, ["#241f30", "#4a4262"], 50, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texChecker = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          g.fillStyle = (x + y) % 2 ? "#d8d4c8" : "#222022";
          g.fillRect(x * 8, y * 8, 8, 8);
        }
      }
      speckle(g, w, h, ["rgba(0,0,0,.12)", "rgba(255,255,255,.06)"], 40, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texCarpet = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#5a3030");
      speckle(g, w, h, ["#4a2626", "#6a3a3a", "#3f2020"], 220, [1, 2]);
      g.globalAlpha = 0.15;
      g.fillStyle = "#2a1515";
      for (let i = 0; i < 5; i++) g.fillRect(0, U.randInt(0, h), w, 2);
      g.globalAlpha = 1;
    }, repeat || [1, 1]);
  };

  U.texMetal = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#4a4d55");
      for (let x = 0; x < w; x += 4) {
        g.fillStyle = Math.random() > 0.5 ? "#545861" : "#42454d";
        g.fillRect(x, 0, 2, h);
      }
      speckle(g, w, h, ["#5f636d", "#35373d", "#6b6f79"], 80, [1, 3]);
    }, repeat || [1, 1]);
  };

  U.texNeon = function (text, color, sub) {
    return U.tex(512, 160, (g, w, h) => {
      g.fillStyle = "#0a0612"; g.fillRect(0, 0, w, h);
      g.strokeStyle = color; g.lineWidth = 5; g.globalAlpha = 0.9;
      g.strokeRect(9, 9, w - 18, h - 18);
      g.globalAlpha = 1;
      const size = Math.min(70, Math.floor(430 / Math.max(1, String(text).length * 0.62)));
      g.font = "bold " + size + "px 'Arial Black', Impact, sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.shadowColor = color; g.shadowBlur = 24;
      g.fillStyle = color;
      g.fillText(text, w / 2, sub ? h / 2 - 14 : h / 2);
      if (sub) {
        g.shadowBlur = 10;
        g.font = "bold 20px 'Courier New', monospace";
        g.fillStyle = "#fff";
        g.fillText(sub, w / 2, h / 2 + 42);
      }
      g.shadowBlur = 0;
    });
  };

  U.texPoster = function (top, bottom, bg, fg) {
    return U.tex(64, 96, (g, w, h) => {
      g.fillStyle = bg || "#241a12"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "#000"; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.fillStyle = fg || "#ffd400";
      g.font = "bold 12px 'Arial Black', sans-serif";
      g.textAlign = "center";
      const words = String(top).split(" ");
      words.forEach((word, i) => g.fillText(word, w / 2, 24 + i * 13));
      g.fillStyle = "#c9bfa8";
      g.font = "bold 9px 'Courier New', monospace";
      g.fillText(bottom, w / 2, h - 16);
      g.fillStyle = "rgba(0,0,0,.35)";
      for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    });
  };

  U.texBlood = function () {
    return U.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      g.fillStyle = "rgba(120,8,12,.92)";
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, d = Math.random() * 22;
        const r = 3 + Math.random() * 10;
        g.beginPath();
        g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, r, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = "rgba(80,4,8,.85)";
      for (let i = 0; i < 10; i++) {
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, Math.PI * 2);
        g.fill();
      }
    });
  };

  U.texPuddle = function () {
    return U.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, "rgba(240,230,70,.55)");
      grd.addColorStop(0.7, "rgba(220,210,50,.28)");
      grd.addColorStop(1, "rgba(200,190,40,0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,245,90,.5)";
      for (let i = 0; i < 10; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    });
  };

  U.texVomit = function () {
    return U.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, "rgba(150,170,60,.9)");
      grd.addColorStop(0.6, "rgba(110,130,40,.65)");
      grd.addColorStop(1, "rgba(80,100,30,0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(90,110,30,.9)";
      for (let i = 0; i < 14; i++) g.fillRect(Math.random() * w, Math.random() * h, U.randInt(1, 4), U.randInt(1, 3));
    });
  };

  U.texScorch = function () {    return U.tex(64, 64, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, "rgba(0,0,0,.95)");
      grd.addColorStop(0.55, "rgba(18,12,10,.8)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(40,30,24,.7)";
      for (let i = 0; i < 16; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, U.randInt(1, 3));
    });
  };

  U.texSky = function () {
    return U.tex(256, 128, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, "#060b18");
      grd.addColorStop(0.28, "#16233a");
      grd.addColorStop(0.44, "#3d3c5e");
      grd.addColorStop(0.5, "#a24e3e");
      grd.addColorStop(0.54, "#e8884a");
      grd.addColorStop(0.575, "#ffc46e");
      grd.addColorStop(0.605, "#6a3a30");
      grd.addColorStop(0.7, "#1a1018");
      grd.addColorStop(1, "#050408");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      // moon with a soft halo
      g.fillStyle = "rgba(255,232,190,.16)";
      g.beginPath(); g.arc(196, 30, 15, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(255,240,210,.92)";
      g.beginPath(); g.arc(196, 30, 7.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = "rgba(210,200,190,.35)";
      g.beginPath(); g.arc(193.5, 28, 2.1, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(199, 33, 1.5, 0, Math.PI * 2); g.fill();
      // horizon haze
      g.fillStyle = "rgba(255,150,90,.14)";
      g.fillRect(0, 66, w, 10);
    });
  };

  U.texPaint = function (color) {
    return U.tex(32, 32, (g, w, h) => {
      g.fillStyle = color; g.fillRect(0, 0, w, h);
      speckle(g, w, h, ["rgba(0,0,0,.08)", "rgba(255,255,255,.05)"], 40, [1, 2]);
    }, [1, 1]);
  };

  U.texMallFloor = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#c8bda0");
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          g.fillStyle = (x + y) % 2 ? "#bcae8e" : "#d3c8ab";
          g.fillRect(x * 16, y * 16, 16, 16);
        }
      }
      speckle(g, w, h, ["#a89a7a", "#8f8266", "#e2d7ba"], 120, [1, 2]);
      g.globalAlpha = 0.18;
      g.fillStyle = "#5a503a";
      for (let i = 0; i < 4; i++) g.fillRect(U.randInt(0, w), U.randInt(0, h), U.randInt(3, 10), 2);
      g.globalAlpha = 1;
    }, repeat || [1, 1]);
  };

  U.texStucco = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#8a7a62");
      speckle(g, w, h, ["#94836a", "#7a6b55", "#a08f74", "#6a5d4a"], 260, [1, 3]);
      g.strokeStyle = "rgba(60,50,38,.5)";
      g.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        let x = Math.random() * w, y = 0;
        g.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += U.rand(-4, 4); y += 10; g.lineTo(x, y); }
        g.stroke();
      }
    }, repeat || [1, 1]);
  };

  U.texPlywood = function (repeat) {
    return U.tex(64, 64, (g, w, h) => {
      base(g, w, h, "#6a5236");
      for (let x = 0; x < w; x += 10) {
        g.fillStyle = Math.random() > 0.5 ? "#74593a" : "#5c462e";
        g.fillRect(x, 0, 9, h);
        g.fillStyle = "rgba(0,0,0,.35)";
        g.fillRect(x + 9, 0, 1, h);
      }
      g.fillStyle = "rgba(20,14,8,.5)";
      for (let i = 0; i < 7; i++) g.fillRect(0, U.randInt(0, h), w, 1);
      speckle(g, w, h, ["#4a3824", "#7d6342"], 40, [1, 2]);
    }, repeat || [1, 1]);
  };

  U.texBarber = function () {
    return U.tex(32, 64, (g, w, h) => {
      g.fillStyle = "#e8e8e8"; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 12) {
        g.fillStyle = "#c42a35"; g.save();
        g.translate(0, y); g.transform(1, 0.45, 0, 1, 0, 0);
        g.fillRect(0, 0, w, 5);
        g.restore();
        g.fillStyle = "#2a4a9a"; g.save();
        g.translate(0, y + 6); g.transform(1, 0.45, 0, 1, 0, 0);
        g.fillRect(0, 0, w, 4);
        g.restore();
      }
    }, [1, 1]);
  };
})();
