// Beyond the window: open sky. Volumetric clouds, ray marched at reduced
// resolution. The camera flies out over the clouds and dives into one, until
// nothing is left but the mist. The mist is one exact colour, MIST, which the
// page then takes over as its background, so the hand-over can't be seen.
import { THREE, url } from './kit.js';

const vertexShader = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const fragmentShader = `
  precision highp float;
  precision highp sampler3D;
  uniform sampler3D uNoise;
  uniform float uTime, uTan, uAspect, uWhite, uDark;
  // the words standing in the clouds: a plane facing us, its rectangle, its texture
  uniform sampler2D uText;
  uniform float uTextZ, uTextA;
  uniform vec4 uTextRect;   // x0, y0, width, height
  const vec3 MIST = vec3(176.0, 175.0, 172.0) / 255.0;
  uniform vec3 uCam, uRight, uUp, uFwd, uSun;
  varying vec2 vUv;

  #ifndef STEPS
  #define STEPS 72
  #endif

  float remap(float v, float a, float b, float c, float d) { return c + (v - a) / (b - a) * (d - c); }

  vec3 sky(vec3 dir) {
    float y = dir.y;
    vec3 zenith = vec3(0.13), horizon = vec3(0.74), below = vec3(0.5);
    vec3 c = y > 0.0 ? mix(horizon, zenith, pow(y, 0.55)) : mix(horizon, below, pow(-y, 0.6));
    float s = max(dot(dir, uSun), 0.0);
    c += vec3(0.32) * pow(s, 14.0) + vec3(0.25) * pow(s, 120.0) + vec3(2.0) * smoothstep(0.99965, 0.9998, s);
    return c;
  }

  // clouds live between y = -10 and y = 12; their tops rise and fall over the sea
  float density(vec3 p, bool cheap) {
    vec3 wind = vec3(uTime * 0.35, 0.0, uTime * 0.12);
    float tops = texture(uNoise, vec3((p.xz + wind.xz * 0.3) * 0.0035, 0.21)).r;
    float top = mix(-2.0, 11.0, smoothstep(0.25, 0.85, tops));
    // around the words the sea of cloud sinks, so they rise out of it
    float cx = uTextRect.x + uTextRect.z * 0.5;
    float clear = (1.0 - smoothstep(14.0, 34.0, abs(p.z - uTextZ))) * (1.0 - smoothstep(uTextRect.z * 0.55, uTextRect.z * 0.55 + 22.0, abs(p.x - cx)));
    top = mix(top, min(top, uTextRect.y + 2.3), clear);
    float shape = smoothstep(-10.0, -6.0, p.y) * (1.0 - smoothstep(top - 5.0, top, p.y));
    if (shape <= 0.0) return 0.0;
    float base = texture(uNoise, (p + wind) * 0.017).r;
    float d = remap(base, 1.0 - 0.66 * shape, 1.0, 0.0, 1.0);
    if (d <= 0.0 || cheap) return max(d, 0.0) * 1.6;
    float detail = texture(uNoise, (p + wind * 1.6) * 0.07).r * 0.65 + texture(uNoise, (p + wind * 2.2) * 0.19).r * 0.35;
    d = remap(d, detail * 0.55, 1.0, 0.0, 1.0);
    return clamp(d, 0.0, 1.0) * 1.6;
  }

  float light(vec3 p) {
    float s = 0.0;
    for (int i = 1; i <= 4; i++) s += density(p + uSun * float(i * i) * 0.9, true);
    return exp(-s * 1.05);
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  // where the ray meets the words, and how much of them is there
  float words(vec3 dir, float tP) {
    if (tP <= 0.0 || uTextA <= 0.0) return 0.0;
    vec3 h = uCam + dir * tP;
    vec2 uv = (h.xy - uTextRect.xy) / uTextRect.zw;
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
    return texture2D(uText, uv).a * uTextA;
  }

  void main() {
    vec2 q = vUv * 2.0 - 1.0;
    vec3 dir = normalize(uFwd + uRight * q.x * uTan * uAspect + uUp * q.y * uTan);
    vec3 bg = mix(sky(dir), MIST, uWhite);
    // inside a cloud the air thickens: fog grows quickly as the dive goes on
    float fogK = 0.011 + uWhite * uWhite * 0.45;
    // forward scattering: clouds glow at the edges when you look towards the sun
    float cosA = dot(dir, uSun);
    float phase = 0.7 + 1.1 * pow(max(cosA, 0.0), 6.0);

    vec3 col = vec3(0.0);
    float T = 1.0;
    float t = 0.4 + hash(gl_FragCoord.xy + fract(uTime)) * 0.9;
    // the words: lit like the tops of the clouds, sunk in the same haze
    float tP = dir.z < -1e-4 ? (uTextZ - uCam.z) / dir.z : -1.0;
    vec3 wc = mix(vec3(0.93, 0.925, 0.91), bg, 1.0 - exp(-tP * fogK * 0.8));
    wc = mix(wc, MIST, sqrt(uWhite));
    bool met = false;
    for (int i = 0; i < STEPS; i++) {
      if (T < 0.03 || t > 220.0) break;
      // reaching the words: what is in front of them has been laid down already
      if (!met && t >= tP && tP > 0.0) { float w = words(dir, tP); col += T * w * wc; T *= 1.0 - w; met = true; }
      vec3 p = uCam + dir * t;
      float dt = 0.5 + t * 0.03;
      float d = density(p, false);
      if (d > 0.002) {
        float L = light(p);
        float powder = 1.0 - exp(-d * 2.0);
        float h = smoothstep(-10.0, 12.0, p.y);
        vec3 c = vec3(0.13 + 0.3 * h) + vec3(1.1) * L * mix(0.5, 1.0, powder) * phase;
        c = mix(c, bg, 1.0 - exp(-t * fogK));
        // in the dive the cloud is lit from all sides: no dark underside, only mist
        c = mix(c, MIST, sqrt(uWhite));
        float a = 1.0 - exp(-d * dt * 1.3);
        col += T * a * c;
        T *= 1.0 - a;
      }
      t += dt;
    }
    if (!met && tP > 0.0) { float w = words(dir, tP); col += T * w * wc; T *= 1.0 - w; }
    col += T * bg;
    // the last step lands exactly on the page colour
    col = mix(col, MIST, smoothstep(0.55, 1.0, uWhite));
    // a little grain against banding, gone by the time we hand over
    col += (hash(gl_FragCoord.xy * 1.7 + uTime) - 0.5) / 255.0 * 2.0 * (1.0 - uWhite);
    // at the foot of the tower the light goes, towards the band below
    col = mix(col, vec3(14.0, 14.0, 13.0) / 255.0, uDark);
    gl_FragColor = vec4(col, 1.0);
  }`;

