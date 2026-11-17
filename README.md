# SHITTOWN, KENTUCKY

A single-player, browser-based, PS2-era first-person sandbox about bad decisions.
Postal 2 energy with Saints Row / GTA structure and a run-down 2000s mall town.
You are **SHITASS**, and your goal is to become the kingpin of Shittown.
No portals. No install. No build step.

Everything is local: three.js and cannon.js are vendored, and all textures,
models, music and sound effects are generated in code at runtime. There are no
network calls during play.

## Run it

**Mac / Linux**

```sh
cd shittown
python3 serve.py
```

Then open <http://localhost:4351>. `serve.py` opens the browser for you.

**Windows**

Double-click `serve.bat`, or:

```bat
py serve.py
```

You can also open `index.html` directly, but Chrome and Safari restrict pointer
lock and local storage on `file://` URLs. The server is the reliable option.

**Share with a friend:** zip the whole `shittown` folder. They unzip it anywhere
and run `serve.py` (or `serve.bat`). Nothing else to install beyond Python,
which is already on most PCs. The game works with Chrome, Edge, Firefox, and
Safari.

## Soundtrack (off by default)

The soundtrack never autoplays. That is deliberate.

- `ESC` → **SOUNDTRACK: ON** (also a master mute button there)
- `T` → phone → **RADIO**, pick a station
- `L` mutes all audio instantly
- Pausing or switching tabs stops/suspends the audio. Closing the page shuts
  the audio context down.

Five **low-key Japanese** stations: original hirajoshi / minor-pentatonic
compositions with plucked koto, soft pads, brushed drums, rounded bass, and a
mellow bell lounge. Nothing autoplays, and none of it is a copyrighted
recording.

- **87.3 TOKYO RAIN** — lo-fi city pop, 84 BPM, rain-soaked rhodes and koto.
- **90.1 SHINJUKU 3AM** — late-night jazz, 72 BPM, brushed kit and walking bass.
- **96.5 SAKURA LOUNGE** — downtempo house, 104 BPM, plucked koto hook.
- **102.7 ONI DRUMS** — low taiko pulse, 96 BPM, still quiet, still ominous.
- **108.1 PACHINKO DREAMS** — crackly bell lounge, 92 BPM.

Damage is not realistic. Getting hit produces a loud rubbery cartoon yelp,
a slide-whistle of regret, and an unnecessarily loud bonk. NPC pain is a
kazoo-adjacent grunt. Deaths get a wet squelch on top.

Every note is synthesized live in the browser (koto, pad, rhodes, flute-like
sine lead, soft drums). Intensity still rises with the wanted level, but the
mix stays deliberately mellow.

## Controls

| Input | Action |
| --- | --- |
| WASD | move |
| Mouse | look (click the game to capture the mouse) |
| Shift | sprint (FOV kick + speed lines) |
| Space | jump |
| LMB | attack / swing / shoot |
| RMB | the Claw: grab, hold, release to launch |
| E | interact / use / talk / buy / steal a car / exit a car |
| 1–5 | fists, bat, shovel, pistol, shotgun |
| Q | kick (visible boot animation) |
| Z | toggle first / third person |
| F | pull out a beer (infinite, 12 minimum in your pocket). **LMB** takes a swig. Four swigs, then smash it and another comes out |
| B | roll a joint/blunt (needs weed + papers or a wrap). **LMB** hits it |
| C | pull out a cigarette (infinite). **LMB** takes a drag. Each drag burns it down, then flick it and light another |
| V | pull out the vape (infinite). **LMB** rips it |
| R | hold to pee — infinite animated stream + steady stream hiss, puts out fires |
| X | hold extinguisher (after pickup) |
| H | throw a water bottle |
| G | squeaky chicken |
| T | phone |
| F1 | open the in-phone guide |
| M | next radio station (when soundtrack is on) |
| L | mute all audio |
| Escape | pause / close phone |

