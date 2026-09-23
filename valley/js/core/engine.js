import { LOCATION } from '../data/location.js';

export const ENGINE = {};

// ── простой детерминированный шум ──
function rnd(x, z) { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); }
const sm = t => t * t * (3 - 2 * t);
function noise(x, z) {
  const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
  const a = rnd(xi, zi), b = rnd(xi + 1, zi), c = rnd(xi, zi + 1), d = rnd(xi + 1, zi + 1);
  const u = sm(xf), v = sm(zf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// ── высота рельефа в точке (используют и меши, и игрок) ──
export function terrainHeight(x, z) {
  const L = LOCATION;
  let h = 0, amp = L.terrain.amplitude, f = L.terrain.detail;
  for (let o = 0; o < 3; o++) { h += (noise(x * f, z * f) - 0.5) * 2 * amp; amp *= 0.45; f *= 2.1; }
  // чаша долины: к краю поднимаются холмы
  const r = Math.hypot(x, z);
  const e = Math.max(0, (r - L.radius * 0.65) / (L.radius * 0.35));
  h += e * e * 26;
  // котлован озера
  const ld = Math.hypot(x - L.lake.x, z - L.lake.z);
  if (ld < L.lake.r * 1.6) {
    const t = 1 - Math.min(1, Math.max(0, (ld - L.lake.r * 0.6) / (L.lake.r * 1.0)));
    h = h * (1 - t) + (-4.2) * t;
  }
  return h;
}

export function initEngine(canvas) {
  const L = LOCATION;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(L.fog.color, L.fog.near, L.fog.far);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);

  // свет
  scene.add(new THREE.HemisphereLight(L.hemi.sky, L.hemi.ground, L.hemi.intensity));
  const sun = new THREE.DirectionalLight(L.sun.color, L.sun.intensity);
  sun.position.set(...L.sun.pos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -100; sc.right = sc.top = 100; sc.far = 400;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // небесный купол с градиентом
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(650, 16, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(L.sky.top) }, bot: { value: new THREE.Color(L.sky.bottom) } },
      vertexShader: 'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec3 vP;uniform vec3 top;uniform vec3 bot;void main(){float t=clamp(normalize(vP).y*1.5+.18,0.,1.);gl_FragColor=vec4(mix(bot,top,t),1.);}'
    })
  );
  scene.add(sky);

  buildTerrain(scene);
  const waterMesh = buildWater(scene);
  const pollen = buildPollen(scene);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  Object.assign(ENGINE, { scene, camera, renderer, clock: new THREE.Clock(), waterMesh, pollen });
  return ENGINE;
}

function buildTerrain(scene) {
  const L = LOCATION, R = L.radius + 60, seg = 140;
  const g = new THREE.PlaneGeometry(R * 2, R * 2, seg, seg);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  g.computeVertexNormals();

  const cG1 = new THREE.Color(0x69a04f), cG2 = new THREE.Color(0x8fbf62),
        cSand = new THREE.Color(0xcdbd90), cRock = new THREE.Color(0x8d8d80);
  const colors = new Float32Array(pos.count * 3), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const slope = Math.abs(terrainHeight(x + 1.2, z) - terrainHeight(x - 1.2, z))
                + Math.abs(terrainHeight(x, z + 1.2) - terrainHeight(x, z - 1.2));
    tmp.copy(cG1).lerp(cG2, noise(x * 0.13, z * 0.13));
    if (slope > 1.7) tmp.lerp(cRock, Math.min(1, (slope - 1.7) * 0.8));
    if (y < L.water.level + 0.5) tmp.lerp(cSand, Math.min(1, (L.water.level + 0.5 - y) * 1.4));
    colors.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function buildWater(scene) {
  const L = LOCATION;
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(L.lake.r * 1.12, 48),
    new THREE.MeshStandardMaterial({ color: L.water.color, transparent: true, opacity: 0.88, roughness: 0.15, metalness: 0.1 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(L.lake.x, L.water.level, L.lake.z);
  scene.add(m);
  return m;
}

function buildPollen(scene) {
  const n = LOCATION.pollen, arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * LOCATION.radius * 0.85;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    arr.set([x, terrainHeight(x, z) + 1 + Math.random() * 3, z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(arr.slice(), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xfff3b8, size: 0.16, transparent: true, opacity: 0.75, depthWrite: false
  }));
  scene.add(p);
  return { points: p, base: arr };
}

export function updateAmbient(t) {
  if (ENGINE.waterMesh) ENGINE.waterMesh.position.y = LOCATION.water.level + Math.sin(t * 0.8) * 0.04;
  const pol = ENGINE.pollen;
  if (pol) {
    const attr = pol.points.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      attr.setY(i, pol.base[i * 3 + 1] + Math.sin(t * 0.6 + i) * 0.6);
      attr.setX(i, pol.base[i * 3] + Math.sin(t * 0.15 + i * 1.7) * 0.9);
    }
    attr.needsUpdate = true;
  }
}
