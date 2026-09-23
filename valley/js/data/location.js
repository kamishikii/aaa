// ═══ ЕДИНЫЙ КОНФИГ ЛОКАЦИИ ═══
// Меняйте числа здесь — мир перестроится сам.

export const LOCATION = {
  name: 'Долина Тихого Ветра',

  radius: 130,                    // играбельный радиус карты

  fog:  { color: 0xd6e6d0, near: 60, far: 240 },
  sky:  { top: 0x8ec9ea, bottom: 0xeef3d8 },
  sun:  { color: 0xfff2d0, intensity: 2.4, pos: [80, 130, 40] },
  hemi: { sky: 0xbfe3ff, ground: 0x3e5a34, intensity: 0.85 },

  terrain: { amplitude: 4.2, detail: 0.035 },

  lake:  { x: -45, z: 40, r: 26 },   // озеро
  water: { level: -1.8, color: 0x3e7fae },

  // что и сколько разбросать по карте (ключи из resources.js)
  spawns: [
    { res: 'oak',   count: 30 },
    { res: 'birch', count: 16 },
    { res: 'rock',  count: 20 },
    { res: 'berry', count: 24 },
    { res: 'fiber', count: 26 },
    { res: 'flower',count: 30 },
  ],

  grass: 2200,        // травинок
  pollen: 160,        // пыльцы в воздухе
  spawnPoint: [0, 10] // точка появления игрока
};
