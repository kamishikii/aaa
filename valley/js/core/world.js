import { LOCATION } from '../data/location.js';
import { RESOURCES } from '../data/resources.js';
import { terrainHeight, ENGINE } from './engine.js';

export const WORLD = { nodes: [], active: null };
const tmpC = new THREE.Color();

const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true, ...o });

// ── фабрики моделей ──
function makeOak() {
  const g = new THREE.Group(), h = 3 + Math.random() * 1.6, r = 0.2 + Math.random() * 0.08;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r, h, 7), std(0x6b4a2f));
  trunk.position.y = h / 2; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.y = h * 0.95;
  const cols = [0x2f6b33, 0x3a7a38, 0x4c8a3f];
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + Math.random() * 0.8, 0), std(cols[i % 3]));
    m.position.set((Math.random() - 0.5) * 1.4, i * 0.9 + Math.random() * 0.5, (Math.random() - 0.5) * 1.4);
    m.castShadow = true; crown.add(m);
  }
  g.add(crown); g.userData.crown = crown;
  return { g, radius: 0.95, solid: true };
}
function makeBirch() {
  const g = new THREE.Group(), h = 3.4 + Math.random() * 1.4;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 6), std(0xdfd9c8));
  trunk.position.y = h / 2; trunk.rotation.z = (Math.random() - 0.5) * 0.1; trunk.castShadow = true; g.add(trunk);
  const crown = new THREE.Group(); crown.position.y = h * 0.9;
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + Math.random() * 0.5, 0), std(0x86b04e));
    m.scale.y = 1.25; m.position.set((Math.random() - 0.5), i * 0.8, (Math.random() - 0.5));
    m.castShadow = true; crown.add(m);
  }
  g.add(crown); g.userData.crown = crown;
  return { g, radius: 0.8, solid: true };
}
function makeRock() {
  const rad = 0.7 + Math.random() * 0.85;
  const geo = new THREE.DodecahedronGeometry(rad, 0), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setXYZ(i, p.getX(i) * (0.8 + Math.random() * 0.4), p.getY(i) * (0.65 + Math.random() * 0.3), p.getZ(i) * (0.8 + Math.random() * 0.4));
  const m = new THREE.Mesh(geo, std(Math.random() > 0.5 ? 0x878c90 : 0x79807c));
  m.position.y = rad * 0.4; m.castShadow = true; m.receiveShadow = true;
  const g = new THREE.Group(); g.add(m); g.rotation.y = Math.random() * 7;
  return { g, radius: rad * 0.9, solid: true };
}
function makeBush() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 0), std(0x2e5a2c));
  base.scale.y = 0.75; base.position.y = 0.35; base.castShadow = true; g.add(base);
  const berryCol = Math.random() > 0.5 ? 0xd34a5f : 0x5a6fd8;
  const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 0),
    std(berryCol, { roughness: 0.5, emissive: berryCol, emissiveIntensity: 0.12 }));
  clump.scale.set(1.3, 0.8, 1.3); clump.position.y = 0.72; g.add(clump);
  g.userData.berryCol = berryCol;
  return { g, radius: 0.6, solid: false };
}
function makeFiber() {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 6), std(0xb9a85f));
  m.position.y = 0.42; g.add(m);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 5), std(0xd8c878));
  top.position.y = 0.95; g.add(top);
  return { g, radius: 0.4, solid: false };
}
function makeFlower() {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 4), std(0x4e7a3a));
  stem.position.y = 0.15; g.add(stem);
  const cols = [0xf2c14e, 0xe8e8e0, 0xd76c8a, 0xb08ae0];
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.11, 8),
    new THREE.MeshStandardMaterial({ color: cols[(Math.random() * 4) | 0], side: THREE.DoubleSide, roughness: 0.7 }));
  head.position.y = 0.32; head.rotation.x = -0.6; g.add(head);
  return { g, radius: 0.3, solid: false };
}
const FACTORIES = { oak: makeOak, birch: makeBirch, rock: makeRock, berry: makeBush, fiber: makeFiber, flower: makeFlower };

