// The work as a round tower of board-formed concrete. The windows are set into
// its wall along a spiral; scrolling turns the tower about its axis and lifts
// it, so one window after the other comes round to the middle. Everything is
// real geometry: the curve of the wall gives the perspective of every window.
import { THREE, url, task, warmUp } from './kit.js';
import { lancet } from './hero.js';
import { RoomEnvironment } from '../lib/RoomEnvironment.js';

const V2 = THREE.Vector2;
const TAU = Math.PI * 2;
const H = 4 / 3;               // a window is 1 wide and H high
const R = 2.4;                 // radius of the tower
const STEP_A = THREE.MathUtils.degToRad(52);   // turn between two windows
const STEP_Y = 0.92;           // drop between two windows
const HAZE = [150, 150, 148];  // the air below the clouds, around the tower (sRGB)

// window: three stepped orders around a lancet, a lintel and a sill -----------
const W = 0.46, HS = 0.02;
const ORDERS = [{ s: 0.13, sill: -0.56, d: 0.12 }, { s: 0.065, sill: -0.54, d: 0.07 }, { s: 0, sill: -0.52, d: 0.07 }];
const rect = (x0, y0, x1, y1) => [new V2(x0, y0), new V2(x1, y0), new V2(x1, y1), new V2(x0, y1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };

function windowGeometry() {
  const orders = [];
  let z = 0;
  for (const o of ORDERS) {
    const shape = new THREE.Shape(rect(-0.5, -H / 2, 0.5, H / 2));
    shape.holes.push(new THREE.Path(lancet(W, HS, o.s, o.sill)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: o.d, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, z - o.d);
    orders.push(g);
    z -= o.d;
  }
  // the picture, a little larger than the opening so no light leaks past its edge
  const pic = new THREE.ShapeGeometry(new THREE.Shape(lancet(W, HS, 0.03, ORDERS[2].sill - 0.03)));
  pic.computeBoundingBox();
  const bb = pic.boundingBox, uv = pic.attributes.uv, pos = pic.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y));
  pic.translate(0, 0, z - 0.005);
  const lintel = new THREE.BoxGeometry(1.08, 0.07, 0.2);
  lintel.translate(0, H / 2 + 0.035, -0.06);
  const sill = new THREE.BoxGeometry(1.04, 0.06, 0.22);
  sill.translate(0, -H / 2 - 0.03, -0.07);
  return { orders, pic, lintel, sill, picAspect: (bb.max.x - bb.min.x) / (bb.max.y - bb.min.y) };
}

