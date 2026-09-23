import { CHARACTER } from '../data/character.js';
import { LOCATION } from '../data/location.js';
import { terrainHeight, ENGINE } from '../core/engine.js';
import { WORLD } from '../core/world.js';

export const PLAYER = {
  pos: new THREE.Vector3(LOCATION.spawnPoint[0], 0, LOCATION.spawnPoint[1]),
  yaw: 0, stamina: CHARACTER.stamina, lvl: 1, xp: 0,
  moving: false, running: false, onLevel: null
};

const P = {}; // ссылки на части тела

export function buildPlayer() {
  const g = new THREE.Group();
  const skin = 0xe8b48f, tunic = 0x4f7a3a, dark = 0x2e4a26, pants = 0x5a4632;
  const std = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 4, 8), std(tunic));
  body.position.y = 1.05; body.castShadow = true; g.add(body);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.09, 10), std(0x3a2c1a));
  belt.position.y = 0.82; g.add(belt);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), std(skin));
  head.position.y = 1.82; head.castShadow = true; g.add(head);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), std(dark));
  hood.position.set(0, 1.85, -0.03); g.add(hood);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), std(0x222222));
    eye.position.set(sx * 0.09, 1.85, 0.21); g.add(eye);
  }
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.2), std(0x6a4a2a));
  pack.position.set(0, 1.15, -0.32); pack.castShadow = true; g.add(pack);

  const limb = (r, len, c) => {
    const piv = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 6), std(c));
    m.position.y = -len / 2 - r; m.castShadow = true; piv.add(m);
    return piv;
  };
  P.armL = limb(0.09, 0.42, tunic); P.armL.position.set(-0.4, 1.42, 0);
  P.armR = limb(0.09, 0.42, tunic); P.armR.position.set(0.4, 1.42, 0);
  P.legL = limb(0.11, 0.45, pants); P.legL.position.set(-0.16, 0.78, 0);
  P.legR = limb(0.11, 0.45, pants); P.legR.position.set(0.16, 0.78, 0);
  g.add(P.armL, P.armR, P.legL, P.legR);

  P.g = g; P.walkT = 0; P.amp = 0;
  ENGINE.scene.add(g);
  g.position.copy(PLAYER.pos);
  return g;
}

function blocked(x, z) {
  if (terrainHeight(x, z) < LOCATION.water.level - 0.1) return true;
  if (Math.hypot(x, z) > LOCATION.radius - 1.5) return true;
  return false;
}

let lerpA = (a, b, t) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, t);
};

export function updatePlayer(dt, input, camYaw) {
  let jx = input.mx, jy = input.my;
  const len = Math.hypot(jx, jy);
  if (len > 1) { jx /= len; jy /= len; }
  PLAYER.moving = len > 0.08;

  const wantRun = input.run && PLAYER.moving && PLAYER.stamina > 1;
  PLAYER.running = wantRun;
  if (wantRun) PLAYER.stamina = Math.max(0, PLAYER.stamina - CHARACTER.runCost * dt);
  else PLAYER.stamina = Math.min(CHARACTER.stamina, PLAYER.stamina + CHARACTER.staminaRegen * dt);

  const speed = CHARACTER.speed * (wantRun ? CHARACTER.runMul : 1);

  if (PLAYER.moving) {
    const sx = Math.sin(camYaw), cz = Math.cos(camYaw);
    // right = (cz,-sx), forward = (sx,cz)
    const dx = cz * jx + sx * jy, dz = -sx * jx + cz * jy;
    let nx = PLAYER.pos.x + dx * speed * dt, nz = PLAYER.pos.z + dz * speed * dt;
    if (!blocked(nx, PLAYER.pos.z)) PLAYER.pos.x = nx;
    if (!blocked(PLAYER.pos.x, nz)) PLAYER.pos.z = nz;
    // выталкивание из деревьев и камней
    for (const n of WORLD.nodes) {
      if (!n.solid || !n.alive || n.cur < 0.5) continue;
      const ddx = PLAYER.pos.x - n.pos.x, ddz = PLAYER.pos.z - n.pos.z;
      const d = Math.hypot(ddx, ddz), min = n.radius + 0.35;
      if (d < min && d > 0.001) {
        PLAYER.pos.x = n.pos.x + ddx / d * min;
        PLAYER.pos.z = n.pos.z + ddz / d * min;
      }
    }
    PLAYER.yaw = lerpA(PLAYER.yaw, Math.atan2(dx, dz), dt * 10);
    P.walkT += dt * speed * 2.3;
    P.amp = Math.min(1, P.amp + dt * 6);
  } else P.amp = Math.max(0, P.amp - dt * 6);

  PLAYER.pos.y = terrainHeight(PLAYER.pos.x, PLAYER.pos.z);
  P.g.position.copy(PLAYER.pos);
  P.g.rotation.y = PLAYER.yaw;

  const sw = Math.sin(P.walkT) * 0.7 * P.amp * (PLAYER.running ? 1.25 : 1);
  P.legL.rotation.x = sw; P.legR.rotation.x = -sw;
  P.armL.rotation.x = -sw * 0.8; P.armR.rotation.x = sw * 0.8;
  P.g.position.y += Math.abs(Math.sin(P.walkT)) * 0.06 * P.amp + Math.sin(performance.now() / 900) * 0.01;
}

export function addXp(n) {
  PLAYER.xp += n;
  let need = CHARACTER.xpNeed(PLAYER.lvl);
  while (PLAYER.xp >= need) {
    PLAYER.xp -= need; PLAYER.lvl++;
    PLAYER.stamina = CHARACTER.stamina;
    PLAYER.onLevel?.(PLAYER.lvl);
    need = CHARACTER.xpNeed(PLAYER.lvl);
  }
}
