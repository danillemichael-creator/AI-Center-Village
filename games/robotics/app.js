import { MODULES, getModule } from './content.js';
import { partIcon } from './icons.js';
import { mountChallenge } from './game.js';
import { mountArcade } from './arcade.js';
import { loadProgress, saveProgress, awardPart, freshProgress, progressXP, recordScore } from './progress.js';

const $ = (id) => document.getElementById(id);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
const loaded = loadProgress(storage);
let progress = loaded.progress;
let storageAvailable = loaded.available;
let soundEnabled = false;
let audio;
let gameCleanup;
let toastTimer;
let dialogOpener;
const challengeDialog = $('challenge-dialog');
const infoDialog = $('info-dialog');
const startLabels = { sensors: 'START WITH THE SENSES', motors: 'MAKE YOUR NEXT MOVE', controllers: 'A LITTLE LOGIC GOES FAR', power: 'THE FINAL SPARK' };
const shortFacts = { sensors: 'Measures how far away an object is.', motors: 'Turns electrical energy into movement.', controllers: 'Runs the instructions that guide your robot.', power: 'Supplies energy to the robot’s circuit.' };
const playLabels = { sensors: 'START LOOT RUN', motors: 'START TURBO RUN', controllers: 'START CHECKPOINT RUSH', power: 'START BATTERY BLITZ' };
const labTitles = { sensors: 'Scan & steer', motors: 'Wheel work', controllers: 'Code the course', power: 'Close the loop' };
const unlocks = { sensors: 'WIDE SCAN + RADAR', motors: 'FASTER WHEELS', controllers: 'FASTER ABILITIES + BONUS SCORE', power: 'AN EXTRA HEART' };

function playSound(kind = 'click') {
  if (!soundEnabled) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') void audio.resume();
    const notes = kind === 'success' ? [523, 659, 784, 1047] : [440];
    notes.forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(.035, audio.currentTime + index * .11);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + index * .11 + .11);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(audio.currentTime + index * .11); oscillator.stop(audio.currentTime + index * .11 + .12);
    });
  } catch { /* Sound is optional; keep every challenge playable. */ }
}

function persist() {
  storageAvailable = saveProgress(progress, storage);
  $('save-status').textContent = storageAvailable ? 'PROGRESS SAVED LOCALLY' : 'PROGRESS SAVED THIS SESSION';
}
function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').classList.add('visible');
  toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
}
function selectModule(id, { sound = true } = {}) {
  if (!getModule(id)) return;
  progress = { ...progress, selected: id };
  if (sound) playSound();
  persist(); render();
}
function render() {
  const selected = getModule(progress.selected);
  const earned = progress.completed.includes(selected.id);
  const count = progress.completed.length;
  $('module-list').innerHTML = MODULES.map((item, index) => `<button class="module-button${item.id === selected.id ? ' selected' : ''}${progress.completed.includes(item.id) ? ' completed' : ''}" data-part="${item.id}" aria-pressed="${item.id === selected.id}"><span class="module-icon" aria-hidden="true">${partIcon(item.id)}</span><span><span class="module-title">${item.name.toUpperCase()}</span><span class="module-sub">${item.skill}</span></span><span class="module-status" aria-label="${progress.completed.includes(item.id) ? 'Part earned' : 'Part not yet earned'}">${progress.completed.includes(item.id) ? '✓' : `0${index + 1}`}</span></button>`).join('');
  $('hotspots').innerHTML = MODULES.map((item, index) => `<button class="hotspot${item.id === selected.id ? ' selected' : ''}${progress.completed.includes(item.id) ? ' earned' : ''}" data-module="${item.id}" data-label="${item.part.toUpperCase()}" aria-label="Explore ${item.part}" aria-pressed="${item.id === selected.id}">${progress.completed.includes(item.id) ? '✓' : index + 1}</button>`).join('');
  $('mission-counter').textContent = `0${MODULES.indexOf(selected) + 1} / 04`;
  $('mission-eyebrow').textContent = earned ? 'PART EARNED · KEEP EXPLORING' : startLabels[selected.id];
  $('mission-title').textContent = selected.tagline + '.';
  $('mission-description').textContent = selected.description;
  $('part-icon').innerHTML = partIcon(selected.id);
  $('part-name').textContent = selected.part;
  $('part-description').textContent = shortFacts[selected.id];
  $('play-label').textContent = earned ? 'REPLAY · BEAT YOUR BEST' : playLabels[selected.id];
  $('reward-label').textContent = progress.bestScores[selected.id] ? `BEST: ${progress.bestScores[selected.id].toLocaleString()}` : `+${selected.xp} XP`;
  $('mission-footnote').textContent = 'ARROWS / WASD TO DRIVE · SPACE FOR YOUR ABILITY';
  $('part-description').innerHTML = `${shortFacts[selected.id]}<span class="unlocks-note">${earned ? 'UNLOCKED' : 'UNLOCK'}: ${unlocks[selected.id]}</span>`;
  $('xp-label').textContent = `${progressXP(progress)} XP`;
  $('xp-fill').style.width = `${count * 25}%`;
  $('rank-name').textContent = count === 4 ? 'ROBOT BUILDER' : count >= 2 ? 'BOT APPRENTICE' : 'ROOKIE BUILDER';
  $('notebook-count').textContent = `${count}/4`;
  $('parts-count').textContent = `${count} / 4 PARTS`;
  $('progress-parts').setAttribute('aria-label', `${count} of 4 parts earned`);
  $('progress-parts').innerHTML = MODULES.map(item => `<span class="progress-part${progress.completed.includes(item.id) ? ' earned' : ''}" title="${item.name}${progress.completed.includes(item.id) ? ' earned' : ''}" aria-hidden="true"></span>`).join('');
  $('robot-status').textContent = count === 4 ? 'BUILD COMPLETE' : 'IN THE MAKING';
  $('mentor-message').textContent = count === 4 ? 'All systems go! How high can you push that score?' : count > 0 ? `${count} ${count === 1 ? 'upgrade' : 'upgrades'} installed. Time to take ${count === 1 ? 'it' : 'them'} for a spin!` : 'Lost parts. Mischievous scrap-bots. One little hero.';
  $('mentor-detail').textContent = 'Grab the parts. Dodge trouble. Bring it all back to the dock.';
  $('footer-message').innerHTML = count === 4 ? 'First robot built. <b>Next stop: big things.</b>' : 'Small robots. <b>Big ideas.</b>';
  document.querySelector('.scene').classList.toggle('victory-running', count === 4);
}