// Out here, at the surface of the world, two lines stand in the clouds. We fly
// towards them and over them, and they go down into the mist with us.
const TEXT_Z = -118, TEXT_W = 30;   // passed over a little after the dive begins
const LINES = [
  { text: 'Everything has a surface.', weight: 500, size: 1 },
  { text: 'I design it.', weight: 600, size: 2.1 },
];
function words() {
  const px = 150;
  const font = (l) => `${l.weight} ${Math.round(px * l.size)}px "Plex Mono", ui-monospace, monospace`;
  const load = document.fonts ? Promise.all(LINES.map((l) => document.fonts.load(font(l)))).catch(() => {}) : Promise.resolve();
  return load.then(() => {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    // as wide as the long line, the big line under it
    const widths = LINES.map((l) => { g.font = font(l); return g.measureText(l.text.toUpperCase()).width; });
    const W = Math.ceil(Math.max(...widths) + px * 0.4);
    const lh = LINES.map((l) => px * l.size);
    const H = Math.ceil(lh[0] * 0.95 + lh[1] * 1.0 + px * 0.5);
    c.width = W; c.height = H;
    // lit from above like the cloud tops, greyer where the cloud closes round them
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.6, 'rgba(255,255,255,.92)');
    grad.addColorStop(1, 'rgba(255,255,255,.7)');
    g.fillStyle = grad;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = font(LINES[0]); g.fillText(LINES[0].text.toUpperCase(), W / 2, px * 0.2 + lh[0] * 0.75);
    g.font = font(LINES[1]); g.fillText(LINES[1].text.toUpperCase(), W / 2, px * 0.2 + lh[0] * 0.95 + lh[1] * 0.75);
    const tex = new THREE.CanvasTexture(c);
    tex.flipY = true;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  });
}