## Story: nine missions, one pimp king

A full single-player campaign with objectives, markers, cutscenes, a boss fight,
and an ending. Press **F1** any time for the current objective.

1. **A FAVOR FOR SLICK** — meet Slick at Glitter Gulch.
2. **THE WHEELS** — buy a car from Honest Earl for $250 or steal any parked car or moving traffic.
3. **FIRST RUN** — drive to the yellow drop marker behind the strip.
4. **MEDICAL BREAK** — buy weed at 420 Depot, Dave's van, or Weedmaps.
5. **BUILD A STABLE** — recruit three dancers (Glitter Gulch) or party girls (backyard) for $50 each.
6. **THE SUIT** — buy the purple pimp suit at Cuts & Blood for $300.
7. **CLUB TAKEOVER** — KO the bouncer and Slick.
8. **THE RIVAL PIMP** — The Colonel rolls into Honest Earl's lot with four goons and a mustache. Drive there and end him. This is the climax.
9. **PIMP KING** — reach 1,500 Respect, beat the game, and watch the credits.

The credits list **DeepSeek** and **github.com/kelllar**. You earned them.
Nobody claps. That is how you know it is real.

The objective tracker is on the HUD, and the phone's **GUIDE** app repeats it with controls and a walkthrough. A first-time tutorial walks you through movement, punching, the Claw, substances, the phone, and weapons.

## Kentucky, and everyone in it

Shittown is a run-down Kentucky town where weed is technically legal and the
police have decided not to recognize the paperwork. The skyline, water tower,
grain silos, church steeple, power lines, back street, parking lot and constant
traffic are all there so the place feels like a town instead of a diorama.

- **Rednecks** wander the streets in flannel and trucker caps, dispensing
  cousin-related wisdom. More arrive as the town gets busier.
- **Secondhand smoke is real.** Light a cigarette, joint, blunt or vape near
  people and they cough, wave it away, yell at you, and tweakers start tweaking
  harder. The ticker keeps a body count of offended strangers.
- **Weed makes cops angry.** Even though it is legal here. Especially because it
  is legal here. Smoke a joint near a cop and the wanted stars go up.
- **Drivable cars.** Walk up to any parked junker and press **E** to steal it,
  or buy the yellow one from **Honest Earl's Used Cars** for $250. **W/S** gas
  and brake, **A/D** steer, **Space** handbrake, **E** get out. The engine is
  synthesized and pitches with speed.
- **Cars hit everything.** People, mailboxes, bins, crates, other cars. Run
  over a propane tank and find out. Other cars get knocked sideways when rammed.
- **Traffic fights back.** Ambient cars swerve around parked cars and each
  other instead of clipping through, brake for pedestrians, and will absolutely
  hit you if you stand in the road. Getting clipped ragdolls you and hurts.
- **Lampposts go down.** Hit a streetlight and the whole pole topples, sparks,
  and lands in the road. Brick, siding and cinder walls around the outskirts can
  be smashed to chunks.
- **Open world.** A ring road circles the town, with a trailer park, Henderson
  Farms, a strip mall, a junkyard, and an airstrip. Drive out, walk out, or fly.
- **The plane.** Find THE SHITBIRD at Shittown Air. **W/S** throttle, **A/D**
  turn, **Space** climb, **Shift** descend, **E** get out (not at altitude). It
  is held together by tape and optimism.
- **Stealing raises heat.** Jack a parked car and the owner screams. Stand in
  front of moving traffic and press **E** to steal that one too. The cops care.
- **Better picture.** Higher default render (720p PS2 HQ), a painted city
  skyline with lit windows, farther fog, a water tower that has never held
  water, and a back street behind the strip.

## Things to do

