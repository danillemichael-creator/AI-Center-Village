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

- _(log entries go here)_

## @miloszmenceldocs-tech — Matrix Motel (`game/matrix-motel`)

- _(log entries go here)_