export function createSky(canvas, { onReady } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  const small = Math.min(innerWidth, innerHeight) < 700;
  // clouds are soft; half the pixels look the same and cost a quarter
  renderer.setPixelRatio(small ? 0.45 : 0.55);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const uniforms = {
    uNoise: { value: null }, uTime: { value: 0 },
    uTan: { value: Math.tan(THREE.MathUtils.degToRad(30)) }, uAspect: { value: 1 },
    uCam: { value: new THREE.Vector3() }, uRight: { value: new THREE.Vector3() },
    uUp: { value: new THREE.Vector3() }, uFwd: { value: new THREE.Vector3() },
    uSun: { value: new THREE.Vector3(-0.45, 0.32, -0.83).normalize() },
    uWhite: { value: 0 }, uDark: { value: 0 },
    uText: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) },
    uTextZ: { value: TEXT_Z }, uTextA: { value: 0 },
    uTextRect: { value: new THREE.Vector4(0, 0, 1, 1) },
  };
  uniforms.uText.value.needsUpdate = true;
  words().then((tex) => {
    uniforms.uText.value = tex;
    // centred on the line of flight, its foot sunk in the cloud
    const w = TEXT_W, h = w * tex.image.height / tex.image.width;
    uniforms.uTextRect.value.set(5.6 - w / 2, -3.0, w, h);
  });
  const mat = new THREE.ShaderMaterial({
    uniforms, vertexShader, fragmentShader,
    defines: { STEPS: small ? 44 : 72 },
    depthTest: false, depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.Camera();

  const state = { p: 0, sp: 0, l: 0, sl: 0, mx: 0, my: 0, sx: 0, sy: 0 };
  const e = new THREE.Euler(0, 0, 0, 'YXZ'), qt = new THREE.Quaternion();
  const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

  function place() {
    // glide with the scroll, but jump along when the page jumps (a link, a reload)
    if (Math.abs(state.p - state.sp) > 0.25) state.sp = state.p;
    state.sp += (state.p - state.sp) * 0.08;
    state.sx += (state.mx - state.sx) * 0.04;
    state.sy += (state.my - state.sy) * 0.04;
    if (Math.abs(state.l - state.sl) > 0.25) state.sl = state.l;
    state.sl += (state.l - state.sl) * 0.08;
    const p = state.sp, l = state.sl;
    // behind the glass until EXIT, a short flight, then from DIVE a dive into a
    // cloud; then (l) on down through it and out below the cloud base, where the
    // tower stands, still sinking slowly as the tower turns
    const EXIT = 0.476, DIVE = 0.67;
    const dive = smooth(DIVE, 1, p);
    const out = smooth(0, 0.55, l);
    const y = 4 + 4 * smooth(EXIT - 0.1, DIVE, p) - 13 * dive - 15 * out - 6 * l;
    const z = -p * 150 - 30 * dive - 22 * l;
    const x = Math.sin(p * 3.2) * 6;
    uniforms.uCam.value.set(x, y, z);
    // the white thins as soon as we sink on: the inside of the cloud shows its shape
    // never quite white: the shape of the cloud stays in view all the way through
    uniforms.uWhite.value = smooth(DIVE - 0.02, 1, p) * 0.9 * (1 - smooth(0, 0.3, l));
    // the words come out of the haze as we leave the window, and go into the mist with us
    uniforms.uTextA.value = smooth(EXIT - 0.06, EXIT + 0.06, p) * (1 - smooth(0.76, 0.88, p));
    e.set(0.04 - 0.08 * smooth(EXIT - 0.1, DIVE, p) - 0.3 * smooth(DIVE, 0.95, p) * (1 - smooth(0.1, 0.55, l)) + 0.1 * smooth(0.3, 0.8, l) + state.sy * 0.05 * (1 - dive) * (1 - out),
      Math.sin(p * 3.2 + 1.2) * 0.12 - state.sx * 0.08,
      Math.sin(p * 4.1) * 0.025);
    qt.setFromEuler(e);
    uniforms.uRight.value.set(1, 0, 0).applyQuaternion(qt);
    uniforms.uUp.value.set(0, 1, 0).applyQuaternion(qt);
    uniforms.uFwd.value.set(0, 0, -1).applyQuaternion(qt);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uAspect.value = w / h;
    uniforms.uTan.value = Math.tan(THREE.MathUtils.degToRad(w < h ? 36 : 28));
  }
  addEventListener('resize', resize);
  resize();

  let running = false, raf = 0, last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    uniforms.uTime.value += Math.min(0.05, (now - last) / 1000);
    last = now;
    place();
    // fully in the mist there is nothing left to draw
    if (uniforms.uWhite.value < 0.99 || uniforms.uDark.value > 0) renderer.render(scene, camera);
  }

  fetch(url('tex/clouds.bin')).then((r) => r.arrayBuffer()).then((buf) => {
    const tex = new THREE.Data3DTexture(new Uint8Array(buf), 64, 64, 64);
    tex.format = THREE.RedFormat;
    tex.minFilter = tex.magFilter = THREE.LinearFilter;
    tex.wrapS = tex.wrapT = tex.wrapR = THREE.RepeatWrapping;
    tex.unpackAlignment = 1;
    tex.needsUpdate = true;
    uniforms.uNoise.value = tex;
    place();
    renderer.render(scene, camera);
    onReady && onReady();
  });

  return {
    start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { running = false; cancelAnimationFrame(raf); },
    setProgress(p) { state.p = p; },
    setLower(l) { state.l = l; },
    setDark(d) { uniforms.uDark.value = d; },
    get white() { return uniforms.uWhite.value; },
    setPointer(x, y) { state.mx = x; state.my = y; },
  };
}