// the wall: a cylinder built as a grid in (arc length, height), whose lines run
// along every window edge, so each opening is cut exactly ---------------------
function wallGeometry(spots, top, bottom, tile) {
  const C = TAU * R;
  const us = new Set(), vs = new Set([top, bottom]);
  for (let k = 0; k <= 180; k++) us.add(+(k * C / 180).toFixed(5));
  const wrap = (u) => ((u % C) + C) % C;
  for (const s of spots) {
    us.add(+wrap(s.u - 0.5).toFixed(5)); us.add(+wrap(s.u + 0.5).toFixed(5));
    vs.add(s.y - H / 2); vs.add(s.y + H / 2);
  }
  const U = [...us].sort((a, b) => a - b), V = [...vs].filter((v) => v <= top && v >= bottom).sort((a, b) => a - b);
  const pos = [], nor = [], uv = [];
  const hole = (u, v) => spots.some((s) => {
    let du = Math.abs(u - s.u) % C; du = Math.min(du, C - du);
    return du < 0.5 && Math.abs(v - s.y) < H / 2;
  });
  const P = (u, v) => { const a = u / R; return [Math.sin(a) * R, v, Math.cos(a) * R]; };
  const N = (u) => { const a = u / R; return [Math.sin(a), 0, Math.cos(a)]; };
  for (let i = 0; i < U.length - 1; i++) {
    for (let j = 0; j < V.length - 1; j++) {
      const u0 = U[i], u1 = U[i + 1], v0 = V[j], v1 = V[j + 1];
      if (hole((u0 + u1) / 2, (v0 + v1) / 2)) continue;
      const q = [[u0, v0], [u1, v0], [u1, v1], [u0, v0], [u1, v1], [u0, v1]];
      for (const [u, v] of q) { pos.push(...P(u, v)); nor.push(...N(u)); uv.push(u / tile, v / tile); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function createWorks(canvas, images, { onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  // (beyond one and a half the extra pixels cannot be seen in this soft, misty light)
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the shadows only change when the tower moves, not when the eye does
  renderer.shadowMap.autoUpdate = false;

  const scene = new THREE.Scene();
  // the far side of the tower and the ground sink into the haze around it
  scene.fog = new THREE.Fog(new THREE.Color().setRGB(HAZE[0] / 255, HAZE[1] / 255, HAZE[2] / 255, THREE.SRGBColorSpace), 9, 30);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.3;
  pm.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // materials -----------------------------------------------------------------
  const loader = new THREE.TextureLoader();
  let pending = 3;
  const texDone = task(3), warmDone = task(3);
  const done = () => { if (--pending === 0) { texDone(); requestAnimationFrame(warm); } };
  const tex = (name, srgb) => {
    const t = loader.load(url(`tex/${name}.jpg`), done, undefined, done);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const maps = [tex('wall_diff', true), tex('wall_nor', false), tex('wall_arm', false)];
  const concrete = (tone, repeat = [1, 1], offset = [0, 0]) => {
    const [map, normalMap, arm] = maps.map((x) => { const c = x.clone(); c.repeat.set(...repeat); c.offset.set(...offset); return c; });
    return new THREE.MeshStandardMaterial({
      color: tone, map, normalMap, normalScale: new V2(1.3, 1.3),
      aoMap: arm, roughnessMap: arm, roughness: 1, metalness: 0,
    });
  };

  // the tower -----------------------------------------------------------------
  const N = images.length;
  const spots = images.map((_, i) => ({ a: i * STEP_A, u: i * STEP_A * R, y: -i * STEP_Y }));
  const top = H / 2 + 0.55;
  const bottom = spots[N - 1].y - 40;   // the foot is never seen: the earth comes up over it
  const tower = new THREE.Group();
  scene.add(tower);

  const wall = new THREE.Mesh(wallGeometry(spots, top, bottom, 2.6), concrete(0xc2c0bb));
  wall.castShadow = wall.receiveShadow = true;
  tower.add(wall);

  // the crown: cornice on corbels, a parapet, battlements, the flat roof inside
  const cap = concrete(0xd0cec9, [9, 0.18]);
  const cornice = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.08, R + 0.08, 0.15, 128), cap);
  cornice.position.y = top + 0.075;
  const parapet = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.26, 128, 1, true), concrete(0xc2c0bb, [6, 0.2]));
  parapet.position.y = top + 0.15 + 0.13;
  parapet.material.side = THREE.DoubleSide;
  const roof = new THREE.Mesh(new THREE.CircleGeometry(R + 0.03, 96), concrete(0x8e8c88, [3, 3]));
  roof.rotation.x = -Math.PI / 2;
  roof.position.y = top + 0.2;
  for (const m of [cornice, parapet, roof]) { m.castShadow = m.receiveShadow = true; tower.add(m); }
  // seen from above while flying in: the roof takes no shadow, so no acne on it
  roof.receiveShadow = false;
  roof.castShadow = false;
  // battlements and corbels: segments of the ring, with chamfered edges and
  // the formwork at its true scale
  const stone = concrete(0xcfcdc8, [0.5, 0.5], [0.21, 0.63]);
  function segment(r0, r1, a0, a1, h, bevel) {
    const sh = new THREE.Shape();
    const n = 10;
    // drawn as (x, -z): after laying the shape flat it lands at (x, z) on the ring
    for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; sh.lineTo(Math.sin(a) * r1, -Math.cos(a) * r1); }
    for (let k = n; k >= 0; k--) { const a = a0 + (a1 - a0) * k / n; sh.lineTo(Math.sin(a) * r0, -Math.cos(a) * r0); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: h - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, bevel, 0);
    return g;
  }
  const nM = 22, gapM = 0.42;      // merlons, and the share of each bay left open
  const crown = new THREE.Group();
  for (let k = 0; k < nM; k++) {
    const a0 = (k / nM) * TAU, a1 = ((k + 1 - gapM) / nM) * TAU;
    const m = new THREE.Mesh(segment(R - 0.17, R + 0.03, a0, a1, 0.27, 0.012), stone);
    m.position.y = top + 0.41;
    crown.add(m);
  }
  const nC = 44;
  for (let k = 0; k < nC; k++) {
    const a0 = (k / nC) * TAU, a1 = ((k + 0.42) / nC) * TAU;
    const m = new THREE.Mesh(segment(R - 0.02, R + 0.085, a0, a1, 0.12, 0.008), stone);
    m.position.y = top - 0.12;
    crown.add(m);
  }
  crown.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
  tower.add(crown);

  // the windows, set into the wall along the spiral
  const geo = windowGeometry();
  const tones = [0xcac8c3, 0xaeaca7, 0x9a9893];
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.08, envMapIntensity: 1.6, depthWrite: false });
  const windows = images.map((img, i) => {
    const g = new THREE.Group();
    const s = spots[i];
    g.position.set(Math.sin(s.a) * (R + 0.004), s.y, Math.cos(s.a) * (R + 0.004));
    g.rotation.y = s.a;
    geo.orders.forEach((og, k) => {
      const m = new THREE.Mesh(og, concrete(tones[k], [0.62, 0.62], [(i * 0.37 + k * 0.2) % 1, (i * 0.61) % 1]));
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    });
    const ledge = concrete(0xd2d0cb, [0.62, 0.62], [(i * 0.53) % 1, 0.3]);
    for (const lg of [geo.lintel, geo.sill]) {
      const m = new THREE.Mesh(lg, ledge);
      m.castShadow = m.receiveShadow = true;
      g.add(m);
    }
    const picTex = new THREE.Texture();
    picTex.colorSpace = THREE.SRGBColorSpace;
    const fit = () => {
      if (!img.naturalWidth) return;
      picTex.image = img;
      picTex.needsUpdate = true;
      const ia = img.naturalWidth / img.naturalHeight;
      const sx = Math.min(1, geo.picAspect / ia), sy = Math.min(1, ia / geo.picAspect);
      picTex.repeat.set(sx, sy);
      picTex.offset.set((1 - sx) / 2, (1 - sy) / 2);
    };
    if (img.complete) fit(); else img.addEventListener('load', fit, { once: true });
    const pic = new THREE.Mesh(geo.pic, new THREE.MeshBasicMaterial({ map: picTex, color: 0xb0b0b0 }));
    pic.receiveShadow = true;
    g.add(pic);
    const glass = new THREE.Mesh(geo.pic, glassMat);
    glass.position.z = 0.012;
    g.add(glass);
    tower.add(g);
    return g;
  });

  // light: a low sun from the left, so the round wall turns from light into shade
  const sun = new THREE.DirectionalLight(0xffffff, 3.2);
  sun.position.set(-7, 6, 6);
  sun.target.position.set(0, 0, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4.5, right: 4.5, top: 4.5, bottom: -4.5, near: 1, far: 30 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const sky = new THREE.HemisphereLight(0xffffff, 0x666666, 0.45);
  scene.add(sky);

  // camera --------------------------------------------------------------------
  let dist = 5;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w < h ? 44 : 30;
    // the window in front takes a little under half the height of the screen
    dist = (H / 0.46) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const state = { p: 0, sp: 0, mx: 0.5, my: 0.5, sx: 0.5, sy: 0.5, d: 0, sd: 0, a: 0, sa: 0 };
  const look = new THREE.Vector3();
  const corners = [new THREE.Vector3(), new THREE.Vector3()];
  let last = performance.now();
  function place() {
    // a soft follow, the same at any frame rate: the tower has weight
    const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const k = 1 - Math.exp(-dt * 4.2), km = 1 - Math.exp(-dt * 3);
    state.sp += (state.p - state.sp) * k;
    state.sd += (state.d - state.sd) * k;
    state.sa += (state.a - state.sa) * k;
    state.sx += (state.mx - state.sx) * km;
    state.sy += (state.my - state.sy) * km;
    // turns freely with the scroll, no stops at the windows
    const f = state.sp * (N - 1), d = state.sd;
    tower.rotation.y = -f * STEP_A;
    // lift it so the window in front sits at eye level; at the end it keeps
    // rising a little, as if we went on sinking while the earth comes up
    tower.position.y = f * STEP_Y + smooth(0, 1, d) * 1.6;
    // flying in: we come down from above the crown, the tower rising into view
    const a = state.sa, high = 9 * (1 - a) * (1 - a) * (3 - 2 * (1 - a)) / 1;
    const ox = (state.sx - 0.5) * 0.6 * (1 - d), oy = (state.sy - 0.5) * -0.35 * (1 - d);
    camera.position.set(ox, 0.12 + oy + high, R + dist);
    look.set(ox * 0.2, -0.1 + high - (1 - a) * 1.2, 0);
    camera.lookAt(look);
  }

  let running = false, raf = 0;
  // warm up while the page is still loading: the tower once at the first window,
  // once halfway round and once at the last, each a picture of its own, so every
  // texture, every material and the shadows are ready before it is ever seen
  function warm() {
    const stops = [0, 0.5, 1];
    const next = (first) => {
      const p = stops.shift();
      Object.assign(state, { p, sp: p, a: 1, sa: 1, d: 0, sd: 0 });
      place();
      renderer.shadowMap.needsUpdate = true;
      if (first) warmUp(renderer, scene, camera); else renderer.render(scene, camera);
      if (stops.length) { requestAnimationFrame(() => next(false)); return; }
      Object.assign(state, { p: 0, sp: 0, a: 0, sa: 0 });
      shadowAt = '';
      warmDone();
      onReady && onReady();
    };
    next(true);
  }

  let shadowAt = '';
  function frame() {
    raf = requestAnimationFrame(frame);
    place();
    const at = tower.rotation.y.toFixed(4) + tower.position.y.toFixed(4);
    if (at !== shadowAt) { shadowAt = at; renderer.shadowMap.needsUpdate = true; }
    renderer.render(scene, camera);
  }

  return {
    count: N,
    start() { if (running) return; running = true; raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    setProgress(p) { state.p = p; },
    setDescent(d) { state.d = d; },
    // 0 high above the tower, 1 at the first window
    setArrive(a) { state.a = a; },
    setPointer(x, y) { state.mx = x; state.my = y; },
    // which window is in front, and where it is on the screen (css pixels)
    get active() { return clamp(Math.round(tower.rotation.y / -STEP_A), 0, N - 1); },
    frontRect() {
      const g = windows[this.active];
      g.updateWorldMatrix(true, false);
      corners[0].set(-0.5, H / 2, 0).applyMatrix4(g.matrixWorld).project(camera);
      corners[1].set(0.5, -H / 2, 0).applyMatrix4(g.matrixWorld).project(camera);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      const x0 = (Math.min(corners[0].x, corners[1].x) + 1) / 2 * w, x1 = (Math.max(corners[0].x, corners[1].x) + 1) / 2 * w;
      const y0 = (1 - Math.max(corners[0].y, corners[1].y)) / 2 * h, y1 = (1 - Math.min(corners[0].y, corners[1].y)) / 2 * h;
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    },
  };
}
