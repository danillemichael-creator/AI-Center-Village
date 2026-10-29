# AI Log — AI Vice

How we used AI (Devin) on this project — evidence for the "Use of AI" judging criterion.

All art is AI-generated: `assets/map.png`, `assets/ai-center-room.png`, `assets/ui-kit.png` and `games/python-lab/room.png` are generated placeholders — drop real art in at the same paths.

## @danillemichael-creator — main-branch owner

- **Setup** — Devin created and committed the starter kit (`index.html`, `shared/`, `games/` stubs, `README.md`), pushed the `game/python-lab`, `game/robotics`, `game/dx-lab` and `game/matrix-motel` branches, added all four teammates as collaborators with push access, and created this log.
- **Step 1 — shared stack** — Devin built `shared/config.js` (Supabase credentials), `shared/wallet.js` additions (`setPlayer`/`getPlayer`, `awardLevel` with first-time-only tokens, neon "+N" popup, jingle hook; `characters`/`redeemCharacter`/`setActiveCharacter` aliases; persisted mute), `shared/leaderboard.js` (`submitScore` with localStorage offline queue + auto-flush, `getLeaderboard` over the `aivice_leaderboard` view), and `shared/include.js` (one tag loads the whole stack in any game).
- **Step 2 — map hub** — Devin rebuilt `index.html` on `assets/map.png`: invisible per-building hotspots (single `HOTSPOTS` object), zoom → walk → enter → fade sequence with a 2-frame pixel sprite from `AIVice.getActiveCharacter()`, first-visit nickname/crew modal, HUD with sprite + name + tokens + progress + mute, `prefers-reduced-motion` support.
- **Step 3 — AI Center** — Devin built the overlay on `assets/ai-center-room.png`: Captain Byte typed-text dialog with portrait and blinking arrow, six character pedestals (Redeem/Equip/Equipped), and a leaderboard with My Crew/Everyone tabs, 10-second refresh, top-3 crowns and own-row highlight.
- **Step 4 — soundtrack** — Devin wrote `shared/music.js`: fully synthesized Tone.js score — "hub" (100 BPM Am: gated-reverb snare, funky bass, pad chords, arp lead), "challenge" (120 BPM Am: driving bass, stabs, hats), and a 3-second victory `jingle()` fired by `awardLevel()`. Crossfades on building enter/back, starts on first click, persisted mute. All audio fails safe if the CDN is down.
- **Step 5 — docs** — Devin added the shared-API reference to `README.md` and this log.

## @ophelie4 — Programming Lab (`game/python-lab`)

- Used Claude to design and build Programming Lab from the README spec: a 4-room top-down dungeon (variables, if/else, for loop, functions) where each locked door opens a Python terminal running real Python in the browser via Pyodide.
- Claude checked each door with several hidden test cases so hard-coding the answer can't pass, and added a 3-second stop for infinite loops and a hint that unlocks after 2 wrong tries.
- Claude play-tested all 4 rooms automatically in a simulated browser with real Python: correct solutions open every door, starter code fails, and finishing adds 50 tokens (+10 with no hints) to the shared wallet.

## @mdeanh — Robotics (`game/robotics`)

- _(log entries go here)_

## @SmilingTimes — DX Lab (`game/dx-lab`)

- Asked Devin to build DX Lab from the README prompt. Devin built `games/dx-lab/` (index.html, dx-lab.js, dx-lab.css): procedurally drawn pixel "photos", a real 1-nearest-neighbor classifier running in the browser, a live test-accuracy meter, a day/night biased-dataset round with a balance table, and a 5-question quiz wired to the shared wallet.
- Devin simulated the classifier to tune the datasets (biased round starts at 50%, fixable to 100%), then played the game end to end in a headless browser and fixed a click-to-move bug it found.

## @miloszmenceldocs-tech — Matrix Motel (`game/matrix-motel`)

- _(log entries go here)_
- Added Round 3 "Prompt Lab" (quiz moved to Round 4): the player builds a prompt from Role/Topic/Format/Style chips and a scripted in-browser "AI" responds; goal is to reproduce a target output exactly. Teaches specificity, constraints, and roles. Level-select screen added with Data Dash (platformer) shown as coming soon.
- Added Data Dash, a side-scrolling platformer level (`dash.js`): run and jump down neon Ocean Drive, grab photos whose label matches the picture, skip mislabeled ones, stomp glitch bugs, respawn at checkpoints. At the flag the haul trains the same 1-NN model; 85% test accuracy clears DX Lab. Devin checked that grabbing everything (5 bad labels) fails at 75% and clean data reaches 100%.
- Data Dash art pass, Super Mario World-style: outlined pixel sprites (player in sunglasses + cap with idle/run/jump poses and squash, 2-frame glitch bugs), layered parallax (stars, synthwave sun, Miami skyline with lit windows, dotted hills, palms), tiled ground and brick platforms, goal posts with a moving tape, checkpoint gates, particles, screen shake, scanlines.

### DX Lab — lab room, crew characters, Neural Typer, SFX (Smilingtimes + Devin)
- Level select is now an illustrated DX Lab room (generated pixel art, `room.webp`) with clickable glowing stations: Sort Lab, Data Dash, Neural Typer, plus a DEX dialog box.
- The player's equipped crew character from `shared/crew.js` walks to the station you pick.
- New level Neural Typer (`typer.js`): type falling AI terms, learn 15 definitions.
- Synthesized WebAudio sound effects (`sfx.js`), with a mute toggle.
- DX Lab now loads `shared/include.js`.
