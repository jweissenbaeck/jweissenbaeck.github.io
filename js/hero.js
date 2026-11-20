// Hero scene: a lancet window cut into a board-formed concrete wall.
// Sunlight falls through the tracery, the camera walks towards the glass on scroll.
import { THREE, url } from './kit.js';

const V2 = THREE.Vector2;

// opening of the innermost order (metres)
const W = 2.2;        // width
const HS = 3.0;       // springing height above the sill
const FLOOR = -1.1;

// pointed arch outline (counter-clockwise), offset outwards by s.
// Offsetting keeps both arcs concentric, so stepped orders stay parallel.
export function lancet(w, hs, s = 0, bottom = 0, cx = 0, seg = 44) {
  const R = w + s, half = w / 2 + s;
  const rise = Math.sqrt(R * R - (w / 2) ** 2);
  const a = Math.atan2(rise, w / 2);
  const p = [new V2(cx - half, bottom), new V2(cx + half, bottom)];
  for (let i = 0; i <= seg; i++) {
    const t = (a * i) / seg;
    p.push(new V2(cx - w / 2 + R * Math.cos(t), hs + R * Math.sin(t)));
  }
  for (let i = 1; i <= seg; i++) {
    const t = Math.PI - a + (a * i) / seg;
    p.push(new V2(cx + w / 2 + R * Math.cos(t), hs + R * Math.sin(t)));
  }
  return p;
}

// four lobed opening: outline of the union of four circles, ray-cast from the centre
function quatrefoil(cx, cy, r, seg = 180) {
  const a = r * 0.41, rl = r - a;
  const lobes = [[a, 0], [0, a], [-a, 0], [0, -a]];
  const p = [];
  for (let i = 0; i < seg; i++) {
    const th = (i / seg) * Math.PI * 2, dx = Math.cos(th), dy = Math.sin(th);
    let t = 0;
    for (const [lx, ly] of lobes) {
      const b = lx * dx + ly * dy;
      t = Math.max(t, b + Math.sqrt(rl * rl - (lx * lx + ly * ly) + b * b));
    }
    p.push(new V2(cx + dx * t, cy + dy * t));
  }
  return p;
}

const minDist = (x, y, pts) => pts.reduce((m, p) => Math.min(m, Math.hypot(p.x - x, p.y - y)), Infinity);

function inside(pt, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// plate tracery: two lights and an oculus pierced through one slab
function traceryLayout() {
  const border = 0.13, mull = 0.15;
  const w2 = (W - 2 * border - mull) / 2;
  const hs2 = 2.42;
  const subs = [-1, 1].map((k) => lancet(w2, hs2, 0, border, k * (mull / 2 + w2 / 2)));
  const frame = lancet(W, HS, -border, border);
  const fat = [-1, 1].flatMap((k) => lancet(w2, hs2, mull * 0.9, border, k * (mull / 2 + w2 / 2)));
  let best = { y: 0, r: 0 };
  for (let y = hs2; y < HS + 1.9; y += 0.005) {
    const r = Math.min(minDist(0, y, frame), minDist(0, y, fat));
    if (r > best.r && inside(new V2(0, y), frame)) best = { y, r };
  }
  const foil = quatrefoil(0, best.y, best.r * 0.86);
  // the right hand light is the one the camera walks through
  return { holes: [...subs, foil], oculus: best, light: { x: mull / 2 + w2 / 2, y: border + (hs2 - border) * 0.62 } };
}

// leaded glass: diamond quarries, each pane a slightly different grey
function glassTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 1152;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  const dx = 30, dy = 48;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let j = -1; j < c.height / (dy / 2) + 2; j++) {
    for (let i = -1; i < c.width / dx + 2; i++) {
      const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = (j * dy) / 2;
      const v = 168 + rnd() * 87;
      g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath();
      g.moveTo(cx, cy - dy / 2); g.lineTo(cx + dx / 2, cy); g.lineTo(cx, cy + dy / 2); g.lineTo(cx - dx / 2, cy);
      g.closePath(); g.fill();
    }
  }
  // lead cames
  g.strokeStyle = 'rgba(12,12,12,0.92)'; g.lineWidth = 2.6;
  for (let j = -1; j < c.height / (dy / 2) + 2; j++) {
    for (let i = -1; i < c.width / dx + 2; i++) {
      const cx = i * dx + (j % 2 ? dx / 2 : 0), cy = (j * dy) / 2;
      g.beginPath();
      g.moveTo(cx, cy - dy / 2); g.lineTo(cx + dx / 2, cy); g.lineTo(cx, cy + dy / 2); g.lineTo(cx - dx / 2, cy);
      g.closePath(); g.stroke();
    }
  }
  // brighter towards the sky, a little uneven like old glass
  const grad = g.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, 'rgba(255,255,255,0.18)'); grad.addColorStop(1, 'rgba(0,0,0,0.28)');
  g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function dotSprite() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function extrude(outline, holes, depth, zFront, mat) {
  const shape = new THREE.Shape(outline);
  for (const h of holes) shape.holes.push(new THREE.Path(h));
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  const m = new THREE.Mesh(geo, mat);
  m.position.z = zFront - depth;
  m.castShadow = m.receiveShadow = true;
  return m;
}

