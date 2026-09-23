// ═══ РЕСУРСЫ НА КАРТЕ ═══
// time — секунды сбора, yield [мин, макс], charges — сколько раз можно собрать до истощения,
// respawn — через сколько секунд узел восстановится.

export const RESOURCES = {
  oak:   { name: 'Дуб',          item: 'wood',  time: 2.6, yield: [2, 4], charges: 3, xp: 14, respawn: 45, color: 0x8a6a3f, ring: 1.6 },
  birch: { name: 'Берёза',       item: 'wood',  time: 2.2, yield: [1, 3], charges: 2, xp: 10, respawn: 40, color: 0x9a7a4f, ring: 1.4 },
  rock:  { name: 'Валун',        item: 'stone', time: 3.2, yield: [2, 3], charges: 3, xp: 18, respawn: 60, color: 0x9aa0a6, ring: 1.5 },
  berry: { name: 'Ягодный куст', item: 'berry', time: 1.4, yield: [2, 5], charges: 2, xp: 6,  respawn: 30, color: 0xd34a5f, ring: 1.1 },
  fiber: { name: 'Дикий лён',    item: 'fiber', time: 1.0, yield: [1, 2], charges: 1, xp: 4,  respawn: 25, color: 0xcab96a, ring: 0.9 },
  flower:{ name: 'Полевые цветы',item: 'flower',time: 0.8, yield: [1, 1], charges: 1, xp: 2,  respawn: 50, color: 0xf2c14e, ring: 0.7 },
};

// ═══ ПРЕДМЕТЫ В ИНВЕНТАРЕ ═══
// weight — вес одной штуки. Сумма веса ограничена ёмкостью сумки (см. character.js).
export const ITEMS = {
  wood:   { name: 'Древесина',      icon: '🪵', weight: 2,   desc: 'Основа любого ремесла: инструменты, постройки, луки.' },
  stone:  { name: 'Камень',         icon: '🪨', weight: 3,   desc: 'Тяжёлый, но прочный. Нужен для печей и стен.' },
  berry:  { name: 'Лесные ягоды',   icon: '🫐', weight: 0.2, desc: 'Сочные и сладкие. Съешьте — вернут бодрость.', use: { stamina: 25 } },
  fiber:  { name: 'Волокно',        icon: '🌾', weight: 0.3, desc: 'Из него вьют верёвки и ткут полотно.' },
  flower: { name: 'Цветы',          icon: '🌼', weight: 0.1, desc: 'Ингредиент зелий и украшений.' },
};
