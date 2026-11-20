// Shared pieces for the 3D scenes: renderer, textures, models, dust,
// and a small render loop that only runs while its section can be seen.
import * as THREE from '../lib/three.module.min.js';
import { GLTFLoader } from '../lib/GLTFLoader.js';

export { THREE };

const base = new URL('../', import.meta.url).href;
export const url = (p) => base + p;

export function makeRenderer(canvas, { exposure = 1 } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  const small = Math.min(innerWidth, innerHeight) < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // the scenes are still, shadows are drawn once
  return renderer;
}

// Everything the page waits for before it lets the visitor in: every file, every
// scene being built and warmed. The loader shows done / total, so its bar tells
// the truth. A task is settled once, however often its callback is called.
export const loading = { total: 0, done: 0 };
export function task(weight = 1) {
  loading.total += weight;
  let settled = false;
  return () => { if (!settled) { settled = true; loading.done += weight; } };
}

// counts everything a scene waits for, then calls back once
export function tracker(onDone) {
  let open = 0, closed = false;
  const settle = () => { if (--open === 0 && closed) onDone(); };
  return {
    add() { open++; const t = task(); return () => { t(); settle(); }; },
    close() { closed = true; if (open === 0) onDone(); },
  };
}

// Warm a scene before it is seen: compile every material, send every texture to
// the graphics card, draw it once. Otherwise all of that happens the first time it
// comes into view, in the middle of a scroll, and the page stutters.
export function warmUp(renderer, scene, camera) {
  renderer.compile(scene, camera);
  const seen = new Set();
  scene.traverse((o) => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      for (const v of Object.values(m)) if (v && v.isTexture && !seen.has(v)) { seen.add(v); renderer.initTexture(v); }
      if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u.value && u.value.isTexture && !seen.has(u.value)) { seen.add(u.value); renderer.initTexture(u.value); }
    }
  });
  renderer.render(scene, camera);
}

const texLoader = new THREE.TextureLoader();
export function pbr(renderer, name, repeat, track, extra = {}) {
  const load = (file, srgb) => {
    const done = track.add();
    const t = texLoader.load(url(`tex/${name}_${file}.jpg`), () => done(), undefined, () => done());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const arm = load('arm', false);
  return new THREE.MeshStandardMaterial({
    map: load('diff', true), normalMap: load('nor', false),
    aoMap: arm, roughnessMap: arm, roughness: 1, metalness: 0, ...extra,
  });
}

const gltf = new GLTFLoader();
const models = new Map();
export function model(name) {
  if (!models.has(name)) {
    models.set(name, new Promise((res, rej) => gltf.load(url(`models/${name}.glb`), (g) => res(g.scene), undefined, rej)));
  }
  return models.get(name);
}

// every mesh of a model is one variant: unpacked, stood on the origin, ready to instance
export async function parts(name) {
  const root = await model(name);
  root.updateMatrixWorld(true);
  const out = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    // quantized attributes would clip once moved into world space; unpack them first
    for (const name of Object.keys(g.attributes)) {
      const at = g.attributes[name];
      if (at.array instanceof Float32Array && !at.normalized) continue;
      const out = new Float32Array(at.count * at.itemSize);
      for (let i = 0; i < at.count; i++) for (let k = 0; k < at.itemSize; k++) out[i * at.itemSize + k] = at.getComponent(i, k);
      g.setAttribute(name, new THREE.BufferAttribute(out, at.itemSize));
    }
    g.applyMatrix4(o.matrixWorld);
    g.computeBoundingBox();
    const b = g.boundingBox;
    g.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
    out.push({ geometry: g, material: o.material });
  });
  return out;
}

// spreads the transforms over the variants, one instanced mesh per variant
export function scatter(scene, list, transforms, { cast = true, receive = true, tint } = {}) {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
  for (const [k, p] of list.entries()) {
    const mine = transforms.filter((_, i) => i % list.length === k);
    if (!mine.length) continue;
    if (tint !== undefined) { p.material = p.material.clone(); p.material.color.setHex(tint); }
    const inst = new THREE.InstancedMesh(p.geometry, p.material, mine.length);
    mine.forEach((t, i) => {
      e.set(t.rx || 0, t.ry || 0, t.rz || 0);
      q.setFromEuler(e);
      s.setScalar(t.s);
      if (t.sy) s.y *= t.sy;
      m.compose(v.set(t.x, t.y || 0, t.z), q, s);
      inst.setMatrixAt(i, m);
    });
    inst.castShadow = cast; inst.receiveShadow = receive;
    inst.computeBoundingSphere();
    scene.add(inst);
  }
}

export function dotSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// specks of dust or pollen drifting inside a box
export function motes(count, box, { size = 7, opacity = 0.7, drift = 0.04 } = {}) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.min.x + Math.random() * (box.max.x - box.min.x);
    pos[i * 3 + 1] = box.min.y + Math.random() * (box.max.y - box.min.y);
    pos[i * 3 + 2] = box.min.z + Math.random() * (box.max.z - box.min.z);
    seed[i] = Math.random() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: dotSprite() }, uScale: { value: 1 }, uSize: { value: size }, uOpacity: { value: opacity }, uDrift: { value: drift } },
    vertexShader: `
      uniform float uTime, uScale, uSize, uDrift;
      attribute float seed;
      varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.21 + seed), sin(uTime * 0.17 + seed * 1.7), cos(uTime * 0.19 + seed * 0.6)) * 0.35;
        p.y += mod(uTime * uDrift + seed, 3.0) - 1.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = 0.35 + 0.65 * fract(seed * 7.13);
        gl_PointSize = uScale * uSize * (0.5 + fract(seed * 3.7)) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uOpacity; varying float vA;
      void main() { gl_FragColor = vec4(vec3(1.0), texture2D(uMap, gl_PointCoord).a * vA * uOpacity); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(g, mat);
}

// gradient noise, enough to make rock look like rock
const P = new Uint8Array(512);
(() => {
  const p = [...Array(256).keys()];
  let s = 1337;
  for (let i = 255; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) P[i] = p[i & 255];
})();
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad = (h, x, y, z) => {
  const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
};
export function noise(x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z);
  const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  const L = (a, b, t) => a + t * (b - a);
  return L(L(L(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u),
    L(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
  L(L(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u),
    L(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
export function fbm(x, y, z, oct = 4) {
  let a = 0.5, f = 1, s = 0;
  for (let i = 0; i < oct; i++) { s += a * noise(x * f, y * f, z * f); a *= 0.5; f *= 2.03; }
  return s;
}

// render loop with resize and a gentle eased pointer
export function loop(renderer, scene, camera, canvas, { update, onResize } = {}) {
  let running = false, raf = 0, last = performance.now(), t = 0;
  const state = { p: 0, mx: 0, my: 0, sx: 0, sy: 0 };
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    onResize && onResize(w, h);
    camera.updateProjectionMatrix();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    state.sx += (state.mx - state.sx) * 0.04;
    state.sy += (state.my - state.sy) * 0.04;
    update && update(state, t, dt);
    renderer.render(scene, camera);
  }
  addEventListener('resize', resize);
  resize();
  return {
    state,
    resize,
    // the first picture also compiles every material in the scene, seen or not,
    // so nothing has to be compiled later, in the middle of a scroll
    renderOnce() { resize(); update && update(state, t, 0); warmUp(renderer, scene, camera); },
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    setProgress(p) { state.p = p; },
    setPointer(x, y) { state.mx = x; state.my = y; },
  };
}
