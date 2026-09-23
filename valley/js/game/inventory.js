import { ITEMS } from '../data/resources.js';
import { CHARACTER } from '../data/character.js';

export const INV = { items: {}, sel: null, onUse: null };
let ui = null;

export function initInventory(o) { ui = o; render(); }

export const weight = () => Object.entries(INV.items).reduce((s, [k, n]) => s + ITEMS[k].weight * n, 0);
export const capacity = () => CHARACTER.capacity;

export function invAdd(id, n) {
  const space = (capacity() - weight()) / ITEMS[id].weight;
  const take = Math.min(n, Math.floor(space + 1e-6));
  if (take > 0) { INV.items[id] = (INV.items[id] || 0) + take; render(); }
  return take;
}
export function invRemove(id, n = 1) {
  if (!INV.items[id]) return;
  INV.items[id] -= n;
  if (INV.items[id] <= 0) { delete INV.items[id]; if (INV.sel === id) INV.sel = null; }
  render();
}

export function render() {
  if (!ui) return;
  const keys = Object.keys(INV.items);
  let html = '';
  for (const k of keys)
    html += `<div class="slot ${INV.sel === k ? 'sel' : ''}" data-id="${k}">
      ${ITEMS[k].icon}<span class="n">${INV.items[k]}</span></div>`;
  for (let i = keys.length; i < 12; i++) html += '<div class="slot"></div>';
  ui.grid.innerHTML = html;
  ui.grid.querySelectorAll('.slot[data-id]').forEach(el =>
    el.addEventListener('click', () => { INV.sel = el.dataset.id; render(); }));

  const w = weight();
  ui.wFill.style.width = Math.min(100, w / capacity() * 100) + '%';
  ui.wCur.textContent = +w.toFixed(1);

  if (INV.sel && INV.items[INV.sel]) {
    const it = ITEMS[INV.sel];
    ui.info.innerHTML = `<h3>${it.icon} ${it.name} × ${INV.items[INV.sel]}</h3>
      <p class="dim">${it.desc}</p><p class="dim">Вес штуки: ${it.weight}</p>
      ${it.use ? '<button class="use-btn" id="use-btn">Съесть (+25 ⚡)</button>' : ''}`;
    ui.info.querySelector('#use-btn')?.addEventListener('click', () => INV.onUse?.(INV.sel));
  } else ui.info.innerHTML = '<p class="dim">Выберите предмет, чтобы рассмотреть его.</p>';
}
