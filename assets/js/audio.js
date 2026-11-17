/* SHITTOWN — audio.js
   A complete synthesized soundtrack + SFX engine. No audio files.
   Five mellow Japanese radio stations (lo-fi city pop, late jazz, downtempo,
   low taiko, bell lounge), 16-step sequencer with swing, koto plucks,
   intensity-reactive arrangements, reverb, feedback delay, compression, and
   radio static between stations. Headphones recommended. Neighbors optional. */
(function () {
  const ST = (window.ST = window.ST || {});
  const U = ST.util;
  const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ------------------------------------------------------------------
     Station charts. Each is 4 bars of 16 steps. Roots/chords per bar.
     Patterns are step indices (0-15) inside a bar.
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     Japanese low-key charts. Original compositions in hirajoshi /
     minor-pentatonic scales: koto plucks, soft pads, brushed drums,
     rounded bass. Mellow on purpose — this is 3AM music, not a boss fight.
     ------------------------------------------------------------------ */
  const TR_0 = [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 69, 4], [12, 72, 4]];
  const TR_1 = [[0, 72, 4], [4, 69, 2], [6, 67, 2], [8, 69, 8]];
  const TR_2 = [[0, 74, 4], [4, 76, 2], [6, 79, 2], [8, 76, 4], [12, 74, 4]];
  const TR_3 = [[0, 71, 4], [4, 69, 2], [6, 67, 4], [10, 64, 6]];
  const TR_4 = [[0, 69, 2], [2, 72, 2], [4, 76, 4], [8, 74, 2], [10, 72, 2], [12, 69, 4]];
  const TR_5 = [[0, 72, 2], [2, 74, 2], [4, 72, 4], [8, 69, 4], [12, 67, 4]];
  const TR_6 = [[0, 74, 4], [4, 72, 2], [6, 74, 2], [8, 76, 6], [14, 79, 2]];
  const TR_7 = [[0, 76, 4], [4, 74, 2], [6, 72, 2], [8, 69, 8]];
  const SONG_TR = [TR_0, TR_1, TR_2, TR_3, TR_4, TR_5, TR_6, TR_7];

  const SJ_0 = [[0, 74, 6], [6, 72, 2], [8, 69, 4], [12, 72, 4]];
  const SJ_1 = [[0, 70, 4], [4, 69, 2], [6, 67, 2], [8, 65, 8]];
  const SJ_2 = [[0, 67, 4], [4, 70, 2], [6, 72, 2], [8, 74, 6], [15, 72, 2]];
  const SJ_3 = [[0, 73, 4], [4, 72, 2], [6, 69, 4], [10, 67, 6]];
  const SJ_4 = [[0, 69, 4], [4, 72, 2], [6, 74, 2], [8, 77, 4], [12, 74, 4]];
  const SJ_5 = [[0, 72, 4], [4, 70, 2], [6, 69, 2], [8, 67, 8]];
  const SJ_6 = [[0, 65, 4], [4, 67, 2], [6, 69, 2], [8, 72, 6], [14, 70, 2]];
  const SJ_7 = [[0, 69, 8], [8, 67, 2], [10, 65, 6]];
  const SONG_SJ = [SJ_0, SJ_1, SJ_2, SJ_3, SJ_4, SJ_5, SJ_6, SJ_7];

  const SL_0 = [[0, 76, 4], [4, 74, 2], [6, 71, 2], [8, 67, 6]];
  const SL_1 = [[0, 72, 4], [4, 76, 2], [6, 79, 2], [8, 76, 6]];
  const SL_2 = [[0, 74, 4], [4, 71, 2], [6, 69, 2], [8, 71, 6]];
  const SL_3 = [[0, 71, 4], [4, 74, 2], [6, 76, 2], [8, 74, 6]];
  const SL_4 = [[0, 67, 2], [2, 71, 2], [4, 74, 4], [8, 76, 4], [12, 74, 4]];
  const SL_5 = [[0, 72, 4], [4, 71, 2], [6, 67, 2], [8, 64, 8]];
  const SL_6 = [[0, 69, 4], [4, 71, 2], [6, 74, 2], [8, 71, 4], [12, 67, 4]];
  const SL_7 = [[0, 64, 6], [6, 67, 2], [8, 69, 8]];
  const SONG_SL = [SL_0, SL_1, SL_2, SL_3, SL_4, SL_5, SL_6, SL_7];

  const OD_0 = [[0, 62, 2], [2, 63, 2], [4, 67, 2], [6, 69, 2], [8, 67, 2], [10, 63, 2], [12, 62, 4]];
  const OD_1 = [[0, 70, 2], [2, 69, 2], [4, 67, 2], [6, 63, 2], [8, 62, 6]];
  const OD_2 = [[0, 74, 2], [2, 70, 2], [4, 69, 2], [6, 67, 2], [8, 63, 4], [12, 62, 4]];
  const OD_3 = [[0, 62, 4], [4, 63, 2], [6, 67, 2], [8, 62, 8]];
  const SONG_OD = [OD_0, OD_1, OD_2, OD_3, OD_0, OD_1, OD_2, OD_3];

  const PD_0 = [[0, 72, 2], [2, 76, 2], [4, 79, 2], [6, 76, 2], [8, 72, 2], [10, 76, 2], [12, 79, 2], [14, 84, 2]];
  const PD_1 = [[0, 71, 2], [2, 74, 2], [4, 79, 2], [6, 74, 2], [8, 71, 2], [10, 74, 2], [12, 79, 2], [14, 83, 2]];
  const PD_2 = [[0, 69, 2], [2, 72, 2], [4, 76, 2], [6, 72, 2], [8, 69, 2], [10, 72, 2], [12, 76, 2], [14, 81, 2]];
  const PD_3 = [[0, 67, 2], [2, 71, 2], [4, 74, 2], [6, 71, 2], [8, 67, 4], [12, 72, 4]];
  const SONG_PD = [PD_0, PD_1, PD_0, PD_2, PD_0, PD_1, PD_3, PD_3];

  const STATIONS = {
    /* Mellow lo-fi city pop. Koto over rain-soaked rhodes. */
    street: {
      bpm: 84, swing: 0.16, soft: true,
      roots: [45, 41, 43, 40, 45, 41, 43, 40],
      chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 62],
               [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67], [52, 55, 59, 62]],
      kick: [0, 10], snare: [8], hats: [2, 6, 10, 14], openHat: [],
      bass: [[0, 0], [6, 7], [10, 3], [14, 0]],
      keys: [4, 12], pad: true, padWave: "triangle",
      koto: [0, 3, 6, 8, 11, 14],
      song: SONG_TR,
      songTitle: "TOKYO RAIN",
      melodyWave: "sine", leadAt: 0, extraAt: 0.92
    },
    /* Late-night jazz bar. Brushed drums, walking bass, sine flute. */
    bar: {
      bpm: 72, swing: 0.3, soft: true,
      roots: [38, 46, 43, 45, 38, 46, 41, 45],
      chords: [[50, 53, 57, 60], [58, 62, 65, 69], [55, 58, 62, 65], [57, 61, 64, 67],
               [50, 53, 57, 60], [58, 62, 65, 69], [55, 58, 62, 65], [57, 61, 64, 67]],
      kick: [0, 8], snare: [12], hats: [0, 4, 8, 12], openHat: [6],
      bass: [[0, 0], [4, 7], [8, 12], [12, 10]],
      keys: [2, 6, 10, 14], pad: true, padWave: "sine",
      koto: [3, 11],
      song: SONG_SJ,
      songTitle: "SHINJUKU 3AM",
      melodyWave: "sine", leadAt: 0, extraAt: 0.95, ghost: true
    },
    /* Downtempo house with a plucked koto hook. */
    club: {
      bpm: 104, swing: 0, soft: true,
      roots: [40, 36, 45, 38, 40, 36, 45, 38],
      chords: [[52, 55, 59, 62], [48, 52, 55, 59], [45, 48, 52, 55], [47, 51, 54, 57],
               [52, 55, 59, 62], [48, 52, 55, 59], [45, 48, 52, 55], [47, 51, 54, 57]],
      kick: [0, 4, 8, 12], snare: [], clap: [4, 12],
      hats: [2, 6, 10, 14], openHat: [6, 14],
      bass: [[0, 0], [3, 0], [4, 7], [8, 0], [11, 3], [12, 7], [14, 0]],
      pad: true, padWave: "triangle", arp: true, arpWave: "triangle",
      koto: [0, 2, 5, 8, 10, 13], bell: [0],
      song: SONG_SL,
      songTitle: "SAKURA LOUNGE",
      melodyWave: "triangle", leadAt: 0, extraAt: 0.9
    },
    /* Low taiko pulse. Hirajoshi koto riff. Still quiet, still ominous. */
    heat: {
      bpm: 96, swing: 0, soft: true,
      roots: [38, 39, 43, 45, 38, 39, 43, 45],
      chords: [[50, 53, 57], [51, 55, 58], [55, 58, 62], [57, 61, 64],
               [50, 53, 57], [51, 55, 58], [55, 58, 62], [57, 61, 64]],
      kick: [0, 6, 10], snare: [12], hats: [4, 14], openHat: [],
      bass: [[0, 0], [4, 0], [8, 7], [12, 0]],
      pad: true, padWave: "triangle", tomFill: true,
      koto: [0, 3, 7, 10, 13],
      song: SONG_OD,
      songTitle: "ONI DRUMS",
      melodyWave: "triangle", leadAt: 0, extraAt: 0.95
    },
    /* Crackly pachinko lounge. Bells, soft kick, gentle chiptune. */
    casino: {
      bpm: 92, swing: 0.12, soft: true,
      roots: [48, 43, 45, 41, 48, 43, 45, 41],
      chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60],
               [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
      kick: [0, 8], snare: [12], hats: [0, 2, 4, 6, 8, 10, 12, 14], openHat: [],
      bass: [[0, 0], [4, 7], [8, 12], [12, 7]],
      stabs: [6, 14], stabWave: "triangle",
      bell: [0, 8], koto: [4, 12],
      song: SONG_PD,
      songTitle: "PACHINKO DREAMS",
      melodyWave: "triangle", leadAt: 0, extraAt: 0.9
    }
  };

  class AudioEngine {
    constructor() {
      this.ready = false;
      this.ctx = null;
      this.station = "street";
      this.intensity = 0.25;
      this.step = 0;
      this.nextTime = 0;
      this.masterVol = 0.8;
      this.musicVol = 0.7;
      this.timer = null;
      this._lastStationAt = 0;
      this.defs = STATIONS;
      this.muted = false;
      this.musicEnabled = false;
      this._paused = false;
      this._suspendTimer = null;
    }

    init() {
      if (this.ready) { this.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = (this.ctx = new AC());

      /* master chain */
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16;
      this.comp.knee.value = 18;
      this.comp.ratio.value = 3.5;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.25;

      this.muffle = ctx.createBiquadFilter();
      this.muffle.type = "lowpass";
      this.muffle.frequency.value = 20000;
      this.muffle.Q.value = 0.4;

      this.master = ctx.createGain();
      this.master.gain.value = this.masterVol;
      this.muffle.connect(this.master);
      this.master.connect(this.comp);
      this.comp.connect(ctx.destination);

      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.5 * this.musicVol;
      this.musicBus.connect(this.muffle);

      this.sfxBus = ctx.createGain();
      this.sfxBus.gain.value = 0.85;
      this.sfxBus.connect(this.muffle);

      /* shared noise buffer */
      const nlen = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, nlen, ctx.sampleRate);
      const nd = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < nlen; i++) nd[i] = Math.random() * 2 - 1;

      /* reverb */
      this.revIn = ctx.createGain();
      this.revIn.gain.value = 1;
      this.conv = ctx.createConvolver();
      const rlen = Math.floor(ctx.sampleRate * 1.9);
      const ir = ctx.createBuffer(2, rlen, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < rlen; i++) {
          d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / rlen, 2.6);
        }
      }
      this.conv.buffer = ir;
      const revWet = ctx.createGain();
      revWet.gain.value = 0.3;
      this.revIn.connect(this.conv);
      this.conv.connect(revWet);
      revWet.connect(this.muffle);

      /* feedback delay for leads */
      this.delayIn = ctx.createGain();
      this.delayIn.gain.value = 1;
      this.delay = ctx.createDelay(1.0);
      this.delay.delayTime.value = 0.27;
      this.delayFb = ctx.createGain();
      this.delayFb.gain.value = 0.28;
      this.delayLp = ctx.createBiquadFilter();
      this.delayLp.type = "lowpass";
      this.delayLp.frequency.value = 2600;
      const delayWet = ctx.createGain();
      delayWet.gain.value = 0.25;
      this.delayIn.connect(this.delay);
      this.delay.connect(this.delayLp);
      this.delayLp.connect(this.delayFb);
      this.delayFb.connect(this.delay);
      this.delayLp.connect(delayWet);
      delayWet.connect(this.muffle);

      /* shared distorted guitar bus */
      this.dist = ctx.createWaveShaper();
      const curve = new Float32Array(2048);
      for (let i = 0; i < curve.length; i++) {
        const x = (i * 2) / (curve.length - 1) - 1;
        curve[i] = Math.tanh(x * 5.5);
      }
      this.dist.curve = curve;
      this.dist.oversample = "2x";
      this.distLP = ctx.createBiquadFilter();
      this.distLP.type = "lowpass";
      this.distLP.frequency.value = 3000;
      this.distGain = ctx.createGain();
      this.distGain.gain.value = 0.42;
      this.dist.connect(this.distLP);
      this.distLP.connect(this.distGain);
      this.distGain.connect(this.musicBus);

      this.ready = true;
      this.startWind();
      this.nextTime = ctx.currentTime + 0.12;
      this.step = 0;
      this.timer = setInterval(() => this._schedule(), 25);
    }

    resume() {
      if (!this.ready) return;
      if (this.ctx.state !== "running") this.ctx.resume().catch(() => {});
    }
    suspend() {
      if (this.ready && this.ctx.state === "running") this.ctx.suspend().catch(() => {});
    }
    dispose() {
      try {
        if (this.timer) clearInterval(this.timer);
        if (this.ready && this.ctx.state !== "closed") this.ctx.close();
        this.ready = false;
      } catch (e) {}
    }

    setMaster(v) {
      this.masterVol = U.clamp(v, 0, 1);
      if (this.ready) this.master.gain.setTargetAtTime(this.muted ? 0.0001 : this.masterVol, this.ctx.currentTime, 0.05);
    }
    setMusic(v) {
      this.musicVol = U.clamp(v, 0, 1);
      if (this.ready) {
        const target = (this.muted || this._paused || !this.musicEnabled) ? 0.0001 : 0.5 * this.musicVol;
        this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.08);
      }
    }
    setMusicEnabled(on) {
      this.musicEnabled = !!on;
      if (!this.ready) return;
      const target = (this.musicEnabled && !this.muted && !this._paused) ? 0.5 * this.musicVol : 0.0001;
      this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
      if (this.windGain) {
        this.windGain.gain.setTargetAtTime(this.musicEnabled ? 0.03 : 0.0001, this.ctx.currentTime, 0.2);
      }
      if (this.musicEnabled) {
        this.resume();
        this.nextTime = this.ctx.currentTime + 0.1;
        this.step = 0;
      }
    }
    setMuted(m) {
      this.muted = !!m;
      if (this.ready) {
        this.master.gain.setTargetAtTime(this.muted ? 0.0001 : this.masterVol, this.ctx.currentTime, 0.06);
      }
    }
    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }
    setIntensity(v) {
      this.intensity = U.clamp(v, 0, 1);
    }
    setDrunk(v) {
      if (!this.ready) return;
      if (this._paused) return;
      const f = 20000 - U.clamp01(v) * 15000;
      this.muffle.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.25);
    }
    setPaused(p) {
      if (!this.ready) return;
      this._paused = !!p;
      clearTimeout(this._suspendTimer);
      if (p) {
        this.musicBus.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.08);
        this.muffle.frequency.setTargetAtTime(700, this.ctx.currentTime, 0.12);
        this._suspendTimer = setTimeout(() => {
          if (this._paused) this.suspend();
        }, 350);
      } else {
        this.resume();
        const target = this.musicEnabled ? 0.5 * this.musicVol : 0.0001;
        this.musicBus.gain.setTargetAtTime(target, this.ctx.currentTime, 0.12);
        this.muffle.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.2);
      }
    }

    setStation(name) {
      if (!this.ready || !this.defs[name] || this.station === name) return;
      this.station = name;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.02;
      if (this.musicEnabled) { this.resume(); this.radioStatic(); }
    }
    cycleStation() {
      const order = ["street", "bar", "club", "heat", "casino"];
      const i = order.indexOf(this.station);
      this.setStation(order[(i + 1) % order.length]);
      return this.station;
    }

    /* ---------------- sequencer ---------------- */
    _schedule() {
      if (!this.ready || !this.musicEnabled || this.ctx.state !== "running") return;
      const ahead = 0.14;
      while (this.nextTime < this.ctx.currentTime + ahead) {
        const def = this.defs[this.station];
        const stepDur = 60 / def.bpm / 4;
        this._playStep(this.step, this.nextTime, def, stepDur);
        this.nextTime += stepDur;
        this.step = (this.step + 1) % 128;
      }
    }

    _playStep(gstep, t, def, stepDur) {
      const bar = Math.floor(gstep / 16) % def.roots.length;
      const s = gstep % 16;
      const root = def.roots[bar];
      const chord = def.chords[bar];
      const I = this.intensity;
      let time = t;
      if (def.swing && s % 2 === 1) time += stepDur * def.swing;
      time += (Math.random() - 0.5) * 0.004;

      /* drums — Japanese charts are mixed soft on purpose */
      const dg = def.soft ? 0.42 : 1;
      if (def.kick.indexOf(s) >= 0) this.kick(time, dg);
      if (I > 0.7 && def.kickExtra && def.kickExtra.indexOf(s) >= 0) this.kick(time, 0.7 * dg);
      if (def.snare && def.snare.indexOf(s) >= 0) this.snare(time, 0.9 * dg);
      if (def.clap && def.clap.indexOf(s) >= 0) this.clap(time, dg);
      if (def.hats.indexOf(s) >= 0) this.hat(time, def.openHat && def.openHat.indexOf(s) >= 0, (0.7 + Math.random() * 0.3) * dg);
      if (def.shaker && s % 2 === 1) this.hat(time, false, 0.35);
      if (I > 0.55 && def.openHat && def.openHat.indexOf(s) >= 0) this.hat(time + stepDur * 0.5, true, 0.4);
      if (def.ghost && I > 0.5 && (s === 7 || s === 15)) this.snare(time, 0.3);
      if (def.tomFill && bar % 4 === 3 && s >= 12) this.tom(time, [190, 150, 120, 95][s - 12], 0.55);

      /* harmony beds */
      if (def.pad && s === 0) {
        this.pad(time, chord.map((n) => NOTE(n + 12)), stepDur * 16, 0.9, def.padWave);
      }
      if (def.organ && s === 0) {
        this.organ(time, chord.map((n) => NOTE(n)), stepDur * 15, 0.9);
      }
      if (def.keys && def.keys.indexOf(s) >= 0) {
        this.rhodes(time, chord.map((n) => NOTE(n + 12)), stepDur * 2.4, 0.9);
      }
      if (def.guitar && def.guitar.indexOf(s) >= 0) {
        const power = I > 0.7 ? [root + 12, root + 19, root + 24, root + 31] : [root + 12, root + 19, root + 24];
        this.guitar(time, power, stepDur * 1.15, I > 0.7 ? 1.1 : 0.9);
      }
      if (def.arp && s % 2 === 0) {
        const idx = (Math.floor(s / 2) + bar) % chord.length;
        this.arp(time, NOTE(chord[idx] + 24), stepDur * 1.4, 0.45 + I * 0.4, def.arpWave);
      }
      if (def.bell && def.bell.indexOf(s) >= 0) this.bell(time, NOTE(root + 24), 1.2, 0.55);
      if (def.koto && def.koto.indexOf(s) >= 0) {
        const idx = (Math.floor(s / 3) + bar) % chord.length;
        this.koto(time, NOTE(chord[idx] + 12), stepDur * 4, 0.75);
        if (s % 2 === 0) this.koto(time + stepDur * 0.5, NOTE(chord[(idx + 2) % chord.length] + 24), stepDur * 2, 0.35);
      }
      if (def.brass && def.brass.indexOf(s) >= 0) {
        this.brass(time, chord.map((n) => NOTE(n + 12)), stepDur * 1.6, 0.7);
      }

      /* bass */
      for (let i = 0; i < def.bass.length; i++) {
        const ev = def.bass[i];
        if (ev[0] === s) {
          const oct = ev[1];
          const dur = stepDur * (def.bpm < 100 ? 2.6 : 1.7);
          this.bass(time, NOTE(root - 12 + oct), dur, 1, def.bassWave);
        }
      }

      /* chord stabs */
      if (def.stabs && def.stabs.indexOf(s) >= 0) {
        const notes = chord.map((n) => NOTE(n));
        const dur = stepDur * (def.bpm < 100 ? 1.4 : 0.9);
        this.stab(time, notes, dur, 1, def.stabWave);
        if (I > 0.78) this.stab(time + stepDur * 0.5, notes, dur * 0.6, 0.5, def.stabWave);
      }

      /* real public-domain song melody */
      if (def.song) {
        const barSong = def.song[bar] || [];
        for (let i = 0; i < barSong.length; i++) {
          const ev = barSong[i];
          if (ev[0] === s) {
            const dur = stepDur * ev[2];
            const gain = 0.85 + I * 0.35;
            this.lead(time, NOTE(ev[1]), dur, gain, def.melodyWave, 0.28, true);
            if (I > 0.72) this.lead(time, NOTE(ev[1] + 7), dur * 0.9, gain * 0.28, "triangle", 0.15, false);
            if (I > 0.86) this.lead(time, NOTE(ev[1] - 12), dur, gain * 0.3, "square", 0.1, false);
          }
        }
      } else if (I >= def.leadAt) {
        for (let i = 0; i < def.melody.length; i++) {
          const ev = def.melody[i];
          if (ev[0] === s) {
            const freq = NOTE(root + 12 + ev[1]);
            const dur = stepDur * (def.bpm < 100 ? 2.2 : 1.5);
            const gain = 0.6 + I * 0.5;
            this.lead(time, freq, dur, gain, def.melodyWave, 0.3, I > 0.6);
            if (I > 0.8) this.lead(time, freq * 1.5, dur, gain * 0.35, "triangle", 0.18, false);
          }
        }
      }

      /* extra intensity */
      if (I > def.extraAt) {
        if (s % 2 === 0) this.hat(time + stepDur * 0.5, false, 0.35);
        if (def.siren && s === 0) this.siren(0.9, 0.16);
        if (def.bpm > 130 && s === 8) this.clang(time);
      }
    }

    /* ---------------- voices ---------------- */
    _env(g, t, a, d, peak) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
    _out(node, rev, dly) {
      node.connect(this.musicBus);
      if (rev) {
        const s = this.ctx.createGain();
        s.gain.value = rev;
        node.connect(s); s.connect(this.revIn);
      }
      if (dly) {
        const s = this.ctx.createGain();
        s.gain.value = dly;
        node.connect(s); s.connect(this.delayIn);
      }
    }
    _noise(t, dur, rand) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.start(t, rand === undefined ? Math.random() * 1.2 : rand);
      src.stop(t + dur + 0.02);
      return src;
    }

    clap(t, v) {
      const c = this.ctx;
      for (let i = 0; i < 3; i++) {
        const n = this._noise(t + i * 0.012, 0.035);
        const f = c.createBiquadFilter();
        f.type = "bandpass"; f.frequency.value = 1700 + i * 350; f.Q.value = 1.2;
        const g = c.createGain();
        this._env(g, t + i * 0.012, 0.001, 0.05, 0.15 * v);
        n.connect(f); f.connect(g); this._out(g, 0.18, 0);
      }
    }
    tom(t, freq, v) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.22);
      this._env(g, t, 0.002, 0.24, 0.18 * v);
      o.connect(g); this._out(g, 0.15, 0);
      o.start(t); o.stop(t + 0.28);
    }
    rhodes(t, freqs, dur, v) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 1500; f.Q.value = 0.7;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045 * v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(g); this._out(g, 0.4, 0.12);
      freqs.forEach((fr) => {
        const o = c.createOscillator();
        o.type = "triangle"; o.frequency.value = fr; o.detune.value = U.rand(-3, 3);
        const o2 = c.createOscillator();
        o2.type = "sine"; o2.frequency.value = fr * 2; o2.detune.value = 4;
        const g2 = c.createGain(); g2.gain.value = 0.18;
        o.connect(f); o2.connect(g2); g2.connect(f);
        o.start(t); o2.start(t); o.stop(t + dur + 0.03); o2.stop(t + dur + 0.03);
      });
    }
    pad(t, freqs, dur, v, wave) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 950; f.Q.value = 0.6;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.028 * v, t + 0.35);
      g.gain.setValueAtTime(0.028 * v, t + dur * 0.65);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(g); this._out(g, 0.55, 0);
      freqs.forEach((fr) => {
        for (let d = -1; d <= 1; d += 2) {
          const o = c.createOscillator();
          o.type = wave || "sawtooth";
          o.frequency.value = fr;
          o.detune.value = d * 9;
          o.connect(f);
          o.start(t); o.stop(t + dur + 0.08);
        }
      });
    }
    organ(t, freqs, dur, v) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 2200; f.Q.value = 0.5;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035 * v, t + 0.12);
      g.gain.setValueAtTime(0.03 * v, t + dur * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      f.connect(g); this._out(g, 0.5, 0);
      freqs.forEach((fr) => {
        [1, 2, 3].forEach((mult, i) => {
          const o = c.createOscillator();
          o.type = i === 0 ? "sine" : "triangle";
          o.frequency.value = fr * mult;
          const pg = c.createGain();
          pg.gain.value = 0.5 / (i + 1);
          o.connect(pg); pg.connect(f);
          o.start(t); o.stop(t + dur + 0.05);
        });
      });
    }
    guitar(t, freqs, dur, v) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(2600, t);
      f.frequency.exponentialRampToValueAtTime(1100, t + dur);
      const g = c.createGain();
      this._env(g, t, 0.004, dur, 0.05 * v);
      f.connect(g);
      g.connect(this.dist);
      freqs.forEach((fr) => {
        for (let d = -1; d <= 1; d += 2) {
          const o = c.createOscillator();
          o.type = "sawtooth";
          o.frequency.value = fr;
          o.detune.value = d * 6;
          o.connect(f);
          o.start(t); o.stop(t + dur + 0.05);
        }
      });
    }
    arp(t, freq, dur, v, wave) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = wave || "triangle";
      o.frequency.value = freq;
      this._env(g, t, 0.002, dur, 0.028 * v);
      o.connect(g); this._out(g, 0.25, 0.3);
      o.start(t); o.stop(t + dur + 0.02);
    }
    bell(t, freq, dur, v) {
      const c = this.ctx;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.05 * v, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      this._out(g, 0.45, 0.15);
      [1, 2.7, 5.4].forEach((mult, i) => {
        const o = c.createOscillator();
        o.type = "sine";
        o.frequency.value = freq * mult;
        const pg = c.createGain();
        pg.gain.value = [0.45, 0.22, 0.08][i];
        o.connect(pg); pg.connect(g);
        o.start(t); o.stop(t + dur + 0.02);
      });
    }
    koto(t, freq, dur, v) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(3400, t);
      f.frequency.exponentialRampToValueAtTime(760, t + Math.max(0.2, dur));
      f.Q.value = 1.2;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.062 * v, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.22, dur));
      f.connect(g); this._out(g, 0.55, 0.28);
      [1, 2, 3].forEach((mult, i) => {
        const o = c.createOscillator();
        o.type = i === 0 ? "triangle" : "sine";
        o.frequency.setValueAtTime(freq * mult * 1.008, t);
        o.frequency.exponentialRampToValueAtTime(freq * mult, t + 0.05);
        const pg = c.createGain();
        pg.gain.value = [0.62, 0.24, 0.1][i];
        o.connect(pg); pg.connect(f);
        o.start(t); o.stop(t + dur + 0.06);
      });
    }
    brass(t, freqs, dur, v) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(2100, t);
      f.frequency.exponentialRampToValueAtTime(800, t + dur);
      const g = c.createGain();
      this._env(g, t, 0.02, dur, 0.045 * v);
      f.connect(g); this._out(g, 0.35, 0.1);
      freqs.forEach((fr) => {
        const o = c.createOscillator();
        o.type = "sawtooth"; o.frequency.value = fr;
        const o2 = c.createOscillator();
        o2.type = "square"; o2.frequency.value = fr; o2.detune.value = 7;
        const g2 = c.createGain(); g2.gain.value = 0.25;
        o.connect(f); o2.connect(g2); g2.connect(f);
        o.start(t); o2.start(t);
        o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
      });
    }
    funeral() {
      if (!this.ready) return;
      const t0 = this.ctx.currentTime + 0.05;
      const chords = [[45, 48, 52], [43, 47, 50], [41, 45, 48], [40, 44, 47]];
      chords.forEach((ch, i) => {
        const tt = t0 + i * 1.05;
        this.organ(tt, ch.map((n) => NOTE(n)), 1.9, 1.1);
        this.bell(tt, NOTE(ch[0] + 24), 1.6, 0.55);
      });
    }

    kick(t, v) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(155, t);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
      this._env(g, t, 0.002, 0.3, 0.85 * v);
      o.connect(g);
      this._out(g, 0, 0);
      o.start(t); o.stop(t + 0.36);
      const n = this._noise(t, 0.03);
      const ng = c.createGain();
      const nf = c.createBiquadFilter();
      nf.type = "highpass"; nf.frequency.value = 2500;
      this._env(ng, t, 0.001, 0.025, 0.09 * v);
      n.connect(nf); nf.connect(ng); this._out(ng, 0, 0);
    }
    snare(t, v) {
      const c = this.ctx;
      const n = this._noise(t, 0.2);
      const f = c.createBiquadFilter();
      f.type = "bandpass"; f.frequency.value = 1900; f.Q.value = 0.7;
      const g = c.createGain();
      this._env(g, t, 0.002, 0.18, 0.26 * v);
      n.connect(f); f.connect(g); this._out(g, 0.25, 0);
      const o = c.createOscillator();
      const og = c.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      this._env(og, t, 0.002, 0.08, 0.14 * v);
      o.connect(og); this._out(og, 0, 0);
      o.start(t); o.stop(t + 0.12);
    }
    hat(t, open, v) {
      const c = this.ctx;
      const n = this._noise(t, open ? 0.2 : 0.06);
      const f = c.createBiquadFilter();
      f.type = "highpass"; f.frequency.value = 7200;
      const g = c.createGain();
      this._env(g, t, 0.001, open ? 0.17 : 0.045, 0.05 * v);
      n.connect(f); f.connect(g); this._out(g, open ? 0.15 : 0, 0);
    }
    clang(t) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "square"; o.frequency.setValueAtTime(480, t); o.frequency.exponentialRampToValueAtTime(210, t + 0.3);
      this._env(g, t, 0.001, 0.3, 0.05);
      o.connect(g); this._out(g, 0.5, 0);
      o.start(t); o.stop(t + 0.34);
    }
    bass(t, freq, dur, v, wave) {
      const c = this.ctx;
      const o = c.createOscillator();
      const sub = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = wave || "sawtooth";
      o.frequency.value = freq;
      sub.type = "sine";
      sub.frequency.value = freq / 2;
      f.type = "lowpass";
      f.frequency.setValueAtTime(560, t);
      f.frequency.exponentialRampToValueAtTime(170, t + dur);
      f.Q.value = 1.6;
      this._env(g, t, 0.008, dur, 0.27 * v);
      o.connect(f); sub.connect(f); f.connect(g);
      this._out(g, 0.05, 0);
      o.start(t); sub.start(t);
      o.stop(t + dur + 0.05); sub.stop(t + dur + 0.05);
    }
    stab(t, freqs, dur, v, wave) {
      const c = this.ctx;
      const f = c.createBiquadFilter();
      const g = c.createGain();
      f.type = "lowpass";
      f.frequency.setValueAtTime(2400, t);
      f.frequency.exponentialRampToValueAtTime(700, t + dur);
      f.Q.value = 0.8;
      this._env(g, t, 0.006, dur, 0.10 * v);
      f.connect(g);
      this._out(g, 0.3, 0);
      for (let i = 0; i < freqs.length; i++) {
        for (let d = -1; d <= 1; d += 2) {
          const o = c.createOscillator();
          o.type = wave || "sawtooth";
          o.frequency.value = freqs[i];
          o.detune.value = d * 7 + (Math.random() - 0.5) * 4;
          o.connect(f);
          o.start(t); o.stop(t + dur + 0.06);
        }
      }
    }
    lead(t, freq, dur, v, wave, dly, drive) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      const f = c.createBiquadFilter();
      o.type = wave || "sawtooth";
      o.frequency.value = freq;
      f.type = "lowpass";
      f.frequency.setValueAtTime(drive ? 3400 : 1900, t);
      f.frequency.exponentialRampToValueAtTime(drive ? 1200 : 800, t + dur);
      this._env(g, t, 0.01, dur, (drive ? 0.14 : 0.10) * v);
      o.connect(f); f.connect(g);
      this._out(g, 0.3, dly || 0.25);
      o.start(t); o.stop(t + dur + 0.08);
      if (drive) {
        const o2 = c.createOscillator();
        o2.type = "square";
        o2.frequency.value = freq * 0.5;
        const g2 = c.createGain();
        this._env(g2, t, 0.01, dur, 0.035 * v);
        o2.connect(g2); this._out(g2, 0.1, 0);
        o2.start(t); o2.stop(t + dur + 0.08);
      }
    }

    /* ---------------- ambience ---------------- */
    startWind() {
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = "lowpass"; f.frequency.value = 420; f.Q.value = 0.6;
      const g = c.createGain();
      g.gain.value = this.musicEnabled ? 0.03 : 0.0001;
      this.windGain = g;
      const lfo = c.createOscillator();
      lfo.frequency.value = 0.07;
      const lfoG = c.createGain();
      lfoG.gain.value = 0.018;
      lfo.connect(lfoG); lfoG.connect(g.gain);
      src.connect(f); f.connect(g); g.connect(this.muffle);
      src.start(); lfo.start();
    }

    /* ---------------- SFX ---------------- */
    _sfxNoise(t, dur, type, freq, q, peak, send) {
      const c = this.ctx;
      const n = this._noise(t, dur);
      const f = c.createBiquadFilter();
      f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      const g = c.createGain();
      this._env(g, t, 0.002, dur, peak);
      n.connect(f); f.connect(g); g.connect(this.sfxBus);
      if (send) { const s = c.createGain(); s.gain.value = send; g.connect(s); s.connect(this.revIn); }
      return { f, g };
    }
    _blip(t, freq, dur, type, peak, endFreq) {
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || "square";
      o.frequency.setValueAtTime(freq, t);
      if (endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t + dur);
      this._env(g, t, 0.004, dur, peak);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + dur + 0.03);
      return g;
    }

    punch(hard) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, hard ? 150 : 190, 0.11, "sine", 0.5, 55);
      this._sfxNoise(t, 0.09, "lowpass", 900, 0.7, 0.34, 0.1);
      this._sfxNoise(t + 0.01, 0.05, "bandpass", 2400, 0.8, 0.12, 0);
    }
    whoosh() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const s = this._sfxNoise(t, 0.16, "bandpass", 600, 1.4, 0.12, 0);
      s.f.frequency.setValueAtTime(500, t);
      s.f.frequency.exponentialRampToValueAtTime(2400, t + 0.15);
    }
    glass() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.3, "highpass", 3800, 0.8, 0.28, 0.35);
      for (let i = 0; i < 5; i++) {
        const g = this._blip(t + i * 0.018, U.rand(1200, 3200), U.rand(0.06, 0.16), "triangle", 0.08, U.rand(600, 1400));
        const s = this.ctx.createGain(); s.gain.value = 0.2; g.connect(s); s.connect(this.revIn);
      }
    }
    explode() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(26, t + 0.7);
      this._env(g, t, 0.002, 0.8, 0.9);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.9);
      this._sfxNoise(t, 1.1, "lowpass", 900, 0.5, 0.65, 0.6);
      this._sfxNoise(t, 0.2, "highpass", 1800, 0.7, 0.4, 0.3);
    }
    beer() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.5, "highpass", 3000, 0.6, 0.06, 0);
      for (let i = 0; i < 3; i++) {
        this._blip(t + 0.14 + i * 0.18, 240 - i * 30, 0.1, "sine", 0.22, 140 - i * 20);
      }
    }
    squeak() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, c = this.ctx;
      const o = c.createOscillator();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(700, t);
      o.frequency.linearRampToValueAtTime(1900, t + 0.07);
      o.frequency.linearRampToValueAtTime(850, t + 0.2);
      o.frequency.linearRampToValueAtTime(2200, t + 0.3);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.62);
      lfo.type = "sine"; lfo.frequency.value = 26; lg.gain.value = 140;
      lfo.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 1700; f.Q.value = 3.2;
      this._env(g, t, 0.01, 0.65, 0.4);
      o.connect(f); f.connect(g); g.connect(this.sfxBus);
      const rev = c.createGain(); rev.gain.value = 0.35; g.connect(rev); rev.connect(this.revIn);
      o.start(t); lfo.start(t);
      o.stop(t + 0.72); lfo.stop(t + 0.72);
    }
    bong(deep) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(deep ? 160 : 210, t);
      o.frequency.exponentialRampToValueAtTime(deep ? 60 : 90, t + 0.5);
      this._env(g, t, 0.01, 0.6, deep ? 0.3 : 0.2);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.65);
      for (let i = 0; i < 5; i++) {
        this._blip(t + 0.08 + i * 0.09, 140 - i * 14, 0.14, "sine", 0.12, 60);
      }
      this._sfxNoise(t, deep ? 0.8 : 0.45, "bandpass", 900, 1.2, deep ? 0.12 : 0.07, 0.1);
      if (deep) {
        this._sfxNoise(t + 0.5, 0.6, "lowpass", 500, 0.8, 0.2, 0);
      }
    }
    engineStart() {
      if (!this.ready || this.engine) return;
      const c = this.ctx;
      const osc = c.createOscillator();
      const sub = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      osc.type = "sawtooth";
      sub.type = "square";
      osc.frequency.value = 46;
      sub.frequency.value = 23;
      f.type = "lowpass";
      f.frequency.value = 340;
      f.Q.value = 2.2;
      g.gain.value = 0.0001;
      osc.connect(f); sub.connect(f); f.connect(g); g.connect(this.sfxBus);
      // lumpy idle
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.type = "sine"; lfo.frequency.value = 7; lg.gain.value = 5;
      lfo.connect(lg); lg.connect(osc.frequency);
      // wind/tire hiss
      const wind = c.createBufferSource();
      wind.buffer = this.noiseBuf;
      wind.loop = true;
      const wf = c.createBiquadFilter();
      wf.type = "bandpass"; wf.frequency.value = 620; wf.Q.value = 0.7;
      const wg = c.createGain();
      wg.gain.value = 0.0001;
      wind.connect(wf); wf.connect(wg); wg.connect(this.sfxBus);
      osc.start(); sub.start(); lfo.start(); wind.start();
      this.engine = { osc, sub, f, g, lfo, lg, wind, wg, wf, gear: 0 };
      g.gain.setTargetAtTime(0.045, c.currentTime, 0.15);
    }
    engineSet(speed) {
      if (!this.engine) return;
      const c = this.ctx, e = this.engine;
      const s = Math.abs(speed);
      const t = c.currentTime;
      const gear = Math.min(4, Math.floor(s / 9));
      if (gear !== e.gear) {
        e.gear = gear;
        e.g.gain.setTargetAtTime(0.018, t, 0.03);
        setTimeout(() => { if (this.engine) this.engine.g.gain.setTargetAtTime(0.055, this.ctx.currentTime, 0.12); }, 90);
      }
      const rpm = 42 + s * 4.4 + (gear % 2) * 8;
      e.osc.frequency.setTargetAtTime(rpm, t, 0.07);
      e.sub.frequency.setTargetAtTime(rpm * 0.5, t, 0.07);
      e.f.frequency.setTargetAtTime(280 + s * 42, t, 0.1);
      e.g.gain.setTargetAtTime(0.022 + Math.min(0.07, s * 0.005), t, 0.1);
      e.lfo.frequency.setTargetAtTime(6 + s * 0.16, t, 0.1);
      e.wg.gain.setTargetAtTime(Math.min(0.055, s * 0.0035), t, 0.15);
      e.wf.frequency.setTargetAtTime(500 + s * 22, t, 0.15);
    }
    engineStop() {
      if (!this.engine) return;
      const e = this.engine;
      const t = this.ctx.currentTime;
      e.g.gain.setTargetAtTime(0.0001, t, 0.12);
      e.wg.gain.setTargetAtTime(0.0001, t, 0.12);
      setTimeout(() => {
        try { e.osc.stop(); e.sub.stop(); e.lfo.stop(); e.wind.stop(); } catch (err) {}
        e.g.disconnect(); e.wg.disconnect();
      }, 500);
      this.engine = null;
    }

    bonk() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, 185, 0.26, "sine", 0.55, 82);
      this._blip(t + 0.015, 118, 0.3, "triangle", 0.4, 55);
      this._sfxNoise(t, 0.11, "bandpass", 1250, 1.5, 0.34, 0);
      this._blip(t + 0.05, 720, 0.5, "triangle", 0.09, 480);
    }

    wilhelm() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, c = this.ctx;
      const o = c.createOscillator();
      const f1 = c.createBiquadFilter();
      const f2 = c.createBiquadFilter();
      const g = c.createGain();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      o.type = "sawtooth";
      const base = U.rand(270, 360);
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.7, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.72);
      lfo.type = "sine"; lfo.frequency.value = 13; lg.gain.value = 55;
      lfo.connect(lg); lg.connect(o.frequency);
      f1.type = "bandpass"; f1.frequency.value = 900; f1.Q.value = 4;
      f2.type = "bandpass"; f2.frequency.value = 1750; f2.Q.value = 6;
      this._env(g, t, 0.008, 0.78, 0.52);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.sfxBus);
      const rev = c.createGain(); rev.gain.value = 0.4; g.connect(rev); rev.connect(this.revIn);
      o.start(t); lfo.start(t); o.stop(t + 0.86); lfo.stop(t + 0.86);
      this._sfxNoise(t + 0.1, 0.4, "bandpass", 1100, 1.2, 0.1, 0.2);
    }

    inhale() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.42, "bandpass", 1200, 1.4, 0.12, 0);
      this._sfxNoise(t + 0.05, 0.28, "highpass", 2600, 0.9, 0.05, 0);
    }

    bottleSmash() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.24, "highpass", 2800, 0.9, 0.4, 0);
      this._sfxNoise(t + 0.02, 0.18, "bandpass", 1600, 1.6, 0.22, 0);
      this._blip(t, 520, 0.12, "triangle", 0.14, 180);
      for (let i = 0; i < 3; i++) {
        this._blip(t + 0.05 + i * 0.035, U.rand(900, 1800), 0.06, "sine", 0.07, U.rand(1400, 2400));
      }
    }

    grumble() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, 105, 0.22, "sawtooth", 0.22, 62);
      this._sfxNoise(t, 0.16, "lowpass", 420, 1, 0.12, 0);
    }

    burp() {      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const c = this.ctx;
      const o = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(68, t + 0.34);
      f.type = "bandpass"; f.frequency.value = 340; f.Q.value = 2.4;
      this._env(g, t, 0.02, 0.36, 0.32);
      o.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.42);
      this._sfxNoise(t, 0.3, "lowpass", 500, 0.8, 0.1, 0);
    }
    startPeeLoop() {
      if (!this.ready || this.peeLoop) return;
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const hp = c.createBiquadFilter();
      hp.type = "highpass"; hp.frequency.value = 650;
      const bp = c.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 1700; bp.Q.value = 0.7;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 4200;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.linearRampToValueAtTime(0.075, c.currentTime + 0.12);
      src.connect(hp); hp.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.sfxBus);
      src.start();
      this.peeLoop = { src, g };
    }
    stopPeeLoop() {
      if (!this.ready || !this.peeLoop) return;
      const { src, g } = this.peeLoop;
      this.peeLoop = null;
      g.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
      setTimeout(() => {
        try { src.stop(); src.disconnect(); g.disconnect(); } catch (e) {}
      }, 260);
    }
    pee(dur) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const d = dur || 1.1;
      const s = this._sfxNoise(t, d, "bandpass", 1400, 1.1, 0.12, 0);
      s.f.frequency.setValueAtTime(1200, t);
      for (let i = 1; i <= 6; i++) {
        s.f.frequency.linearRampToValueAtTime(1000 + Math.random() * 900, t + (d * i) / 6);
      }
      const g2 = this.ctx.createGain();
      g2.gain.value = 0.5;
      s.g.connect(g2); g2.connect(this.muffle);
    }
    cash() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const notes = [84, 88, 91, 96];
      notes.forEach((n, i) => this._blip(t + i * 0.055, NOTE(n), 0.12, "triangle", 0.12));
      this._sfxNoise(t, 0.18, "highpass", 5000, 0.7, 0.08, 0.2);
    }
    slotTick() {
      if (!this.ready) return;
      this._blip(this.ctx.currentTime, 1500 + Math.random() * 500, 0.025, "square", 0.05);
    }
    slotWin() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      [72, 76, 79, 84].forEach((n, i) => this._blip(t + i * 0.09, NOTE(n), 0.22, "square", 0.11));
      this._blip(t + 0.36, NOTE(88), 0.5, "triangle", 0.12);
    }
    jackpot() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const seq = [72, 76, 79, 84, 88, 84, 88, 91, 96];
      seq.forEach((n, i) => {
        const g = this._blip(t + i * 0.1, NOTE(n), 0.3, i % 2 ? "square" : "triangle", 0.12);
        const s = this.ctx.createGain(); s.gain.value = 0.25; g.connect(s); s.connect(this.revIn);
      });
      this._sfxNoise(t, 1.4, "highpass", 6000, 0.8, 0.1, 0.5);
    }
    rankUp() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      [60, 63, 67, 72, 75].forEach((n, i) => {
        const g = this._blip(t + i * 0.08, NOTE(n), 0.4, "triangle", 0.1);
        const s = this.ctx.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.revIn);
      });
    }
    hurt() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, c = this.ctx;
      // Rubber cartoon yelp. Way too loud for how much it hurts.
      const o = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(U.rand(230, 310), t);
      o.frequency.exponentialRampToValueAtTime(U.rand(560, 820), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(U.rand(150, 190), t + 0.27);
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.type = "sine";
      lfo.frequency.value = U.rand(18, 30);
      lg.gain.value = U.rand(45, 85);
      lfo.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 1150; f.Q.value = 2.2;
      this._env(g, t, 0.005, 0.3, 0.4);
      o.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 0.36); lfo.stop(t + 0.36);
      // wet bonk underneath
      this._sfxNoise(t, 0.1, "lowpass", 480, 0.9, 0.32, 0);
      this._blip(t, 110, 0.14, "sine", 0.3, 45);
      // slide whistle of regret
      const w = c.createOscillator();
      const wg = c.createGain();
      w.type = "sine";
      w.frequency.setValueAtTime(950, t + 0.02);
      w.frequency.exponentialRampToValueAtTime(170, t + 0.32);
      this._env(wg, t + 0.02, 0.01, 0.3, 0.18);
      w.connect(wg); wg.connect(this.sfxBus);
      w.start(t + 0.02); w.stop(t + 0.36);
    }
    siren(dur, vol) {
      if (!this.ready) return;
      const t = this.ctx.currentTime, c = this.ctx;
      const o = c.createOscillator();
      const lfo = c.createOscillator();
      const lg = c.createGain();
      const g = c.createGain();
      const f = c.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = 760;
      lfo.type = "sine"; lfo.frequency.value = 0.9;
      lg.gain.value = 180;
      lfo.connect(lg); lg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 1.5;
      this._env(g, t, 0.08, dur, 0.035 * (vol || 1));
      o.connect(f); f.connect(g); g.connect(this.muffle);
      o.start(t); lfo.start(t);
      o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    }
    footstep() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.055, "lowpass", 500, 0.8, 0.06, 0);
    }
    click() {
      if (!this.ready) return;
      this._blip(this.ctx.currentTime, 900, 0.03, "square", 0.04);
    }
    radioStatic() {
      if (!this.ready) return;
      this._sfxNoise(this.ctx.currentTime, 0.22, "bandpass", 2400, 0.6, 0.09, 0);
    }
    vomit() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.6, "lowpass", 900, 0.9, 0.16, 0);
      this._blip(t + 0.05, 160, 0.4, "sawtooth", 0.1, 60);
    }
    spray() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.18, "highpass", 2800, 0.8, 0.09, 0);
      this._sfxNoise(t + 0.02, 0.14, "bandpass", 1400, 1.2, 0.04, 0);
    }
    splash() {
      if (!this.ready) return;
      this._sfxNoise(this.ctx.currentTime, 0.18, "highpass", 2500, 0.7, 0.1, 0);
    }
    thunk() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, 135, 0.16, "sine", 0.45, 55);
      this._sfxNoise(t, 0.09, "lowpass", 650, 0.9, 0.24, 0);
      // rubbery rebound
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.setValueAtTime(160, t + 0.02);
      o.frequency.exponentialRampToValueAtTime(420, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(110, t + 0.26);
      this._env(g, t + 0.02, 0.004, 0.26, 0.16);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t + 0.02); o.stop(t + 0.3);
    }
    squelch() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.28, "lowpass", 380, 1.2, 0.46, 0.02);
      this._sfxNoise(t + 0.05, 0.18, "bandpass", 900, 1.4, 0.26, 0.01);
      this._blip(t + 0.02, 90, 0.2, "sine", 0.34, 45);
    }
    lighter() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, 1400, 0.03, "square", 0.08, 700);
      this._sfxNoise(t + 0.03, 0.22, "highpass", 2600, 0.7, 0.05, 0);
      this._sfxNoise(t + 0.04, 0.4, "bandpass", 800, 0.9, 0.025, 0);
    }
    cough() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 3; i++) {
        this._sfxNoise(t + i * 0.11, 0.08, "lowpass", 600 + i * 120, 1.1, 0.13 - i * 0.02, 0);
      }
      this._blip(t, 160, 0.16, "sawtooth", 0.08, 80);
    }
    babble(pitch, text) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const n = U.clamp(Math.round((text || "").length / 3), 3, 8);
      for (let i = 0; i < n; i++) {
        const c = this.ctx;
        const o = c.createOscillator();
        const f = c.createBiquadFilter();
        const g = c.createGain();
        o.type = i % 3 === 0 ? "triangle" : "square";
        const base = U.rand(170, 270) * (pitch || 1);
        o.frequency.setValueAtTime(base, t + i * 0.085);
        o.frequency.linearRampToValueAtTime(base * U.rand(0.75, 1.3), t + i * 0.085 + 0.07);
        f.type = "bandpass"; f.frequency.value = U.rand(700, 1500); f.Q.value = 2.5;
        this._env(g, t + i * 0.085, 0.005, 0.09, 0.085);
        o.connect(f); f.connect(g); g.connect(this.sfxBus);
        o.start(t + i * 0.085); o.stop(t + i * 0.085 + 0.1);
      }
    }
    pill() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.12, "highpass", 3500, 0.8, 0.08, 0);
      this._blip(t + 0.04, 220, 0.09, "sine", 0.12, 90);
      this._sfxNoise(t + 0.18, 0.1, "bandpass", 900, 1.2, 0.04, 0);
    }
    jump() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._blip(t, 190, 0.12, "sine", 0.08, 320);
      this._sfxNoise(t, 0.06, "highpass", 1800, 0.8, 0.03, 0);
    }
    land() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.1, "lowpass", 500, 0.9, 0.09, 0);
      this._blip(t, 110, 0.1, "sine", 0.08, 55);
    }
    pain() {
      if (!this.ready) return;
      const t = this.ctx.currentTime, c = this.ctx;
      const base = U.rand(190, 300);
      const o = c.createOscillator();
      const f = c.createBiquadFilter();
      const g = c.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.55, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(base * 0.55, t + 0.3);
      const wob = c.createOscillator();
      const wg = c.createGain();
      wob.type = "sine"; wob.frequency.value = U.rand(14, 24); wg.gain.value = 55;
      wob.connect(wg); wg.connect(o.frequency);
      f.type = "bandpass"; f.frequency.value = 850; f.Q.value = 3;
      this._env(g, t, 0.008, 0.3, 0.32);
      o.connect(f); f.connect(g); g.connect(this.sfxBus);
      o.start(t); wob.start(t); o.stop(t + 0.4); wob.stop(t + 0.4);
      // kazoo buzz on top
      this._blip(t, base * 2.1, 0.18, "square", 0.16, base * 0.9);
      this._sfxNoise(t, 0.16, "bandpass", 1500, 1.6, 0.12, 0);
    }
    scream() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const base = U.rand(260, 470);
      const o = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lg = this.ctx.createGain();
      const f1 = this.ctx.createBiquadFilter();
      const f2 = this.ctx.createBiquadFilter();
      const g = this.ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(base, t);
      o.frequency.linearRampToValueAtTime(base * 1.5, t + 0.07);
      o.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.62);
      lfo.type = "sine"; lfo.frequency.value = 21; lg.gain.value = 70;
      lfo.connect(lg); lg.connect(o.frequency);
      f1.type = "bandpass"; f1.frequency.value = 780; f1.Q.value = 4;
      f2.type = "bandpass"; f2.frequency.value = 1500; f2.Q.value = 5;
      this._env(g, t, 0.012, 0.62, 0.34);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(this.sfxBus);
      const rev = this.ctx.createGain(); rev.gain.value = 0.3; g.connect(rev); rev.connect(this.revIn);
      o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
      this._sfxNoise(t, 0.22, "bandpass", 900, 1.1, 0.1, 0.2);
    }
    boing() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(210, t);
      o.frequency.exponentialRampToValueAtTime(720, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(95, t + 0.38);
      this._env(g, t, 0.005, 0.4, 0.26);
      o.connect(g); g.connect(this.sfxBus);
      o.start(t); o.stop(t + 0.4);
    }
    gunshot() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.22, "highpass", 1400, 0.7, 0.5, 0.5);
      this._sfxNoise(t, 0.35, "lowpass", 700, 0.5, 0.35, 0.2);
      this._blip(t, 220, 0.09, "square", 0.35, 60);
      this._blip(t + 0.01, 1300, 0.05, "sawtooth", 0.1, 300);
    }
    fireCrackle() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this._sfxNoise(t, 0.05 + Math.random() * 0.05, "highpass", 1800, 0.8, 0.025, 0);
    }
  }

  ST.audio = new AudioEngine();
})();
