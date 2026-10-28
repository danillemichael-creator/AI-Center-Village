# AI Vice

A Miami Vice–style retro game for NSPIRE Hackathon 6: Retro Remix. Players walk Ocean Drive, learn a skill in each of four buildings, earn **AI tokens**, and redeem them at **the AI Center** for new characters.

Plain HTML/CSS/JS. No build step. To run it locally:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Who builds what

| Game | Skill | Folder | Branch | Owner |
|---|---|---|---|---|
| AI Center (hub + character shop) | — | `index.html`, `shared/` | `main` | main-branch owner |
| Programming Lab | Python coding | `games/python-lab/` | `game/python-lab` | @ophelie4 |
| Robotics | Robotics | `games/robotics/` | `game/robotics` | @mdeanh |
| DX Lab | AI Fundamentals | `games/dx-lab/` | `game/dx-lab` | @SmilingTimes |
| Matrix Motel | Red Teaming | `games/matrix-motel/` | `game/matrix-motel` | @miloszmenceldocs-tech |

## The rules (so nothing breaks at merge time)

1. **Only edit your own folder** (`games/<your-game>/`). Each game is its own `index.html` plus whatever JS/CSS/images it needs inside that folder.
2. **Don't edit `shared/` or `index.html`.** Need a change there? Ask the main-branch owner.
3. **Use the shared look:** link `../../shared/theme.css` and use its colors (`--pink`, `--aqua`, `--sunset`, `--sun`, `--plum`, `--night`) and fonts (`.neon` for neon titles, `.pixel` for labels, VT323 for body text). Your game's accent color is `--<your-game>`.
4. **Use the shared wallet:** link `../../shared/wallet.js`, then when the player finishes:
   ```js
   if (AIVice.markComplete('python-lab')) AIVice.addTokens('python-lab', 50);
   ```
   Give a few extra tokens for good play if you like (`AIVice.addTokens(id, 10)`). Always offer a **Back to AI Center** button: `AIVice.backToHub()`.
5. **Must run from static files** — no server code, no API keys in the repo. Libraries only from a CDN (cdnjs, jsdelivr, unpkg).
6. Commit small and often. Push to your branch only.

## Timeline (event ends 9:00 p.m.)

- **8:15** — your game is playable start to finish (even if rough). Push.
- **8:30** — open a pull request from your branch into `main`.
- **8:40** — main-branch owner merges everything. Feature freeze.
- **8:45** — full run-through for the demo.

## Git setup

**Main-branch owner** (once, after creating an empty repo on GitHub today):

```bash
git clone https://github.com/<OWNER>/ai-vice.git && cd ai-vice
# copy this starter kit into the folder, then:
git add . && git commit -m "Starter kit: hub shell, shared theme and wallet, game folders"
git push -u origin main
for b in game/python-lab game/robotics game/dx-lab game/matrix-motel; do git push origin main:$b; done
```

Then add each teammate as a collaborator (repo **Settings → Collaborators**, or with the GitHub CLI):

```bash
for u in ophelie4 mdeanh SmilingTimes miloszmenceldocs-tech; do
  gh api -X PUT repos/<OWNER>/ai-vice/collaborators/$u -f permission=push
done
```

Protect `main` so changes only land through pull requests: in the repo's Settings, add a branch protection rule for `main` that requires a pull request before merging.

**Everyone else:**

```bash
git clone https://github.com/<OWNER>/ai-vice.git && cd ai-vice
git checkout game/<your-game>
# ...build...
git add games/<your-game> && git commit -m "Describe the change" && git push
```

At 8:30: `gh pr create --base main --head game/<your-game> --fill` (or open the PR on GitHub).

## Devin CLI prompts

Start every Devin session from the repo root with:

> Read README.md first and follow "The rules" exactly. Only create or edit files inside `games/<your-game>/`. Keep `games/<your-game>/index.html` as the entry point.

Then paste your game's prompt.

### Programming Lab — @ophelie4

