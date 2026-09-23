import { LOCATION } from './data/location.js';
import { ITEMS } from './data/resources.js';
import { CHARACTER } from './data/character.js';
import { initEngine, ENGINE, updateAmbient } from './core/engine.js';
import { buildWorld, updateWorld } from './core/world.js';
import { setupInput, INPUT } from './core/input.js';
import { unlock, sfx } from './core/sfx.js';
import { buildPlayer, updatePlayer, PLAYER, addXp } from './game/player.js';
import { initGathering, updateGathering } from './game/gathering.js';
import { initInventory, invRemove, weight, capacity } from './game/inventory.js';

const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

initEngine($('scene'));
buildWorld();
buildPlayer();

// ── камера от 3-го лица ──
const cam = { yaw: 0.8, pitch: 0.42, dist: 7.2 };
INPUT.lookCb = (dx, dy) => {
  cam.yaw -= dx * 0.005;
  cam.pitch = clamp(cam.pitch + dy * 0.004, 0.12, 0.85);
};

setupInput({
  joyZone: $('joy-zone'), joyBase: $('joy-base'), joyKnob: $('joy-knob'),
  canvas: $('scene'), btnRun: $('btn-run')
});

// кнопка сбора
const gBtn = $('btn-gather');
const holdOn = e => { e.preventDefault(); INPUT.gatherHeld = true; };
const holdOff = () => INPUT.gatherHeld = false;
gBtn.addEventListener('pointerdown', holdOn);
gBtn.addEventListener('pointerup', holdOff);
gBtn.addEventListener('pointerleave', holdOff);
gBtn.addEventListener('pointercancel', holdOff);
addEventListener('keydown', e => { if (e.code === 'KeyI') toggleInv(); });

initGathering({ btn: gBtn, icon: $('gather-icon'), hint: $('hint') });

// ── инвентарь ──
const modal = $('inv-modal');
function toggleInv(force) {
  const show = force ?? modal.classList.contains('hidden');
  modal.classList.toggle('hidden', !show);
  if (!show) INPUT.gatherHeld = false;
}
$('btn-inv').addEventListener('click', () => toggleInv());
$('inv-close').addEventListener('click', () => toggleInv(false));
modal.addEventListener('click', e => { if (e.target === modal) toggleInv(false); });

initInventory({
  grid: $('inv-grid'), info: $('inv-info'),
  wFill: $('inv-w-fill'), wCur: $('w-cur')
});

// ── всплывающие подписи (проекция 3D → экран) ──
function floatAt(worldPos, text, cls = '') {
  const v = worldPos.clone(); v.y += 1.6;
  v.project(ENGINE.camera);
  const el = document.createElement('div');
  el.className = 'fl ' + cls;
  el.textContent = text;
  el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
  el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
  $('floaters').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function floatCenter(text, cls = 'big') {
  const el = document.createElement('div');
  el.className = 'fl ' + cls;
  el.textContent = text;
  el.style.left = '50%'; el.style.top = '34%';
  $('floaters').appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

PLAYER.onLevel = lvl => { sfx('level'); floatCenter(`⭐ Уровень ${lvl}!`); };

// ── HUD ──
$('loc-name').textContent = LOCATION.name.toUpperCase();
$('w-max').textContent = capacity();
$('p-name').textContent = CHARACTER.name;
$('avatar').textContent = CHARACTER.avatar;
const hud = { xp: -1, st: -1, lvl: -1, w: -1 };
function refreshHUD() {
  const xp = PLAYER.xp / CHARACTER.xpNeed(PLAYER.lvl) * 100;
  const st = PLAYER.stamina / CHARACTER.stamina * 100;
  const w = weight();
  if (Math.abs(xp - hud.xp) > 0.5) $('xp-fill').style.width = xp + '%';
  if (Math.abs(st - hud.st) > 0.5) $('st-fill').style.width = st + '%';
  if (PLAYER.lvl !== hud.lvl) $('p-level').textContent = PLAYER.lvl;
  if (w !== hud.w) { $('w-cur').textContent = +w.toFixed(1); }
  hud.xp = xp; hud.st = st; hud.lvl = PLAYER.lvl; hud.w = w;
}

// ягоды из инвентаря
import('./game/inventory.js').then(({ INV }) => {
  INV.onUse = id => {
    const it = ITEMS[id];
    if (it.use?.stamina) {
      PLAYER.stamina = Math.min(CHARACTER.stamina, PLAYER.stamina + it.use.stamina);
      invRemove(id, 1); sfx('eat'); floatCenter('+' + it.use.stamina + ' ⚡ бодрость');
    }
  };
});

// ── старт ──
$('btn-play').addEventListener('click', () => {
  unlock();
  $('start').classList.add('hidden');
  $('hud').classList.remove('hidden');
  setTimeout(() => floatCenter('Ищите золотые круги — там ресурсы'), 800);
});

// ── главный цикл ──
function loop() {
  const dt = Math.min(ENGINE.clock.getDelta(), 0.05);
  const t = ENGINE.clock.elapsedTime;

  updatePlayer(dt, INPUT, cam.yaw);

  // камера-погоня
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const desired = new THREE.Vector3(
    PLAYER.pos.x - fx * cam.dist * cp,
    PLAYER.pos.y + 1.2 + cam.dist * sp,
    PLAYER.pos.z - fz * cam.dist * cp
  );
  ENGINE.camera.position.lerp(desired, 1 - Math.pow(0.0001, dt));
  ENGINE.camera.lookAt(PLAYER.pos.x, PLAYER.pos.y + 1.5, PLAYER.pos.z);

  updateWorld(dt, t);
  updateGathering(dt, t, floatAt);
  updateAmbient(t);
  refreshHUD();

  ENGINE.renderer.render(ENGINE.scene, ENGINE.camera);
  requestAnimationFrame(loop);
}
loop();
