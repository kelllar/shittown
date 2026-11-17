/* SHITTOWN — main.js
   Boots the town, runs the loop, wires the input, and keeps the
   respect/wanted/radio machinery spinning. Single player forever. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;
  const $ = (id) => document.getElementById(id);
  const SETTINGS_KEY = "shittown.settings.v1";
  const STATS_KEY = "shittown.stats.v1";

  const QUALITY = { low: 270, medium: 450, high: 720 };

  class Game {
    constructor() {
      const canvas = $("game");
      this.canvas = canvas;
      this.renderer = new THREE.WebGLRenderer({
        canvas, antialias: false, alpha: false, powerPreference: "high-performance"
      });
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(74, 16 / 9, 0.08, 420);
      this.camera.rotation.order = "YXZ";
      this.scene.add(this.camera);

      this.settings = this.loadSettings();
      this.stats = this.loadStats();

      this.world = new ST.World(this.scene);
      this.world.game = this;
      this.player = new ST.Player(this, this.camera);
      this.world.game = this;
      this.npcs = new ST.NPCManager(this);
      this.ui = new ST.UI(this);
      this.audio = ST.audio;

      this.input = {};
      this.started = false;
      this.heroName = "SHITASS";
      this.paused = false;
      this.slotsOpen = false;
      this.phoneOpen = false;
      this.slowmo = 0;
      this.deathHandled = false;
      this.time = 0;
      this.acc = 0;
      this.last = performance.now();
      this.fps = 60;
      this.fpsAcc = 0;
      this.fpsFrames = 0;
      this.chaos = 0;
      this.lastCrime = -999;
      this._witnessT = 0;
      this._lastPunchTick = 0;
      this._ambientT = 30;
      this.radioManual = 0;
      this.prevWanted = 0;
      this.phoneOpened = false;
      this.radarT = 0;
      this.cutsceneOpen = false;
      this.objective = "Meet Slick at the club. Purple hat. Bad vibes. Ask about business.";
      this.story = {
        enabled: true, stage: 0, slickMet: false, sold: 0, bouncerDown: false, slickDown: false,
        carBought: false, carStolen: false, deliveryDone: false, hoes: 0, suit: false,
        colonelDown: false, colonelSpawned: false, final: false
      };
      this.marker = null;
      this.creditsOpen = false;
      this.tutorial = { step: 0, done: false, start: null, lastAdvance: 0 };
      this.slotEls = null;

      this.ui.syncSettings();
      this.setQuality(this.settings.quality, true);
      this.audio.setMaster(this.settings.master);
      this.audio.setMusic(this.settings.music);
      this.ui.showHUD(false);

      this._bindEvents();
      this._bindDebug();

      this._loop = this._loop.bind(this);
      requestAnimationFrame(this._loop);
      // Some browsers/compositors throttle rAF to a crawl even in a visible tab.
      // This watchdog keeps the simulation alive instead of freezing the game.
      setInterval(() => {
        if (!this.started || this.paused || this.slotsOpen || this.phoneOpen || this.player.dead) return;
        const now = performance.now();
        if (now - this.last > 400) this._step(now);
      }, 150);

      window.addEventListener("resize", () => this.resize());
    }

    /* ---------------- settings ---------------- */
    loadSettings() {
      const def = { master: 0.8, music: 0.7, musicOn: false, mouse: 0.12, quality: "high" };
      try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(def, JSON.parse(raw));
      } catch (e) { /* private mode, file://, whatever */ }
      return def;
    }
    saveSettings() {
      try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings)); } catch (e) {}
    }
    loadStats() {
      const def = { deaths: 0, ko: 0, bestRespect: 0, spins: 0 };
      try {
        const raw = localStorage.getItem(STATS_KEY);
        if (raw) Object.assign(def, JSON.parse(raw));
      } catch (e) {}
      return def;
    }
    saveStats() {
      this.stats.bestRespect = Math.max(this.stats.bestRespect, Math.floor(this.player.respect));
      try { localStorage.setItem(STATS_KEY, JSON.stringify(this.stats)); } catch (e) {}
    }

    setQuality(q, initial) {
      this.settings.quality = q;
      this._baseH = QUALITY[q] || QUALITY.medium;
      this.resize();
      if (!initial) this.ticker("Graphics: " + (q === "low" ? "PS1 chunky" : q === "high" ? "fake HD sellout" : "PS2 classic"), "gold");
    }

    resize() {
      const aspect = Math.max(0.6, window.innerWidth / Math.max(1, window.innerHeight));
      const h = this._baseH || 270;
      const w = Math.round(h * aspect);
      this.renderer.setSize(w, h, false);
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
    }

    /* ---------------- input ---------------- */
    _bindEvents() {
      const canvas = this.canvas;
      document.addEventListener("keydown", (e) => {
        if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
        const k = e.key.toLowerCase();
        if (["w", "a", "s", "d", " ", "shift", "q", "e", "f", "r", "c", "m", "t", "g", "b", "v", "x", "h", "z", "f1", "l", "escape", "arrowup", "arrowdown", "arrowleft", "arrowright", "enter"].indexOf(k) >= 0) e.preventDefault();
        if (e.repeat) return;

        if (this.chatOpen) {
          if (k === "escape") this.closeChat();
          return;
        }
        if (this.creditsOpen) {
          if (k === "escape" || k === "enter" || k === " ") this.closeCredits();
          return;
        }
        if (this.cutsceneOpen) {
          if (k === "escape") this.skipCutscene();
          else if (k === " " || k === "enter") this.ui.nextCutscene();
          return;
        }

        if (k === "escape") {
          if (this.phoneOpen) { this.closePhone(); return; }
          if (this.slotsOpen) { this.closeSlots(); return; }
          if (this.started && !this.player.dead) { this.paused ? this.resume() : this.pause(); }
          return;
        }
        if (this.phoneOpen) {
          if (k === "t") { this.closePhone(); return; }
          if (k === "l") { this.audio.toggleMute(); return; }
          this.ui.phoneKey(k);
          return;
        }
        if (this.slotsOpen) {
          if (k === " " || k === "enter") { this.ui.spin(); }
          return;
        }
        if (k === "l") {
          const muted = this.audio.toggleMute();
          this.ticker(muted ? "All audio muted. Peace at last." : "Audio back on. Sorry.", "gold");
          return;
        }
        if (!this.started || this.paused || this.player.dead) return;
        if (k === "y" && ST.mp && ST.mp.enabled) { this.openChat(); return; }

        this.input[k] = true;
        if (k === " " && !this.player.driving) this.player.queueJump();
        if (k === "e") this.player.interact();
        else if (k === "f") this.player.drink();
        else if (k === "r") this.player.pee();
        else if (k === "c") this.player.smoke();
        else if (k === "b") this.player.smokeWeed();
        else if (k === "v") this.player.vape();
        else if (k === "z") this.player.toggleCamera();
        else if (k === "g") this.player.squeak();
        else if (k === "q") this.player.kick();
        else if (k === "x") this.player.startExtinguish();
        else if (k === "h") this.player.throwWater();
        else if (k === "t") this.openPhone("home");
        else if (k === "f1") this.openPhone("guide");
        else if (k === "1") this.player.switchWeapon("fists");
        else if (k === "2") this.player.switchWeapon("bat");
        else if (k === "3") this.player.switchWeapon("shovel");
        else if (k === "4") this.player.switchWeapon("pistol");
        else if (k === "5") this.player.switchWeapon("shotgun");
        else if (k === "m") {
          if (!this.settings.musicOn) {
            this.ticker("Soundtrack is OFF. Turn it on in the pause menu (ESC).", "gold");
            return;
          }
          const s = this.audio.cycleStation();
          this.radioManual = 30;
          this.ticker("Radio: " + ST.jokes.radioNames[s], "gold");
        }
      });
      document.addEventListener("keyup", (e) => {
        const k = e.key.toLowerCase();
        this.input[k] = false;
        if (k === "r" && this.player) this.player.stopPee();
        if (k === "x" && this.player) this.player.stopExtinguish();
      });
      window.addEventListener("blur", () => { this.input = {}; });

      document.addEventListener("mousemove", (e) => {
        if (document.pointerLockElement !== canvas) return;
        if (!this.started || this.paused || this.slotsOpen || this.player.dead) return;
        const sens = 0.0009 + this.settings.mouse * 0.006;
        this.player.onMouseMove(e.movementX || 0, e.movementY || 0, sens);
      });
      document.addEventListener("mousedown", (e) => {
        if (e.button === 0 && this.started) this.audio.resume();
        if (document.pointerLockElement !== canvas) return;
        if (!this.started || this.paused || this.slotsOpen || this.player.dead) return;
        if (e.button === 0) this.player.attack();
        else if (e.button === 2) this.player.clawDown();
      });
      document.addEventListener("mouseup", (e) => {
        if (e.button === 2 && this.started && !this.paused && !this.player.dead) this.player.clawRelease();
      });
      document.addEventListener("contextmenu", (e) => e.preventDefault());
      canvas.addEventListener("click", () => {
        if (this.started && !this.paused && !this.slotsOpen && !this.player.dead && document.pointerLockElement !== canvas) {
          this.requestLock();
        }
      });
      document.addEventListener("pointerlockchange", () => {
        if (document.pointerLockElement !== canvas && this.started && !this.paused && !this.slotsOpen && !this.phoneOpen && !this.player.dead && !this.cutsceneOpen && !this.creditsOpen) {
          this.pause();
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.hidden && this.started && !this.paused && !this.player.dead) this.pause();
      });
      window.addEventListener("beforeunload", () => this.audio.dispose());
    }

    requestLock() {
      try {
        const p = this.canvas.requestPointerLock();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch (e) {}
    }
    releaseLock() {
      if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    }

    /* ---------------- flow ---------------- */
    start() {
      if (this.started) return;
      this.started = true;
      this.deathHandled = false;
      this.ui.hideBoot();
      this.ui.showHUD(true);
      this.audio.init();
      this.audio.resume();
      this.audio.setPaused(false);
      this.audio.setMaster(this.settings.master);
      this.audio.setMusic(this.settings.music);
      this.audio.setMusicEnabled(this.settings.musicOn === true);
      this.audio.setStation("street");
      this.ui.updateWeapon(this.player);
      this.ui.drawRadar(this);
      this.updateRadioLabel();
      this.requestLock();
      this.ticker("Welcome to SHITTOWN. Population: you, and everyone you're about to annoy.", "gold");
      this.ticker("Tip: " + U.pick(ST.jokes.tips).replace(/^Tip:\s*/, ""));
      this.ticker("Guns: check the house and behind the bar. This is America.", "gold");
      this.tutorial.start = { x: this.player.body.position.x, z: this.player.body.position.z };
      this.ui.setObjective(this.objective);
      this.updateStoryMarker();
      this.openCutscene("SHITTOWN", [
        "You are SHITASS. You live in Shittown, Kentucky: one dead mall, three neon signs, and a mayor who cries in public.",
        "You want to be a pimp. Not a metaphor. A business. Purple suit, stable, respect, the whole stupid dream.",
        "Slick runs Glitter Gulch. Dave runs the weed. The cops run on donuts and spite. None of them respect you yet.",
        "Nine missions. One town. Become the Pimp King. Or die trying. Preferably both."
      ], () => {
        this.ui.showTutorial("<b>WASD</b> — move. <b>Shift</b> — sprint. <b>Space</b> — jump. The town won't ruin itself.", 1, 6);
        this.ui.setObjective(this.objective);
        this.ui.missionBanner(this.getStoryMissions()[0].title);
      });
      this.saveSettings();
    }

    pause() {
      if (this.paused || !this.started || this.player.dead) return;
      this.paused = true;
      this.input = {};
      this.player.stopPee();
      this.player.stopExtinguish();
      this.ui.showPause(true);
      this.audio.setPaused(true);
      this.releaseLock();
    }
    resume() {
      if (!this.paused) return;
      this.paused = false;
      this.ui.showPause(false);
      this.audio.setPaused(false);
      this.requestLock();
    }

    openPhone(app) {
      if (this.slotsOpen || this.player.dead) return;
      if (this.phoneOpen) { this.ui._showApp(app || "home"); return; }
      this.phoneOpen = true;
      this.phoneOpened = true;
      this.input = {};
      this.ui.setPrompt("");
      this.releaseLock();
      this.ui.openPhone(app || "home");
      this.player.showPhone(true);
      ST.audio.click();
    }
    closePhone() {
      if (!this.phoneOpen) return;
      this.phoneOpen = false;
      this.ui.closePhone();
      this.player.showPhone(false);
      this.requestLock();
    }

    openChat() {
      const bar = document.getElementById("chat-bar");
      const input = document.getElementById("chat-input");
      if (!bar || !input) return;
      this.chatOpen = true;
      this.input = {};
      bar.classList.remove("hidden");
      input.value = "";
      input.focus();
      this.releaseLock();
    }

    closeChat() {
      const bar = document.getElementById("chat-bar");
      const input = document.getElementById("chat-input");
      this.chatOpen = false;
      if (bar) bar.classList.add("hidden");
      if (input) input.blur();
      this.requestLock();
    }

    openCutscene(title, lines, onDone) {
      this.cutsceneOpen = true;
      this.player.stopPee();
      this.player.stopExtinguish();
      this.releaseLock();
      this.ui.openCutscene(title, lines, () => {
        this.cutsceneOpen = false;
        this.requestLock();
        if (onDone) onDone();
      });
    }
    skipCutscene() {
      if (this.cutsceneOpen) this.ui.skipCutscene();
    }
    disableStory() {
      this.story.enabled = false;
      this.ui.hideTutorial();
    }
    _updateStory() {
      if (!this.story.enabled || this.cutsceneOpen || this.story.final) return;
      const s = this.story, p = this.player;
      const stages = [
        { title: "MISSION 1 · A FAVOR FOR SLICK", obj: "Meet Slick at the club. Purple hat. Bad vibes.",
          check: () => s.slickMet,
          lines: ["Slick looks you up and down. 'You want work? Everybody wants work.'", "'Buy some product. Sell it. Don't get caught. Don't embarrass me.'", "He hands you a business card. It is a napkin."] },
        { title: "MISSION 2 · THE WHEELS", obj: "You need a ride. BUY one at Honest Earl's for $250, or STEAL any parked car.",
          check: () => s.carBought || s.carStolen,
          lines: ["A man on foot is a man with no future. Earl has a yellow car and no conscience.", "You have a car now. It is a legal distinction, not a good one.", "'Gas is extra,' Earl says, walking away with your money."] },
        { title: "MISSION 3 · FIRST RUN", obj: "Drive to the drop behind the strip (follow the yellow beam) and stop in it.",
          check: () => s.deliveryDone,
          lines: ["You deliver a bag to a man who does not look at you.", "He pays in ones. The ones are damp.", "The job is done. The car smells like the job now."] },
        { title: "MISSION 4 · MEDICAL BREAK", obj: "Buy weed at 420 DEPOT, call Dave's van, or use WEEDMAPS.",
          check: () => p.weed > 0,
          lines: ["Dave says it's medicinal. Dave says a lot of things.", "The bag says TOMATOES. The bag is lying."] },
        { title: "MISSION 5 · BUILD A STABLE", obj: "Recruit 3 girls to your stable. Find dancers at Glitter Gulch or party girls in the backyard. Press E.",
          check: () => s.hoes >= 3,
          lines: ["Three girls. Three contracts written on napkins. Three new business partners.", "You are now a small business owner. The business is people.", "Somewhere, a labor lawyer feels a chill."] },
        { title: "MISSION 6 · THE SUIT", obj: "Buy the purple pimp suit at Cuts & Blood for $300. You cannot pimp in a hoodie.",
          check: () => s.suit,
          lines: ["The suit is purple. The suit has a gold chain. The suit is you.", "You look like money that was laundered through a bowling alley.", "The hoodie is dead. Long live the suit."] },
        { title: "MISSION 7 · CLUB TAKEOVER", obj: "KO the bouncer and Slick at Glitter Gulch.",
          check: () => s.bouncerDown && s.slickDown,
          lines: ["The bouncer is a wall with a haircut. Slick is a hat with a plan.", "The club is yours. The sticky floor is yours. The girls are yours to manage."] },
        { title: "MISSION 8 · THE RIVAL PIMP", obj: "The Colonel is at Honest Earl's lot with his goons. Drive there and END HIM.",
          check: () => s.colonelDown,
          lines: ["The Colonel owns everything for three counties. He owns your car now, spiritually.", "He steps out of a white Cadillac. He brought friends. He brought a mustache.", "This ends at the lot. It ends with somebody on the ground."] },
        { title: "MISSION 9 · PIMP KING", obj: "Reach 1,500 Respect. The town is watching.",
          check: () => p.respect >= 1500,
          lines: ["The town has a new pimp king: SHITASS.", "Nobody is proud. Everybody is impressed.", "Somewhere, a slot machine plays your theme song."] }
      ];
      const st = stages[s.stage];
      if (!st) return;
      if (!st.check()) return;
      s.stage += 1;
      this.ui.setObjective(st.obj);
      this.updateStoryMarker();
      this.openCutscene(st.title, st.lines, () => {
        if (s.stage >= stages.length) {
          s.final = true;
          this.objective = "PIMP KING. The town is yours. You beat SHITTOWN.";
          this.ui.setObjective(this.objective);
          this.clearMarker();
          this.addRespect(250, "bribe");
          this.ui.rankUp("PIMP KING");
          this.ticker("YOU BEAT SHITTOWN. Nobody claps. That's how you know it's real.", "gold");
          this.ticker("PIMP KING. The stable, the club, the car, the plane. All yours.", "gold");
          this.rollCredits();
        } else {
          this.objective = stages[s.stage].obj;
          this.ui.setObjective(this.objective);
          this.updateStoryMarker();
          this.ui.missionBanner(stages[s.stage].title);
          if (s.stage === 7 && !s.colonelSpawned) this.spawnColonel();
        }
      });
    }

    getStoryMissions() {
      return [
        { title: "A FAVOR FOR SLICK", obj: "Meet Slick at Glitter Gulch. Purple hat. Bad vibes." },
        { title: "THE WHEELS", obj: "Buy a car from Honest Earl ($250) or steal one." },
        { title: "FIRST RUN", obj: "Drive to the yellow drop behind the strip." },
        { title: "MEDICAL BREAK", obj: "Buy weed at 420 Depot, Dave's van, or Weedmaps." },
        { title: "BUILD A STABLE", obj: "Recruit 3 dancers or party girls for $50 each." },
        { title: "THE SUIT", obj: "Buy the purple pimp suit at Cuts & Blood ($300)." },
        { title: "CLUB TAKEOVER", obj: "KO the bouncer and Slick at Glitter Gulch." },
        { title: "THE RIVAL PIMP", obj: "End The Colonel at Honest Earl's lot." },
        { title: "PIMP KING", obj: "Reach 1,500 Respect. The town is watching." }
      ];
    }

    updateStoryMarker() {
      const s = this.story;
      if (!s.enabled || s.final) { this.clearMarker(); return; }
      const marks = [
        [22, -24, 0xff2d78],
        [47, -8, 0xffd400],
        [0, -41.5, 0x5cff86],
        [40, 5, 0x5cff86],
        [-32, 38, 0xff2d78],
        [-38.6, 19, 0xffd400],
        [22, -24, 0xff2d78],
        [46, 2, 0xff3b30],
        null
      ];
      const m = marks[s.stage];
      if (m) this.setMarker(m[0], m[1], m[2]);
      else this.clearMarker();
    }

    setMarker(x, z, color) {
      this.clearMarker();
      const g = new THREE.Group();
      const beamMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 9, 14, 1, true), beamMat);
      beam.position.y = 4.5;
      g.add(beam);
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 2.0, 24),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.07;
      g.add(ring);
      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.1, 4),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
      arrow.rotation.x = Math.PI;
      arrow.position.y = 8.4;
      g.add(arrow);
      g.position.set(x, 0, z);
      this.scene.add(g);
      this.marker = g;
    }

    clearMarker() {
      if (!this.marker) return;
      this.scene.remove(this.marker);
      this.marker = null;
    }

    spawnColonel() {
      const s = this.story;
      if (s.colonelSpawned) return;
      s.colonelSpawned = true;
      const boss = this.npcs.spawn("colonel", 46, 2, 0, { name: "THE COLONEL" });
      if (boss) {
        boss.state = "attack";
        boss.angry = true;
        boss.say("THIS TOWN BELONGS TO THE COLONEL.");
      }
      [[41, 6], [50, 6], [45, 10], [51, 1]].forEach((p) => {
        const goon = this.npcs.spawn("goon", p[0], p[1], 0);
        if (goon) { goon.state = "attack"; goon.angry = true; goon.eyePop = 1.2; }
      });
      this.addWanted(2);
      this.ticker("THE COLONEL is at the lot with his goons. He called the cops on you. Of course he did.", "bad");
      this.openCutscene("THE COLONEL", [
        "A white Cadillac rolls into Honest Earl's lot. The Colonel gets out.",
        "'I heard somebody's been moving weight in my town,' he says, adjusting a hat older than the county.",
        "He cracks his knuckles. Four goons get out of the trunk. Somehow.",
        "End him."
      ], () => {
        this.ui.setObjective("END THE COLONEL at Honest Earl's lot. He is big. He is mean. He is right there.");
      });
    }

    rollCredits() {
      this.creditsOpen = true;
      this.player.stopPee();
      this.releaseLock();
      this.ui.showCredits();
      ST.audio.rankUp ? ST.audio.rankUp() : null;
    }

    closeCredits() {
      if (!this.creditsOpen) return;
      this.creditsOpen = false;
      this.ui.hideCredits();
      this.requestLock();
    }

    orderWeed(price) {
      const p = this.player;
      if (p.cash < price) { this.ticker("Weedmaps says your card was declined. So did your dad.", "bad"); return; }
      p.cash -= price;
      p.weed += 1;
      this.addRespect(1, "bribe");
      ST.audio.cash();
      this.ticker("Weedmaps order placed. It's already in your pocket. Delivery is a concept.", "gold");
      if (price === 10) this.ticker("Dave's van did a lap around the block. Dave is not in it.", "bad");
      this.ui.updateHUD(p);
      this._updateTutorial();
    }

    torBuy(action) {
      const p = this.player;
      const costs = { bag: 25, xans: 40, hit: 250, coach: 150, files: 0 };
      const cost = costs[action] || 0;
      if (p.cash < cost) { this.ticker("The onion site says 'insufficient funds'. Harsh.", "bad"); return; }
      p.cash -= cost;
      if (action === "bag") {
        const bag = U.pick(["coke", "xans", "kpin", "quaalude", "juice", "weed"]);
        if (bag === "weed") p.weed += 1; else p.drugs[bag] = (p.drugs[bag] || 0) + 1;
        this.ticker("Mystery bag purchased: " + bag.toUpperCase() + ". It arrived before you paid.", "gold");
        ST.audio.cash();
      } else if (action === "xans") {
        p.drugs.xans = (p.drugs.xans || 0) + 3;
        this.ticker("3 XANS acquired. The bottle says 'for the vibes'.", "gold");
        ST.audio.cash();
      } else if (action === "hit") {
        this.addRespect(15, "bribe");
        const self = this;
        setTimeout(() => {
          self.say("A guy in a ski mask arrives. \"I'm not doing that.\" He leaves. You paid $250.");
          self.ticker("The hitman declined. Your reputation is intact, somehow.", "bad");
        }, 3200);
      } else if (action === "coach") {
        this.addRespect(60, "bribe");
        this.objective = "Get $1,000 cash and 1,500 Respect, then take over the club. The coach believes in you. Sort of.";
        this.ticker("KINGPIN COACH: 'Stop buying drugs on the internet and become the kingpin.'", "gold");
      } else if (action === "files") {
        this.addRespect(5, "bribe");
        this.ticker("LEAKED FILE: The mayor is crying at the mall. The file is a selfie.", "gold");
      }
      this.ui.updateHUD(p);
      this._updateTutorial();
    }

    skipTutorial() {
      this.tutorial.done = true;
      this.ui.hideTutorial();
      this.ticker("Tutorial skipped. You know enough. Probably.", "gold");
    }

    _updateTutorial() {
      if (this.tutorial.done) return;
      const p = this.player;
      if (!this.tutorial.start) this.tutorial.start = { x: p.body.position.x, z: p.body.position.z };
      const start = this.tutorial.start;
      const steps = [
        () => Math.hypot(p.body.position.x - start.x, p.body.position.z - start.z) > 2.5,
        () => p.punchCount > 0,
        () => p.clawCount > 0,
        () => p.drunk > 0 || p.stoned > 0 || !!p.smoking,
        () => this.phoneOpened,
        () => p.interactCount > 0 || p.weapon !== "fists"
      ];
      const texts = [
        "<b>WASD</b> — move. <b>Shift</b> — sprint. <b>Space</b> — jump.",
        "<b>LMB</b> — punch. Aim at a person. Or a window. Windows deserve it.",
        "<b>RMB</b> — the Claw. Grab a chair, a bottle, or a person.",
        "<b>F</b> beer · <b>B</b> weed · <b>C</b> cigs · <b>V</b> vape · <b>R</b> hold to pee.",
        "<b>T</b> — phone. Apps, radio, Weedmaps, Onion, drugs, DS.",
        "<b>E</b> — interact. <b>1–5</b> — weapons. <b>X/H</b> — fire tools."
      ];
      if (this.time - this.tutorial.lastAdvance < 0.4) return;
      const cur = this.tutorial.step;
      if (cur < steps.length && steps[cur]()) {
        this.tutorial.lastAdvance = this.time;
        this.tutorial.step++;
        if (this.tutorial.step >= steps.length) {
          this.tutorial.done = true;
          this.ui.hideTutorial();
          this.ticker("Tutorial complete. Now go become the kingpin of Shittown.", "gold");
        } else {
          this.ui.showTutorial(texts[this.tutorial.step], this.tutorial.step + 1, 6);
        }
      }
    }

    openSlots() {
      if (this.slotsOpen || this.phoneOpen || this.player.dead) return;
      this.slotsOpen = true;
      this.player.stopPee();
      this.player.stopExtinguish();
      this.releaseLock();
      this.ui.openSlots();
      this.ui.setPrompt("");
      this.ticker("You sit down at the machine. It remembers you.", "bad");
    }
    closeSlots() {
      if (!this.slotsOpen) return;
      this.slotsOpen = false;
      this.ui.resetSlots();
      this.requestLock();
      this.ticker("You walk away. The machine is still laughing.", "bad");
    }

    die() {
      if (this.player.dead) return;
      this.player.dead = true;
      this.player.stopPee();
      this.player.stopExtinguish();
      this.player.clearSmoking();
      this.deathHandled = false;
      this.stats.deaths++;
      this.releaseLock();
      this.input = {};
      this.ui.setPrompt("");
      this.ui.showDeath();
      this.audio.scream();
      this.audio.thunk();
      this.audio.funeral();
      this.saveStats();
    }
    respawn() {
      const spawn = this.world.getPlayerSpawn();
      this.player.respawn(spawn);
      this.input = {};
      this.deathHandled = false;
      this.ui.showHUD(true);
      this.ticker("You wake up outside the bar with a headache and no memory. Standard.", "gold");
      this.requestLock();
    }

    /* ---------------- scoring ---------------- */
    rankFor(respect) { return this.ui.rankFor(respect); }

    registerKill(npc) {
      const now = this.time;
      if (now - (this.lastKillAt || -99) < 4) this.killCombo = (this.killCombo || 1) + 1;
      else this.killCombo = 1;
      this.lastKillAt = now;
      const combo = this.killCombo;
      const cash = 12 + combo * 6;
      this.player.cash += cash;
      this.addRespect(8 + combo * 4, "bribe");
      this.shake(0.6);
      this.ui.killPop(combo, cash);
      ST.audio.cash();
      if (combo >= 3) this.ticker("COMBO x" + combo + " — the town is having a very bad night.", "gold");
    }

    addRespect(n, type, name) {
      const before = this.rankFor(this.player.respect).name;
      this.player.respect += n;
      const after = this.rankFor(this.player.respect).name;
      this.chaos = U.clamp(this.chaos + Math.min(0.1, n / 300), 0, 1);
      if (type && (type !== "punch" || this.time - this._lastPunchTick > 1.2)) {
        const bank = ST.jokes.ticker[type] || ST.jokes.ticker.punch;
        let line = U.pick(bank);
        line = line.replace("{n}", Math.round(n)).replace("{name}", name || "some guy");
        this.ticker(line, type === "window" ? "bad" : "gold");
        if (type === "punch") this._lastPunchTick = this.time;
      }
      if (after !== before) {
        this.ui.rankUp(after);
        ST.audio.rankUp();
        this.ticker("+" + Math.round(n) + " RESPECT — you are now " + after + ". Nobody is proud.", "gold");
        this.saveStats();
      }
      if (this.player.respect > this.stats.bestRespect) this.saveStats();
    }

    addWanted(n) {
      const old = Math.floor(this.player.wanted);
      this.player.wanted = U.clamp(this.player.wanted + n, 0, 5);
      this.lastCrime = this.time;
      const now = Math.floor(this.player.wanted);
      if (now > old) {
        ST.audio.siren(1.1, 0.6);
        this.ticker(U.pick(ST.jokes.ticker.wanted), "bad");
        this.ticker("WANTED LEVEL " + now + " — " + ["", "the cops know your name.", "they brought backup.", "they brought guns.", "they brought a SWAT van.", "they brought the National Guard."][now], "bad");
      }
    }

    crime() {
      this.lastCrime = this.time;
      this.chaos = U.clamp(this.chaos + 0.08, 0, 1);
      if (this.time - this._witnessT > 3.2) {
        this._witnessT = this.time;
        const p = this.player.body.position;
        this.npcs.witnessCrime(new THREE.Vector3(p.x, 0, p.z));
        if (U.chance(0.4)) this.ticker(U.pick(ST.jokes.ticker.crime), "bad");
      }
    }

    reportCrime(npc) {
      this.addWanted(1);
      this.ticker(npc.name + ": \"I'M CALLING THE COPS! I ALREADY DID!\"", "bad");
    }

    jackpot() {
      const p = this.player.body.position;
      this.world.spawnCash(p.x + U.rand(-2, 2), p.z + U.rand(-2, 2), 120);
      this.addWanted(1.5);
      this.chaos = 1;
      this.ticker(U.pick(ST.jokes.ticker.jackpot), "gold");
      this.say("The machine screams. The lights flicker. Somewhere, a cop gets in his car.");
      this.shake(0.7);
    }

    updateRadioLabel() {
      if (!this.settings.musicOn) { this.ui.setRadio("SOUNDTRACK OFF"); return; }
      const names = ST.jokes.radioNames;
      this.ui.setRadio((names[this.audio.station] || "—") + (this.radioManual > 0 ? " · MANUAL" : ""));
    }

    dude(text) {
      if (!text) return;
      if (this.time - (this._lastDude || 0) < 3.5) return;
      this._lastDude = this.time;
      this.ui.say((this.heroName || "SHITASS") + ": " + text);
    }

    ticker(msg, kind) { this.ui.ticker(msg, kind); }
    tickerIf(cond, msg, kind) { if (cond) this.ticker(msg, kind); }
    say(text) { this.ui.say(text); }
    shake(v) { this.player.shake = Math.min(1.6, Math.max(this.player.shake, v)); }

    spawnTracer(from, to) {
      const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
      const mat = new THREE.LineBasicMaterial({ color: 0xffe86a, transparent: true, opacity: 0.9 });
      const line = new THREE.Line(geo, mat);
      this.scene.add(line);
      setTimeout(() => {
        this.scene.remove(line);
        geo.dispose();
        mat.dispose();
      }, 70);
    }

    /* ---------------- loop ---------------- */
    _loop(now) {
      requestAnimationFrame(this._loop);
      this._step(now);
    }

    _step(now) {
      const dtRaw = Math.min(0.1, Math.max(0, (now - this.last) / 1000));
      this.last = now;

      try {
        this.fpsAcc += dtRaw;
        this.fpsFrames++;
        if (this.fpsAcc > 0.5) {
          this.fps = Math.round(this.fpsFrames / this.fpsAcc);
          this.ui.setFps(this.fps);
          this.fpsAcc = 0;
          this.fpsFrames = 0;
          if (this.started && !this.paused && !this.cutsceneOpen) {
            if (this.fps < 28) this.slowT = (this.slowT || 0) + 0.5;
            else this.slowT = 0;
            if (this.slowT > 4) {
              this.slowT = 0;
              if (this.settings.quality === "high") {
                this.setQuality("medium");
                this.ticker("Auto quality: 360p, so the party keeps moving.", "gold");
              } else if (this.settings.quality === "medium") {
                this.setQuality("low");
                this.ticker("Auto quality: 240p. Maximum framerate, minimum dignity.", "gold");
              }
            }
          }
        }

        if (ST.mp) ST.mp.update(dtRaw);

        if (this.marker) {
          const pp = this.player.body.position;
          const md = Math.hypot(this.marker.position.x - pp.x, this.marker.position.z - pp.z);
          this.ui.setObjectiveDistance(md);
          this.marker.rotation.y += dtRaw * 0.8;
          const beam = this.marker.children[0];
          const ring = this.marker.children[1];
          const arrow = this.marker.children[2];
          if (beam) beam.material.opacity = 0.16 + Math.sin(this.time * 3) * 0.09;
          if (ring) ring.scale.setScalar(1 + Math.sin(this.time * 2.4) * 0.12);
          if (arrow) {
            arrow.position.y = 8.4 + Math.sin(this.time * 2) * 0.35;
            arrow.rotation.y += dtRaw * 2;
          }
        } else {
          this.ui.setObjectiveDistance(null);
        }

        if (!this.started) {
          // gentle menu orbit over the town
          this.time += dtRaw;
          const a = this.time * 0.08;
          this.camera.position.set(Math.sin(a) * 34, 15 + Math.sin(this.time * 0.2) * 2, Math.cos(a) * 34);
          this.camera.lookAt(0, 3.5, -6);
        } else if (!this.paused && !this.slotsOpen && !this.phoneOpen && !this.cutsceneOpen && !this.creditsOpen && !this.player.dead) {
          this.acc += dtRaw;
          let steps = 0;
          while (this.acc >= 1 / 60 && steps < 5) {
            const scale = this.slowmo > 0 ? 0.35 : 1;
            this.world.physics.step((1 / 60) * scale);
            this.world.update((1 / 60) * scale);
            this.player.update((1 / 60) * scale);
            this.npcs.update((1 / 60) * scale);
            this.acc -= (1 / 60);
            steps++;
          }
          if (steps === 5) this.acc = 0;
          if (this.slowmo > 0) this.slowmo -= dtRaw;
          this._gameUpdate(dtRaw);
        } else {
          this.time += dtRaw;
        }

        this.renderer.render(this.scene, this.camera);
      } catch (err) {
        this._frameErrors = (this._frameErrors || 0) + 1;
        this._lastFrameError = String((err && err.stack) || err).slice(0, 400);
        if (this._frameErrors < 6) console.error("[SHITTOWN] frame error (loop continues)", err);
      }
    }

    _gameUpdate(dt) {
      this.time += dt;
      const p = this.player;
      this.chaos = Math.max(0, this.chaos - dt * 0.03);

      // wanted decays when you stop being awful for a while
      if (this.time - this.lastCrime > 12 && p.wanted > 0) {
        p.wanted = Math.max(0, p.wanted - dt * 0.28);
      }
      const wi = Math.floor(p.wanted);
      if (wi === 0 && this.prevWanted > 0) {
        this.ticker(U.pick(ST.jokes.ticker.calm), "gold");
      }
      this.prevWanted = wi;

      // audio
      this.audio.setIntensity(U.clamp(p.wanted / 5 * 0.7 + this.chaos * 0.35 + 0.12, 0, 1));
      if (this.radioManual > 0) this.radioManual -= dt;
      if (!this.slotsOpen && this.radioManual <= 0) {
        let st = "street";
        const x = p.body.position.x, z = p.body.position.z;
        if (p.wanted >= 2) st = "heat";
        else if (x > -38 && x < -18 && z > -34 && z < -20) st = "bar";
        else if (x > 10 && x < 34 && z > -36 && z < -20) st = "club";
        else if (x > -20 && x < 20 && z > 38 && z < 52) st = "bar";
        else if (x > 38 && x < 48 && z > 0 && z < 10) st = "club";
        this.audio.setStation(st);
      }
      this.updateRadioLabel();

      // ambient flavor
      this._ambientT -= dt;
      if (this._ambientT <= 0) {
        this._ambientT = U.rand(40, 70);
        this.ticker("Tip: " + U.pick(ST.jokes.tips).replace(/^Tip:\s*/, ""));
      }

      this.ui.updateHUD(p);
      this.radarT -= dt;
      if (this.radarT <= 0) { this.radarT = 0.2; this.ui.drawRadar(this); }
      this._updateTutorial();
      this._updateStory();
    }

    /* ---------------- debug / test hooks ---------------- */
    _bindDebug() {
      const self = this;
      window.SHITTOWN = {
        ready: true,
        game: this,
        snapshot() {
          const p = self.player;
          return {
            health: p.health, cash: p.cash, respect: p.respect, wanted: p.wanted,
            drunk: p.drunk, bladder: p.bladder, beer: p.beer, cigs: p.cigs,
            x: Math.round(p.body.position.x * 10) / 10,
            y: Math.round(p.body.position.y * 10) / 10,
            z: Math.round(p.body.position.z * 10) / 10,
            npcs: self.npcs.all.length,
            downed: self.npcs.all.filter((n) => n.down).length,
            knocked: self.npcs.all.filter((n) => n.knocked).length,
            props: self.world.props.length,
            fires: self.world.fires.length,
            station: self.audio.station,
            audio: self.audio.ready,
            started: self.started, paused: self.paused, slots: self.slotsOpen, phone: self.phoneOpen
          };
        },
        start() { self.start(); },
        teleport(x, z) { self.player.body.position.set(x, 1.2, z); self.player.body.velocity.set(0, 0, 0); },
        look(yaw, pitch) { self.player.yaw = yaw; self.player.pitch = pitch || 0; },
        punch() { self.player.punch(); },
        kick() { self.player.kick(); },
        claw() { self.player.clawDown(); },
        release() { self.player.clawRelease(); },
        drink() { self.player.drink(); },
        pee() { self.player.pee(); },
        smoke() { self.player.smoke(); },
        interact() { self.player.interact(); },
        give(n) { self.player.cash += n; },
        respect(n) { self.addRespect(n, "bribe"); },
        wanted(n) { self.addWanted(n); },
        heal() { self.player.health = self.player.maxHealth; },
        openSlots() { self.openSlots(); },
        openPhone(app) { self.openPhone(app || "home"); },
        closePhone() { self.closePhone(); },
        giveWeapon(t, ammo) { self.player.giveWeapon(t, ammo); },
        weed(n) { self.player.weed += (n || 1); },
        squeak() { self.player.squeak(); },
        smokeWeed() { self.player.smokeWeed(); },
        vape() { self.player.vape(); },
        drug(n) { self.player.useDrug(n); },
        orderWeed(n) { self.orderWeed(n); },
        torBuy(n) { self.torBuy(n); },
        skipTutorial() { self.skipTutorial(); },
        skipCutscene() { self.skipCutscene(); },
        disableStory() { self.disableStory(); },
        story() { return JSON.parse(JSON.stringify(self.story)); },
        bong() { self.player.bongHit(); },
        attack() { self.player.attack(); },
        spin() { self.ui.spin(); },
        closeSlots() { self.closeSlots(); },
        setStation(s) { self.audio.setStation(s); },
        explode(x, z) { self.world.explode(new THREE.Vector3(x, 0.6, z), 7, 1); },
        fires() { return self.world.fires.length; },
        fireAt(x, z) { self.world.addFire(x, z, 1, 20); },
        breakAt(x, z) { self.world.explode(new THREE.Vector3(x, 0.4, z), 5, 0.6); },
        npcPositions() { return self.npcs.all.filter((n) => !n.down).map((n) => ({ name: n.name, kind: n.kind, x: n.body.position.x, z: n.body.position.z })); },
        closestNpc() {
          let best = null, bd = 1e9;
          self.npcs.all.forEach((n) => {
            if (n.down) return;
            const d = Math.hypot(n.body.position.x - self.player.body.position.x, n.body.position.z - self.player.body.position.z);
            if (d < bd) { bd = d; best = n; }
          });
          return best ? { name: best.name, kind: best.kind, dist: bd, x: best.body.position.x, z: best.body.position.z } : null;
        }
      };
    }
  }

  function boot() {
    try {
      ST.game = new Game();
      const params = new URLSearchParams(location.search);
      if (ST.Multiplayer && (params.get("online") === "1" || localStorage.getItem("shittown.online") === "1")) {
        ST.mp = new ST.Multiplayer(ST.game);
        setTimeout(() => ST.mp.connect(), 700);
      }
      console.log("[SHITTOWN] ready. No portals. No plot. No excuses.");
    } catch (err) {
      console.error("[SHITTOWN] failed to boot", err);
      const b = document.getElementById("boot");
      if (b) {
        b.innerHTML = "<div class='boot-inner'><h1 class='boot-title' style='font-size:64px'>BROKE</h1><p class='boot-warn-body'>" +
          String(err && err.message || err) + "</p></div>";
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