const rect = (x0, y0, x1, y1) => [new V2(x0, y0), new V2(x1, y0), new V2(x1, y1), new V2(x0, y1)];

export function createHero(canvas, { onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setClearColor(0x000000, 0); // the page behind the window shows through
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; // nothing casting a shadow ever moves

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x060606, 0.035);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 80);

  // materials -----------------------------------------------------------------
  const loader = new THREE.TextureLoader();
  let pending = 6;
  const done = () => { if (--pending === 0) ready(); };
  const load = (file, srgb, repeat) => {
    const t = loader.load(file, done, undefined, done);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const base = url('tex/');
  const wr = 1 / 4.2; // one tile of formwork covers 4.2 m
  const wallArm = load(base + 'wall_arm.jpg', false, wr);
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xc4c2be,
    map: load(base + 'wall_diff.jpg', true, wr),
    normalMap: load(base + 'wall_nor.jpg', false, wr),
    normalScale: new V2(1.4, 1.4),
    aoMap: wallArm, roughnessMap: wallArm, roughness: 1, metalness: 0,
  });
  // the deeper orders sit in their own shade, a touch darker
  const concreteDeep = concrete.clone();
  concreteDeep.color = new THREE.Color(0x9c9a96);

  const fr = 4;
  const floorArm = load(base + 'floor_arm.jpg', false, fr);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x8a8a88,
    map: load(base + 'floor_diff.jpg', true, fr),
    normalMap: load(base + 'floor_nor.jpg', false, fr),
    aoMap: floorArm, roughnessMap: floorArm, roughness: 0.85, metalness: 0,
  });

  // architecture --------------------------------------------------------------
  const arch = new THREE.Group();
  scene.add(arch);
  const WALL = [-18, FLOOR, 18, 18];
  const orders = [
    { s: 0.64, z: 0, d: 0.42, bottom: -0.46, mat: concrete },
    { s: 0.34, z: -0.42, d: 0.38, bottom: -0.2, mat: concreteDeep },
    { s: 0.0, z: -0.8, d: 0.55, bottom: 0, mat: concreteDeep },
  ];
  for (const o of orders) {
    arch.add(extrude(rect(...WALL), [lancet(W, HS, o.s, o.bottom)], o.d, o.z, o.mat));
  }

  // brutalist masses around the opening
  arch.add(extrude(rect(-18, FLOOR, -3.15, 18), [], 1.05, 1.05, concrete)); // pier, left
  arch.add(extrude(rect(-3.15, 6.55, 18, 18), [], 1.7, 1.7, concrete));    // cantilever above
  arch.add(extrude(rect(3.6, FLOOR, 18, -0.62), [], 1.5, 1.5, concrete));   // bench, right

  const { holes, light } = traceryLayout();
  arch.add(extrude(lancet(W, HS, 0.02, 0), holes, 0.2, -0.98, concreteDeep));

  // the floor stops at the wall: behind the glass there is only the next page
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FLOOR, 15);
  floor.receiveShadow = true;
  scene.add(floor);

  // glass, lit from outside
  const glassMat = new THREE.MeshBasicMaterial({ map: glassTexture(), color: new THREE.Color(2.6, 2.6, 2.6), transparent: true, depthWrite: false });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(W + 0.4, HS + 2.4), glassMat);
  glass.position.set(0, (HS + 2.4) / 2 - 0.1, -1.22);
  scene.add(glass);

  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 3.2, (HS + 2.4) * 1.9),
    new THREE.MeshBasicMaterial({ map: dotSprite(), transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  halo.position.set(0, 2.5, -0.55);
  scene.add(halo);

  // light ---------------------------------------------------------------------
  const sunDir = new THREE.Vector3(0.24, -0.62, 0.75).normalize();
  const winC = new THREE.Vector3(0, 2.6, -1.2);

  scene.add(new THREE.HemisphereLight(0xeeeeee, 0x161616, 0.22));

  // a broad, soft pool of daylight on the wall; falls off towards the edges of the frame
  const key = new THREE.SpotLight(0xffffff, 4.6, 0, 0.27, 1, 0);
  key.position.set(-9, 14, 19);
  key.target.position.set(0.4, 2.4, -0.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 8;
  key.shadow.camera.far = 50;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.03;
  scene.add(key, key.target);

  const sun = new THREE.SpotLight(0xffffff, 9, 0, 0.16, 0.25, 0);
  sun.position.copy(winC).addScaledVector(sunDir, -26);
  sun.target.position.copy(winC).addScaledVector(sunDir, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 18;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // shafts of light: one prism per pierced opening, pushed along the sun direction
  const L = 7.5;
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { uOpacity: { value: 0.07 } },
    vertexShader: `
      attribute float along;
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() {
        vAlong = along;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `
      uniform float uOpacity;
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main() {
        float fall = pow(1.0 - vAlong, 1.6) * smoothstep(0.0, 0.06, vAlong);
        float face = 0.35 + 0.65 * abs(dot(vN, vV));
        gl_FragColor = vec4(vec3(1.0), uOpacity * fall * face);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const zGlass = -1.1;
  for (const h of holes) {
    const pos = [], along = [];
    for (let i = 0; i < h.length; i++) {
      const a = h[i], b = h[(i + 1) % h.length];
      const A = new THREE.Vector3(a.x, a.y, zGlass), B = new THREE.Vector3(b.x, b.y, zGlass);
      const A2 = A.clone().addScaledVector(sunDir, L), B2 = B.clone().addScaledVector(sunDir, L);
      pos.push(...A.toArray(), ...B.toArray(), ...B2.toArray(), ...A.toArray(), ...B2.toArray(), ...A2.toArray());
      along.push(0, 0, 1, 0, 1, 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
    g.computeVertexNormals();
    scene.add(new THREE.Mesh(g, beamMat));
  }

  // dust drifting inside the shafts
  const N = small ? 380 : 700;
  const dBase = new Float32Array(N * 3), dSeed = new Float32Array(N * 2);
  for (let i = 0, made = 0; made < N && i < N * 40; i++) {
    const h = holes[made % holes.length];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of h) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const pt = new V2(minX + Math.random() * (maxX - minX), minY + Math.random() * (maxY - minY));
    if (!inside(pt, h)) continue;
    dBase.set([pt.x, pt.y, zGlass], made * 3);
    dSeed.set([Math.random() * L * 0.85, Math.random() * 100], made * 2);
    made++;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute('position', new THREE.BufferAttribute(dBase, 3));
  dGeo.setAttribute('seed', new THREE.BufferAttribute(dSeed, 2));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uDir: { value: sunDir }, uLen: { value: L * 0.85 },
      uMap: { value: dotSprite() }, uScale: { value: 1 }, uFade: { value: 1 },
    },
    vertexShader: `
      uniform float uTime; uniform vec3 uDir; uniform float uLen; uniform float uScale;
      attribute vec2 seed;
      varying float vA;
      void main() {
        float t = mod(seed.x + uTime * 0.045, uLen);
        vec3 p = position + uDir * t;
        p += vec3(sin(uTime * 0.31 + seed.y), sin(uTime * 0.23 + seed.y * 1.7), cos(uTime * 0.27 + seed.y)) * 0.07;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vA = smoothstep(0.0, 0.4, t) * (1.0 - t / uLen) * (0.4 + 0.6 * fract(seed.y * 7.13));
        gl_PointSize = uScale * (0.6 + fract(seed.y * 3.7)) * 9.0 / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap; uniform float uFade; varying float vA;
      void main() { gl_FragColor = vec4(vec3(1.0), texture2D(uMap, gl_PointCoord).a * vA * 0.85 * uFade); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  scene.add(new THREE.Points(dGeo, dustMat));

  // camera --------------------------------------------------------------------
  const state = { p: 0, mx: 0, my: 0, sx: 0, sy: 0 };
  const look = new THREE.Vector3();
  let dist = 12;

  // a shift lens, as in architectural photography: verticals stay vertical and the
  // window sits a little above the middle. The shift relaxes as we walk through.
  const SHIFT = 0.16;
  let vw = 1, vh = 1;
  function lens(shift) {
    camera.aspect = vw / (vh * (1 + shift));
    camera.setViewOffset(vw, vh * (1 + shift), 0, vh * shift, vw, vh);
    camera.updateProjectionMatrix();
  }
  function resize() {
    vw = canvas.clientWidth; vh = canvas.clientHeight;
    if (!vw || !vh) return;
    renderer.setSize(vw, vh, false);
    const narrow = vw < vh;
    camera.fov = narrow ? 54 : 39;
    dist = narrow ? 12 + (1 - vw / vh) * 7 : 12.5;
    lens(SHIFT);
    dustMat.uniforms.uScale.value = vh * renderer.getPixelRatio() / 900;
  }

  const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
  const mix = THREE.MathUtils.lerp;
  function place() {
    state.sx += (state.mx - state.sx) * 0.05;
    state.sy += (state.my - state.sy) * 0.05;
    const p = state.p;
    const align = smooth(0.1, 0.7, p);         // line up with the right hand light
    const free = 1 - smooth(0.0, 0.6, p);         // the hand stops steering near the glass
    const z = mix(dist, -4, Math.pow(p, 1.35));    // accelerate into the opening, out the other side by 0.9
    const x = mix(0, light.x, align) + state.sx * 0.6 * free;
    const y = mix(2.45, light.y, align) + state.sy * 0.3 * free;
    camera.position.set(x, y, z);
    look.set(x - state.sx * 0.45 * free, y - state.sy * 0.2 * free, z - 10);
    camera.lookAt(look);
    lens(SHIFT * (1 - align));

    // the glass dissolves to reveal the room behind it; the light goes with it
    const clear = smooth(0.5, 0.78, p);
    glassMat.opacity = 1 - clear;
    halo.material.opacity = 0.32 * (1 - clear);
    beamMat.uniforms.uOpacity.value = 0.07 * (1 - smooth(0.45, 0.75, p));
    dustMat.uniforms.uFade.value = 1 - smooth(0.5, 0.8, p);
    renderer.toneMappingExposure = 0.92 + 0.15 * smooth(0.3, 0.8, p);
  }

  let running = false, raf = 0, last = performance.now(), isReady = false;
  const clock = { t: 0 };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    clock.t += Math.min(0.05, (now - last) / 1000);
    last = now;
    dustMat.uniforms.uTime.value = clock.t;
    place();
    renderer.render(scene, camera);
  }

  function ready() {
    resize();
    renderer.shadowMap.needsUpdate = true;
    place();
    renderer.render(scene, camera);
    isReady = true;
    onReady && onReady();
  }

  resize();
  window.addEventListener('resize', resize);

  return {
    setProgress(p) { state.p = p; },
    setPointer(x, y) { state.mx = x; state.my = y; },
    start() {
      if (running) return;
      running = true; last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() { running = false; cancelAnimationFrame(raf); },
    get ready() { return isReady; },
  };
}
