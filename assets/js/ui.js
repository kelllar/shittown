/* SHITTOWN — ui.js
   All the words and bars. The HUD, the ticker, the pause menu,
   the death screen, and everybody's favorite rigged slot machine. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;
  const $ = (id) => document.getElementById(id);

  const SLOT_SYMBOLS = [
    { label: "7", weight: 6 },
    { label: "SKULL", weight: 9 },
    { label: "BAR", weight: 18 },
    { label: "BTL", weight: 30 },
    { label: "PIG", weight: 30 }
  ];
  const SLOT_PAYS = { "7": 50, "SKULL": 20, "BAR": 10, "BTL": 5, "PIG": 5 };

  class UI {
    constructor(game) {
      this.game = game;
      this.el = {
        hud: $("hud"), health: $("hud-health"), drunk: $("hud-drunk"), bladder: $("hud-bladder"),
        cash: $("hud-cash"), stars: $("hud-stars"), rank: $("hud-rank"), respectVal: $("hud-respect-val"),
        respectFill: $("hud-respect-fill"), ticker: $("ticker"), subtitle: $("subtitle"),
        prompt: $("prompt"), hitmarker: $("hitmarker"), fps: $("fps"), itemHint: $("item-hint"),
        high: $("hud-high"), weaponName: $("weapon-name"), weaponAmmo: $("weapon-ammo"), speedlines: $("speedlines"),
        radio: $("radio-station"), fxHigh: $("fx-high"),
        phone: $("phone"), phoneClock: $("phone-clock"),
        shitterFeed: $("shitter-feed"), crackedList: $("cracked-list"), walletBody: $("wallet-body"), radioBody: $("radio-body"),
        drugsBody: $("drugs-body"), weedmapBody: $("weedmap-body"), torBody: $("tor-body"), guideBody: $("guide-body"),
        tutorial: $("tutorial"), tutorialText: $("tutorial-text"), tutorialStep: $("tutorial-step"),
        cutscene: $("cutscene"), cutTitle: $("cutscene-title"), cutText: $("cutscene-text"),
        cutNext: $("cutscene-next"), cutSkip: $("cutscene-skip"),
        objective: $("objective"), objectiveText: $("objective-text"), objectiveDist: $("objective-dist"),
        missionsBody: $("missions-body"),
        radar: $("radar"), radarClock: $("radar-clock"), gore: $("fx-gore"),
        dsCanvas: $("ds-canvas"), dsScore: $("ds-score"), dsHint: $("ds-hint"),
        boot: $("boot"), bootTip: $("boot-tip"),
        pause: $("pause"), death: $("death"), deathTip: $("death-tip"), deathCount: $("death-count"),
        rankup: $("rankup"), rankupName: $("rankup-name"),
        slots: $("slots"), slotResult: $("slot-result"), slotCash: $("slot-cash"), slotBet: $("slot-bet"),
        reel: [$("reel0"), $("reel1"), $("reel2")]
      };
      this.promptText = "";
      this.subTimer = null;
      this.hitTimer = null;
      this.hurtTimer = null;
      this.rankTimer = null;
      this.deathTimer = null;
      this.spinTimers = [];
      this.spinning = false;
      this.bet = 5;
      this.slotOpen = false;
      this.phoneApp = "home";
      this.phoneFocus = 0;
      this.crackedActive = -1;
      this.dsGame = "snake";
      this.dsRAF = null;
      this.dsLast = 0;
      this.dsState = null;
      this.phoneClockTimer = null;
      this.bind();
    }

    bind() {
      $("boot-start").addEventListener("click", () => this.game.start());
      $("cutscene-next").addEventListener("click", () => this.nextCutscene());
      $("cutscene-skip").addEventListener("click", () => this.skipCutscene());
      $("pause-resume").addEventListener("click", () => this.game.resume());
      $("pause-quit").addEventListener("click", () => location.reload());
      const cc = $("credits-close");
      if (cc) cc.addEventListener("click", () => this.game.closeCredits());
      $("slot-spin").addEventListener("click", () => this.spin());
      $("slot-bet-up").addEventListener("click", () => this.changeBet(1));
      $("slot-bet-down").addEventListener("click", () => this.changeBet(-1));
      $("slot-leave").addEventListener("click", () => this.game.closeSlots());
      const master = $("set-master"), music = $("set-music"), mouse = $("set-mouse"), quality = $("set-quality");
      master.addEventListener("input", () => {
        this.game.settings.master = master.value / 100;
        ST.audio.setMaster(this.game.settings.master);
        this.game.saveSettings();
      });
      music.addEventListener("input", () => {
        this.game.settings.music = music.value / 100;
        ST.audio.setMusic(this.game.settings.music);
        this.game.saveSettings();
      });
      mouse.addEventListener("input", () => {
        this.game.settings.mouse = mouse.value / 100;
        this.game.saveSettings();
      });
      quality.addEventListener("change", () => {
        this.game.settings.quality = quality.value;
        this.game.setQuality(quality.value);
        this.game.saveSettings();
      });
      $("audio-toggle").addEventListener("click", () => {
        const muted = this.game.audio.toggleMute();
        this.updateAudioButton();
        this.game.ticker(muted ? "Audio muted." : "Audio on.", "gold");
      });
      $("music-toggle").addEventListener("click", () => {
        const g = this.game;
        g.settings.musicOn = !g.settings.musicOn;
        g.audio.setMusicEnabled(g.settings.musicOn);
        g.saveSettings();
        this.updateMusicButton();
        g.updateRadioLabel();
        g.ticker(g.settings.musicOn ? "Soundtrack ON. Please enjoy responsibly." : "Soundtrack OFF. Silence restored.", "gold");
      });
      document.querySelectorAll(".app-btn").forEach((btn) => {
        btn.addEventListener("click", () => this._showApp(btn.dataset.app));
      });
      document.querySelectorAll("[data-back]").forEach((btn) => {
        btn.addEventListener("click", () => { this.crackedActive = -1; this._showApp("home"); });
      });
      $("phone-close").addEventListener("click", () => this.game.closePhone());
      $("phone-back-main").addEventListener("click", () => { this.crackedActive = -1; this._showApp("home"); });
      $("shitter-refresh").addEventListener("click", () => { this.renderShitter(); ST.audio.click(); });
      $("cracked-list").addEventListener("click", (e) => {
        const row = e.target.closest("[data-chat]");
        if (row) this._openChat(parseInt(row.dataset.chat, 10));
      });
      $("drugs-body").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-drug]");
        if (!btn) return;
        this.game.player.useDrug(btn.dataset.drug);
        this.renderDrugs();
        this.game.ui.updateHUD(this.game.player);
      });
      $("weedmap-body").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-weedmap]");
        if (!btn) return;
        this.game.orderWeed(parseInt(btn.dataset.weedmap, 10));
        this.renderWeedmap();
        this.game.ui.updateHUD(this.game.player);
      });
      $("tor-body").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-tor]");
        if (!btn) return;
        this.game.torBuy(btn.dataset.tor);
        this.renderTor();
        this.game.ui.updateHUD(this.game.player);
      });
      $("guide-body").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-guide]");
        if (!btn) return;
        if (btn.dataset.guide === "skip") this.game.skipTutorial();
        if (btn.dataset.guide === "close") this.game.closePhone();
      });
      $("radio-body").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-radio]");
        if (!btn) return;
        const g = this.game;
        const value = btn.dataset.radio;
        if (value === "off") {
          g.settings.musicOn = false;
          g.audio.setMusicEnabled(false);
          g.ticker("Soundtrack off. Silence restored.", "gold");
        } else {
          g.settings.musicOn = true;
          g.audio.setMusicEnabled(true);
          g.audio.setStation(value);
          g.radioManual = 600;
          g.ticker("Radio: " + ST.jokes.radioNames[value], "gold");
        }
        g.saveSettings();
        this.updateMusicButton();
        this.renderRadio();
        g.updateRadioLabel();
        ST.audio.click();
      });
      document.querySelectorAll("[data-ds]").forEach((btn) => {
        btn.addEventListener("click", () => { this._dsInit(btn.dataset.ds); ST.audio.click(); });
      });
      $("ds-restart").addEventListener("click", () => { this._dsInit(this.dsGame); ST.audio.click(); });
      this.el.bootTip.textContent = "Tip: " + U.pick(ST.jokes.tips).replace(/^Tip:\s*/, "");
    }

    syncSettings() {
      const s = this.game.settings;
      $("set-master").value = Math.round(s.master * 100);
      $("set-music").value = Math.round(s.music * 100);
      $("set-mouse").value = Math.round(s.mouse * 100);
      $("set-quality").value = s.quality;
      this.updateAudioButton();
      this.updateMusicButton();
    }
    updateAudioButton() {
      const btn = $("audio-toggle");
      if (btn) btn.textContent = ST.audio.muted ? "AUDIO: OFF (MUTED)" : "AUDIO: ON";
    }
    updateMusicButton() {
      const btn = $("music-toggle");
      if (btn) btn.textContent = "SOUNDTRACK: " + (this.game.settings.musicOn ? "ON" : "OFF");
    }

    /* ---------------- phone ---------------- */
    openPhone(app) {
      this.phoneApp = app || "home";
      this.el.phone.classList.remove("hidden");
      this._showApp(this.phoneApp);
      this._updateClock();
      clearInterval(this.phoneClockTimer);
      this.phoneClockTimer = setInterval(() => this._updateClock(), 30000);
    }
    closePhone() {
      this.el.phone.classList.add("hidden");
      clearInterval(this.phoneClockTimer);
      this._stopDS();
    }
    _updateClock() {
      const d = new Date();
      let h = d.getHours() % 12; if (h === 0) h = 12;
      this.el.phoneClock.textContent = h + ":" + String(d.getMinutes()).padStart(2, "0");
    }
    _showApp(name) {
      ["home", "missions", "shitter", "cracked", "wallet", "radio", "drugs", "weedmap", "tor", "guide", "ds"].forEach((a) => {
        const el = $("app-" + a);
        if (el) el.classList.toggle("hidden", a !== name);
      });
      this.phoneApp = name;
      if (name === "missions") this.renderMissions();
      if (name === "shitter") this.renderShitter();
      if (name === "cracked") this.renderCracked();
      if (name === "wallet") this.renderWallet();
      if (name === "radio") this.renderRadio();
      if (name === "drugs") this.renderDrugs();
      if (name === "weedmap") this.renderWeedmap();
      if (name === "tor") this.renderTor();
      if (name === "guide") this.renderGuide();
      if (name === "ds") this._startDS(); else this._stopDS();
      if (name === "home") this._renderPhoneFocus();
    }
    _esc(s) {
      return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
    renderMissions() {
      const g = this.game;
      const s = g.story || { stage: 0 };
      const stages = g.getStoryMissions();
      const rows = stages.map((m, i) => {
        const state = i < s.stage ? "done" : i === s.stage ? "current" : "locked";
        const mark = state === "done" ? "✓" : state === "current" ? "▶" : "·";
        return "<div class='mission-row " + state + "'><b>" + mark + " " + (i + 1) + "</b><div><span>" +
          this._esc(m.title) + "</span>" + (state === "current" ? "<em>" + this._esc(m.obj) + "</em>" : "") + "</div></div>";
      }).join("");
      this.el.missionsBody.innerHTML =
        "<div class='mission-head'>STORY MODE · " + Math.min(s.stage + 1, stages.length) + "/" + stages.length + "</div>" +
        rows +
        "<div class='phone-note'>Follow the yellow beam. Missions never expire. The town does.</div>";
    }

    missionBanner(title) {
      const el = document.createElement("div");
      el.className = "mission-banner";
      el.innerHTML = "<small>NEW MISSION</small><b>" + this._esc(title) + "</b>";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 2600);
    }

    setObjectiveDistance(metres) {
      if (!this.el.objectiveDist) return;
      this.el.objectiveDist.textContent = (metres === null || metres === undefined) ? "" : " · " + Math.round(metres) + "m";
    }

    renderShitter() {
      const p = this.game.player;
      const posts = [];
      const wanted = Math.floor(p.wanted);
      if (wanted > 0) {
        posts.push({ who: "@SHITTOWN_SCANNER", body: "WANTED LEVEL " + wanted + ": suspect last seen near " + ["the bar", "the mall", "a dumpster", "420 DEPOT", "Pop's Chicken"][wanted % 5] + ". Approach with caution or a bucket." });
      }
      if (p.respect > 500) posts.push({ who: "@TOWN_CRYER", body: "Local man reaches " + U.fmt(p.respect) + " Respect. Experts say 'why'." });
      if (p.cash < 5) posts.push({ who: "@BROKE_BOY_DS", body: "anyone got $5. not for food. for the slots." });
      if (p.stoned > 30) posts.push({ who: "@DAVE_420", body: "whoever is outside my shop talking to the pigeon: come inside, man." });
      const pool = ST.jokes.phonePosts.slice();
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      const feed = posts.concat(pool.slice(0, 9));
      this.el.shitterFeed.innerHTML = feed.map((post) => (
        "<div class='post" + (post.body.indexOf("pee") >= 0 ? " nsfw" : "") + "'>" +
        "<div class='who'>" + this._esc(post.who) + "</div>" +
        "<div class='body'>" + this._esc(post.body) + "</div>" +
        "<div class='meta'>" + U.randInt(3, 998) + " likes · " + U.randInt(0, 42) + " replies</div></div>"
      )).join("");
    }
    renderCracked() {
      if (this.crackedActive < 0) {
        this.el.crackedList.innerHTML = ST.jokes.crackedChats.map((c, i) => (
          "<div class='cracked-row' data-chat='" + i + "'>" +
          "<div class='cracked-name'>" + this._esc(c.name) + "</div>" +
          "<div class='cracked-msg'>" + this._esc(c.msg) + "</div></div>"
        )).join("");
        return;
      }
      const chat = ST.jokes.crackedChats[this.crackedActive];
      const log = this.chatLogs && this.chatLogs[this.crackedActive];
      const bubbles = (log || []).map((m) => (
        "<div class='cracked-bubble' style='" + (m.me ? "margin-left:18px;margin-right:0;background:#1a3a24;" : "") + "'>" +
        (m.me ? "<b>YOU:</b> " : "") + this._esc(m.text) + "</div>"
      )).join("");
      this.el.crackedList.innerHTML =
        "<div class='cracked-name' style='margin-bottom:6px'>" + this._esc(chat.name) + "</div>" +
        bubbles +
        "<button class='mini-btn' id='cracked-reply' style='margin-top:6px'>REPLY</button>";
      const replyBtn = $("cracked-reply");
      if (replyBtn) replyBtn.addEventListener("click", () => this._crackedReply());
    }
    _openChat(i) {
      this.crackedActive = i;
      if (!this.chatLogs) this.chatLogs = {};
      if (!this.chatLogs[i]) {
        this.chatLogs[i] = [{ me: false, text: ST.jokes.crackedChats[i].msg }];
      }
      this.renderCracked();
    }
    _crackedReply() {
      const i = this.crackedActive;
      const chat = ST.jokes.crackedChats[i];
      if (!chat) return;
      if (!this.chatLogs[i]) this.chatLogs[i] = [];
      this.chatLogs[i].push({ me: true, text: U.pick(chat.replies) });
      this.renderCracked();
      ST.audio.click();
      const responses = [
        "lol ok",
        "that's not what I asked but sure",
        "come outside",
        "you're weird, man",
        "bring money",
        "don't bring the chicken",
        "seen. do not come here.",
        "this is a Wendy's"
      ];
      setTimeout(() => {
        if (!this.chatLogs || this.crackedActive !== i) return;
        this.chatLogs[i].push({ me: false, text: U.pick(responses) });
        if (this.phoneApp === "cracked") this.renderCracked();
      }, 650);
    }
    renderWallet() {
      const p = this.game.player;
      const rank = this.rankFor(p.respect);
      this.el.walletBody.innerHTML =
        "<div class='wallet-card'><div class='who'>CASH ON HAND</div><div class='big'>" + U.money(p.cash) + "</div>" +
        "<div class='wallet-row'><span>RESPECT</span><b>" + U.fmt(p.respect) + "</b></div>" +
        "<div class='wallet-row'><span>RANK</span><b>" + rank.name + "</b></div>" +
        "<div class='wallet-row'><span>WEED</span><b>" + p.weed + " bags</b></div>" +
        "<div class='wallet-row'><span>PAPERS / WRAPS</span><b>" + p.papers + " / " + p.wraps + "</b></div>" +
        "<div class='wallet-row'><span>BEER</span><b>" + U.amount(p.beer) + "</b></div>" +
        "<div class='wallet-row'><span>WANTED</span><b>" + Math.floor(p.wanted) + " / 5</b></div>" +
        "<div class='wallet-row'><span>KO'd BY YOU</span><b>" + this.game.stats.ko + "</b></div>" +
        "<div class='wallet-row'><span>DEATHS</span><b>" + this.game.stats.deaths + "</b></div></div>" +
        "<div class='phone-note'>CRACKPHONE BANKING · FDIC NOT INVOLVED</div>";
    }
    renderDrugs() {
      const p = this.game.player;
      const defs = {
        juice: ["JUICE", "Strength + speed. Your veins have opinions."],
        coke: ["COKE", "Fast, loud, and bad at math. Punch faster."],
        xans: ["XANS", "Everything is fine. Damage hurts less."],
        kpin: ["K-PINS", "You are a puddle. Everything hurts less."],
        quaalude: ["QUAALUDES", "The floor is a suggestion. Maximum wobble."]
      };
      const status = p.activeDrug ? "<div class='shop-card'><h4>ACTIVE: " + p.activeDrug.toUpperCase() + "</h4><div class='shop-desc'>" + Math.ceil(p.drugT) + "s left · effects are flowing</div></div>" : "";
      this.el.drugsBody.innerHTML = status + Object.keys(defs).map((key) => {
        const count = p.drugs[key] || 0;
        return "<div class='shop-card'><h4>" + defs[key][0] + " <span class='drug-count'>×" + count + "</span></h4>" +
          "<div class='shop-desc'>" + defs[key][1] + "</div>" +
          "<div class='shop-row'><button class='mini-btn' data-drug='" + key + "' " + (count <= 0 ? "disabled" : "") + ">USE</button></div></div>";
      }).join("") + "<div class='phone-note'>SIDE EFFECTS: EVERYTHING</div>";
    }

    renderWeedmap() {
      this.el.weedmapBody.innerHTML =
        "<div class='tor-banner'>WEEDMAPS · FIND YOUR HIGH</div>" +
        "<div class='shop-card'><h4>420 DEPOT <span style='color:#5cff86'>0.3 mi · OPEN</span></h4>" +
        "<div class='shop-desc'>Medical? Sure. Dave says it's tomatoes. $15 a bag. Delivery 30-45 minutes. It's already in your pocket.</div>" +
        "<div class='shop-row'><span class='price'>$15</span><button class='mini-btn' data-weedmap='15'>ORDER</button></div></div>" +
        "<div class='shop-card'><h4>DAVE'S VAN <span style='color:#ffd400'>0.1 mi · SKETCHY</span></h4>" +
        "<div class='shop-desc'>No address. No license. No problem. Dave will meet you behind the dumpster.</div>" +
        "<div class='shop-row'><span class='price'>$10</span><button class='mini-btn' data-weedmap='10'>CALL DAVE</button></div></div>" +
        "<div class='shop-card'><h4>MALL BATHROOM GUY <span style='color:#ff2d78'>0.2 mi · ???</span></h4>" +
        "<div class='shop-desc'>He's in the third stall. He has a bag. He won't say what's in it.</div>" +
        "<div class='shop-row'><span class='price'>$8</span><button class='mini-btn' data-weedmap='8'>ORDER</button></div></div>" +
        "<div class='phone-note'>WEEDMAPS DOES NOT CONDONE CRIME. WE JUST MAP IT.</div>";
    }

    renderTor() {
      const p = this.game.player;
      this.el.torBody.innerHTML =
        "<div class='tor-banner'>ONION BROWSER<br><span style='font-size:8px;color:#9dd0aa'>YOUR IP IS 127.0.0.1 · NICE · 100% NOT TRACKED</span></div>" +
        "<div class='tor-site'><div class='site'>SILK ROAD 3: THE SEQUEL</div><div class='url'>silkroad3.onion · 2,441 users</div>" +
        "<div class='desc'>Mystery bag. Could be weed, could be xans, could be a rock. $25.</div>" +
        "<div class='actions'><button class='mini-btn' data-tor='bag'>BUY BAG $25</button><button class='mini-btn' data-tor='xans'>3 XANS $40</button></div></div>" +
        "<div class='tor-site'><div class='site'>HITMEN 'R' US</div><div class='url'>definitelynotacop.onion · 12 reviews</div>" +
        "<div class='desc'>Professional problem removal. $250. We accept cash and vibes.</div>" +
        "<div class='actions'><button class='mini-btn' data-tor='hit'>HIRE $250</button></div></div>" +
        "<div class='tor-site'><div class='site'>LEAKED SHITTOWN FILES</div><div class='url'>files.onion · 1 file</div>" +
        "<div class='desc'>It's a photo of the mayor. He's at the mall. He's crying.</div>" +
        "<div class='actions'><button class='mini-btn' data-tor='files'>OPEN FILE</button></div></div>" +
        "<div class='tor-site'><div class='site'>KINGPIN COACH</div><div class='url'>kingpin.onion · online</div>" +
        "<div class='desc'>Become the kingpin in 30 days. Step one: stop asking the internet.</div>" +
        "<div class='actions'><button class='mini-btn' data-tor='coach'>COACH ME $150</button></div></div>" +
        "<div class='phone-note'>DARK WEB IS FICTION. DON'T BE DUMB IN REAL LIFE. CASH: " + U.money(p.cash) + "</div>";
    }

    renderGuide() {
      const g = this.game;
      this.el.guideBody.innerHTML =
        "<div class='guide-block'><h4>CURRENT OBJECTIVE</h4>" + this._esc(g.objective || "Become the kingpin of Shittown. Start by finding Slick at the club.") + "</div>" +
        "<div class='guide-block'><h4>MOVE / FIGHT</h4><b>WASD</b> move · <b>Mouse</b> look · <b>Shift</b> sprint · <b>Space</b> jump<br>" +
        "<b>LMB</b> punch/attack · while smoking/beer: drag/swig · <b>RMB</b> Claw · <b>Q</b> kick · <b>1–5</b> weapons</div>" +
        "<div class='guide-block'><h4>LIFE / CRIME</h4><b>E</b> interact / enter &amp; exit cars · <b>F</b> beer · <b>B</b> weed · <b>C</b> cigs · <b>V</b> vape<br>" +
        "<b>R</b> hold to pee (infinite, extinguishes fire) · <b>X</b> hold extinguisher · <b>H</b> water bottle</div>" +
        "<div class='guide-block'><h4>PHONE / STORY</h4><b>T</b> phone · <b>M</b> radio · <b>Z</b> first/third person · <b>ESC</b> pause<br>" +
        "Phone apps: Shitter, Cracked, Wallet, Radio, Drugs, Weedmaps, Onion, Guide, Double Screen.</div>" +
        "<div class='guide-block'><h4>FIRST 10 MINUTES</h4>1. Walk into the bar. 2. Buy a beer. 3. Find the shotgun behind the bar.<br>" +
        "4. Visit 420 Depot. 5. Sell a bag. 6. Meet Slick at the club. 7. Don't die.</div>" +
        "<div class='guide-block'><h4>LOCAL LAW</h4>Shittown, Kentucky. Weed is legal. Cops have not been informed. Smoke near people and they will cough, yell, and generally make it your problem.</div>" +
        "<div class='shop-row'><button class='mini-btn' data-guide='skip'>SKIP TUTORIAL</button><button class='mini-btn' data-guide='close'>CLOSE PHONE</button></div>" +
        "<div class='phone-note'>SHITTOWN WELCOMES YOU. NOW GET OUT THERE.</div>";
    }

    showTutorial(text, step, total) {
      if (!this.el.tutorial) return;
      this.el.tutorial.classList.remove("hidden");
      this.el.tutorialText.innerHTML = text;
      this.el.tutorialStep.textContent = step + "/" + total;
    }
    hideTutorial() {
      if (this.el.tutorial) this.el.tutorial.classList.add("hidden");
    }

    renderRadio() {
      const g = this.game;
      const names = ST.jokes.radioNames;
      const on = g.settings.musicOn;
      const current = g.audio.station;
      const stations = [
        ["street", "87.3 TOKYO RAIN", "LO-FI CITY POP"],
        ["bar", "90.1 SHINJUKU 3AM", "LATE JAZZ"],
        ["club", "96.5 SAKURA LOUNGE", "DOWNTEMPO"],
        ["heat", "102.7 ONI DRUMS", "LOW TAIKO"],
        ["casino", "108.1 PACHINKO DREAMS", "BELL LOUNGE"]
      ];
      this.el.radioBody.innerHTML =
        "<div class='radio-now'><small>NOW PLAYING</small>" +
        (on ? this._esc(names[current] || "—") : "SOUNDTRACK OFF") + "</div>" +
        "<button class='radio-station-btn off' data-radio='off'>■ SOUNDTRACK OFF <b>" + (on ? "" : "ACTIVE") + "</b></button>" +
        stations.map((st) => (
          "<button class='radio-station-btn' data-radio='" + st[0] + "'>" +
          "<span>" + this._esc(st[1]) + "<br><small>" + this._esc(st[2]) + "</small></span>" +
          "<b>" + (on && current === st[0] ? "PLAYING" : "TUNE") + "</b></button>"
        )).join("");
    }
    _renderPhoneFocus() {
      const apps = ["missions", "shitter", "cracked", "wallet", "radio", "drugs", "weedmap", "tor", "guide", "ds"];
      const buttons = Array.from(document.querySelectorAll("#app-home .app-btn"));
      buttons.forEach((b, i) => b.classList.toggle("selected", i === this.phoneFocus));
    }

    phoneKey(key) {
      if (this.phoneApp === "ds") { this.dsKey(key); return; }
      const apps = ["missions", "shitter", "cracked", "wallet", "radio", "drugs", "weedmap", "tor", "guide", "ds"];
      if (this.phoneApp !== "home") {
        if (key === "arrowleft" || key === "backspace") this._showApp("home");
        return;
      }
      if (key === "arrowdown" || key === "s") {
        this.phoneFocus = (this.phoneFocus + 1) % apps.length;
        this._renderPhoneFocus();
        ST.audio.click();
        return;
      }
      if (key === "arrowup" || key === "w") {
        this.phoneFocus = (this.phoneFocus + apps.length - 1) % apps.length;
        this._renderPhoneFocus();
        ST.audio.click();
        return;
      }
      if (key === "enter" || key === " ") {
        this._showApp(apps[this.phoneFocus]);
        ST.audio.click();
        return;
      }
      const idx = parseInt(key, 10) - 1;
      if (idx >= 0 && idx < apps.length) {
        this.phoneFocus = idx;
        this._renderPhoneFocus();
        this._showApp(apps[idx]);
      }
    }

    /* ---------------- DS emulator ---------------- */
    _startDS() {
      this._stopDS();
      this.el.dsHint.textContent = "ARROWS / WASD";
      this._dsInit(this.dsGame);
      // rAF can be throttled in some windows; a plain interval keeps the
      // handheld running no matter what the compositor is doing.
      this.dsTimer = setInterval(() => {
        if (this.phoneApp !== "ds") return;
        this._dsUpdate(1 / 30);
        this._dsDraw();
      }, 1000 / 30);
      this._dsDraw();
    }
    _stopDS() {
      if (this.dsRAF) cancelAnimationFrame(this.dsRAF);
      this.dsRAF = null;
      if (this.dsTimer) clearInterval(this.dsTimer);
      this.dsTimer = null;
    }
    _dsInit(game) {
      this.dsGame = game || "snake";
      if (this.dsGame === "snake") {
        this.dsState = {
          snake: [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }],
          dir: { x: 1, y: 0 }, next: { x: 1, y: 0 },
          food: { x: 13, y: 6 }, score: 0, timer: 0, over: false, won: false
        };
        this.el.dsScore.textContent = "SNAKE · 0";
      } else {
        this.dsState = {
          ball: { x: 80, y: 64, vx: U.pick([-1, 1]) * 70, vy: U.rand(-40, 40) },
          p1: 48, p2: 48, s1: 0, s2: 0, over: false
        };
        this.el.dsScore.textContent = "PONG · 0—0";
      }
      this.el.dsHint.textContent = this.dsGame === "snake" ? "ARROWS / WASD" : "UP / DOWN";
    }
    _dsUpdate(dt) {
      const s = this.dsState;
      if (!s) return;
      if (this.dsGame === "snake") {
        if (s.over) return;
        s.timer += dt;
        if (s.timer < 0.11) return;
        s.timer = 0;
        s.dir = s.next;
        const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 16) return this._dsOver();
        for (let i = 0; i < s.snake.length; i++) {
          if (s.snake[i].x === head.x && s.snake[i].y === head.y) return this._dsOver();
        }
        s.snake.unshift(head);
        if (head.x === s.food.x && head.y === s.food.y) {
          s.score += 10;
          this.el.dsScore.textContent = "SNAKE · " + s.score;
          ST.audio.slotTick();
          let nx, ny, tries = 0;
          do {
            nx = U.randInt(0, 19); ny = U.randInt(0, 15); tries++;
          } while (tries < 200 && s.snake.some((p) => p.x === nx && p.y === ny));
          s.food = { x: nx, y: ny };
        } else {
          s.snake.pop();
        }
      } else {
        if (s.over) return;
        const ball = s.ball;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.y < 8 || ball.y > 120) { ball.vy *= -1; ball.y = U.clamp(ball.y, 8, 120); }
        const px = 8;
        if (ball.x < px + 4 && ball.x > px - 4 && Math.abs(ball.y - s.p1) < 18) {
          ball.vx = Math.abs(ball.vx) * 1.04; ball.vy += (ball.y - s.p1) * 2.2;
        }
        if (ball.x > 152 - 4 && ball.x < 152 + 4 && Math.abs(ball.y - s.p2) < 18) {
          ball.vx = -Math.abs(ball.vx) * 1.04; ball.vy += (ball.y - s.p2) * 2.2;
        }
        const cpuTarget = U.clamp(ball.y - 8, 8, 120);
        s.p2 += U.clamp(cpuTarget - s.p2, -70 * dt, 70 * dt);
        if (ball.x < 0) { s.s2++; this._dsPoint(); }
        else if (ball.x > 160) { s.s1++; this._dsPoint(); }
        if (s.s1 >= 7 || s.s2 >= 7) {
          s.over = true;
          this.el.dsScore.textContent = "PONG · " + s.s1 + "—" + s.s2;
          this.el.dsHint.textContent = "SPACE TO RESTART";
        }
      }
    }
    _dsPoint() {
      const s = this.dsState;
      ST.audio.click();
      s.ball.x = 80; s.ball.y = 64;
      s.ball.vx = U.pick([-1, 1]) * 70;
      s.ball.vy = U.rand(-40, 40);
      this.el.dsScore.textContent = "PONG · " + s.s1 + "—" + s.s2;
    }
    _dsOver() {
      this.dsState.over = true;
      ST.audio.hurt();
      this.el.dsHint.textContent = "GAME OVER · SPACE";
    }
    dsKey(key) {
      const s = this.dsState;
      if (!s) return;
      const k = String(key).toLowerCase();
      if (this.dsGame === "snake") {
        if (k === " " || k === "enter") {
          if (s.over) this._dsInit("snake");
          return;
        }
        if (k === "arrowup" || k === "w") { if (s.dir.y === 0) s.next = { x: 0, y: -1 }; }
        if (k === "arrowdown" || k === "s") { if (s.dir.y === 0) s.next = { x: 0, y: 1 }; }
        if (k === "arrowleft" || k === "a") { if (s.dir.x === 0) s.next = { x: -1, y: 0 }; }
        if (k === "arrowright" || k === "d") { if (s.dir.x === 0) s.next = { x: 1, y: 0 }; }
      } else {
        if (k === " " || k === "enter") { if (s.over) this._dsInit("pong"); return; }
        if (k === "arrowup" || k === "w") s.p1 = Math.max(18, s.p1 - 14);
        if (k === "arrowdown" || k === "s") s.p1 = Math.min(110, s.p1 + 14);
      }
    }
    _dsDraw() {
      const ctx = this.el.dsCanvas.getContext("2d");
      const w = 160, h = 128;
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "#9bbc0f"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#8bac0f"; ctx.fillRect(0, 0, w, h);
      if (this.dsGame === "snake") {
        const s = this.dsState;
        if (!s) return;
        ctx.fillStyle = "#0f380f";
        ctx.fillRect(0, 0, w, 2); ctx.fillRect(0, h - 2, w, 2);
        ctx.fillRect(0, 0, 2, h); ctx.fillRect(w - 2, 0, 2, h);
        ctx.fillStyle = "#306230";
        for (let x = 0; x < 20; x++) for (let y = 0; y < 16; y++) if ((x + y) % 2) ctx.fillRect(x * 8, y * 8, 8, 8);
        ctx.fillStyle = "#0f380f";
        s.snake.forEach((p, i) => { ctx.fillRect(p.x * 8 + 1, p.y * 8 + 1, 6, 6); if (i === 0) { ctx.fillStyle = "#306230"; ctx.fillRect(p.x * 8 + 2, p.y * 8 + 2, 2, 2); ctx.fillStyle = "#0f380f"; } });
        ctx.fillStyle = "#0f380f";
        ctx.fillRect(s.food.x * 8 + 2, s.food.y * 8 + 2, 4, 4);
        if (s.over) {
          ctx.fillStyle = "rgba(15,56,15,.85)"; ctx.fillRect(10, 44, w - 20, 40);
          ctx.fillStyle = "#9bbc0f"; ctx.font = "bold 11px 'Courier New'"; ctx.textAlign = "center";
          ctx.fillText("GAME OVER", w / 2, 60);
          ctx.fillText("SCORE " + s.score, w / 2, 74);
        }
      } else {
        const s = this.dsState;
        if (!s) return;
        ctx.fillStyle = "#0f380f";
        ctx.fillRect(78, 0, 4, h);
        ctx.strokeStyle = "#306230"; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(80, 0); ctx.lineTo(80, h); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillRect(6, s.p1 - 16, 6, 32);
        ctx.fillRect(148, s.p2 - 16, 6, 32);
        ctx.fillRect(s.ball.x - 3, s.ball.y - 3, 6, 6);
        ctx.fillStyle = "#0f380f"; ctx.font = "bold 16px 'Courier New'"; ctx.textAlign = "center";
        ctx.fillText(String(s.s1), 54, 20);
        ctx.fillText(String(s.s2), 106, 20);
        if (s.over) {
          ctx.fillStyle = "rgba(15,56,15,.85)"; ctx.fillRect(20, 48, 120, 32);
          ctx.fillStyle = "#9bbc0f"; ctx.font = "bold 11px 'Courier New'";
          ctx.fillText(s.s1 > s.s2 ? "YOU WIN" : "YOU LOSE", 80, 68);
        }
      }
    }

    updateWeapon(p) {
      if (!this.el.weaponName) return;
      this.el.weaponName.textContent = p.weaponLabel(p.weapon);
      if (p.weapon === "pistol" || p.weapon === "shotgun") {
        this.el.weaponAmmo.textContent = "AMMO " + (p.ammo[p.weapon] || 0);
      } else {
        this.el.weaponAmmo.textContent = "";
      }
    }
    setSprint(on, land) {
      if (this.el.speedlines) this.el.speedlines.classList.toggle("on", !!on);
    }
    killPop(combo, cash) {
      const el = document.createElement("div");
      el.className = "killpop";
      el.innerHTML = "<b>" + (combo > 1 ? "COMBO x" + combo : "KO!") + "</b><span>+$" + cash + "</span>";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1150);
    }

    goreFlash() {
      if (!this.el.gore) return;
      this.el.gore.classList.remove("on");
      void this.el.gore.offsetWidth;
      this.el.gore.classList.add("on");
      setTimeout(() => this.el.gore.classList.remove("on"), 550);
    }
    setStoned(v) {
      if (this.el.fxHigh) this.el.fxHigh.style.opacity = String(U.clamp01(v) * 0.85);
    }
    setRadio(name) {
      if (this._radioName === name) return;
      this._radioName = name;
      if (this.el.radio) this.el.radio.textContent = name || "—";
    }

    drawRadar(game) {
      if (!this.el.radar) return;
      const c = this.el.radar.getContext("2d");
      const w = 160, h = 160, R = 78;
      c.clearRect(0, 0, w, h);
      c.save();
      c.beginPath(); c.arc(80, 80, R, 0, Math.PI * 2); c.clip();
      c.fillStyle = "#141c12"; c.fillRect(0, 0, w, h);
      const scale = 1.22;
      const ox = 80, oz = 80;
      const X = (x) => ox + x * scale;
      const Z = (z) => oz + z * scale;
      const rect = (x0, z0, x1, z1, col) => {
        c.fillStyle = col;
        c.fillRect(X(x0), Z(z0), (x1 - x0) * scale, (z1 - z0) * scale);
      };
      // roads
      rect(-60, -6, 60, 6, "#393a38");
      rect(-6, -60, 6, 60, "#393a38");
      rect(-60, -9.5, 60, 9.5, "#2b2c2a");
      rect(-9.5, -60, 9.5, 60, "#2b2c2a");
      // districts
      rect(-40, 32, -24, 46, "#2a1a28");
      rect(36, 28, 50, 48, "#3a1020");
      // buildings
      const b = [
        [-38, -34, -18, -20, "#4a2a2a"], [10, -36, 34, -20, "#4a2a2a"],
        [-34, 18, -18, 30, "#3a3a42"], [17, 20, 31, 32, "#443828"],
        [-20, 38, 20, 52, "#4a4034"], [38, 0, 48, 10, "#1e3a22"],
        [-52, 10, -42, 20, "#26303a"], [38, 30, 48, 38, "#3a1424"],
        [38, 40, 48, 46, "#3a1424"], [17, 20, 31, 32, "#443828"]
      ];
      b.forEach((q) => rect(q[0], q[1], q[2], q[3], q[4]));
      // labels/dots
      const npcs = game.npcs.all;
      for (let i = 0; i < npcs.length; i++) {
        const n = npcs[i];
        if (n.down || n.removed) continue;
        const nx = n.body.position.x, nz = n.body.position.z;
        if (Math.abs(nx) > 55 || Math.abs(nz) > 55) continue;
        c.fillStyle = n.kind === "cop" ? "#ff4a3a" : n.kind === "pimp" ? "#ffd400" : n.kind === "partygoer" ? "#ff2d78" : "#9a9a8a";
        c.fillRect(X(nx) - 1, Z(nz) - 1, 2, 2);
      }
      // current story marker
      if (game.marker) {
        const mp = game.marker.position;
        c.fillStyle = (Math.sin(performance.now() / 180) > 0) ? "#ffd400" : "#fff3a0";
        c.fillRect(X(mp.x) - 3, Z(mp.z) - 3, 6, 6);
      }
      // player arrow
      const p = game.player.body.position;
      const yaw = game.player.yaw;
      const px = X(p.x), pz = Z(p.z);
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
      const rx = -fz, rz = fx;
      c.fillStyle = "#ffe86a";
      c.beginPath();
      c.moveTo(px + fx * 7, pz + fz * 7);
      c.lineTo(px - fx * 4 + rx * 4, pz - fz * 4 + rz * 4);
      c.lineTo(px - fx * 4 - rx * 4, pz - fz * 4 - rz * 4);
      c.closePath(); c.fill();
      c.restore();
      // clock
      if (this.el.radarClock) {
        const d = new Date();
        let hh = d.getHours() % 12; if (hh === 0) hh = 12;
        this.el.radarClock.textContent = hh + ":" + String(d.getMinutes()).padStart(2, "0");
      }
    }

    setObjective(text) {
      if (!this.el.objective) return;
      this.el.objective.classList.toggle("hidden", !text);
      this.el.objectiveText.textContent = text || "";
    }

    showCredits() {
      const el = $("credits");
      if (!el) return;
      el.classList.remove("hidden");
      ST.audio.cash();
    }

    hideCredits() {
      const el = $("credits");
      if (el) el.classList.add("hidden");
    }

    openCutscene(title, lines, onDone) {
      this.cutLines = lines || [""];
      this.cutIndex = 0;
      this.cutOnDone = onDone || null;
      this.cutTyping = false;
      this.el.cutscene.classList.remove("hidden");
      this.el.cutTitle.textContent = title || "SHITTOWN";
      this.el.cutNext.textContent = "CONTINUE";
      this._renderCutLine();
    }
    _renderCutLine() {
      const line = this.cutLines[this.cutIndex] || "";
      if (this.cutTypeTimer) clearInterval(this.cutTypeTimer);
      this.cutTyping = true;
      this.el.cutText.textContent = "";
      this.el.cutNext.textContent = "SKIP LINE";
      let i = 0;
      this.cutTypeTimer = setInterval(() => {
        i += 2;
        this.el.cutText.textContent = line.slice(0, i);
        if (i >= line.length) {
          clearInterval(this.cutTypeTimer);
          this.cutTypeTimer = null;
          this.cutTyping = false;
          this.el.cutNext.textContent = this.cutIndex >= this.cutLines.length - 1 ? "FINISH" : "CONTINUE";
        }
      }, 18);
    }
    nextCutscene() {
      if (this.cutTyping) {
        if (this.cutTypeTimer) clearInterval(this.cutTypeTimer);
        this.cutTypeTimer = null;
        this.cutTyping = false;
        this.el.cutText.textContent = this.cutLines[this.cutIndex] || "";
        this.el.cutNext.textContent = this.cutIndex >= this.cutLines.length - 1 ? "FINISH" : "CONTINUE";
        return;
      }
      this.cutIndex += 1;
      if (this.cutIndex >= this.cutLines.length) {
        this.closeCutscene();
        return;
      }
      this._renderCutLine();
    }
    closeCutscene() {
      if (this.cutTypeTimer) clearInterval(this.cutTypeTimer);
      this.cutTypeTimer = null;
      this.cutTyping = false;
      this.el.cutscene.classList.add("hidden");
      const cb = this.cutOnDone;
      this.cutOnDone = null;
      if (cb) cb();
    }
    skipCutscene() {
      this.cutIndex = 999;
      this.closeCutscene();
    }

    showHUD(show) {
      this.el.hud.classList.toggle("hidden", !show);
    }

    /* ---------------- hud ---------------- */
    updateHUD(p) {
      this.el.health.style.width = U.clamp(p.health / p.maxHealth, 0, 1) * 100 + "%";
      this.el.health.classList.toggle("low", p.health < 30);
      this.el.drunk.style.width = U.clamp(p.drunk / 100, 0, 1) * 100 + "%";
      this.el.high.style.width = U.clamp(p.stoned / 100, 0, 1) * 100 + "%";
      this.el.bladder.style.width = U.clamp(p.bladder / 100, 0, 1) * 100 + "%";
      this.el.cash.textContent = U.money(p.cash);
      const stars = this.el.stars.children;
      const n = Math.round(p.wanted);
      for (let i = 0; i < stars.length; i++) stars[i].classList.toggle("on", i < n);
      const rank = this.rankFor(p.respect);
      this.el.rank.textContent = rank.name;
      this.el.respectVal.textContent = U.fmt(p.respect);
      const next = this.nextRank(p.respect);
      const prev = rank.need;
      const pct = next ? (p.respect - prev) / (next.need - prev) : 1;
      this.el.respectFill.style.width = U.clamp(pct, 0, 1) * 100 + "%";
      let hint = "";
      if (p.activeDrug) hint += "<span style='color:#c8a8ff'>ON: " + p.drugLabel + " · " + Math.ceil(p.drugT) + "s</span><br>";
      if (p.smoking) hint += "<span style='color:#ffb05a'>SMOKING " + (p.smoking.type === "cig" ? "CIGARETTE" : p.smoking.type === "vape" ? "VAPE" : p.smoking.type === "blunt" ? "BLUNT" : "WEED") + " · " + Math.ceil(p.smoking.t) + "s</span><br>";
      if (p.beer) hint += "<span class='key'>F</span> DRINK BEER ×" + U.amount(p.beer) + "<br>";
      if (p.cigs) hint += "<span class='key'>C</span> SMOKE ×" + U.amount(p.cigs) + "<br>";
      if (p.weed) hint += "<span class='key'>B</span> SMOKE WEED ×" + p.weed + "<br>";
      if (p.papers || p.wraps) hint += "<span style='color:#c8c2a0'>PAPERS ×" + p.papers + " · WRAPS ×" + p.wraps + "</span><br>";
      hint += "<span class='key'>V</span> VAPE ×" + U.amount(p.vapes) + "<br>";
      if (p.water) hint += "<span class='key'>H</span> WATER BOTTLE ×" + p.water + "<br>";
      if (p.hasExtinguisher) hint += "<span class='key'>X</span> HOLD TO EXTINGUISH<br>";
      if (p.chicken) hint += "<span class='key'>G</span> SQUEAKY CHICKEN<br>";
      hint += "<span class='key'>T</span> PHONE";
      if (p.drunk > 60) hint += "<br><span style='color:#ffb35c'>YOU ARE WASTED</span>";
      if (p.stoned > 60) hint += "<br><span style='color:#b8a8ff'>YOU ARE SO HIGH</span>";
      if (p.wanted >= 1) hint += "<br><span style='color:#ff5d5d'>COPS: " + Math.round(p.wanted) + "</span>";
      this.el.itemHint.innerHTML = hint;
      this.updateWeapon(p);
    }

    rankFor(respect) {
      let r = ST.jokes.ranks[0];
      for (let i = 0; i < ST.jokes.ranks.length; i++) if (respect >= ST.jokes.ranks[i].need) r = ST.jokes.ranks[i];
      return r;
    }
    nextRank(respect) {
      for (let i = 0; i < ST.jokes.ranks.length; i++) if (respect < ST.jokes.ranks[i].need) return ST.jokes.ranks[i];
      return null;
    }

    setPrompt(html) {
      this.el.prompt.innerHTML = html || "";
      this.el.prompt.classList.toggle("hidden", !html);
    }

    ticker(msg, kind) {
      if (!msg) return;
      const span = document.createElement("span");
      span.className = "tick" + (kind ? " " + kind : "");
      span.textContent = msg;
      this.el.ticker.appendChild(span);
      while (this.el.ticker.children.length > 5) this.el.ticker.removeChild(this.el.ticker.firstChild);
      setTimeout(() => { span.style.opacity = "0"; span.style.transition = "opacity .4s"; }, 5200);
      setTimeout(() => { if (span.parentNode) span.parentNode.removeChild(span); }, 5800);
    }

    say(text) {
      if (!text) return;
      this.el.subtitle.textContent = text;
      this.el.subtitle.classList.add("show");
      if (this.subTimer) clearTimeout(this.subTimer);
      this.subTimer = setTimeout(() => this.el.subtitle.classList.remove("show"), 2800);
    }

    hitmarker() {
      this.el.hitmarker.classList.add("show");
      if (this.hitTimer) clearTimeout(this.hitTimer);
      this.hitTimer = setTimeout(() => this.el.hitmarker.classList.remove("show"), 110);
    }

    hurtFlash() {
      this.el.hud.classList.remove("hurt");
      void this.el.hud.offsetWidth;
      this.el.hud.classList.add("hurt");
      if (this.hurtTimer) clearTimeout(this.hurtTimer);
      this.hurtTimer = setTimeout(() => this.el.hud.classList.remove("hurt"), 420);
    }

    rankUp(name) {
      this.el.rankupName.textContent = name;
      this.el.rankup.classList.remove("hidden");
      this.el.rankup.style.animation = "none";
      void this.el.rankup.offsetWidth;
      this.el.rankup.style.animation = "";
      if (this.rankTimer) clearTimeout(this.rankTimer);
      this.rankTimer = setTimeout(() => this.el.rankup.classList.add("hidden"), 3200);
    }

    setFps(fps) {
      this.el.fps.textContent = fps + " FPS";
    }

    /* ---------------- screens ---------------- */
    hideBoot() {
      this.el.boot.classList.add("hidden");
      this.showHUD(true);
    }
    showBoot() {
      this.el.boot.classList.remove("hidden");
      this.showHUD(false);
    }
    showPause(show) {
      this.el.pause.classList.toggle("hidden", !show);
      if (show) { this.updateAudioButton(); this.updateMusicButton(); }
    }

    showDeath(tip) {
      this.el.deathTip.textContent = tip || U.pick(ST.jokes.deathTips);
      this.el.deathCount.textContent = "3";
      this.el.death.classList.remove("hidden");
      let n = 3;
      if (this.deathTimer) clearInterval(this.deathTimer);
      this.deathTimer = setInterval(() => {
        n -= 1;
        this.el.deathCount.textContent = String(Math.max(0, n));
      }, 1000);
      setTimeout(() => {
        this.el.death.classList.add("hidden");
        if (this.deathTimer) clearInterval(this.deathTimer);
        this.game.respawn();
      }, 3200);
    }

    /* ---------------- slots ---------------- */
    openSlots() {
      this.slotOpen = true;
      this.el.slots.classList.remove("hidden");
      this.el.slotResult.textContent = "\u00a0";
      this.updateSlotCash();
      this.el.slotBet.textContent = "$" + this.bet;
      ST.audio.setStation("casino");
    }
    closeSlots() {
      this.slotOpen = false;
      this.el.slots.classList.add("hidden");
      this.game.closeSlots();
    }

    updateSlotCash() {
      this.el.slotCash.textContent = U.money(this.game.player.cash);
    }

    changeBet(dir) {
      if (this.spinning) return;
      const bets = [5, 25, 100];
      let i = bets.indexOf(this.bet);
      i = U.clamp(i + dir, 0, bets.length - 1);
      this.bet = bets[i];
      this.el.slotBet.textContent = "$" + this.bet;
      ST.audio.click();
    }

    _randomSymbol() {
      const total = SLOT_SYMBOLS.reduce((a, b) => a + b.weight, 0);
      let r = Math.random() * total;
      for (const s of SLOT_SYMBOLS) { r -= s.weight; if (r <= 0) return s.label; }
      return "PIG";
    }

    spin() {
      if (this.spinning) return;
      const p = this.game.player;
      if (p.cash < this.bet) {
        this.el.slotResult.textContent = ST.jokes.slotLines.broke;
        ST.audio.click();
        return;
      }
      this.spinning = true;
      p.cash -= this.bet;
      this.updateSlotCash();
      this.el.slotResult.textContent = "\u00a0";
      const final = [this._randomSymbol(), this._randomSymbol(), this._randomSymbol()];
      this.spinTimers.forEach((t) => clearInterval(t));
      this.spinTimers = [];
      let stopped = 0;
      for (let i = 0; i < 3; i++) {
        const reel = this.el.reel[i];
        const interval = setInterval(() => {
          reel.textContent = this._randomSymbol();
        }, 55 + i * 12);
        this.spinTimers.push(interval);
        setTimeout(() => {
          if (!this.slotOpen) return;
          clearInterval(interval);
          reel.textContent = final[i];
          ST.audio.slotTick();
          stopped++;
          if (stopped === 3) this._resolveSpin(final);
        }, 700 + i * 420);
      }
    }

    _resolveSpin(sym) {
      this.spinning = false;
      const count = {};
      sym.forEach((s) => (count[s] = (count[s] || 0) + 1));
      let payout = 0;
      let jackpot = false;
      const best = Object.keys(count).sort((a, b) => count[b] - count[a])[0];
      if (count[best] === 3) {
        payout = this.bet * SLOT_PAYS[best];
        if (best === "7") jackpot = true;
      } else if (count[best] === 2) {
        payout = this.bet * 2;
      }
      if (payout > 0) {
        this.game.player.cash += payout;
        this.game.player.addRespect(Math.max(1, Math.round(payout / 20)), "slotwin");
        this.el.slotResult.textContent = "WIN +$" + payout + "!";
        this.el.slotResult.style.color = jackpot ? "#ffd400" : "#5cff86";
        ST.audio.slotWin();
        this.game.say(U.pick(jackpot ? ST.jokes.slotLines.jackpot : ST.jokes.slotLines.win));
        this.game.ticker(U.pick(ST.jokes.ticker.slotwin).replace("{n}", payout), "gold");
        if (jackpot) {
          ST.audio.jackpot();
          this.game.jackpot(this.el.reel[0]);
        }
      } else {
        this.el.slotResult.textContent = U.pick(["LOSE", "THE HOUSE WINS", "SO CLOSE", "TRY AGAIN, LOSER"]);
        this.el.slotResult.style.color = "#ff5d5d";
        this.game.say(U.pick(ST.jokes.slotLines.lose));
      }
      this.updateSlotCash();
      this.game.saveStats();
    }

    resetSlots() {
      this.spinning = false;
      this.spinTimers.forEach((t) => clearInterval(t));
      this.spinTimers = [];
      this.el.slots.classList.add("hidden");
      this.slotOpen = false;
    }
  }

  ST.UI = UI;
})();