- Follow the kingpin story to the end. There is a final cutscene. Nobody is proud.
- Sign (or beat up) the petition guy.
- Buy weed at **420 DEPOT**, rip the bong, get philosophical. Or use **WEEDMAPS** and have Dave's van not deliver.
- Find **rolling papers** and **blunt wraps** at 420 Depot, the house, or around the alley. You need one plus a bag of weed to roll up.
- Beer, cigarettes, and vapes are infinite. Pissing is infinite. The town is not.
- Use the **DRUGS** app for juice, coke, xans, K-pins, and quaaludes. The sidewalk becomes a suggestion.
- Sell bags to random pedestrians and watch the cops notice.
- Open the **ONION** browser and buy a mystery bag, hire a hitman, or read the leaked mayor file.
- Hit the **backyard afterparty**: DJ, partygoers, keg, beer pong, fire pit, confetti, and too much neon.
- Visit the **Red Light District**: adult bookstore, peep show, tokens, and bad decisions under red bulbs.
- Set the town on fire, then put it out with a water bottle or extinguisher.
- Knock someone across the street, watch them bounce, then fight them again.
- Step over the geekers nodding out on the road. Or don't.
- Find a redneck, light a cigarette, and enjoy the coughing chorus.
- Buy Earl's yellow disaster, or steal something nicer and regret it.
- Run over a mailbox, a bin, and a propane tank in the same block.
- Stand in the road and let traffic introduce itself to your ribs.
- Drive down the main drag at night with the radio on. Try not to hit Gary.
- Get a $10 haircut at **CUTS & BLOOD**.
- Eat a $5 wiener at the **Wiener Schnitzel** in the dead mall.
- Buy an 8-piece bucket at **Pop's Chicken**.
- Play **SNAKE** and **PONG** on the phone's Double Screen app, or on the mall
  arcade cabinet.
- Drink until the screen wobbles, then pee on a cop.
- Throw a propane tank with the Claw. Or throw a person.
- Piss off the squeaky chicken until the mall cop attacks you.
- Gamble at **LUCKY PIG SLOTS** in the bar and the club.
- Collect Respect, climb from LOSER to LEGEND OF SHITTOWN.
- Get a wanted level, fight the cops, die, get a $75 hospital bill.
- Feed the fire barrel. Break every window. Take the shotgun off a cop.
- Read Shitter and Cracked on the phone. Reply to your mom.

## Test it

Requires Google Chrome:

```sh
cd shittown
python3 tests/smoke.py
```

This runs the real game in headless Chrome with muted audio and checks boot,
the animation loop, real keyboard movement, punching/NPC reactions, beer, pee,
weed, the chicken, pistol/shotgun, phone apps (Shitter, radio, DS games), slots,
music scheduling, the new shops, and a scripted stress run. It writes
`tests/smoke.png`. `./tests/run.sh` is the same thing.

## Online multiplayer (LAN / relay)

Online is a **ghost co-op** layer, not a full server-authoritative GTA:

- Other players appear as hooded avatars with names, move smoothly, and show
  whether they are on foot, in a car, or in the plane.
- **Y** opens chat. Messages appear above their character and in the ticker.
- Punches are routed to the other player (they take damage and get a message).
- NPCs, props, missions, and explosions are still simulated locally on each
  machine, so two players can see different traffic. That is the deal.

Start it:

```sh
python3 serve.py --online
```

It uses your chosen port for HTTP and **port + 1** for the WebSocket relay,
prints the LAN URL, and adds `?online=1` for you. The default is HTTP 4351 and
relay 4352.

- Share the printed `http://<your-ip>:<port>/index.html?online=1` link with
  people on the same network.
- Allow Python through the firewall when macOS asks.
- Do not port-forward this to the open internet unless you enjoy surprises.
- Single-player is unchanged: `python3 serve.py`, or just open `index.html`.
- The relay is pure Python stdlib (`multiplayer_server.py`), tested by
  `tests/ws_test.py`.

## Phone

`T` opens a visibly held **CRACKPHONE** in first person. The menu is a green
mono PDA with a gold trim, and it works without the mouse:

