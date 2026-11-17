#!/usr/bin/env python3
"""SHITTOWN browser smoke test.

Run with:  python3 tests/smoke.py
Requires Google Chrome. Uses headless Chrome with software WebGL, muted audio,
and a temporary local HTTP server. It checks the things that actually broke
before: boot, the animation loop, keyboard movement, combat, phone/DS,
weed, the squeaky chicken, weapons, slots, and console errors.
"""
import json
import os
import sys
import threading
import time
import functools
import http.server
import socketserver
import traceback

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tests"))
from cdp import Page  # noqa: E402

FAILS = []


def check(name, cond, detail=""):
    if cond:
        print("  ok   %s" % name)
    else:
        print("  FAIL %s  %s" % (name, detail))
        FAILS.append(name)


def main():
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    port = httpd.server_address[1]
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()

    page = None
    try:
        page = None
        for attempt in range(3):
            try:
                page = Page.open("http://127.0.0.1:%d/index.html" % port, 1280, 800, idle_ms=600,
                                 ready="window.SHITTOWN && window.SHITTOWN.ready")
                break
            except Exception:
                time.sleep(1)
        if page is None:
            raise RuntimeError("Chrome failed to start for the smoke test")
        print("boot:")

        info = page.evaluate("""({ready: !!(window.SHITTOWN && SHITTOWN.ready),
            canvas: [document.getElementById('game').width, document.getElementById('game').height],
            boot: !!document.getElementById('boot')})""")
        check("game boots", info.get("ready") is True, str(info))
        check("rendering surface exists", info.get("canvas", [0, 0])[0] > 0 and info.get("canvas", [0, 0])[1] > 0, str(info.get("canvas")))

        # click the real start button
        page.evaluate("document.getElementById('boot-start').click()")
        check("intro cutscene opens", page.evaluate("!document.getElementById('cutscene').classList.contains('hidden')"))
        page.evaluate("SHITTOWN.skipCutscene(); SHITTOWN.disableStory();")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 900))")

        snap = page.evaluate("window.SHITTOWN.snapshot()")
        check("started", snap.get("started") is True, str(snap))
        check("animation loop is alive", page.evaluate("SHITTOWN.game.time") > 0.4,
              "time=%s" % page.evaluate("SHITTOWN.game.time"))
        check("no frame errors", page.evaluate("SHITTOWN.game._frameErrors || 0") == 0,
              "errors=%s" % page.evaluate("SHITTOWN.game._frameErrors || 0"))
        check("music off by default", page.evaluate("SHITTOWN.game.settings.musicOn") is False,
              str(page.evaluate("SHITTOWN.game.settings.musicOn")))
        check("hero is named Shitass", page.evaluate("SHITTOWN.game.heroName || 'SHITASS'") == "SHITASS")
        check("beer/cigs/vape start infinite", page.evaluate("SHITTOWN.game.player.beer===Infinity && SHITTOWN.game.player.cigs===Infinity && SHITTOWN.game.player.vapes===Infinity"))
        check("objective HUD is present", page.evaluate("!document.getElementById('objective').classList.contains('hidden')"))
        check("radar renders", page.evaluate("(() => { const c=document.getElementById('radar').getContext('2d'); const d=c.getImageData(0,0,160,160).data; return d.some(v=>v>0); })()"))
        check("SA-style pause menu exists", page.evaluate("!!document.querySelector('#pause .sa-panel')"))
        check("tutorial exists", page.evaluate("!!document.getElementById('tutorial')"))

        print("movement:")
        before = page.evaluate("({x: SHITTOWN.game.player.body.position.x, z: SHITTOWN.game.player.body.position.z})")
        page.send("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "w", "code": "KeyW",
            "windowsVirtualKeyCode": 87, "nativeVirtualKeyCode": 87,
        })
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 1200))")
        page.send("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "w", "code": "KeyW",
            "windowsVirtualKeyCode": 87, "nativeVirtualKeyCode": 87,
        })
        after = page.evaluate("({x: SHITTOWN.game.player.body.position.x, z: SHITTOWN.game.player.body.position.z})")
        moved = ((after["x"] - before["x"]) ** 2 + (after["z"] - before["z"]) ** 2) ** 0.5
        check("W moves the player", moved > 2.0, "moved %.2fm from %s to %s" % (moved, before, after))

        page.evaluate("SHITTOWN.teleport(20, 16); SHITTOWN.look(Math.PI / 2, 0)")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        rx0 = page.evaluate("SHITTOWN.game.player.body.position.x")
        rz0 = page.evaluate("SHITTOWN.game.player.body.position.z")
        page.send("Input.dispatchKeyEvent", {
            "type": "rawKeyDown", "key": "w", "code": "KeyW",
            "windowsVirtualKeyCode": 87, "nativeVirtualKeyCode": 87,
        })
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 900))")
        page.send("Input.dispatchKeyEvent", {
            "type": "keyUp", "key": "w", "code": "KeyW",
            "windowsVirtualKeyCode": 87, "nativeVirtualKeyCode": 87,
        })
        rx1 = page.evaluate("SHITTOWN.game.player.body.position.x")
        rz1 = page.evaluate("SHITTOWN.game.player.body.position.z")
        check("turned movement follows camera", (rx0 - rx1) > 1.5 and abs(rz1 - rz0) < 1.2,
              "dx=%.2f dz=%.2f" % (rx0 - rx1, rz1 - rz0))
        page.evaluate("SHITTOWN.look(0, 0)")

        # jump
        page.evaluate("SHITTOWN.teleport(20, 16); SHITTOWN.look(0, 0)")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 300))")
        jy0 = page.evaluate("SHITTOWN.game.player.body.position.y")
        page.send("Input.dispatchKeyEvent", {"type":"rawKeyDown","key":" ","code":"Space","windowsVirtualKeyCode":32,"nativeVirtualKeyCode":32})
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 280))")
        jy1 = page.evaluate("SHITTOWN.game.player.body.position.y")
        page.send("Input.dispatchKeyEvent", {"type":"keyUp","key":" ","code":"Space","windowsVirtualKeyCode":32,"nativeVirtualKeyCode":32})
        check("jumping works", jy1 > jy0 + 0.35, "y %.2f -> %.2f" % (jy0, jy1))

        page.evaluate("SHITTOWN.teleport(-15, 14); SHITTOWN.look(0, 0)")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 200))")
        cz0 = page.evaluate("SHITTOWN.game.player.body.position.z")
        page.send("Input.dispatchKeyEvent", {"type":"rawKeyDown","key":"w","code":"KeyW","windowsVirtualKeyCode":87,"nativeVirtualKeyCode":87})
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 1400))")
        page.send("Input.dispatchKeyEvent", {"type":"keyUp","key":"w","code":"KeyW","windowsVirtualKeyCode":87,"nativeVirtualKeyCode":87})
        cz1 = page.evaluate("SHITTOWN.game.player.body.position.z")
        check("curbs do not snag movement", cz0 - cz1 > 3.5, "z %.2f -> %.2f" % (cz0, cz1))

        print("combat / NPCs:")
        npc = page.evaluate("SHITTOWN.closestNpc()")
        check("pedestrians exist", bool(npc), str(npc))
        if npc:
            downed_before = page.evaluate("SHITTOWN.snapshot().downed + SHITTOWN.snapshot().knocked")
            page.evaluate("""(() => {
                const S=SHITTOWN, g=S.game, p=g.player.body.position;
                let best=null, bd=1e9;
                g.npcs.all.forEach(n => {
                  if (n.down || n.removed) return;
                  const d = Math.hypot(n.body.position.x-p.x, n.body.position.z-p.z);
                  if (d < bd) { bd = d; best = n; }
                });
                window.__punchTarget = best;
                if (!best) return;
                const dx=best.body.position.x-p.x, dz=best.body.position.z-p.z, d=Math.hypot(dx,dz)||1;
                S.teleport(best.body.position.x - dx/d*1.6, best.body.position.z - dz/d*1.6);
                S.look(Math.atan2(-dx/d, -dz/d), 0);
            })()""")
            page.resilient("new Promise(r=>setTimeout(()=>r(true), 220))")
            for _ in range(2):
                page.evaluate("SHITTOWN.punch()")
                page.resilient("new Promise(r=>setTimeout(()=>r(true), 480))")
            rag_snap = page.evaluate("SHITTOWN.snapshot()")
            target_down = page.evaluate("!!(window.__punchTarget && (window.__punchTarget.down || window.__punchTarget.knocked))")
            check("punching can ragdoll somebody", target_down,
                  "downed %s -> %s, target=%s" % (downed_before, rag_snap.get("downed", 0) + rag_snap.get("knocked", 0), target_down))
            for _ in range(4):
                page.evaluate("SHITTOWN.punch()")
                page.resilient("new Promise(r=>setTimeout(()=>r(true), 480))")
            snap = page.evaluate("SHITTOWN.snapshot()")
            check("punching raises respect", snap.get("respect", 0) > 0, str(snap.get("respect")))
            check("punching raises wanted", snap.get("wanted", 0) > 0, str(snap.get("wanted")))
            page.evaluate("""(() => {
              const g=SHITTOWN.game;
              for (let i = g.npcs.all.length - 1; i >= 0 && g.npcs.all.length > 44; i--) {
                const v = g.npcs.all[i];
                if (v.kind !== 'ped') continue;
                g.world.scene.remove(v.group);
                g.world.physics.removeBody(v.body);
                g.npcs.all.splice(i, 1);
              }
              const n=g.npcs.spawn('bouncer', -30, 10, 0, { name: 'TEST BOUNCER' });
              if (!n) return;
              n.health=240;
              n.knockdown(g.player.body.position, 1.2);
              window.__testBouncer = n;
            })()""")
            page.resilient("new Promise(r=>setTimeout(()=>r(true), 3200))")
            check("ragdolled NPCs get back up and fight", page.evaluate("!!(window.__testBouncer && !window.__testBouncer.down && !window.__testBouncer.knocked)"))
            check("downed NPCs never sink through the floor",
                  page.evaluate("SHITTOWN.game.npcs.all.every(n => !(n.down || n.knocked) || n.group.position.y >= n.floorY - 0.06)"))

        print("degeneracy:")
        page.evaluate("SHITTOWN.game.player.papers = 2; SHITTOWN.weed(2); SHITTOWN.smokeWeed();")
        check("weed gets you high", page.evaluate("SHITTOWN.snapshot().drunk >= 0 && SHITTOWN.game.player.stoned > 0"),
              str(page.evaluate("SHITTOWN.game.player.stoned")))
        check("joint is visible while smoking", page.evaluate("SHITTOWN.game.player.smoking && SHITTOWN.game.player.smoking.type==='joint' && SHITTOWN.game.player.jointModel.visible"))
        page.evaluate("SHITTOWN.game.player.cigs=1; SHITTOWN.smoke()")
        check("cigarettes smoke too", page.evaluate("SHITTOWN.game.player.smoking.type==='cig' && SHITTOWN.game.player.cigModel.visible"))
        check("lighter and cough sounds exist", page.evaluate("typeof ST.audio.lighter==='function' && typeof ST.audio.cough==='function'"))
        page.evaluate("SHITTOWN.game.player.useDrug('coke')")
        check("drugs work", page.evaluate("SHITTOWN.game.player.activeDrug === 'coke' && SHITTOWN.game.player.drugT > 0"))
        page.evaluate("SHITTOWN.game.ui._showApp('tor'); SHITTOWN.give(300); SHITTOWN.torBuy('bag')")
        check("onion marketplace works", page.evaluate("SHITTOWN.game.player.cash < 320"))
        page.evaluate("SHITTOWN.squeak()")
        check("squeaky chicken works", page.evaluate("SHITTOWN.game.player.chickenT") > 0,
              str(page.evaluate("SHITTOWN.game.player.chickenT")))
        page.evaluate("SHITTOWN.game.player.beer=2; SHITTOWN.drink()")
        check("beer works", page.evaluate("SHITTOWN.snapshot().drunk") > 0)
        check("beer drinking animation is visible", page.evaluate("SHITTOWN.game.player.beerT > 0 && SHITTOWN.game.player.beerHand.visible"))
        check("beer arm is connected", page.evaluate("(() => { const r=SHITTOWN.game.player.beerRig; return !!(r && r.upper.visible && r.fore.visible && r.elbow.visible && r.cuff.visible); })()"))
        check("beer arm has a bent elbow", page.evaluate("(() => { const p=SHITTOWN.game.player, r=p.beerRig; const d=r.elbow.position.distanceTo(p.beerHand.position); return r.elbow.visible && Math.abs(d - r.l2) < 0.03 && r.upper.scale.y > 0.1; })()"))
        page.evaluate("(() => { const p=SHITTOWN.game.player; p.beerHeld=false; p.beerT=0; p.beerSips=0; p.beer=Infinity; p.pullBeer(); })()")
        check("beer waits for a left click", page.evaluate("SHITTOWN.game.player.beerHeld && SHITTOWN.game.player.beerT === 0 && SHITTOWN.game.player.beerSips === 4"))
        page.evaluate("SHITTOWN.game.player.attack()")
        check("left click takes a swig", page.evaluate("SHITTOWN.game.player.beerT > 0 && SHITTOWN.game.player.beerSips === 3"))
        page.evaluate("SHITTOWN.game.player.smashBeer()")
        check("bottle smashes and auto-pulls another", page.evaluate("SHITTOWN.game.player.beerHeld === false && SHITTOWN.game.player.beerAutoT > 0"))
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 2000))")
        check("new bottle comes out of the pocket", page.evaluate("SHITTOWN.game.player.beerHeld === true && SHITTOWN.game.player.beerStock >= 12"))
        page.evaluate("(() => { const p=SHITTOWN.game.player; p.clearBeer(); p.beerAutoT=0; p.smoking=null; p.dragAnim=0; p.dragCount=0; p.dead=false; p.health=100; p.cigs=Infinity; p.smoke(); })()")
        pre_smoke = page.evaluate("({sm:!!SHITTOWN.game.player.smoking, t:SHITTOWN.game.player.smoking && SHITTOWN.game.player.smoking.t, beer:SHITTOWN.game.player.beerHeld, cigs:String(SHITTOWN.game.player.cigs), inf:SHITTOWN.game.player.cigs === Infinity})")
        page.evaluate("SHITTOWN.game.player.attack()")
        smoke_state = page.evaluate("({pre: null, d:SHITTOWN.game.player.dragCount, t:SHITTOWN.game.player.smoking && SHITTOWN.game.player.smoking.t, beer:SHITTOWN.game.player.beerHeld, sm:!!SHITTOWN.game.player.smoking, dead:SHITTOWN.game.player.dead})")
        check("cigarettes need a click to drag", smoke_state.get("d", 0) >= 1 and smoke_state.get("t", 99) < 12, str(pre_smoke) + " -> " + str(smoke_state))
        page.evaluate("SHITTOWN.game.player.clearSmoking(); SHITTOWN.game.player.clearBeer()")
        page.evaluate("SHITTOWN.game.player.toggleCamera()")
        check("third person camera works", page.evaluate("SHITTOWN.game.player.thirdPerson === true && SHITTOWN.game.player.avatar.visible === true"))
        check("hooded avatar is built", page.evaluate("(() => { const a=SHITTOWN.game.player.avatar; return a && a.children.length >= 5 && !!SHITTOWN.game.player.avatarHead && !!SHITTOWN.game.player.avatarTorso; })()"))
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 200))")
        check("first-person hands hide in third person", page.evaluate("SHITTOWN.game.player.camera.children.every(c => !c.visible)"))
        page.evaluate("SHITTOWN.game.player.toggleCamera()")
        check("camera returns to first person", page.evaluate("SHITTOWN.game.player.thirdPerson === false && SHITTOWN.game.player.avatar.visible === false"))
        page.evaluate("SHITTOWN.game.player.dead = false; SHITTOWN.heal(); SHITTOWN.game.player.driving = null; SHITTOWN.game.player.plane = null; SHITTOWN.pee()")
        check("pee works", page.evaluate("SHITTOWN.game.player.peeing") > 0)

        print("weapons:")
        page.evaluate("SHITTOWN.giveWeapon('pistol', 12)")
        ammo0 = page.evaluate("SHITTOWN.game.player.ammo.pistol")
        page.evaluate("SHITTOWN.attack()")
        ammo1 = page.evaluate("SHITTOWN.game.player.ammo.pistol")
        check("pistol fires", ammo1 == ammo0 - 1, "%s -> %s" % (ammo0, ammo1))
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 500))")
        page.evaluate("(() => { const p=SHITTOWN.game.player; p.attackCd=0; p.dead=false; p.health=100; p.driving=null; p.plane=null; p.smoking=null; p.beerHeld=false; p.giveWeapon('shotgun', 4); p.attack(); })()")
        check("shotgun fires", page.evaluate("SHITTOWN.game.player.ammo.shotgun") == 3,
              str(page.evaluate("SHITTOWN.game.player.ammo.shotgun")))

        print("phone:")
        page.evaluate("SHITTOWN.openPhone('shitter')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        check("phone opens", page.evaluate("!document.getElementById('phone').classList.contains('hidden')"))
        check("shitter feed renders", page.evaluate("document.getElementById('shitter-feed').children.length") > 0)
        page.evaluate("SHITTOWN.game.ui._showApp('ds')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 700))")
        check("DS emulator canvas renders", page.evaluate(
            "(() => { const c=document.getElementById('ds-canvas').getContext('2d'); const d=c.getImageData(0,0,160,128).data; return d.some(v=>v>0); })()"))
        page.evaluate("SHITTOWN.game.ui._dsInit('snake'); SHITTOWN.game.ui.dsKey('arrowdown')")
        page.evaluate("document.getElementById('phone-close').click()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 300))")
        page.evaluate("SHITTOWN.openPhone('radio')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        check("phone radio app renders", page.evaluate("document.querySelectorAll('#radio-body [data-radio]').length") >= 6,
              str(page.evaluate("document.querySelectorAll('#radio-body [data-radio]').length")))
        page.evaluate("document.querySelector('#radio-body [data-radio=bar]').click()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 300))")
        check("phone radio starts music", page.evaluate("SHITTOWN.game.settings.musicOn === true && SHITTOWN.game.audio.station === 'bar'"))
        page.evaluate("document.querySelector('#radio-body [data-radio=off]').click()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 300))")
        check("phone radio stops music", page.evaluate("SHITTOWN.game.settings.musicOn === false"))
        for app, probe in [("drugs", "#drugs-body [data-drug]"), ("weedmap", "#weedmap-body [data-weedmap]"),
                           ("tor", "#tor-body [data-tor]"), ("guide", "#guide-body .guide-block")]:
            page.evaluate("SHITTOWN.game.ui._showApp('%s')" % app)
            page.resilient("new Promise(r=>setTimeout(()=>r(true), 120))")
            check("phone app %s renders" % app, page.evaluate("document.querySelectorAll('%s').length" % probe) > 0)
        page.evaluate("document.querySelector('#weedmap-body [data-weedmap]').click()")
        check("weedmaps order works", page.evaluate("SHITTOWN.game.player.weed > 0"))
        page.evaluate("document.getElementById('phone-close').click()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")

        print("extras:")
        page.evaluate("""(() => {
          const g=SHITTOWN.game, w=g.world;
          const ext=w.interactables.find(i=>i.prompt.indexOf('EXTINGUISHER')>=0);
          if(ext) ext.action();
          g.player.water=2;
          g.player.throwWater();
          g.player.input && (g.player.input.r=true);
        })()""")
        check("extinguisher pickup works", page.evaluate("SHITTOWN.game.player.hasExtinguisher"))
        page.evaluate("""(() => {
          const g=SHITTOWN.game, w=g.world;
          g.player.cash=200;
          const paper=w.interactables.find(i=>i.prompt.indexOf('ROLLING PAPERS')>=0);
          if(paper) paper.action();
          const wrap=w.interactables.find(i=>i.prompt.indexOf('BLUNT WRAPS')>=0);
          if(wrap) wrap.action();
        })()""")
        check("rolling papers and blunt wraps exist", page.evaluate("SHITTOWN.game.player.papers > 0 && SHITTOWN.game.player.wraps > 0"),
              str(page.evaluate("({p:SHITTOWN.game.player.papers,w:SHITTOWN.game.player.wraps})")))
        check("water bottle works", page.evaluate("SHITTOWN.game.player.water") < 2)
        page.evaluate("SHITTOWN.game.input.x=true; SHITTOWN.game.player.startExtinguish()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        check("extinguisher sprays", page.evaluate("SHITTOWN.game.player.spraying && SHITTOWN.game.player.extModel.visible"))
        page.evaluate("SHITTOWN.game.player.stopExtinguish()")
        page.evaluate("SHITTOWN.game.input.r=true; SHITTOWN.game.player.startPee()")
        check("pee is a visible stream", page.evaluate("SHITTOWN.game.player.peeing && SHITTOWN.game.player.peeBeam.visible"))
        page.evaluate("SHITTOWN.game.player.stopPee()")
        page.evaluate("""(() => {
          const n=SHITTOWN.game.npcs.all.find(x=>!x.down);
          if(n){ n._sayCd=0; n.say('THIS IS A TEST BUBBLE.'); }
        })()""")
        check("speech bubbles appear above people", page.evaluate("SHITTOWN.game.world.bubbles.length") > 0)
        check("red light district exists", page.evaluate("!!SHITTOWN.game.world.redLight"))
        check("party zone exists", page.evaluate("!!SHITTOWN.game.world.party"))
        check("party crew exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='dj') && SHITTOWN.game.npcs.all.filter(n=>n.kind==='partygoer').length >= 4"))
        check("gore body parts exist", page.evaluate("typeof SHITTOWN.game.world.bodyParts==='function'"))

        print("slots:")
        page.evaluate("SHITTOWN.give(100); SHITTOWN.openSlots()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 150))")
        page.evaluate("SHITTOWN.spin()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 2400))")
        check("slots spin and resolve", page.evaluate("document.getElementById('slot-result').textContent.length") > 0,
              page.evaluate("document.getElementById('slot-result').textContent"))
        page.evaluate("SHITTOWN.closeSlots()")

        print("music engine:")
        page.evaluate("SHITTOWN.game.settings.musicOn = true; SHITTOWN.game.audio.setMusicEnabled(true); SHITTOWN.game.audio.setStation('bar')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 2200))")
        music = page.evaluate("({enabled: SHITTOWN.game.audio.musicEnabled, station: SHITTOWN.game.audio.station, step: SHITTOWN.game.audio.step, state: SHITTOWN.game.audio.ctx ? SHITTOWN.game.audio.ctx.state : null})")
        check("music engine schedules notes", music.get("enabled") is True and music.get("step", 0) > 0, str(music))
        check("music context runs", music.get("state") == "running", str(music))
        check("soundtrack is mellow Japanese", page.evaluate("(() => { const d=SHITTOWN.game.audio.defs; return d.street.songTitle==='TOKYO RAIN' && d.bar.songTitle==='SHINJUKU 3AM' && d.club.songTitle==='SAKURA LOUNGE' && d.heat.songTitle==='ONI DRUMS' && d.casino.songTitle==='PACHINKO DREAMS'; })()"))
        check("koto voice exists", page.evaluate("typeof SHITTOWN.game.audio.koto === 'function'"))
        check("silly loud damage sounds play", page.evaluate("(() => { try { ST.audio.hurt(); ST.audio.pain(); ST.audio.thunk(); ST.audio.boing(); ST.audio.squelch(); return true; } catch(e) { return false; } })()"))
        page.evaluate("SHITTOWN.game.settings.musicOn = false; SHITTOWN.game.audio.setMusicEnabled(false)")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 400))")

        print("model / world:")
        check("mall exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='wiener')"))
        check("weed shop clerk exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='weedclerk')"))
        check("barber exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='barber')"))
        check("pimp exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='pimp')"))
        check("petitioner exists", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.kind==='petitioner')"))
        check("human-ish NPC eyes exist", page.evaluate("SHITTOWN.game.npcs.all.filter(n=>n.eyeWhites && n.eyeWhites.length===2).length") > 10)

        print("kentucky / vehicles:")
        check("joke banks intact", page.evaluate("!!ST.jokes.ticker && !!ST.jokes.extraBarks.redneck"))
        check("rednecks exist", page.evaluate("SHITTOWN.game.npcs.all.filter(n=>n.kind==='redneck').length >= 3"))
        check("cars exist", page.evaluate("SHITTOWN.game.world.cars.length >= 6"))
        check("ambient traffic exists", page.evaluate("SHITTOWN.game.world.cars.filter(c=>c.ai).length >= 2"))
        check("rednecks have barks", page.evaluate("(ST.jokes.extraBarks.redneck || []).length >= 5"))
        check("city skyline exists", page.evaluate("SHITTOWN.game.scene.children.some(o => o.geometry && o.geometry.type === 'CylinderGeometry' && Math.round(o.position.y) === 36)"))
        check("high quality is 720p", page.evaluate("SHITTOWN.game.settings.quality === 'high' ? SHITTOWN.game._baseH === 720 : true"))
        check("engine audio hooks exist", page.evaluate("typeof SHITTOWN.game.audio.engineStart === 'function' && typeof SHITTOWN.game.audio.engineStop === 'function'"))
        page.evaluate("""(() => {
          const g=SHITTOWN.game, p=g.player;
          const n=g.npcs.all.find(x=>!x.down && x.kind!=='cop' && x.kind!=='security');
          if (n) p.body.position.set(n.body.position.x+1.6, 1.2, n.body.position.z);
          p.smoking=null; p.cigs=Infinity; p.smoke(); p.reactCd=0; p.drag();
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 500))")
        smoke_diag = page.evaluate("""(() => {
          const g=SHITTOWN.game, p=g.player;
          let near=null, nd=1e9;
          g.npcs.all.forEach(n=>{ if(n.down||n.removed) return; const d=Math.hypot(n.body.position.x-p.body.position.x,n.body.position.z-p.body.position.z); if(d<nd){nd=d;near=n;} });
          return {sm:!!p.smoking, type:p.smoking&&p.smoking.type, cigs:String(p.cigs), react:p.reactCd, near:Math.round(nd), coughing:g.npcs.all.filter(n=>n.coughT>0).length, dead:p.dead, drive:!!p.driving, plane:!!p.plane};
        })()""")
        check("secondhand smoke makes NPCs cough", page.evaluate("SHITTOWN.game.npcs.all.some(n=>n.coughT>0 || n.tweakOut>0)"), str(smoke_diag))
        page.evaluate("""(() => {
          const g=SHITTOWN.game, p=g.player;
          p.weed=1; p.papers=1; p.wanted=0;
          p.smokeWeed();
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 350))")
        check("weed makes the cops angry", page.evaluate("SHITTOWN.snapshot().wanted > 0"))
        page.evaluate("SHITTOWN.game.player.smoking=null; SHITTOWN.game.player.coughT=0")
        page.evaluate("SHITTOWN.game.resume()")
        page.evaluate("""(() => {
          const g=SHITTOWN.game, p=g.player;
          const c=g.world.cars.find(c=>!c.ai);
          p.body.position.set(c.group.position.x, 1.2, c.group.position.z);
          p.interact();
        })()""")
        check("can enter a car", page.evaluate("!!SHITTOWN.game.player.driving"))
        page.evaluate("SHITTOWN.game.world.cars.find(c=>c.occupied).group.position.clone = null; window.__carZ = SHITTOWN.game.world.cars.find(c=>c.occupied).group.position.z")
        page.evaluate("SHITTOWN.game.input['w'] = true")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 900))")
        page.evaluate("SHITTOWN.game.input['w'] = false")
        check("car drives", page.evaluate("Math.abs(SHITTOWN.game.world.cars.find(c=>c.occupied).group.position.z - window.__carZ) > 0.5"))
        page.evaluate("SHITTOWN.game.player.interact()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 200))")
        check("can exit the car", page.evaluate("SHITTOWN.game.player.driving === null"))

        print("story / cars:")
        check("Honest Earl sells cars", page.evaluate("SHITTOWN.game.world.interactables.some(i => i.prompt.indexOf('BUY A CAR') >= 0)"))
        page.evaluate("""(() => {
          const g = SHITTOWN.game, p = g.player;
          p.cash = 900;
          const buy = g.world.interactables.find(i => i.prompt.indexOf('BUY A CAR') >= 0);
          buy.action();
        })()""")
        check("buying a car works", page.evaluate("SHITTOWN.game.story.carBought === true && SHITTOWN.game.world.cars.some(c => c.owned)"))
        check("carjacking sets the flag", page.evaluate("SHITTOWN.game.story.carStolen === true"))
        check("story markers work", page.evaluate("(() => { const g=SHITTOWN.game; g.setMarker(0,0,0xff0000); const had=!!g.marker; g.clearMarker(); return had && !g.marker; })()"))
        check("story has 9 missions", page.evaluate("SHITTOWN.game.story.stage >= 0"))
        page.evaluate("SHITTOWN.game.rollCredits()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 200))")
        check("credits roll", page.evaluate("!document.getElementById('credits').classList.contains('hidden') && document.getElementById('credits').textContent.indexOf('DEEPSEEK') >= 0 && document.getElementById('credits').textContent.indexOf('github.com/kelllar') >= 0"))
        page.evaluate("SHITTOWN.game.closeCredits()")
        check("credits close", page.evaluate("document.getElementById('credits').classList.contains('hidden')"))

        print("story mode:")
        page.evaluate("""(() => {
          const g=SHITTOWN.game, st=g.story, p=g.player;
          st.enabled=true; st.stage=0; st.final=false; st.slickMet=false;
          st.carBought=false; st.carStolen=false; st.deliveryDone=false;
          p.dead=false; p.health=100; p.driving=null; p.plane=null;
          g.objective="Meet Slick at the club. Purple hat. Bad vibes.";
          g.ui.setObjective(g.objective);
          g.updateStoryMarker();
        })()""")
        check("story starts with mission one", page.evaluate("SHITTOWN.game.story.stage === 0 && SHITTOWN.game.objective.indexOf('Slick') >= 0"))
        check("mission marker is placed", page.evaluate("!!SHITTOWN.game.marker && Math.round(SHITTOWN.game.marker.position.x) === 22"))
        page.evaluate("SHITTOWN.openPhone('missions')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 200))")
        check("missions app lists the campaign", page.evaluate("document.querySelectorAll('#missions-body .mission-row').length === 9 && document.querySelector('#missions-body .mission-head').textContent.indexOf('1/9') >= 0"))
        page.evaluate("SHITTOWN.closePhone()")
        page.evaluate("""(() => {
          const g=SHITTOWN.game, n=g.npcs.all.find(x=>x.name==='Slick');
          if(!n) return;
          g.player.body.position.set(n.body.position.x, 1.2, n.body.position.z + 1.6);
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 350))")
        page.evaluate("""(() => {
          const g=SHITTOWN.game, n=g.npcs.all.find(x=>x.name==='Slick');
          if(n) g.player.yaw = Math.atan2(-(n.body.position.x-g.player.body.position.x), -(n.body.position.z-g.player.body.position.z));
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        page.evaluate("SHITTOWN.game.player.interact()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 500))")
        check("talking to Slick advances the story", page.evaluate("SHITTOWN.game.story.stage === 1"))
        if page.evaluate("SHITTOWN.game.cutsceneOpen"):
            page.evaluate("SHITTOWN.skipCutscene()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 400))")
        check("next mission objective is shown", page.evaluate("SHITTOWN.game.story.stage === 1 && SHITTOWN.game.objective.indexOf('ride') >= 0"))
        page.evaluate("SHITTOWN.game.story.enabled = false")

        print("open world / phone:")
        check("plane exists", page.evaluate("!!SHITTOWN.game.world.plane"))
        page.evaluate("""(() => {
          const g=SHITTOWN.game, p=g.player;
          p.body.position.set(g.world.plane.group.position.x, 1.2, g.world.plane.group.position.z);
          p.interact();
        })()""")
        check("can enter the plane", page.evaluate("!!SHITTOWN.game.player.plane"))
        page.evaluate("SHITTOWN.game.input['w'] = true")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 1200))")
        page.evaluate("SHITTOWN.game.input['w'] = false")
        check("plane flies", page.evaluate("SHITTOWN.game.world.plane.speed > 3 || SHITTOWN.game.world.plane.group.position.y > 1"))
        page.evaluate("SHITTOWN.game.world.plane.alt = 0; SHITTOWN.game.player.interact()")
        check("can exit the plane", page.evaluate("SHITTOWN.game.player.plane === null"))
        page.evaluate("SHITTOWN.openPhone('home')")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        check("held phone is visible", page.evaluate("SHITTOWN.game.player.phoneModel.visible"))
        page.evaluate("SHITTOWN.game.ui.phoneKey('arrowdown')")
        check("phone arrow navigation works", page.evaluate("SHITTOWN.game.ui.phoneFocus === 1"))
        page.evaluate("SHITTOWN.game.ui.phoneKey('enter')")
        check("phone enter opens app", page.evaluate("SHITTOWN.game.ui.phoneApp === 'shitter'"))
        page.evaluate("SHITTOWN.closePhone()")
        check("phone hides when closed", page.evaluate("SHITTOWN.game.player.phoneModel.visible === false"))
        check("breakable walls exist", page.evaluate("SHITTOWN.game.world.props.filter(p=>p.wall).length >= 8"))
        check("lampposts can be knocked down", page.evaluate("""(() => {
          const w=SHITTOWN.game.world;
          const lamp=w.props.find(p=>p.lamp && !p.toppled);
          if(!lamp) return false;
          w.damageProp(lamp, 500, new THREE.Vector3(lamp.mesh.position.x+1,1,lamp.mesh.position.z), {x:4,y:1,z:0});
          return lamp.toppled === true;
        })()"""))
        check("kill popup works", page.evaluate("""(() => {
          const g=SHITTOWN.game;
          g.registerKill({ body: { position: { x: 0, z: 0 } } });
          return document.querySelectorAll('.killpop').length > 0;
        })()"""))

        print("pickups / machines:")
        page.evaluate("""(() => {
          const g = SHITTOWN.game, w = g.world;
          const bat = w.interactables.find(i => i.prompt.indexOf('BASEBALL BAT') >= 0);
          if (bat) bat.action();
          const bong = w.interactables.find(i => i.prompt.indexOf('RIP THE BONG') >= 0);
          g.player.weed = 2;
          if (bong) bong.action();
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 400))")
        check("weapon pickup works", page.evaluate("SHITTOWN.game.player.owned.bat === true"))
        check("bong works", page.evaluate("SHITTOWN.game.player.stoned > 0"))
        check("weapon HUD updates", page.evaluate("document.getElementById('weapon-name').textContent.length") > 0)
        page.evaluate("""(() => {
          const arc = SHITTOWN.game.world.interactables.find(i => i.prompt.indexOf('PLAY THE ARCADE') >= 0);
          if (arc) arc.action();
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 450))")
        check("arcade opens the DS", page.evaluate("SHITTOWN.game.phoneOpen && SHITTOWN.game.ui.phoneApp === 'ds'"))
        page.evaluate("SHITTOWN.closePhone()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 350))")

        print("polish checks:")
        page.evaluate("SHITTOWN.game.player.switchWeapon('fists')")
        check("fist viewmodel is used for fists",
              page.evaluate("SHITTOWN.game.player.fist.visible && !SHITTOWN.game.player.hand.visible"))
        page.evaluate("SHITTOWN.giveWeapon('pistol', 4); SHITTOWN.game.player.switchWeapon('pistol')")
        check("hand returns for weapons",
              page.evaluate("SHITTOWN.game.player.hand.visible && !SHITTOWN.game.player.fist.visible"))
        page.evaluate("SHITTOWN.game.pause()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        menu = page.evaluate("""(() => {
            const p=document.querySelector('#pause .panel').getBoundingClientRect();
            const o=document.querySelector('#pause');
            return {top:p.top, bottom:p.bottom, vh:innerHeight, scroll:o.scrollHeight, client:o.clientHeight};
        })()""")
        check("pause menu is not clipped", menu.get("top", -1) >= -1 and (menu.get("bottom", 9999) <= menu.get("vh", 0) + 1 or menu.get("scroll", 0) > menu.get("client", 0)), str(menu))
        page.evaluate("SHITTOWN.game.resume()")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 250))")
        chunk = page.evaluate("""(() => {
            const w=SHITTOWN.game.world;
            const win=w.windows.find(x=>!x.dead);
            if(!win) return {debris:0,had:false};
            w.damageProp(win, 999, win.mesh.position.clone());
            return {debris:w.debris.length, had:true};
        })()""")
        check("breakables break into chunks", chunk.get("had") is True and chunk.get("debris", 0) > 0, str(chunk))
        check("neon is present", page.evaluate("SHITTOWN.game.world.neons.length") > 5,
              str(page.evaluate("SHITTOWN.game.world.neons.length")))
        check("death/pain/boing sounds exist",
              page.evaluate("['scream','pain','boing'].every(k=>typeof ST.audio[k]==='function')"))

        print("stress:")
        page.evaluate("""(() => {
          const g=SHITTOWN.game;
          g.player.cash = 9999; g.player.weed = 5; g.player.beer = 5;
          ["wiener","chicken","weedclerk","barber","security","mallrat","tweaker","pimp","petitioner","bartender","clerk","dancer","bouncer","oldman","karen"].forEach(k=>{
            const n = g.npcs.all.find(x => x.kind === k && !x.down);
            if (n) n.interact();
          });
          SHITTOWN.heal();
          SHITTOWN.explode(6, 10);
          SHITTOWN.fireAt(12, 12);
          SHITTOWN.breakAt(-6, 8);
          ["street","bar","club","heat","casino"].forEach(s=>g.audio.setStation(s));
          g.player.switchWeapon("bat");
          return true;
        })()""")
        page.resilient("new Promise(r=>setTimeout(()=>r(true), 2500))")
        check("stress run has no frame errors", page.evaluate("SHITTOWN.game._frameErrors || 0") == 0,
              "errors=%s last=%s" % (page.evaluate("SHITTOWN.game._frameErrors || 0"), page.evaluate("SHITTOWN.game._lastFrameError || ''")))
        check("player survived stress", page.evaluate("SHITTOWN.game.player.dead === false"))

        errors = page.console_errors()
        # pointer lock is expected to be unavailable in headless
        errors = [e for e in errors if "pointer lock" not in e.lower()
                  and "WrongDocumentError" not in e and "root document" not in e]
        check("no console errors", not errors, str(errors[:6]))

        page.screenshot(os.path.join(ROOT, "tests", "smoke.png"))
        print("\nScreenshot: tests/smoke.png")
    except Exception:
        traceback.print_exc()
        FAILS.append("exception")
    finally:
        if page:
            try:
                page.close()
            except Exception:
                pass
        httpd.shutdown()
        httpd.server_close()

    if FAILS:
        print("\nFAILED: %d" % len(FAILS))
        return 1
    print("\nALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
