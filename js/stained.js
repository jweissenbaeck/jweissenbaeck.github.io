// The end of the way, as a chapel: the same wall of concrete in the dark, and in it
// a tall pointed window of stained glass, a dove descending in a glory of gold on a
// field of deep blue. A sun stands high behind it. Its light comes through the
// glass in the colours of the glass: shafts in the air, and on the floor the window
// lies again, stretched out, lead lines and all. Every pixel of that light is traced
// back through the window to the sun, so it is the window's own picture.
import { THREE, makeRenderer, tracker, pbr, loop, motes, dotSprite } from './kit.js';
import { lancet } from './hero.js';

const VOID = 0x070707;
const T = 0.9;                                   // the wall's thickness
const WW = 1.6, SILL = 0.8, SPRING = SILL + 3.0; // the window: width, sill, where the arch springs
const APEX = SPRING + Math.sqrt(3) / 2 * WW;     // an equilateral arch
const LIGHT = new THREE.Vector3(0, 13, -7);      // the sun, high behind the wall
const smooth = (a, b, t) => { const x = Math.min(1, Math.max(0, (t - a) / (b - a))); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------------------------
// the glass, painted: pieces of coloured glass held in lead
function paintGlass() {
  const S = 560;                                  // pixels to the metre
  const W = Math.round(WW * S), H = Math.round((APEX - SILL) * S);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // window space (metres, y up from the sill, x from the middle) to the canvas
  const X = (x) => (x + WW / 2) * S, Y = (y) => H - y * S;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pick = (list) => list[Math.floor(rnd() * list.length)];
  const LEAD = '#121212', lead = 0.024 * S;

  const outline = lancet(WW, SPRING - SILL, 0, 0, 0, 80);
  const shapePath = (inset = 0) => {
    g.beginPath();
    const pts = inset ? lancet(WW - inset * 2, SPRING - SILL, -inset, inset, 0, 80) : outline;
    pts.forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
    g.closePath();
  };
  shapePath();
  g.save();
  g.clip();

  // the field: quarries of deep blue, each a little different
  const BLUES = ['#0f2a66', '#163a88', '#0c2257', '#1d4598', '#112f74', '#244f9f'];
  const step = 0.17, cols = Math.ceil(WW / step) + 2, rows = Math.ceil((APEX - SILL) / step) + 2;
  const jit = [];
  for (let j = 0; j <= rows; j++) {
    jit.push([]);
    for (let i = 0; i <= cols; i++) jit[j].push([(i - 1) * step - WW / 2 + (rnd() - 0.5) * step * 0.5, (j - 1) * step + (rnd() - 0.5) * step * 0.5]);
  }
  const quads = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) quads.push([jit[j][i], jit[j][i + 1], jit[j + 1][i + 1], jit[j + 1][i]]);
  const poly = (pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.closePath(); };
  quads.forEach((q) => { poly(q); g.fillStyle = pick(BLUES); g.fill(); });

  // the glory: a disc of gold rays behind the dove
  const GC = [0, 2.35], GR = 0.56;
  const GOLDS = ['#e6a823', '#f3c24a', '#d98c17', '#f7d36a'];
  const rays = 18;
  for (let k = 0; k < rays; k++) {
    const a0 = (k / rays) * Math.PI * 2, a1 = ((k + 1) / rays) * Math.PI * 2;
    g.beginPath();
    g.moveTo(X(GC[0]), Y(GC[1]));
    g.arc(X(GC[0]), Y(GC[1]), GR * S, -a0, -a1, true);
    g.closePath();
    g.fillStyle = GOLDS[k % GOLDS.length];
    g.fill();
  }
  // the light streaming down from it, long narrow panes, to the foot of the window
  const STREAM = ['#f2c14e', '#fbe7a6', '#e9a92a', '#fff3cf'];
  const streams = [];
  for (let k = -3; k <= 3; k++) {
    const x0 = GC[0] + k * 0.07, x1 = GC[0] + k * 0.21;
    streams.push([[x0 - 0.035, GC[1] - GR * 0.7], [x0 + 0.035, GC[1] - GR * 0.7], [x1 + 0.06, 0.32], [x1 - 0.06, 0.32]]);
  }
  streams.forEach((q, k) => { poly(q); g.fillStyle = STREAM[(k + 3) % STREAM.length]; g.fill(); });

  // the foot: a band of ruby and green, a ground for the light to fall on
  const FOOT = ['#8f1424', '#b01c2e', '#1f6b3a', '#2b8a4a', '#7a1020'];
  for (let k = 0; k < 8; k++) {
    const x0 = -WW / 2 + (k / 8) * WW, x1 = -WW / 2 + ((k + 1) / 8) * WW;
    poly([[x0, 0], [x1, 0], [x1, 0.3], [x0, 0.3]]);
    g.fillStyle = FOOT[k % FOOT.length];
    g.fill();
  }

  // in the head of the arch: a rose of four lobes, ruby round a golden heart
  const RC = [0, SPRING - SILL + 0.62], RR = 0.3;
  const lobe = (dx, dy) => { g.beginPath(); g.arc(X(RC[0] + dx), Y(RC[1] + dy), RR * 0.62 * S, 0, Math.PI * 2); };
  [[RR * 0.45, 0], [-RR * 0.45, 0], [0, RR * 0.45], [0, -RR * 0.45]].forEach(([dx, dy], k) => { lobe(dx, dy); g.fillStyle = k % 2 ? '#a3182b' : '#c42a3c'; g.fill(); });
  g.beginPath(); g.arc(X(RC[0]), Y(RC[1]), RR * 0.36 * S, 0, Math.PI * 2); g.fillStyle = '#f3c24a'; g.fill();

  // the dove, coming down, wings open
  const D = [0, 2.36], ds = 0.92;
  const dp = (x, y) => [X(D[0] + x * ds), Y(D[1] + y * ds)];
  const dove = () => {
    g.beginPath();
    // tail, fanned upwards
    g.moveTo(...dp(-0.05, 0.14));
    g.lineTo(...dp(-0.13, 0.36)); g.lineTo(...dp(-0.04, 0.33)); g.lineTo(...dp(0, 0.39)); g.lineTo(...dp(0.04, 0.33)); g.lineTo(...dp(0.13, 0.36));
    g.lineTo(...dp(0.05, 0.14));
    // right wing, up and out, its lower edge in feathers
    g.bezierCurveTo(...dp(0.12, 0.2), ...dp(0.3, 0.34), ...dp(0.46, 0.3));
    g.lineTo(...dp(0.4, 0.22)); g.lineTo(...dp(0.43, 0.15)); g.lineTo(...dp(0.33, 0.11)); g.lineTo(...dp(0.34, 0.04)); g.lineTo(...dp(0.22, 0.03)); g.lineTo(...dp(0.2, -0.04));
    g.bezierCurveTo(...dp(0.13, -0.03), ...dp(0.08, -0.06), ...dp(0.065, -0.12));
    // head, down
    g.bezierCurveTo(...dp(0.07, -0.2), ...dp(0.04, -0.27), ...dp(0, -0.28));
    g.lineTo(...dp(0, -0.33));
    g.lineTo(...dp(-0.02, -0.28));
    g.bezierCurveTo(...dp(-0.04, -0.27), ...dp(-0.07, -0.2), ...dp(-0.065, -0.12));
    // left wing
    g.bezierCurveTo(...dp(-0.08, -0.06), ...dp(-0.13, -0.03), ...dp(-0.2, -0.04));
    g.lineTo(...dp(-0.22, 0.03)); g.lineTo(...dp(-0.34, 0.04)); g.lineTo(...dp(-0.33, 0.11)); g.lineTo(...dp(-0.43, 0.15)); g.lineTo(...dp(-0.4, 0.22)); g.lineTo(...dp(-0.46, 0.3));
    g.bezierCurveTo(...dp(-0.3, 0.34), ...dp(-0.12, 0.2), ...dp(-0.05, 0.14));
    g.closePath();
  };
  dove();
  g.fillStyle = '#f6f2e6';
  g.fill();

  // the glass itself: never one flat colour; mottled, streaked, lighter at the heart
  const grain = g.createImageData(W, H);
  for (let i = 0; i < grain.data.length; i += 4) {
    const v = rnd();
    grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v > 0.5 ? 255 : 0;
    grain.data[i + 3] = 14 + v * 10;
  }
  const gc = document.createElement('canvas');
  gc.width = W; gc.height = H;
  gc.getContext('2d').putImageData(grain, 0, 0);
  g.globalCompositeOperation = 'overlay';
  g.drawImage(gc, 0, 0);
  g.filter = 'blur(10px)';
  g.globalAlpha = 0.5;
  for (let k = 0; k < 140; k++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.35)';
    g.fillRect(rnd() * W, rnd() * H, 6 + rnd() * 40, 20 + rnd() * 120);
  }
  g.filter = 'none';
  g.globalAlpha = 1;
  const heart = g.createRadialGradient(X(GC[0]), Y(GC[1]), 0, X(GC[0]), Y(GC[1]), H * 0.6);
  heart.addColorStop(0, 'rgba(255,255,255,.28)');
  heart.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = heart;
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'source-over';

  // the lead: round every piece, and the iron bars across
  g.strokeStyle = LEAD;
  g.lineJoin = 'round';
  g.lineWidth = lead;
  quads.forEach((q) => {
    // quarries hidden under the glory, the streams and the foot keep no lead of their own
    const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
    if (Math.hypot(cx - GC[0], cy - GC[1]) < GR - 0.05 || cy < 0.3) return;
    poly(q); g.stroke();
  });
  streams.forEach((q) => { poly(q); g.stroke(); });
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2;
    g.beginPath(); g.moveTo(X(GC[0]), Y(GC[1])); g.lineTo(X(GC[0] + Math.cos(a) * GR), Y(GC[1] + Math.sin(a) * GR)); g.stroke();
  }
  g.beginPath(); g.arc(X(GC[0]), Y(GC[1]), GR * S, 0, Math.PI * 2); g.lineWidth = lead * 1.4; g.stroke();
  g.lineWidth = lead;
  for (let k = 1; k < 8; k++) { const x = -WW / 2 + (k / 8) * WW; g.beginPath(); g.moveTo(X(x), Y(0)); g.lineTo(X(x), Y(0.3)); g.stroke(); }
  g.beginPath(); g.moveTo(X(-WW), Y(0.3)); g.lineTo(X(WW), Y(0.3)); g.stroke();
  [[RR * 0.45, 0], [-RR * 0.45, 0], [0, RR * 0.45], [0, -RR * 0.45]].forEach(([dx, dy]) => { lobe(dx, dy); g.stroke(); });
  g.beginPath(); g.arc(X(RC[0]), Y(RC[1]), RR * 0.36 * S, 0, Math.PI * 2); g.stroke();
  dove(); g.lineWidth = lead * 1.2; g.stroke();
  // feathers
  g.lineWidth = lead * 0.8;
  [[[0.06, 0.08], [0.33, 0.11]], [[0.06, 0.02], [0.22, 0.03]], [[-0.06, 0.08], [-0.33, 0.11]], [[-0.06, 0.02], [-0.22, 0.03]], [[0, 0.14], [0, 0.33]]].forEach(([a, b]) => {
    g.beginPath(); g.moveTo(...dp(...a)); g.lineTo(...dp(...b)); g.stroke();
  });
  // saddle bars: iron, straight across, every 0.62 m
  g.lineWidth = lead * 1.6;
  for (let y = 0.62; y < SPRING - SILL; y += 0.62) { g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(W, Y(y)); g.stroke(); }
  g.restore();

  // the border: small panes round the edge, ruby, gold and green, in their own lead
  const BORDER = ['#a3182b', '#e0a32a', '#1f6b3a', '#c42a3c', '#2a4fa8'];
  const bw = 0.1;
  const ring = [...outline, outline[0]];
  let run = 0, k = 0;
  g.save();
  shapePath(); g.clip();
  g.lineCap = 'butt';
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i], b = ring[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    g.beginPath(); g.moveTo(X(a.x), Y(a.y)); g.lineTo(X(b.x), Y(b.y));
    g.strokeStyle = BORDER[k % BORDER.length]; g.lineWidth = bw * 2 * S; g.stroke();
    run += len;
    if (run > 0.2) {
      run = 0; k++;
      // a lead across the border where the colour changes
      const nx = -(b.y - a.y) / len, ny = (b.x - a.x) / len;
      g.beginPath(); g.moveTo(X(b.x - nx * bw), Y(b.y - ny * bw)); g.lineTo(X(b.x + nx * bw), Y(b.y + ny * bw));
      g.strokeStyle = LEAD; g.lineWidth = lead; g.stroke();
    }
  }
  // lead along the inner edge of the border and round the whole window
  g.strokeStyle = LEAD;
  g.lineWidth = lead * 1.2;
  shapePath(bw); g.stroke();
  g.lineWidth = lead * 2.4;
  shapePath(); g.stroke();
  g.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// the words on the wall: painted onto the concrete, worn a little. Each line is