// ── поиск свободных мест ──
function scatter(count, minDist, placed) {
  const L = LOCATION, pts = [];
  let tries = count * 30;
  while (pts.length < count && tries--) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * L.radius * 0.92;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - L.lake.x, z - L.lake.z) < L.lake.r + 3) continue;
    if (terrainHeight(x, z) < L.water.level + 0.3) continue;
    if (Math.hypot(x - L.spawnPoint[0], z - L.spawnPoint[1]) < 4) continue;
    if ([...placed, ...pts].some(p => Math.hypot(p.x - x, p.z - z) < minDist)) continue;
    pts.push({ x, z });
  }
  return pts;
}

export function buildWorld() {
  const scene = ENGINE.scene, placed = [];

  for (const s of LOCATION.spawns) {
    const def = RESOURCES[s.res];
    const minD = { oak: 6, birch: 5, rock: 5, berry: 3.5, fiber: 2.5, flower: 2 }[s.res];
    for (const p of scatter(s.count, minD, placed)) {
      placed.push(p);
      const made = FACTORIES[s.res]();
      const y = terrainHeight(p.x, p.z);
      made.g.position.set(p.x, y, p.z);
      made.g.rotation.y = Math.random() * Math.PI * 2;
      const mats = [];
      made.g.traverse(o => { if (o.isMesh) mats.push(o.material); });
      scene.add(made.g);
      WORLD.nodes.push({
        key: s.res, def, g: made.g, mats, crown: made.g.userData.crown || null,
        radius: made.radius, solid: made.solid,
        alive: true, amount: def.charges, cur: 1, target: 1, respawnAt: 0,
        phase: Math.random() * 7,
        pos: new THREE.Vector3(p.x, y, p.z)
      });
    }
  }

  // золотое кольцо-подсветка активного узла
  WORLD.ring = new THREE.Mesh(
    new THREE.RingGeometry(0.72, 1, 32),
    new THREE.MeshBasicMaterial({ color: 0xf5c76a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  WORLD.ring.rotation.x = -Math.PI / 2;
  WORLD.ring.visible = false;
  scene.add(WORLD.ring);

  buildDecor(scene);
  buildGrass(scene);
}

// ── декор: камешки, брёвна, грибы (по одному инстанс-мешу) ──
function buildDecor(scene) {
  const L = LOCATION, n = 30;
  const pebble = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.16, 0), std(0x8b8f88), n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 7, r = Math.sqrt(Math.random()) * L.radius * 0.9;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    m4.makeScale(0.6 + Math.random(), 0.5 + Math.random() * 0.5, 0.6 + Math.random());
    m4.setPosition(x, terrainHeight(x, z) + 0.05, z);
    pebble.setMatrixAt(i, m4);
  }
  scene.add(pebble);

  for (let i = 0; i < 7; i++) {
    const a = Math.random() * 7, r = Math.sqrt(Math.random()) * L.radius * 0.8;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - L.lake.x, z - L.lake.z) < L.lake.r + 3) continue;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.6 + Math.random(), 7), std(0x5f4430));
    log.rotation.z = Math.PI / 2; log.rotation.y = Math.random() * 7;
    log.position.set(x, terrainHeight(x, z) + 0.18, z);
    log.castShadow = true;
    scene.add(log);
  }

  const nm = 14;
  const caps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.09, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), std(0xffffff), nm);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.1, 5), std(0xe8dcc8), nm);
  for (let i = 0; i < nm; i++) {
    const a = Math.random() * 7, r = Math.sqrt(Math.random()) * L.radius * 0.85;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = terrainHeight(x, z);
    m4.identity(); m4.setPosition(x, y + 0.09, z); caps.setMatrixAt(i, m4);
    m4.identity(); m4.setPosition(x, y + 0.04, z); stems.setMatrixAt(i, m4);
    caps.setColorAt(i, tmpC.setHex(Math.random() > 0.5 ? 0xc8402e : 0x9a6a3a));
  }
  caps.instanceColor.needsUpdate = true;
  scene.add(caps, stems);
}

