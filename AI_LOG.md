# AI Log — AI Vice

How we used AI (Devin) on this project — evidence for the "Use of AI" judging criterion.

## @danillemichael-creator — main-branch owner

- Devin set up the repo: created and committed the starter kit (`index.html`, `shared/`, `games/`, `README.md`) to `main`; created and pushed the `game/python-lab`, `game/robotics`, `game/dx-lab` and `game/matrix-motel` branches; added all four teammates as collaborators with push access; created this log.

## @ophelie4 — Programming Lab (`game/python-lab`)

- _(log entries go here)_

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
