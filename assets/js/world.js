/* SHITTOWN — world.js
   The town, the physics, the breakables, the fire, the terrible little
   machines that take your money. Everything is built from boxes. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;

  const GROUP_WORLD = 1, GROUP_PLAYER = 2, GROUP_NPC = 4;

  class World {
    constructor(scene) {
      this.scene = scene;
      this.physics = new CANNON.World();
      this.physics.gravity.set(0, -22, 0);
      this.physics.broadphase = new CANNON.SAPBroadphase(this.physics);
      this.physics.solver.iterations = 8;
      this.physics.allowSleep = true;
      this.physics.defaultContactMaterial.friction = 0.4;

      // The player gets a frictionless contact material: without this, ground
      // friction eats the horizontal velocity and movement crawls.
      this.playerMat = new CANNON.Material("player");
      this.physMat = new CANNON.Material("phys");
      this.physics.addContactMaterial(new CANNON.ContactMaterial(this.playerMat, this.physMat, {
        friction: 0.0, restitution: 0.0
      }));

      this.time = 0;
      this.props = [];            // all breakable/dynamic things
      this.propByBody = {};
      this.windows = [];
      this.interactables = [];
      this.fires = [];
      this.decals = [];
      this.debris = [];
      this.particles = [];
      this.floaters = [];
      this.neons = [];
      this.bubbles = [];
      this.cashProps = [];
      this.cars = [];
      this.colliders = [];        // static bodies for reference
      this.hittable = [];         // meshes for optional visual raycasts
      this.bounds = 126;

      this.matCache = {};
      this.texCache = {};
      this.paintCache = {};
      this.paintCacheSmooth = {};

      this._buildLights();
      this._buildSky();
      this._buildSkyline();
      this._buildGround();
      this._buildTown();
      this._buildOutskirts();
      this._buildProps();
      this._buildFence();
      this._buildSpawns();
    }

    /* ================= materials ================= */
    texVariant(name, rx, ry) {
      const key = name + "_" + rx + "_" + ry;
      if (!this.texCache[key]) {
        const fns = {
          brick: U.texBrick, cinder: U.texCinder, siding: U.texSiding,
          asphalt: U.texAsphalt, sidewalk: U.texSidewalk, grass: U.texGrass,
          wood: U.texWood, tile: U.texTile, carpet: U.texCarpet, metal: U.texMetal,
          mallFloor: U.texMallFloor, stucco: U.texStucco, plywood: U.texPlywood,
          checker: U.texChecker
        };
        this.texCache[key] = fns[name]([rx, ry]);
      }
      return this.texCache[key];
    }
    mat(name, rx, ry) {
      const key = name + "_" + (rx || 1) + "_" + (ry || 1);
      if (!this.matCache[key]) {
        this.matCache[key] = new THREE.MeshLambertMaterial({
          map: this.texVariant(name, rx || 1, ry || 1), flatShading: true
        });
      }
      return this.matCache[key];
    }
    paint(hex) {
      if (!this.paintCache[hex]) this.paintCache[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: true });
      return this.paintCache[hex];
    }
    paintSmooth(hex) {
      if (!this.paintCacheSmooth[hex]) this.paintCacheSmooth[hex] = new THREE.MeshLambertMaterial({ color: hex, flatShading: false });
      return this.paintCacheSmooth[hex];
    }
    glow(hex) {
      return new THREE.MeshBasicMaterial({ color: hex });
    }

    /* ================= lights & sky ================= */
    _buildLights() {
      const hemi = new THREE.HemisphereLight(0xffb27c, 0x2a2028, 0.92);
      this.scene.add(hemi);
      const sun = new THREE.DirectionalLight(0xffd0a0, 1.05);
      sun.position.set(-34, 48, 24);
      this.scene.add(sun);
      const fill = new THREE.DirectionalLight(0x4a6a9a, 0.32);
      fill.position.set(30, 18, -40);
      this.scene.add(fill);
      const rim = new THREE.DirectionalLight(0xff7a3c, 0.25);
      rim.position.set(20, 8, 40);
      this.scene.add(rim);
      this.scene.add(new THREE.AmbientLight(0x2a2030, 0.5));

      const barLight = new THREE.PointLight(0xff9a3c, 0.8, 24, 2);
      barLight.position.set(-28, 4.6, -27);
      this.scene.add(barLight);
      const clubLight = new THREE.PointLight(0xff2d78, 1.0, 26, 2);
      clubLight.position.set(22, 5, -28);
      this.scene.add(clubLight);
      this.clubLight = clubLight;
    }

    _buildSkyline() {
      const tex = U.tex(2048, 256, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        const layers = [
          { col: "#1a1222", hgt: 0.5, win: "#4a3a52", density: 0.18 },
          { col: "#241a2c", hgt: 0.7, win: "#8a6a4a", density: 0.22 },
          { col: "#2e2236", hgt: 0.9, win: "#c89a5a", density: 0.26 }
        ];
        layers.forEach((L, li) => {
          let x = 0;
          while (x < w) {
            const bw = 26 + Math.random() * 84;
            const bh = h * L.hgt * (0.45 + Math.random() * 0.55);
            g.fillStyle = L.col;
            g.fillRect(x, h - bh, bw, bh);
            if (Math.random() < 0.4) {
              g.fillRect(x + bw * 0.2, h - bh - 12, bw * 0.6, 12);
            }
            for (let wy = h - bh + 8; wy < h - 6; wy += 9) {
              for (let wx = x + 4; wx < x + bw - 4; wx += 7) {
                if (Math.random() > L.density) continue;
                g.fillStyle = L.win;
                g.globalAlpha = 0.35 + Math.random() * 0.5;
                g.fillRect(wx, wy, 2.4, 2.4);
              }
            }
            g.globalAlpha = 1;
            x += bw + 3 + Math.random() * 14;
          }
        });
        // faint smoke stacks and a radio mast, because industry
        g.fillStyle = "#1a1222";
        [140, 700, 1280, 1820].forEach((sx) => {
          g.fillRect(sx, h - 150, 10, 150);
          g.fillRect(sx - 6, h - 158, 22, 10);
        });
      });
      tex.wrapS = THREE.RepeatWrapping;
      tex.repeat.set(2, 1);
      const geo = new THREE.CylinderGeometry(196, 196, 74, 40, 1, true);
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 36;
      mesh.renderOrder = -1;
      this.scene.add(mesh);
    }

    _buildSky() {
      const tex = U.texSky();
      // Without this, 1px stars get mipmapped into big gray blocks.
      tex.generateMipmaps = false;
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      const geo = new THREE.SphereGeometry(280, 24, 16);
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
      const sky = new THREE.Mesh(geo, mat);
      this.scene.add(sky);
      // Crisp little stars instead of mipmapped blobs.
      const starCount = 320;
      const pos = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 0.46;
        const r = 250;
        pos[i * 3] = Math.cos(theta) * Math.sin(phi) * r;
        pos[i * 3 + 1] = Math.cos(phi) * r;
        pos[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * r;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const starMat = new THREE.PointsMaterial({ color: 0xfff0d0, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false, depthWrite: false });
      this.scene.add(new THREE.Points(starGeo, starMat));
      this.scene.fog = new THREE.Fog(0x402a2c, 40, 195);
      this.scene.background = new THREE.Color(0x150f1a);
    }

    /* ================= ground ================= */
    _buildGround() {
      const g = this.addStaticBox(0, -0.25, 0, 264, 0.5, 264, this.mat("grass", 24, 24));
      // roads
      this.addVisualBox(0, 0.015, 0, 124, 0.04, 12, this.mat("asphalt", 14, 1.5));
      this.addVisualBox(0, 0.016, 0, 12, 0.045, 124, this.mat("asphalt", 1.5, 14));
      // sidewalks are visual only, so 6 cm curbs can never snag the player
      this.addVisualBox(0, 0.03, 7.9, 124, 0.06, 3.4, this.mat("sidewalk", 12, 1));
      this.addVisualBox(0, 0.03, -7.9, 124, 0.06, 3.4, this.mat("sidewalk", 12, 1));
      this.addVisualBox(7.9, 0.032, 0, 3.4, 0.065, 124, this.mat("sidewalk", 1, 12));
      this.addVisualBox(-7.9, 0.032, 0, 3.4, 0.065, 124, this.mat("sidewalk", 1, 12));
      // scattered dirt patches
      for (let i = 0; i < 10; i++) {
        const x = U.rand(-44, 44), z = U.rand(-40, 40);
        if (Math.abs(x) < 10 || Math.abs(z) < 10) continue;
        const m = this.addVisualBox(x, 0.02, z, U.rand(2, 6), 0.05, U.rand(2, 5), this.mat("grass", 1, 1));
        m.material = this.mat("asphalt", 1, 1);
      }
      this.ground = g;
    }

    /* ================= generic builders ================= */
    addVisualBox(x, y, z, w, h, d, material, rotY) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.position.set(x, y, z);
      if (rotY) mesh.rotation.y = rotY;
      this.scene.add(mesh);
      return mesh;
    }

    addFloor(x, z, w, d, material, y) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y === undefined ? 0.025 : y, z);
      this.scene.add(mesh);
      return mesh;
    }

    addStaticBox(x, y, z, w, h, d, material, opts) {
      const mesh = this.addVisualBox(x, y, z, w, h, d, material, opts && opts.rotY);
      const body = new CANNON.Body({
        mass: 0, position: new CANNON.Vec3(x, y, z),
        collisionFilterGroup: GROUP_WORLD, collisionFilterMask: -1, material: this.physMat
      });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
      this.physics.addBody(body);
      this.colliders.push(body);
      mesh.userData.body = body;
      if (opts && opts.breakable) {
        const prop = this._makeProp(mesh, body, {
          kind: opts.kind || "metal", health: opts.health || 40,
          breakable: true, flammable: opts.flammable, name: opts.name || "thing",
          explosive: opts.explosive, value: 0
        });
        prop.static = true;
        if (opts.explosive) prop.explosive = true;
      }
      return mesh;
    }

    _makeProp(mesh, body, data) {
      const prop = Object.assign({
        mesh, body, health: 30, maxHealth: 30, breakable: false,
        flammable: false, explosive: false, kind: "metal", name: "thing",
        grabbed: false, dead: false
      }, data);
      prop.maxHealth = prop.health;
      prop.spawn = mesh.position.clone();
      this.props.push(prop);
      if (body) this.propByBody[body.id] = prop;
      mesh.userData.prop = prop;
      this.hittable.push(mesh);
      return prop;
    }

    addProp(o) {
      const x = o.x, y = o.y === undefined ? o.h / 2 + 0.05 : o.y, z = o.z;
      let mesh;
      if (o.shape === "cylinder") {
        const geo = new THREE.CylinderGeometry(o.w / 2, o.w / 2, o.h, o.seg || 8);
        mesh = new THREE.Mesh(geo, o.material || this.paint(o.color || 0x997755));
      } else {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.h, o.d), o.material || this.paint(o.color || 0x997755));
      }
      mesh.position.set(x, y, z);
      if (o.rotY) mesh.rotation.y = o.rotY;
      this.scene.add(mesh);
      const shape = o.shape === "cylinder"
        ? new CANNON.Box(new CANNON.Vec3(o.w / 2, o.h / 2, (o.d || o.w) / 2))
        : new CANNON.Box(new CANNON.Vec3(o.w / 2, o.h / 2, o.d / 2));
      const body = new CANNON.Body({
        mass: o.mass === undefined ? 1 : o.mass,
        position: new CANNON.Vec3(x, y, z),
        collisionFilterGroup: GROUP_WORLD, collisionFilterMask: -1, material: this.physMat
      });
      body.addShape(shape);
      body.linearDamping = 0.08;
      body.angularDamping = 0.25;
      body.allowSleep = true;
      body.sleepSpeedLimit = 0.2;
      body.sleepTimeLimit = 1.2;
      this.physics.addBody(body);
      if (o.rotY) {
        const q = new CANNON.Quaternion();
        q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), o.rotY);
        body.quaternion.copy(q);
      }
      const prop = this._makeProp(mesh, body, {
        kind: o.kind || "wood",
        health: o.health || 30,
        breakable: o.breakable || false,
        flammable: o.flammable || o.kind === "wood" || o.kind === "plastic",
        explosive: o.explosive || false,
        name: o.name || "prop",
        mass: body.mass
      });
      if (o.cash) prop.cash = o.cash;
      if (o.autoPickup) prop.autoPickup = true;
      return prop;
    }

    /* ================= town ================= */
    _buildTown() {
      this._buildBar();
      this._buildClub();
      this._buildLiquor();
      this._buildHouse();
      this._buildMall();
      this._buildWeedShop();
      this._buildBarber();
      this._buildRedLight();
      this._buildParty();
      this._buildStreetFurniture();
      this._buildCars();
      this._buildBackdrop();
      this._buildNeonPass();
    }

    /* Wall running along X at z, with holes. holes: {u0,u1,v0,v1,type}. */
    wallX(z, x0, x1, h, material, holes) {
      const wallHoles = holes || [];
      const edges = [x0, x1];
      wallHoles.forEach((hh) => { edges.push(U.clamp(hh.u0, x0, x1), U.clamp(hh.u1, x0, x1)); });
      const sorted = edges.slice().sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (b - a < 0.01) continue;
        const covering = wallHoles.filter((hh) => hh.u0 <= a + 0.01 && hh.u1 >= b - 0.01);
        let cursor = 0;
        const sortedHoles = covering.slice().sort((p, q) => p.v0 - q.v0);
        sortedHoles.forEach((hh) => {
          if (hh.v0 > cursor + 0.01) {
            const y0 = cursor, y1 = hh.v0;
            this.addStaticBox((a + b) / 2, (y0 + y1) / 2, z, b - a, y1 - y0, 0.5, material);
          }
          cursor = Math.max(cursor, hh.v1);
        });
        if (cursor < h - 0.01) {
          this.addStaticBox((a + b) / 2, (cursor + h) / 2, z, b - a, h - cursor, 0.5, material);
        }
      }
      wallHoles.forEach((hh) => {
        if (hh.type === "window") this._makeWindow("x", z, (hh.u0 + hh.u1) / 2, (hh.v0 + hh.v1) / 2, hh.u1 - hh.u0, hh.v1 - hh.v0);
        if (hh.type === "door" && hh.door === "open") { /* nothing */ }
      });
    }

    /* Wall running along Z at x, with holes. */
    wallZ(x, z0, z1, h, material, holes) {
      const wallHoles = holes || [];
      const edges = [z0, z1];
      wallHoles.forEach((hh) => { edges.push(U.clamp(hh.u0, z0, z1), U.clamp(hh.u1, z0, z1)); });
      const sorted = edges.slice().sort((a, b) => a - b);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i], b = sorted[i + 1];
        if (b - a < 0.01) continue;
        const covering = wallHoles.filter((hh) => hh.u0 <= a + 0.01 && hh.u1 >= b - 0.01);
        let cursor = 0;
        const sortedHoles = covering.slice().sort((p, q) => p.v0 - q.v0);
        sortedHoles.forEach((hh) => {
          if (hh.v0 > cursor + 0.01) {
            this.addStaticBox(x, (cursor + hh.v0) / 2, (a + b) / 2, 0.5, hh.v0 - cursor, b - a, material);
          }
          cursor = Math.max(cursor, hh.v1);
        });
        if (cursor < h - 0.01) {
          this.addStaticBox(x, (cursor + h) / 2, (a + b) / 2, 0.5, h - cursor, b - a, material);
        }
      }
      wallHoles.forEach((hh) => {
        if (hh.type === "window") this._makeWindow("z", x, (hh.u0 + hh.u1) / 2, (hh.v0 + hh.v1) / 2, hh.u1 - hh.u0, hh.v1 - hh.v0);
      });
    }

    _makeWindow(axis, fixed, center, y, width, height) {
      const w = axis === "x" ? width : 0.08;
      const d = axis === "x" ? 0.08 : width;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, height, d),
        new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.42, emissive: 0x123047, flatShading: true })
      );
      if (axis === "x") mesh.position.set(center, y, fixed);
      else mesh.position.set(fixed, y, center);
      this.scene.add(mesh);
      const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(mesh.position.x, y, mesh.position.z), material: this.physMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, height / 2, d / 2)));
      this.physics.addBody(body);
      const prop = this._makeProp(mesh, body, {
        kind: "glass", health: 10, breakable: true, name: "window", window: true
      });
      this.windows.push(prop);
      return prop;
    }

    addNeon(x, y, z, w, h, tex, rotY) {
      const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      mesh.position.set(x, y, z);
      if (rotY) mesh.rotation.y = rotY;
      this.scene.add(mesh);
      if (U.chance(0.28)) {
        mesh.userData.flicker = U.rand(0, 6.28);
        this.neons.push(mesh);
      }
      return mesh;
    }

    addPoster(x, y, z, w, h, tex, rotY) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
      mesh.position.set(x, y, z);
      if (rotY) mesh.rotation.y = rotY;
      this.scene.add(mesh);
      return mesh;
    }

    addGraffiti(x, y, z, rotY, text, color) {
      const tex = U.tex(128, 64, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.font = "bold 26px 'Arial Black', sans-serif";
        g.textAlign = "center"; g.textBaseline = "middle";
        g.fillStyle = color || "#c9ff2f";
        g.globalAlpha = 0.85;
        g.fillText(text, w / 2, h / 2);
        g.globalAlpha = 0.35;
        g.fillStyle = "#000";
        for (let i = 0; i < 30; i++) g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      mesh.position.set(x, y, z); mesh.rotation.y = rotY;
      this.scene.add(mesh);
    }

    _buildBar() {
      const x0 = -38, x1 = -18, z0 = -34, z1 = -20, H = 6.5;
      const wall = this.mat("brick", 4, 2);
      const floor = this.mat("wood", 6, 4);
      const holesS = [
        { u0: -30, u1: -27, v0: 0, v1: 4, type: "door" },
        { u0: -35.5, u1: -32.5, v0: 2.2, v1: 4.6, type: "window" },
        { u0: -23.5, u1: -20.5, v0: 2.2, v1: 4.6, type: "window" }
      ];
      const holesN = [{ u0: -33, u1: -30, v0: 2.6, v1: 4.8, type: "window" }];
      this.wallX(z0, x0, x1, H, wall, holesN);
      this.wallX(z1, x0, x1, H, wall, holesS);
      this.wallZ(x0, z0, z1, H, wall, [{ u0: -28, u1: -25, v0: 2.4, v1: 4.6, type: "window" }]);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0 + 1, 0.3, z1 - z0 + 1, this.paint(0x4a3a32));
      this.addNeon(-28.5, 7.8, -19.65, 9, 2.4, U.texNeon("THE PIG PEN", "#ffd400", "BEER · BAR · REGRET"), 0);
      this.addVisualBox(-28, 6.1, -27, 8, 0.08, 0.35, this.glow(0xffdfae));
      this.addNeon(-28, 5.2, -33.7, 5.5, 1.5, U.texNeon("COLD BEER", "#2fe3ff", ""), 0);
      this.addPoster(-20.2, 2.6, -22, 1.3, 2, U.texPoster("HALF", "OFF LONELY NIGHTS", "#2a1626", "#ff2d78"), -Math.PI / 2);
      this.addPoster(-35.8, 2.4, -26, 1.3, 2, U.texPoster("COLD", "BEER $4", "#1c1a12", "#ffd400"), Math.PI / 2);
      this.addGraffiti(-26, 1.8, -33.6, 0, "NO COPS", "#ff2d78");
      // interior
      this.addStaticBox(-31, 0.6, -30.9, 11, 1.2, 1.2, this.mat("wood", 4, 1));
      this.addStaticBox(-33.5, 0.2, -28.4, 5, 0.4, 1.0, this.mat("metal", 1, 1));
      for (let i = 0; i < 3; i++) {
        this.addProp({ x: -33 + i * 2.2, z: -29.6, w: 0.6, h: 0.9, d: 0.6, shape: "box", color: 0x7a1f2f, mass: 4, kind: "wood", breakable: true, health: 22, name: "stool" });
      }
      const shelf = this.addStaticBox(-28, 2.0, -33.3, 10, 3.2, 0.3, this.mat("wood", 3, 1));
      for (let i = 0; i < 9; i++) {
        this.addProp({
          x: -33 + i * 1.15, y: 3.95, z: -33.2, w: 0.28, h: 0.7, d: 0.28, shape: "cylinder",
          color: i % 3 === 0 ? 0x4f9b3a : (i % 3 === 1 ? 0x9b6b2a : 0x8a2f4f), mass: 0.45,
          kind: "glass", breakable: true, health: 6, name: "bottle"
        });
      }
      // bar tables
      [[-25, -24], [-22.5, -27.5], [-33, -23]].forEach((p, i) => {
        this.addProp({ x: p[0], z: p[1], w: 1.7, h: 0.12, d: 1.7, surface: true, color: 0x6b4a2a, mass: 12, kind: "wood", breakable: true, health: 40, name: "table", y: 1.05 });
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * Math.PI * 2 + i;
          this.addProp({ x: p[0] + Math.cos(a) * 1.5, z: p[1] + Math.sin(a) * 1.5, w: 0.55, h: 0.95, d: 0.55, color: 0x5a3a24, mass: 5, kind: "wood", breakable: true, health: 24, name: "chair" });
        }
      });
      for (let i = 0; i < 4; i++) {
        this.addProp({
          x: -33 + i * 1.3, y: 0.3, z: -19.4, w: 0.45, h: 0.6, d: 0.45, shape: "cylinder",
          color: 0x3a5f2a, mass: 0.5, kind: "glass", breakable: true, health: 6, name: "bottle"
        });
      }
      this._addToilet(-36.2, -32.5);
      this._addJukebox(-19.4, -25.6, -Math.PI / 2);
      this._addSlot(-36.4, -27.6, Math.PI / 2);
      this._addVending(-19.4, -30.5, -Math.PI / 2);
      this.addExtinguisherPickup(-20.2, -31.8);
      this.addWaterCooler(-20.2, -21.6);
      // bottles on counter
      for (let i = 0; i < 3; i++) {
        this.addProp({
          x: -34 + i * 1.5, y: 1.55, z: -30.9, w: 0.3, h: 0.62, d: 0.3, shape: "cylinder",
          color: 0x2a6f4a, mass: 0.4, kind: "glass", breakable: true, health: 6, name: "bottle"
        });
      }
    }

    _buildClub() {
      const x0 = 10, x1 = 34, z0 = -36, z1 = -20, H = 7;
      const wall = this.mat("brick", 5, 2.4);
      const floor = this.mat("tile", 6, 4);
      const holesS = [
        { u0: 20, u1: 23.5, v0: 0, v1: 4.2, type: "door" },
        { u0: 12.5, u1: 16, v0: 2.4, v1: 5, type: "window" },
        { u0: 27.5, u1: 31, v0: 2.4, v1: 5, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, []);
      this.wallX(z1, x0, x1, H, wall, holesS);
      this.wallZ(x0, z0, z1, H, wall, [{ u0: -30, u1: -26, v0: 2.6, v1: 5.2, type: "window" }]);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0 + 1, 0.3, z1 - z0 + 1, this.paint(0x3a2438));
      this.addNeon(21.8, 8.2, -19.65, 11, 3, U.texNeon("GLITTER GULCH", "#ff2d78", "GIRLS · GIRLS · BAD DECISIONS"), 0);
      this.addNeon(22, 5.4, -35.7, 7, 1.7, U.texNeon("NO REFUNDS", "#ff2d78", ""), 0);
      this.addVisualBox(22, 6.4, -27, 9, 0.08, 0.35, this.glow(0xff9ac0));
      const disco = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), this.glow(0xd8d0e8));
      disco.position.set(22, 5.8, -27); this.scene.add(disco); this.disco = disco;
      this.addPoster(33.8, 2.7, -24, 1.5, 2.2, U.texPoster("2 DRINK", "MINIMUM", "#24121a", "#ff8a1f"), -Math.PI / 2);
      // stage
      this.addStaticBox(21.5, 0.4, -32.4, 12, 0.8, 5, this.mat("wood", 4, 2));
      for (let i = 0; i < 3; i++) {
        this.addStaticBox(17.5 + i * 4, 2.4, -33.2, 0.18, 4.8, 0.18, this.mat("metal", 1, 2));
      }
      this.addStaticBox(21.5, 4.9, -33.2, 11, 0.18, 0.18, this.mat("metal", 2, 1));
      // tables & couches
      [[14, -24], [18, -22], [27, -23], [30, -27]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 1.4, h: 0.1, d: 1.4, color: 0x3b2436, mass: 10, kind: "wood", breakable: true, health: 32, name: "table", y: 1.0 });
        for (let k = 0; k < 3; k++) {
          const a = U.rand(0, Math.PI * 2);
          this.addProp({ x: p[0] + Math.cos(a) * 1.3, z: p[1] + Math.sin(a) * 1.3, w: 0.55, h: 0.9, d: 0.55, color: 0x55223d, mass: 5, kind: "wood", breakable: true, health: 22, name: "chair" });
        }
      });
      this.addProp({ x: 31.5, z: -30, w: 4.5, h: 1.2, d: 1.8, color: 0x701e3c, mass: 40, kind: "wood", breakdown: true, breakable: true, health: 80, name: "couch" });
      this.addProp({ x: 12.5, z: -29, w: 3.5, h: 1.2, d: 1.8, color: 0x3d1f4f, mass: 38, breakable: true, kind: "wood", health: 80, name: "couch" });
      this.addProp({ x: 32.5, y: 2.2, z: -27, w: 1.4, h: 1.4, d: 1.4, color: 0x111111, mass: 8, kind: "metal", breakable: true, health: 30, name: "speaker" });
      this._addSlot(12.2, -22.5, Math.PI / 2);
      this.addProp({ x: 26, y: 0.4, z: -28.4, w: 2.2, h: 0.8, d: 1.4, color: 0x222222, mass: 30, kind: "metal", breakable: true, health: 60, name: "DJ booth" });
      this.addGraffiti(22, 2.4, -35.65, 0, "SHITTOWN", "#ff2d78");
    }

    _buildLiquor() {
      const x0 = -34, x1 = -18, z0 = 18, z1 = 30, H = 5;
      const wall = this.mat("cinder", 3, 1.6);
      const floor = this.mat("tile", 5, 4);
      const holesN = [
        { u0: -27.2, u1: -24.2, v0: 0, v1: 3.6, type: "door" },
        { u0: -32, u1: -29.5, v0: 2, v1: 4, type: "window" },
        { u0: -22, u1: -19.5, v0: 2, v1: 4, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, holesN);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, []);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0 + 1, 0.3, z1 - z0 + 1, this.paint(0x44444a));
      this.addNeon(-25.7, 6.5, 17.65, 8, 2, U.texNeon("CHEAP SWILL", "#2fe3ff", "LIQUOR · LOTTO · LIES"), Math.PI);
      this.addVisualBox(-26, 4.6, 24, 6, 0.07, 0.3, this.glow(0xbfe8ff));
      this.addPoster(-18.2, 2.3, 24, 1.3, 2, U.texPoster("NO", "REFUNDS", "#1a1a20", "#ff2d78"), -Math.PI / 2);
      this.addStaticBox(-26.5, 1.0, 27.8, 9, 1.0, 1.2, this.mat("wood", 3, 1));
      // shelves (thin boards you can actually put bottles on)
      for (let s = 0; s < 3; s++) {
        const sx = -31 + s * 2;
        for (let level = 0; level < 3; level++) {
          this.addStaticBox(sx, 0.5 + level * 0.8, 22, 0.5, 0.08, 6, this.mat("metal", 1, 2));
          for (let i = 0; i < 5; i++) {
            this.addProp({
              x: sx + U.rand(-0.05, 0.05), y: 0.9 + level * 0.8, z: 19.7 + i * 1.05,
              w: 0.3, h: 0.7, d: 0.3, shape: "cylinder",
              color: [0x9b2f2f, 0x2f6f9b, 0x9b8a2f][(i + s + level) % 3],
              mass: 0.5, kind: "glass", breakable: true, health: 6, name: "bottle"
            });
          }
        }
      }
      // lotto counter
      this.addNeon(-26.5, 2.3, 29.5, 4, 1.1, U.texNeon("LOTTO", "#ffd400", ""), Math.PI);
      // crates
      for (let i = 0; i < 3; i++) {
        this.addProp({ x: -33 + i * 1.2, z: 20.6, w: 1.0, h: 1.0, d: 1.0, color: 0x7a5a35, mass: 14, kind: "wood", breakable: true, health: 36, name: "crate" });
      }
      this.addGraffiti(-30, 1.5, 17.4, 0, "DRINK UP", "#2fe3ff");
    }

    _buildHouse() {
      const x0 = 17, x1 = 31, z0 = 20, z1 = 32, H = 5;
      const wall = this.mat("siding", 3, 1.4);
      const floor = this.mat("carpet", 4, 3);
      const holesN = [
        { u0: 23, u1: 26, v0: 0, v1: 3.4, type: "door" },
        { u0: 18.8, u1: 21.2, v0: 2, v1: 3.9, type: "window" },
        { u0: 27.8, u1: 30.2, v0: 2, v1: 3.9, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, holesN);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, []);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, (x1 - x0) + 1, 0.3, (z1 - z0) + 1, this.paint(0x5a4a42));
      this.addSupplyPickup(23.4, 25.2, "papers", 2, 0.72);
      this.addSupplyPickup(20.4, 29.2, "weed", 1, 0.35);
      this.addSupplyPickup(21.2, 30.4, "wraps", 2, 0.35);
      // furniture
      this.addProp({ x: 24, z: 27.5, w: 4.2, h: 1.1, d: 1.6, color: 0x4a5a3a, mass: 40, kind: "wood", breakable: true, health: 70, name: "couch" });
      this.addProp({ x: 24, z: 25.2, w: 1.6, h: 0.12, d: 1.0, color: 0x5a3c22, mass: 9, kind: "wood", breakable: true, health: 28, name: "coffee table", y: 0.6 });
      this.addProp({ x: 26.8, y: 1.1, z: 29, w: 1.5, h: 1.0, d: 1.4, color: 0x111111, mass: 9, kind: "metal", breakable: true, health: 26, name: "TV" });
      this.addProp({ x: 28.6, z: 30.5, w: 1.6, h: 1.8, d: 1.2, color: 0x9aa0a8, mass: 25, kind: "metal", breakable: true, health: 50, name: "fridge" });
      this.addProp({ x: 20, z: 30.5, w: 2.0, h: 0.6, d: 1.4, color: 0x6a2a2a, mass: 20, kind: "wood", breakable: true, health: 40, name: "bed" });
      this.addPoster(24, 2.2, 31.7, 1.4, 2.1, U.texPoster("BLESS", "THIS MESS", "#1a2430", "#7fd4ff"), Math.PI);
    }

    _addToilet(x, z) {
      this.addProp({ x, z, w: 0.8, h: 0.9, d: 1.0, color: 0xd8d8d8, mass: 12, kind: "ceramic", breakable: true, health: 18, name: "toilet" });
      this.addInteractable({ x, y: 1, z, radius: 2, prompt: "[E] FLUSH", action: () => {
        ST.audio.splash();
        this.burst(new THREE.Vector3(x, 1.4, z), 0x9fd4ff, 12, 2.2, 0.7, 0.06);
        this.game.ticker("The toilet water is cleaner than the beer.", "bad");
      } });
    }

    _addJukebox(x, z, rotY) {
      const mesh = this.addStaticBox(x, 1.15, z, 1.4, 2.0, 0.8, this.paint(0x3a1f3a), { rotY });
      this.addNeon(x + (rotY ? 0.42 : 0), 1.9, z + (rotY ? 0 : 0.42), 1.0, 0.5, U.texNeon("JUKE", "#ffd400", ""), rotY || 0);
      this.addInteractable({
        x, y: 1.2, z, radius: 2.2, prompt: "[E] SLAP THE JUKEBOX",
        action: () => {
          if (!this.game.settings.musicOn) {
            this.game.ticker("The jukebox is off. Turn the soundtrack on in the pause menu or the phone.", "bad");
            return;
          }
          const s = ST.audio.cycleStation();
          this.game.radioManual = 30;
          this.game.ticker("Radio: " + ST.jokes.radioNames[s], "gold");
        }
      });
    }

    _addVending(x, z, rotY) {
      const tex = U.tex(64, 96, (g, w, h) => {
        g.fillStyle = "#2a2a3a"; g.fillRect(0, 0, w, h);
        g.fillStyle = "#0c0c14"; g.fillRect(6, 8, w - 12, 34);
        for (let i = 0; i < 5; i++) {
          g.fillStyle = ["#ff2d78", "#ffd400", "#2fe3ff"][i % 3];
          g.fillRect(10 + i * 9, 34, 7, 26);
        }
        g.fillStyle = "#fff"; g.font = "bold 11px 'Arial Black'";
        g.textAlign = "center";
        g.fillText("CIGS", w / 2, 56);
        g.fillStyle = "#ffd400"; g.font = "bold 13px 'Arial Black'";
        g.fillText("$6", w / 2, 78);
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.7), new THREE.MeshLambertMaterial({ map: tex }));
      mesh.position.set(x, 1.05, z); mesh.rotation.y = rotY || 0;
      this.scene.add(mesh);
      const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 1.05, z), material: this.physMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.55, 1.05, 0.35)));
      this.physics.addBody(body);
      const vx = x + Math.sin(rotY || 0) * 0.45;
      const vz = z + Math.cos(rotY || 0) * 0.45;
      this.addInteractable({
        x: vx, y: 1.2, z: vz, radius: 2.2, prompt: "[E] BUY CIGARETTES $6", action: () => {
          if (this.game.player.cash < 6) return this.game.ticker("You can't afford cigarettes. That's a new low.", "bad");
          this.game.player.cash -= 6;
          this.game.player.cigs += 1;
          ST.audio.cash();
          this.game.ticker("You bought a pack of cigarettes. Health awaits.", "gold");
        }
      });
    }

    _addSlot(x, z, rotY) {
      const front = U.tex(128, 128, (g, w, h) => {
        g.fillStyle = "#160a1e"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "#ffd400"; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
        g.fillStyle = "#ffd400"; g.font = "bold 20px 'Arial Black'"; g.textAlign = "center";
        g.fillText("LUCKY", w / 2, 30);
        g.fillStyle = "#ff2d78"; g.font = "bold 24px 'Arial Black'";
        g.fillText("PIG", w / 2, 58);
        g.fillStyle = "#fff"; g.font = "bold 30px 'Courier New'";
        g.fillText("7 7 7", w / 2, 94);
        g.fillStyle = "#2fe3ff"; g.font = "bold 10px 'Courier New'";
        g.fillText("PULL TO LOSE", w / 2, 114);
      });
      const group = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.3, 0.8), this.paint(0x2a1836));
      base.position.y = 1.15; group.add(base);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: front }));
      face.position.set(0, 1.35, 0.41); group.add(face);
      const tray = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.3), this.paint(0x111111));
      tray.position.set(0, 0.45, 0.45); group.add(tray);
      group.position.set(x, 0, z); group.rotation.y = rotY || 0;
      this.scene.add(group);
      const body = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 1.15, z), material: this.physMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.85, 1.15, 0.4)));
      if (rotY) { const q = new CANNON.Quaternion(); q.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotY); body.quaternion.copy(q); }
      this.physics.addBody(body);
      const ix = x + (rotY ? Math.sin(rotY) * 0.95 : 0);
      const iz = z + (rotY ? Math.cos(rotY) * 0.95 : 0.95);
      this.addInteractable({
        x: ix, y: 1.2, z: iz, radius: 2.6, prompt: "[E] PLAY THE SLOTS",
        action: () => this.game.openSlots()
      });
    }

    /* ================= street ================= */
    _buildBackdrop() {
      // Blocky background blocks beyond the fence: the town keeps going.
      const rows = [
        [-38, -50, 13, 8, 12, "brick", 0x3a2020, "MOTEL 6 1/2"],
        [-21, -51, 10, 7, 9, "stucco", 0x6a5a44, "SHITTOWN GAZETTE"],
        [0, -52, 16, 9, 12, "cinder", 0x4a4a52, "PAWN & GUNS"],
        [20, -50, 12, 8, 8, "siding", 0x5a4a36, "DONUTS"],
        [38, -51, 11, 7, 14, "brick", 0x3a2020, "HOTEL"],
        [-50, -14, 9, 22, 11, "stucco", 0x5a4a3a, ""],
        [-50, 36, 9, 16, 9, "siding", 0x5a4a36, ""],
        [50, -18, 9, 24, 10, "cinder", 0x444a52, ""],
        [50, 20, 9, 16, 8, "stucco", 0x6a5a44, "LIQUOR"],
        [-28, 57, 16, 8, 10, "brick", 0x3a2020, "BINGO"],
        [28, 57, 16, 8, 12, "siding", 0x5a4a36, "CHURCH OF CASH"]
      ];
      rows.forEach((r) => {
        const x = r[0], z = r[1], w = r[2], d = r[3], h = r[4];
        const tex = this.mat(r[5], Math.max(2, Math.round(w / 5)), Math.max(1, Math.round(h / 3)));
        this.addStaticBox(x, h / 2, z, w, h, d, tex);
        // roof lip
        this.addVisualBox(x, h + 0.25, z, w + 0.6, 0.5, d + 0.6, this.paint(0x1c1418));
        // windows
        const rowsN = Math.max(1, Math.floor(h / 3));
        for (let wy = 0; wy < rowsN; wy++) {
          for (let wx = 0; wx < Math.max(2, Math.floor(w / 4)); wx++) {
            const lit = Math.random() < 0.35;
            const win = this.addVisualBox(
              x - w / 2 + 2 + wx * 3.4,
              2 + wy * 2.6,
              z - d / 2 - 0.05,
              1.5, 1.2, 0.08,
              lit ? this.glow(0xffc46a) : this.paint(0x1a1f2a)
            );
            win.rotation.y = 0;
          }
        }
        if (r[6]) {
          const color = ["#ff2d78", "#ffd400", "#2fe3ff", "#5cff86"][rows.indexOf(r) % 4];
          this.addNeon(x, h + 2.2, z - d / 2 - 0.3, Math.min(w - 1, 10), 2, U.texNeon(r[6], color, ""), 0);
          this.addVisualBox(x, h + 2.2, z - d / 2 - 0.6, 0.2, 2.4, 0.2, this.mat("metal", 1, 1));
        }
      });

      // water tower: the only landmark Kentucky respects
      const wtX = -58, wtZ = -40;
      [-1, 1].forEach((ax) => {
        [-1, 1].forEach((az) => {
          const leg = this.addVisualBox(wtX + ax * 2.6, 7, wtZ + az * 2.6, 0.4, 14, 0.4, this.mat("metal", 1, 3));
          leg.rotation.z = ax * 0.08;
          leg.rotation.x = az * 0.08;
        });
      });
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 5.4, 4.4, 14), this.mat("siding", 3, 2));
      tank.position.set(wtX, 16.4, wtZ);
      this.scene.add(tank);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.2, 14), this.paint(0x3a3a42));
      cone.position.set(wtX, 19.7, wtZ);
      this.scene.add(cone);
      const wtTex = U.tex(256, 96, (g, w2, h2) => {
        g.fillStyle = "#3a3026"; g.fillRect(0, 0, w2, h2);
        g.fillStyle = "#f0e0b0"; g.font = "bold 38px 'Arial Black'"; g.textAlign = "center";
        g.fillText("SHITTOWN", w2 / 2, 42);
        g.font = "bold 18px 'Courier New'";
        g.fillText("KY · WATER IS A SCAM", w2 / 2, 70);
      });
      const wtSign = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.2), new THREE.MeshBasicMaterial({ map: wtTex, transparent: true }));
      wtSign.position.set(wtX, 16.6, wtZ - 5.5);
      this.scene.add(wtSign);

      // grain silos, because Kentucky
      [0, 1, 2].forEach((i) => {
        const sx = 52 + i * 5.2, sz = -58;
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 13, 12), this.mat("metal", 1, 3));
        silo.position.set(sx, 6.5, sz);
        this.scene.add(silo);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.2, 12), this.paint(0x4a4a52));
        cap.position.set(sx, 14.1, sz);
        this.scene.add(cap);
      });

      // church steeple and cross on the horizon
      this.addVisualBox(-40, 6, 62, 10, 12, 12, this.mat("siding", 2, 2));
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 9, 4), this.paint(0x3a2a22));
      spire.position.set(-40, 16.5, 62);
      this.scene.add(spire);
      this.addVisualBox(-40, 21.6, 62, 0.2, 2.4, 0.2, this.paint(0xd8c890));
      this.addVisualBox(-40, 22.4, 62, 1.2, 0.18, 0.18, this.paint(0xd8c890));

      // sagging power lines along the edge of town
      for (let z = -48; z <= 48; z += 16) {
        this.addVisualBox(-46, 4.6, z, 0.2, 9.2, 0.2, this.mat("metal", 1, 2));
        this.addVisualBox(-46, 9.1, z, 2.6, 0.16, 0.16, this.mat("metal", 1, 1));
        if (z < 48) {
          const wire = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 16), this.paint(0x111111));
          wire.position.set(-46, 8.9, z + 8);
          this.scene.add(wire);
        }
      }
    }

    addCar(x, z, rotY, color, opts) {
      opts = opts || {};
      const g = new THREE.Group();
      const paintMat = this.paintSmooth(color || 0x6a2a2a);
      const darkMat = this.paint(0x16161a);
      const glass = new THREE.MeshLambertMaterial({ color: 0x2a3a4a, transparent: true, opacity: 0.75 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.62, 4.35), paintMat);
      body.position.y = 0.72;
      g.add(body);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.3), paintMat);
      hood.position.set(0, 1.03, -1.45);
      g.add(hood);
      const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.3, 1.05), paintMat);
      trunk.position.set(0, 1.03, 1.6);
      g.add(trunk);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.78, 2.0), paintMat);
      cabin.position.set(0, 1.32, 0.18);
      g.add(cabin);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.08, 2.06), paintMat);
      roof.position.set(0, 1.74, 0.18);
      g.add(roof);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.56, 0.06), glass);
      windshield.position.set(0, 1.38, -0.84);
      windshield.rotation.x = -0.18;
      g.add(windshield);
      const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.06), glass);
      rearGlass.position.set(0, 1.38, 1.2);
      g.add(rearGlass);
      const bumpF = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 0.22), darkMat);
      bumpF.position.set(0, 0.55, -2.24);
      g.add(bumpF);
      const bumpR = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.22, 0.22), darkMat);
      bumpR.position.set(0, 0.55, 2.24);
      g.add(bumpR);
      const lights = [];
      [-1, 1].forEach((sd) => {
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 5), this.glow(0xffe6b0));
        head.position.set(sd * 0.66, 0.82, -2.26);
        g.add(head);
        lights.push(head);
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.06), this.glow(0xff2a1a));
        tail.position.set(sd * 0.68, 0.86, 2.26);
        g.add(tail);
      });
      const wheels = [];
      const tyre = this.paint(0x101014);
      const hub = this.paint(0x8a8a92);
      [[-0.98, -1.38], [0.98, -1.38], [-0.98, 1.42], [0.98, 1.42]].forEach((p) => {
        const wg = new THREE.Group();
        wg.position.set(p[0], 0.44, p[1]);
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 12), tyre);
        w.rotation.z = Math.PI / 2;
        wg.add(w);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.32, 8), hub);
        cap.rotation.z = Math.PI / 2;
        wg.add(cap);
        g.add(wg);
        wheels.push(wg);
      });
      // roof junk for the run-down look
      if (opts.junk) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 1.6), this.paint(0x3a3a40));
        rack.position.set(0, 1.84, 0.1);
        g.add(rack);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.9), this.paint(0x6a4a2a));
        box.position.set(0.1, 2.1, 0.2);
        g.add(box);
      }
      g.position.set(x, 0, z);
      g.rotation.y = rotY || 0;
      this.scene.add(g);
      const car = {
        group: g, wheels, lights, heading: rotY || 0, speed: 0,
        name: opts.name || "SHITBOX", color: color || 0x6a2a2a,
        ai: !!opts.ai, aiDir: opts.aiDir || 1, lane: opts.lane || 0,
        drivers: !!opts.drivers, forSale: !!opts.forSale
      };
      this.cars.push(car);
      return car;
    }

    _buildCars() {
      // Drivable junk. Parked off the driving lane.
      this.addCar(-3.4, -16, 0, 0x7a2a24, { name: "THE SHITBOX", junk: true });
      this.addCar(3.4, 18, Math.PI, 0x2a4a6a, { name: "MAMA'S BUICK" });
      this.addCar(26, 3.4, Math.PI / 2, 0x4a5a32, { name: "HUNTING TRUCK", junk: true });
      this.addCar(-26, -3.4, -Math.PI / 2, 0x8a6a24, { name: "THE MISTRESS" });
      this.addCar(-14, 34, 0, 0x5a2a5a, { name: "CHURCH VAN" });
      this.addCar(14, 22, Math.PI / 2, 0x6a4a22, { name: "SOMEONE'S TRUCK" });
      this.addCar(-20, 20, -Math.PI / 2, 0x2a5a4a, { name: "THE CIVIC" });
      this.addCar(44, -14, Math.PI, 0x7a5a2a, { name: "LOT QUEEN", junk: true });
      this.addCar(50, -2, Math.PI / 2, 0xc8a020, { name: "EARL'S SPECIAL", forSale: true });
      // Honest Earl's Used Cars: where dreams are repossessed.
      this.addNeon(42, 4.4, -21, 14, 2.2, U.texNeon("HONEST EARL'S", "#ffd400", "USED CARS · NO REFUNDS"), -Math.PI / 2);
      this.addStaticBox(42, 2.2, -21, 0.25, 4.4, 0.25, this.mat("metal", 1, 2));
      this.addProp({ x: 46.5, z: -10.5, w: 1.0, h: 1.4, d: 0.7, color: 0xc8b060, mass: 0, kind: "metal", breakable: false, name: "Earl's desk", y: 1.4 });
      this.addNeon(46.5, 3.4, -12.6, 5.2, 1.1, U.texNeon("BUY A CAR", "#5cff86", "$250 · CASH ONLY"), 0);
      this.addInteractable({
        x: 46.5, y: 1.2, z: -10.5, radius: 3.6, prompt: "[E] BUY A CAR $250",
        action: () => {
          const g = this.game, p = g.player;
          if (g.story && g.story.carBought) {
            g.ticker("Earl: 'You already bought the finest automobile in Shittown. Congratulations.'", "gold");
            return;
          }
          if (p.cash < 250) {
            g.ticker("Earl: 'Come back with $250. Or a kidney. I'm flexible.'", "bad");
            return;
          }
          p.cash -= 250;
          if (g.story) g.story.carBought = true;
          const sold = this.cars.find((c) => c.forSale);
          if (sold) sold.owned = true;
          g.addRespect(25, "bribe");
          ST.audio.cash();
          g.ticker("YOU BOUGHT A CAR. It is yellow and technically a car.", "gold");
          g.ui.updateHUD(p);
        }
      });

      // Ambient traffic. It circles the block forever, like a bad thought.
      this.addCar(-3.2, 40, 0, 0x8a3a2a, { ai: true, aiDir: -1, lane: -3.2, name: "TRAFFIC SEDAN" });
      this.addCar(3.2, -40, 0, 0x3a4a6a, { ai: true, aiDir: 1, lane: 3.2, name: "TRAFFIC SEDAN" });
      this.addCar(-3.2, -44, 0, 0x4a4a4a, { ai: true, aiDir: -1, lane: -3.2, name: "TRAFFIC SEDAN" });
    }

    _buildStreetDetail() {
      // crosswalks
      for (let c = 0; c < 2; c++) {
        const z = c ? -7.7 : 7.7;
        for (let i = 0; i < 5; i++) {
          this.addVisualBox(-4.8 + i * 2.4, 0.055, z, 1.0, 0.02, 2.4, this.paint(0xd8d4c4));
        }
      }
      // dashed center line
      for (let z = -52; z <= 52; z += 6) {
        if (Math.abs(z) < 7) continue;
        this.addVisualBox(0, 0.052, z, 0.16, 0.02, 3.0, this.paint(0xd8b84a));
      }
      // stop sign
      const signTex = U.tex(64, 64, (g, w, h) => {
        g.fillStyle = "#c42a2a"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "#f0f0f0"; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
        g.fillStyle = "#fff"; g.font = "bold 20px 'Arial Black'"; g.textAlign = "center";
        g.fillText("STOP", w / 2, 38);
      });
      this.addStaticBox(8.5, 1.5, 8.2, 0.1, 3, 0.1, this.mat("metal", 1, 2));
      const stop = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: signTex }));
      stop.position.set(8.5, 2.7, 8.15); this.scene.add(stop);
      // street name sign
      this.addStaticBox(-8.2, 1.8, 9.2, 0.1, 3.6, 0.1, this.mat("metal", 1, 2));
      this.addNeon(-8.2, 3.4, 9.2, 1.8, 0.7, U.texNeon("SHITTOWN AVE", "#5cff86", ""), 0);
      // traffic light
      this.addStaticBox(9.4, 2.4, -8.6, 0.16, 4.8, 0.16, this.mat("metal", 1, 2));
      this.addStaticBox(9.4, 4.6, -8.6, 0.4, 1.2, 0.35, this.paint(0x1a1a1a));
      [[0xff3b30, 4.9], [0xffd400, 4.6], [0x5cff86, 4.3]].forEach((l) => {
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 5), this.glow(l[0]));
        light.position.set(9.4, l[1], -8.4); this.scene.add(light);
      });
      // back street behind the strip, so the town reads as a grid
      this.addVisualBox(0, 0.014, -41.5, 108, 0.04, 7, this.mat("asphalt", 12, 1));
      for (let x = -50; x <= 50; x += 7) {
        this.addVisualBox(x, 0.05, -41.5, 3.2, 0.02, 0.14, this.paint(0xd8b84a));
      }
      // parking lot with lines out east
      this.addVisualBox(48, 0.02, -8, 14, 0.05, 26, this.mat("asphalt", 2, 4));
      for (let z = -18; z <= 2; z += 3.4) {
        this.addVisualBox(48, 0.052, z, 12, 0.02, 0.12, this.paint(0xc8c2b0));
      }
      // west-side alley slabs and stoops
      for (let z = -32; z <= 34; z += 9) {
        this.addVisualBox(-44.5, 0.05, z, 5, 0.1, 4.2, this.mat("sidewalk", 1, 1));
      }
      // potholes and litter
      for (let i = 0; i < 8; i++) {
        const x = U.rand(-30, 30), z = U.rand(-20, 20);
        if (Math.abs(x) < 7 || Math.abs(z) < 7) continue;
        this.addDecal(U.texScorch(), x, z, U.rand(0.7, 1.6), Math.random() * 6.28, 70, 0.65);
      }
      for (let i = 0; i < 18; i++) {
        this.addVisualBox(U.rand(-35, 35), 0.055, U.rand(-22, 22), U.rand(0.25, 0.6), 0.01, U.rand(0.2, 0.5), this.paint(0xc8c2b0));
      }
    }

    _buildNeonPass() {
      // old storefront neon
      const add = (x, y, z, w, h, text, color, sub, rot) => this.addNeon(x, y, z, w, h, U.texNeon(text, color, sub || ""), rot || 0);
      add(-34, 5.3, -19.62, 3.6, 0.9, "OPEN", "#5cff86", "", 0);
      add(-22, 5.3, -19.62, 3.6, 0.9, "BEER", "#ffd400", "", 0);
      add(27, 5.5, -19.62, 3.6, 0.9, "LIVE", "#ff2d78", "", 0);
      add(15, 5.5, -19.62, 3.6, 0.9, "18+", "#ff2d78", "", 0);
      add(-30, 4.2, 17.62, 4.0, 0.9, "OPEN 24H", "#5cff86", "", Math.PI);
      add(-21, 4.2, 17.62, 3.0, 0.9, "ATM", "#2fe3ff", "", Math.PI);
      add(37.55, 3.7, 8.2, 2.6, 0.8, "OPEN", "#5cff86", "", -Math.PI / 2);
      add(37.55, 3.7, 1.5, 2.6, 0.8, "BONGS", "#5cff86", "", -Math.PI / 2);
      add(-41.55, 3.9, 11.8, 2.8, 0.85, "WALK INS", "#2fe3ff", "", Math.PI / 2);
      add(-41.55, 3.9, 18.4, 2.8, 0.85, "SHAVE", "#ffd400", "", Math.PI / 2);
      add(-15, 5.2, 37.62, 4.0, 0.9, "OPEN LATE", "#ffd400", "", Math.PI);
      add(15, 5.2, 37.62, 4.0, 0.9, "NO REFUNDS", "#ff2d78", "", Math.PI);
      add(0, 15.2, -46, 13, 3.2, "SHITTOWN", "#ff2d78", "EST. 1994 · STILL HERE", 0);
      // strips
      const strip = (x, y, z, w, d, color) => this.addVisualBox(x, y, z, w, 0.07, d, this.glow(color));
      strip(-28, 3.4, -19.68, 19, 0.06, 0xffd24a);
      strip(22, 3.5, -19.68, 21, 0.06, 0xff2d78);
      strip(0, 3.2, 37.7, 8, 0.06, 0x2fe3ff);
      strip(37.62, 3.2, 5, 0.06, 8, 0x5cff86);
      strip(-41.62, 3.0, 15, 0.06, 8, 0x2fe3ff);
      strip(-26, 0.35, -30.25, 10, 0.05, 0xffd24a);
      strip(22, 0.9, -29.9, 11, 0.05, 0xff2d78);
      strip(0, 0.12, 39, 1.2, 0.9, 0x2fe3ff);
      // neon puddles on the street
      const pool = (x, z, color) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(U.rand(2.5, 4.5), U.rand(1.4, 2.4)),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending }));
        m.rotation.x = -Math.PI / 2;
        m.position.set(x, 0.06, z);
        this.scene.add(m);
      };
      pool(-24, -17.5, 0xffd24a);
      pool(22, -17.5, 0xff2d78);
      pool(38, 5.5, 0x5cff86);
      pool(-42, 12, 0x2fe3ff);
      pool(0, 35.5, 0x2fe3ff);
    }

    addSupplyPickup(x, z, type, amount, y) {
      const color = type === "weed" ? 0x3a7a32 : type === "wraps" ? 0x8a5a32 : 0xd8d0b8;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.2), this.paint(color));
      mesh.position.set(x, (y === undefined ? 0.4 : y), z);
      this.scene.add(mesh);
      const label = type === "weed" ? "WEED BAG" : type === "wraps" ? "BLUNT WRAPS" : "ROLLING PAPERS";
      const item = {
        x, y: (y === undefined ? 0.4 : y) + 0.2, z, radius: 2.2,
        prompt: "[E] TAKE " + label,
        action: () => {
          this.game.player[type] += (amount || 1);
          this.game.addRespect(1, "bribe");
          this.game.ticker("Found " + label.toLowerCase() + ". Now smoke like a grown-up.", "gold");
          this.scene.remove(mesh);
          const i = this.interactables.indexOf(item);
          if (i >= 0) this.interactables.splice(i, 1);
        }
      };
      this.addInteractable(item);
    }

    addExtinguisherPickup(x, z, y) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 8), this.paint(0xc42a2a));
      mesh.position.set(x, (y === undefined ? 0.4 : y) + 0.31, z);
      this.scene.add(mesh);
      const item = {
        x, y: (y === undefined ? 0.4 : y) + 0.4, z, radius: 2.3,
        prompt: "[E] TAKE FIRE EXTINGUISHER",
        action: () => {
          this.game.player.hasExtinguisher = true;
          mesh.visible = false;
          this.game.addRespect(2, "bribe");
          this.game.ticker("Fire extinguisher acquired. Hold X to spray.", "gold");
          ST.audio.cash();
          const i = this.interactables.indexOf(item);
          if (i >= 0) this.interactables.splice(i, 1);
        }
      };
      this.addInteractable(item);
    }

    addWaterCooler(x, z) {
      this.addStaticBox(x, 0.6, z, 0.7, 1.2, 0.5, this.paint(0xd8d8d8));
      this.addVisualBox(x, 1.35, z, 0.5, 0.4, 0.4, this.paint(0x5a9fd8));
      this.addInteractable({
        x, y: 1.1, z, radius: 2.3, prompt: "[E] REFILL WATER BOTTLES",
        action: () => {
          this.game.player.water = Math.min(9, this.game.player.water + 3);
          ST.audio.splash();
          this.game.ticker("Water bottles refilled. Hydration is a weapon.", "gold");
        }
      });
    }

    _buildRedLight() {
      this.redLight = { x: 42, z: 36 };
      // sidewalk into the district
      this.addVisualBox(21, 0.04, 36, 32, 0.08, 3.2, this.mat("sidewalk", 10, 1));
      this.addVisualBox(31, 0.045, 36, 10, 0.09, 3.0, this.mat("asphalt", 3, 1));
      // district arch
      this.addStaticBox(35.4, 2.2, 29.4, 0.18, 4.4, 0.18, this.mat("metal", 1, 2));
      this.addStaticBox(35.4, 2.2, 46.6, 0.18, 4.4, 0.18, this.mat("metal", 1, 2));
      this.addNeon(35.25, 4.7, 38, 12, 2.2, U.texNeon("RED LIGHT DISTRICT", "#ff2d78", "ADULTS ONLY · NO REFUNDS · NO REGRETS"), -Math.PI / 2);
      // book store shell
      let x0 = 38, x1 = 48, z0 = 30, z1 = 38, H = 5;
      let wall = this.mat("brick", 3, 2);
      let holesW = [{ u0: 33, u1: 36, v0: 0, v1: 3.4, type: "door" }];
      this.wallX(z0, x0, x1, H, wall, []);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, holesW);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor(43, 34, 9, 7, this.mat("carpet", 3, 2));
      this.addStaticBox(43, H + 0.15, 34, 11, 0.3, 9, this.paint(0x4a3038));
      this.addNeon(37.6, 5.1, 34, 6.2, 2.0, U.texNeon("DIRTY BOOKS", "#ff2d78", "MAGAZINES · VHS · THERAPY"), -Math.PI / 2);
      this.addPoster(37.6, 2.2, 31.4, 1.1, 1.7, U.texPoster("ADULT", "SECTION", "#2a0c16", "#ff2d78"), -Math.PI / 2);
      this.addPoster(37.6, 2.2, 36.6, 1.1, 1.7, U.texPoster("NO", "CAMERAS", "#1a1018", "#ffd400"), -Math.PI / 2);
      this.addNeon(43, 4.5, 37.7, 5.5, 1.4, U.texNeon("ADULT SECTION", "#ff2d78", "18+ · CASH ONLY"), 0);
      // shelves + magazines
      for (let srow = 0; srow < 2; srow++) {
        const zz = srow ? 32.2 : 35.8;
        this.addStaticBox(41, 1.1, zz, 6, 2.2, 0.35, this.mat("wood", 2, 1));
        for (let i = 0; i < 7; i++) {
          this.addProp({ x: 38.8 + i * 0.75, y: 1.55, z: zz - 0.05, w: 0.35, h: 0.45, d: 0.12, color: i % 2 ? 0x8a2a4a : 0x2a4a7a, mass: 0.2, kind: "wood", breakable: true, health: 5, name: "magazine" });
        }
      }
      this.addStaticBox(46, 0.6, 34, 1.2, 1.2, 3.2, this.mat("wood", 2, 1));
      this.addNeon(47.6, 3.2, 34, 2.6, 0.8, U.texNeon("CASH", "#ffd400", ""), -Math.PI / 2);
      // peep show shell
      x0 = 38; x1 = 48; z0 = 40; z1 = 46; H = 5;
      wall = this.mat("stucco", 2, 2);
      holesW = [{ u0: 42, u1: 44.6, v0: 0, v1: 3.3, type: "door" }];
      this.wallX(z0, x0, x1, H, wall, []);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, holesW);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor(43, 43, 9, 5, this.mat("carpet", 3, 2));
      this.addStaticBox(43, H + 0.15, 43, 11, 0.3, 7, this.paint(0x3a1a28));
      this.addNeon(37.6, 4.9, 43, 5.6, 1.9, U.texNeon("PEEP CITY", "#ff2d78", "25¢ · CURTAINS · MYSTERY"), -Math.PI / 2);
      // booths
      for (let i = 0; i < 3; i++) {
        this.addStaticBox(45.8, 1.2, 41 + i * 2, 1.4, 2.4, 1.4, this.mat("plywood", 1, 1));
        this.addNeon(44.9, 1.8, 41 + i * 2, 0.8, 0.5, U.texNeon("25¢", "#ffd400", ""), -Math.PI / 2);
      }
      this.addInteractable({
        x: 39.2, y: 1.2, z: 43, radius: 2.6, prompt: "[E] PEEP SHOW $5",
        action: () => {
          if (this.game.player.cash < 5) { this.game.ticker("No money. The curtain stays closed.", "bad"); return; }
          this.game.player.cash -= 5;
          this.game.addRespect(5, "bribe");
          ST.audio.cash();
          this.game.ticker("You paid $5 for a curtain and a life lesson.", "gold");
          this.game.say("What happens in the booth stays in the booth. Mostly.");
          this.game.shake(0.2);
        }
      });
      this.addInteractable({
        x: 47.1, y: 1.2, z: 43, radius: 2.3, prompt: "[E] BUY TOKENS $5",
        action: () => {
          if (this.game.player.cash < 5) return this.game.ticker("No cash, no tokens.", "bad");
          this.game.player.cash -= 5;
          this.game.player.tokens = (this.game.player.tokens || 0) + 5;
          ST.audio.cash();
          this.game.ticker("Five tokens. The district smells like ambition.", "gold");
        }
      });
      // red bulbs along the front
      for (let z = 30; z <= 46; z += 2.1) {
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), this.glow(0xff2d3a));
        bulb.position.set(37.45, 3.7, z);
        this.scene.add(bulb);
      }
      const rl = new THREE.PointLight(0xff2d4a, 0.7, 18, 2);
      rl.position.set(42, 4.2, 36);
      this.scene.add(rl);
      // alley between the shops
      this.addProp({ x: 42, z: 39, w: 1.2, h: 1.2, d: 1.2, color: 0x2a3a2a, mass: 20, kind: "metal", breakable: true, health: 40, name: "dumpster" });
      this.addProp({ x: 44.8, z: 39, w: 0.5, h: 0.7, d: 0.5, shape: "cylinder", color: 0x3a3a3a, mass: 5, kind: "metal", breakable: true, health: 14, name: "trash can" });
      this.addNeon(37.55, 3.2, 39, 0.9, 0.6, U.texNeon("NO", "LOITERING", "#ff2d78", "#ffd400"), -Math.PI / 2);
      this.addGraffiti(37.55, 1.6, 39.8, -Math.PI / 2, "WHAT HAPPENS HERE STAYS HERE", "#ff2d78");
      // red puddle glow
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.2), new THREE.MeshBasicMaterial({ color: 0xff2d4a, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }));
      pool.rotation.x = -Math.PI / 2; pool.position.set(36, 0.06, 37.5); this.scene.add(pool);
    }

    /* ================= run-down 2000s strip ================= */
    _buildMall() {
      const x0 = -20, x1 = 20, z0 = 38, z1 = 52, H = 7.5;
      const wall = this.mat("stucco", 5, 2.4);
      const floor = this.mat("mallFloor", 8, 3);
      const holesN = [
        { u0: -3, u1: 3, v0: 0, v1: 4.4, type: "door" },
        { u0: -12, u1: -8, v0: 2.6, v1: 5.0, type: "window" },
        { u0: 8, u1: 12, v0: 2.6, v1: 5.0, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, holesN);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, []);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor(0, 45, 39, 13, floor);
      this.addStaticBox(0, H + 0.15, 45, 41, 0.3, 15, this.paint(0x5a4a42));
      this.addNeon(0, 8.3, 37.62, 18, 3.2, U.texNeon("SHITTOWN MALL", "#ffd400", "80% VACANT · STILL OPEN · SINCE 1994"), Math.PI);
      this.addNeon(0, 3.9, 37.8, 6, 1.2, U.texNeon("WELCOME", "#2fe3ff", "NO LOITERING"), Math.PI);
      this.addPoster(-15, 3, 37.75, 1.3, 2.0, U.texPoster("MALL", "RATS", "#241a12", "#c9ff2f"), Math.PI);
      this.addPoster(15, 3, 37.75, 1.3, 2.0, U.texPoster("CINEMA", "CLOSED 1999", "#1a1a22", "#ff2d78"), Math.PI);
      this.addNeon(-12, 5.6, 37.7, 6.2, 1.3, U.texNeon("WIENER SCHNITZEL", "#ffd400", "FOOD COURT"), Math.PI);
      this.addNeon(12, 5.6, 37.7, 6.2, 1.3, U.texNeon("POP'S CHICKEN", "#ff3b30", "8 PC · $9"), Math.PI);
      this.addNeon(0, 5.6, 37.7, 4.6, 1.1, U.texNeon("PIXEL PIT", "#2fe3ff", "ARCADE"), Math.PI);

      // shopfront walls facing the corridor
      const doorHoles = [
        { u0: 40.5, u1: 43.5, v0: 0, v1: 3.4, type: "door" },
        { u0: 47.5, u1: 50.5, v0: 0, v1: 3.4, type: "door" }
      ];
      this.wallZ(-4, z0, z1, H, wall, doorHoles);
      this.wallZ(4, z0, z1, H, wall, doorHoles);
      // shop dividers
      this.wallX(45.5, x0, -4, H, wall, []);
      this.wallX(45.5, 4, x1, H, wall, []);

      // corridor ceiling lights
      for (let z = 40; z < 52; z += 3) {
        this.addVisualBox(0, 6.9, z, 2.6, 0.12, 0.5, this.glow(0xfff2c8));
      }
      const mallLight = new THREE.PointLight(0xffe0b0, 0.5, 18, 2);
      mallLight.position.set(0, 6.2, 44);
      this.scene.add(mallLight);

      /* --- WIENER SCHNITZEL (left north) --- */
      this.addStaticBox(-17.2, 0.6, 41.8, 1.2, 1.2, 6.2, this.mat("wood", 2, 2));
      this.addNeon(-19.7, 4.7, 42, 6, 1.5, U.texNeon("WIENER SCHNITZEL", "#ffd400", "$3 SAUSAGE · $5 COMBO · $7 REGRET"), Math.PI / 2);
      this.addPoster(-19.7, 2.2, 39.8, 1.2, 1.8, U.texPoster("CURRY", "WURST $4", "#2a1d0c", "#ff8a1f"), Math.PI / 2);
      for (let i = 0; i < 4; i++) {
        this.addProp({
          x: -17.2, y: 1.32, z: 39.4 + i * 1.5, w: 0.22, h: 0.4, d: 0.22, shape: "cylinder",
          color: 0xb05a2a, mass: 0.4, kind: "wood", breakable: false, name: "sausage"
        });
      }
      this._mallTable(-10.5, 41.2, 0x8a2a2a);
      this._mallTable(-13.5, 43.2, 0x8a2a2a);

      /* --- POP'S CHICKEN (right north) --- */
      this.addStaticBox(17.2, 0.6, 41.8, 1.2, 1.2, 6.2, this.mat("wood", 2, 2));
      this.addNeon(19.7, 4.7, 42, 6.4, 1.6, U.texNeon("POP'S CHICKEN", "#ff3b30", "BISCUITS · FRIED · NO QUESTIONS"), -Math.PI / 2);
      this.addPoster(19.7, 2.2, 39.8, 1.2, 1.8, U.texPoster("8 PC", "BUCKET $9", "#2a0e0e", "#ffd400"), -Math.PI / 2);
      this.addStaticBox(19, 1.1, 44.4, 1.2, 2.2, 1.4, this.mat("metal", 1, 2)); // fryer
      this.addProp({ x: 17.4, z: 44.5, w: 1.0, h: 1.0, d: 0.8, color: 0x9a2020, mass: 12, kind: "metal", breakable: true, health: 30, name: "fryer basket" });
      this._mallTable(10.5, 41.2, 0x8a6a2a);
      this._mallTable(13.5, 43.2, 0x8a6a2a);

      /* --- PIXEL PIT ARCADE (left south) --- */
      this.addNeon(-19.7, 4.8, 49, 5.5, 1.5, U.texNeon("PIXEL PIT", "#2fe3ff", "TOKENS · 25¢ · NO REFUNDS"), Math.PI / 2);
      for (let i = 0; i < 4; i++) {
        const az = 46.5 + i * 1.45;
        this.addStaticBox(-18.6, 1.0, az, 1.6, 2.0, 0.9, this.paint(0x1c1230));
        const screen = U.tex(64, 48, (g, w, h) => {
          g.fillStyle = "#050510"; g.fillRect(0, 0, w, h);
          g.fillStyle = ["#ff2d78", "#2fe3ff", "#c9ff2f", "#ffd400"][i];
          for (let k = 0; k < 12; k++) g.fillRect(Math.random() * w, Math.random() * h, 4, 3);
          g.fillStyle = "#fff"; g.font = "bold 9px 'Courier New'"; g.textAlign = "center";
          g.fillText(["TURBO", "PUNCH", "RACE", "MALL"][i], w / 2, 12);
        });
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.5), new THREE.MeshBasicMaterial({ map: screen }));
        scr.position.set(-17.78, 1.35, az); scr.rotation.y = Math.PI / 2;
        this.scene.add(scr);
      }
      this.addInteractable({
        x: -16.9, y: 1.2, z: 47.2, radius: 3, prompt: "[E] PLAY THE ARCADE",
        action: () => this.game.openPhone("ds")
      });
      this.addGraffiti(-19.6, 2.0, 50.5, Math.PI / 2, "I BEAT YOU 2 TIMES", "#ff2d78");
      this.addProp({ x: -6.5, z: 50.5, w: 1.0, h: 1.0, d: 1.0, color: 0x5a3a22, mass: 14, kind: "wood", breakable: true, health: 34, name: "crate" });

      /* --- VACANT UNIT (right south) --- */
      this.addNeon(19.7, 4.6, 49, 5, 1.4, U.texNeon("FOR LEASE", "#ffd400", "$900/MO · AS-IS · HAUNTED"), -Math.PI / 2);
      this.addPoster(19.7, 2.2, 47, 1.2, 1.8, U.texPoster("RENT", "THIS DUMP", "#201a12", "#c9ff2f"), -Math.PI / 2);
      this.addGraffiti(19.6, 2.0, 50.5, -Math.PI / 2, "MALL GOTH 4 LIFE", "#5cff86");
      for (let i = 0; i < 4; i++) {
        this.addProp({ x: 12 + i * 1.6, z: 47 + (i % 2) * 2, w: 1.0, h: 1.0, d: 1.0, color: 0x7a5a35, mass: 14, kind: "wood", breakable: true, health: 34, name: "crate" });
      }
      this.addProp({ x: 15, z: 50.5, w: 2.0, h: 0.5, d: 1.2, color: 0x4a4a6a, mass: 16, kind: "wood", breakable: true, health: 30, name: "mattress" });
      this.addProp({ x: 8, z: 50.5, w: 0.7, h: 1.7, d: 0.4, color: 0xd8c8b0, mass: 10, kind: "plastic", breakable: true, health: 20, name: "mannequin" });

      /* --- corridor --- */
      // fountain
      this.addStaticBox(0, 0.35, 47, 3.4, 0.7, 3.4, this.mat("tile", 2, 2)).visible = false;
      const fBase = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 0.7, 12), this.mat("tile", 2, 2));
      fBase.position.set(0, 0.35, 47); this.scene.add(fBase);
      const fWater = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 12), new THREE.MeshBasicMaterial({ color: 0x2a5a58 }));
      fWater.position.set(0, 0.73, 47); this.scene.add(fWater);
      const fPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.5, 8), this.mat("tile", 1, 1));
      fPillar.position.set(0, 1.4, 47); this.scene.add(fPillar);
      this.addInteractable({
        x: 0, y: 1.0, z: 47, radius: 3, prompt: "[E] MAKE A WISH",
        action: () => {
          this.game.addRespect(1, "bribe");
          this.game.ticker("You wish for a better town. The fountain declines.", "gold");
          ST.audio.splash();
        }
      });
      for (let i = 0; i < 10; i++) {
        this.addVisualBox(U.rand(-1, 1), 0.78, 47 + U.rand(-1, 1), 0.12, 0.02, 0.12, this.glow(0xffd400));
      }
      this.addProp({ x: -2.8, z: 40.5, w: 2.2, h: 0.4, d: 0.6, color: 0x5a3a22, mass: 30, kind: "wood", breakable: true, health: 50, name: "mall bench" });
      this.addProp({ x: 2.8, z: 40.5, w: 2.2, h: 0.4, d: 0.6, color: 0x5a3a22, mass: 30, kind: "wood", breakable: true, health: 50, name: "mall bench" });
      // dead planter
      this.addStaticBox(-2.9, 0.5, 44.2, 1.2, 1.0, 1.2, this.mat("cinder", 1, 1));
      this.addProp({ x: -2.9, z: 44.2, w: 0.8, h: 1.0, d: 0.8, color: 0x4a3a20, mass: 4, kind: "wood", breakable: true, health: 14, name: "dead plant" });
      this.addStaticBox(2.9, 0.5, 49.8, 1.2, 1.0, 1.2, this.mat("cinder", 1, 1));
      // broken escalator
      const esc = this.addVisualBox(0, 1.0, 51, 3.4, 0.4, 3.0, this.mat("metal", 2, 2));
      esc.rotation.x = -0.12;
      this.addStaticBox(0, 1.1, 51, 3.4, 0.5, 3.0, this.mat("metal", 2, 2));
      this.addNeon(0, 3.4, 51.7, 3.4, 0.9, U.texNeon("ESCALATOR", "#ff3b30", "OUT OF ORDER SINCE 2003"), Math.PI);
      // closed kiosk
      this.addStaticBox(0, 1.1, 50, 2.2, 2.2, 1.2, this.mat("plywood", 1, 1));
      this.addPoster(0, 1.6, 49.35, 1.8, 1.2, U.texPoster("PHONE", "CASES $5", "#1a1a20", "#2fe3ff"), Math.PI);
      // trash & paper
      this.addProp({ x: -2.2, z: 38.8, w: 0.7, h: 1.0, d: 0.7, shape: "cylinder", color: 0x3a3a3a, mass: 9, kind: "metal", breakable: true, health: 24, name: "trash can" });
      this.addProp({ x: 2.2, z: 46, w: 0.7, h: 1.0, d: 0.7, shape: "cylinder", color: 0x3a3a3a, mass: 9, kind: "metal", breakable: true, health: 24, name: "trash can" });
      this.addGraffiti(-19.65, 1.8, 40, Math.PI / 2, "ESCALATOR IS A SCAM", "#ffd400");
      this.addGraffiti(19.65, 1.8, 39.5, -Math.PI / 2, "80% VACANT 100% VIBES", "#c9ff2f");

      this.addExtinguisherPickup(3.2, 39.6);
      this.addWaterCooler(-3.2, 41.2);
      // BOBA + VAPE kiosk
      this.addStaticBox(2.6, 0.6, 44.6, 2.2, 1.2, 1.2, this.mat("wood", 2, 1));
      this.addNeon(2.6, 2.3, 43.95, 2.4, 0.75, U.texNeon("BOBA + VAPE", "#2fe3ff", "$6 · $12 · VIBES"), Math.PI);
      this.addVisualBox(2.6, 1.05, 44.6, 2.0, 0.05, 0.9, this.glow(0x2fe3ff));
      for (let i = 0; i < 4; i++) {
        this.addProp({ x: 1.6 + i * 0.6, y: 1.18, z: 44.6, w: 0.12, h: 0.2, d: 0.12, shape: "cylinder", color: i % 2 ? 0xffd400 : 0xff2d78, mass: 0.1, kind: "plastic", breakable: true, health: 2, name: "boba cup" });
      }
      this.addInteractable({
        x: 2.6, y: 1.1, z: 43.8, radius: 2.4, prompt: "[E] BUY BOBA $6",
        action: () => {
          if (this.game.player.cash < 6) return this.game.ticker("No boba money. Tragic.", "bad");
          this.game.player.cash -= 6;
          this.game.player.health = Math.min(this.game.player.maxHealth, this.game.player.health + 12);
          this.game.addRespect(1, "bribe");
          ST.audio.cash();
          this.game.ticker("Brown sugar boba. The ice is extra. The vibes are free.", "gold");
        }
      });
      this.addInteractable({
        x: 2.6, y: 1.1, z: 45.4, radius: 2.4, prompt: "[E] BUY VAPE $12",
        action: () => {
          if (this.game.player.cash < 12) return this.game.ticker("No vape money. Go loot a mailbox.", "bad");
          this.game.player.cash -= 12;
          this.game.player.vapes += 1;
          ST.audio.cash();
          this.game.addRespect(1, "bribe");
          this.game.ticker("Vape acquired. Press V to become a cloud.", "gold");
        }
      });
      // exterior sidewalk / steps
      this.addVisualBox(0, 0.04, 37.2, 14, 0.08, 2.4, this.mat("sidewalk", 4, 1));
      // plaza junk
      this.addProp({ x: -8, z: 36, w: 1.0, h: 1.0, d: 1.6, color: 0x8a8a92, mass: 18, kind: "metal", breakable: true, health: 30, name: "shopping cart" });
      this.addProp({ x: 9, z: 36.5, w: 0.8, h: 1.0, d: 0.6, color: 0x8a8a8a, mass: 20, kind: "metal", breakable: true, health: 26, name: "newspaper box" });
      this.addPoster(-20.1, 2.4, 43, 1.3, 2, U.texPoster("WE", "DELIVER", "#1c2418", "#5cff86"), -Math.PI / 2);
    }

    _mallTable(x, z, color) {
      this.addProp({ x, z, w: 1.5, h: 0.1, d: 1.5, color, mass: 10, kind: "wood", breakable: true, health: 30, name: "food court table", y: 0.95 });
      for (let k = 0; k < 3; k++) {
        const a = U.rand(0, Math.PI * 2);
        this.addProp({ x: x + Math.cos(a) * 1.2, z: z + Math.sin(a) * 1.2, w: 0.5, h: 0.9, d: 0.5, color: 0x4a4a52, mass: 5, kind: "plastic", breakable: true, health: 20, name: "chair" });
      }
    }

    _buildWeedShop() {
      const x0 = 38, x1 = 48, z0 = 0, z1 = 10, H = 4.8;
      const wall = this.mat("stucco", 2, 1.8);
      const floor = this.mat("wood", 3, 3);
      const holesW = [
        { u0: 3.5, u1: 6.5, v0: 0, v1: 3.4, type: "door" },
        { u0: 7.2, u1: 9.2, v0: 2.1, v1: 3.9, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, []);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, holesW);
      this.wallZ(x1, z0, z1, H, wall, []);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0 + 1, 0.3, z1 - z0 + 1, this.paint(0x4a3a32));
      this.addNeon(37.6, 5.3, 5, 7, 2.2, U.texNeon("420 DEPOT", "#5cff86", "WEED · BONGS · QUESTIONABLE ADVICE"), -Math.PI / 2);
      this.addVisualBox(42, 4.2, 5, 6, 0.07, 0.3, this.glow(0xbfffd0));
      // green cross
      this.addVisualBox(37.5, 7.1, 5, 0.2, 1.6, 0.4, this.glow(0x3dff6a));
      this.addVisualBox(37.5, 7.1, 5, 0.2, 0.4, 1.6, this.glow(0x3dff6a));
      this.addPoster(37.62, 2.2, 2, 1.2, 1.9, U.texPoster("MEDICAL?", "SURE.", "#102a16", "#5cff86"), -Math.PI / 2);
      this.addPoster(37.62, 2.2, 8.4, 1.2, 1.9, U.texPoster("NO", "REFUNDS", "#241a12", "#ffd400"), -Math.PI / 2);
      // counter + clerk space
      this.addStaticBox(45.2, 0.6, 5, 1.2, 1.2, 6.2, this.mat("wood", 2, 2));
      this.addNeon(47.7, 3.6, 5, 4, 1.0, U.texNeon("ASK FOR DAVE", "#5cff86", ""), -Math.PI / 2);
      // shelves with jars
      for (let s = 0; s < 2; s++) {
        const zz = s ? 8.4 : 1.6;
        for (let level = 0; level < 3; level++) {
          this.addStaticBox(42, 0.45 + level * 0.65, zz, 7, 0.06, 0.5, this.mat("metal", 3, 1));
          for (let i = 0; i < 6; i++) {
            this.addProp({
              x: 39.5 + i * 1.0, y: 0.82 + level * 0.65, z: zz + (s ? -0.1 : 0.1), w: 0.32, h: 0.45, d: 0.32, shape: "cylinder",
              color: i % 2 ? 0x4a7a2a : 0x6a3a8a, mass: 0.5, kind: "glass", breakable: true, health: 6, name: "weed jar"
            });
          }
        }
      }
      // bong on the counter
      const bong = this.addProp({ x: 45.2, y: 1.5, z: 2.2, w: 0.3, h: 0.9, d: 0.3, shape: "cylinder", color: 0x3d8a5a, mass: 1.2, kind: "glass", breakable: true, health: 8, name: "bong" });
      this.addInteractable({
        x: 45.2, y: 1.2, z: 2.2, radius: 2.4, prompt: "[E] RIP THE BONG",
        action: () => this.game.player.bongHit()
      });
      this.addInteractable({
        x: 45.2, y: 1.2, z: 6.2, radius: 2.3, prompt: "[E] BUY ROLLING PAPERS $2",
        action: () => {
          if (this.game.player.cash < 2) return this.game.ticker("Papers are $2. You have less than that.", "bad");
          this.game.player.cash -= 2;
          this.game.player.papers += 3;
          ST.audio.cash();
          this.game.ticker("3 rolling papers. Now find some weed.", "gold");
        }
      });
      this.addInteractable({
        x: 45.2, y: 1.2, z: 7.2, radius: 2.3, prompt: "[E] BUY BLUNT WRAPS $3",
        action: () => {
          if (this.game.player.cash < 3) return this.game.ticker("Wraps are $3. The struggle is real.", "bad");
          this.game.player.cash -= 3;
          this.game.player.wraps += 2;
          ST.audio.cash();
          this.game.ticker("2 blunt wraps. Classy.", "gold");
        }
      });
      this.addProp({ x: 43.5, z: 7.6, w: 2.2, h: 0.8, d: 1.0, color: 0x4a2a6a, mass: 30, kind: "wood", breakable: true, health: 45, name: "couch" });
      this.addProp({ x: 39.4, z: 7.6, w: 0.6, h: 1.0, d: 0.6, shape: "cylinder", color: 0x8a5a3a, mass: 4, kind: "wood", breakable: true, health: 12, name: "plant" });
      this.addVisualBox(39.4, 1.2, 7.6, 0.5, 0.8, 0.5, this.glow(0x3dff6a)).material = new THREE.MeshLambertMaterial({ color: 0x3d8a3a, flatShading: true });
      // path from the road
      this.addVisualBox(22, 0.04, 5, 32, 0.08, 3.0, this.mat("sidewalk", 10, 1));
      this.addVisualBox(34, 0.045, 5, 8, 0.09, 3.0, this.mat("asphalt", 3, 1));
    }

    _buildBarber() {
      const x0 = -52, x1 = -42, z0 = 10, z1 = 20, H = 4.5;
      const wall = this.mat("siding", 2, 1.4);
      const floor = this.mat("checker", 3, 3);
      const holesE = [
        { u0: 13.5, u1: 16.5, v0: 0, v1: 3.3, type: "door" },
        { u0: 17, u1: 19, v0: 2.0, v1: 3.8, type: "window" }
      ];
      this.wallX(z0, x0, x1, H, wall, []);
      this.wallX(z1, x0, x1, H, wall, []);
      this.wallZ(x0, z0, z1, H, wall, []);
      this.wallZ(x1, z0, z1, H, wall, holesE);
      this.addFloor((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 - 1, z1 - z0 - 1, floor);
      this.addStaticBox((x0 + x1) / 2, H + 0.15, (z0 + z1) / 2, x1 - x0 + 1, 0.3, z1 - z0 + 1, this.paint(0x44444a));
      this.addNeon(-41.6, 5.0, 15, 6.4, 1.8, U.texNeon("CUTS & BLOOD", "#2fe3ff", "BARBER · $10 · NO CRYING"), Math.PI / 2);
      this.addVisualBox(-47, 4.1, 15, 4, 0.07, 0.3, this.glow(0xd8f4ff));
      // barber pole
      const poleMat = new THREE.MeshLambertMaterial({ map: U.texBarber(), flatShading: true });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.6, 8), poleMat);
      pole.position.set(-41.2, 2.2, 13.2);
      this.scene.add(pole);
      this.addStaticBox(-41.2, 2.2, 13.2, 0.4, 2.6, 0.4, this.mat("metal", 1, 2)).visible = false;
      this.addNeon(-41.6, 3.1, 18.2, 1.6, 0.8, U.texNeon("$10", "#ffd400", ""), Math.PI / 2);
      // chair
      this.addStaticBox(-47.4, 0.5, 15, 0.9, 0.9, 0.9, this.mat("metal", 1, 1));
      this.addProp({ x: -47.4, y: 1.2, z: 15, w: 1.0, h: 0.3, d: 1.0, color: 0x6a1f2a, mass: 16, kind: "wood", breakable: true, health: 30, name: "barber chair seat" });
      this.addVisualBox(-47.4, 1.75, 15.62, 0.9, 0.9, 0.16, this.mat("metal", 1, 1));
      this.addVisualBox(-47.4, 2.25, 15.62, 0.55, 0.25, 0.18, this.paint(0x6a1f2a));
      this.addVisualBox(-47.4, 1.55, 14.45, 0.8, 0.16, 0.3, this.mat("metal", 1, 1));
      for (let i = 0; i < 2; i++) this.addVisualBox(-47.9 + i * 1.0, 1.45, 15, 0.12, 0.12, 0.9, this.mat("metal", 1, 1));
      // mirror
      const mirror = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.4), new THREE.MeshLambertMaterial({ color: 0x9fb4c8, emissive: 0x1a2230 }));
      mirror.position.set(-51.6, 2.4, 15); mirror.rotation.y = Math.PI / 2;
      this.scene.add(mirror);
      this.addStaticBox(-51.6, 2.4, 15, 0.1, 2.8, 4.6, this.mat("wood", 2, 1));
      // counter/sink
      this.addStaticBox(-49.4, 0.5, 18.2, 3.4, 1.0, 1.0, this.mat("wood", 2, 1));
      this.addProp({ x: -48, z: 18.2, w: 0.4, h: 0.4, d: 0.4, color: 0xd8d8d8, mass: 3, kind: "ceramic", breakable: true, health: 10, name: "sink" });
      this.addPoster(-49.8, 2.3, 10.25, 1.2, 1.8, U.texPoster("HAIRCUT", "$10", "#14202a", "#2fe3ff"), 0);
      this.addPoster(-46, 2.3, 10.25, 1.2, 1.8, U.texPoster("WE", "FIX BAD DECISIONS", "#241a12", "#ffd400"), 0);
      // magazines
      for (let i = 0; i < 4; i++) {
        this.addProp({ x: -44.5 + i * 0.4, y: 0.55, z: 19.2, w: 0.35, h: 0.05, d: 0.5, color: 0xd8c8a0, mass: 0.2, kind: "plastic", breakable: false, name: "magazine" });
      }
      this.addStaticBox(-44.4, 0.25, 19.2, 2.4, 0.5, 0.8, this.mat("wood", 1, 1));
      this.addProp({ x: -43.2, z: 16, w: 2.0, h: 0.45, d: 0.7, color: 0x4a3a2a, mass: 24, kind: "wood", breakable: true, health: 40, name: "waiting bench" });
      // path
      this.addVisualBox(-24, 0.04, 15, 36, 0.08, 3.0, this.mat("sidewalk", 12, 1));
      this.addVisualBox(-34, 0.045, 15, 8, 0.09, 3.0, this.mat("asphalt", 3, 1));
    }

    _buildParty() {
      const cx = -32, cz = 39;
      this.addVisualBox(cx, 0.04, cz, 16, 0.08, 14, this.mat("asphalt", 4, 4));
      // low chain fence with an opening to the north
      const fenceMat = this.mat("metal", 1, 1);
      this.addStaticBox(cx - 6, 1.0, 32, 4, 2.0, 0.15, fenceMat);
      this.addStaticBox(cx + 6, 1.0, 32, 4, 2.0, 0.15, fenceMat);
      this.addVisualBox(cx, 0.04, 31, 4, 0.08, 2.4, this.mat("sidewalk", 2, 1));
      this.addNeon(cx, 3.2, 31.85, 3.0, 0.8, U.texNeon("ENTER", "#ffd400", "AFTERPARTY"), Math.PI);
      this.addStaticBox(cx - 8, 1.0, cz, 0.15, 2.0, 14, fenceMat);
      this.addStaticBox(cx + 8, 1.0, cz, 0.15, 2.0, 14, fenceMat);
      this.addStaticBox(cx, 1.0, 46, 16, 2.0, 0.15, fenceMat);
      // dance floor
      this.addVisualBox(cx, 0.07, 40, 8, 0.06, 6, this.mat("tile", 4, 3));
      for (let i = 0; i < 4; i++) {
        this.addVisualBox(cx - 3 + i * 2, 0.11, 38.2, 1.4, 0.03, 0.2, this.glow([0xff2d78, 0x2fe3ff, 0xffd400, 0x5cff86][i]));
      }
      // DJ booth + speakers
      this.addStaticBox(-32, 1.1, 35.8, 4.4, 2.2, 1.4, this.mat("wood", 2, 1));
      this.addVisualBox(-32, 2.25, 35.8, 4.2, 0.08, 1.2, this.glow(0xff2d78));
      this.addStaticBox(-36.4, 1.4, 37.4, 1.2, 2.8, 1.2, this.mat("metal", 1, 2));
      this.addStaticBox(-27.6, 1.4, 37.4, 1.2, 2.8, 1.2, this.mat("metal", 1, 2));
      this.addNeon(-32, 4.4, 35.0, 8, 1.8, U.texNeon("AFTERPARTY", "#ff2d78", "NO SLEEP · NO RULES · NO COPS"), Math.PI);
      this.addNeon(-32, 2.5, 35.05, 3.8, 0.7, U.texNeon("DJ SHITASS", "#ffd400", "ALL NIGHT"), Math.PI);
      this.addNeon(-23.9, 3.4, 38, 3.4, 1.0, U.texNeon("NO SLEEP", "#2fe3ff", ""), Math.PI / 2);
      // string lights
      for (let i = 0; i < 9; i++) {
        const lx = -39 + i * 1.8;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), this.glow(i % 2 ? 0xffd400 : 0xff2d78));
        bulb.position.set(lx, 4.6 + Math.sin(i * 1.4) * 0.25, 40);
        this.scene.add(bulb);
      }
      // keg / beer pong / couch / fire pit
      this.addProp({ x: -27, z: 35, w: 0.8, h: 1.2, d: 0.8, shape: "cylinder", color: 0x8a8a92, mass: 25, kind: "metal", breakable: true, health: 45, name: "keg" });
      this.addProp({ x: -28, z: 42, w: 2.4, h: 0.1, d: 1.2, color: 0x5a3a22, mass: 14, kind: "wood", breakable: true, health: 35, name: "beer pong table", y: 0.9 });
      for (let i = 0; i < 6; i++) {
        this.addProp({ x: -29 + (i % 3), y: 1.03, z: 41.6 + Math.floor(i / 3), w: 0.08, h: 0.16, d: 0.08, shape: "cylinder", color: 0xd8d8d8, mass: 0.1, kind: "glass", breakable: true, health: 2, name: "cup" });
      }
      this.addProp({ x: -38, z: 43, w: 3.0, h: 1.1, d: 1.6, color: 0x6a1f4a, mass: 35, kind: "wood", breakable: true, health: 55, name: "party couch" });
      // fire pit
      this.addStaticBox(-38, 0.3, 37, 1.8, 0.6, 1.8, this.mat("cinder", 1, 1));
      this.addFire(-38, 37, 1.1, 90);
      this.addInteractable({ x: -38, y: 1.1, z: 37, radius: 2.8, prompt: "[E] ADD FUEL TO THE FIRE", action: () => { this.addFire(-38, 37, 1.4, 60); this.game.addRespect(2, "bribe"); this.game.ticker("The fire pit gets bigger. So do the problems.", "gold"); } });
      this.addInteractable({ x: -27, y: 1.2, z: 35, radius: 2.5, prompt: "[E] TAP THE KEG", action: () => { this.game.player.beer += 2; this.game.player.drunk = U.clamp(this.game.player.drunk + 18, 0, 100); this.game.addRespect(2, "drink"); ST.audio.beer(); this.game.ticker("Free beer from a keg behind a fence. This is the peak of civilization.", "gold"); } });
      this.addInteractable({ x: -28, y: 1.1, z: 42, radius: 2.6, prompt: "[E] PLAY BEER PONG $5", action: () => { if (this.game.player.cash < 5) return this.game.ticker("No cash, no pong.", "bad"); this.game.player.cash -= 5; this.game.player.drunk = U.clamp(this.game.player.drunk + 20, 0, 100); this.game.addRespect(6, "bribe"); ST.audio.cash(); this.game.ticker("You lost at beer pong. You won at drinking.", "gold"); } });
      this.addInteractable({ x: -32, y: 1.4, z: 36.7, radius: 2.8, prompt: "[E] DJ BOOTH · CHANGE MUSIC", action: () => { if (!this.game.settings.musicOn) return this.game.ticker("The DJ is off. Turn the soundtrack on.", "bad"); const s = ST.audio.cycleStation(); this.game.radioManual = 30; this.game.ticker("DJ switches to " + ST.jokes.radioNames[s], "gold"); } });
      // party lights + disco
      const l1 = new THREE.PointLight(0xff2d78, 1.0, 22, 2); l1.position.set(-32, 4.5, 39); this.scene.add(l1);
      const l2 = new THREE.PointLight(0x2fe3ff, 0.8, 20, 2); l2.position.set(-36, 4, 41); this.scene.add(l2);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 6), this.glow(0xd8d0f0));
      ball.position.set(-32, 5.0, 39); this.scene.add(ball);
      this.partyBall = ball;
      // graffiti / posters
      this.addGraffiti(-24.1, 2.0, 35, Math.PI / 2, "NO SLEEP TILL KINGPIN", "#ff2d78");
      this.addNeon(-32, 1.6, 31.8, 2.6, 1.3, U.texNeon("BACKYARD", "#ffd400", "BYOB · BYOC · BYE"), Math.PI);
      this.party = { x: -32, z: 39 };
    }

    addBreakableWall(x, z, w, h, d, rotY, matName) {
      const prop = this.addProp({
        x, z, w, h, d, y: h / 2 + 0.05, rotY: rotY || 0,
        material: this.mat(matName || "brick", Math.max(1, w / 5), Math.max(1, h / 3)),
        mass: 0, kind: "concrete", breakable: true, health: 170, name: "wall"
      });
      prop.wall = true;
      return prop;
    }

    _buildOutskirts() {
      const asphalt = this.mat("asphalt", 3, 3);
      // outer ring road
      this.addVisualBox(0, 0.014, 72, 210, 0.04, 12, asphalt);
      this.addVisualBox(0, 0.014, -72, 210, 0.04, 12, asphalt);
      this.addVisualBox(72, 0.014, 0, 12, 0.04, 210, asphalt);
      this.addVisualBox(-72, 0.014, 0, 12, 0.04, 210, asphalt);
      for (let i = -96; i <= 96; i += 8) {
        this.addVisualBox(i, 0.05, 72, 3.4, 0.02, 0.14, this.paint(0xd8b84a));
        this.addVisualBox(i, 0.05, -72, 3.4, 0.02, 0.14, this.paint(0xd8b84a));
        this.addVisualBox(72, 0.05, i, 0.14, 0.02, 3.4, this.paint(0xd8b84a));
        this.addVisualBox(-72, 0.05, i, 0.14, 0.02, 3.4, this.paint(0xd8b84a));
      }
      // connectors into the old town
      [[0, 64, 12, 18], [0, -64, 12, 18], [64, 0, 18, 12], [-64, 0, 18, 12]].forEach((r) => {
        this.addVisualBox(r[0], 0.013, r[1], r[2], 0.035, r[3], asphalt);
      });

      // ---- trailer park, west ----
      for (let i = 0; i < 6; i++) {
        const x = -94 + (i % 3) * 12, z = 20 + Math.floor(i / 3) * 14;
        this.addStaticBox(x, 1.4, z, 9, 2.8, 4.2, this.mat(i % 2 ? "siding" : "stucco", 2, 1));
        this.addVisualBox(x, 2.9, z, 9.2, 0.25, 4.4, this.paint(0x2a2a30));
        this.addVisualBox(x - 2.4, 1.5, z - 2.12, 1.2, 1.0, 0.06, this.glow(0xffc46a));
        this.addVisualBox(x + 2.2, 1.2, z - 2.12, 1.0, 1.8, 0.06, this.paint(0x3a2a22));
        this.addProp({ x: x + 5.6, z: z + 1.2, w: 0.9, h: 0.9, d: 0.9, shape: "cylinder", color: 0xc8c0a8, mass: 8, kind: "metal", breakable: true, health: 18, name: "propane tank" });
      }
      this.addVisualBox(-84, 2.2, 16, 0.16, 4.4, 0.16, this.mat("metal", 1, 2));
      this.addNeon(-84, 4.4, 16, 7, 1.6, U.texNeon("TRAILER PARK", "#ffd400", "NO SOLICITING · NO EXCEPTIONS"), 0);
      this.addProp({ x: -84, z: 14, w: 1.0, h: 1.0, d: 1.0, shape: "cylinder", color: 0x5a2e1a, mass: 16, kind: "metal", breakable: true, health: 30, name: "burn barrel" });
      this.addFire(-84, 14, 0.8, 60);

      // ---- farm, south ----
      this.addStaticBox(0, 3.5, 86, 22, 7, 14, this.mat("siding", 4, 2));
      this.addVisualBox(0, 7.1, 86, 22.4, 0.4, 14.4, this.paint(0x2a2018));
      const barnRoof = new THREE.Mesh(new THREE.ConeGeometry(13, 5, 4), this.paint(0x5a2a22));
      barnRoof.position.set(0, 9.6, 86); barnRoof.rotation.y = Math.PI / 4; this.scene.add(barnRoof);
      this.addVisualBox(0, 2.4, 79, 6, 4.8, 0.2, this.paint(0x3a2018));
      this.addNeon(0, 6.0, 78.8, 6, 1.4, U.texNeon("HENDERSON FARMS", "#c9ff2f", "TOBACCO · SORGHUM · REGRET"), 0);
      for (let i = 0; i < 3; i++) {
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 13, 12), this.mat("metal", 1, 3));
        silo.position.set(18 + i * 5.2, 6.5, 90); this.scene.add(silo);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(2.5, 2.2, 12), this.paint(0x4a4a52));
        cap.position.set(18 + i * 5.2, 14.1, 90); this.scene.add(cap);
      }
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
          this.addVisualBox(-30 + col * 6, 0.12, 58 + row * 5, 4.2, 0.2, 3.0, this.paint(row % 2 ? 0x3a4a22 : 0x4a5a28));
        }
      }
      // ---- strip mall, north ----
      for (let i = -1; i <= 1; i++) {
        const x = i * 20;
        this.addStaticBox(x, 2.4, -86, 18, 4.8, 12, this.mat(i === 0 ? "brick" : "stucco", 3, 2));
        this.addVisualBox(x, 4.85, -86, 18.4, 0.3, 12.4, this.paint(0x1c1418));
        this.addVisualBox(x, 1.6, -79.9, 6, 2.2, 0.1, this.glow(i === 0 ? 0x2fe3ff : 0xffd400));
        this.addNeon(x, 3.6, -79.8, 7, 1.4, U.texNeon(["GUN & PAWN", "TATTOO", "DONUTS"][i + 1], ["#ff2d78", "#5cff86", "#ffd400"][i + 1], "OPEN 24H"), 0);
      }

      // ---- junkyard, northwest ----
      for (let i = 0; i < 7; i++) {
        const x = -96 + (i % 3) * 7, z = -86 + Math.floor(i / 3) * 8;
        const stack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 1.9), this.paint([0x6b2a2a, 0x2a3a5a, 0x4a4a42][i % 3]));
        stack.position.set(x, 0.8 + (i % 2) * 1.1, z); stack.rotation.y = i * 0.4; this.scene.add(stack);
      }
      this.addNeon(-90, 3.4, -92, 9, 1.8, U.texNeon("JUNKYARD", "#c9ff2f", "WE BUY ANYTHING · EVEN YOU"), 0);

      // ---- knock-down walls ----
      for (let i = 0; i < 5; i++) {
        this.addBreakableWall(58 + i * 0.02, 26 + i * 4.2, 0.5, 3.2, 4.0, 0, "brick");
      }
      for (let i = 0; i < 4; i++) {
        this.addBreakableWall(-64, 42 + i * 4.2, 0.5, 2.4, 4.0, 0, "siding");
      }
      for (let i = 0; i < 4; i++) {
        this.addBreakableWall(-46 + i * 4.2, -88, 4.0, 2.8, 0.5, 0, "cinder");
      }
      // a crooked alley wall behind the strip
      for (let i = 0; i < 5; i++) {
        this.addBreakableWall(8 + i * 4.0, -44, 3.9, 3.0, 0.6, 0, "brick");
      }

      // ---- airstrip, east ----
      this.addVisualBox(84, 0.02, 20, 14, 0.05, 96, this.mat("asphalt", 2, 8));
      for (let z = -24; z <= 64; z += 8) {
        this.addVisualBox(84, 0.055, z, 0.3, 0.02, 3.4, this.paint(0xd8d4c4));
        this.addVisualBox(84, 0.055, z, 11, 0.02, 0.14, this.paint(0xd8d4c4));
      }
      this.addStaticBox(94, 2, 52, 8, 4, 10, this.mat("metal", 2, 1));
      this.addVisualBox(94, 4.2, 52, 8.4, 0.3, 10.4, this.paint(0x2a2a30));
      this.addNeon(90, 3.0, 46.8, 6, 1.4, U.texNeon("SHITTOWN AIR", "#2fe3ff", "FLIGHTS DAILY · LANDINGS OPTIONAL"), 0);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.8, 9, 8), this.mat("metal", 1, 3));
      tower.position.set(96, 4.5, 34); this.scene.add(tower);
      this.addVisualBox(96, 9.6, 34, 4.2, 1.2, 4.2, this.glow(0xffc46a));

      // the plane. it is held together by tape and optimism.
      this._buildPlane(84, 10, 0);

      // scattered trees and poles so the edges aren't empty
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const r = 88 + (i % 3) * 6;
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (Math.abs(x) < 60 && Math.abs(z) < 60) continue;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 3.4, 6), this.paint(0x3a2a1a));
        trunk.position.set(x, 1.7, z); this.scene.add(trunk);
        const crown = new THREE.Mesh(new THREE.SphereGeometry(2.0, 7, 5), this.paint(0x2a3a22));
        crown.position.set(x, 4.2, z); this.scene.add(crown);
      }
    }

    _buildPlane(x, z, rotY) {
      const g = new THREE.Group();
      const skin = this.paintSmooth(0xc8b060);
      const rust = this.paintSmooth(0x8a5a32);
      const dark = this.paint(0x1a1a1e);
      const glass = new THREE.MeshLambertMaterial({ color: 0x6a8aa0, transparent: true, opacity: 0.6 });
      const fus = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 6.2, 10), skin);
      fus.rotation.x = Math.PI / 2;
      fus.position.z = 0.2;
      g.add(fus);
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.4, 10), rust);
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = -3.5;
      g.add(nose);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(11, 0.16, 1.7), skin);
      wing.position.set(0, 0.25, -0.2);
      g.add(wing);
      const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(11.1, 0.02, 0.4), rust);
      wingStripe.position.set(0, 0.35, -0.2);
      g.add(wingStripe);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(4, 0.12, 0.9), skin);
      tail.position.set(0, 0.3, 2.7);
      g.add(tail);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 1.3), rust);
      fin.position.set(0, 1.0, 2.8);
      g.add(fin);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), glass);
      canopy.scale.set(1, 0.7, 1.8);
      canopy.position.set(0, 0.55, -0.5);
      g.add(canopy);
      const propGroup = new THREE.Group();
      propGroup.position.z = -4.2;
      [0, Math.PI / 2].forEach((r) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.2, 0.06), dark);
        blade.rotation.z = r;
        propGroup.add(blade);
      });
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 6), dark);
      spinner.rotation.x = -Math.PI / 2;
      propGroup.add(spinner);
      g.add(propGroup);
      const wheels = [];
      [[-1.1, 0.15, -1.2], [1.1, 0.15, -1.2], [0, 0.15, 2.4]].forEach((w) => {
        const wg = new THREE.Group();
        wg.position.set(w[0], w[1], w[2]);
        const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.16, 8), dark);
        tyre.rotation.z = Math.PI / 2;
        wg.add(tyre);
        g.add(wg);
        wheels.push(wg);
      });
      g.position.set(x, 0, z);
      g.rotation.y = rotY || 0;
      this.scene.add(g);
      this.plane = { group: g, propeller: propGroup, wheels, speed: 0, yaw: rotY || 0, pitch: 0, roll: 0, alt: 0, name: "THE SHITBIRD" };
    }

    _buildStreetFurniture() {
      this._buildStreetGrit();
      this._buildStreetDetail();
      // street lamps
      [[-12, -9], [12, -9], [-12, 9], [12, 9], [-38, 0], [36, 0], [0, -18], [0, 26], [30, 5], [-30, 15], [14, 33], [-14, 33]].forEach((p) => this._lamp(p[0], p[1]));
      // hydrants
      this._hydrant(9.2, 7.2);
      this._hydrant(-14, -7.2);
      // benches
      [[-12, 12], [14, 12], [-42, -2], [42, 2]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 2.6, h: 0.5, d: 0.7, color: 0x5a3a22, mass: 35, kind: "wood", breakable: true, health: 55, name: "bench" });
        this.addProp({ x: p[0] + 1.2, z: p[1] - 0.35, w: 0.15, h: 1.0, d: 0.15, shape: "box", color: 0x333333, mass: 0, kind: "metal", breakable: false, name: "leg" });
      });
      // mailboxes
      [[-10.5, 7.5], [10.5, -7.5], [-30, 8.5]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 0.7, h: 1.1, d: 0.5, color: 0x2a4a8a, mass: 18, kind: "metal", breakable: true, health: 24, name: "mailbox", y: 1.3 });
      });
      // newspapers
      [[6.5, -7.4], [-9.4, 7.3]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 0.8, h: 1.1, d: 0.6, color: 0x8a8a8a, mass: 20, kind: "metal", breakable: true, health: 26, name: "newspaper box" });
      });
      // trash cans
      [[-15, 9], [16, -9], [-39, 6], [38, -7], [16, 18], [-16, -18]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 0.8, h: 1.1, d: 0.8, shape: "cylinder", color: 0x3a3a3a, mass: 9, kind: "metal", breakable: true, health: 26, name: "trash can" });
      });
      // cones
      for (let i = 0; i < 5; i++) {
        this.addProp({ x: U.rand(-4, 4), z: 14 + i * 1.6, w: 0.4, h: 0.7, d: 0.4, shape: "cylinder", color: 0xff6a1f, mass: 2, kind: "plastic", breakable: false, name: "cone" });
      }
      // dumpsters
      [[-4, -24], [-2.5, 22], [36, -8]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 2.4, h: 1.4, d: 1.6, color: 0x2f4a2f, mass: 90, kind: "metal", breakable: true, health: 90, name: "dumpster" });
      });
      // propane
      [[-7, -26], [34, 10], [9, -20], [-20, 15]].forEach((p) => {
        this.addProp({ x: p[0], z: p[1], w: 0.9, h: 1.4, d: 0.9, shape: "cylinder", color: 0xd8d0b8, mass: 14, kind: "metal", breakable: true, health: 26, explosive: true, flammable: true, name: "propane tank" });
      });
      // crates & boxes in alley
      for (let i = 0; i < 5; i++) {
        this.addProp({ x: -2 + U.rand(-3, 3), z: -28 + U.rand(-2, 2), w: 1.0, h: 0.9, d: 1.0, color: 0x7a5a35, mass: 14, kind: "wood", breakable: true, health: 34, name: "crate" });
      }
      // parked wrecks
      this._wreck(-36, 4, 0);
      this._wreck(30, -4, Math.PI);
      // shopping carts
      this.addProp({ x: 12.5, z: 5, w: 1.0, h: 1.0, d: 1.6, color: 0x8a8a92, mass: 18, kind: "metal", breakable: true, health: 30, name: "shopping cart" });
      // fire barrel
      this.addProp({ x: -8, y: 0.5, z: 24, w: 1.0, h: 1.0, d: 1.0, shape: "cylinder", color: 0x5a2e1a, mass: 16, kind: "metal", breakable: true, health: 40, name: "burn barrel" });
      this.addFire(-8, 24, 0.8, 60);
      // billboard
      this._billboard(0, 17, 34);
      // stray bottles
      for (let i = 0; i < 12; i++) {
        this.addProp({
          x: U.rand(-40, 40), z: U.rand(-40, 40), w: 0.26, h: 0.55, d: 0.26, shape: "cylinder",
          color: 0x3a6b3a, mass: 0.4, kind: "glass", breakable: true, health: 5, name: "bottle"
        });
      }
      // posters on exteriors
      this.addPoster(-30, 2.3, -19.7, 1.2, 1.9, U.texPoster("BINGO", "TUESDAYS", "#241a12", "#ffd400"), 0);
      this.addPoster(28, 2.4, -19.7, 1.2, 1.9, U.texPoster("SINGLE", "AND READY TO LIE", "#1c1424", "#ff2d78"), 0);
      this.addGraffiti(-36, 1.6, -21, Math.PI / 2, "EAT THE RICH", "#c9ff2f");
      this.addGraffiti(18, 1.8, -35.6, 0, "GOD BLESS SHITTOWN", "#2fe3ff");
    }

    _buildStreetGrit() {
      // payphone booth
      const bx = 13, bz = 8.4;
      this.addStaticBox(bx - 0.65, 1.25, bz - 0.65, 0.12, 2.5, 0.12, this.mat("metal", 1, 2));
      this.addStaticBox(bx + 0.65, 1.25, bz - 0.65, 0.12, 2.5, 0.12, this.mat("metal", 1, 2));
      this.addStaticBox(bx - 0.65, 1.25, bz + 0.65, 0.12, 2.5, 0.12, this.mat("metal", 1, 2));
      this.addStaticBox(bx + 0.65, 1.25, bz + 0.65, 0.12, 2.5, 0.12, this.mat("metal", 1, 2));
      this.addStaticBox(bx, 2.55, bz, 1.5, 0.12, 1.5, this.mat("metal", 1, 1));
      const glass = new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.3 });
      this.addVisualBox(bx, 1.3, bz - 0.66, 1.2, 2.2, 0.04, glass);
      this.addVisualBox(bx, 1.3, bz + 0.66, 1.2, 2.2, 0.04, glass);
      this.addVisualBox(bx - 0.66, 1.3, bz, 0.04, 2.2, 1.2, glass);
      this.addVisualBox(bx + 0.66, 1.3, bz, 0.04, 2.2, 1.2, glass);
      this.addStaticBox(bx, 0.06, bz, 1.3, 0.12, 1.3, this.mat("sidewalk", 1, 1));
      this.addVisualBox(bx + 0.2, 1.3, bz + 0.3, 0.16, 0.4, 0.12, this.glow(0x222222));
      this.addInteractable({
        x: bx, y: 1.2, z: bz, radius: 2.4, prompt: "[E] USE THE PAYPHONE",
        action: () => {
          this.game.addRespect(1, "bribe");
          if (this.game.player.wanted > 0) {
            this.game.ticker("You call your lawyer. It goes to voicemail. He's at the bar.", "bad");
          } else {
            this.game.ticker("You call your mom. She asks if you're eating. You are not.", "gold");
          }
          ST.audio.click();
        }
      });
      this.addNeon(bx, 3.1, bz + 0.72, 2.4, 0.6, U.texNeon("PHONE", "#2fe3ff", "50¢ · NO REFUNDS"), 0);

      // bus shelter that has never seen a bus
      this.addStaticBox(-14, 1.3, 8.9, 3.6, 0.1, 0.1, this.mat("metal", 2, 1));
      this.addStaticBox(-14, 2.6, 8.9, 4.0, 0.12, 1.8, this.mat("metal", 2, 1));
      this.addStaticBox(-15.8, 1.3, 8.9, 0.1, 2.6, 0.1, this.mat("metal", 1, 2));
      this.addStaticBox(-12.2, 1.3, 8.9, 0.1, 2.6, 0.1, this.mat("metal", 1, 2));
      this.addProp({ x: -14, z: 8.4, w: 2.6, h: 0.45, d: 0.6, color: 0x5a3a22, mass: 28, kind: "wood", breakable: true, health: 45, name: "bus bench" });
      this.addNeon(-14, 2.1, 9.62, 3.4, 0.9, U.texNeon("BUS 6", "#ffd400", "NO SCHEDULE · NO MERCY"), 0);
      this.addPoster(-16.2, 1.7, 9.55, 1.0, 1.5, U.texPoster("LOST", "DOG · REWARD $0", "#1a1a12", "#ffd400"), 0);

      // pimp suit rack outside Cuts & Blood
      this.addProp({ x: -38.6, z: 19.2, w: 1.2, h: 1.8, d: 0.5, color: 0x3a2a4a, mass: 0, kind: "wood", breakable: false, name: "suit rack" });
      this.addNeon(-38.6, 2.6, 19.5, 3.2, 0.9, U.texNeon("PIMP SUIT", "#ff2d78", "$300 · PURPLE ONLY"), 0);
      this.addInteractable({
        x: -38.6, y: 1.2, z: 19.2, radius: 3.0, prompt: "[E] BUY PIMP SUIT $300",
        action: () => {
          const g = this.game, p = g.player;
          if (g.story && g.story.suit) {
            g.ticker("You already own the suit. You are wearing it. It is loud.", "gold");
            return;
          }
          if (p.cash < 300) {
            g.ticker("The rack says $300. Your wallet says 'not today, pimp.'", "bad");
            return;
          }
          p.cash -= 300;
          if (g.story) g.story.suit = true;
          if (p.wearPimpSuit) p.wearPimpSuit();
          g.addRespect(45, "bribe");
          ST.audio.cash();
          g.ticker("YOU BOUGHT THE SUIT. Purple. Gold chain. Legally a pimp now.", "gold");
          g.ui.updateHUD(p);
        }
      });

      // parking meters
      for (let i = 0; i < 3; i++) {
        const mx = -9 + i * 2.2;
        this.addProp({ x: mx, z: 9.1, w: 0.14, h: 1.4, d: 0.14, color: 0x555b66, mass: 4, kind: "metal", breakable: true, health: 12, name: "parking meter" });
        this.addVisualBox(mx, 1.45, 9.1, 0.3, 0.3, 0.2, this.paint(0x333a44));
      }
      // trash bags and grit
      for (let i = 0; i < 5; i++) {
        this.addProp({ x: -3 + U.rand(-1.2, 1.2), z: -21 + U.rand(-1.2, 1.2), w: 0.7, h: 0.8, d: 0.7, color: 0x1a1a1a, mass: 3, kind: "plastic", breakable: true, health: 8, name: "trash bag" });
      }
      this.addProp({ x: 6.5, z: 10.2, w: 0.9, h: 1.0, d: 0.9, shape: "cylinder", color: 0x4a2a1a, mass: 14, kind: "metal", breakable: true, health: 30, name: "burn barrel" });
      this.addFire(6.5, 10.2, 0.7, 45);
      // old posters on the bar / club
      this.addPoster(-37.8, 2.1, -25, 1.2, 1.8, U.texPoster("BINGO", "EVERY OTHER TUESDAY", "#241a12", "#ffd400"), Math.PI / 2);
      this.addPoster(33.9, 2.1, -28, 1.2, 1.8, U.texPoster("LIVE", "SAD DJ", "#1c1424", "#2fe3ff"), -Math.PI / 2);
      this.addGraffiti(-37.9, 1.6, -22, Math.PI / 2, "RENT IS THEFT", "#c9ff2f");
      this.addGraffiti(33.9, 1.7, -23, -Math.PI / 2, "GLITTER IS FOREVER", "#ff2d78");
      this.addPoster(5.5, 1.9, 9.6, 1.1, 1.6, U.texPoster("SHITTOWN", "FARMERS MARKET?", "#1a1a12", "#5cff86"), 0);
      this.addProp({ x: 11.5, z: 6.4, w: 1.0, h: 0.9, d: 1.2, color: 0x8a8a92, mass: 16, kind: "metal", breakable: true, health: 28, name: "shopping cart" });
    }

    _lamp(x, z) {
      const lamp = this.addProp({
        x, z, w: 0.18, h: 7.2, d: 0.18, color: 0x3a3a42, mass: 0,
        kind: "metal", breakable: true, health: 42, name: "lamppost"
      });
      lamp.lamp = true;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 1.3), this.glow(0xffd9a0));
      head.position.y = 3.45;
      lamp.mesh.add(head);
    }

    toppleLamp(prop, point) {
      if (prop.toppled) return;
      prop.toppled = true;
      prop.dead = true;
      if (prop.mesh.parent) prop.mesh.parent.remove(prop.mesh);
      this.physics.removeBody(prop.body);
      delete this.propByBody[prop.body.id];
      const src = prop.mesh.position;
      const fall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 7.2, 0.18), this.mat("metal", 1, 2));
      fall.position.set(src.x, 3.2, src.z);
      fall.rotation.set(U.rand(-0.4, 0.4), 0, U.rand(-0.4, 0.4));
      const lampHead = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.26, 1.3), this.glow(0xffd9a0));
      lampHead.position.y = 3.45;
      fall.add(lampHead);
      this.scene.add(fall);
      const body = new CANNON.Body({ mass: 9, position: new CANNON.Vec3(src.x, 3.2, src.z), material: this.physMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(0.14, 3.6, 0.14)));
      const dir = point ? new THREE.Vector3(src.x - point.x, 0, src.z - point.z).normalize() : new THREE.Vector3(1, 0, 0);
      body.velocity.set(dir.x * 5, 1.5, dir.z * 5);
      body.angularVelocity.set(dir.z * 4.5, U.rand(-2, 2), -dir.x * 4.5);
      this.physics.addBody(body);
      this.debris.push({ mesh: fall, body, ttl: 18 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.5, 8), this.mat("metal", 1, 1));
      base.position.set(src.x, 0.25, src.z);
      this.scene.add(base);
      this.burst(new THREE.Vector3(src.x, 6.8, src.z), 0xffd9a0, 8, 2.2, 0.5, 0.06);
      this.burst(new THREE.Vector3(src.x, 1.2, src.z), 0xbfc4cc, 6, 2.4, 0.4, 0.05);
      ST.audio.bonk();
      this.floatText(new THREE.Vector3(src.x, 6.4, src.z), "BONK", "#ffd400");
    }

    _hydrant(x, z) {
      const mesh = this.addProp({
        x, z, w: 0.55, h: 1.0, d: 0.55, shape: "cylinder", color: 0xc42a2a,
        mass: 0, kind: "metal", breakable: true, health: 18, name: "hydrant"
      });
      mesh.static = true;
      this.hydrants = this.hydrants || [];
      this.hydrants.push(mesh);
    }

    _wreck(x, z, rotY) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.0, 1.9), this.paint(0x6b2a2a));
      body.position.y = 0.75; g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 1.7), this.paint(0x552020));
      cabin.position.set(-0.2, 1.55, 0); g.add(cabin);
      const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 12);
      const hubGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.36, 10);
      const tyre = this.paint(0x121212);
      const hub = this.paint(0x777777);
      [[-1.35, 1.02], [1.35, 1.02], [-1.35, -1.02], [1.35, -1.02]].forEach((p) => {
        const w = new THREE.Mesh(wheelGeo, tyre);
        w.rotation.x = Math.PI / 2;
        w.position.set(p[0], 0.4, p[1]);
        g.add(w);
        const cap = new THREE.Mesh(hubGeo, hub);
        cap.rotation.x = Math.PI / 2;
        cap.position.set(p[0], 0.4, p[1]);
        g.add(cap);
      });
      const bumper = this.paint(0x3a3a40);
      this.addVisualBox(x - 2.2, 0.55, z, 0.25, 0.25, 1.8, bumper, rotY || 0);
      this.addVisualBox(x + 2.2, 0.55, z, 0.25, 0.25, 1.8, bumper, rotY || 0);
      g.position.set(x, 0, z); g.rotation.y = rotY || 0;
      this.scene.add(g);
      const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(x, 1.0, z), material: this.physMat });
      b.addShape(new CANNON.Box(new CANNON.Vec3(2.2, 1.0, 1.0)));
      this.physics.addBody(b);
      // windows as breakable props
      [[x - 0.4, 1.55, z - 0.86], [x - 0.4, 1.55, z + 0.86]].forEach((p, i) => {
        const wm = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 0.06), new THREE.MeshLambertMaterial({ color: 0x9fd4ff, transparent: true, opacity: 0.35 }));
        wm.position.set(p[0], p[1], p[2]);
        this.scene.add(wm);
        const wb = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(p[0], p[1], p[2]), material: this.physMat });
        wb.addShape(new CANNON.Box(new CANNON.Vec3(0.75, 0.27, 0.03)));
        this.physics.addBody(wb);
        this._makeProp(wm, wb, { kind: "glass", health: 8, breakable: true, name: "car window", window: true });
      });
    }

    _billboard(x, y, z) {
      this.addStaticBox(x - 4, 3.5, z, 0.3, 7, 0.3, this.mat("metal", 1, 2));
      this.addStaticBox(x + 4, 3.5, z, 0.3, 7, 0.3, this.mat("metal", 1, 2));
      const tex = U.tex(256, 128, (g, w, h) => {
        g.fillStyle = "#1a1424"; g.fillRect(0, 0, w, h);
        g.strokeStyle = "#ffd400"; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
        g.fillStyle = "#ff2d78"; g.font = "bold 40px 'Arial Black'"; g.textAlign = "center";
        g.fillText("SHITTOWN", w / 2, 56);
        g.fillStyle = "#fff"; g.font = "bold 18px 'Courier New'";
        g.fillText("SHITTOWN, KENTUCKY", w / 2, 84);
        g.fillStyle = "#2fe3ff"; g.font = "bold 12px 'Courier New'";
        g.fillText("WEED LEGAL · COPS UNCONVINCED · POP. 1,214", w / 2, 108);
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(9, 4.5, 0.3), new THREE.MeshLambertMaterial({ map: tex }));
      mesh.position.set(x, 8.4, z);
      this.scene.add(mesh);
      this.addStaticBox(x, 8.4, z, 9, 4.5, 0.3, this.mat("metal", 1, 1)).visible = false;
    }

    _buildWeaponPickups() {
      this.spawnWeaponPickup(-23.5, -32.4, "shotgun", 6);
      this.spawnWeaponPickup(-2.8, -25.6, "shovel");
      this.spawnWeaponPickup(22.4, 26.4, "bat");
      this.spawnWeaponPickup(28.9, 28.2, "pistol", 8);
      this.spawnWeaponPickup(2.8, 40.6, "petition");
      this.spawnWeaponPickup(-5.2, -22.9, "pistol", 8);
    }

    spawnWeaponPickup(x, z, type, ammo, y) {
      const g = new THREE.Group();
      const wood = this.paint(0x6a4526);
      const metal = this.paint(0x8a9098);
      if (type === "bat") {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.03, 0.9, 7), wood);
        m.rotation.z = Math.PI / 2; m.position.y = 0.16; g.add(m);
      } else if (type === "shovel") {
        const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), wood);
        h.rotation.z = Math.PI / 2; h.position.y = 0.12; g.add(h);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.2), metal);
        b.position.set(0.55, 0.12, 0); g.add(b);
      } else if (type === "pistol") {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.3), this.paint(0x1a1a20));
        s.position.y = 0.2; g.add(s);
      } else if (type === "shotgun") {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.9), this.paint(0x1a1a20));
        s.rotation.y = 0.2; s.position.y = 0.18; g.add(s);
      } else {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.03), wood);
        b.position.y = 0.2; b.rotation.x = 0.2; g.add(b);
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.2), this.glow(0xf0ead8));
        paper.position.set(0, 0.2, -0.02); paper.rotation.x = 0.2; g.add(paper);
      }
      g.position.set(x, y === undefined ? 0.3 : y, z);
      g.rotation.y = U.rand(0, 6.28);
      this.scene.add(g);
      const labels = { bat: "BASEBALL BAT", shovel: "SHOVEL", pistol: "PISTOL", shotgun: "SHOTGUN", petition: "PETITION CLIPBOARD" };
      const item = {
        x, y: (y === undefined ? 0.3 : y) + 0.3, z, radius: 2.3,
        prompt: "[E] TAKE " + (labels[type] || type.toUpperCase()) + (ammo ? " · " + ammo + " AMMO" : ""),
        action: () => {
          if (!this.game || !this.game.player) return;
          this.game.player.giveWeapon(type, ammo);
          this.game.addRespect(2, "bribe");
          this.scene.remove(g);
          const idx = this.interactables.indexOf(item);
          if (idx >= 0) this.interactables.splice(idx, 1);
        }
      };
      this.addInteractable(item);
      return item;
    }

    _buildProps() {
      this._buildWeaponPickups();
      this.addSupplyPickup(-7.2, -23.4, "weed", 1, 0.25);
      // extra throwables on the street
      for (let i = 0; i < 6; i++) {
        this.addProp({
          x: U.rand(-30, 30), z: U.rand(-18, 16), w: 0.6, h: 0.9, d: 0.6,
          color: 0x7a1f2a, mass: 4, kind: "glass", breakable: true, health: 8, name: "bottle"
        });
      }
      this.addProp({ x: 5, z: 13, w: 0.8, h: 1.0, d: 0.4, color: 0xffd400, mass: 3, kind: "plastic", breakable: false, name: "wet floor sign" });
    }

    _buildFence() {
      const B = this.bounds;
      // invisible walls
      [[0, -B], [0, B], [-B, 0], [B, 0]].forEach((p, i) => {
        const w = i < 2 ? 2 * B : 1;
        const d = i < 2 ? 1 : 2 * B;
        const b = new CANNON.Body({ mass: 0, position: new CANNON.Vec3(p[0], 6, p[1]), material: this.physMat });
        b.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, 6, d / 2)));
        this.physics.addBody(b);
      });
      // chain link posts + rails around the map
      for (let i = -B; i <= B; i += 14) {
        this.addVisualBox(i, 1.4, -B, 0.12, 2.8, 0.12, this.mat("metal", 1, 1));
        this.addVisualBox(i, 1.4, B, 0.12, 2.8, 0.12, this.mat("metal", 1, 1));
        this.addVisualBox(-B, 1.4, i, 0.12, 2.8, 0.12, this.mat("metal", 1, 1));
        this.addVisualBox(B, 1.4, i, 0.12, 2.8, 0.12, this.mat("metal", 1, 1));
      }
      const railMat = new THREE.MeshBasicMaterial({ color: 0x777788, wireframe: true, transparent: true, opacity: 0.22 });
      [[0, -B, 0], [0, B, 0], [-B, 0, Math.PI / 2], [B, 0, Math.PI / 2]].forEach((r) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2 * B, 2.6), railMat);
        m.position.set(r[0], 1.45, r[1]);
        m.rotation.y = r[2];
        this.scene.add(m);
      });
    }

    _buildSpawns() {
      this.streetPoints = [
        [-42, 0], [-30, 0], [-16, 0], [-4, 2], [8, 0], [20, 0], [34, 0], [44, 0],
        [0, -14], [0, -18], [0, 14], [0, 22], [0, 34],
        [-10, 8], [10, 8], [-10, -8], [10, -8], [-30, 10], [30, -10],
        [-42, 9], [42, -9], [-22, 12], [26, 12],
        [30, 5], [42, 5], [-30, 15], [-45, 15], [0, 36], [0, 44],
        [-10, 44], [10, 44], [0, 49], [-2, 41], [2, 41], [18, 49], [-16, 49]
      ];
      this.pedSpawns = [
        [-20, 5, "street"], [12, 6, "street"], [-6, 12, "street"], [4, -12, "street"],
        [28, 6, "street"], [-36, 12, "street"], [14, -14, "street"], [-14, -12, "street"],
        [-30, 4, "bar"], [-24, -22, "bar"], [-35, -22, "bar"],
        [12, -24, "club"], [30, -28, "club"], [25, -21, "club"],
        [20, 24, "house"], [-28, 22, "liquor"], [8, 20, "street"],
        [0, 42, "mall"], [-12, 42, "mall"], [13, 42, "mall"], [18, 48, "mall"],
        [42, 5, "weed"], [-45, 15, "barber"], [30, 5, "street"], [0, 35, "street"]
      ];
      this.copSpawns = [[50, -12], [-50, 12], [12, -45], [-12, 45], [50, 24], [-50, -24], [0, 33], [30, 30]];
    }

    /* ================= interactions ================= */
    addInteractable(o) {
      this.interactables.push(o);
      return o;
    }

    findInteractable(camPos, camDir, maxDist) {
      let best = null, bestScore = -1;
      for (let i = 0; i < this.interactables.length; i++) {
        const it = this.interactables[i];
        const dx = it.x - camPos.x, dy = it.y - camPos.y, dz = it.z - camPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > (maxDist || it.radius)) continue;
        const dot = (dx * camDir.x + dy * camDir.y + dz * camDir.z) / (d || 1);
        if (dot > 0.55 && (it.radius - d) > bestScore) { bestScore = it.radius - d; best = it; }
      }
      return best;
    }

    /* ================= damage / destruction ================= */
    damageProp(prop, dmg, point, impulse) {
      if (!prop || prop.dead) return;
      if (prop.lamp) { this.toppleLamp(prop, point); return; }
      if (prop.body && impulse) prop.body.applyImpulse(new CANNON.Vec3(impulse.x, impulse.y, impulse.z), new CANNON.Vec3(0, 0, 0));
      if (!prop.breakable) {
        ST.audio.thunk();
        return;
      }
      prop.health -= dmg;
      if (!prop.chipped && prop.health < prop.maxHealth) {
        prop.chipped = true;
        this.spawnChip(prop, point);
      }
      this.burst(point || prop.mesh.position, prop.kind === "glass" ? 0xbfe8ff : 0xcfc2a0, 3, 2, 0.35, 0.04);
      if (prop.health <= 0) this.breakProp(prop, point);
    }

    breakProp(prop, point) {
      if (!prop || prop.dead) return;
      prop.dead = true;
      const pos = prop.mesh.position.clone();
      const kind = prop.kind;
      if (prop.explosive) { this.explode(pos, 8, 1.15); }
      this.spawnChunks(prop, pos);
      if (kind === "glass") ST.audio.glass();
      else if (kind === "ceramic") { ST.audio.glass(); }
      else if (kind === "metal") ST.audio.thunk();
      else ST.audio.thunk();

      // remove mesh + body
      this.scene.remove(prop.mesh);
      if (prop.mesh.parent) prop.mesh.parent.remove(prop.mesh);
      if (prop.body) { this.physics.removeBody(prop.body); delete this.propByBody[prop.body.id]; }
      const hi = this.hittable.indexOf(prop.mesh);
      if (hi >= 0) this.hittable.splice(hi, 1);
      const pi = this.props.indexOf(prop);
      if (pi >= 0) this.props.splice(pi, 1);
      const wi = this.windows.indexOf(prop);
      if (wi >= 0) this.windows.splice(wi, 1);

      // reward + reactions
      const g = this.game;
      if (g) {
        if (prop.window) g.addRespect(1, "window");
        else if (prop.kind === "glass") g.addRespect(2, "window");
        else g.addRespect(3, "window");
        if (prop.cash) { this.spawnCash(pos.x, pos.z, prop.cash); }
        g.player && g.player.onPropBroken(prop);
      }
      if (kind === "wood" && U.chance(0.18)) this.addFire(pos.x, pos.z, 0.7, 14, pos.y);
    }

    explode(pos, radius, power) {
      ST.audio.explode();
      const g = this.game;
      if (g) {
        g.shake(1.2);
        g.addRespect(15, "explosion");
        g.addWanted(0.9);
        if (g.player) g.player.damageFromBlast(pos, radius, 60);
      }
      this.burst(pos, 0xffb03a, 22, 8 * power, 1.1, 0.12);
      this.burst(pos, 0xff4a1f, 14, 6 * power, 0.9, 0.1);
      this.burst(pos, 0x333333, 16, 4 * power, 1.4, 0.16);
      this.addDecal(U.texScorch(), pos.x, pos.z, 2.6 * power, Math.random() * 6.28, 50, 0.9);
      this.addFire(pos.x, pos.z, 1.3 * power, 16, pos.y + 0.2);
      const r2 = radius * radius;
      for (let i = this.props.length - 1; i >= 0; i--) {
        const p = this.props[i];
        if (!p.body || p.body.mass === 0 || p.dead) continue;
        const d = p.mesh.position.distanceToSquared(pos);
        if (d < r2) {
          const dir = p.mesh.position.clone().sub(pos).normalize();
          const imp = (1 - Math.sqrt(d) / radius) * 55 * power;
          p.body.applyImpulse(new CANNON.Vec3(dir.x * imp, dir.y * imp + imp * 0.4, dir.z * imp), new CANNON.Vec3(0, 0, 0));
          this.damageProp(p, 50 * power, p.mesh.position.clone());
        }
      }
      const npcs = g && g.npcs ? g.npcs.all : [];
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down) continue;
        const d = n.body.position.distanceTo(pos);
        if (d < radius * 1.1) {
          n.hitByExplosion(pos, power);
        }
      }
    }

    addFire(x, z, scale, life, y) {
      if (this.fires.length > 34) return null;
      const group = new THREE.Group();
      const mats = [
        new THREE.MeshBasicMaterial({ color: 0xff4a1f, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
        new THREE.MeshBasicMaterial({ color: 0xffa21f, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }),
        new THREE.MeshBasicMaterial({ color: 0xffe86a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
      ];
      for (let i = 0; i < 3; i++) {
        const geo = new THREE.ConeGeometry(0.35 * scale, 1.5 * scale, 6);
        const m = new THREE.Mesh(geo, mats[i]);
        m.position.set(U.rand(-0.25, 0.25) * scale, 0.6 * scale + i * 0.3 * scale, U.rand(-0.25, 0.25) * scale);
        m.userData.baseY = m.position.y;
        m.userData.phase = U.rand(0, 6.28);
        group.add(m);
      }
      group.position.set(x, y || 0, z);
      this.scene.add(group);
      const f = { group, x, z, y: y || 0, scale, life, maxLife: life, burnTimer: 0, crackle: U.rand(0, 1) };
      this.fires.push(f);
      return f;
    }

    extinguishAt(pos, radius) {
      let n = 0;
      for (let i = this.fires.length - 1; i >= 0; i--) {
        const f = this.fires[i];
        if (Math.hypot(f.x - pos.x, f.z - pos.z) < radius) {
          this.scene.remove(f.group);
          this.fires.splice(i, 1);
          n++;
          this.burst(new THREE.Vector3(f.x, f.y + 0.5, f.z), 0xbfd8d8, 10, 2, 0.9, 0.12);
        }
      }
      if (n) ST.audio.splash();
      return n;
    }

    addDecal(tex, x, z, size, rot, life, opacity) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: opacity === undefined ? 1 : opacity,
        depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = rot || Math.random() * 6.28;
      mesh.position.set(x, 0.045, z);
      this.scene.add(mesh);
      const d = { mesh, life: life || 40, maxLife: life || 40 };
      this.decals.push(d);
      if (this.decals.length > 90) {
        const old = this.decals.shift();
        this.scene.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mesh.material.dispose();
      }
      return d;
    }

    addBlood(pos, scale) {
      if (this.decals.length > 70 && Math.random() > 0.6) return;
      this.addDecal(U.texBlood(), pos.x + U.rand(-0.4, 0.4), pos.z + U.rand(-0.4, 0.4), scale || U.rand(0.7, 1.4), Math.random() * 6.28, 35, 0.92);
    }

    _chunkDims(prop) {
      const geo = prop.mesh.geometry;
      const p = (geo && geo.parameters) || {};
      let w = 0.4, h = 0.4, d = 0.4;
      if (p.width !== undefined) { w = p.width; h = p.height; d = p.depth; }
      else if (p.radiusTop !== undefined) { w = d = (p.radiusTop || 0.2) * 2; h = p.height || 0.5; }
      return { w, h, d };
    }
    spawnChip(prop, point) {
      const dim = this._chunkDims(prop);
      const glass = prop.kind === "glass";
      const w = Math.max(0.05, dim.w * U.rand(0.08, 0.18));
      const h = glass ? U.rand(0.02, 0.05) : Math.max(0.05, dim.h * U.rand(0.08, 0.2));
      const d = Math.max(0.05, dim.d * U.rand(0.08, 0.18));
      const mat = glass
        ? new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55, flatShading: true })
        : this.paint(prop.kind === "wood" ? 0x7a5736 : prop.kind === "metal" ? 0x8a8a92 : 0xd8d8d8);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      const at = point || prop.mesh.position;
      mesh.position.set(at.x + U.rand(-0.25, 0.25), at.y + U.rand(0, 0.35), at.z + U.rand(-0.25, 0.25));
      this.scene.add(mesh);
      const body = new CANNON.Body({ mass: 0.25, position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z), material: this.physMat });
      body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
      body.velocity.set(U.rand(-2, 2), U.rand(1, 3), U.rand(-2, 2));
      this.physics.addBody(body);
      this.debris.push({ mesh, body, ttl: U.rand(8, 14) });
      this._trimDebris();
    }
    _trimDebris() {
      while (this.debris.length > 70) {
        const d = this.debris.shift();
        this.scene.remove(d.mesh);
        d.mesh.geometry.dispose();
        this.physics.removeBody(d.body);
      }
    }
    spawnChunks(prop, pos) {
      const dim = this._chunkDims(prop);
      const kind = prop.kind;
      const glass = kind === "glass";
      const ceramic = kind === "ceramic";
      const metal = kind === "metal";
      const count = glass ? 13 : ceramic ? 10 : metal ? 7 : 9;
      const baseColor = glass ? 0xbfe8ff : ceramic ? 0xe0e0e0 : metal ? 0x8a8a92 : 0x7a5736;
      const sharedMat = glass
        ? new THREE.MeshLambertMaterial({ color: baseColor, transparent: true, opacity: 0.55, flatShading: true })
        : this.paint(baseColor);
      for (let i = 0; i < count; i++) {
        let w, h, d;
        if (glass) {
          w = Math.max(0.06, dim.w * U.rand(0.1, 0.28));
          h = U.rand(0.025, 0.07);
          d = Math.max(0.06, dim.d * U.rand(0.1, 0.28));
        } else if (kind === "wood") {
          w = Math.max(0.08, dim.w * U.rand(0.22, 0.55));
          h = U.rand(0.06, 0.15);
          d = Math.max(0.08, dim.d * U.rand(0.22, 0.55));
        } else {
          w = Math.max(0.07, dim.w * U.rand(0.12, 0.32));
          h = Math.max(0.07, dim.h * U.rand(0.12, 0.3));
          d = Math.max(0.07, dim.d * U.rand(0.12, 0.32));
        }
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), sharedMat);
        mesh.position.set(pos.x + U.rand(-dim.w * 0.4, dim.w * 0.4), pos.y + U.rand(-0.1, 0.4), pos.z + U.rand(-dim.d * 0.4, dim.d * 0.4));
        mesh.rotation.set(U.rand(0, 6.28), U.rand(0, 6.28), U.rand(0, 6.28));
        this.scene.add(mesh);
        const body = new CANNON.Body({ mass: U.rand(0.25, 0.9), position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z), material: this.physMat });
        body.addShape(new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)));
        body.velocity.set(U.rand(-4, 4), U.rand(2, 6), U.rand(-4, 4));
        body.angularVelocity.set(U.rand(-9, 9), U.rand(-9, 9), U.rand(-9, 9));
        this.physics.addBody(body);
        this.debris.push({ mesh, body, ttl: U.rand(12, 20) });
      }
      this._trimDebris();
      this.burst(pos, baseColor, 8, 2.4, 0.45, 0.045);
    }

    spawnDebris(pos, color, count, size, speed) {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.BoxGeometry(size, size, size);
        const m = new THREE.Mesh(geo, this.paint(color));
        m.position.copy(pos).add(new THREE.Vector3(U.rand(-0.2, 0.2), U.rand(0.1, 0.4), U.rand(-0.2, 0.2)));
        this.scene.add(m);
        const body = new CANNON.Body({
          mass: 0.35, position: new CANNON.Vec3(m.position.x, m.position.y, m.position.z), material: this.physMat
        });
        body.addShape(new CANNON.Box(new CANNON.Vec3(size / 2, size / 2, size / 2)));
        body.velocity.set(U.rand(-speed, speed), U.rand(1, speed), U.rand(-speed, speed));
        this.physics.addBody(body);
        this.debris.push({ mesh: m, body, ttl: U.rand(4, 7) });
      }
      while (this.debris.length > 45) {
        const d = this.debris.shift();
        this.scene.remove(d.mesh); this.physics.removeBody(d.body);
      }
    }

    burst(pos, color, count, speed, life, size) {
      size = size || 0.08;
      for (let i = 0; i < count; i++) {
        if (this.particles.length > 320) this.particles.shift();
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshBasicMaterial({ color });
        const m = new THREE.Mesh(geo, mat);
        m.position.copy(pos);
        this.scene.add(m);
        this.particles.push({
          mesh: m, life: life * U.rand(0.6, 1.2), maxLife: life, size,
          vel: new THREE.Vector3(U.rand(-speed, speed), U.rand(0.5, speed), U.rand(-speed, speed))
        });
      }
    }

    smokePuff(pos, color, count, scale) {
      for (let i = 0; i < count; i++) {
        const size = U.rand(0.08, 0.17) * (scale || 1);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, depthWrite: false });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(size * 0.65, 6, 4), mat);
        mesh.position.copy(pos);
        mesh.position.x += U.rand(-0.1, 0.1);
        mesh.position.z += U.rand(-0.1, 0.1);
        this.scene.add(mesh);
        this.particles.push({
          mesh, life: U.rand(1.0, 1.8), maxLife: 1.7, size,
          buoyant: true, fade: true,
          vel: new THREE.Vector3(U.rand(-0.25, 0.25), U.rand(0.25, 0.7), U.rand(-0.25, 0.25))
        });
        if (this.particles.length > 320) this.particles.shift();
      }
    }

    speechBubble(npc, text, duration) {
      if (!npc || !text) return;
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        if (this.bubbles[i].npc === npc) {
          this.scene.remove(this.bubbles[i].sprite);
          this.bubbles[i].sprite.material.map.dispose();
          this.bubbles[i].sprite.material.dispose();
          this.bubbles.splice(i, 1);
        }
      }
      const lines = [];
      let line = "";
      String(text).split(/\s+/).forEach((word) => {
        if ((line + " " + word).trim().length > 24 && line) { lines.push(line); line = word; }
        else line = (line + " " + word).trim();
      });
      if (line) lines.push(line);
      const shown = lines.slice(0, 3);
      const tex = U.tex(320, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.fillStyle = "rgba(8,6,14,.88)";
        g.strokeStyle = ["#ff2d78", "#2fe3ff", "#ffd400", "#5cff86"][npc.kind === "cop" ? 1 : npc.kind === "pimp" ? 2 : 0];
        g.lineWidth = 4;
        const x = 6, y = 6, rw = w - 12, rh = h - 12;
        g.beginPath();
        g.moveTo(x + 12, y);
        g.lineTo(x + rw - 12, y);
        g.lineTo(x + rw, y + 12);
        g.lineTo(x + rw, y + rh - 12);
        g.lineTo(x + rw - 12, y + rh);
        g.lineTo(x + 12, y + rh);
        g.lineTo(x, y + rh - 12);
        g.lineTo(x, y + 12);
        g.closePath();
        g.fill(); g.stroke();
        g.fillStyle = "#fff";
        g.font = "bold 21px 'Arial Black', Impact, sans-serif";
        g.textAlign = "center";
        shown.forEach((ln, i) => g.fillText(ln, w / 2, 42 + i * 27));
      });
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(2.7, 1.08, 1);
      const bp = npc.body ? npc.body.position : { x: npc.group.position.x, y: 1, z: npc.group.position.z };
      sprite.position.set(bp.x, bp.y + 2.6, bp.z);
      this.scene.add(sprite);
      this.bubbles.push({ sprite, npc, life: duration || 2.8, maxLife: duration || 2.8 });
      if (this.bubbles.length > 10) {
        const old = this.bubbles.shift();
        this.scene.remove(old.sprite);
        old.sprite.material.map.dispose();
        old.sprite.material.dispose();
      }
    }

    bodyParts(pos, color, full) {
      const skin = this.paint(color || 0xb07a52);
      const meat = this.paint(0x6e0710);
      const bone = this.paint(0xd8c8b0);
      const parts = [];
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 7, 5), skin);
      parts.push(head);
      const armGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.45, 6);
      const legGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.62, 6);
      parts.push(new THREE.Mesh(armGeo, skin));
      parts.push(new THREE.Mesh(armGeo, skin));
      if (full) {
        parts.push(new THREE.Mesh(legGeo, skin));
        parts.push(new THREE.Mesh(legGeo, skin));
        for (let i = 0; i < 3; i++) {
          const chunk = new THREE.Mesh(new THREE.BoxGeometry(U.rand(0.12, 0.26), U.rand(0.08, 0.2), U.rand(0.1, 0.22)), i === 0 ? bone : meat);
          parts.push(chunk);
        }
      }
      parts.forEach((mesh, i) => {
        mesh.position.set(pos.x + U.rand(-0.25, 0.25), Math.max(0.4, pos.y) + U.rand(0, 0.45), pos.z + U.rand(-0.25, 0.25));
        mesh.rotation.set(U.rand(0, 6.28), U.rand(0, 6.28), U.rand(0, 6.28));
        this.scene.add(mesh);
        const half = mesh.geometry.type === "SphereGeometry" ? 0.16 : 0.22;
        const body = new CANNON.Body({ mass: 0.5, position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z), material: this.physMat });
        body.addShape(new CANNON.Box(new CANNON.Vec3(half, half, half)));
        body.velocity.set(U.rand(-4, 4), U.rand(2.5, 6.5), U.rand(-4, 4));
        body.angularVelocity.set(U.rand(-10, 10), U.rand(-10, 10), U.rand(-10, 10));
        this.physics.addBody(body);
        this.debris.push({ mesh, body, ttl: U.rand(9, 16) });
      });
      this.burst(new THREE.Vector3(pos.x, 1, pos.z), 0x8a0a12, full ? 36 : 18, 5.5, 1.2, 0.09);
      this.burst(new THREE.Vector3(pos.x, 1, pos.z), 0x4a0008, 12, 3, 1.0, 0.12);
      this.addBlood(new THREE.Vector3(pos.x, 0, pos.z), full ? 3.8 : 2.2);
      this._trimDebris();
    }

    floatText(pos, text, color) {
      if (!text) return;
      const tex = U.tex(160, 64, (g, w, h) => {
        g.clearRect(0, 0, w, h);
        g.font = "bold 30px 'Arial Black', Impact, sans-serif";
        g.textAlign = "center"; g.textBaseline = "middle";
        g.lineWidth = 6; g.strokeStyle = "rgba(0,0,0,.9)";
        g.strokeText(text, w / 2, h / 2);
        g.fillStyle = color || "#ffffff";
        g.fillText(text, w / 2, h / 2);
      });
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.7, 0.68, 1);
      sprite.position.set(pos.x, pos.y + 1.9, pos.z);
      this.scene.add(sprite);
      this.floaters.push({ sprite, life: 1.25, maxLife: 1.25, vy: 0.9 });
      if (this.floaters.length > 18) {
        const old = this.floaters.shift();
        this.scene.remove(old.sprite); old.sprite.material.dispose();
      }
    }

    gib(pos, color) {
      this.spawnDebris(pos, color || 0x9a1a1a, 6, 0.2, 5.5);
      this.spawnDebris(pos, 0x7a0a10, 5, 0.14, 4.5);
      this.burst(pos, 0x8a0a12, 14, 5, 0.8, 0.09);
      ST.audio.thunk();
    }

    spawnCash(x, z, amount) {      const count = Math.max(1, Math.min(6, Math.round(amount / 8)));
      for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.25), this.paint(0x3a7a3a));
        mesh.position.set(x + U.rand(-0.8, 0.8), 0.4, z + U.rand(-0.8, 0.8));
        this.scene.add(mesh);
        const body = new CANNON.Body({ mass: 0.2, position: new CANNON.Vec3(mesh.position.x, 0.4, mesh.position.z), material: this.physMat });
        body.addShape(new CANNON.Box(new CANNON.Vec3(0.25, 0.05, 0.125)));
        body.velocity.set(U.rand(-1.5, 1.5), U.rand(2, 4), U.rand(-1.5, 1.5));
        this.physics.addBody(body);
        const prop = this._makeProp(mesh, body, { kind: "cash", health: 1, breakable: false, name: "cash" });
        prop.cashValue = Math.max(1, Math.round(amount / count));
        prop.autoPickup = true;
        prop.cashCollected = false;
        this.cashProps.push(prop);
      }
    }

    /* ================= ray helpers ================= */
    ray(from, to, mask) {
      const res = new CANNON.RaycastResult();
      this.physics.raycastClosest(
        new CANNON.Vec3(from.x, from.y, from.z),
        new CANNON.Vec3(to.x, to.y, to.z),
        { skipBackfaces: true, collisionFilterMask: mask === undefined ? -1 : mask },
        res
      );
      return res;
    }

    /* ================= update ================= */
    update(dt) {
      this.time += dt;
      // ambient traffic: swerves around anything in its lane and refuses to phase
      for (let i = 0; i < this.cars.length; i++) {
        const car = this.cars[i];
        // knockback from being rammed
        if (car.knockX || car.knockZ) {
          car.group.position.x += car.knockX * dt;
          car.group.position.z += car.knockZ * dt;
          car.heading += (car.knockSpin || 0) * dt;
          car.knockX *= 0.9; car.knockZ *= 0.9; car.knockSpin = (car.knockSpin || 0) * 0.9;
          if (Math.abs(car.knockX) < 0.02) car.knockX = 0;
          if (Math.abs(car.knockZ) < 0.02) car.knockZ = 0;
        }
        if (!car.ai) continue;
        car.group.rotation.y = car.heading = car.aiDir > 0 ? 0 : Math.PI;
        const np = this.game.player.body.position;
        const nearPlayer = Math.hypot(np.x - car.group.position.x, np.z - car.group.position.z) < 8;
        const dirZ = car.aiDir > 0 ? -1 : 1;
        let brake = nearPlayer;
        let swerve = 0;
        for (let j = 0; j < this.cars.length; j++) {
          const other = this.cars[j];
          if (other === car) continue;
          const dz = (other.group.position.z - car.group.position.z) * dirZ;
          const dx = other.group.position.x - car.group.position.x;
          if (dz > 0.5 && dz < 17 && Math.abs(dx) < 3.0) {
            // something is in the lane: pick the open side and lean that way
            const leftOpen = car.lane - 1.9 > -5.2;
            swerve = dx > 0 ? -1.9 : 1.9;
            if (!leftOpen && swerve < 0) swerve = 1.4;
            if (dz < 9) brake = true;
            if (dz < 5.5) swerve = 0;
          }
        }
        // Hitting the player is a Kentucky rite of passage.
        const pDist = Math.hypot(np.x - car.group.position.x, np.z - car.group.position.z);
        const playerSpeed = car.aiSpeed || 8.5;
        if (!this.game.player.driving && pDist < 2.2 && playerSpeed > 2.5 && (car.playerHitCd || 0) <= 0) {
          car.playerHitCd = 1.6;
          const p = this.game.player;
          const px = p.body.position.x - car.group.position.x;
          const pz = p.body.position.z - car.group.position.z;
          const pl = Math.max(0.01, Math.hypot(px, pz));
          p.body.velocity.x += (px / pl) * 9 + car.aiDir * 0;
          p.body.velocity.z += (pz / pl) * 9 + (car.aiDir > 0 ? -4 : 4);
          p.body.velocity.y = Math.max(p.body.velocity.y, 4);
          p.damage(16 + playerSpeed * 2.2, car);
          this.game.shake(0.8);
          ST.audio.honk();
          ST.audio.thunk();
          this.game.ticker("You got hit by a car. In Kentucky, that's a greeting.", "bad");
          this.game.addWanted(0.2);
        }
        // Run down pedestrians too. Equal opportunity traffic.
        if ((car.npcHitCd || 0) <= 0 && playerSpeed > 4) {
          const npcs = this.game.npcs.all;
          for (let k = 0; k < npcs.length; k++) {
            const n = npcs[k];
            if (n.down || n.knocked || n.removed) continue;
            if (Math.hypot(n.body.position.x - car.group.position.x, n.body.position.z - car.group.position.z) < 2.1) {
              car.npcHitCd = 2.2;
              n.damage(26 + playerSpeed * 2, car.group.position, "car");
              if (!n.down && !n.knocked) n.knockdown(car.group.position, 1.3);
              ST.audio.thunk();
              this.game.ticker(n.name + " got clipped by traffic. Nobody stopped.", "bad");
              break;
            }
          }
        }
        car.playerHitCd = Math.max(0, (car.playerHitCd || 0) - dt);
        car.npcHitCd = Math.max(0, (car.npcHitCd || 0) - dt);
        const targetSpeed = brake ? 1.4 : 8.5;
        car.aiSpeed = (car.aiSpeed || 8.5) + (targetSpeed - (car.aiSpeed || 8.5)) * Math.min(1, dt * 2.2);
        const targetX = car.lane + swerve;
        car.group.position.x += (targetX - car.group.position.x) * Math.min(1, dt * 1.6);
        car.group.position.z += car.aiDir > 0 ? -car.aiSpeed * dt : car.aiSpeed * dt;
        if (car.aiDir > 0 && car.group.position.z < -52) car.group.position.z = 52;
        if (car.aiDir < 0 && car.group.position.z > 52) car.group.position.z = -52;
        for (let w = 0; w < car.wheels.length; w++) car.wheels[w].rotation.x -= car.aiSpeed * dt * 2.2;
      }
      // fires
      for (let i = this.fires.length - 1; i >= 0; i--) {
        const f = this.fires[i];
        f.life -= dt;
        f.burnTimer -= dt;
        f.group.children.forEach((m) => {
          const s = 1 + Math.sin(this.time * 9 + m.userData.phase) * 0.18;
          m.scale.set(s, 1 + Math.sin(this.time * 13 + m.userData.phase) * 0.22, s);
          m.rotation.y += dt * 2.2;
          m.position.y = m.userData.baseY + Math.sin(this.time * 7 + m.userData.phase) * 0.08;
        });
        if (f.crackle > 0) {
          f.crackle -= dt;
          if (f.crackle <= 0) { f.crackle = U.rand(0.18, 0.5); if (Math.random() < 0.5) ST.audio.fireCrackle(); }
        }
        if (f.burnTimer <= 0) {
          f.burnTimer = 0.5;
          const r = 2.4 * f.scale;
          // burn props
          for (let k = this.props.length - 1; k >= 0; k--) {
            const p = this.props[k];
            if (p.dead) continue;
            if (Math.hypot(p.mesh.position.x - f.x, p.mesh.position.z - f.z) < r) {
              if (p.flammable && !p.explosive && Math.random() < 0.55) {
                const already = this.fires.some((ff) => Math.hypot(ff.x - p.mesh.position.x, ff.z - p.mesh.position.z) < 0.8);
                if (!already) this.addFire(p.mesh.position.x, p.mesh.position.z, 0.6, 10);
              }
              p.health -= 8;
              if (p.health <= 0 && p.breakable) this.breakProp(p, p.mesh.position.clone());
            }
          }
          // burn people
          const npcs = this.game && this.game.npcs ? this.game.npcs.all : [];
          for (let k = 0; k < npcs.length; k++) {
            const n = npcs[k];
            if (n.down) continue;
            if (Math.hypot(n.body.position.x - f.x, n.body.position.z - f.z) < r) {
              if (n.ignite) n.ignite();
              n.damage(6, new THREE.Vector3(f.x, 1, f.z), "fire");
            }
          }
          if (Math.random() < 0.55) {
            this.smokePuff(new THREE.Vector3(f.x + U.rand(-0.4, 0.4), f.y + 1.1, f.z + U.rand(-0.4, 0.4)), 0x555555, 2, 0.9);
          }
          // burn player
          const pl = this.game && this.game.player;
          if (pl && Math.hypot(pl.body.position.x - f.x, pl.body.position.z - f.z) < r) pl.damage(6, "fire");
        }
        if (f.life <= 0) {
          this.scene.remove(f.group);
          this.fires.splice(i, 1);
        }
      }
      // particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= dt;
        p.vel.y -= (p.buoyant ? -1.1 : 9) * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        if (!p.buoyant && p.mesh.position.y < 0.03) { p.mesh.position.y = 0.03; p.vel.y *= -0.3; p.vel.x *= 0.7; p.vel.z *= 0.7; }
        if (p.buoyant) {
          p.mesh.scale.setScalar(1 + (1 - p.life / p.maxLife) * 2.2);
          if (p.mesh.material) p.mesh.material.opacity = Math.max(0, 0.32 * (p.life / p.maxLife));
        }
        p.mesh.rotation.x += dt * 6; p.mesh.rotation.y += dt * 5;
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          this.particles.splice(i, 1);
        }
      }
      // debris
      for (let i = this.debris.length - 1; i >= 0; i--) {
        const d = this.debris[i];
        d.ttl -= dt;
        d.mesh.position.copy(d.body.position);
        d.mesh.quaternion.copy(d.body.quaternion);
        if (d.ttl <= 0) {
          this.scene.remove(d.mesh);
          d.mesh.geometry.dispose();
          this.physics.removeBody(d.body);
          this.debris.splice(i, 1);
        }
      }
      // decals fade
      for (let i = this.decals.length - 1; i >= 0; i--) {
        const d = this.decals[i];
        d.life -= dt;
        if (d.life < 4) d.mesh.material.opacity = Math.max(0, (d.life / 4) * 0.92);
        if (d.life <= 0) {
          this.scene.remove(d.mesh);
          d.mesh.geometry.dispose();
          d.mesh.material.dispose();
          this.decals.splice(i, 1);
        }
      }
      // floating combat words
      for (let i = this.floaters.length - 1; i >= 0; i--) {
        const f = this.floaters[i];
        f.life -= dt;
        f.sprite.position.y += f.vy * dt;
        f.sprite.material.opacity = Math.max(0, f.life / f.maxLife);
        if (f.life <= 0) {
          this.scene.remove(f.sprite);
          f.sprite.material.map.dispose();
          f.sprite.material.dispose();
          this.floaters.splice(i, 1);
        }
      }
      // NPC speech bubbles
      for (let i = this.bubbles.length - 1; i >= 0; i--) {
        const b = this.bubbles[i];
        b.life -= dt;
        const np = b.npc;
        if (!np || np.removed) b.life = 0;
        else {
          const bp = np.body ? np.body.position : np.group.position;
          b.sprite.position.set(bp.x, (np.down ? 1.05 : bp.y + 2.55) + Math.sin(this.time * 2.2 + i) * 0.04, bp.z);
          b.sprite.material.opacity = Math.min(1, b.life / 0.4);
        }
        if (b.life <= 0) {
          this.scene.remove(b.sprite);
          b.sprite.material.map.dispose();
          b.sprite.material.dispose();
          this.bubbles.splice(i, 1);
        }
      }
      // sync dynamic props
      for (let i = 0; i < this.props.length; i++) {
        const p = this.props[i];
        if (!p.body || p.body.mass === 0) continue;
        p.mesh.position.copy(p.body.position);
        p.mesh.quaternion.copy(p.body.quaternion);
        if (p.body.position.y < -6) {
          this.scene.remove(p.mesh);
          this.physics.removeBody(p.body);
          delete this.propByBody[p.body.id];
          this.props.splice(i, 1);
          i--;
        }
      }
      // sync debris-free cash spin
      for (let i = this.cashProps.length - 1; i >= 0; i--) {
        const p = this.cashProps[i];
        p.mesh.rotateY(dt * 2);
        if (p.cashCollected) {
          this.scene.remove(p.mesh);
          if (p.body) { this.physics.removeBody(p.body); delete this.propByBody[p.body.id]; }
          const pi = this.props.indexOf(p);
          if (pi >= 0) this.props.splice(pi, 1);
          const hi = this.hittable.indexOf(p.mesh);
          if (hi >= 0) this.hittable.splice(hi, 1);
          this.cashProps.splice(i, 1);
        }
      }
      // neon flicker
      if (this.clubLight) this.clubLight.intensity = 0.8 + Math.sin(this.time * 17) * 0.15 + Math.sin(this.time * 3.1) * 0.1;
      if (this.disco) { this.disco.rotation.y += dt * 1.4; this.disco.rotation.x += dt * 0.3; }
      if (this.partyBall) { this.partyBall.rotation.y += dt * 2; this.partyBall.rotation.x += dt * 0.5; }
      if (this.party && this.game && this.game.player) {
        const pp = this.game.player.body.position;
        if (Math.hypot(pp.x - this.party.x, pp.z - this.party.z) < 26) {
          this.partyT = (this.partyT || 0) - dt;
          if (this.partyT <= 0) {
            this.partyT = 0.55;
            const colors = [0xff2d78, 0x2fe3ff, 0xffd400, 0x5cff86, 0xff8a1f];
            for (let i = 0; i < 4; i++) {
              this.burst(new THREE.Vector3(this.party.x + U.rand(-4, 4), U.rand(3.5, 5), this.party.z + U.rand(-4, 4)), U.pick(colors), 1, 1.2, 1.6, 0.07);
            }
          }
        }
      }
      for (let i = 0; i < this.neons.length; i++) {
        const n = this.neons[i];
        const ph = n.userData.flicker;
        const on = Math.sin(this.time * 13 + ph) > -0.55 || Math.sin(this.time * 2.1 + ph) > 0.7;
        n.material.opacity = on ? 1 : 0.35;
      }
    }

    getPlayerSpawn() { return new THREE.Vector3(0, 1.1, 12); }
  }

  ST.World = World;
})();