> In `games/python-lab/` only, build **Programming Lab**: a top-down, Zelda-like pixel dungeon in an HTML5 canvas (arrow keys / WASD to move). Rooms are joined by locked doors. Walking up to a door opens a code terminal with a short Python task — either "write code that prints X" or "fix this broken snippet". Run the player's code in the browser with Pyodide (load it from cdn.jsdelivr.net) and compare stdout with the expected output; the right output opens the door with a neon flash. Make 4 rooms that get harder: print and variables, if/else, a for loop, a function. After 2 wrong tries show a hint. Show a loading message while Pyodide loads. On beating the last room, call `if (AIVice.markComplete('python-lab')) AIVice.addTokens('python-lab', 50)` and show a win screen with a "Back to AI Center" button that calls `AIVice.backToHub()`. Use `../../shared/theme.css` (Miami Vice night palette, neon pink and aqua, pixel fonts) and `../../shared/wallet.js`.

### Robotics — @mdeanh

> In `games/robotics/` only, build a **Robotics** game: the player programs a small robot on a grid (a neon Miami warehouse) by stacking command blocks — FORWARD, TURN LEFT, TURN RIGHT, PICK UP, DROP, REPEAT n, and IF WALL AHEAD — then presses RUN and watches the robot execute them step by step. Each level teaches one robotics idea: sequencing, loops, sensors/conditionals, then a final delivery mission. 4 levels. If the robot crashes, show which block caused it. On finishing, call `if (AIVice.markComplete('robotics')) AIVice.addTokens('robotics', 50)` and show a "Back to AI Center" button that calls `AIVice.backToHub()`. Use `../../shared/theme.css` (accent `--robotics`, sunset orange) and `../../shared/wallet.js`.

*(If you already have your own robotics concept, swap in its description and keep the last two sentences.)*

### DX Lab — @SmilingTimes

> In `games/dx-lab/` only, build **DX Lab**, an AI Fundamentals game set in a neon research lab. Round 1: the player drags labeled examples into a training set for a tiny classifier (e.g. "palm tree" vs "not palm tree" pixel images) and watches a live accuracy meter change. Round 2: show what happens with too little or biased training data, and let the player fix it. Round 3: a quick 5-question quiz on the core terms — model, training data, prediction, accuracy, bias, overfitting — each with a one-line explanation after answering. On finishing, call `if (AIVice.markComplete('dx-lab')) AIVice.addTokens('dx-lab', 50)` and show a "Back to AI Center" button that calls `AIVice.backToHub()`. Use `../../shared/theme.css` (accent `--dx-lab`, neon yellow) and `../../shared/wallet.js`. All logic runs in the browser; no external AI API.

### Matrix Motel — @miloszmenceldocs-tech

> In `games/matrix-motel/` only, build **Matrix Motel**, a Red Teaming game at a neon motel where each room holds a scripted (fake, no real API) AI assistant with a weakness. In each room the player reads the assistant's rules and picks or types the test that exposes the weakness — e.g. prompt injection hidden in a "guest review", a request that tricks it into leaking a secret room code, a role-play that bypasses a rule. When the player finds it, show what went wrong and the defense that would stop it (input filtering, not putting secrets in the prompt, refusing role-play overrides, human review). 4 rooms, then a short recap of "attack → defense" pairs. Keep it about testing AI systems responsibly. On finishing, call `if (AIVice.markComplete('matrix-motel')) AIVice.addTokens('matrix-motel', 50)` and show a "Back to AI Center" button that calls `AIVice.backToHub()`. Use `../../shared/theme.css` (accent `--matrix-motel`, hot pink) and `../../shared/wallet.js`.

### AI Center hub — main-branch owner

> Upgrade `index.html` into the AI Vice hub. Keep using `shared/theme.css` and `shared/wallet.js` (don't change the wallet API). Add a walkable top-down Ocean Drive map at night: beach and ocean, palm trees, a striped synthwave sunset, and five buildings — Programming Lab, Robotics, DX Lab, Matrix Motel and the AI Center in the middle. The player sprite uses the equipped character's colors from `AIVice.getActiveCharacter()`. Walking into a building's door opens `games/<id>/index.html` (or the AI Center shop overlay). Completed buildings glow. Keep the existing character shop working inside the AI Center overlay. Show tokens and games completed in a HUD.

## How AI is used (for the pitch)

Keep a running list in `AI_LOG.md`: what you asked Devin, what it built, what you had to fix. It makes judging criterion "Use of AI" easy to show.