function closeChallenge() { challengeDialog.close(); }
challengeDialog.addEventListener('close', () => {
  gameCleanup?.(); gameCleanup = null; $('challenge-content').replaceChildren();
  dialogOpener?.focus();
});
function launchSession(id, mode = 'arcade') {
  const item = getModule(id);
  if (!item) return;
  dialogOpener = document.activeElement;
  const arcade = mode === 'arcade';
  challengeDialog.classList.toggle('arcade-dialog', arcade);
  $('challenge-title').textContent = arcade ? item.challenge : labTitles[id];
  $('challenge-kicker').textContent = `${item.name.toUpperCase()} / ${arcade ? 'ARCADE MISSION' : 'TINKER LAB'}`;
  gameCleanup?.();
  gameCleanup = (arcade ? mountArcade : mountChallenge)(id, $('challenge-content'), {
    playSound,
    unlockedParts: progress.completed,
    bestScore: progress.bestScores[id] || 0,
    onComplete: (_id, result = {}) => {
      const alreadyEarned = progress.completed.includes(id);
      progress = awardPart(progress, id);
      if (arcade) progress = recordScore(progress, id, result.score);
      const next = MODULES.find(part => !progress.completed.includes(part.id));
      if (next && !alreadyEarned) progress = { ...progress, selected: next.id };
      persist(); render(); closeChallenge();
      if (!alreadyEarned) {
        playSound('success');
        notify(`${item.part} installed! Unlocked: ${unlocks[id]}`);
        if (progress.completed.length === 4) setTimeout(showCompletion, 100);
      } else notify(arcade ? `Nice run! Best score: ${(progress.bestScores[id] || 0).toLocaleString()}` : 'Lab complete! Your component is already installed.');
    }
  });
  challengeDialog.showModal();
}
const launchChallenge = (id) => launchSession(id, 'lab');
const launchArcade = (id) => launchSession(id, 'arcade');

