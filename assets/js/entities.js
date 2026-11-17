/* SHITTOWN — entities.js
   The citizens: pedestrians, drunks, Karens, cops, bouncers, dancers,
   a bartender, a clerk, and one old man. All of them are one bad day
   away from being a ragdoll. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;

  const SKINS = [0xd8a878, 0x8a5a3a, 0xefc9a0, 0x6b4226, 0xb07a52];
  const SHIRTS = [0x7a2a3a, 0x2a4a7a, 0x3a6a3a, 0x6a5a2a, 0x5a2a6a, 0x2a6a6a, 0x8a4a2a, 0x444444];
  const PANTS = [0x223044, 0x2a2a2a, 0x3a2a1a, 0x1a2a3a, 0x333344];
  const NAMES = ["Gary", "Dale", "Brandon", "Tiffany", "Kyle", "Darlene", "Chad", "Brenda", "Dwayne", "Steve",
    "Monica", "Randy", "Crystal", "Todd", "Sheila", "Big Tony", "Little Tony", "Deb", "Kevin", "Linda",
    "Cletus", "Bubba", "Earl", "Waylon", "Merle", "Jolene", "Tammy", "Hank", "Junior", "Darlene Sue"];

  const KIND_CONFIG = {
    ped: { health: 80, speed: 2.2, color: "ped" },
    drunk: { health: 70, speed: 1.5, color: "drunk" },
    karen: { health: 65, speed: 2.5, color: "karen" },
    cop: { health: 150, speed: 3.9, color: "cop" },
    bouncer: { health: 240, speed: 3.0, color: "bouncer" },
    dancer: { health: 70, speed: 0, color: "dancer" },
    bartender: { health: 90, speed: 0, color: "bartender" },
    clerk: { health: 80, speed: 0, color: "clerk" },
    oldman: { health: 60, speed: 1.1, color: "oldman" },
    bum: { health: 75, speed: 1.8, color: "bum" },
    wiener: { health: 80, speed: 0, color: "wiener" },
    chicken: { health: 80, speed: 0, color: "chicken" },
    weedclerk: { health: 100, speed: 0, color: "weedclerk" },
    barber: { health: 90, speed: 0, color: "barber" },
    security: { health: 170, speed: 2.6, color: "security" },
    mallrat: { health: 70, speed: 1.7, color: "mallrat" },
    tweaker: { health: 55, speed: 2.1, color: "tweaker" },
    pimp: { health: 140, speed: 2.0, color: "pimp" },
    petitioner: { health: 65, speed: 0, color: "petitioner" },
    influencer: { health: 70, speed: 2.2, color: "influencer" },
    cryptobro: { health: 90, speed: 2.0, color: "cryptobro" },
    delivery: { health: 85, speed: 3.0, color: "delivery" },
    dealer: { health: 110, speed: 1.8, color: "dealer" },
    dj: { health: 90, speed: 0, color: "dj" },
    geeker: { health: 60, speed: 1.0, color: "geeker" },
    partygoer: { health: 70, speed: 1.5, color: "partygoer" },
    redneck: { health: 95, speed: 1.9, color: "redneck" },
    colonel: { health: 700, speed: 3.2, color: "colonel" },
    goon: { health: 220, speed: 3.0, color: "goon" }
  };

  let shadowTex = null;
  function getShadowTex() {
    if (shadowTex) return shadowTex;
    shadowTex = U.tex(64, 64, (g, w, h) => {
      const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
      grd.addColorStop(0, "rgba(0,0,0,.55)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
    });
    return shadowTex;
  }

  class NPC {
    constructor(game, opts) {
      this.game = game;
      this.kind = opts.kind || "ped";
      const cfg = KIND_CONFIG[this.kind] || KIND_CONFIG.ped;
      this.name = opts.name || U.pick(NAMES);
      this.health = cfg.health;
      this.maxHealth = cfg.health;
      this.speed = cfg.speed;
      this.baseSpeed = cfg.speed;
      this.body = null;
      this.down = false;
      this.floorY = opts.floorY || 0;
      this.state = opts.state || ((this.kind === "dancer" || this.kind === "partygoer") ? "dance" : (this.kind === "geeker" ? "nod" : (["bartender", "clerk", "wiener", "chicken", "weedclerk", "barber", "petitioner", "dj"].indexOf(this.kind) >= 0 ? "idle" : "wander")));
      this.homeX = opts.x;
      this.homeZ = opts.z;
      this.target = new THREE.Vector3(opts.x, 0, opts.z);
      this.pauseTimer = U.rand(0, 2);
      this.animT = U.rand(0, 6);
      this.barkCooldown = U.rand(3, 12);
      this.callTimer = 0;
      this.blockedTimer = 0;
      this.attackTimer = 0;
      this.corpseTimer = 0;
      this.witnessed = false;
      this.drunkPhase = U.rand(0, 6.28);
      this.stage = opts.stage || null;
      this.burning = 0;
      this.vomitCd = U.rand(6, 20);
      this.eyePop = 0;
      this.staggerT = 0;
      this.staggerSide = 1;
      this.ragdollT = 0;
      this.ragdollBounced = false;
      this.ragdollSplat = false;
      this.knocked = false;
      this.getUpT = 0;
      this.angry = false;
      this.nodT = U.rand(2, 6);
      this.nodDown = true;
      this.coughT = 0;
      this.coughSfxT = 0;
      this.tweakOut = 0;
      this.forearms = [];
      this.shins = [];
      this.weedPrice = U.randInt(18, 36);
      this.voicePitch = (this.kind === "cop" || this.kind === "bouncer" || this.kind === "security") ? 0.8 : (this.kind === "dancer" || this.kind === "influencer") ? 1.3 : U.rand(0.88, 1.16);
      this._sayCd = 0;
      this.talkT = 0;
      this.buysWeed = ["ped", "drunk", "karen", "mallrat", "bum", "tweaker", "pimp", "influencer", "cryptobro", "delivery"].indexOf(this.kind) >= 0 && U.chance(0.45);

      this._buildVisual(opts);
      this._buildBody(opts.x, opts.z);
    }

    _buildVisual(opts) {
      const palette = {
        ped: { shirt: U.pick(SHIRTS), pants: U.pick(PANTS), hair: 0x2a1a12 },
        drunk: { shirt: 0x6a5a3a, pants: 0x2a2a22, hair: 0x3a2a1a },
        karen: { shirt: 0x8a2a5a, pants: 0x222222, hair: 0x7a5a2a },
        cop: { shirt: 0x243c66, pants: 0x1a2433, hair: 0x1a1410 },
        bouncer: { shirt: 0x141414, pants: 0x0e0e0e, hair: 0x151515 },
        dancer: { shirt: 0xd82a6a, pants: 0x331a2a, hair: 0x3a1a10 },
        bartender: { shirt: 0x3a3a3a, pants: 0x222222, hair: 0x2a1a12 },
        clerk: { shirt: 0x2a6a4a, pants: 0x22262a, hair: 0x1a1410 },
        oldman: { shirt: 0x6a6a4a, pants: 0x4a3a2a, hair: 0xbbbbbb },
        bum: { shirt: 0x4a3a2a, pants: 0x2a2420, hair: 0x555555 },
        wiener: { shirt: 0xd8d0c0, pants: 0x332a22, hair: 0x3a2a12 },
        chicken: { shirt: 0x9a2020, pants: 0x22262a, hair: 0x2a1a12 },
        weedclerk: { shirt: 0x3a6a42, pants: 0x222a22, hair: 0x5a3a1a },
        barber: { shirt: 0x222222, pants: 0x2a2a2a, hair: 0x1a1410 },
        security: { shirt: 0x2a3448, pants: 0x1a1f2a, hair: 0x1a1410 },
        mallrat: { shirt: 0x3a2a5a, pants: 0x1c1c24, hair: 0x111111 },
        tweaker: { shirt: 0x4a4a5a, pants: 0x2a2a2a, hair: 0x3a2a1a },
        pimp: { shirt: 0x5a1f7a, pants: 0x2a1240, hair: 0x151515 },
        petitioner: { shirt: 0x2a3a52, pants: 0x1c1c1c, hair: 0x2a1a12 },
        influencer: { shirt: 0xd84a8a, pants: 0x2a2a34, hair: 0xd8b060 },
        cryptobro: { shirt: 0x1a1a22, pants: 0x22242a, hair: 0x1a1410 },
        delivery: { shirt: 0x9a2a20, pants: 0x24242a, hair: 0x2a1a12 },
        dealer: { shirt: 0x2a2a22, pants: 0x1a1a1a, hair: 0x1a1410 },
        dj: { shirt: 0x3a1f5a, pants: 0x1a1a22, hair: 0x1a1410 },
        partygoer: { shirt: U.pick([0x2fe3ff, 0xff8a1f, 0x5cff86, 0xb86aff, 0xffd400]), pants: 0x1c1c24, hair: 0x2a1a12 },
        geeker: { shirt: 0x2a2a32, pants: 0x16161a, hair: 0x2a1a12 },
        redneck: { shirt: U.pick([0x8a2a20, 0x5a4a2a, 0x2a4a6a]), pants: 0x2a3a5a, hair: U.pick([0x2a1a12, 0x6a4a22, 0x8a6a32]) },
        colonel: { shirt: 0xe8e0cc, pants: 0x2a2a30, hair: 0xbbbbbb },
        goon: { shirt: 0x4a1a1a, pants: 0x1c1c22, hair: 0x2a1a12 }
      }[this.kind] || { shirt: 0x555555, pants: 0x222222, hair: 0x2a1a12 };
      const skin = opts.skin || U.pick(SKINS);
      this.skinColor = skin;
      const g = new THREE.Group();
      this.group = g;
      this.legs = []; this.arms = [];
      this.eyePop = 0;
      const W = this.game.world;
      const shirtMat = W.paintSmooth(opts.shirt || palette.shirt);
      const pantMat = W.paintSmooth(palette.pants);
      const skinMat = W.paintSmooth(skin);
      const shoeMat = W.paint(0x151515);
      const hairMat = W.paintSmooth(palette.hair);
      this.skinMat = skinMat;
      this.shirtMat = shirtMat;

      // legs: thigh, shin, shoe, pivoted at the hip
      for (let i = 0; i < 2; i++) {
        const hip = new THREE.Group();
        hip.position.set(i ? 0.13 : -0.13, 0.88, 0);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.38, 7), pantMat);
        thigh.position.y = -0.19; hip.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.36, 7), pantMat);
        shin.position.y = -0.55; hip.add(shin);
        this.shins.push(shin);
        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.32), shoeMat);
        shoe.position.set(0, -0.75, -0.05); hip.add(shoe);
        g.add(hip); this.legs.push(hip);
      }

      // torso
      const torso = new THREE.Group();
      torso.position.y = 1.3;
      g.add(torso); this.torso = torso;
      const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.24, 8), pantMat);
      hips.position.y = -0.3; torso.add(hips);
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.235, 0.56, 8), shirtMat);
      chest.position.y = 0.03; torso.add(chest);
      const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.29, 8, 6), shirtMat);
      shoulders.scale.set(1, 0.45, 0.82); shoulders.position.y = 0.29; torso.add(shoulders);

      // neck + head
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 0.14, 7), skinMat);
      neck.position.y = 1.63; g.add(neck);
      const headGroup = new THREE.Group();
      headGroup.position.y = 1.81;
      g.add(headGroup); this.head = headGroup;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 9, 7), skinMat);
      skull.scale.set(0.93, 1.06, 0.9); headGroup.add(skull);
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), skinMat);
      jaw.scale.set(0.9, 0.65, 0.82); jaw.position.set(0, -0.10, -0.02); headGroup.add(jaw);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 0.08), skinMat);
      nose.position.set(0, -0.015, -0.205); headGroup.add(nose);
      for (let i = 0; i < 2; i++) {
        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), skinMat);
        ear.position.set(i ? 0.20 : -0.20, 0.0, 0.0); headGroup.add(ear);
      }
      const mouthMat = W.paint(0x5a2a2a);
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.028, 0.03), mouthMat);
      mouth.position.set(0, -0.125, -0.195); headGroup.add(mouth);
      this.mouth = mouth;

      // eyes (scared / wide reactions)
      this.eyeWhites = []; this.pupils = []; this.xEyes = [];
      const eyeWhiteMat = W.paint(0xf4f0e8);
      const pupilMat = W.paint(0x120c0c);
      for (let i = 0; i < 2; i++) {
        const ex = i ? 0.075 : -0.075;
        const white = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 6), eyeWhiteMat);
        white.position.set(ex, 0.035, -0.177);
        white.scale.set(1, 1.05, 0.5);
        headGroup.add(white); this.eyeWhites.push(white);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 5), pupilMat);
        pupil.position.set(ex, 0.033, -0.201);
        headGroup.add(pupil); this.pupils.push(pupil);
        pupil.userData.baseX = ex;
        const xg = new THREE.Group();
        xg.position.set(ex, 0.035, -0.20);
        for (let k = 0; k < 2; k++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.012, 0.012), pupilMat);
          bar.rotation.z = k ? 0.78 : -0.78;
          xg.add(bar);
        }
        xg.visible = false;
        headGroup.add(xg); this.xEyes.push(xg);
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.018, 0.02), hairMat);
        brow.position.set(ex, 0.105, -0.19);
        brow.rotation.z = i ? -0.06 : 0.06;
        headGroup.add(brow);
      }
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.09), W.paint(0xd85070));
      tongue.position.set(0, -0.15, -0.235);
      tongue.visible = false;
      headGroup.add(tongue); this.tongue = tongue;

      // hair
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.225, 8, 6), hairMat);
      hair.scale.set(0.99, 0.72, 0.96);
      hair.position.y = 0.065;
      headGroup.add(hair);
      if (["weedclerk", "dancer", "mallrat"].indexOf(this.kind) >= 0) {
        const longHair = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.36, 8), hairMat);
        longHair.position.set(0, -0.14, 0.11); headGroup.add(longHair);
      }

      // arms: shoulder, upper arm, forearm, hand
      for (let i = 0; i < 2; i++) {
        const armGroup = new THREE.Group();
        armGroup.position.set(i ? 0.34 : -0.34, 1.5, 0);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.15, 7), shirtMat);
        sleeve.position.y = -0.06; armGroup.add(sleeve);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.30, 7), skinMat);
        upper.position.y = -0.20; armGroup.add(upper);
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.28, 7), skinMat);
        fore.position.y = -0.44; armGroup.add(fore);
        this.forearms.push(fore);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), skinMat);
        hand.scale.set(0.85, 1.1, 0.7);
        hand.position.y = -0.60; armGroup.add(hand);
        g.add(armGroup); this.arms.push(armGroup);
      }

      // accessories
      const capMat = W.paint(0x1a2a4a);
      if (this.kind === "cop" || this.kind === "security") {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 8), W.paint(0x101820));
        brim.position.y = 0.19; headGroup.add(brim);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.185, 0.15, 8), capMat);
        cap.position.y = 0.26; headGroup.add(cap);
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.03), W.paint(0xffd400));
        badge.position.set(-0.14, 0.05, -0.24); torso.add(badge);
      }
      if (this.kind === "chicken") {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.14, 8), W.paint(0x9a2020));
        cap.position.y = 0.26; headGroup.add(cap);
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.03), W.paint(0xd8d0c0));
        apron.position.set(0, 0.02, -0.245); torso.add(apron);
      }
      if (this.kind === "wiener") {
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.16, 8), W.paint(0xf0ece0));
        hat.position.y = 0.27; headGroup.add(hat);
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.03), W.paint(0xd8d0c0));
        apron.position.set(0, 0.02, -0.245); torso.add(apron);
        for (let i = 0; i < 2; i++) {
          const stache = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.03), W.paint(0x3a2a12));
          stache.position.set(i ? 0.035 : -0.035, -0.085, -0.205); headGroup.add(stache);
        }
      }
      if (this.kind === "bartender") {
        const apron = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.03), W.paint(0xd8d0c0));
        apron.position.set(0, 0.0, -0.245); torso.add(apron);
      }
      if (this.kind === "barber") {
        const stache = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.03), W.paint(0x1a1410));
        stache.position.set(0, -0.085, -0.205); headGroup.add(stache);
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.05), W.paint(0x101010));
        vest.position.set(0, 0.04, -0.225); torso.add(vest);
      }
      if (this.kind === "weedclerk") {
        const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.225, 8, 6), W.paint(0x5a8a3a));
        beanie.scale.set(1, 0.55, 1); beanie.position.y = 0.12; headGroup.add(beanie);
        for (let i = 0; i < 2; i++) {
          const patch = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.02), W.paint(i ? 0x6a3a8a : 0x3a8a6a));
          patch.position.set(i ? 0.1 : -0.1, 0.05, -0.245); torso.add(patch);
        }
      }
      if (this.kind === "pimp") {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.025, 10), W.paint(0x1a0f24));
        brim.position.y = 0.20; headGroup.add(brim);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.24, 8), W.paint(0x2a1240));
        crown.position.y = 0.30; headGroup.add(crown);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.192, 0.192, 0.04, 8), W.paint(0xffd400));
        band.position.y = 0.225; headGroup.add(band);
        const chain = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.025, 0.02), W.paint(0xffd400));
        chain.position.set(0, 0.13, -0.25); torso.add(chain);
        const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.0, 6), W.paint(0x3a2412));
        cane.position.set(0.46, 0.0, -0.1); cane.rotation.z = 0.1; g.add(cane);
      }
      if (this.kind === "petitioner") {
        const tie = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.3, 0.03), W.paint(0x9a1a2a));
        tie.position.set(0, 0.12, -0.25); torso.add(tie);
        const clip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.27, 0.025), W.paint(0x6a4a2a));
        clip.position.set(0, -0.65, -0.06); this.arms[0].add(clip);
        const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.2), W.paint(0xf0ead8));
        paper.position.set(0, -0.65, -0.075); this.arms[0].add(paper);
      }
      if (this.kind === "influencer") {
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), W.paint(0x222222));
        stick.position.set(0, -0.55, -0.12); stick.rotation.x = 0.4; this.arms[0].add(stick);
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.025), W.paint(0x0a0a10));
        phone.position.set(0, -0.82, -0.2); this.arms[0].add(phone); this.phone = phone;
        const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.04), W.paint(0x111111));
        shades.position.set(0, 1.79, -0.19); g.add(shades);
      }
      if (this.kind === "dj") {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.1, 8), W.paint(0x2a1a3a));
        cap.position.y = 0.24; headGroup.add(cap);
        for (let i = 0; i < 2; i++) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 7), W.paint(0x111111));
          cup.position.set(i ? 0.205 : -0.205, 0.0, 0); cup.rotation.z = Math.PI / 2;
          headGroup.add(cup);
        }
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), W.paint(0x111111));
        band.position.y = 0.17; headGroup.add(band);
        const shades = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.04), W.paint(0x080808));
        shades.position.set(0, 1.79, -0.19); g.add(shades);
      }
      if (this.kind === "colonel") {
        const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.12, 8), W.paint(0xf0ead8));
        hat.position.y = 0.24; headGroup.add(hat);
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.03, 10), W.paint(0xf0ead8));
        brim.position.y = 0.18; headGroup.add(brim);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.04, 8), W.paint(0x8a1a1a));
        band.position.y = 0.21; headGroup.add(band);
        const stache = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.05), W.paint(0xe8e8e8));
        stache.position.set(0, -0.12, -0.19); headGroup.add(stache);
        torso.scale.set(1.12, 1.05, 1.05);
      }
      if (this.kind === "goon") {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 8), W.paint(0x1a1a1a));
        cap.position.y = 0.22; headGroup.add(cap);
        const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.3), W.paint(0x8a1a1a));
        scarf.position.y = 0.28; torso.add(scarf);
      }
      if (this.kind === "redneck") {
        const capMat = W.paint(U.pick([0x2a4a2a, 0x7a2a20, 0x3a3a44]));
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.1, 8), capMat);
        cap.position.y = 0.22; headGroup.add(cap);
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.22), capMat);
        brim.position.set(0, 0.18, -0.22); headGroup.add(brim);
        const mullet = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.1), W.paint(0x3a2a16));
        mullet.position.set(0, -0.06, 0.2); headGroup.add(mullet);
        const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.13, 6), W.paint(0xc8b048));
        can.position.set(0, -0.5, -0.08); can.rotation.x = 0.4; this.arms[0].add(can);
      }
      if (this.kind === "geeker") {
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), W.paint(0x202026));
        hood.scale.set(1, 0.9, 1); hood.position.y = 0.08; headGroup.add(hood);
        const foil = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xbfc4cc, side: THREE.DoubleSide }));
        foil.position.set(0, -0.55, -0.05); foil.rotation.x = 0.4;
        this.arms[0].add(foil);
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 5), W.paint(0xcfcfcf));
        pipe.position.set(0, -0.5, -0.02); pipe.rotation.x = 1.1;
        this.arms[0].add(pipe);
        torso.scale.set(0.92, 0.95, 0.9);
      }
      if (this.kind === "dealer") {
        const coat = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.95, 0.4), W.paint(0x22221a));
        coat.position.set(0, 0.98, 0.02); g.add(coat);
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 9), W.paint(0x141414));
        brim.position.y = 0.2; headGroup.add(brim);
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.18, 8), W.paint(0x141414));
        crown.position.y = 0.3; headGroup.add(crown);
        const shades = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.065, 0.04), W.paint(0x080808));
        shades.position.set(0, 1.79, -0.19); g.add(shades);
      }
      if (this.kind === "cryptobro") {
        const shades = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.04), W.paint(0x111111));
        shades.position.set(0, 1.79, -0.19); g.add(shades);
        const chain = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.025, 0.02), W.paint(0xffd400));
        chain.position.set(0, 1.07, -0.25); g.add(chain);
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.025), W.paint(0x0a0a10));
        phone.position.set(0, -0.66, -0.03); this.arms[0].add(phone); this.phone = phone;
      }
      if (this.kind === "delivery") {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), W.paint(0x9a2a20));
        bag.position.set(0, 1.13, 0.28); g.add(bag);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 8), W.paint(0x24242a));
        cap.position.y = 0.25; headGroup.add(cap);
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.025), W.paint(0x0a0a10));
        phone.position.set(0, -0.66, -0.03); this.arms[0].add(phone); this.phone = phone;
      }
      if (this.kind === "karen" || this.kind === "tweaker" || this.kind === "mallrat") {
        const phone = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.16, 0.025), W.paint(0x0a0a10));
        phone.position.set(0, -0.66, -0.03);
        this.arms[0].add(phone);
        this.phone = phone;
      }
      if (this.kind === "mallrat") {
        for (let i = 0; i < 2; i++) {
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 7), W.paint(0x111111));
          cup.position.set(i ? 0.205 : -0.205, 0.0, 0); cup.rotation.z = Math.PI / 2;
          headGroup.add(cup);
        }
        const band = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.04), W.paint(0x111111));
        band.position.y = 0.17; headGroup.add(band);
      }
      if (this.kind === "tweaker") {
        torso.scale.set(0.84, 0.96, 0.84);
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 6), W.paint(0x2a2a32));
        hood.scale.set(1, 0.8, 1); hood.position.y = 0.06; headGroup.add(hood);
      }
      if (this.kind === "dancer") {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.29, 0.12, 8), W.paint(0xffd400));
        band.position.y = -0.10; torso.add(band);
      }
      if (this.kind === "bum" || this.kind === "oldman") {
        const beard = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.22, 7), W.paint(0xcccccc));
        beard.position.set(0, -0.19, -0.13); beard.rotation.x = Math.PI;
        headGroup.add(beard);
      }

      // blob shadow
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.05, 1.05),
        new THREE.MeshBasicMaterial({ map: getShadowTex(), transparent: true, depthWrite: false, opacity: 0.85 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.02;
      g.add(shadow);
      this.shadow = shadow;
      g.position.set(opts.x, this.floorY, opts.z);
      W.scene.add(g);
      if (this.kind === "dancer") g.rotation.y = Math.PI;
    }

    _buildBody(x, z) {
      const body = new CANNON.Body({
        mass: 68,
        position: new CANNON.Vec3(x, this.floorY + 0.95, z),
        collisionFilterGroup: 4, collisionFilterMask: -1, material: this.game.world.physMat
      });
      body.addShape(new CANNON.Sphere(0.42));
      body.fixedRotation = true;
      body.updateMassProperties();
      body.linearDamping = 0.35;
      body.angularDamping = 1;
      body.allowSleep = false;
      this.game.world.physics.addBody(body);
      this.body = body;
      this.game.npcs.npcByBody[body.id] = this;
    }

    /* ------------- interaction ------------- */
    getPrompt() {
      if (this.buysWeed && this.game.player.weed > 0) return "[E] SELL WEED $" + this.weedPrice;
      switch (this.kind) {
        case "bartender": return "[E] BUY A BEER $4";
        case "clerk": return "[E] BUY CHEAP LIQUOR $3";
        case "dancer": return (this.game.story && this.game.story.stage === 4 && !this.recruited) ? "[E] RECRUIT TO THE STABLE" : "[E] THROW A DOLLAR";
        case "bouncer": return "[E] BRIBE THE BOUNCER $10";
        case "oldman": return "[E] SAY HI";
        case "karen": return "[E] ASK ABOUT HER PODCAST";
        case "wiener": return "[E] BUY A WIENER $5";
        case "chicken": return "[E] BUY A CHICKEN BUCKET $8";
        case "weedclerk": return "[E] BUY WEED $15";
        case "barber": return "[E] GET A HAIRCUT $10";
        case "security": return "[E] TALK TO SECURITY";
        case "mallrat": return "[E] TALK TO THE MALL RAT";
        case "tweaker": return "[E] ASK WHAT HE'S ON";
        case "pimp": return "[E] BUY A COMPLIMENT $20";
        case "petitioner": return "[E] SIGN THE PETITION";
        case "influencer": return "[E] GET A SHOUTOUT $20";
        case "cryptobro": return "[E] TALK SHITCOIN";
        case "delivery": return "[E] TIP THE DRIVER $5";
        case "dealer": return "[E] BUY A BAG $20";
        case "dj": return "[E] TALK TO THE DJ";
        case "partygoer": return (this.game.story && this.game.story.stage === 4 && !this.recruited) ? "[E] RECRUIT TO THE STABLE" : "[E] TAKE A SHOT $5";
        case "geeker": return "[E] CHECK ON THE GEEKER";
        default: return "[E] TALK SHIT";
      }
    }

    interact() {
      const p = this.game.player;
      const s = this.game.story;
      if (s && s.stage === 4 && !this.recruited && (this.kind === "dancer" || this.kind === "partygoer")) {
        if (p.cash < 50) {
          this.game.ticker(this.name + ": 'Fifty dollar signing bonus, baby. I don't work for free.'", "bad");
          return;
        }
        p.cash -= 50;
        this.recruited = true;
        s.hoes = (s.hoes || 0) + 1;
        this.game.addRespect(35, "bribe");
        ST.audio.cash();
        this.game.ui.setObjective("Recruit 3 girls to your stable. (" + s.hoes + "/3) Dancers at Glitter Gulch, party girls in the backyard.");
        this.say(U.pick(["I want 20%.", "I don't do windows.", "You got a car? I'm not walking.", "Finally, a man with a plan and a purple future."]));
        this.game.ticker("RECRUITED: " + this.name + ". The stable grows. (" + s.hoes + "/3)", "gold");
        return;
      }
      if (this.buysWeed && p.weed > 0) {
        p.weed -= 1;
        p.cash += this.weedPrice;
        if (this.game.story) this.game.story.sold = (this.game.story.sold || 0) + 1;
        this.game.addRespect(3, "bribe");
        ST.audio.cash();
        this.game.ticker("Sold a bag for $" + this.weedPrice + ". The economy is healing.", "gold");
        this.say(U.pick(["Good shit.", "Don't tell anyone.", "This better not be oregano.", "See you around, businessman."]));
        const cops = this.game.npcs.all.some((n) => !n.down && n.kind === "cop" && Math.hypot(n.body.position.x - p.body.position.x, n.body.position.z - p.body.position.z) < 22);
        if (cops) {
          this.game.addWanted(0.4);
          this.game.ticker("A cop saw the handoff. Of course he did.", "bad");
        }
        return;
      }
      switch (this.kind) {
        case "wiener":
          if (p.cash < 5) { this.game.ticker("The wiener guy shrugs. No money, no sausage.", "bad"); return; }
          p.cash -= 5;
          p.health = Math.min(p.maxHealth, p.health + 22);
          this.game.addRespect(1, "bribe");
          ST.audio.cash();
          this.game.ticker("You ate a $5 wiener. It tasted like 1997.", "gold");
          this.say("Ein Wiener, bitte. Or whatever.");
          break;
        case "chicken":
          if (p.cash < 8) { this.game.ticker("Pop's says no money, no biscuits.", "bad"); return; }
          p.cash -= 8;
          p.health = Math.min(p.maxHealth, p.health + 35);
          this.game.addRespect(2, "bribe");
          ST.audio.cash();
          this.game.ticker("Eight-piece bucket acquired. Morals: not included.", "gold");
          this.say("Biscuits are extra. Everything is extra.");
          break;
        case "weedclerk":
          if (p.cash < 15) { this.game.ticker("Dave says come back with $15 and a better attitude.", "bad"); return; }
          p.cash -= 15;
          p.weed += 1;
          this.game.addRespect(2, "bribe");
          ST.audio.cash();
          this.game.ticker("Bought weed at 420 DEPOT. The receipt says 'tomatoes'.", "gold");
          this.say(U.pick(["It's medicinal. For the town.", "Don't tell the cop outside. Or do. I don't care.", "That's the good shit. Probably."]));
          if (this.game.dude) this.game.dude("Dave, you're a saint.");
          break;
        case "barber":
          if (p.cash < 10) { this.game.ticker("Sal says $10 or get out of the chair.", "bad"); return; }
          p.cash -= 10;
          p.health = Math.min(p.maxHealth, p.health + 10);
          this.game.addRespect(8, "bribe");
          ST.audio.cash();
          this.game.ticker("Haircut acquired. You look like a guy with a court date.", "gold");
          this.say("I only know one haircut. It's this one.");
          break;
        case "security":
          if (p.wanted > 0) {
            this.say("Sir, I'm going to have to ask you to leave. Then I'm going to call the real cops.");
            this.state = "attack";
          } else {
            this.say(U.pick(["Keep moving, champ.", "The mall is closed. It's been closed since 2004.", "I'm not a real cop. I'm mall security. There's a difference."]));
            this.game.addRespect(1, "bribe");
          }
          break;
        case "mallrat":
          this.say(U.pick(["This mall used to have a Sam Goody. Now it has me.", "I've been here since the food court closed.", "The escalator is haunted. That's not a joke."]));
          this.game.addRespect(1, "bribe");
          break;
        case "tweaker":
          this.say(U.pick([
            "The mall is a government listening device. The pretzels are the antenna.",
            "I saw a guy pee on a cop and the cop turned into a pigeon.",
            "You're not real. You're a texture.",
            "I've been awake since Tuesday. Which Tuesday? That's the question."
          ]));
          this.game.addRespect(2, "bribe");
          if (U.chance(0.4)) this.state = "film";
          break;
        case "geeker":
          this.game.addRespect(1, "bribe");
          this.say(U.pick(["I'm not asleep. I'm just resting my entire life.", "You got a dollar? Or a straw?", "This is my spot. I found it.", "The road is warm. The road is my friend.", "Don't call an ambulance. Call a pizza."]));
          this.game.ticker("You checked on a geeker. He is technically alive.", "gold");
          break;
        case "partygoer":
          if (p.cash < 5) { this.say("No cash? Just dance, king."); p.drunk = U.clamp(p.drunk + 8, 0, 100); break; }
          p.cash -= 5;
          p.drunk = U.clamp(p.drunk + 22, 0, 100);
          this.game.addRespect(2, "drink");
          ST.audio.cash();
          this.game.ticker("+2 RESPECT — you took a shot with a stranger. The party approves.", "gold");
          this.say(U.pick(["WOOO!", "That's the good stuff!", "One more. One more. One more.", "I don't know your name but I love you."]));
          break;
        case "dj":
          if (!this.game.settings.musicOn) { this.say("No music? This is a funeral, not a party."); return; }
          const st = ST.audio.cycleStation();
          this.game.radioManual = 30;
          this.game.addRespect(2, "bribe");
          this.game.ticker("DJ switches to " + ST.jokes.radioNames[st], "gold");
          this.say(U.pick(["This one's for the people still standing.", "Request line is closed. Requests are violence.", "If you don't like it, fight the speaker."]));
          break;
        case "dealer":
          if (p.cash < 20) { this.say("Come back with twenty. Or something shiny."); return; }
          p.cash -= 20;
          const bag = U.pick(["coke", "xans", "kpin", "quaalude", "juice", "weed"]);
          if (bag === "weed") p.weed += 1; else p.drugs[bag] = (p.drugs[bag] || 0) + 1;
          ST.audio.cash();
          this.game.addRespect(2, "bribe");
          this.game.ticker("Bought a mystery bag: " + bag.toUpperCase() + ". Do not ask questions.", "gold");
          this.say(U.pick(["Good stuff. Probably.", "No refunds. No witnesses.", "You didn't get this from me.", "Tell Dave I said hi."]));
          break;
        case "influencer":
          if (p.cash < 20) { this.say("No cash? That's not very main character of you."); return; }
          p.cash -= 20;
          p.addRespect(10, "bribe");
          ST.audio.cash();
          this.game.ticker("+10 CLOUT — you're in the background of a video nobody will watch.", "gold");
          this.say(U.pick(["You're gonna blow up, king.", "Say 'content'. SAY CONTENT.", "This is so real. This is so raw.", "Link in bio."]));
          break;
        case "cryptobro":
          this.game.openPhone("crypto");
          this.say(U.pick(["It's not a scam, it's a community.", "Have you heard of Shitcoin? It's going to the moon.", "I'm not selling. I'm cultivating wealth.", "Diamond hands, champ."]));
          break;
        case "delivery":
          if (p.cash < 5) { this.say("No tip? That's why your food is late."); return; }
          p.cash -= 5;
          p.addRespect(4, "bribe");
          ST.audio.cash();
          this.game.ticker("+4 CLOUT — the driver gave you a five-star feeling.", "gold");
          this.say("Five stars or I cry in the car.");
          break;
        case "petitioner":
          this.game.addRespect(3, "bribe");
          this.game.ticker("You signed a petition to ban video games. The irony is noted.", "gold");
          this.say("Thank you! Together we can make this town slightly worse.");
          if (this.game.dude) this.game.dude("I'm a part of the problem.");
          break;
        case "pimp":
          if (this.game.story) this.game.story.slickMet = true;
          if (p.cash >= 20) {
            p.cash -= 20;
            this.game.addRespect(12, "bribe");
            ST.audio.cash();
            this.game.ticker("+12 RESPECT — Slick says you have 'potential'.", "gold");
            this.say(U.pick(["You got style, champ. Stupid style.", "You're gonna go far. Probably to jail.", "I like your energy. It's illegal energy."]));
          } else {
            this.say("Come back when you got twenty. Or don't. I got business.");
          }
          break;
        case "bartender":
          if (p.cash < 4) { this.game.ticker("The bartender points at the 'NO CREDIT' sign.", "bad"); return; }
          p.cash -= 4; p.beer += 1; p.bladder = U.clamp(p.bladder + 14, 0, 100);
          ST.audio.cash();
          this.game.ticker("One cold beer. Your liver files a complaint.", "gold");
          this.say("Coming right up, champ.");
          break;
        case "clerk":
          if (p.cash < 3) { this.game.ticker("The clerk points at your empty wallet and laughs.", "bad"); return; }
          p.cash -= 3; p.beer += 1; p.bladder = U.clamp(p.bladder + 10, 0, 100);
          ST.audio.cash();
          this.game.ticker("Bought liquor. The label says 'probably whiskey'.", "gold");
          break;
        case "dancer": {
          if (p.cash < 1) { this.game.ticker("You can't afford a dollar. Sit down.", "bad"); return; }
          p.cash -= 1;
          p.addRespect(3, "strip");
          const bill = this.game.world.spawnCash(this.body.position.x + U.rand(-0.4, 0.4), this.body.position.z + U.rand(-0.4, 0.4), 1);
          ST.audio.cash();
          this.say(U.pick(ST.jokes.stripLines));
          this.game.ticker("+3 RESPECT — generous, in a sad way.", "gold");
          break;
        }
        case "bouncer":
          if (p.cash < 10) { this.game.ticker("The bouncer looks at your wallet. Then at you. Then laughs.", "bad"); return; }
          p.cash -= 10; p.addRespect(8, "bribe");
          p.wanted = Math.max(0, p.wanted - 1);
          ST.audio.cash();
          this.game.ticker("+8 RESPECT — the bouncer suddenly likes you.", "gold");
          this.say("You're alright, champ. For now.");
          break;
        case "oldman":
          this.say(U.pick(["I fought in a war you wouldn't believe. It was a bar fight.", "Used to be a nice town. Then the 80s happened.", "You kids and your throwing."]));
          p.addRespect(2, "bribe");
          break;
        case "karen":
          this.say("I've documented all of this! ALL OF IT!");
          p.addRespect(1, "punch");
          break;
        default:
          ST.audio.grumble();
          this.game.say("SHITASS: " + U.pick([
            "Say that again. I dare you.", "You got five dollars? No? Then move.",
            "I run this block. Allegedly.", "I'm not broke, I'm between scams.",
            "Talk to me nice or don't talk to me.", "You look like a future customer."
          ]));
          this.say(U.pick(ST.jokes.evil && U.chance(0.45) ? ST.jokes.evil : (ST.jokes.barks[this.kind] || ST.jokes.barks.ped)));
          p.addRespect(1, "punch");
          break;
      }
    }

    /* ------------- brain ------------- */
    update(dt) {
      if (this.down) { this._updateDown(dt); return; }
      if (this.knocked) { this._updateKnocked(dt); return; }
      // never let a standing body tunnel under a floor
      if (this.body.position.y < this.floorY + 0.25) {
        this.body.position.y = this.floorY + 0.95;
        if (this.body.velocity.y < 0) this.body.velocity.y = 0;
      }
      if (this.state === "nod") { this._nod(dt); return; }
      const p = this.game.player;
      const px = p.body.position.x, pz = p.body.position.z;
      const dx = px - this.body.position.x, dz = pz - this.body.position.z;
      const pdist = Math.hypot(dx, dz);
      this.barkCooldown -= dt;
      this.attackTimer -= dt;
      this._sayCd = Math.max(0, this._sayCd - dt);
      if (this.talkT > 0) {
        this.talkT -= dt;
        if (this.mouth) this.mouth.scale.y = 1 + Math.abs(Math.sin(this.animT * 18)) * 0.8;
      } else if (this.mouth) {
        this.mouth.scale.y += (1 - this.mouth.scale.y) * 0.2;
      }
      this.animT += dt * Math.max(1, Math.hypot(this.body.velocity.x, this.body.velocity.z) * 1.8);

      // eye reactions: wide when hurt, tiny pupils when terrified
      this.eyePop = Math.max(0, this.eyePop - dt * 1.7);
      if (this.eyeWhites) {
        const basePop = (this.kind === "tweaker" || this.kind === "geeker") ? 0.55 : 0;
        const es = 1 + Math.max(this.eyePop, basePop) * 1.3;
        for (let i = 0; i < this.eyeWhites.length; i++) {
          this.eyeWhites[i].scale.set(es, es * 1.05, 0.5);
          this.pupils[i].scale.setScalar(Math.max(0.55, 1 - this.eyePop * 0.35));
          this.pupils[i].position.x = this.pupils[i].userData.baseX + Math.sin(this.animT * 32 + i) * 0.008 * this.eyePop;
        }
      }

      // on fire = problem
      if (this.burning > 0) {
        this.burning -= dt;
        this.health -= dt * 7;
        this.state = "flee";
        if (Math.random() < dt * 8) {
          this.game.world.burst(new THREE.Vector3(this.body.position.x, 1.1, this.body.position.z), 0xff7a1f, 2, 1.5, 0.5, 0.06);
        }
        if (this.burning <= 0) ST.audio.splash();
        if (this.health <= 0) {
          this.goDown(this.body.position, 1.2);
          this.game.world.gib(new THREE.Vector3(this.body.position.x, 0.8, this.body.position.z), 0x3a2a20);
          return;
        }
      }
      this.vomitCd -= dt;
      if (this.kind === "drunk" && this.vomitCd <= 0) {
        this.vomit();
        this.vomitCd = U.rand(14, 32);
      }
      // tweakers are not okay
      if (this.kind === "tweaker" && this.head) {
        this.head.rotation.z = Math.sin(this.animT * 11) * 0.14;
        this.arms[1].rotation.z = -0.4 + Math.sin(this.animT * 17) * 0.3;
      }

      // face movement / player
      let faceX = this.body.velocity.x, faceZ = this.body.velocity.z;
      if (pdist < 4.5 && this.state !== "dance" && this.kind !== "cop") { faceX = dx; faceZ = dz; }
      if (this.kind === "cop" && pdist < 12) { faceX = dx; faceZ = dz; }
      if (Math.abs(faceX) + Math.abs(faceZ) > 0.15) {
        this.group.rotation.y = Math.atan2(faceX, faceZ) + Math.PI;
      }

      // behavior
      switch (this.state) {
        case "idle": {
          this._idle(dt);
          break;
        }
        case "dance": {
          const t = this.animT;
          this.group.rotation.y = Math.PI + Math.sin(t * 1.7) * 0.45;
          this.arms[0].rotation.z = 2.4 + Math.sin(t * 4) * 0.3;
          this.arms[1].rotation.z = -2.4 - Math.sin(t * 4.3) * 0.3;
          this.legs[0].rotation.z = Math.sin(t * 3) * 0.18;
          this.legs[1].rotation.z = -Math.sin(t * 3) * 0.18;
          this.group.position.y = this.floorY + Math.abs(Math.sin(t * 3)) * 0.08;
          break;
        }
        case "film": {
          if (pdist < 22) {
            this.callTimer -= dt;
            this.arms[0].rotation.x = -2.2;
            this.head.rotation.x = -0.2;
            if (this.barkCooldown <= 0) { this.say(U.pick(ST.jokes.barks.karen)); this.barkCooldown = U.rand(3, 6); }
            if (this.callTimer <= 0) {
              this.callTimer = 999;
              this.game.reportCrime(this);
            }
          } else this.state = "wander";
          break;
        }
        case "flee": {
          const away = new THREE.Vector3(-dx, 0, -dz);
          if (away.lengthSq() < 0.01) away.set(1, 0, 0);
          away.normalize();
          this._move(away.x * this.speed * 1.4, away.z * this.speed * 1.4);
          if (this.barkCooldown <= 0) {
            this.say(U.pick(ST.jokes.evil && U.chance(0.28) ? ST.jokes.evil : (ST.jokes.barks[this.kind] || ST.jokes.barks.ped)));
            this.barkCooldown = U.rand(3, 7);
          }
          if (pdist > 26) this.state = "wander";
          break;
        }
        case "attack": {
          this._attackPlayer(dt, pdist);
          break;
        }
        case "wander":
        default: {
          if (this.kind === "cop" && p.wanted > 0) {
            this.state = "attack";
            break;
          }
          if (this.kind === "security" && p.wanted >= 2) {
            this.state = "attack";
            break;
          }
          this._wander(dt);
          if (pdist < 4 && this.barkCooldown <= 0 && U.chance(0.35)) {
            this.say(U.pick(ST.jokes.evil && U.chance(0.28) ? ST.jokes.evil : (ST.jokes.barks[this.kind] || ST.jokes.barks.ped)));
            this.barkCooldown = U.rand(9, 18);
          }
          break;
        }
      }

      // walk / run animation: legs, knee bend, arm swing, forward lean
      if (this.state !== "dance" && this.state !== "idle") {
        const sp = Math.hypot(this.body.velocity.x, this.body.velocity.z);
        const running = sp > 3.4;
        const rate = running ? 8.5 : 5.2;
        const swing = Math.sin(this.animT * rate) * Math.min(running ? 0.85 : 0.55, sp * 0.2);
        this.legs[0].rotation.x = swing;
        this.legs[1].rotation.x = -swing;
        if (this.shins) {
          this.shins[0].rotation.x = Math.max(0, -swing) * 0.8;
          this.shins[1].rotation.x = Math.max(0, swing) * 0.8;
        }
        if (this.state !== "film") {
          this.arms[0].rotation.x = -swing * 0.95;
          this.arms[1].rotation.x = swing * 0.95;
          if (this.forearms) {
            this.forearms[0].rotation.x = -0.35 - Math.max(0, swing) * 0.55;
            this.forearms[1].rotation.x = -0.35 - Math.max(0, -swing) * 0.55;
          }
        }
        if (this.torso) this.torso.rotation.x = -Math.min(0.22, sp * 0.028);
        if (this.head) this.head.rotation.x = Math.min(0.12, sp * 0.012);
        if (this.state === "attack") {
          this.arms[0].rotation.x = -1.3 + Math.sin(this.animT * 9) * 0.75;
          this.forearms[0].rotation.x = -1.1;
        }
      } else {
        this.legs[0].rotation.x *= 0.85; this.legs[1].rotation.x *= 0.85;
        if (this.torso) this.torso.rotation.x *= 0.85;
      }
      if (this.kind === "tweaker" || this.kind === "geeker") {
        this.head.rotation.z = Math.sin(this.animT * 23) * 0.14;
        this.head.rotation.x = Math.sin(this.animT * 17) * 0.08;
        this.arms[1].rotation.z = -0.5 + Math.sin(this.animT * 21) * 0.25;
      }

      // stagger, drunk wobble
      if (this.staggerT > 0) {
        this.staggerT -= dt;
        const lean = Math.sin(Math.max(0, this.staggerT) / 0.65 * Math.PI) * 0.17 * this.staggerSide;
        this.group.rotation.z = lean;
        this.head.rotation.x = -lean * 1.8;
        this.arms[0].rotation.x = -0.9 * Math.max(0, this.staggerT);
        this.arms[1].rotation.x = -0.5 * Math.max(0, this.staggerT);
      } else if (this.kind === "drunk") {
        this.group.rotation.z = Math.sin(this.animT * 1.6) * 0.09;
        this.group.position.y = this.floorY + Math.sin(this.animT * 2) * 0.03;
      } else if (this.state !== "dance") {
        this.group.rotation.z *= 0.9;
        this.head.rotation.x *= 0.85;
      }

      if (this.coughT > 0) {
        this.coughT -= dt;
        this.coughSfxT -= dt;
        const c = Math.sin(this.animT * 17);
        this.head.rotation.x = 0.38 + c * 0.14;
        this.head.rotation.z = c * 0.08;
        this.arms[0].rotation.x = -1.35 + c * 0.16;
        this.arms[0].rotation.z = 0.35;
        if (this.torso) this.torso.rotation.x = 0.16 + c * 0.04;
        if (this.coughSfxT <= 0) {
          this.coughSfxT = U.rand(0.55, 0.9);
          ST.audio.cough();
        }
      }
      if (this.tweakOut > 0) {
        this.tweakOut -= dt;
        this.eyePop = Math.max(this.eyePop, 1.8);
        this.head.rotation.z = Math.sin(this.animT * 26) * 0.22;
        this.head.rotation.x = Math.sin(this.animT * 19) * 0.16;
        if (this.arms[1]) this.arms[1].rotation.z = -0.6 + Math.sin(this.animT * 24) * 0.35;
      }

      // sync visual, clamped so boots never sink through the pavement
      this.group.position.x = this.body.position.x;
      this.group.position.z = this.body.position.z;
      const ty = this.body.position.y - 0.95;
      if (!isFinite(this.group.position.y)) this.group.position.y = this.floorY;
      this.group.position.y += (ty - this.group.position.y) * 0.3;
      this.group.position.y = Math.max(this.floorY - 0.01, this.group.position.y);
    }

    _placeRagdoll() {
      const q = this.body.quaternion;
      const off = new THREE.Vector3(0, 0.95, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w));
      const headY = new THREE.Vector3(0, 1.95, 0).applyQuaternion(new THREE.Quaternion(q.x, q.y, q.z, q.w)).y;
      let gy = this.body.position.y - off.y;
      const lowest = Math.min(0, headY);
      if (gy + lowest < this.floorY) gy = this.floorY - lowest;
      this.group.position.set(this.body.position.x - off.x, gy, this.body.position.z - off.z);
      this.group.quaternion.set(q.x, q.y, q.z, q.w);
    }

    _idle(dt) {
      this.body.velocity.x *= 0.8;
      this.body.velocity.z *= 0.8;
      if (this.kind === "bartender" || this.kind === "clerk") {
        this.arms[0].rotation.x = -0.5 + Math.sin(this.animT) * 0.08;
        this.arms[1].rotation.x = -0.45;
      }
    }

    _wander(dt) {
      this.pauseTimer -= dt;
      const d = Math.hypot(this.target.x - this.body.position.x, this.target.z - this.body.position.z);
      if (d < 1.4 || this.pauseTimer < -6) {
        if (this.pauseTimer > 0) { this.body.velocity.x *= 0.8; this.body.velocity.z *= 0.8; return; }
        this._pickTarget();
        this.pauseTimer = U.rand(1.2, 4);
      }
      const dx = this.target.x - this.body.position.x;
      const dz = this.target.z - this.body.position.z;
      const len = Math.hypot(dx, dz) || 1;
      const sp = this.kind === "drunk" ? this.speed * (0.7 + Math.sin(this.animT * 0.9) * 0.25) : this.speed;
      this._move((dx / len) * sp, (dz / len) * sp);
      if (this.pauseTimer > 0) { this.body.velocity.x *= 0.2; this.body.velocity.z *= 0.2; }
      // stuck handling
      if (Math.hypot(this.body.velocity.x, this.body.velocity.z) < 0.25 && this.pauseTimer <= 0) {
        this.blockedTimer += dt;
        if (this.blockedTimer > 1.2) { this._pickTarget(); this.blockedTimer = 0; }
      } else this.blockedTimer = 0;
      if (Math.abs(this.body.position.x) > 46 || Math.abs(this.body.position.z) > 46) this._pickTarget();
    }

    _pickTarget() {
      const pts = this.game.world.streetPoints;
      const p = U.pick(pts);
      this.target.set(p[0], 0, p[1]);
    }

    _move(vx, vz) {
      this.body.velocity.x += (vx - this.body.velocity.x) * 0.12;
      this.body.velocity.z += (vz - this.body.velocity.z) * 0.12;
    }

    _attackPlayer(dt, pdist) {
      const p = this.game.player;
      if (p.wanted <= 0 && this.kind === "cop") { this.state = "wander"; return; }
      const dx = p.body.position.x - this.body.position.x;
      const dz = p.body.position.z - this.body.position.z;
      const len = Math.hypot(dx, dz) || 1;
      if (this.kind === "cop" && p.wanted >= 3 && pdist > 3.5 && pdist < 18) {
        // gun cop: hold position, shoot
        this._move((dx / len) * 0.6, (dz / len) * 0.6);
        if (this.attackTimer <= 0) {
          this.attackTimer = U.rand(1.1, 2.1);
          this._shoot(p, pdist);
        }
      } else {
        if (pdist > 1.8) this._move((dx / len) * this.speed, (dz / len) * this.speed);
        else {
          this.body.velocity.x *= 0.5; this.body.velocity.z *= 0.5;
          if (this.attackTimer <= 0) {
            this.attackTimer = this.kind === "bouncer" ? 1.0 : 1.3;
            const dmg = this.kind === "bouncer" ? 12 : this.kind === "cop" ? 9 : 4;
            p.damage(dmg, this.kind === "cop" ? "baton" : "fist");
            ST.audio.punch(false);
            if (this.barkCooldown <= 0) {
              this.say(U.pick(this.kind === "cop" ? ST.jokes.barks.cop : (this.kind === "bouncer" ? ST.jokes.barks.bouncer : ST.jokes.barks.ped)));
              this.barkCooldown = U.rand(5, 10);
            }
          }
        }
      }
      if (pdist > 45 && !this.angry) this.state = "wander";
    }

    _shoot(p, pdist) {
      ST.audio.gunshot();
      const spread = U.rand(-0.9, 0.9) * (pdist / 18);
      const hit = Math.random() > 0.28 + pdist * 0.015;
      const from = new THREE.Vector3(this.body.position.x, 1.5, this.body.position.z);
      const to = new THREE.Vector3(p.body.position.x + spread, 1.35, p.body.position.z + spread);
      this.game.spawnTracer(from, to);
      if (hit) p.damage(9, "gun");
      this.game.say(U.pick(["FREEZE!", "GET ON THE GROUND!", "STOP RIGHT THERE!", "YOU'RE MAKING THIS WORSE!"]));
    }

    ignite() {
      if (this.burning > 0) return;
      this.burning = 4.5;
      this.state = "flee";
      if (this.barkCooldown <= 0) {
        this.say(U.pick(["I'M ON FIRE!", "WHY AM I ON FIRE?", "THIS IS NOT COVERED BY INSURANCE!"]));
        this.barkCooldown = 4;
      }
    }
    extinguish() {
      if (this.burning > 0) {
        this.burning = 0;
        this.game.world.burst(new THREE.Vector3(this.body.position.x, 1.2, this.body.position.z), 0xbfd8d8, 10, 1.4, 0.9, 0.1);
        ST.audio.splash();
        this.say("Thank you. I hate you. Thank you.");
      }
    }
    vomit() {
      if (this.down || this.burning > 0) return;
      ST.audio.vomit();
      const pos = new THREE.Vector3(this.body.position.x, 1.0, this.body.position.z);
      this.game.world.burst(pos, 0x9aa83a, 16, 1.7, 1.0, 0.08);
      this.game.world.addDecal(U.texVomit(), this.body.position.x, this.body.position.z, 1.3, Math.random() * 6.28, 30, 0.9);
      this.game.addRespect(2, "pee");
      this.state = "flee";
      this.say(U.pick(["BLARGH—", "I'm gonna be sick.", "That's it. I'm done.", "I can taste my childhood."]));
      if (this.kind === "cop" || this.kind === "security" || this.kind === "bouncer") this.state = "attack";
    }

    /* ------------- damage ------------- */
    damage(dmg, fromPos, source) {
      if (this.down) return;
      if (this.knocked) {
        this.health -= dmg;
        this.eyePop = 2;
        this.game.world.addBlood(new THREE.Vector3(this.body.position.x, 0, this.body.position.z), U.rand(0.5, 1.0));
        if (this.health <= 0) { this.knocked = false; this.goDown(fromPos, 1.2); }
        return;
      }
      this.health -= dmg;
      this.eyePop = 1;
      if (this.health > 0 && dmg >= 22) {
        this.knockdown(fromPos, 1 + dmg / 45);
        return;
      }
      if (this.health > 0 && dmg >= 12) {
        this.staggerT = 0.65;
        this.staggerSide *= -1;
        ST.audio.pain();
      }
      if (source === "fire" && U.chance(0.4)) this.ignite();
      if (source !== "fire" && U.chance(0.35)) {
        this.game.world.floatText(
          new THREE.Vector3(this.body.position.x, 1.2, this.body.position.z),
          U.pick(["OW!", "MY NECK!", "OOF", "NOT THE FACE!", "BRO!", "WHY?!", "I'M TELLING!", "AAAARGH"]),
          "#ffd400"
        );
      }
      const dir = new THREE.Vector3(
        this.body.position.x - fromPos.x, 0, this.body.position.z - fromPos.z
      ).normalize();
      this.body.velocity.x += dir.x * 2.4;
      this.body.velocity.z += dir.z * 2.4;
      this.game.world.addBlood(new THREE.Vector3(this.body.position.x, 0, this.body.position.z), U.rand(0.8, 1.5));
      this.game.world.burst(new THREE.Vector3(this.body.position.x, 1.3, this.body.position.z), 0xa00a12, 5, 2, 0.5, 0.06);
      this.state = "flee";
      if (this.kind === "cop" || this.kind === "bouncer") this.state = "attack";
      if (this.health <= 0) this.goDown(fromPos, 1 + dmg / 40);
      else if (this.barkCooldown <= 0) {
        this.say(U.pick(["OW! MY SPINE!", "WHAT IS WRONG WITH YOU?!", "I'M CALLING MY LAWYER!", "NOT THE FACE!"]));
        this.barkCooldown = 3;
      }
    }

    hitByExplosion(pos, power) {
      const dir = new THREE.Vector3(this.body.position.x - pos.x, 0, this.body.position.z - pos.z).normalize();
      this.body.velocity.x += dir.x * 8 * power;
      this.body.velocity.z += dir.z * 8 * power;
      this.body.velocity.y += 4 * power;
      this.damage(70 * power, pos, "explosion");
    }

    goDown(fromPos, force) {
      if (this.down) return;
      this.down = true;
      this.state = "down";
      this.corpseTimer = 55;
      this.ragdollT = 0;
      this.ragdollBounced = false;
      this.ragdollSplat = false;
      this.knocked = false;
      this.getUpT = 0;
      this.angry = false;
      this.nodT = U.rand(2, 6);
      this.nodDown = true;
      this.coughT = 0;
      this.coughSfxT = 0;
      this.tweakOut = 0;
      this.forearms = [];
      this.shins = [];
      if (U.chance(0.5)) ST.audio.wilhelm(); else ST.audio.scream();
      this.say(this.name + ": " + U.pick(["AAAH!", "MY LEG!", "TELL MY WIFE I LOVED THE MALL!", "I'M OKAY!", "THIS IS FINE!", "NOT LIKE THIS!"]));
      if (U.chance(0.7)) setTimeout(() => ST.audio.boing(), 170);
      const pos = this.body.position.clone();
      const dir = new THREE.Vector3(pos.x - fromPos.x, 0, pos.z - fromPos.z);
      if (dir.lengthSq() < 0.01) dir.set(U.rand(-1, 1), 0, U.rand(-1, 1));
      dir.normalize();
      // remove standing body
      this.game.world.physics.removeBody(this.body);
      delete this.game.npcs.npcByBody[this.body.id];
      // ragdoll body
      const rb = new CANNON.Body({ mass: 58, position: new CANNON.Vec3(pos.x, Math.max(0.9, pos.y), pos.z), material: this.game.world.physMat });
      rb.addShape(new CANNON.Box(new CANNON.Vec3(0.36, 0.75, 0.26)));
      rb.linearDamping = 0.18;
      rb.angularDamping = 0.35;
      this.game.world.physics.addBody(rb);
      this.body = rb;
      this.game.npcs.npcByBody[rb.id] = this;
      rb.velocity.set(dir.x * 4 * force, 3.2 + force * 1.2, dir.z * 4 * force);
      rb.angularVelocity.set(U.rand(-6, 6), U.rand(-3, 3), U.rand(-6, 6));
      this.shadow.visible = false;
      this.head.rotation.z = U.rand(-0.5, 0.5);
      this.arms[0].rotation.x = -2.4; this.arms[1].rotation.x = -2.2;
      this.legs[0].rotation.x = 0.4; this.legs[1].rotation.x = -0.3;
      this.arms[0].rotation.z = 0.6; this.arms[1].rotation.z = -0.6;
      this.eyeWhites.forEach((e) => (e.visible = false));
      this.pupils.forEach((p) => (p.visible = false));
      this.xEyes.forEach((e) => (e.visible = true));
      if (this.tongue) this.tongue.visible = true;
      if (this.mouth) this.mouth.visible = false;
      // no kill slow-motion: momentum stays with the player
      this.game.world.floatText(
        new THREE.Vector3(pos.x, 1.2, pos.z),
        U.pick(["KO!", "RAGDOLL!", "OOF", "SLEEPY TIME", "BONK"]),
        "#ff5d5d"
      );
      // ---- GORE: every death is a mess ----
      const gorePos = new THREE.Vector3(pos.x, 0.85, pos.z);
      this.game.world.gib(gorePos, 0x7a0a12);
      ST.audio.thunk();
      if (ST.audio.squelch) ST.audio.squelch();
      this.game.world.addBlood(new THREE.Vector3(pos.x, 0, pos.z), U.rand(3.4, 5.2));
      this.game.ui.goreFlash();
      // always dismember: flesh chunks, bone, limbs
      this.game.world.bodyParts(new THREE.Vector3(pos.x, 0.95, pos.z), this.skinColor, true);
      // hide the intact ragdoll pieces that "came off"
      this.head.visible = false;
      this.arms[force > 1.4 ? 0 : 1].visible = false;
      if (force > 1.2) this.legs[U.chance(0.5) ? 0 : 1].visible = false;
      this.game.world.burst(gorePos, 0x5a0008, 26, 6.5, 1.4, 0.11);
      this.game.world.burst(gorePos, 0x9a0a14, 20, 4.5, 1.0, 0.07);
      [0.12, 0.3, 0.55].forEach((delay) => {
        setTimeout(() => {
          const p2 = this.body ? this.body.position : pos;
          this.game.world.addBlood(new THREE.Vector3(p2.x, 0, p2.z), U.rand(0.8, 1.6));
        }, delay * 1000);
      });
      this.game.world.floatText(new THREE.Vector3(pos.x, 1.45, pos.z),
        U.pick(["HEADSHOT", "DISGUSTING", "RED MIST", "LIMBS!", "OH MY GOD"]), "#ff3b30");
      this.game.shake(0.55);
      // rewards
      const g = this.game;
      g.stats.ko = (g.stats.ko || 0) + 1;
      if (g.registerKill) g.registerKill(this);
      if (this.kind === "bouncer" && g.story) g.story.bouncerDown = true;
      if (this.kind === "colonel" && g.story) g.story.colonelDown = true;
      if (this.kind === "colonel") {
        g.world.explode(new THREE.Vector3(pos.x, 0.6, pos.z), 5, 0.8);
        g.addRespect(400, "bribe");
        g.ticker("THE COLONEL IS DOWN. SHITTOWN IS YOURS.", "gold");
        g.shake(1.2);
        setTimeout(() => ST.audio.boing(), 300);
      }
      if (this.kind === "pimp" && g.story) g.story.slickDown = true;
      if (this.kind === "cop" || this.kind === "security") {
        if (U.chance(0.55)) g.world.spawnWeaponPickup(pos.x + U.rand(-1, 1), pos.z + U.rand(-1, 1), "pistol", 6);
      }
      if (this.kind === "cop") {
        g.addRespect(45, "copko", this.name);
        g.addWanted(2);
      } else if (this.kind === "bouncer") {
        g.addRespect(60, "ko", this.name);
      } else {
        g.addRespect(25, "ko", this.name);
      }
      g.world.spawnCash(pos.x, pos.z, U.randInt(5, 22));
      // reaction of witnesses
      g.npcs.witnessCrime(pos);
    }

    knockdown(fromPos, force) {
      if (this.down || this.knocked) return;
      const pos = this.body.position.clone();
      let dir = new THREE.Vector3(pos.x - fromPos.x, 0, pos.z - fromPos.z);
      if (dir.lengthSq() < 0.01) dir.set(U.rand(-1, 1), 0, U.rand(-1, 1));
      dir.normalize();
      this.knocked = true;
      this.angry = true;
      this.getUpT = 2.1 + U.rand(0, 1.0);
      this.ragdollT = 0;
      this.ragdollBounced = false;
      this.ragdollSplat = false;
      this.eyePop = 2.4;
      this.state = "knocked";
      this.game.world.physics.removeBody(this.body);
      delete this.game.npcs.npcByBody[this.body.id];
      const rb = new CANNON.Body({ mass: 58, position: new CANNON.Vec3(pos.x, Math.max(0.9, pos.y), pos.z), material: this.game.world.physMat });
      rb.addShape(new CANNON.Box(new CANNON.Vec3(0.36, 0.75, 0.26)));
      rb.linearDamping = 0.18;
      rb.angularDamping = 0.3;
      this.game.world.physics.addBody(rb);
      this.body = rb;
      this.game.npcs.npcByBody[rb.id] = this;
      rb.velocity.set(dir.x * 6 * force, 3.2 + force * 2.2, dir.z * 6 * force);
      rb.angularVelocity.set(U.rand(-8, 8), U.rand(-5, 5), U.rand(-8, 8));
      this.shadow.visible = false;
      this.arms[0].rotation.x = -2.2; this.arms[1].rotation.x = -2.0;
      this.legs[0].rotation.x = 0.5; this.legs[1].rotation.x = -0.4;
      this.head.rotation.z = U.rand(-0.4, 0.4);
      if (this.tongue) this.tongue.visible = false;
      ST.audio.pain();
      ST.audio.bonk();
      if (U.chance(0.5)) ST.audio.scream();
      if (U.chance(0.6)) setTimeout(() => ST.audio.boing(), 180);
      this.game.world.floatText(new THREE.Vector3(pos.x, 1.3, pos.z), U.pick(["OOF", "AGH", "MY BACK", "WIPEOUT"]), "#ffd400");
      this.game.shake(0.45);
      this.game.world.addBlood(new THREE.Vector3(pos.x, 0, pos.z), 1.2);
      this.say(U.pick(["YOU THINK THAT HURTS?", "I'LL BE RIGHT BACK.", "I'M GONNA KILL YOU!", "AGAIN!"]));
    }

    _updateKnocked(dt) {
      this.getUpT -= dt;
      this.ragdollT += dt;
      this._placeRagdoll();
      this.animT += dt;
      const t = this.animT;
      this.arms[0].rotation.x = -1.8 + Math.sin(t * 7) * 0.9;
      this.arms[1].rotation.x = -1.6 + Math.sin(t * 6 + 1) * 0.9;
      this.legs[0].rotation.x = 0.4 + Math.sin(t * 6.5) * 0.7;
      this.legs[1].rotation.x = -0.3 + Math.sin(t * 5.5 + 2) * 0.7;
      this.head.rotation.z = Math.sin(t * 3) * 0.3;
      if (this.eyeWhites) {
        this.eyeWhites.forEach((e, i) => {
          e.visible = true;
          e.scale.set(2.1, 2.1, 0.5);
          this.pupils[i].visible = true;
          this.pupils[i].scale.setScalar(0.55);
          this.pupils[i].position.x = this.pupils[i].userData.baseX + Math.sin(t * 28 + i) * 0.02;
        });
      }
      if (!this.ragdollBounced && this.ragdollT > 0.22 && this.body.position.y < 0.95) {
        this.ragdollBounced = true;
        this.body.velocity.y = 2.2;
        ST.audio.boing();
      }
      if (!this.ragdollSplat && this.ragdollT > 0.2 && this.body.position.y < 0.95) {
        this.ragdollSplat = true;
        this.game.world.addBlood(new THREE.Vector3(this.body.position.x, 0, this.body.position.z), 1.4);
        this.game.world.floatText(new THREE.Vector3(this.body.position.x, 0.7, this.body.position.z), U.pick(["SPLAT", "OOF", "BONK"]), "#ff5d5d");
      }
      if (this.getUpT <= 0) this._standUp();
    }

    _standUp() {
      if (this.down) return;
      const pos = this.body.position;
      this.game.world.physics.removeBody(this.body);
      delete this.game.npcs.npcByBody[this.body.id];
      const body = new CANNON.Body({
        mass: 68, position: new CANNON.Vec3(pos.x, this.floorY + 0.95, pos.z),
        collisionFilterGroup: 4, collisionFilterMask: -1, material: this.game.world.physMat
      });
      body.addShape(new CANNON.Sphere(0.42));
      body.fixedRotation = true;
      body.updateMassProperties();
      body.linearDamping = 0.35;
      body.angularDamping = 1;
      body.allowSleep = false;
      this.game.world.physics.addBody(body);
      this.body = body;
      this.game.npcs.npcByBody[body.id] = this;
      this.knocked = false;
      this.getUpT = 0;
      this.shadow.visible = true;
      this.group.quaternion.set(0, 0, 0, 1);
      this.group.rotation.z = 0;
      this.group.scale.set(1, 1, 1);
      this.legs[0].rotation.x = 0; this.legs[1].rotation.x = 0;
      this.arms[0].rotation.x = 0; this.arms[1].rotation.x = 0;
      this.arms[0].rotation.z = 0.1; this.arms[1].rotation.z = -0.1;
      this.head.rotation.x = 0; this.head.rotation.z = 0;
      if (this.torso) this.torso.rotation.x = 0;
      this.eyePop = 0;
      this.eyeWhites.forEach((e) => { e.visible = true; e.scale.set(1, 1.05, 0.5); });
      this.pupils.forEach((p) => { p.visible = true; p.scale.setScalar(1); });
      if (this.tongue) this.tongue.visible = false;
      if (this.mouth) this.mouth.visible = true;
      this.state = "attack";
      this.angry = true;
      this.speed = this.baseSpeed * 1.2;
      this.health = Math.max(1, this.health);
      this.say(U.pick(["I'M GONNA KILL YOU!", "YOU'RE DEAD!", "THAT ALL YOU GOT?", "MY TURN!"]));
      this.game.shake(0.2);
    }

    _nod(dt) {
      this.nodT -= dt;
      this.barkCooldown -= dt;
      this.body.velocity.x *= 0.7;
      this.body.velocity.z *= 0.7;
      const p = this.game.player;
      const dist = Math.hypot(p.body.position.x - this.body.position.x, p.body.position.z - this.body.position.z);
      if (this.nodDown) {
        this.head.rotation.x = 1.05;
        this.head.rotation.z = Math.sin(this.animT * 1.2) * 0.12;
        if (this.torso) this.torso.rotation.x = 0.3;
        this.arms[0].rotation.x = -0.1; this.arms[1].rotation.x = -0.1;
        this.eyePop = 0.35;
        if (this.nodT <= 0) {
          this.nodDown = false;
          this.nodT = 0.5;
          this.eyePop = 2.2;
          if (U.chance(0.7)) this.say(U.pick(["I'M AWAKE!", "WHAT YEAR IS IT?", "DON'T TOUCH MY FOIL.", "I'M FINE!", "WHO SAID THAT?"]));
        }
      } else {
        this.head.rotation.x = 0.2;
        if (this.torso) this.torso.rotation.x = 0.1;
        this.eyePop = 1.8;
        if (this.nodT <= 0) {
          this.nodDown = true;
          this.nodT = U.rand(3, 7);
        }
      }
      if (this.eyeWhites) {
        const es = 1 + this.eyePop * 1.5;
        this.eyeWhites.forEach((e, i) => {
          e.scale.set(es, es * 1.05, 0.5);
          this.pupils[i].position.x = this.pupils[i].userData.baseX + Math.sin(this.animT * 21 + i) * 0.02;
          this.pupils[i].scale.setScalar(U.chance(0.2) ? 0.4 : 1);
        });
      }
      if (dist < 3 && this.barkCooldown <= 0) {
        this.barkCooldown = U.rand(6, 12);
        this.say(U.pick(["You got a dollar?", "I'm just resting my eyes.", "This is my spot.", "I saw God. He was a pigeon.", "Don't step on my foil."]));
      }
      if (dist < 2.2) this.body.velocity.z += 0.3;
    }

    _updateDown(dt) {
      this.corpseTimer -= dt;
      this.ragdollT += dt;
      this._placeRagdoll();
      this.animT += dt;
      const t = this.animT;
      if (!this.ragdollBounced && this.ragdollT > 0.22 && this.body.position.y < 0.95) {
        this.ragdollBounced = true;
        this.body.velocity.y = 2.4;
        this.body.velocity.x += U.rand(-1.5, 1.5);
        this.body.velocity.z += U.rand(-1.5, 1.5);
        this.body.angularVelocity.x += U.rand(-5, 5);
        ST.audio.boing();
      }
      if (!this.ragdollSplat && this.ragdollT > 0.18 && this.body.position.y < 0.95) {
        this.ragdollSplat = true;
        this.game.world.addBlood(new THREE.Vector3(this.body.position.x, 0, this.body.position.z), U.rand(1.4, 2.4));
        this.game.world.floatText(new THREE.Vector3(this.body.position.x, 0.7, this.body.position.z),
          U.pick(["SPLAT", "OOF", "BONK", "MY LEG", "AGH"]), "#ff5d5d");
        ST.audio.thunk();
      }
      const spd = Math.min(1, Math.hypot(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z) * 0.25);
      const air = 0.35 + spd;
      this.arms[0].rotation.x = -1.8 + Math.sin(t * 6.1) * 0.9 * air;
      this.arms[1].rotation.x = -1.6 + Math.sin(t * 5.3 + 1.7) * 0.9 * air;
      this.arms[0].rotation.z = 0.5 + Math.sin(t * 3.7) * 0.4;
      this.arms[1].rotation.z = -0.5 + Math.sin(t * 4.3 + 1) * 0.4;
      this.legs[0].rotation.x = 0.4 + Math.sin(t * 5.9) * 0.6 * air;
      this.legs[1].rotation.x = -0.3 + Math.sin(t * 6.3 + 2) * 0.6 * air;
      this.head.rotation.z = Math.sin(t * 2.3) * 0.35;
      if (Math.random() < dt * 0.4) {
        this.arms[0].rotation.x = U.rand(-2.6, 2.6);
      }
      if (this.corpseTimer <= 0) {
        this.game.world.scene.remove(this.group);
        this.game.world.physics.removeBody(this.body);
        delete this.game.npcs.npcByBody[this.body.id];
        this.removed = true;
      } else if (this.corpseTimer < 6) {
        this.group.visible = this.corpseTimer > 3;
      }
    }

    say(text) {
      if (!text) return;
      if (this._sayCd > 0) return;
      this._sayCd = 0.5;
      this.talkT = 0.9;
      this.game.world.speechBubble(this, text, 5.2);
      ST.audio.babble(this.voicePitch, text);
      this.animT += 0.1;
    }
  }

  class NPCManager {
    constructor(game) {
      this.game = game;
      game.npcs = this;
      this.all = [];
      this.npcByBody = {};
      this.pedTimer = 0;
      this.copTimer = 0;
      this.maxPeds = 15;
      this.spawnInitial();
    }

    spawnInitial() {
      const w = this.game.world;
      // street people
      const streetPeds = [
        [-20, 5], [12, 6], [-6, 12], [4, -12], [28, 6], [-36, 12], [14, -14], [8, 20]
      ];
      streetPeds.forEach((p, i) => {
        this.spawn(i === 2 ? "drunk" : (i === 4 ? "karen" : "ped"), p[0], p[1], 0);
      });
      this.spawn("bum", -4, -21, 0);
      // bar
      this.spawn("bartender", -28.5, -32.4, 0);
      this.spawn("ped", -26, -26.5, 0);
      this.spawn("drunk", -34.5, -26, 0);
      this.spawn("ped", -21, -23, 0);
      // club
      this.spawn("bouncer", 21.6, -21.2, 0);
      this.spawn("dancer", 18.5, -32.2, 0.8, { stage: true });
      this.spawn("dancer", 24.5, -32.2, 0.8, { stage: true });
      this.spawn("ped", 16, -26.8, 0);
      this.spawn("drunk", 31, -21.5, 0);
      // liquor + house
      this.spawn("clerk", -26.5, 29.2, 0);
      this.spawn("oldman", 20.5, 28, 0);
      // the 2000s strip
      this.spawn("wiener", -18.4, 42, 0);
      this.spawn("chicken", 18.4, 42, 0);
      this.spawn("weedclerk", 46.4, 5, 0);
      this.spawn("barber", -49.6, 15.8, 0);
      this.spawn("security", 0, 39.3, 0);
      this.spawn("mallrat", 1.5, 43, 0);
      this.spawn("tweaker", 8.5, 48.5, 0);
      this.spawn("tweaker", -8, -26.5, 0);
      this.spawn("pimp", 26, -28.5, 0, { name: "Slick" });
      this.spawn("petitioner", 4.8, 9.4, 0);
      this.spawn("influencer", 7.5, 6.2, 0);
      this.spawn("cryptobro", -11.2, 6.4, 0);
      this.spawn("delivery", 14, -6.5, 0);
      this.spawn("dealer", -6.2, -18.8, 0);
      this.spawn("dj", -32, 36.5, 0);
      this.spawn("partygoer", -32, 40, 0);
      this.spawn("partygoer", -29.8, 41.4, 0);
      this.spawn("partygoer", -34.2, 42, 0);
      this.spawn("partygoer", -30.5, 39, 0);
      this.spawn("influencer", -28.2, 38.4, 0);
      this.spawn("pimp", 35.2, 34.6, 0);
      this.spawn("tweaker", 40.2, 43.2, 0);
      this.spawn("geeker", -18, 1.2, 0);
      this.spawn("geeker", 12, -1.2, 0);
      this.spawn("geeker", 32, 0.8, 0);
      this.spawn("geeker", -30, 34, 0);
      this.spawn("redneck", 47.4, -9.4, 0, { name: "Earl" });
      // Kentucky's finest
      this.spawn("redneck", -20, 12.2, 0);
      this.spawn("redneck", 26, 12.4, 0);
      this.spawn("redneck", -33, -9.4, 0);
      this.spawn("redneck", 40, 14, 0);
      this.spawn("redneck", -12, 28, 0);
      this.spawn("redneck", 8, -12, 0);
    }

    reactToSmoke(pos, weed) {
      const g = this.game;
      let coughed = 0, madCop = false;
      this.all.forEach((n) => {
        if (n.down || n.removed) return;
        const d = Math.hypot(n.body.position.x - pos.x, n.body.position.z - pos.z);
        if (d > 11) return;
        if (n.kind === "cop" || n.kind === "security") {
          if (weed) {
            madCop = true;
            n.angry = true;
            n.state = "attack";
            n.say(U.pick(["THAT'S ILLEGAL IN MY COUNTY!", "PUT THAT OUT, HIPPIE!", "I SMELL PROBABLE CAUSE!"]));
          }
          return;
        }
        if (U.chance(0.8)) {
          n.coughT = U.rand(1.8, 3.2);
          n.coughSfxT = U.rand(0.05, 0.3);
          n.eyePop = Math.max(n.eyePop, 1.4);
          coughed++;
          if (U.chance(0.55)) n.say(U.pick([
            "PUT THAT OUT!", "I CAN TASTE THAT!", "WHAT ARE YOU, A CHIMNEY?",
            "MY ASTHMA!", "THAT'S NOT TOBACCO!", "NOT IN FRONT OF MY KIDS!"
          ]));
          if (n.kind === "tweaker" || n.kind === "geeker") {
            n.tweakOut = U.rand(1.5, 4.0);
            n.say(U.pick(["IS THAT THE GOOD STUFF?", "LET ME HIT THAT.", "I CAN SMELL COLORS.", "MY HEART IS A DRUM SOLO."]));
          }
        }
      });
      if (!weed && coughed === 0) {
        let near = null, nd = 14;
        this.all.forEach((n) => {
          if (n.down || n.removed) return;
          const d = Math.hypot(n.body.position.x - pos.x, n.body.position.z - pos.z);
          if (d < nd) { nd = d; near = n; }
        });
        if (near) {
          near.coughT = 2.2;
          near.coughSfxT = 0.1;
          near.eyePop = 1.2;
          near.say(U.pick(["PUT THAT OUT!", "I CAN TASTE THAT!", "WHAT ARE YOU, A CHIMNEY?"]));
          coughed = 1;
        }
      }
      if (weed) {
        g.addWanted(0.9);
        g.ticker("KENTUCKY LAW: weed is legal. The cop disagrees. Loudly.", "bad");
      } else {
        g.ticker("Secondhand smoke: " + (coughed ? coughed + " stranger(s) are regretting the sidewalk." : "nobody noticed. Somehow."), "gold");
      }
      return coughed;
    }

    spawn(kind, x, z, floorY, opts) {
      if (this.all.length > 48) return null;
      const npc = new NPC(this.game, Object.assign({ kind, x, z, floorY: floorY || 0 }, opts || {}));
      this.all.push(npc);
      return npc;
    }

    alivePeds() {
      return this.all.filter((n) => !n.down && n.kind !== "cop" && !n.removed);
    }
    aliveCops() {
      return this.all.filter((n) => !n.down && n.kind === "cop" && !n.removed);
    }

    update(dt) {
      // remove dead
      for (let i = this.all.length - 1; i >= 0; i--) {
        const n = this.all[i];
        if (n.removed) { this.all.splice(i, 1); continue; }
        n.update(dt);
        // cops leave when nobody's wanted
        if (n.kind === "cop" && !n.down && this.game.player.wanted <= 0) {
          const d = Math.hypot(n.body.position.x - this.game.player.body.position.x, n.body.position.z - this.game.player.body.position.z);
          if (d > 30) {
            this.game.world.scene.remove(n.group);
            this.game.world.physics.removeBody(n.body);
            delete this.npcByBody[n.body.id];
            n.removed = true;
          }
        }
      }
      // population control
      this.pedTimer -= dt;
      if (this.pedTimer <= 0) {
        this.pedTimer = 3;
        if (this.alivePeds().length < 13) {
          const p = U.pick(this.game.world.pedSpawns);
          const kind = U.chance(0.2) ? "redneck" : (U.chance(0.18) ? "drunk" : (U.chance(0.12) ? "karen" : (U.chance(0.1) ? "bum" : "ped")));
          // don't spawn too close to player if possible
          const d = Math.hypot(p[0] - this.game.player.body.position.x, p[1] - this.game.player.body.position.z);
          if (d > 14) this.spawn(kind, p[0], p[1], 0);
        }
      }
      // cops
      this.copTimer -= dt;
      if (this.copTimer <= 0 && this.game.player.wanted > 0) {
        this.copTimer = Math.max(1.4, 4 - this.game.player.wanted * 0.5);
        const want = Math.min(7, Math.ceil(this.game.player.wanted * 1.7));
        if (this.aliveCops().length < want) {
          const p = U.pick(this.game.world.copSpawns);
          this.spawn("cop", p[0] + U.rand(-2, 2), p[1] + U.rand(-2, 2), 0);
          if (U.chance(0.4)) this.game.ticker(U.pick(ST.jokes.ticker.wanted), "bad");
        }
      }
    }

    /** everybody near a crime reacts */
    witnessCrime(pos) {
      for (let i = 0; i < this.all.length; i++) {
        const n = this.all[i];
        if (n.down || n.knocked || n.kind === "cop" || n.kind === "bouncer" || n.kind === "geeker") continue;
        const d = Math.hypot(n.body.position.x - pos.x, n.body.position.z - pos.z);
        if (d > 24) continue;
        if (n.kind === "influencer") {
          n.state = "film";
          n.callTimer = 999;
          this.game.addRespect(2, "punch");
          this.game.ticker("CLIP THAT — an influencer is filming you. +2 clout.", "gold");
        } else if (n.kind === "karen" || U.chance(0.25)) {
          n.state = "film";
          n.callTimer = U.rand(2.5, 5);
        } else if (n.kind === "dancer") {
          n.state = "flee";
        } else if (n.state !== "flee") {
          n.state = "flee";
        }
      }
      this.game.addWanted(0.5);
    }

    /** pick the NPC the player is looking at, for E prompts */
    focused(camPos, camDir, maxDist) {
      let best = null, bestDot = 0.6;
      for (let i = 0; i < this.all.length; i++) {
        const n = this.all[i];
        if (n.down || n.removed) continue;
        const dx = n.body.position.x - camPos.x;
        const dy = (n.body.position.y + 0.4) - camPos.y;
        const dz = n.body.position.z - camPos.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > maxDist) continue;
        const dot = (dx * camDir.x + dy * camDir.y + dz * camDir.z) / (d || 1);
        if (dot > bestDot) { bestDot = dot; best = n; }
      }
      return best;
    }
  }

  ST.NPC = NPC;
  ST.NPCManager = NPCManager;
})();