function buildGrass(scene) {
  const L = LOCATION, n = L.grass;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.05, 0, 0, 0.05, 0, 0, 0, 0.55, 0.05]), 3));
  geo.computeVertexNormals();
  const grass = new THREE.InstancedMesh(geo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 1 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  let i = 0, guard = n * 8;
  while (i < n && guard--) {
    const a = Math.random() * 7, r = Math.sqrt(Math.random()) * L.radius * 0.95;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (Math.hypot(x - L.lake.x, z - L.lake.z) < L.lake.r + 2) continue;
    const y = terrainHeight(x, z);
    if (y < L.water.level + 0.35) continue;
    e.set((Math.random() - 0.5) * 0.3, Math.random() * 7, (Math.random() - 0.5) * 0.3);
    q.setFromEuler(e); s.setScalar(0.7 + Math.random() * 0.9); p.set(x, y, z);
    m4.compose(p, q, s);
    grass.setMatrixAt(i, m4);
    grass.setColorAt(i, tmpC.setHSL(0.26 + Math.random() * 0.05, 0.5, 0.3 + Math.random() * 0.18));
    i++;
  }
  grass.count = i;
  grass.instanceColor.needsUpdate = true;
  scene.add(grass);
}

// ── частицы при сборе ──
const bursts = [];
export function burst(pos, colorHex, n = 7) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06),
      new THREE.MeshBasicMaterial({ color: colorHex }));
    m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5));
    ENGINE.scene.add(m);
    bursts.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 2, 1.5 + Math.random() * 2, (Math.random() - 0.5) * 2), life: 0.7 });
  }
}
function updateBursts(dt) {
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i];
    b.life -= dt; b.v.y -= 6 * dt;
    b.m.position.addScaledVector(b.v, dt);
    b.m.scale.setScalar(Math.max(0.01, b.life / 0.7));
    if (b.life <= 0) { ENGINE.scene.remove(b.m); b.m.material.dispose(); bursts.splice(i, 1); }
  }
}

export function setActive(node) {
  if (WORLD.active === node) return;
  WORLD.active?.mats.forEach(m => m.emissive.setHex(0));
  WORLD.active = node;
  node?.mats.forEach(m => m.emissive.setHex(0x6b4d17));
}

export function deplete(node, t) {
  node.alive = false; node.target = 0.001;
  node.respawnAt = t + node.def.respawn;
  burst(node.pos.clone().add(new THREE.Vector3(0, 1, 0)), node.def.color, 12);
}

export function updateWorld(dt, t) {
  for (const n of WORLD.nodes) {
    if (!n.alive && t >= n.respawnAt) { n.alive = true; n.amount = n.def.charges; n.target = 1; }
    n.cur += (n.target - n.cur) * Math.min(1, dt * 3.5);
    n.g.scale.setScalar(Math.max(n.cur, 0.001));
    n.g.visible = n.cur > 0.02;
    if (n.crown) { // лёгкое покачивание крон
      n.crown.rotation.z = Math.sin(t * 0.8 + n.phase) * 0.025;
      n.crown.rotation.x = Math.cos(t * 0.6 + n.phase) * 0.02;
    }
  }
  // пульс кольца подсветки
  const a = WORLD.active;
  if (a && a.alive && a.cur > 0.5) {
    WORLD.ring.visible = true;
    WORLD.ring.position.set(a.pos.x, a.pos.y + 0.06, a.pos.z);
    const s = a.def.ring * (1 + Math.sin(t * 4) * 0.08);
    WORLD.ring.scale.setScalar(s);
    WORLD.ring.material.opacity = 0.7 + Math.sin(t * 4) * 0.25;
  } else WORLD.ring.visible = false;

  updateBursts(dt);
      }