// split by the window: its first words end just left of it, its last word starts
// just right of it. In wall coordinates (metres).
const WORDS = { x0: -5.8, x1: 4.6, y0: 2.6, y1: 5.0 };
const GAP = 0.3;                                   // between the words and the window
const WORD_LINES = [
  { left: "Let's bring", right: 'color', y: 4.25 },
  { left: 'into your', right: 'projects', y: 3.12 },
];
const RIGHT_EDGE = WW / 2 + GAP + 8 * 0.66 * 0.56 + 0.3;   // where 'projects' ends, and a margin
function paintWords() {
  const S = 200, em = 0.66;
  const W = Math.round((WORDS.x1 - WORDS.x0) * S), H = Math.round((WORDS.y1 - WORDS.y0) * S);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const X = (x) => (x - WORDS.x0) * S, Y = (y) => (WORDS.y1 - y) * S;
  g.fillStyle = '#fff';
  g.font = `600 ${Math.round(em * S)}px "Plex Mono", ui-monospace, monospace`;
  g.textBaseline = 'alphabetic';
  const track = -0.04 * em * S;
  const width = (t) => [...t].reduce((a, ch) => a + g.measureText(ch).width + track, 0) - track;
  const write = (t, x, y) => { for (const ch of t) { g.fillText(ch, x, y); x += g.measureText(ch).width + track; } };
  for (const l of WORD_LINES) {
    const a = l.left.toUpperCase(), b = l.right.toUpperCase();
    write(a, X(-WW / 2 - GAP) - width(a), Y(l.y));
    write(b, X(WW / 2 + GAP), Y(l.y));
  }
  // the ink for 'color': each letter in a glass of its own, lit from above,
  // never one flat colour
  const ink = document.createElement('canvas');
  ink.width = W; ink.height = H;
  const ik = ink.getContext('2d');
  ik.font = g.font; ik.textBaseline = 'alphabetic';
  const word = WORD_LINES[0].right.toUpperCase();
  const GLASS = ['#d0283f', '#f2b630', '#2f9a52', '#2f62d6', '#ee7a1c'];
  let x = X(WW / 2 + GAP);
  const cap = em * S * 0.72, base = Y(WORD_LINES[0].y);
  [...word].forEach((ch, i) => {
    const grad = ik.createLinearGradient(0, base - cap, 0, base);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.18, GLASS[i % GLASS.length]);
    grad.addColorStop(1, GLASS[i % GLASS.length]);
    ik.fillStyle = grad;
    ik.fillText(ch, x, base);
    x += ik.measureText(ch).width + track;
  });
  ik.globalCompositeOperation = 'source-atop';
  for (let n = 0; n < 2500; n++) { ik.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.2)'; ik.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 5, 2 + Math.random() * 9); }
  // where 'color' stands, in wall coordinates
  const x0 = WW / 2 + GAP;
  const span = { x0, x1: x0 + width(word) / S, y0: WORD_LINES[0].y - 0.08, y1: WORD_LINES[0].y + em * 0.72 + 0.06 };
  // worn: the paint has not taken everywhere on the rough concrete
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 5000; k++) { g.globalAlpha = 0.15 + rnd() * 0.5; g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 1.6, 1 + rnd() * 1.6); }
  g.globalAlpha = 0.18;
  for (let k = 0; k < 60; k++) g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 30 + rnd() * 160);
  // the window cuts through them, with a little margin
  g.globalAlpha = 1;
  g.beginPath();
  lancet(WW, SPRING, 0.07, SILL - 0.07, 0, 60).forEach((p, i) => (i ? g.lineTo(X(p.x), Y(p.y)) : g.moveTo(X(p.x), Y(p.y))));
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'source-over';
  // (the canvases are written out as they are, sRGB in, sRGB out)
  return { tex: new THREE.CanvasTexture(c), ink: new THREE.CanvasTexture(ink), span };
}

