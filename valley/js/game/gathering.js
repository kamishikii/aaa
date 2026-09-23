import { RESOURCES } from '../data/resources.js';
import { CHARACTER } from '../data/character.js';
import { WORLD, setActive, deplete, burst } from '../core/world.js';
import { PLAYER, addXp } from './player.js';
import { invAdd } from './inventory.js';
import { INPUT } from '../core/input.js';
import { sfx } from '../core/sfx.js';
import { ENGINE } from '../core/engine.js';

const RANGE = 3.4;
export const GATHER = { progress: 0, target: null };
let ui = null, tickAcc = 0;

export function initGathering(o) { ui = o; }

function findNearest() {
  let best = null, bd = RANGE;
  for (const n of WORLD.nodes) {
    if (!n.alive || n.amount <= 0 || n.cur < 0.6) continue;
    const d = Math.hypot(PLAYER.pos.x - n.pos.x, PLAYER.pos.z - n.pos.z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}

export function updateGathering(dt, t, floatAt) {
  const near = findNearest();
  setActive(near);
  GATHER.target = near;

  if (ui) {
    ui.btn.classList.toggle('ready', !!near);
    if (near) {
      ui.icon.textContent = near.def.item ? ICONS[RESOURCES[near.key].item] : '✨';
      ui.hint.textContent = `Рядом: ${near.def.name} — удерживайте кнопку`;
      ui.hint.classList.add('show');
    } else {
      ui.hint.classList.remove('show');
      ui.btn.style.background = '';
    }
  }

  const canHold = INPUT.gatherHeld && near && !PLAYER.moving && PLAYER.stamina > 1;
  if (canHold) {
    const def = near.def;
    const mul = 1 + (PLAYER.lvl - 1) * CHARACTER.gatherSpeedPerLvl;
    GATHER.progress += dt / (def.time / mul);
    PLAYER.stamina -= CHARACTER.gatherDrain * dt;

    tickAcc += dt;
    if (tickAcc > 0.22) {
      tickAcc = 0; sfx('tick');
      burst(near.pos.clone().add(new THREE.Vector3(0, 1.1, 0)), def.color, 3);
    }
    if (GATHER.progress >= 1) { GATHER.progress = 0; finish(near, t, floatAt); }
  } else GATHER.progress = Math.max(0, GATHER.progress - dt * 3);

  if (ui && near) {
    const deg = GATHER.progress * 360;
    ui.btn.style.background = `conic-gradient(#f0c060 ${deg}deg, rgba(255,255,255,.10) ${deg}deg)`;
  }
}

const ICONS = { wood: '🪵', stone: '🪨', berry: '🫐', fiber: '🌾', flower: '🌼' };

function finish(node, t, floatAt) {
  const def = node.def;
  const [mn, mx] = def.yield;
  const want = mn + Math.floor(Math.random() * (mx - mn + 1));
  const got = invAdd(def.item, want);

  if (got > 0) {
    addXp(def.xp);
    sfx('collect');
    floatAt(node.pos, `+${got} ${ICONS[def.item]}`);
  }
  if (got < want) { sfx('denied'); floatAt(node.pos, 'Сумка полна!', 'bad'); }

  node.amount--;
  if (node.amount <= 0) { deplete(node, t); sfx('deplete'); }
}