- **↑ / ↓** select an app, **Enter** open it
- **←** back to the home grid, **Esc** close the phone
- number keys still jump straight to an app

## Death is a dopamine machine

- Kills trigger a **KO! / COMBO xN** popup, extra cash, extra Respect, and a
  loud cartoon **BONK** on top of the gore. **No slow-mo** — killing never
  takes the speed out of your feet.
- Two kills inside four seconds start a combo. The town notices. The combo
  keeps paying.
- NPC deaths get a ridiculous **Wilhelm-style scream** about half the time.

## Look and interface

- San Andreas-style pause/options menu: black panel, orange rails, Impact headers, square controls, no Roblox gradients.
- Live circular **radar** with roads, buildings, NPCs, cops, the club objective, and a clock.
- A proper **beer-drinking animation**: connected arm, hand gripping a bottle, raise–tilt–gulp–lower, burp.
- Smoking has a connected arm and hand holding cigarette/joint/blunt/vape, with embers, inhales, exhales, and smoke.
- HUD uses compact old-game typography, sharp bars, big green money, wanted stars, weapon/ammo readout.
- Press **Z** for a third-person camera behind a black-hooded SHITASS, with a two-bone arm rig, knee bend, run cycle, punch and kick animations.
- Beer, cigarettes, vape, and both arms are articulated (shoulder → elbow → wrist), not floating props.
- Deaths are wet: flying limbs, bone and meat chunks, screen splatter, layered blood pools, and a squelch.
- NPCs never phase through pavement: standing bodies, knockdowns, and corpses are floor-clamped every frame.
- Heavy hits **ragdoll people through the air**. They bounce, get up angry, and come back for more.
- Proper run cycles with arm/leg swing, knee bend, forward lean, and head shake.
- Tweakers/geekers have bulging eyes and head twitches; geekers nod out on the road with foil and a pipe.
- Hit reactions are smooth flinches/staggers, not whole-body vibration.
- Speech bubbles hang around for five seconds, and the Simlish babble is louder.
- Citizens are meaner: they insult you, threaten you, and sometimes demand money.
  Talking shit back makes SHITASS grumble actual sentences.
- SHITASS looks like a hoodlum: black hoodie, beanie, bandana, sagging jeans,
  gold chain, wristbands. With the pimp suit he goes purple and shiny.

## Quality-of-life details

- Curbs, sidewalks, paths, and the party floor are visual only — no invisible 6 cm ledges to snag on.
- Car wrecks have proper outward wheels, tyres, and hubcaps.
- Peeing is a segmented animated stream with a continuous power-washer hiss, not repeated splashes.
- Beer, cigarettes, and vapes show **∞** in the inventory.
- NPCs speak in Simlish-style babble with speech bubbles above their heads.

## Graphics

Default is **PS2 HQ (960×540 internal)** with smoother human shading. If the framerate drops, the game automatically steps down to 360p or 240p so the party keeps moving. You can force any preset in **ESC → GRAPHICS**. The whole town is still built from low-poly primitives and runtime-generated textures.

## Tech notes

- Plain HTML/CSS/JS. No modules, no bundler, no Node needed.
- `three.js` r128 and `cannon.js` 0.6.2, both MIT, in `assets/vendor/`.
- Low internal render resolution (default 480×270) scaled with nearest-neighbour
  for the PS1/PS2 look. Change it in **ESC → GRAPHICS**.
- The player uses a frictionless contact material so movement stays responsive;
  props and NPCs keep normal friction.
- The render loop is crash-proof and has a watchdog timer, so a single bad frame
  cannot freeze the game.
- NPCs talk in Simlish-style babble with text bubbles above their heads, not in a chat log.
- Deaths include screams, ragdoll bounces, blood, and occasional flying body parts.

## Content warning

Adult satire. Crude language, drinking, drugs, gambling, violence against
fictional blocky people, and zero personal growth. Not for kids. No real people
were harmed, which is more than can be said for the mall.