// ---------------------------------------------------------------------------------
export function createStained(canvas, { onReady } = {}) {
  const renderer = makeRenderer(canvas, { exposure: 1.05 });
  if (!renderer) return null;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID);
  scene.fog = new THREE.FogExp2(VOID, 0.045);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
  const track = tracker(ready);

  // the floor, on our side of the wall
  const floorMat = pbr(renderer, 'floor', 10, track, { color: 0x3c3b38 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 30), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 15 + T / 2 - 0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // the wall, the window cut through it
  const outline = lancet(WW, SPRING, 0, SILL, 0, 60);
  const shape = new THREE.Shape();
  shape.moveTo(-14, 0); shape.lineTo(14, 0); shape.lineTo(14, 12); shape.lineTo(-14, 12); shape.closePath();
  shape.holes.push(new THREE.Path(outline.map((p) => new THREE.Vector2(p.x, p.y))));
  const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 1 });
  wallGeo.translate(0, 0, -T / 2);
  const wallMat = pbr(renderer, 'wall', 0.2, track, { color: 0x9c9a95 });
  [wallMat.map, wallMat.normalMap, wallMat.aoMap].forEach((t) => { t.offset.set(0.13, 0.45); });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  scene.add(wall);

  // the words, on the face of the wall (once the font is there)
  // painted grey; 'color' can be written over in the colours of the glass, left
  // to right, a bright edge running ahead of the ink
  const wordsMat = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uMap: { value: null }, uInk: { value: null }, uBase: { value: new THREE.Color() },
      uProg: { value: 0 }, uSpan: { value: new THREE.Vector2(0, 1) },
    }]),
    vertexShader: `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <fog_pars_fragment>
      uniform sampler2D uMap, uInk; uniform vec3 uBase; uniform float uProg; uniform vec2 uSpan;
      varying vec2 vUv;
      void main() {
        float a = texture2D(uMap, vUv).a;
        if (a < 0.01) discard;
        vec4 ink = texture2D(uInk, vUv);
        float local = (vUv.x - uSpan.x) / (uSpan.y - uSpan.x);
        const float soft = 0.07;
        float s = uProg * (1.0 + soft);
        float wet = 1.0 - smoothstep(s - soft, s, local);
        float live = step(0.001, uProg) * (1.0 - step(0.999, uProg));
        float edge = exp(-pow((local - (s - soft * 0.5)) / (soft * 0.7), 2.0)) * live;
        vec3 c = mix(uBase, ink.rgb * 1.2, ink.a * wet) + vec3(1.0, 0.95, 0.85) * ink.a * edge * 0.9;
        gl_FragColor = vec4(c, a);
        #include <fog_fragment>
      }`,
    fog: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  });
  const words = new THREE.Mesh(new THREE.PlaneGeometry(WORDS.x1 - WORDS.x0, WORDS.y1 - WORDS.y0), wordsMat);
  words.position.set((WORDS.x0 + WORDS.x1) / 2, (WORDS.y0 + WORDS.y1) / 2, T / 2 + 0.003);
  words.visible = false;
  scene.add(words);
  // pointing at 'color' writes it in colour
  let colorSpan = null, inked = false, lastT = 0;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const host = canvas.parentElement;
  host.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !colorSpan || !words.visible) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(words)[0];
    const pad = 0.12;
    inked = !!hit && hit.point.x > colorSpan.x0 - pad && hit.point.x < colorSpan.x1 + pad && hit.point.y > colorSpan.y0 - pad && hit.point.y < colorSpan.y1 + pad;
  });
  host.addEventListener('pointerleave', () => { inked = false; });
  const wordsDone = track.add();
  const wordsFont = '600 100px "Plex Mono"';
  (document.fonts ? document.fonts.load(wordsFont) : Promise.resolve()).catch(() => {}).then(() => {
    const painted = paintWords();
    wordsMat.uniforms.uMap.value = painted.tex;
    wordsMat.uniforms.uInk.value = painted.ink;
    const sp = painted.span, w0 = WORDS.x0, ww = WORDS.x1 - WORDS.x0;
    wordsMat.uniforms.uSpan.value.set((sp.x0 - w0) / ww, (sp.x1 - w0) / ww);
    colorSpan = sp;
    words.visible = wide;
    wordsDone();
  });

  // the glass, set in the middle of the wall, lit from behind
  const glassTex = paintGlass();
  const glassGeo = new THREE.ShapeGeometry(new THREE.Shape(outline.map((p) => new THREE.Vector2(p.x, p.y))));
  {
    // its picture spans the window's bounding box
    const uv = glassGeo.attributes.uv, pos = glassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + WW / 2) / WW, (pos.getY(i) - SILL) / (APEX - SILL));
  }
  const glassMat = new THREE.MeshBasicMaterial({ map: glassTex, transparent: true, fog: false, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(0, 0, 0) });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  scene.add(glass);

  // the light, traced back through the glass: shared by the floor and the shafts
  const lit = {
    uGlass: { value: glassTex }, uLight: { value: LIGHT },
    uRect: { value: new THREE.Vector4(-WW / 2, SILL, WW, APEX - SILL) },
    uK: { value: 0 },
  };
  const through = `
    uniform sampler2D uGlass; uniform vec3 uLight; uniform vec4 uRect; uniform float uK;
    // the colour of the sunlight that reaches p, having come through the window (z = 0)
    vec4 through(vec3 p) {
      vec3 d = p - uLight;
      if (d.z <= 0.0) return vec4(0.0);
      vec3 w = uLight + d * (-uLight.z / d.z);
      vec2 uv = (w.xy - uRect.xy) / uRect.zw;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return vec4(0.0);
      vec4 c = texture2D(uGlass, uv);
      return vec4(c.rgb * c.a, c.a);
    }`;

  // on the floor: the window again, long and soft-edged, on the stone
  const poolMat = new THREE.ShaderMaterial({
    uniforms: { ...lit, uFloor: { value: floorMat.map }, uFloorZ: { value: floor.position.z } },
    vertexShader: `varying vec3 vP; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `${through}
      uniform sampler2D uFloor; uniform float uFloorZ; varying vec3 vP;
      void main() {
        vec4 c = through(vP);
        // the stone shows through the colour; the light thins with its way through the air
        vec3 stone = texture2D(uFloor, vec2((vP.x + 30.0) / 60.0, (15.0 - (vP.z - uFloorZ)) / 30.0) * 10.0).rgb;
        float fall = 1.0 / (1.0 + 0.04 * dot(vP - uLight, vP - uLight) / 150.0);
        gl_FragColor = vec4(c.rgb * (0.35 + 1.4 * stone) * fall * 1.5 * uK, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), poolMat);
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(0, 0.004, 5 + T / 2);
  scene.add(pool);

  // the shafts: the air between the window and the floor, cut into thin sheets
  // standing parallel to the wall; on each sheet falls the light that came
  // through the glass, so together they make a body of coloured light, with the
  // lead and the bars running through it
  const front = T / 2;
  const sheetMat = new THREE.ShaderMaterial({
    uniforms: { ...lit },
    vertexShader: `varying vec3 vP; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vP = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `${through}
      varying vec3 vP;
      void main() {
        if (vP.y < 0.0) discard;
        vec4 c = through(vP);
        // thick near the glass, thinning as it goes, gone near the floor's far end
        float fall = (1.0 - smoothstep(0.4, 4.8, vP.z)) * smoothstep(0.0, 0.5, vP.y);
        gl_FragColor = vec4(c.rgb * fall * 0.05 * uK, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  // each sheet only as large as the light is where it stands: the window's
  // outline carried along from the sun to that depth (and a little margin)
  const SHEETS = 36;
  for (let k = 0; k < SHEETS; k++) {
    const z = front + 0.05 + (k + 0.5) * (4.6 / SHEETS);
    const t = (z - LIGHT.z) / -LIGHT.z;                    // how far past the window, along the light
    const half = (WW / 2) * t + 0.05;
    const y0 = Math.max(0, LIGHT.y + (SILL - LIGHT.y) * t) - 0.05, y1 = LIGHT.y + (APEX - LIGHT.y) * t + 0.05;
    if (y1 <= 0) continue;
    const geo = new THREE.PlaneGeometry(half * 2, y1 - Math.max(0, y0));
    geo.translate(0, (y1 + Math.max(0, y0)) / 2, 0);
    const sheet = new THREE.Mesh(geo, sheetMat);
    sheet.position.z = z;
    sheet.renderOrder = 2;
    scene.add(sheet);
  }

  // a warm haze round the window, and what the coloured floor gives back
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotSprite(), color: 0xffd9a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false }));
  glow.position.set(0, (SILL + APEX) / 2, front + 0.05);
  glow.scale.set(WW * 4, (APEX - SILL) * 1.9, 1);
  glow.renderOrder = 3;
  scene.add(glow);
  const bounce = new THREE.PointLight(0xc9a7ff, 0, 9, 1.6);
  bounce.position.set(0, 0.4, 2.4);
  scene.add(bounce);
  const bounceWarm = new THREE.PointLight(0xffc27a, 0, 8, 1.6);
  bounceWarm.position.set(0.3, 0.5, 1.2);
  scene.add(bounceWarm);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x111111, 0.08));

  // dust in the coloured air
  const dust = motes(260, new THREE.Box3(new THREE.Vector3(-1.2, 0.2, front + 0.1), new THREE.Vector3(1.2, 4.6, 4.2)), { size: 4, opacity: 0.7, drift: 0.01 });
  dust.renderOrder = 3;
  scene.add(dust);

  const look = new THREE.Vector3();
  const SIDE = -0.95;
  let wide = true, zEnd = 12.7;
  const L = loop(renderer, scene, camera, canvas, {
    onResize(w, h) {
      wide = w > h * 1.1;
      // stand far enough back that the last word on the right is on the wall we see
      const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (w / h);
      zEnd = wide ? Math.max(12.7, T / 2 + (RIGHT_EDGE - SIDE) / half) : 12.7;
      // on a tall screen the wall shows too little of itself to carry the words;
      // the page sets them as text there instead
      words.visible = wide && !!colorSpan;
      dust.material.uniforms.uScale.value = h * renderer.getPixelRatio() / 900;
    },
    update(s, t) {
      const p = s.p;
      // the sun comes up behind the glass as the page is uncovered
      const k = smooth(0.12, 0.85, p);
      dust.material.uniforms.uTime.value = t;
      lit.uK.value = k;
      glassMat.color.setScalar(0.04 + 0.96 * k);
      glow.material.opacity = 0.22 * k;
      wordsMat.uniforms.uBase.value.setRGB(0.91, 0.905, 0.89).multiplyScalar(0.62 + 0.38 * k);
      // the ink runs in at the pace of a hand writing, and draws back a little faster
      const dt = Math.min(0.05, Math.max(0, t - lastT)); lastT = t;
      const prog = wordsMat.uniforms.uProg;
      prog.value = inked ? Math.min(1, prog.value + dt / 1.15) : Math.max(0, prog.value - dt / 0.8);
      bounce.intensity = 2.2 * k;
      bounceWarm.intensity = 2.6 * k;
      dust.material.uniforms.uOpacity.value = 0.7 * k;
      // standing back, coming a step closer; a little to the left on a wide screen,
      // so the window stands right of the middle and the words keep the dark wall
      const z = zEnd + 1.8 * (1 - smooth(0, 1, p));
      const side = wide ? SIDE : 0;
      camera.position.set(side + s.sx * 0.7, 1.35 + s.sy * 0.25, z);
      look.set(side + s.sx * 0.15, 2.6, 0);
      camera.lookAt(look);
    },
  });

  function ready() {
    L.renderOnce();
    onReady && onReady();
  }
  track.close();
  return L;
}
