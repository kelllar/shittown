/* SHITTOWN — player.js
   You. A first-person problem. Movement, the Claw, fists, bottles,
   beer, urine, cigarettes, and the ability to be a menace to society. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;

  const EYE = 1.62;

  class Player {
    constructor(game, camera) {
      this.game = game;
      this.world = game.world;
      this.camera = camera;
      this.camera.rotation.order = "YXZ";

      this.health = 100;
      this.maxHealth = 100;
      this.cash = 20;
      this.beer = Infinity;
      this.cigs = Infinity;
      this.weed = 0;
      this.papers = 0;
      this.wraps = 0;
      this.stoned = 0;
      this.chicken = 1;
      this.weapon = "fists";
      this.owned = { fists: true, bat: false, shovel: false, pistol: false, shotgun: false, petition: false };
      this.ammo = { pistol: 0, shotgun: 0 };
      this.stonedHealth = 0;
      this.drunk = 0;
      this.bladder = 25;
      this.respect = 0;
      this.wanted = 0;
      this.peeing = false;
      this.peeSoundT = 0;
      this.peeReactT = 0;
      this.peeSplashT = 0;
      this.peePuddleT = 0;
      this.peeHold = 0;
      this.dead = false;

      this.yaw = 0;
      this.pitch = 0;
      this.bobT = 0;
      this.stepT = 0;
      this.shake = 0;
      this.attackCd = 0;
      this.kickCd = 0;
      this.peeCd = 0;
      this.smokeCd = 0;
      this.heldProp = null;
      this.heldNpc = null;
      this.holdDist = 3.1;
      this.punchAnim = 0;
      this.fov = 74;
      this.prompt = "";

      this.punchSide = 1;
      this.jumpBuffer = 0;
      this.coyote = 0;
      this.wasGrounded = false;
      this.landTimer = 0;
      this.chickenT = 0;
      this.recoil = 0;
      this.stonedTalk = 0;
      this.smoking = null;
      this.smokePuffT = 0;
      this.smokeTalkT = 4;
      this.smokeStreamT = 0;
      this.mouthPuffT = 0;
      this.puffT = 0;
      this.puffExhaled = false;
      this.bongT = 0;
      this.kickAnim = 0;
      this.driving = null;
      this.plane = null;
      this.dragAnim = 0;
      this.dragExhaled = false;
      this.beerHeld = false;
      this.beerSips = 0;
      this.beerStock = 12;
      this.beerAutoT = 0;
      this.engineOn = false;
      this.beerT = 0;
      this.beerGulped = false;
      this.beerBurped = false;
      this.vapes = Infinity;
      this.water = 2;
      this.drugs = { juice: 1, coke: 1, xans: 1, kpin: 1, quaalude: 1 };
      this.activeDrug = null;
      this.drugT = 0;
      this.drugSpeed = 1;
      this.drugPower = 0;
      this.drugDefense = 1;
      this.drugRegen = 0;
      this.drugDrain = 0;
      this.drugRoll = 0;
      this.drugLabel = "";
      this.punchCount = 0;
      this.clawCount = 0;
      this.interactCount = 0;
      this.hasExtinguisher = false;
      this.spraying = false;
      this.sprayT = 0;

      const spawn = this.world.getPlayerSpawn();
      this.body = new CANNON.Body({
        mass: 75,
        position: new CANNON.Vec3(spawn.x, spawn.y, spawn.z),
        collisionFilterGroup: 2, collisionFilterMask: -1, material: this.world.playerMat
      });
      this.body.addShape(new CANNON.Sphere(0.45));
      this.body.fixedRotation = true;
      this.body.updateMassProperties();
      this.body.linearDamping = 0.35;
      this.body.angularDamping = 1;
      this.body.allowSleep = false;
      this.world.physics.addBody(this.body);

      this.sleeveMats = [];
      this._buildViewModel();
      this._buildSmokeView();
      this._buildBeerView();
      this._buildPhoneView();
      this._buildAvatar();
      this.thirdPerson = false;
    }

    _buildPhoneView() {
      const phone = new THREE.Group();
      const shellMat = new THREE.MeshLambertMaterial({ color: 0x1c1c22, flatShading: false });
      const trimMat = new THREE.MeshLambertMaterial({ color: 0xc8a040, flatShading: true });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.235, 0.028), shellMat);
      phone.add(body);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.012, 0.032), trimMat);
      trim.position.y = 0.11;
      phone.add(trim);
      const tex = U.tex(128, 208, (g, w, h) => {
        g.fillStyle = "#0a1410"; g.fillRect(0, 0, w, h);
        const grd = g.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#123a26"); grd.addColorStop(1, "#07160f");
        g.fillStyle = grd; g.fillRect(4, 4, w - 8, h - 8);
        g.fillStyle = "#5cff86"; g.font = "bold 13px 'Courier New'"; g.textAlign = "center";
        g.fillText("CRACKPHONE", w / 2, 24);
        g.font = "bold 9px 'Courier New'";
        g.fillStyle = "#9affb8";
        ["SHITTER", "CRACKED", "WALLET", "RADIO", "DRUGS", "WEEDMAPS", "ONION", "GUIDE"].forEach((t, i) => {
          g.textAlign = "left";
          g.fillText("■ " + t, 14, 50 + i * 17);
        });
        g.textAlign = "center";
        g.fillStyle = "#2fe3ff";
        g.fillText("3:14 · 1%", w / 2, h - 14);
        for (let y = 6; y < h - 6; y += 3) {
          g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(4, y, w - 8, 1);
        }
      });
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.108, 0.18), new THREE.MeshBasicMaterial({ map: tex }));
      screen.position.z = -0.0155;
      phone.add(screen);
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.006, 8), trimMat);
      button.rotation.x = Math.PI / 2;
      button.position.set(0, -0.127, 0);
      phone.add(button);
      // hand holding the phone
      const handMat = new THREE.MeshLambertMaterial({ color: 0xc89070, flatShading: false });
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.19, 0.05), handMat);
      palm.position.set(0, -0.01, 0.03);
      phone.add(palm);
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.05), handMat);
      thumb.position.set(0.07, -0.04, -0.01);
      thumb.rotation.z = -0.25;
      phone.add(thumb);
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.05), handMat);
        finger.position.set(-0.06 + i * 0.035, 0.12, 0.005);
        finger.rotation.x = 0.4;
        phone.add(finger);
      }
      const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.24, 7), handMat);
      wrist.position.set(0, -0.2, 0.04);
      wrist.rotation.x = 0.25;
      phone.add(wrist);
      phone.position.set(-0.27, -0.31, -0.52);
      phone.rotation.set(-0.16, 0.3, -0.06);
      phone.scale.setScalar(1.15);
      phone.visible = false;
      this.camera.add(phone);
      this.phoneModel = phone;
    }

    showPhone(on) {
      if (!this.phoneModel) return;
      this.phoneModel.visible = !!on;
      if (on) {
        if (this.fist) this.fist.visible = false;
        if (this.fistL) this.fistL.visible = false;
        if (this.hand) this.hand.visible = false;
        if (this.smokeHand) this.smokeHand.visible = false;
        if (this.beerHand) this.beerHand.visible = false;
      }
    }

    _buildAvatar() {
      const W = this.world;
      const hoodie = W.paintSmooth(0x17171d);
      const hoodie2 = W.paintSmooth(0x242430);
      this.pimpMats = [hoodie, hoodie2];
      const jeans = W.paintSmooth(0x242a36);
      const skin = W.paintSmooth(0xc49878);
      const hair = W.paintSmooth(0x120f0e);
      const shoe = W.paint(0x101010);
      const g = new THREE.Group();
      this.avatar = g;
      this.avatarLegs = []; this.avatarArms = [];
      for (let i = 0; i < 2; i++) {
        const hip = new THREE.Group();
        hip.position.set(i ? 0.14 : -0.14, 0.86, 0.02);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.1, 0.42, 8), jeans);
        thigh.position.y = -0.21; hip.add(thigh);
        const knee = new THREE.Group();
        knee.position.y = -0.42;
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.065, 0.38, 8), jeans);
        shin.position.y = -0.19; knee.add(shin);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), shoe);
        foot.position.set(0, -0.42, -0.05); knee.add(foot);
        hip.add(knee);
        g.add(hip);
        this.avatarLegs.push(hip);
        if (!this.avatarKnees) this.avatarKnees = [];
        this.avatarKnees.push(knee);
      }
      const torso = new THREE.Group();
      torso.position.y = 1.3; g.add(torso); this.avatarTorso = torso;
      const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.62, 9), hoodie);
      chest.position.y = 0.02; torso.add(chest);
      const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.22, 8), jeans);
      hips.position.y = -0.33; torso.add(hips);
      const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.31, 9, 6), hoodie);
      shoulders.scale.set(1, 0.45, 0.85); shoulders.position.y = 0.28; torso.add(shoulders);
      const chain = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), W.paint(0xffd24a));
      chain.position.set(0, 0.12, -0.28); chain.visible = true; torso.add(chain);
      this.pimpChain = chain;
      const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.1, 0.34), W.paint(0x8a1a2a));
      bandana.position.set(0, 0.24, 0.01); bandana.rotation.x = 0.12; torso.add(bandana);
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.31, 9, 7), hoodie2);
      hood.scale.set(1, 0.9, 0.55); hood.position.set(0, 0.33, 0.12); torso.add(hood);
      for (let i = 0; i < 2; i++) {
        const string = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.2, 0.015), W.paint(0xd8d4c8));
        string.position.set(i ? 0.06 : -0.06, 0.05, -0.3); torso.add(string);
      }
      const head = new THREE.Group(); head.position.y = 1.86; g.add(head); this.avatarHead = head;
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 9, 7), skin);
      skull.scale.set(0.94, 1.06, 0.9); head.add(skull);
      const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.215, 9, 6), hair);
      hairCap.scale.set(1, 0.9, 0.95); hairCap.position.y = 0.03; head.add(hairCap);
      const beanie = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.235, 0.16, 10), W.paint(0x1c1c22));
      beanie.position.y = 0.12; head.add(beanie);
      const beanieTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.238, 0.238, 0.05, 10), W.paint(0x3a1a22));
      beanieTrim.position.y = 0.045; head.add(beanieTrim);
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.17, 0.08), hair);
      fringe.position.set(0, 0.045, -0.17); fringe.rotation.x = -0.1; head.add(fringe);
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.05), skin);
      face.position.set(0, -0.075, -0.175); head.add(face);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.025, 0.02), W.paint(0x090909));
      eye.position.set(-0.06, -0.055, -0.2); head.add(eye);
      const eye2 = eye.clone(); eye2.position.x = 0.06; head.add(eye2);
      for (let i = 0; i < 2; i++) {
        const arm = new THREE.Group();
        arm.position.set(i ? 0.36 : -0.36, 1.52, 0);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.34, 8), hoodie);
        sleeve.position.y = -0.17; arm.add(sleeve);
        const foreGroup = new THREE.Group();
        foreGroup.position.y = -0.34;
        const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.052, 0.3, 8), skin);
        fore.position.y = -0.15; foreGroup.add(fore);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 5), skin);
        hand.position.y = -0.33; foreGroup.add(hand);
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.05, 8), W.paint(0x8a1a2a));
        band.position.y = -0.27; foreGroup.add(band);
        if (i === 1) {
          const tat = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 0.06), W.paint(0x1a1a2a));
          tat.position.set(0.05, -0.12, -0.02); foreGroup.add(tat);
        }
        arm.add(foreGroup);
        g.add(arm);
        this.avatarArms.push(arm);
        if (!this.avatarForearms) this.avatarForearms = [];
        this.avatarForearms.push(foreGroup);
      }
      // simple held smoke + bottle models on right hand
      const avCig = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.23, 6), W.paint(0xe8e4d8));
      avCig.rotation.x = Math.PI / 2; avCig.position.set(0, -0.67, -0.18); avCig.visible = false; this.avatarArms[1].add(avCig);
      const avEmber = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), this.world.glow(0xff6a1f));
      avEmber.position.set(0, -0.67, -0.3); avEmber.visible = false; this.avatarArms[1].add(avEmber);
      this.avatarCig = avCig; this.avatarEmber = avEmber;
      const avBottle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), new THREE.MeshLambertMaterial({ color: 0x2f6a3a, flatShading: false }));
      avBottle.position.set(0, -0.67, -0.16); avBottle.visible = false; this.avatarArms[1].add(avBottle);
      this.avatarBottle = avBottle;
      g.visible = false;
      this.world.scene.add(g);
    }

    wearPimpSuit() {
      this.suit = true;
      if (this.pimpMats) {
        this.pimpMats[0].color.setHex(0x5a1f7a);
        this.pimpMats[1].color.setHex(0x8a2a9a);
      }
      if (this.sleeveMats) this.sleeveMats.forEach((m) => m.color.setHex(0x6a2490));
      if (this.pimpChain) this.pimpChain.visible = true;
    }

    toggleCamera() {
      this.thirdPerson = !this.thirdPerson;
      this.avatar.visible = this.thirdPerson;
      this.game.ticker(this.thirdPerson ? "CAMERA: THIRD PERSON. Look at this guy." : "CAMERA: FIRST PERSON.", "gold");
      if (!this.thirdPerson) this.avatar.visible = false;
    }

    _updateAvatar(dt) {
      const a = this.avatar;
      if (!a || !a.visible) return;
      const b = this.body.position;
      a.position.set(b.x, b.y - 0.45, b.z);
      a.rotation.y = this.yaw;
      const sp = Math.hypot(this.body.velocity.x, this.body.velocity.z);
      const run = sp > 3.4;
      const swing = Math.sin(this.bobT * (run ? 1.35 : 1.0)) * Math.min(run ? 0.85 : 0.45, sp * 0.16);
      const air = this.grounded ? 0 : 1;
      this.avatarLegs[0].rotation.x = swing + air * 0.25;
      this.avatarLegs[1].rotation.x = -swing + air * 0.1;
      if (this.avatarKnees) {
        this.avatarKnees[0].rotation.x = Math.max(0, -swing) * 0.95 + air * 0.5;
        this.avatarKnees[1].rotation.x = Math.max(0, swing) * 0.95 + air * 0.25;
      }
      this.avatarArms[0].rotation.x = -swing * 0.9;
      this.avatarArms[1].rotation.x = swing * 0.9;
      this.avatarArms[0].rotation.z = 0.08 + Math.abs(swing) * 0.1;
      this.avatarArms[1].rotation.z = -0.08 - Math.abs(swing) * 0.1;
      if (this.avatarForearms) {
        this.avatarForearms[0].rotation.x = -0.25 - Math.max(0, -swing) * 0.7;
        this.avatarForearms[1].rotation.x = -0.25 - Math.max(0, swing) * 0.7;
      }
      if (this.punchAnim > 0) {
        const k = Math.sin(Math.min(1, (1 - this.punchAnim) * 1.1) * Math.PI);
        const right = this.punchSide === 1;
        const armIdx = right ? 1 : 0;
        this.avatarArms[armIdx].rotation.x = -1.65 * k;
        if (this.avatarForearms) this.avatarForearms[armIdx].rotation.x = -1.1 * k;
        this.avatarTorso.rotation.y = (right ? -1 : 1) * 0.28 * k;
      } else {
        this.avatarTorso.rotation.y *= 0.85;
      }
      if (this.kickAnim > 0) {
        const kb = Math.sin(Math.min(1, (1 - this.kickAnim) * 1.1) * Math.PI);
        this.avatarLegs[1].rotation.x = -1.5 * kb;
        if (this.avatarKnees) this.avatarKnees[1].rotation.x = 0.6 * kb;
        this.avatarTorso.rotation.x = 0.12 * kb;
      }
      this.avatarTorso.rotation.x = (run ? -0.12 : -0.04) + Math.sin(this.bobT * 1.4) * 0.012;
      this.avatarHead.rotation.x = 0.05 + Math.sin(this.bobT * 1.3) * 0.02;
      if (this.smoking) {
        this.avatarArms[1].rotation.x = -1.2;
        this.avatarArms[1].rotation.z = -0.3;
      }
      if (this.beerT > 0) {
        this.avatarArms[1].rotation.x = -1.5;
        this.avatarArms[1].rotation.z = -0.2;
      }
      if (this.avatarCig) this.avatarCig.visible = !!this.smoking;
      if (this.avatarEmber) this.avatarEmber.visible = !!this.smoking;
      if (this.avatarBottle) this.avatarBottle.visible = this.beerT > 0;
    }

    _thirdPersonCamera() {
      const b = this.body.position;
      const target = new THREE.Vector3(b.x, b.y + 1.2, b.z);
      const cp = Math.cos(this.pitch);
      const dist = 4.4;
      const back = new THREE.Vector3(
        Math.sin(this.yaw) * dist * cp,
        -Math.sin(this.pitch) * dist + 0.25,
        Math.cos(this.yaw) * dist * cp
      );
      let camPos = target.clone().add(back);
      const res = this.world.ray(target, camPos, ~2);
      if (res.hasHit) {
        const hit = new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z);
        const d = Math.max(0.8, hit.distanceTo(target) - 0.25);
        camPos = target.clone().add(back.normalize().multiplyScalar(d));
      }
      camPos.y = Math.max(0.45, camPos.y);
      const shakeAmt = this.shake * 0.03;
      this.camera.position.set(camPos.x + U.rand(-shakeAmt, shakeAmt), camPos.y + U.rand(-shakeAmt, shakeAmt), camPos.z + U.rand(-shakeAmt, shakeAmt));
      this.camera.lookAt(target);
      const targetFov = (Math.hypot(this.body.velocity.x, this.body.velocity.z) > 6.5 ? 78 : 70) + (this.drunk / 100) * 5;
      if (Math.abs(this.camera.fov - targetFov) > 0.2) {
        this.camera.fov += (targetFov - this.camera.fov) * 0.12;
        this.camera.updateProjectionMatrix();
      }
    }

    _buildBeerView() {
      const skin = new THREE.MeshLambertMaterial({ color: 0xc89070, flatShading: false });
      const sleeve = new THREE.MeshLambertMaterial({ color: 0x3d4a33, flatShading: false });
      this.sleeveMats.push(sleeve);
      const hand = new THREE.Group();
      const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 5), skin);
      wrist.scale.set(1, 0.9, 1);
      hand.add(wrist);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.105, 0.17), skin);
      palm.position.set(0, -0.005, -0.07);
      hand.add(palm);
      const knuckleRow = new THREE.Mesh(new THREE.SphereGeometry(0.072, 7, 5), skin);
      knuckleRow.scale.set(1.0, 0.85, 0.7);
      knuckleRow.position.set(0, 0.02, -0.145);
      hand.add(knuckleRow);
      // fingers curled around the bottle
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.042, 0.115), skin);
        finger.position.set(-0.052 + i * 0.035, 0.012, -0.155);
        finger.rotation.x = 1.25;
        hand.add(finger);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.036, 0.065), skin);
        tip.position.set(-0.052 + i * 0.035, -0.045, -0.215);
        tip.rotation.x = 0.45;
        hand.add(tip);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, 0.12), skin);
      thumb.position.set(-0.085, 0.015, -0.075);
      thumb.rotation.set(0.5, 0, 0.85);
      hand.add(thumb);
      const bottle = new THREE.Group();
      const glass = new THREE.MeshLambertMaterial({ color: 0x2f6a3a, transparent: true, opacity: 0.9, flatShading: false });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.17, 10), glass);
      body.rotation.x = Math.PI / 2;
      body.position.z = 0.03;
      bottle.add(body);
      const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.043, 0.07, 9), glass);
      shoulder.rotation.x = Math.PI / 2;
      shoulder.position.z = -0.09;
      bottle.add(shoulder);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.025, 0.12, 9), glass);
      neck.rotation.x = Math.PI / 2;
      neck.position.z = -0.18;
      bottle.add(neck);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.025, 8), new THREE.MeshLambertMaterial({ color: 0xc8a040, flatShading: true }));
      cap.rotation.x = Math.PI / 2;
      cap.position.z = -0.245;
      bottle.add(cap);
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.085, 10), new THREE.MeshLambertMaterial({ color: 0xe8e0c0, flatShading: true }));
      label.rotation.x = Math.PI / 2;
      label.position.z = 0.02;
      bottle.add(label);
      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.12, 8), new THREE.MeshLambertMaterial({ color: 0xc89018, flatShading: false }));
      liquid.rotation.x = Math.PI / 2;
      liquid.position.z = 0.03;
      bottle.add(liquid);
      bottle.position.set(0, -0.01, -0.055);
      bottle.rotation.x = 0.06;
      bottle.scale.setScalar(1.0);
      bottle.visible = true;
      hand.add(bottle);
      this.beerBottle = bottle;
      hand.position.set(0.3, -0.46, -0.62);
      hand.rotation.set(0.12, -0.22, 0.14);
      hand.scale.setScalar(0.66);
      hand.visible = false;
      this.camera.add(hand);
      this.beerHand = hand;
      this.beerHandBase = { pos: hand.position.clone(), rot: hand.rotation.clone() };
      const bUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 1, 9), skin);
      bUpper.visible = false; this.camera.add(bUpper);
      const bFore = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 1, 9), skin);
      bFore.visible = false; this.camera.add(bFore);
      const bElbow = new THREE.Mesh(new THREE.SphereGeometry(0.058, 7, 5), skin);
      bElbow.visible = false; this.camera.add(bElbow);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.2, 9), sleeve);
      cuff.visible = false;
      this.camera.add(cuff);
      this.beerCuff = cuff;
      this.beerRig = { upper: bUpper, fore: bFore, elbow: bElbow, cuff, l1: 0.38, l2: 0.38, hand };
    }

    _buildViewModel() {
      const skin = new THREE.MeshLambertMaterial({ color: 0xd8a878, flatShading: false });
      const sleeve = new THREE.MeshLambertMaterial({ color: 0x3d4a33, flatShading: false });
      this.sleeveMats.push(sleeve);
      const hand = new THREE.Group();

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.062, 0.36, 7), skin);
      forearm.rotation.x = Math.PI / 2;
      forearm.position.set(0, 0, 0.2);
      hand.add(forearm);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 0.14, 7), sleeve);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.set(0, 0, 0.4);
      hand.add(cuff);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.095, 0.18), skin);
      palm.position.set(0, 0, -0.02);
      hand.add(palm);
      this.fingers = [];
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.038, 0.15), skin);
        finger.position.set(-0.048 + i * 0.032, 0.018, -0.17);
        finger.rotation.x = -0.12;
        hand.add(finger);
        this.fingers.push(finger);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.042, 0.11), skin);
      thumb.position.set(-0.095, -0.01, -0.06);
      thumb.rotation.z = 0.55;
      hand.add(thumb);
      this.thumb = thumb;
      const knuckles = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 5), skin);
        k.position.set(-0.05 + i * 0.033, 0.025, -0.105);
        knuckles.add(k);
      }
      knuckles.visible = false;
      hand.add(knuckles);
      this.knuckles = knuckles;

      hand.position.set(0.41, -0.47, -0.82);
      hand.rotation.set(0.02, -0.16, 0.03);
      this.camera.add(hand);
      this.hand = hand;
      this.handBase = { pos: hand.position.clone(), rot: hand.rotation.clone() };

      // A real closed fist for unarmed punches.
      const fist = new THREE.Group();
      const fFore = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.44, 7), skin);
      fFore.rotation.x = Math.PI / 2;
      fFore.position.z = 0.18;
      fist.add(fFore);
      const fCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.095, 0.16, 7), sleeve);
      fCuff.rotation.x = Math.PI / 2;
      fCuff.position.z = 0.42;
      fist.add(fCuff);
      const fWrist = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 5), skin);
      fWrist.scale.set(1, 0.9, 0.8);
      fWrist.position.z = -0.03;
      fist.add(fWrist);
      const fPalm = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 6), skin);
      fPalm.scale.set(0.92, 1.05, 0.8);
      fPalm.position.z = -0.19;
      fist.add(fPalm);
      const fThumb = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.06, 0.13), skin);
      fThumb.position.set(-0.10, -0.015, -0.19);
      fThumb.rotation.z = 0.55;
      fist.add(fThumb);
      for (let i = 0; i < 4; i++) {
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.037, 6, 5), skin);
        knuckle.scale.set(1, 0.8, 0.7);
        knuckle.position.set(-0.06 + i * 0.04, 0.035, -0.285);
        fist.add(knuckle);
      }
      const watch = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.12), new THREE.MeshLambertMaterial({ color: 0x1a1a22, flatShading: true }));
      watch.position.set(0, 0.015, 0.02);
      fist.add(watch);
      fist.position.set(0.47, -0.46, -0.92);
      fist.rotation.set(0.08, -0.22, 0.08);
      fist.scale.setScalar(0.58);
      this.camera.add(fist);
      this.fist = fist;
      this.fistBase = { pos: fist.position.clone(), rot: fist.rotation.clone() };
      fist.visible = true;
      const fistL = fist.clone(true);
      fistL.position.set(-0.47, -0.46, -0.92);
      fistL.rotation.set(0.08, 0.22, -0.08);
      fistL.scale.setScalar(0.58);
      this.camera.add(fistL);
      this.fistL = fistL;
      this.fistLBase = { pos: fistL.position.clone(), rot: fistL.rotation.clone() };

      // Boot for the kick animation.
      const boot = new THREE.Group();
      const pantsMat = new THREE.MeshLambertMaterial({ color: 0x26303f, flatShading: false });
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.5, 8), pantsMat);
      shin.rotation.x = Math.PI / 2;
      shin.position.z = 0.22;
      boot.add(shin);
      const shoeMat = new THREE.MeshLambertMaterial({ color: 0x14161a, flatShading: false });
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.36), shoeMat);
      shoe.position.set(0, -0.03, -0.16);
      boot.add(shoe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.38), new THREE.MeshLambertMaterial({ color: 0x33343a }));
      sole.position.set(0, -0.1, -0.16);
      boot.add(sole);
      boot.position.set(0.05, -0.95, -0.6);
      boot.rotation.set(0.9, 0, 0);
      boot.visible = false;
      this.camera.add(boot);
      this.boot = boot;
      fistL.visible = true;

      // weapon models, all held in the same hand
      const models = {};
      const wood = new THREE.MeshLambertMaterial({ color: 0x6a4526, flatShading: true });
      const darkMetal = new THREE.MeshLambertMaterial({ color: 0x22242a, flatShading: true });
      const steel = new THREE.MeshLambertMaterial({ color: 0x8a9098, flatShading: true });

      const bat = new THREE.Group();
      const batBody = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.026, 0.86, 7), wood);
      batBody.rotation.x = Math.PI / 2;
      batBody.position.set(0, 0.02, -0.5);
      bat.add(batBody);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 7), new THREE.MeshLambertMaterial({ color: 0x1a1a1a, flatShading: true }));
      grip.rotation.x = Math.PI / 2; grip.position.set(0, 0.02, 0.0); bat.add(grip);
      models.bat = bat;

      const shovel = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.95, 6), wood);
      shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0, -0.42); shovel.add(shaft);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.025), steel);
      blade.position.set(0, -0.02, -0.86); shovel.add(blade);
      models.shovel = shovel;

      const pistol = new THREE.Group();
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.07, 0.26), darkMetal);
      slide.position.set(0, 0.02, -0.25); pistol.add(slide);
      const gripP = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.15, 0.08), new THREE.MeshLambertMaterial({ color: 0x3a2a1a, flatShading: true }));
      gripP.position.set(0, -0.09, -0.14); pistol.add(gripP);
      const muzzleP = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 6), steel);
      muzzleP.rotation.x = Math.PI / 2; muzzleP.position.set(0, 0.02, -0.39); pistol.add(muzzleP);
      models.pistol = pistol;

      const shotgun = new THREE.Group();
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.82, 7), darkMetal);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -0.45); shotgun.add(barrel);
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 0.22), wood);
      pump.position.set(0, -0.02, -0.28); shotgun.add(pump);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.3), wood);
      stock.position.set(0, -0.05, 0.18); shotgun.add(stock);
      models.shotgun = shotgun;

      const petition = new THREE.Group();
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.02), new THREE.MeshLambertMaterial({ color: 0x8a6a3a, flatShading: true }));
      board.position.set(0, 0.02, -0.32); board.rotation.x = 0.12; petition.add(board);
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.21), new THREE.MeshBasicMaterial({ color: 0xf0ead8 }));
      paper.position.set(0, 0.02, -0.335); paper.rotation.x = 0.12; petition.add(paper);
      models.petition = petition;

      for (const key in models) {
        models[key].visible = false;
        models[key].scale.setScalar(0.58);
        hand.add(models[key]);
      }
      hand.scale.setScalar(0.55);
      this.weaponModels = models;

      // squeaky chicken, in the other hand
      const chicken = new THREE.Group();
      const chBody = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), new THREE.MeshLambertMaterial({ color: 0xff9a1f, flatShading: true }));
      chBody.scale.set(1, 0.9, 1.3); chicken.add(chBody);
      const chHead = new THREE.Mesh(new THREE.SphereGeometry(0.105, 7, 5), new THREE.MeshLambertMaterial({ color: 0xffb02f, flatShading: true }));
      chHead.position.set(0, 0.15, -0.13); chicken.add(chHead);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5), new THREE.MeshLambertMaterial({ color: 0xffd400, flatShading: true }));
      beak.rotation.x = -Math.PI / 2; beak.position.set(0, 0.13, -0.24); chicken.add(beak);
      for (let i = 0; i < 2; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
        eye.position.set(i ? 0.048 : -0.048, 0.17, -0.21); chicken.add(eye);
        const comb = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.09, 0.03), new THREE.MeshLambertMaterial({ color: 0xd82020, flatShading: true }));
        comb.position.set(0, 0.25, -0.1); chicken.add(comb);
      }
      chicken.position.set(-0.38, -0.48, -1.0);
      chicken.rotation.set(0.1, 0.3, -0.1);
      chicken.scale.setScalar(0.42);
      chicken.visible = false;
      this.camera.add(chicken);
      this.chickenModel = chicken;

      this.camera.position.set(0, 0, 0);
      this.world.scene.add(this.camera);
      this.updateWeaponModel();
    }

    _orientSeg(mesh, d) {
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    }

    _placeSeg(mesh, a, b) {
      const d = b.clone().sub(a);
      const len = Math.max(0.02, d.length());
      mesh.position.copy(a).add(d.clone().multiplyScalar(0.5));
      mesh.scale.set(mesh.scale.x || 1, len, mesh.scale.z || 1);
      this._orientSeg(mesh, d);
    }

    _poseArm(rig, shoulder, wrist, bend) {
      const l1 = rig.l1, l2 = rig.l2;
      const dir = wrist.clone().sub(shoulder);
      let d = dir.length();
      const maxd = l1 + l2 - 0.004;
      if (d > maxd) d = maxd;
      if (d < Math.abs(l1 - l2) + 0.01) d = Math.abs(l1 - l2) + 0.01;
      const n = dir.clone().normalize();
      let perp = bend.clone().sub(n.clone().multiplyScalar(bend.dot(n)));
      if (perp.lengthSq() < 1e-5) perp.set(0, -1, 0);
      perp.normalize();
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const elbow = shoulder.clone().add(n.clone().multiplyScalar(a)).add(perp.clone().multiplyScalar(h));
      const end = shoulder.clone().add(n.multiplyScalar(d));
      this._placeSeg(rig.upper, shoulder, elbow);
      this._placeSeg(rig.fore, elbow, end);
      if (rig.elbow) rig.elbow.position.copy(elbow);
      if (rig.hand) { rig.hand.position.copy(end); }
      if (rig.cuff) {
        const sh = elbow.clone().sub(shoulder).normalize();
        rig.cuff.position.copy(shoulder).add(sh.multiplyScalar(0.13));
        this._orientSeg(rig.cuff, elbow.clone().sub(shoulder));
        rig.cuff.scale.set(1, 1, 1);
      }
      return end;
    }

    _buildSmokeView() {
      const skin = new THREE.MeshLambertMaterial({ color: 0xc89070, flatShading: false });
      const sleeve = new THREE.MeshLambertMaterial({ color: 0x3d4a33, flatShading: false });
      this.sleeveMats.push(sleeve);
      const hand = new THREE.Group();
      const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), skin);
      wrist.position.z = -0.02;
      hand.add(wrist);
      const palm = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 6), skin);
      palm.scale.set(1.15, 1.0, 0.8);
      palm.position.z = -0.09;
      hand.add(palm);
      for (let i = 0; i < 4; i++) {
        const finger = new THREE.Mesh(new THREE.BoxGeometry(0.033, 0.04, 0.15), skin);
        finger.position.set(-0.068 + i * 0.044, 0.025, -0.22);
        finger.rotation.x = 0.45;
        hand.add(finger);
      }
      for (let i = 0; i < 4; i++) {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.024, 5, 4), skin);
        k.position.set(-0.068 + i * 0.044, 0.045, -0.2);
        hand.add(k);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.13), skin);
      thumb.position.set(-0.105, -0.005, -0.15);
      thumb.rotation.z = 0.75;
      hand.add(thumb);
      hand.position.set(-0.31, -0.56, -0.76);
      hand.rotation.set(0.2, 0.3, -0.25);
      hand.scale.setScalar(0.62);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.05, 1, 9), skin);
      upper.visible = false; this.camera.add(upper);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.044, 1, 9), skin);
      fore.visible = false; this.camera.add(fore);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), skin);
      elbow.visible = false; this.camera.add(elbow);
      const armCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.085, 0.2, 9), sleeve);
      armCuff.visible = false;
      this.camera.add(armCuff);
      this.smokeCuff = armCuff;
      this.smokeRig = { upper, fore, elbow, cuff: armCuff, l1: 0.36, l2: 0.36, hand };
      this.smokeArm = upper;
      this.smokeFore = fore;
      hand.visible = false;
      this.camera.add(hand);
      this.smokeHand = hand;
      this.smokeHandBase = { pos: hand.position.clone(), rot: hand.rotation.clone() };

      const cig = new THREE.Group();
      const cigBody = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.23, 7), new THREE.MeshLambertMaterial({ color: 0xe8e4d8, flatShading: true }));
      cigBody.rotation.x = Math.PI / 2;
      cigBody.position.z = -0.24;
      cig.add(cigBody);
      const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.055, 7), new THREE.MeshLambertMaterial({ color: 0x8a5a32, flatShading: true }));
      filter.rotation.x = Math.PI / 2;
      filter.position.z = -0.15;
      cig.add(filter);
      const cigEmber = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: 0xff5a1f }));
      cigEmber.position.z = -0.37;
      cig.add(cigEmber);
      cig.visible = false;
      cig.scale.setScalar(1.5);
      hand.add(cig);
      this.cigModel = cig;
      this.cigEmber = cigEmber;

      const joint = new THREE.Group();
      const jBody = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.021, 0.3, 7), new THREE.MeshLambertMaterial({ color: 0xe8e0c8, flatShading: true }));
      jBody.rotation.x = Math.PI / 2;
      jBody.position.z = -0.27;
      joint.add(jBody);
      const twist = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.06, 5), new THREE.MeshLambertMaterial({ color: 0x5a3a1a, flatShading: true }));
      twist.rotation.x = -Math.PI / 2;
      twist.position.z = -0.44;
      joint.add(twist);
      const jEmber = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 4), new THREE.MeshBasicMaterial({ color: 0x7cff4a }));
      jEmber.position.z = -0.41;
      joint.add(jEmber);
      joint.visible = false;
      joint.scale.setScalar(1.45);
      hand.add(joint);
      this.jointModel = joint;
      this.jointEmber = jEmber;

      const blunt = new THREE.Group();
      const blBody = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.34, 7), new THREE.MeshLambertMaterial({ color: 0x6a4526, flatShading: true }));
      blBody.rotation.x = Math.PI / 2;
      blBody.position.z = -0.3;
      blunt.add(blBody);
      const blEmber = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff8a1f }));
      blEmber.position.z = -0.47;
      blunt.add(blEmber);
      blunt.visible = false;
      blunt.scale.setScalar(1.55);
      hand.add(blunt);
      this.bluntModel = blunt;
      this.bluntEmber = blEmber;

      const vape = new THREE.Group();
      const vBody = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.085, 0.28), new THREE.MeshLambertMaterial({ color: 0x222a44, flatShading: true }));
      vBody.position.z = -0.25;
      vape.add(vBody);
      const vLed = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: 0x5cd8ff }));
      vLed.position.z = -0.38;
      vape.add(vLed);
      vape.visible = false;
      vape.scale.setScalar(1.55);
      hand.add(vape);
      this.vapeModel = vape;
      this.vapeLed = vLed;

      const bong = new THREE.Group();
      const bBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0x3d8a6a, transparent: true, opacity: 0.65, flatShading: true }));
      bong.add(bBody);
      const bNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.16, 7), new THREE.MeshLambertMaterial({ color: 0x3d8a6a, transparent: true, opacity: 0.65, flatShading: true }));
      bNeck.position.set(0, 0.18, -0.06); bong.add(bNeck);
      const bBowl = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }));
      bBowl.position.set(0, 0.2, -0.12); bong.add(bBowl);
      bong.position.set(0.02, -0.5, -0.7);
      bong.rotation.set(0.2, 0, 0.1);
      bong.visible = false;
      this.camera.add(bong);
      this.bongModel = bong;

      const ext = new THREE.Group();
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.34, 8), new THREE.MeshLambertMaterial({ color: 0xc42a2a, flatShading: true }));
      ext.add(tank);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), new THREE.MeshLambertMaterial({ color: 0x222222, flatShading: true }));
      nozzle.position.set(0, 0.24, -0.06); nozzle.rotation.x = 0.6; ext.add(nozzle);
      ext.position.set(0.34, -0.44, -0.7);
      ext.rotation.set(0.1, -0.1, 0.1);
      ext.visible = false;
      this.camera.add(ext);
      this.extModel = ext;
    }

    /* ---------------- input ---------------- */
    queueJump() { this.jumpBuffer = 0.16; }

    onMouseMove(dx, dy, sens) {
      if (this.dead) return;
      this.yaw -= dx * sens;
      this.pitch = U.clamp(this.pitch - dy * sens, -1.45, 1.45);
    }

    getDir() {
      const cp = Math.cos(this.pitch);
      return new THREE.Vector3(
        -Math.sin(this.yaw) * cp,
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * cp
      );
    }
    getFlatDir() {
      return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    }

    /* ---------------- per frame ---------------- */
    update(dt) {
      if (this.dead) return;
      if (this.plane) { this._updateFlying(dt); return; }
      if (this.driving) { this._updateDriving(dt); return; }
      const w = this.world, body = this.body;
      const keys = this.game.input;

      this.attackCd = Math.max(0, this.attackCd - dt);
      this.kickCd = Math.max(0, this.kickCd - dt);
      this.peeCd = Math.max(0, this.peeCd - dt);
      this.smokeCd = Math.max(0, this.smokeCd - dt);
      this.punchAnim = Math.max(0, this.punchAnim - dt * 4);
      this.shake = Math.max(0, this.shake - dt * 2.4);
      this.chickenT = Math.max(0, this.chickenT - dt);
      this.recoil = Math.max(0, this.recoil - dt * 6);
      this.kickAnim = Math.max(0, this.kickAnim - dt * 2.4);
      this.reactCd = Math.max(0, this.reactCd - dt);

      /* drunk + weed */
      this.drunk = Math.max(0, this.drunk - dt * 1.4);
      this.stoned = Math.max(0, this.stoned - dt * 0.85);
      if (this.activeDrug) {
        this.drugT -= dt;
        this.health = U.clamp(this.health + (this.drugRegen - this.drugDrain) * dt, 0, this.maxHealth);
        if (this.drugT <= 0) {
          this.activeDrug = null;
          this.drugSpeed = 1; this.drugPower = 0; this.drugDefense = 1;
          this.drugRegen = 0; this.drugDrain = 0; this.drugRoll = 0; this.drugLabel = "";
          this.game.ticker("The drugs wear off. Reality resumes.", "bad");
        }
      }
      if (this.stoned > 0) {
        this.health = Math.min(this.maxHealth, this.health + dt * 0.7);
        this.stonedTalk -= dt;
        if (this.stonedTalk <= 0 && this.stoned > 35) {
          this.stonedTalk = U.rand(10, 20);
          this.game.say("DUDE: " + U.pick(ST.jokes.stonedLines));
        }
      }
      this.game.audio.setDrunk(Math.max(this.drunk, this.stoned * 0.8) / 100);
      this.game.ui.setStoned(this.stoned / 100);

      /* movement */
      const move = new THREE.Vector3();
      if (keys["w"]) move.z -= 1;
      if (keys["s"]) move.z += 1;
      if (keys["a"]) move.x -= 1;
      if (keys["d"]) move.x += 1;
      if (move.lengthSq() > 0) move.normalize();
      const sprint = keys["shift"] && this.drunk < 70;
      this.moveSpeed = Math.hypot(this.body.velocity.x, this.body.velocity.z);
      this.sprinting = sprint;
      let speed = sprint ? 9.6 : 5.6;
      speed *= 1 - (this.drunk / 100) * 0.22;
      speed *= 1 - (this.stoned / 100) * 0.18;
      speed *= this.drugSpeed;
      const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
      const wx = move.x * cos + move.z * sin;
      const wz = -move.x * sin + move.z * cos;
      const accel = this.drunk > 60 ? 0.10 : 0.18;
      body.velocity.x += (wx * speed - body.velocity.x) * accel;
      body.velocity.z += (wz * speed - body.velocity.z) * accel;
      if (move.lengthSq() === 0 && this.grounded) {
        body.velocity.x *= 0.78;
        body.velocity.z *= 0.78;
      }

      /* jump + ground */
      const ground = this.world.ray(
        { x: body.position.x, y: body.position.y, z: body.position.z },
        { x: body.position.x, y: body.position.y - 1.35, z: body.position.z },
        ~2
      );
      this.grounded = ground && ground.hasHit && ground.hitNormalWorld.y > 0.35;
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.grounded) this.coyote = 0.12;
      else this.coyote = Math.max(0, this.coyote - dt);
      if (this.jumpBuffer > 0 && this.coyote > 0) {
        body.velocity.y = 9.4;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        ST.audio.jump();
        this.shake = Math.max(this.shake, 0.18);
      }
      if (this.grounded && !this.wasGrounded) {
        this.landTimer = 0.16;
        ST.audio.land();
        const p = new THREE.Vector3(body.position.x, 0.08, body.position.z);
        this.world.burst(p, 0x9a8f78, 7, 1.0, 0.45, 0.06);
      }
      this.landTimer = Math.max(0, this.landTimer - dt);
      this.wasGrounded = this.grounded;

      /* footsteps */
      const hspeed = Math.hypot(body.velocity.x, body.velocity.z);
      this.game.ui.setSprint(sprint && hspeed > 6.5, this.landTimer);
      if (this.grounded && hspeed > 1.2) {
        this.stepT -= dt * hspeed;
        if (this.stepT <= 0) { ST.audio.footstep(); this.stepT = 2.6; }
        this.bobT += dt * hspeed * 1.1;
      } else this.bobT += dt * 2;

      /* camera */
      const drunk = this.drunk / 100;
      const bob = this.grounded ? Math.sin(this.bobT * 2.1) * 0.035 * Math.min(1, hspeed / 6) : 0;
      const sway = Math.sin(this.bobT * 0.9) * 0.05 * drunk;
      this.camera.position.set(
        body.position.x + sway,
        body.position.y + EYE - 0.45 + bob + Math.sin(this.bobT * 1.7) * 0.015 * drunk,
        body.position.z
      );
      const shakeAmt = this.shake * 0.05;
      this.camera.position.x += U.rand(-shakeAmt, shakeAmt);
      this.camera.position.y += U.rand(-shakeAmt, shakeAmt);
      this._updateAvatar(dt);
      const punchCam = this.punchAnim * 0.018 * this.punchSide;
      if (this.thirdPerson) {
        this._thirdPersonCamera();
      } else this.camera.rotation.set(
        this.pitch + U.rand(-shakeAmt * 0.5, shakeAmt * 0.5) - this.punchAnim * 0.01,
        this.yaw + punchCam,
        Math.sin(this.bobT * 0.8) * 0.05 * drunk + (drunk > 0.75 ? Math.sin(this.bobT * 0.5) * 0.08 : 0)
          + Math.sin(this.bobT * 0.55) * 0.09 * (this.stoned / 100) + punchCam * 1.5
          + (this.activeDrug ? Math.sin(this.bobT * 1.8) * this.drugRoll : 0)
      );
      const targetFov = (sprint ? 86 : 74) + drunk * 6 + (this.stoned / 100) * 4;
      if (!this.thirdPerson && Math.abs(this.camera.fov - targetFov) > 0.2) {
        this.camera.fov += (targetFov - this.camera.fov) * 0.12;
        this.camera.updateProjectionMatrix();
      }

      this._animateViewmodel(dt);
      this._updateSmoking(dt);
      this._updateBeer(dt);
      this._updateExtinguisher(dt);
      if (this.thirdPerson) {
        [this.hand, this.fist, this.fistL, this.smokeHand, this.smokeArm, this.smokeCuff, this.beerHand, this.beerArm, this.beerCuff, this.extModel, this.chickenModel].forEach((m) => { if (m) m.visible = false; });
      }

      /* claw */
      this._updateClaw(dt);

      /* infinite pee stream */
      if (this.peeing) this._updatePee(dt);

      /* auto-pickup cash */
      for (let i = 0; i < w.cashProps.length; i++) {
        const c = w.cashProps[i];
        if (c.cashCollected) continue;
        const d = c.mesh.position.distanceTo(new THREE.Vector3(body.position.x, 0.5, body.position.z));
        if (d < 1.7) {
          c.cashCollected = true;
          this.cash += c.cashValue;
          ST.audio.cash();
          if (c.cashValue >= 5) this.game.ticker("+$" + c.cashValue + " — found money. Don't ask.", "gold");
        }
      }

      /* interaction prompt */
      const dir = this.getDir();
      const camPos = this.camera.position;
      let prompt = "";
      const nearPlane = this._nearestPlane();
      const nearCar = nearPlane ? null : this._nearestCar();
      const carVerb = nearCar && !nearCar.owned ? "STEAL THE " : "DRIVE THE ";
      if (nearPlane) prompt = "<b>[E]</b> FLY THE PLANE";
      else if (nearCar) prompt = "<b>[E]</b> " + carVerb + nearCar.name;
      const npc = this.game.npcs.focused(camPos, dir, 3.4);
      if (nearPlane) prompt = "<b>[E]</b> FLY THE PLANE";
      else if (nearCar) prompt = "<b>[E]</b> " + carVerb + nearCar.name;
      else if (npc) prompt = "<b>[E]</b> " + npc.getPrompt().replace("[E] ", "");
      else {
        const it = w.findInteractable(camPos, dir, 3.0);
        if (it) prompt = "<b>[E]</b> " + it.prompt.replace("[E] ", "");
      }
      if (this.heldProp) prompt = "<b>[RMB]</b> LAUNCH · <b>[LMB]</b> SWING";
      else if (this.heldNpc) prompt = "<b>[RMB]</b> THROW THE PERSON";
      if (prompt !== this.prompt) {
        this.prompt = prompt;
        this.game.ui.setPrompt(prompt);
      }
      this._focusedNpc = npc;
      this._focusedInteract = w.findInteractable(camPos, dir, 3.0);

      this.game.audio.setDrunk(this.drunk / 100);

      /* third person: dump every first-person body part for the frame */
      if (this.thirdPerson) {
        for (let i = 0; i < this.camera.children.length; i++) this.camera.children[i].visible = false;
      }

      /* health regen? no. dying? */
      if (this.health <= 0 && !this.dead) this.game.die();
    }

    /* ---------------- claw ---------------- */
    _updateClaw(dt) {
      if (this.heldProp) {
        if (this.heldProp.dead) { this.heldProp = null; return; }
        const target = this.camera.position.clone().addScaledVector(this.getDir(), this.holdDist);
        const rel = target.sub(this.heldProp.body.position);
        if (rel.length() > 9) { this.heldProp.grabbed = false; this.heldProp = null; return; }
        this.heldProp.body.velocity.set(rel.x * 8, rel.y * 8, rel.z * 8);
        this.heldProp.body.angularVelocity.scale(0.9, this.heldProp.body.angularVelocity);
        this.heldProp.grabbed = true;
      } else if (this.heldNpc) {
        const n = this.heldNpc;
        if (n.down || n.removed) { this.heldNpc = null; return; }
        const target = this.camera.position.clone().addScaledVector(this.getDir(), this.holdDist + 0.4);
        target.y = Math.max(1.2, target.y - 0.3);
        const rel = target.clone().sub(n.body.position);
        if (rel.length() > 10) { n.held = false; this.heldNpc = null; return; }
        n.body.velocity.set(rel.x * 5, rel.y * 5, rel.z * 5);
        n.held = true;
        n.state = "flee";
      }
    }

    clawDown() {
      if (this.dead) return;
      if (this.heldProp || this.heldNpc) { this.clawRelease(); return; }
      const from = this.camera.position.clone();
      const to = from.clone().addScaledVector(this.getDir(), 24);
      const res = this.world.ray(from, to, ~2);
      if (!res.hasHit) { ST.audio.whoosh(); return; }
      const hp = new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z);
      const npc = this.game.npcs.npcByBody[res.body.id];
      if (npc) {
        if (npc.kind === "bouncer" || npc.health > 220) {
          npc.damage(6, hp, "claw");
          ST.audio.thunk();
          this.game.shake(0.25);
          this.game.ticker("Too heavy. Like your choices.", "bad");
          return;
        }
        this.heldNpc = npc;
        this.clawCount += 1;
        npc.held = true;
        npc.state = "flee";
        ST.audio.whoosh();
        this.game.ticker("You are holding a person. Breathe.", "bad");
        return;
      }
      const prop = this.world.propByBody[res.body.id];
      if (prop && !prop.dead) {
        if (prop.static && prop.body.mass === 0) {
          this.world.damageProp(prop, 12, hp, { x: 0, y: 0, z: 0 });
          ST.audio.thunk();
          return;
        }
        this.heldProp = prop;
        this.clawCount += 1;
        prop.grabbed = true;
        ST.audio.whoosh();
        this.game.ticker("Claw engaged. Do something stupid with it.", "gold");
      } else {
        this.world.burst(hp, 0xcccccc, 3, 1.2, 0.3, 0.05);
        ST.audio.thunk();
      }
    }

    clawRelease() {
      if (this.heldProp) {
        const p = this.heldProp;
        const dir = this.getDir();
        p.grabbed = false;
        p.body.velocity.set(dir.x * 26, dir.y * 26 + 3, dir.z * 26);
        p.body.angularVelocity.set(U.rand(-8, 8), U.rand(-8, 8), U.rand(-8, 8));
        this.heldProp = null;
        ST.audio.whoosh();
        this.game.addRespect(2, "punch");
        this.game.addWanted(0.15);
      } else if (this.heldNpc) {
        const n = this.heldNpc;
        const dir = this.getDir();
        n.held = false;
        n.body.velocity.set(dir.x * 18, dir.y * 18 + 4, dir.z * 18);
        n.damage(22, this.body.position, "claw");
        this.heldNpc = null;
        ST.audio.whoosh();
        this.game.addRespect(6, "punch");
        this.game.addWanted(0.5);
        this.game.ticker("You threw a whole person. Respect.", "gold");
      }
    }

    /* ---------------- combat ---------------- */
    _animateViewmodel(dt) {
      const p = this.punchAnim;
      const k = p > 0 ? Math.sin(Math.min(1, (1 - p) * 1.08) * Math.PI) : 0;
      const fists = this.weapon === "fists" && this.kickAnim <= 0.01;
      const sp = this.moveSpeed || 0;
      const run = Math.min(1, sp / 7);
      const swing = Math.sin(this.bobT * (this.sprinting ? 2.6 : 2.1)) * run;
      const breath = Math.sin(this.bobT * 0.7) * 0.006;
      const dip = this.landTimer > 0 ? -this.landTimer * 0.55 : 0;
      const rightActive = this.punchSide === 1;
      if (this.fist) {
        const animate = (f, base, active, dir, bobPhase) => {
          const a = active ? k : k * 0.18;
          f.position.set(
            base.pos.x - a * 0.22 * dir + swing * 0.03 * dir,
            base.pos.y + a * 0.16 + Math.sin(this.bobT * 2.1 + bobPhase) * 0.01 - swing * 0.05 + dip + breath,
            base.pos.z - a * 0.18 + swing * 0.035
          );
          f.rotation.set(
            base.rot.x - a * 1.05 + swing * 0.12,
            base.rot.y + a * 0.38 * dir,
            base.rot.z + a * 0.62 * dir + swing * 0.05
          );
          f.visible = fists;
        };
        animate(this.fist, this.fistBase, rightActive, 1, 0);
        if (this.fistL) animate(this.fistL, this.fistLBase, !rightActive, -1, 1.7);
      }
      const h = this.hand, base = this.handBase;
      h.position.set(
        base.pos.x - k * 0.06 * this.punchSide + swing * 0.02,
        base.pos.y + k * 0.05 + Math.sin(this.bobT * 2.1) * 0.008 - swing * 0.045 + dip + breath,
        base.pos.z - k * 0.12 + this.recoil * 0.05 + swing * 0.03
      );
      h.rotation.set(
        base.rot.x - k * 0.35 + this.recoil * 0.12,
        base.rot.y + k * 0.2 * this.punchSide,
        base.rot.z + k * 0.25 * this.punchSide
      );
      h.visible = this.weapon !== "fists";
      if (this.boot) {
        const kb = this.kickAnim;
        if (kb > 0) {
          const e = Math.sin(Math.min(1, (1 - kb) * 1.15) * Math.PI);
          this.boot.visible = true;
          this.boot.position.set(0.02, -1.02 + e * 0.82 + dip, -0.5 - e * 0.5);
          this.boot.rotation.set(1.0 - e * 0.75, 0.05, e * 0.08);
          this.boot.scale.setScalar(0.92 + e * 0.12);
        } else {
          this.boot.visible = false;
        }
      }
      const ch = this.chickenModel;
      ch.visible = this.chickenT > 0;
      if (ch.visible) {
        const t = performance.now() / 1000;
        const s = 1 + Math.sin(t * 38) * 0.09;
        ch.scale.set(s * 0.38, (2 - s) * 0.38, s * 0.38);
        ch.position.x = -0.36 + Math.sin(t * 21) * 0.015;
        ch.rotation.z = -0.1 + Math.sin(t * 26) * 0.14;
      }
    }

    attack() {
      if (this.dead) return;
      if (this.beerHeld) return this.swig();
      if (this.smoking) return this.drag();
      if (this.weapon === "pistol" || this.weapon === "shotgun") return this.shoot(this.weapon);
      return this.melee(this.weapon);
    }

    drag() {
      if (!this.smoking) return false;
      if (this.dragAnim > 0.25) return true;
      this.dragAnim = 1;
      this.dragExhaled = false;
      this.dragCount = (this.dragCount || 0) + 1;
      this.smoking.t -= 1;
      const type = this.smoking.type;
      if (type === "cig") this.health = Math.min(this.maxHealth, this.health + 2);
      if (type === "joint" || type === "blunt") {
        this.stoned = U.clamp(this.stoned + (type === "blunt" ? 10 : 7), 0, 100);
        this.health = Math.min(this.maxHealth, this.health + 1);
      }
      ST.audio.inhale();
      this.game.addRespect(1, "drink");
      if (this.smoking.t <= 0) this.smoking.burnout = true;
      return true;
    }

    punch() { this.melee("fists"); }
    kick() {
      if (this.dead || this.kickCd > 0) return;
      this.kickCd = 0.8;
      this.punchAnim = 1;
      this.kickAnim = 1;
      this.punchSide *= -1;
      ST.audio.whoosh();
      const dir = this.getDir();
      const from = this.camera.position.clone();
      const npcs = this.game.npcs.all;
      let hit = false;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down) continue;
        const d = new THREE.Vector3(n.body.position.x, 1.2, n.body.position.z).sub(from);
        if (d.length() < 2.8 && d.normalize().dot(dir) > 0.5) {
          n.damage(18, from, "kick");
          n.body.velocity.x += dir.x * 8;
          n.body.velocity.y += 3;
          n.body.velocity.z += dir.z * 8;
          this.game.shake(0.5);
          this.game.ui.hitmarker();
          this.game.addRespect(2, "punch");
          this.game.addWanted(0.4);
          this.game.crime();
          hit = true;
          break;
        }
      }
      if (!hit) {
        const res = this.world.ray(from, from.clone().addScaledVector(dir, 2.6), ~2);
        if (res.hasHit) {
          const prop = this.world.propByBody[res.body.id];
          if (prop) {
            this.world.damageProp(prop, 24, new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z), { x: dir.x * 14, y: 5, z: dir.z * 14 });
            this.game.shake(0.3);
          }
        }
      }
      if (this.game.dude) this.game.dude(U.pick(["Boot to the head!", "This is my town.", "Get off my sidewalk."]));
    }

    melee(kind) {
      if (this.dead || this.attackCd > 0) return;
      const cfg = {
        fists: { dmg: 28, reach: 2.4, cd: 0.40, name: "fists" },
        bat: { dmg: 62, reach: 3.0, cd: 0.55, name: "bat" },
        shovel: { dmg: 52, reach: 2.8, cd: 0.62, name: "shovel" },
        petition: { dmg: 6, reach: 2.2, cd: 0.5, name: "petition" }
      }[kind] || { dmg: 28, reach: 2.4, cd: 0.4, name: "fists" };
      this.attackCd = cfg.cd * (this.activeDrug === "coke" ? 0.62 : 1);
      this.punchCount += 1;
      this.punchAnim = 1;
      this.punchSide *= -1;
      ST.audio.whoosh();
      const dir = this.getDir();
      const from = this.camera.position.clone();
      const reach = this.heldProp ? cfg.reach + 0.6 : cfg.reach;
      const to = from.clone().addScaledVector(dir, reach);
      const res = this.world.ray(from, to, ~2);
      let hitAnything = false;
      if (res.hasHit) {
        const hp = new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z);
        const npc = this.game.npcs.npcByBody[res.body.id];
        const prop = this.world.propByBody[res.body.id];
        if (npc) {
          const dmg = cfg.dmg + (this.heldProp ? 12 : 0) + (this.drunk > 55 ? 10 : 0) + (this.stoned > 55 ? 6 : 0) + this.drugPower;
          npc.damage(dmg, from, kind);
          npc.state = (npc.kind === "cop" || npc.kind === "bouncer" || npc.kind === "security") ? "attack" : "flee";
          ST.audio.punch(dmg > 34);
          this.game.shake(kind === "fists" ? 0.45 : 0.65);
          this.game.ui.hitmarker();
          this.game.addRespect(kind === "petition" ? 4 : 2, "punch");
          this.game.addWanted(0.35);
          this.game.crime();
          if (this.game.dude && U.chance(0.18)) {
            this.game.dude(U.pick(ST.jokes.dudeMelee));
          }
          hitAnything = true;
        } else if (prop) {
          const dmg = cfg.dmg + (this.heldProp ? 18 : 0) + (this.drunk > 55 ? 8 : 0);
          const imp = { x: dir.x * (cfg.dmg > 40 ? 16 : 10), y: dir.y * 6 + 3, z: dir.z * (cfg.dmg > 40 ? 16 : 10) };
          this.world.damageProp(prop, dmg, hp, imp);
          ST.audio.punch(true);
          this.game.shake(kind === "fists" ? 0.35 : 0.5);
          this.game.addRespect(1, "punch");
          this.game.addWanted(0.05);
          hitAnything = true;
        } else {
          this.world.burst(hp, 0xcfc2a0, 3, 1.5, 0.35, 0.05);
          ST.audio.thunk();
          this.game.shake(0.15);
        }
      }
      if (!hitAnything) {
        const npcs = this.game.npcs.all;
        for (let i = 0; i < npcs.length; i++) {
          const n = npcs[i];
          if (n.down) continue;
          const d = new THREE.Vector3(n.body.position.x, 1.2, n.body.position.z).sub(from);
          const dist = d.length();
          if (dist < reach + 0.2 && d.normalize().dot(dir) > 0.55) {
            n.damage(cfg.dmg, from, kind);
            n.state = "flee";
            ST.audio.punch(true);
            this.game.ui.hitmarker();
            this.game.addRespect(2, "punch");
            this.game.addWanted(0.35);
            this.game.crime();
            break;
          }
        }
      }
      if (kind === "petition" && this.game.dude) this.game.dude("Would you like to sign my petition?");
      if (ST.mp) ST.mp.tryHit(from, dir, cfg.dmg);
    }

    shoot(type) {
      if (this.dead || this.attackCd > 0) return;
      if ((this.ammo[type] || 0) <= 0) {
        this.game.ticker("Click. Out of ammo. Switch to something you can afford.", "bad");
        this.switchWeapon("fists");
        return;
      }
      const pistol = type === "pistol";
      this.attackCd = pistol ? 0.26 : 0.85;
      this.ammo[type] -= 1;
      this.punchAnim = 1;
      this.punchSide *= -1;
      this.recoil = 1;
      ST.audio.gunshot();
      this.game.shake(pistol ? 0.35 : 0.75);
      const baseDir = this.getDir();
      const origin = this.camera.position.clone();
      const pellets = pistol ? 1 : 8;
      let hitNpc = false;
      for (let i = 0; i < pellets; i++) {
        const spread = pistol ? 0.012 : 0.065;
        const dir = baseDir.clone().add(new THREE.Vector3(
          U.rand(-spread, spread), U.rand(-spread, spread), U.rand(-spread, spread)
        )).normalize();
        const to = origin.clone().addScaledVector(dir, 70);
        const res = this.world.ray(origin, to, ~2);
        let endPoint = to;
        if (res.hasHit) {
          endPoint = new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z);
          const npc = this.game.npcs.npcByBody[res.body.id];
          const prop = this.world.propByBody[res.body.id];
          if (npc) {
            npc.damage(pistol ? 36 : 16, this.body.position, "gun");
            npc.state = (npc.kind === "cop" || npc.kind === "bouncer" || npc.kind === "security") ? "attack" : "flee";
            this.game.addRespect(3, "punch");
            hitNpc = true;
          } else if (prop) {
            this.world.damageProp(prop, pistol ? 30 : 14, endPoint, { x: dir.x * 8, y: 2, z: dir.z * 8 });
          } else {
            this.world.burst(endPoint, 0xcfc2a0, 2, 1.2, 0.3, 0.04);
          }
        }
        this.game.spawnTracer(origin, endPoint);
      }
      this.game.addWanted(pistol ? 0.9 : 1.5);
      this.game.crime();
      if (hitNpc) this.game.ui.hitmarker();
      if (this.game.dude && U.chance(0.3)) {
        this.game.dude(U.pick(["Say hello to my little friend.", "That's one way to solve a problem.", "I'm the good guy here."]));
      }
      this.game.ui.updateWeapon(this);
    }

    switchWeapon(type) {
      if (!this.owned[type]) {
        this.game.ticker("You don't have that weapon. Find one, or take it off somebody.", "bad");
        return;
      }
      if (type !== "fists" && this.smoking) this.clearSmoking();
      if (type !== "fists" && this.beerHeld) this.clearBeer();
      this.weapon = type;
      this.updateWeaponModel();
      this.game.ui.updateWeapon(this);
      ST.audio.click();
      if (type !== "fists") this.game.ticker("Weapon: " + this.weaponLabel(type), "gold");
    }

    weaponLabel(type) {
      return { fists: "FISTS", bat: "BASEBALL BAT", shovel: "SHOVEL", pistol: "PISTOL", shotgun: "SHOTGUN", petition: "PETITION CLIPBOARD" }[type] || "FISTS";
    }

    giveWeapon(type, ammo) {
      if (type !== "fists") { this.clearSmoking(); this.clearBeer(); }
      const had = this.owned[type];
      this.owned[type] = true;
      if (type === "pistol" || type === "shotgun") {
        this.ammo[type] = (this.ammo[type] || 0) + (ammo || (type === "pistol" ? 12 : 8));
      }
      this.weapon = type;
      this.updateWeaponModel();
      this.game.ui.updateWeapon(this);
      this.game.ticker((had ? "Picked up ammo: " : "Picked up: ") + this.weaponLabel(type), "gold");
      if (!had) this.game.ticker("Press 1–5 to switch weapons.", "gold");
      ST.audio.cash();
      if (this.game.dude) this.game.dude(U.pick(["Now we're talking.", "This'll do.", "I feel safer already.", "America."]));
    }

    updateWeaponModel() {
      if (!this.weaponModels) return;
      for (const key in this.weaponModels) this.weaponModels[key].visible = (key === this.weapon);
      const fists = this.weapon === "fists";
      if (this.fingers) this.fingers.forEach((f) => (f.visible = !fists));
      if (this.thumb) this.thumb.visible = !fists;
      if (this.knuckles) this.knuckles.visible = false;
      if (this.hand) this.hand.visible = !fists;
      if (this.fist) this.fist.visible = fists;
      if (this.fistL) this.fistL.visible = fists;
    }

    kick() {
      if (this.dead || this.kickCd > 0) return;
      this.kickCd = 0.8;
      this.punchAnim = -1;
      ST.audio.whoosh();
      const dir = this.getDir();
      const from = this.camera.position.clone();
      const npcs = this.game.npcs.all;
      let hit = false;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down) continue;
        const d = new THREE.Vector3(n.body.position.x, 1.2, n.body.position.z).sub(from);
        if (d.length() < 2.8 && d.normalize().dot(dir) > 0.5) {
          n.damage(16, from, "kick");
          n.body.velocity.x += dir.x * 7;
          n.body.velocity.y += 3;
          n.body.velocity.z += dir.z * 7;
          this.game.shake(0.5);
          this.game.ui.hitmarker();
          this.game.addRespect(2, "punch");
          this.game.addWanted(0.4);
          hit = true;
          break;
        }
      }
      if (!hit) {
        const res = this.world.ray(from, from.clone().addScaledVector(dir, 2.6), ~2);
        if (res.hasHit) {
          const prop = this.world.propByBody[res.body.id];
          if (prop) {
            this.world.damageProp(prop, 24, new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z), { x: dir.x * 14, y: 5, z: dir.z * 14 });
            this.game.shake(0.3);
          }
        }
      }
      this.game.tickerIf(U.chance(0.25), "Kicked like a man with nothing to lose.");
    }

    /* ---------------- consumables ---------------- */
    vape() {
      if (this.smoking && this.smoking.type === "vape") {
        this.smoking = null;
        this.game.ticker("You put the vape away. The cloud does not.", "bad");
        return;
      }
      this.smoking = { type: "vape", t: 14 };
      this.puffT = 0;
      this.puffExhaled = false;
      this.dragAnim = 0;
      this.dragExhaled = false;
      this.smokeStreamT = 0;
      if (this.smokeHand) this.smokeHand.visible = true;
      if (this.vapeModel) this.vapeModel.visible = true;
      if (this.cigModel) this.cigModel.visible = false;
      if (this.jointModel) this.jointModel.visible = false;
      if (this.bluntModel) this.bluntModel.visible = false;
      this.smokePuffT = 0;
      this.smokeTalkT = 2;
      this.game.addRespect(1, "drink");
      this.game.ticker("Vape out. LEFT-CLICK to rip it. It tastes like blue raspberry and regret.", "gold");
      this._secondhand(false);
    }

    _secondhand(weed) {
      if (this.reactCd > 0 && !weed) return;
      this.reactCd = weed ? 2.2 : 3.5;
      const p = this.body.position;
      this.game.npcs.reactToSmoke({ x: p.x, z: p.z }, !!weed);
    }

    smokeWeed() {
      if (this.smoking && this.smoking.type === "joint") {
        this.smoking = null;
        if (this.jointModel) this.jointModel.visible = false;
        this.game.ticker("You stub the joint out. Wasteful.", "bad");
        return;
      }
      if (this.weed <= 0) {
        this.game.ticker("No weed. 420 Depot is on the east side, past the sidewalk of regret.", "bad");
        return;
      }
      if (this.papers <= 0 && this.wraps <= 0) {
        this.game.ticker("No papers or blunt wraps. 420 Depot sells both. Or check the house.", "bad");
        return;
      }
      const blunt = this.wraps > 0;
      if (blunt) this.wraps -= 1; else this.papers -= 1;
      this.weed -= 1;
      this.stoned = U.clamp(this.stoned + (blunt ? 48 : 34), 0, 100);
      this.health = Math.min(this.maxHealth, this.health + 3);
      this.smoking = { type: blunt ? "blunt" : "joint", t: blunt ? 10 : 12 };
      this.puffT = 0;
      this.puffExhaled = false;
      this.dragAnim = 0;
      this.dragExhaled = false;
      this.smokeStreamT = 0;
      if (this.smokeHand) this.smokeHand.visible = true;
      if (this.jointModel) this.jointModel.visible = !blunt;
      if (this.bluntModel) this.bluntModel.visible = blunt;
      if (this.cigModel) this.cigModel.visible = false;
      if (this.vapeModel) this.vapeModel.visible = false;
      this.smokePuffT = 0;
      this.smokeTalkT = 3;
      ST.audio.lighter();
      this.game.addRespect(blunt ? 3 : 2, "drink");
      this.game.ticker(blunt ? "Blunt out. LEFT-CLICK to hit it." : "Joint out. LEFT-CLICK to hit it.", "gold");
      if (this.game.dude) this.game.dude(U.pick(["This is some good shit.", "I can hear colors.", "Everything is fine.", "I'm not paranoid, you're paranoid."]));
      this.game.ui.updateHUD(this);
      this._secondhand(true);
    }

    _updateSmoking(dt) {
      const hand = this.smokeHand;
      if (!hand) return;
      hand.visible = !!this.smoking;
      if (this.smoking) {
        if (this.fist) this.fist.visible = false;
        if (this.fistL) this.fistL.visible = false;
        if (this.hand) this.hand.visible = false;
      }
      if (!this.smoking) {
        if (this.cigModel) this.cigModel.visible = false;
        if (this.jointModel) this.jointModel.visible = false;
        if (this.bluntModel) this.bluntModel.visible = false;
        if (this.vapeModel) this.vapeModel.visible = false;
        if (this.smokeArm) this.smokeArm.visible = false;
        if (this.smokeFore) this.smokeFore.visible = false;
        if (this.smokeRig) { this.smokeRig.upper.visible = false; this.smokeRig.fore.visible = false; this.smokeRig.elbow.visible = false; this.smokeRig.cuff.visible = false; }
        if (this.smokeCuff) this.smokeCuff.visible = false;
        if (this.bongModel) {
          this.bongT = Math.max(0, this.bongT - dt);
          this.bongModel.visible = this.bongT > 0;
          if (this.bongModel.visible) {
            const t = performance.now() / 1000;
            this.bongModel.position.y = -0.5 + Math.sin(t * 4) * 0.02;
            this.bongModel.rotation.z = 0.1 + Math.sin(t * 3) * 0.06;
          }
        }
        return;
      }
      const type = this.smoking.type;
      const vape = type === "vape", blunt = type === "blunt", joint = type === "joint";
      if (this.cigModel) this.cigModel.visible = type === "cig";
      if (this.jointModel) this.jointModel.visible = joint;
      if (this.bluntModel) this.bluntModel.visible = blunt;
      if (this.vapeModel) this.vapeModel.visible = vape;
      if (this.bongModel) this.bongModel.visible = false;

      // Drag-driven: no automatic puffing. Click to inhale.
      this.dragAnim = Math.max(0, this.dragAnim - dt / 0.85);
      const dragP = 1 - this.dragAnim;
      let raise;
      if (this.dragAnim <= 0) raise = 0;
      else if (dragP < 0.28) raise = dragP / 0.28;
      else if (dragP < 0.7) raise = 1;
      else raise = 1 - (dragP - 0.7) / 0.3;
      raise = raise * raise * (3 - 2 * raise);
      const b = this.smokeHandBase;
      hand.position.set(
        U.lerp(b.pos.x, -0.2, raise),
        U.lerp(b.pos.y, -0.36, raise),
        U.lerp(b.pos.z, -0.66, raise)
      );
      hand.rotation.set(
        U.lerp(b.rot.x, 0.32, raise),
        U.lerp(b.rot.y, 0.16, raise),
        U.lerp(b.rot.z, -0.08, raise)
      );
      if (this.smokeRig) {
        const shoulder = new THREE.Vector3(-0.34, -0.86, -0.42);
        const bend = new THREE.Vector3(-0.6, -0.5, -0.35);
        const wrist = hand.position.clone();
        this.smokeRig.upper.visible = true;
        this.smokeRig.fore.visible = true;
        this.smokeRig.elbow.visible = true;
        this.smokeRig.cuff.visible = true;
        this._poseArm(this.smokeRig, shoulder, wrist, bend);
      }
      const ember = vape ? this.vapeLed : blunt ? this.bluntEmber : joint ? this.jointEmber : this.cigEmber;
      if (ember) {
        const s = 1 + Math.sin(performance.now() / 70) * 0.22 * raise;
        ember.scale.setScalar(s);
      }
      this.smokeStreamT -= dt;
      if (this.smokeStreamT <= 0 && raise > 0.12 && ember) {
        this.smokeStreamT = 0.2;
        const ep = new THREE.Vector3();
        ember.getWorldPosition(ep);
        const color = vape ? 0xb8d8e8 : blunt ? 0xc8b08a : joint ? 0xa8d89a : 0xbfbfbf;
        this.world.smokePuff(ep, color, vape ? 4 : 2, vape ? 0.45 : joint || blunt ? 0.32 : 0.25);
      }
      this.mouthPuffT -= dt;
      if (raise > 0.35 && this.mouthPuffT <= 0 && U.chance(0.25)) {
        this._secondhand(joint || blunt);
      }
      if (raise > 0.35 && this.mouthPuffT <= 0) {
        this.mouthPuffT = 0.32;
        const mp = this.camera.position.clone().addScaledVector(this.getDir(), 0.6);
        mp.y -= 0.15;
        this.world.smokePuff(mp, vape ? 0xb8d8e8 : blunt ? 0xc8b08a : joint ? 0xa8d89a : 0xbfbfbf,
          vape ? 4 : 2, vape ? 0.35 : 0.22);
      }
      if (this.puffT >= 0.52 && this.puffT < 0.66 && !this.puffExhaled) {
        this.dragExhaled = true;
        this._secondhand(joint || blunt);
        const pos = this.camera.position.clone().addScaledVector(this.getDir(), 0.75);
        pos.y -= 0.1;
        const color = vape ? 0xb8d8e8 : blunt ? 0xc8b08a : joint ? 0xa8d89a : 0xbfbfbf;
        this.world.smokePuff(pos, color, vape ? 16 : blunt ? 12 : joint ? 10 : 8, vape ? 0.6 : blunt ? 0.5 : joint ? 0.42 : 0.35);
        if (type === "cig" && U.chance(0.35)) ST.audio.cough();
      }
      this.smokeTalkT -= dt;
      if (this.smokeTalkT <= 0) {
        this.smokeTalkT = U.rand(8, 16);
        const near = this.game.npcs.all.find((n) => !n.down &&
          Math.hypot(n.body.position.x - this.body.position.x, n.body.position.z - this.body.position.z) < 7);
        if (near) {
          near.say(U.pick(joint || blunt
            ? ["Is that... legal?", "Can I get a hit?", "I'm calling the HOA.", "That smells like my uncle's van.", "Share?"]
            : vape
              ? ["That's not smoke, that's a personality.", "My cousin vapes. He's a DJ.", "Nice cloud, bro.", "Is that mango?"]
              : ["Those'll kill you.", "Can I bum one?", "My mom smokes those.", "That's a nasty habit."]));
          if ((joint || blunt) && near.kind === "cop") this.game.addWanted(0.25);
          else this.game.addRespect(1, "drink");
        }
      }
      if (this.smoking.t <= 0 && this.dragAnim <= 0.01) {
        const was = this.smoking.type;
        this.clearSmoking();
        this.game.ticker(was === "vape" ? "Vape finished. The cloud dissipates. Your personality remains." : was === "blunt" ? "Blunt finished. You are now part of the couch." : was === "joint" ? "Joint finished. You feel normal-ish." : "Cigarette finished. You feel incredibly cool.", "gold");
      }
    }

    clearSmoking() {
      this.smoking = null;
      this.bongT = 0;
      this.kickAnim = 0;
      this.beerT = 0;
      this.beerGulped = false;
      this.beerBurped = false;
      this.puffT = 0;
      this.puffExhaled = false;
      if (this.smokeHand) this.smokeHand.visible = false;
      if (this.smokeArm) this.smokeArm.visible = false;
      if (this.smokeFore) this.smokeFore.visible = false;
      if (this.smokeRig) { this.smokeRig.upper.visible = false; this.smokeRig.fore.visible = false; this.smokeRig.elbow.visible = false; this.smokeRig.cuff.visible = false; }
      if (this.smokeCuff) this.smokeCuff.visible = false;
      if (this.cigModel) this.cigModel.visible = false;
      if (this.jointModel) this.jointModel.visible = false;
      if (this.bluntModel) this.bluntModel.visible = false;
      if (this.vapeModel) this.vapeModel.visible = false;
      if (this.bongModel) this.bongModel.visible = false;
    }

    startExtinguish() {
      if (!this.hasExtinguisher) {
        this.game.ticker("No extinguisher. Find one in the bar or the mall.", "bad");
        return;
      }
      this.spraying = true;
      this.sprayT = 0;
      if (this.extModel) this.extModel.visible = true;
      ST.audio.spray();
    }
    stopExtinguish() {
      this.spraying = false;
      if (this.extModel) this.extModel.visible = false;
    }
    _updateExtinguisher(dt) {
      if (this.extModel) this.extModel.visible = this.spraying;
      if (!this.spraying) return;
      if (!this.game.input["x"]) { this.stopExtinguish(); return; }
      this.sprayT -= dt;
      if (this.sprayT > 0) return;
      this.sprayT = 0.09;
      const dir = this.getDir();
      const pos = this.camera.position.clone().addScaledVector(dir, 3.2);
      pos.y = Math.max(0.3, pos.y);
      this.world.extinguishAt(pos, 3.6);
      this.world.burst(pos, 0xdfe8e8, 4, 1.4, 0.5, 0.06);
      const npcs = this.game.npcs.all;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down) continue;
        if (n.burning > 0 && new THREE.Vector3(n.body.position.x, 1, n.body.position.z).distanceTo(pos) < 3.6) {
          n.extinguish();
          this.game.addRespect(4, "pee");
        }
        const d = new THREE.Vector3(n.body.position.x, 1, n.body.position.z).sub(this.camera.position);
        if (d.length() < 3.8 && d.normalize().dot(dir) > 0.75 && U.chance(0.3)) {
          n.state = "flee";
          n.say(U.pick(["NOT IN THE FACE!", "I'M WET!", "IS THIS PEPPER SPRAY?", "I JUST DID MY HAIR."]));
        }
      }
      if (U.chance(0.5)) ST.audio.spray();
    }
    throwWater() {
      if (this.water <= 0) {
        this.game.ticker("No water bottles. Check the cooler in the bar.", "bad");
        return;
      }
      this.water -= 1;
      const dir = this.getDir();
      const from = this.camera.position.clone();
      const to = from.clone().addScaledVector(dir, 9);
      const res = this.world.ray(from, to, ~2);
      const point = res.hasHit ? new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z) : to;
      ST.audio.splash();
      this.world.burst(point, 0x9fd4ff, 16, 2.4, 0.8, 0.08);
      this.world.extinguishAt(point, 3.2);
      const npc = res.hasHit ? this.game.npcs.npcByBody[res.body.id] : null;
      if (npc && !npc.down) {
        npc.extinguish();
        npc.vomit();
        npc.say(U.pick(["WHO THREW THAT?", "MY SHIRT!", "I'M CALLING THE POLICE.", "IT'S IN MY EYES."]));
        this.game.addRespect(4, "pee");
      }
      this.game.addRespect(1, "pee");
      this.game.ticker("Water bottle thrown. Hydration with attitude.", "gold");
      this.game.ui.updateHUD(this);
    }

    bongHit() {
      if (this.weed <= 0) {
        this.game.ticker("The bong is empty. Tragic. Go buy weed.", "bad");
        return;
      }
      this.weed -= 1;
      this.stoned = U.clamp(this.stoned + 60, 0, 100);
      this.health = Math.min(this.maxHealth, this.health + 6);
      ST.audio.bong(true);
      this.bongT = 3.2;
      this.world.burst(new THREE.Vector3(this.camera.position.x, this.camera.position.y, this.camera.position.z)
        .addScaledVector(this.getDir(), 0.9), 0xc8e8c0, 24, 1.2, 2.4, 0.09);
      this.world.smokePuff(this.camera.position.clone().addScaledVector(this.getDir(), 0.8), 0xc8e8c0, 20, 0.5);
      this.game.addRespect(4, "drink");
      this.game.ticker("Bong ripped. You are now legally a houseplant.", "gold");
      this.game.shake(0.2);
      if (this.game.dude) this.game.dude(U.pick(["Cough. Cough. Worth it.", "I have achieved nothing and everything.", "Dude."]));
      this.game.ui.updateHUD(this);
    }

    squeak() {
      this.chickenT = 2.2;
      ST.audio.squeak();
      this.game.addRespect(1, "punch");
      this.game.addWanted(0.08);
      const npcs = this.game.npcs.all;
      let reacted = 0;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down) continue;
        const d = Math.hypot(n.body.position.x - this.body.position.x, n.body.position.z - this.body.position.z);
        if (d > 16) continue;
        reacted++;
        if (n.kind === "cop" || n.kind === "security" || n.kind === "bouncer") {
          n.state = "attack";
          n.say(U.pick(["PUT THE CHICKEN DOWN!", "THAT'S ANNOYING, SIR!", "I WILL TASE YOU!"]));
        } else if (U.chance(0.55)) {
          n.state = "flee";
          if (U.chance(0.35)) n.say(U.pick(["WHAT IS WRONG WITH YOU?", "I'M CALLING THE COPS!", "MY EARS!", "IS THAT A CHICKEN?"]));
        }
        if (reacted >= 4) break;
      }
      this.game.ticker("SQUEAK. " + (reacted ? reacted + " people now hate you a little more." : "Nobody heard. Tragic."), "gold");
      if (this.game.dude) this.game.dude(U.pick(["Squeak.", "The chicken is my therapist.", "This is a warning."]));
    }

    useDrug(name) {
      const defs = {
        juice: { t: 20, speed: 1.18, power: 8, defense: 1, regen: 1.4, drain: 0, roll: 0, label: "JUICE", line: "You feel enormous. Your veins have opinions." },
        coke: { t: 14, speed: 1.35, power: 5, defense: 0.9, regen: 0, drain: 0.7, roll: 0.025, label: "COKE", line: "Your heart is a drum solo. Everything is important." },
        xans: { t: 18, speed: 0.78, power: 0, defense: 0.55, regen: 1.2, drain: 0, roll: 0.055, label: "XANS", line: "Everything is fine. Everything is fine. Everything is fine." },
        kpin: { t: 20, speed: 0.65, power: 0, defense: 0.5, regen: 1.5, drain: 0, roll: 0.075, label: "K-PINS", line: "You are a puddle with a pulse." },
        quaalude: { t: 15, speed: 0.5, power: 0, defense: 0.6, regen: 2.0, drain: 0, roll: 0.11, label: "QUAALUDES", line: "The floor is a suggestion. Gravity is a rumor." }
      };
      const d = defs[name];
      if (!d) return;
      if (!this.drugs[name] || this.drugs[name] <= 0) {
        this.game.ticker("You're out of " + d.label + ". Find the dealer.", "bad");
        return;
      }
      this.drugs[name] -= 1;
      this.activeDrug = name;
      this.drugT = d.t;
      this.drugSpeed = d.speed;
      this.drugPower = d.power;
      this.drugDefense = d.defense;
      this.drugRegen = d.regen;
      this.drugDrain = d.drain;
      this.drugRoll = d.roll;
      this.drugLabel = d.label;
      ST.audio.pill();
      this.game.addRespect(2, "drink");
      this.game.ticker(d.label + " — " + d.line, "gold");
      if (this.game.dude) this.game.dude(U.pick(["I'm fine. I'm fine. I'm fine.", "This was a great idea.", "I can feel my teeth.", "Worth it."]));
      this.game.ui.updateHUD(this);
    }

    drink() {
      if (this.beer <= 0) {
        this.game.ticker("You're out of beer. This is an emergency.", "bad");
        return;
      }
      if (!this.beerHeld) this.pullBeer();
      this.swig();
    }

    pullBeer(auto) {
      if (this.weapon && this.weapon !== "fists") {
        this.weapon = "fists";
        this.updateWeaponModel();
        this.game.ui.updateWeapon(this);
      }
      this.beer = Infinity;
      this.beerStock = Math.max(12, this.beerStock || 12);
      if (this.beerHeld) return;
      this.beerHeld = true;
      this.beerSips = 4;
      this.beerT = 0;
      this.beerAutoT = 0;
      this.clearSmoking();
      if (this.beerHand) this.beerHand.visible = true;
      if (this.beerRig) {
        this.beerRig.upper.visible = true;
        this.beerRig.fore.visible = true;
        this.beerRig.elbow.visible = true;
        this.beerRig.cuff.visible = true;
      }
      this.game.ticker(auto ? "SMASH. You pull another cold one out of your back pocket. (" + this.beerStock + " left)" : "Beer out. LEFT-CLICK to drink it. Four swigs per bottle.", "gold");
    }

    swig() {
      if (!this.beerHeld) { this.pullBeer(); return; }
      if (this.beerT > 0.05) return;
      if (this.beerSips <= 0) { this.smashBeer(); return; }
      this.beerSips -= 1;
      this.beerT = 1.15;
      this.beerGulped = false;
      this.beerBurped = false;
      this.drunk = U.clamp(this.drunk + 15, 0, 100);
      this.bladder = U.clamp(this.bladder + 13, 0, 100);
      this.game.addRespect(1, "drink");
      this.game.ticker(U.pick(ST.jokes.ticker.drink), "gold");
      if (this.drunk > 85 && U.chance(0.4)) this.game.say("You are legally a hazard now.");
      this.game.ui.updateHUD(this);
      this._updateBeer(0);
    }

    smashBeer() {
      if (!this.beerHeld) return;
      const dir = this.getDir();
      const pos = this.camera.position.clone().addScaledVector(dir, 1.3);
      pos.y = Math.max(0.15, pos.y - 0.7);
      this.beerHeld = false;
      this.beerSips = 0;
      this.beerT = 0;
      if (this.beerHand) this.beerHand.visible = false;
      if (this.beerRig) { this.beerRig.upper.visible = false; this.beerRig.fore.visible = false; this.beerRig.elbow.visible = false; this.beerRig.cuff.visible = false; }
      this.world.spawnDebris(pos, 0x2f6a3a, 9, 0.09, 3.2);
      this.world.spawnDebris(pos, 0x7ab86a, 5, 0.05, 2.4);
      this.world.burst(pos, 0x8ac86a, 12, 2.4, 0.6, 0.05);
      this.world.addDecal(U.texPuddle(), pos.x, pos.z, U.rand(1.0, 1.7), Math.random() * 6.28, 25, 0.45);
      ST.audio.bottleSmash();
      this.game.ticker("SMASH. Glass everywhere. You pull another from your back pocket. (" + Math.max(12, this.beerStock - 1) + " left)", "gold");
      this.beerStock = Math.max(12, (this.beerStock || 12) - 1);
      this.game.addRespect(3, "drink");
      this.game.shake(0.25);
      this.beerAutoT = 1.0;
    }

    _updateBeer(dt) {
      if (!this.beerHand) return;
      const DUR = 1.15;
      // after smashing, the next bottle comes out on its own
      if (!this.beerHeld && this.beerAutoT > 0) {
        this.beerAutoT -= dt;
        if (this.beerAutoT <= 0) { this.pullBeer(true); return; }
      }
      if (this.beerT <= 0) {
        if (!this.beerHeld) {
          this.beerHand.visible = false;
          if (this.beerRig) { this.beerRig.upper.visible = false; this.beerRig.fore.visible = false; this.beerRig.elbow.visible = false; this.beerRig.cuff.visible = false; }
          return;
        }
        // idle hold: bottle out, waiting for a left-click
        const b = this.beerHandBase;
        this.beerHand.visible = true;
        this.beerHand.position.set(b.pos.x, b.pos.y, b.pos.z);
        this.beerHand.rotation.set(b.rot.x, b.rot.y, b.rot.z);
        if (this.beerRig) {
          const shoulder = new THREE.Vector3(0.36, -0.88, -0.4);
          const bend = new THREE.Vector3(0.85, -0.5, -0.25);
          this.beerRig.upper.visible = true;
          this.beerRig.fore.visible = true;
          this.beerRig.elbow.visible = true;
          this.beerRig.cuff.visible = true;
          this._poseArm(this.beerRig, shoulder, this.beerHand.position.clone(), bend);
        }
        if (this.fist) this.fist.visible = false;
        if (this.fistL) this.fistL.visible = false;
        if (this.hand) this.hand.visible = false;
        return;
      }
      this.beerT -= dt;
      const t = 1 - Math.max(0, this.beerT) / DUR;
      let raise;
      if (t < 0.26) raise = t / 0.26;
      else if (t < 0.74) raise = 1;
      else raise = 1 - (t - 0.74) / 0.26;
      raise = U.clamp(raise, 0, 1);
      raise = raise * raise * (3 - 2 * raise);
      const chugging = t >= 0.28 && t <= 0.72;
      const gulp = chugging ? Math.abs(Math.sin(t * 30)) : 0;
      const b = this.beerHandBase;
      this.beerHand.position.set(
        U.lerp(b.pos.x, 0.12, raise),
        U.lerp(b.pos.y, -0.29, raise) + gulp * 0.012,
        U.lerp(b.pos.z, -0.5, raise)
      );
      this.beerHand.rotation.set(
        U.lerp(b.rot.x, 1.4 + gulp * 0.12, raise),
        U.lerp(b.rot.y, -0.05, raise),
        U.lerp(b.rot.z, 0.42, raise)
      );
      if (this.beerRig) {
        const shoulder = new THREE.Vector3(0.36, -0.88, -0.4);
        const bend = new THREE.Vector3(0.85, -0.5, -0.25);
        this.beerRig.upper.visible = true;
        this.beerRig.fore.visible = true;
        this.beerRig.elbow.visible = true;
        this.beerRig.cuff.visible = true;
        this._poseArm(this.beerRig, shoulder, this.beerHand.position.clone(), bend);
      }
      this.beerFoamT = (this.beerFoamT || 0) - dt;
      if (chugging && this.beerFoamT <= 0 && this.beerBottle) {
        this.beerFoamT = 0.16;
        const wp = new THREE.Vector3();
        this.beerBottle.getWorldPosition(wp);
        this.world.burst(wp, 0xf2e6bc, 3, 0.25, 0.35, 0.035);
      }
      if (t > 0.34 && !this.beerGulped) {
        this.beerGulped = true;
        ST.audio.beer();
      }
      if (t > 0.36 && !this.beerBurped && t < 0.74) {
        this.beerBurped = true;
        if (U.chance(0.55)) setTimeout(() => ST.audio.burp(), 600);
      }
      if (this.fist) this.fist.visible = false;
      if (this.fistL) this.fistL.visible = false;
      if (this.hand) this.hand.visible = false;
      if (this.beerT <= 0) {
        if (this.beerSips <= 0) this.smashBeer();
        else {
          const bb = this.beerHandBase;
          this.beerHand.position.set(bb.pos.x, bb.pos.y, bb.pos.z);
          this.beerHand.rotation.set(bb.rot.x, bb.rot.y, bb.rot.z);
        }
      }
    }

    clearBeer() {
      this.beerT = 0;
      this.beerHeld = false;
      this.beerSips = 0;
      this.beerAutoT = 0;
      this.beerGulped = false;
      this.beerBurped = false;
      if (this.beerHand) this.beerHand.visible = false;
      if (this.beerArm) this.beerArm.visible = false;
      if (this.beerRig) { this.beerRig.upper.visible = false; this.beerRig.fore.visible = false; this.beerRig.elbow.visible = false; this.beerRig.cuff.visible = false; }
      if (this.beerCuff) this.beerCuff.visible = false;
    }

    smoke() {
      if (this.weapon && this.weapon !== "fists") {
        this.weapon = "fists";
        this.updateWeaponModel();
        this.game.ui.updateWeapon(this);
      }
      if (this.smoking && this.smoking.type === "cig") {
        this.smoking = null;
        if (this.cigModel) this.cigModel.visible = false;
        this.game.ticker("You put the cigarette away. Quitter.", "bad");
        return;
      }
      if (this.cigs <= 0) {
        this.game.ticker("No cigarettes. Go buy some at the machine.", "bad");
        return;
      }
      if (this.cigs !== Infinity) this.cigs -= 1;
      this.smokeCd = 2;
      this.reactCd = 0;
      this.health = Math.min(this.maxHealth, this.health + 4);
      this.smoking = { type: "cig", t: 12 };
      this.puffT = 0;
      this.puffExhaled = false;
      this.dragAnim = 0;
      this.dragExhaled = false;
      this.smokeStreamT = 0;
      if (this.smokeHand) this.smokeHand.visible = true;
      if (this.cigModel) this.cigModel.visible = true;
      if (this.jointModel) this.jointModel.visible = false;
      if (this.bluntModel) this.bluntModel.visible = false;
      if (this.vapeModel) this.vapeModel.visible = false;
      this.smokePuffT = 0;
      this.smokeTalkT = 3;
      ST.audio.lighter();
      this.game.ticker("Cigarette out. LEFT-CLICK to take a drag. Each drag burns it down.", "gold");
      this.game.addRespect(1, "drink");
    }

    _buildPeeBeam() {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xf2e84a, transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending });
      const core = new THREE.MeshBasicMaterial({ color: 0xfff6a0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
      this.peeSegments = [];
      for (let i = 0; i < 7; i++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, 1, 5), i % 2 ? core : mat);
        group.add(seg);
        this.peeSegments.push(seg);
      }
      group.visible = false;
      this.world.scene.add(group);
      this.peeBeam = group;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.24, 12), new THREE.MeshBasicMaterial({ color: 0xe8e04a, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.scale.setScalar(0.7);
      ring.visible = false;
      this.world.scene.add(ring);
      this.peeRing = ring;
    }

    startPee() {
      if (this.dead) return;
      if (this.peeing) return;
      if (!this.peeBeam) this._buildPeeBeam();
      this.peeing = true;
      this.bladder = 100;
      this.peeSoundT = 0;
      this.peeReactT = 0;
      this.peeSplashT = 0;
      this.peePuddleT = 0;
      this.peeHold = 0;
      this.peeBeam.visible = true;
      if (this.peeRing) this.peeRing.visible = true;
      ST.audio.startPeeLoop();
      this.game.addRespect(1, "pee");
      this.game.ticker(U.pick(ST.jokes.ticker.pee), "gold");
    }

    stopPee() {
      this.peeing = false;
      if (this.peeBeam) this.peeBeam.visible = false;
      if (this.peeRing) this.peeRing.visible = false;
      ST.audio.stopPeeLoop();
    }

    pee() { this.startPee(); }

    _updatePee(dt) {
      if (!this.peeing) return;
      this.bladder = 100;
      if (this.game.input["r"]) this.peeHold = 0.25;
      else this.peeHold -= dt;
      if (this.peeHold <= 0) { this.stopPee(); return; }
      const dir = this.getDir();
      const from = this.camera.position.clone().addScaledVector(dir, 0.35);
      from.y -= 0.18;
      const to = from.clone().addScaledVector(dir, 6);
      const res = this.world.ray(from, to, ~2);
      let end = to;
      if (res.hasHit) end = new THREE.Vector3(res.hitPointWorld.x, res.hitPointWorld.y, res.hitPointWorld.z);
      end.y = Math.max(0.035, end.y);
      const pts = [];
      const tt = performance.now() / 1000;
      for (let i = 0; i <= 7; i++) {
        const t = i / 7;
        const p = from.clone().lerp(end, t);
        p.y += Math.sin(t * Math.PI) * 0.16;
        p.x += Math.sin(tt * 8 + i * 1.7) * 0.018;
        p.z += Math.cos(tt * 7 + i) * 0.018;
        pts.push(p);
      }
      for (let i = 0; i < 7; i++) {
        const a = pts[i], b = pts[i + 1];
        const seg = this.peeSegments[i];
        const d = a.distanceTo(b);
        seg.position.copy(a).add(b).multiplyScalar(0.5);
        seg.scale.set(1, Math.max(0.01, d), 1);
        seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      }
      if (this.peeRing) {
        this.peeRing.position.set(end.x, 0.05, end.z);
        const s = 0.8 + Math.sin(performance.now() / 100) * 0.2;
        this.peeRing.scale.set(s, s, s);
      }

      this.peeSplashT -= dt;
      if (this.peeSplashT <= 0) {
        this.peeSplashT = 0.06;
        this.world.burst(end, 0xe8e04a, 2, 0.7, 0.4, 0.045);
      }
      this.world.extinguishAt(end, 2.8);
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
      const ground = new THREE.Vector3(this.body.position.x, 0, this.body.position.z).addScaledVector(flat, 3.4);
      this.world.extinguishAt(ground, 3.2);

      const npc = res.hasHit ? this.game.npcs.npcByBody[res.body.id] : null;
      if (npc && !npc.down && this.peeReactT <= 0) {
        this.peeReactT = 1.2;
        if (npc.extinguish) npc.extinguish();
        npc.vomit();
        npc.state = (npc.kind === "cop" || npc.kind === "security" || npc.kind === "bouncer") ? "attack" : "flee";
        this.game.addRespect(6, "pee");
        this.game.addWanted(0.3);
        this.game.say(npc.name + ": \"DID YOU JUST— I CAN TASTE IT—\"");
        if (this.game.dude) this.game.dude(U.pick(["That's a war crime.", "Hydration is important.", "I regret nothing."]));
        this.game.crime();
      }
      this.peePuddleT -= dt;
      if (end.y < 0.2 && this.peePuddleT <= 0) {
        this.peePuddleT = 0.35;
        this.world.addDecal(U.texPuddle(), end.x, end.z, U.rand(0.7, 1.2), Math.random() * 6.28, 18, 0.6);
      }
    }

    /* ---------------- interactions ---------------- */
    _nearestPlane() {
      if (this.plane || this.driving) return null;
      const plane = this.world.plane;
      if (!plane) return null;
      const p = this.body.position;
      const d = Math.hypot(plane.group.position.x - p.x, plane.group.position.z - p.z);
      return d < 6 ? plane : null;
    }

    enterPlane() {
      const plane = this.world.plane;
      if (!plane) return;
      this.plane = plane;
      plane.speed = 0;
      plane.alt = 0;
      this.body.velocity.set(0, 0, 0);
      this.clearBeer();
      this.clearSmoking();
      this.stopPee();
      this.game.ui.setPrompt("<b>[E]</b> EXIT PLANE · <b>W/S</b> THROTTLE · <b>A/D</b> TURN · <b>SPACE</b> CLIMB · <b>SHIFT</b> DESCEND");
      this.game.ticker("You get in THE SHITBIRD. The manual is a napkin that says 'die'." , "gold");
      ST.audio.engineStart();
      this.engineOn = true;
    }

    exitPlane() {
      const plane = this.plane;
      if (!plane) return;
      if (plane.alt > 6) {
        this.game.ticker("You cannot exit a plane at this altitude. You are not that guy.", "bad");
        return;
      }
      plane.group.position.y = 0;
      plane.alt = 0;
      plane.speed = 0;
      this.plane = null;
      const p = plane.group.position;
      const side = new THREE.Vector3(Math.cos(plane.yaw), 0, -Math.sin(plane.yaw));
      this.body.position.set(p.x + side.x * 3.2, 1.2, p.z + side.z * 3.2);
      this.body.velocity.set(0, 0, 0);
      this.game.ui.setPrompt("");
      this.game.ticker("You leave the plane on the runway. It looks relieved.", "bad");
      if (this.engineOn) { ST.audio.engineStop(); this.engineOn = false; }
    }

    _updateFlying(dt) {
      const plane = this.plane;
      const keys = this.game.input;
      const throttle = (keys["w"] ? 1 : 0) - (keys["s"] ? 1 : 0);
      plane.speed += throttle * 12 * dt;
      if (throttle === 0) plane.speed *= Math.pow(0.75, dt);
      plane.speed = U.clamp(plane.speed, 0, 44);
      const steer = (keys["a"] ? 1 : 0) - (keys["d"] ? 1 : 0);
      const climb = (keys[" "] ? 1 : 0) - (keys["shift"] ? 1 : 0);
      plane.yaw += steer * (0.7 + plane.speed * 0.012) * dt;
      plane.roll += (steer * -0.55 - plane.roll) * Math.min(1, dt * 4);
      plane.pitch += (climb * -0.35 - plane.pitch) * Math.min(1, dt * 3);
      if (plane.speed > 9 && climb === 0) plane.pitch += (0.04 - plane.pitch) * Math.min(1, dt * 1.5);
      plane.alt += climb * (5 + plane.speed * 0.25) * dt;
      if (plane.speed > 14) plane.alt += 0.9 * dt;
      plane.alt = U.clamp(plane.alt, 0, 90);
      const fwd = new THREE.Vector3(-Math.sin(plane.yaw), 0, -Math.cos(plane.yaw));
      const pos = plane.group.position;
      pos.x += fwd.x * plane.speed * dt;
      pos.z += fwd.z * plane.speed * dt;
      pos.x = U.clamp(pos.x, -120, 120);
      pos.z = U.clamp(pos.z, -120, 120);
      if (pos.x <= -119 || pos.x >= 119 || pos.z <= -119 || pos.z >= 119) plane.speed *= 0.4;
      pos.y = plane.alt;
      plane.group.rotation.set(plane.pitch, plane.yaw, plane.roll);
      plane.propeller.rotation.z += (8 + plane.speed * 1.6) * dt;
      for (let i = 0; i < plane.wheels.length; i++) plane.wheels[i].rotation.x -= plane.speed * dt * 1.4;
      // poor landing
      if (plane.alt < 1.2 && plane.speed > 30) {
        plane.speed *= 0.35;
        plane.alt = 0.8;
        this.damage(35, "plane");
        this.game.shake(1.1);
        this.game.ticker("You hit the ground at a speed usually reserved for meteors.", "bad");
        this.world.burst(pos, 0xffd27a, 20, 5, 0.6, 0.09);
        ST.audio.explosion ? ST.audio.explosion() : ST.audio.thunk();
      }
      // body rides along for the HUD/radar
      this.body.position.set(pos.x, Math.max(1.2, pos.y), pos.z);
      this.body.velocity.set(0, 0, 0);
      const camBack = fwd.clone().multiplyScalar(-13 - plane.speed * 0.08);
      const wanted = new THREE.Vector3(pos.x + camBack.x, pos.y + 5.2, pos.z + camBack.z);
      this.camera.position.lerp(wanted, 1 - Math.pow(0.002, dt));
      this.camera.lookAt(pos.x + fwd.x * 8, pos.y + 1.2, pos.z + fwd.z * 8);
      const targetFov = 72 + plane.speed * 0.28;
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
      for (let i = 0; i < this.camera.children.length; i++) this.camera.children[i].visible = false;
      if (this.engineOn) ST.audio.engineSet(plane.speed * 0.7);
      if (plane.alt < 5 && U.chance(dt * 4)) this.world.burst(new THREE.Vector3(pos.x, 0.1, pos.z), 0xc8b090, 2, 1.5, 0.5, 0.2);
    }

    _nearestCar() {
      if (this.driving) return null;
      const p = this.body.position;
      let best = null, bd = 3.6;
      for (let i = 0; i < this.world.cars.length; i++) {
        const c = this.world.cars[i];
        if (c.occupied) continue;
        const d = Math.hypot(c.group.position.x - p.x, c.group.position.z - p.z);
        if (d < bd) { bd = d; best = c; }
      }
      return best;
    }

    enterCar(car) {
      this.driving = car;
      car.speed = 0;
      car.occupied = true;
      if (car.ai) {
        car.ai = false;
        car.aiSpeed = 0;
        if (!car.name || car.name.indexOf("SEDAN") < 0) car.name = "STOLEN SEDAN";
        this.game.ticker("You carjack a moving car. The driver is still running. Respect.", "gold");
        this.game.addWanted(1.2);
      }
      if (!car.owned && !car.wasStolen) {
        car.wasStolen = true;
        this.game.story.carStolen = true;
        this.game.addWanted(0.9);
        this.game.ticker("CARJACKED. The owner is screaming. That's the Kentucky alarm system.", "bad");
        this.game.addRespect(8, "bribe");
      }
      this.clearBeer();
      this.clearSmoking();
      this.stopPee();
      this.game.ui.setPrompt("<b>[E]</b> EXIT VEHICLE · <b>W/S</b> GAS/BRAKE · <b>A/D</b> STEER · <b>SPACE</b> HANDBRAKE");
      this.game.ticker("You get in the " + car.name + ". It smells like cigarettes and decisions.", "gold");
      ST.audio.engineStart();
      this.engineOn = true;
      this.body.velocity.set(0, 0, 0);
    }

    exitCar() {
      const car = this.driving;
      if (!car) return;
      this.driving = null;
      car.occupied = false;
      const g = car.group.position;
      const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
      this.body.position.set(g.x + side.x * 2.4, 1.2, g.z + side.z * 2.4);
      this.body.velocity.set(0, 0, 0);
      this.game.ui.setPrompt("");
      this.game.ticker("You get out. The town is still here. Unfortunate.", "bad");
      if (this.engineOn) { ST.audio.engineStop(); this.engineOn = false; }
    }

    _updateDriving(dt) {
      const car = this.driving;
      const keys = this.game.input;
      const throttle = (keys["w"] ? 1 : 0) - (keys["s"] ? 1 : 0);
      const steer = (keys["a"] ? 1 : 0) - (keys["d"] ? 1 : 0);
      if (throttle > 0) car.speed += 11 * dt;
      else if (throttle < 0) car.speed -= (car.speed > 0 ? 18 : 7) * dt;
      else car.speed *= Math.pow(0.45, dt);
      if (keys[" "]) car.speed *= Math.pow(0.05, dt);
      car.speed = U.clamp(car.speed, -7, 19);
      const steerRate = 1.35 * (0.4 + Math.min(1, Math.abs(car.speed) / 8));
      car.heading += steer * steerRate * dt * (car.speed < -0.2 ? -1 : 1);
      car.group.rotation.y = car.heading;
      const fwd = new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));
      const pos = car.group.position;
      const step = fwd.clone().multiplyScalar(car.speed * dt);
      const from = new THREE.Vector3(pos.x, 0.7, pos.z);
      const to = new THREE.Vector3(pos.x + step.x + fwd.x * 2.3, 0.7, pos.z + step.z + fwd.z * 2.3);
      const hit = this.world.ray(from, to, ~2);
      let moved = true;
      if (hit.hasHit && car.speed > 0) {
        const d = hit.distance;
        if (d < 2.5) { car.speed *= -0.18; moved = false; this.game.shake(0.25); ST.audio.thunk(); }
      }
      if (moved) pos.add(step);
      // keep the car in the county
      pos.x = U.clamp(pos.x, -120, 120);
      pos.z = U.clamp(pos.z, -120, 120);
      for (let i = 0; i < car.wheels.length; i++) car.wheels[i].rotation.x -= car.speed * dt * 2.6;

      // slam into other cars (and knock them around)
      car.carHitCd = Math.max(0, (car.carHitCd || 0) - dt);
      if (Math.abs(car.speed) > 2) {
        for (let i = 0; i < this.world.cars.length; i++) {
          const other = this.world.cars[i];
          if (other === car) continue;
          const dx = other.group.position.x - pos.x;
          const dz = other.group.position.z - pos.z;
          if (Math.abs(dx) < 2.7 && Math.abs(dz) < 2.7 && (car.carHitCd || 0) <= 0) {
            car.carHitCd = 0.55;
            const hitSpeed = Math.abs(car.speed);
            other.knockX = fwd.x * hitSpeed * 0.85 + U.rand(-1, 1);
            other.knockZ = fwd.z * hitSpeed * 0.85 + U.rand(-1, 1);
            other.knockSpin = U.rand(-2.4, 2.4);
            if (!other.ai) other.heading += U.rand(-0.5, 0.5);
            car.speed *= 0.3;
            this.game.shake(0.55);
            ST.audio.thunk();
            ST.audio.crunch ? ST.audio.crunch() : ST.audio.squelch();
            const mid = new THREE.Vector3((pos.x + other.group.position.x) / 2, 1.0, (pos.z + other.group.position.z) / 2);
            this.world.burst(mid, 0xffd27a, 12, 3.2, 0.4, 0.06);
            this.world.burst(mid, 0xbfc4cc, 8, 2.4, 0.35, 0.05);
            this.game.tickerIf(U.chance(0.5), "You hit a car. Kentucky rules: whoever is still moving wins.");
            break;
          }
        }
      }

      // plow through props: mailboxes, bins, cones, fences, whatever
      car.propHitCd = Math.max(0, (car.propHitCd || 0) - dt);
      if (Math.abs(car.speed) > 3.5 && (car.propHitCd || 0) <= 0) {
        const props = this.world.props;
        for (let i = 0; i < props.length; i++) {
          const pr = props[i];
          if (pr.dead) continue;
          const bp = pr.body.position;
          if (Math.hypot(bp.x - pos.x, bp.z - pos.z) < 2.5) {
            car.propHitCd = 0.16;
            this.world.damageProp(pr, 70 + Math.abs(car.speed) * 6, new THREE.Vector3(bp.x, bp.y, bp.z), {
              x: fwd.x * Math.abs(car.speed) * 1.4,
              y: 5 + Math.abs(car.speed) * 0.4,
              z: fwd.z * Math.abs(car.speed) * 1.4
            });
            ST.audio.thunk();
            this.game.shake(0.18);
            break;
          }
        }
      }

      // run folks over
      const npcs = this.game.npcs.all;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down || n.knocked || n.removed) continue;
        const dx = n.body.position.x - pos.x, dz = n.body.position.z - pos.z;
        if (Math.abs(dx) < 2.4 && Math.abs(dz) < 2.4 && Math.abs(car.speed) > 3) {
          const force = 1.1 + Math.abs(car.speed) * 0.09;
          if (car.speed > 9) n.health = Math.min(n.health, 1);
          n.damage(34 + Math.abs(car.speed) * 2, pos, "car");
          if (!n.down && !n.knocked) n.knockdown(pos, force);
          ST.audio.thunk();
          this.game.shake(0.4);
          this.game.addWanted(0.6);
          this.game.ticker("You hit " + n.name + " with a " + car.name + ". That's a Kentucky fender bender.", "bad");
        }
      }
      // story drop-off marker
      const story = this.game.story;
      if (story && story.enabled && story.stage === 2 && !story.deliveryDone && Math.hypot(pos.x, pos.z + 41.5) < 6) {
        story.deliveryDone = true;
        this.game.ticker("DROP COMPLETE. The customer grunts. You are a professional now.", "gold");
        this.game.addRespect(20, "bribe");
        this.cash += 60;
      }
      // body follows the car so exiting and interactions stay sane
      this.body.position.set(pos.x, 1.2, pos.z);
      this.body.velocity.set(0, 0, 0);
      const camBack = fwd.clone().multiplyScalar(-7.4);
      const target = new THREE.Vector3(pos.x + fwd.x * 2.0, 1.6, pos.z + fwd.z * 2.0);
      const wanted = new THREE.Vector3(pos.x + camBack.x, 4.0, pos.z + camBack.z);
      this.camera.position.lerp(wanted, 1 - Math.pow(0.002, dt));
      this.camera.lookAt(target);
      const targetFov = 74 + Math.min(10, Math.abs(car.speed) * 0.6);
      this.camera.fov += (targetFov - this.camera.fov) * 0.1;
      this.camera.updateProjectionMatrix();
      // headlights glow harder at speed
      for (let i = 0; i < car.lights.length; i++) car.lights[i].scale.setScalar(1 + Math.abs(car.speed) * 0.02);
      // hide first-person props
      for (let i = 0; i < this.camera.children.length; i++) this.camera.children[i].visible = false;
      if (this.engineOn) ST.audio.engineSet(car.speed);
    }

    interact() {
      if (this.dead) return;
      if (this.plane) { this.exitPlane(); return; }
      if (this.driving) { this.exitCar(); return; }
      const plane = this._nearestPlane();
      if (plane) { this.enterPlane(); return; }
      const car = this._nearestCar();
      if (car) { this.enterCar(car); return; }
      this.interactCount += 1;
      const dir = this.getDir();
      const npc = this._focusedNpc || this.game.npcs.focused(this.camera.position, dir, 3.4);
      if (npc) { npc.interact(); return; }
      const it = this._focusedInteract || this.world.findInteractable(this.camera.position, dir, 3.0);
      if (it) { it.action(); return; }
      this.game.ticker("Nothing here to interact with. Try violence.", "bad");
    }

    /* ---------------- damage / death ---------------- */
    damage(dmg, source) {
      if (this.dead) return;
      dmg *= this.drugDefense;
      this.health -= dmg;
      this.shake = Math.min(1.4, this.shake + 0.55);
      ST.audio.hurt();
      this.game.ui.hurtFlash();
      if (this.health <= 0) {
        this.health = 0;
        this.game.die();
      }
    }

    damageFromBlast(pos, radius, dmg) {
      const d = Math.hypot(this.body.position.x - pos.x, this.body.position.z - pos.z);
      if (d > radius) return;
      const falloff = 1 - d / radius;
      this.damage(dmg * falloff, "explosion");
      const dir = new THREE.Vector3(this.body.position.x - pos.x, 0, this.body.position.z - pos.z).normalize();
      this.body.velocity.x += dir.x * 12 * falloff;
      this.body.velocity.z += dir.z * 12 * falloff;
      this.body.velocity.y += 5 * falloff;
    }

    onPropBroken(prop) {
      if (prop.name === "hydrant" && prop.mesh) {
        this.world.burst(new THREE.Vector3(prop.mesh.position.x, 1, prop.mesh.position.z), 0x9fd4ff, 20, 2.5, 1.6, 0.09);
        this.world.extinguishAt(new THREE.Vector3(prop.mesh.position.x, 0, prop.mesh.position.z), 6);
        this.game.ticker("The hydrant is geysering. Free water. Free chaos.", "gold");
      }
    }

    respawn(spawn) {
      this.dead = false;
      this.health = this.maxHealth;
      this.drunk = 0;
      this.wanted = 0;
      this.beer = 0;
      this.heldProp = null;
      this.heldNpc = null;
      this.body.velocity.set(0, 0, 0);
      this.body.position.set(spawn.x, spawn.y, spawn.z);
      this.yaw = spawn.yaw || 0;
      this.pitch = 0;
      this.peeing = false;
      this.peeSoundT = 0;
      this.peeReactT = 0;
      this.peeSplashT = 0;
      this.peePuddleT = 0;
      this.peeHold = 0;
      if (this.plane) { this.plane = null; this.world.plane.group.position.y = 0; }
      if (this.driving) this.exitCar();
      this.clearSmoking();
      if (this.engineOn) { ST.audio.engineStop(); this.engineOn = false; }
      this.cash = Math.max(0, this.cash - 75);
    }

    getCameraPos() { return this.camera.position; }

    addRespect(n, type, name) { this.game.addRespect(n, type, name); }
  }

  ST.Player = Player;
})();