function openInfo(title, content) {
  if (infoDialog.open) infoDialog.close();
  dialogOpener = document.activeElement;
  $('info-title').textContent = title;
  $('info-content').innerHTML = content;
  infoDialog.showModal();
}
infoDialog.addEventListener('close', () => dialogOpener?.focus());
function showHelp() {
  openInfo('Tiny robot. Big adventure.', `<p class="info-copy">The workshop’s lost its parts, and the scrap-bots are causing chaos. BOT–01 needs a brave driver. That’s you.</p><ol class="help-steps"><li><div><b>Drive, dodge, and discover</b><p>Use WASD or the arrow keys to steer. Grab parts and bonus sparks, dodge the red scrap-bots, and chain pickups for a bigger combo. Touch controls work too.</p></div></li><li><div><b>Put your parts to work</b><p>Press Space for your mission ability: scan the dark, burst into turbo, or make a power delivery. Protect your hearts! Pause whenever you need a breather.</p></div></li><li><div><b>Bring your loot home</b><p>Finish the objective and return to the glowing dock. Each new part adds an upgrade. Build the full robot, then replay to beat your high scores!</p></div></li></ol><p class="info-note">The Tinker lab has extra self-paced puzzles if you want to explore the science. Tab moves between buttons, Enter or Space activates them, and Escape closes panels. Progress and high scores save in this browser. All gameplay uses simplified educational models.</p><button class="play-button" id="help-start"><span>LET’S GO!</span><span aria-hidden="true">→</span></button>`);
  $('help-start').addEventListener('click', () => { infoDialog.close(); $('play-button').focus(); });
}
function showNotebook() {
  openInfo('Your parts notebook.', `<p class="info-copy">Four little parts. Four big upgrades. Earn them, install them, and put them to work.</p><div class="notebook-grid">${MODULES.map(item => `<article class="notebook-card${progress.completed.includes(item.id) ? ' earned' : ''}"><span class="module-icon">${partIcon(item.id)}</span><span class="notebook-state">${progress.completed.includes(item.id) ? '✓ INSTALLED' : 'TO DISCOVER'}</span><h3>${item.part}</h3><span class="unlocks-note">${unlocks[item.id]}</span><ul>${item.notebook.map(fact => `<li>${fact}</li>`).join('')}</ul><button class="small-button" data-replay="${item.id}">${progress.completed.includes(item.id) ? 'REPLAY MISSION' : 'PLAY MISSION'}</button><button class="lab-replay-link" data-lab="${item.id}">Try the Tinker lab ↗</button></article>`).join('')}</div><div class="notebook-footer"><span>Saved on this device · ${progressXP(progress)} / 400 XP</span><button class="text-button" id="reset-button">Start a new build</button></div><div id="reset-confirm-slot"></div>`);
  $('info-content').querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => { infoDialog.close(); launchArcade(button.dataset.replay); }));
  $('info-content').querySelectorAll('[data-lab]').forEach(button => button.addEventListener('click', () => { infoDialog.close(); launchChallenge(button.dataset.lab); }));
  $('reset-button').addEventListener('click', () => {
    $('reset-confirm-slot').innerHTML = '<div class="reset-confirm"><b>Start again with a fresh robot?</b><p>This clears the four earned parts and XP saved in this browser.</p><div class="reset-actions"><button class="small-button" id="confirm-reset">START NEW BUILD</button><button class="small-button secondary" id="cancel-reset">KEEP MY ROBOT</button></div></div>';
    $('confirm-reset').focus();
    $('cancel-reset').addEventListener('click', () => { $('reset-confirm-slot').replaceChildren(); $('reset-button').focus(); });
    $('confirm-reset').addEventListener('click', () => { progress = freshProgress(); persist(); render(); infoDialog.close(); notify('Fresh workbench. Fresh ideas. Let’s build!'); });
  });
}
function showCompletion() {
  openInfo('Meet your first robot.', `<div class="completion-art">${partIcon('robot')}<h3>BOT–01 · BUILD COMPLETE</h3><p>You earned every component and 400 XP. Your robot has the parts it needs to sense its surroundings, follow a plan, and get moving.</p><div class="completion-loop"><span>SENSE</span><span>DECIDE</span><span>ACT</span><span>POWER</span></div></div><p class="info-note">Want another lap? Replay any challenge from the Parts notebook. You can always experiment, make mistakes, and try a new approach.</p><button class="play-button" id="victory-close"><span>BACK TO MY WORKSHOP</span><span aria-hidden="true">→</span></button>`);
  $('victory-close').addEventListener('click', () => infoDialog.close());
}

$('module-list').addEventListener('click', event => {
  const button = event.target.closest('[data-part]');
  if (!button) return;
  selectModule(button.dataset.part);
  $('module-list').querySelector(`[data-part="${button.dataset.part}"]`)?.focus();
});
$('hotspots').addEventListener('click', event => {
  const button = event.target.closest('[data-module]');
  if (!button) return;
  selectModule(button.dataset.module);
  $('hotspots').querySelector(`[data-module="${button.dataset.module}"]`)?.focus();
});
$('play-button').addEventListener('click', () => { playSound(); launchArcade(progress.selected); });
$('scene-play').addEventListener('click', () => { playSound(); launchArcade(progress.selected); });
$('tinker-button').addEventListener('click', () => launchChallenge(progress.selected));
$('challenge-close').addEventListener('click', closeChallenge);
$('info-close').addEventListener('click', () => infoDialog.close());
$('notebook-button').addEventListener('click', showNotebook);
$('workshop-tab').addEventListener('click', () => { infoDialog.close(); challengeDialog.close(); $('mission-title').focus(); });
['help-button', 'mentor-help', 'footer-help'].forEach(id => $(id).addEventListener('click', showHelp));
$('sound-button').addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  $('sound-button').setAttribute('aria-pressed', String(soundEnabled));
  $('sound-button').setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  $('sound-button').title = soundEnabled ? 'Turn sound off' : 'Turn sound on';
  document.querySelector('.sound-text').textContent = soundEnabled ? 'ON' : 'OFF';
  playSound();
});
render();
$('save-status').textContent = storageAvailable ? 'PROGRESS SAVED LOCALLY' : 'PROGRESS SAVED THIS SESSION';
// A new player lands on the first arcade mission's start screen.
if (!progress.completed.length) launchArcade(progress.selected);
