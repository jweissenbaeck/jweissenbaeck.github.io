// Backt aus dem basemap.at-Orthofoto (CC BY 4.0)
//   data/canopy.png        1-m-Maske der Baumkronen im Hotelgelaende (x -300..300, y -260..260)
//   data/ground-paved.png  0,5-m-Maske der hellen Wege und Terrassen (gleicher Ausschnitt)
//   tex/forest_floor.jpg   nahtlose Waldtextur (75 x 75 m)
// Aufruf:  npm i sharp  &&  node forsthofgut/tools/bake-imagery.mjs [canopy|ground|forest]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN, WINGS } from '../layout.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KX = 111320 * Math.cos(ORIGIN[1] * Math.PI / 180), KY = 111195;

// orthofoto-ausschnitt in lokalen metern als rgb-raster
async function ortho(zoom, x0, x1, y0, y1) {
  const n = 2 ** zoom;
  const tx = lon => (lon + 180) / 360 * n;
  const ty = lat => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n; };
  const fx0 = tx(ORIGIN[0] + x0 / KX), fx1 = tx(ORIGIN[0] + x1 / KX);
  const fy0 = ty(ORIGIN[1] + y1 / KY), fy1 = ty(ORIGIN[1] + y0 / KY);
  const X0 = Math.floor(fx0), X1 = Math.floor(fx1), Y0 = Math.floor(fy0), Y1 = Math.floor(fy1);
  const tiles = [];
  for (let X = X0; X <= X1; X++) for (let Y = Y0; Y <= Y1; Y++) {
    const res = await fetch(`https://mapsneu.wien.gv.at/basemap/bmaporthofoto30cm/normal/google3857/${zoom}/${Y}/${X}.jpeg`);
    tiles.push({ input: Buffer.from(await res.arrayBuffer()), left: (X - X0) * 256, top: (Y - Y0) * 256 });
  }
  const mosaic = await sharp({ create: { width: (X1 - X0 + 1) * 256, height: (Y1 - Y0 + 1) * 256, channels: 3, background: '#000' } })
    .composite(tiles).png().toBuffer();
  return sharp(mosaic).removeAlpha().extract({
    left: Math.round((fx0 - X0) * 256), top: Math.round((fy0 - Y0) * 256),
    width: Math.round((fx1 - fx0) * 256), height: Math.round((fy1 - fy0) * 256),
  });
}

function blur(src, W, H, r) {
  const t = new Float32Array(W * H), o = new Float32Array(W * H);
  const cx = x => Math.min(W - 1, Math.max(0, x)), cy = y => Math.min(H - 1, Math.max(0, y));
  for (let y = 0; y < H; y++) {
    let a = 0;
    for (let x = -r; x <= r; x++) a += src[y * W + cx(x)];
    for (let x = 0; x < W; x++) { t[y * W + x] = a / (2 * r + 1); a += src[y * W + cx(x + r + 1)] - src[y * W + cx(x - r)]; }
  }
  for (let x = 0; x < W; x++) {
    let a = 0;
    for (let y = -r; y <= r; y++) a += t[cy(y) * W + x];
    for (let y = 0; y < H; y++) { o[y * W + x] = a / (2 * r + 1); a += t[cy(y + r + 1) * W + x] - t[cy(y - r) * W + x]; }
  }
  return o;
}

// baumkronen: dunkel und gruen, entweder strukturiert (kronen mit schatten) oder sehr dunkel (dichter wald)
async function canopy() {
  const W = 1500, H = 1300; // 0.4 m pro pixel
  const { data } = await (await ortho(18, -300, 300, -260, 260)).resize(W, H).raw().toBuffer({ resolveWithObject: true });
  const L = new Float32Array(W * H), L2 = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) { L[i] = 0.3 * data[i * 3] + 0.59 * data[i * 3 + 1] + 0.11 * data[i * 3 + 2]; L2[i] = L[i] * L[i]; }
  const m = blur(L, W, H, 3), m2 = blur(L2, W, H, 3), mm = blur(L, W, H, 6);
  const c = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const sd = Math.sqrt(Math.max(0, m2[i] - m[i] * m[i])), r = data[i * 3], g = data[i * 3 + 1];
    c[i] = (mm[i] < 95 && sd > 10 && g > r) || (mm[i] < 72 && g > r * 1.1) ? 1 : 0;
  }
  const s = blur(c, W, H, 7);
  // gebaeude haben dunkle schlagschatten, die nicht als baum zaehlen sollen
  const nearBuilding = (x, y) => WINGS.some(w => {
    const a = w.axis * Math.PI / 180, dx = x - w.c[0], dy = y - w.c[1];
    return Math.abs(dx * Math.cos(a) + dy * Math.sin(a)) < w.len / 2 + 6 && Math.abs(-dx * Math.sin(a) + dy * Math.cos(a)) < w.wid / 2 + 6;
  });
  const OW = 600, OH = 520, out = Buffer.alloc(OW * OH);
  for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
    const sx = Math.min(W - 1, Math.round((x + 0.5) * 2.5)), sy = Math.min(H - 1, Math.round((y + 0.5) * 2.5));
    out[y * OW + x] = s[sy * W + sx] > 0.45 && !nearBuilding(x - 300 + 0.5, 260 - y - 0.5) ? 255 : 0;
  }
  await sharp(out, { raw: { width: OW, height: OH, channels: 1 } }).png().toFile(path.join(ROOT, 'data', 'canopy.png'));
}

// dichter fichtenwald suedwestlich des hotels, durch ueberblenden mit sich selbst nahtlos gemacht
async function forestFloor() {
  const N = 512;
  const { data } = await (await ortho(19, -175, -100, -260, -185)).resize(N, N).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(N * N * 3), h = N / 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const w = Math.min(1, Math.min(1 - Math.abs(x - h + 0.5) / h, 1 - Math.abs(y - h + 0.5) / h) * 2.2);
    const k = (y * N + x) * 3, k2 = (((y + h) % N) * N + ((x + h) % N)) * 3;
    for (let ch = 0; ch < 3; ch++) out[k + ch] = data[k + ch] * w + data[k2 + ch] * (1 - w);
  }
  // das luftbild ist bläulich-dunstig; fuer den gezeichneten stil gruener und heller
  await sharp(out, { raw: { width: N, height: N, channels: 3 } }).modulate({ hue: -28, saturation: 1.15, brightness: 1.15 })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(ROOT, 'tex', 'forest_floor.jpg'));
}

function removeSmall(mask, W, H, minArea) {
  const seen = new Uint8Array(W * H), stack = [];
  for (let start = 0; start < W * H; start++) {
    if (!mask[start] || seen[start]) continue;
    const comp = [];
    stack.push(start); seen[start] = 1;
    while (stack.length) {
      const i = stack.pop(); comp.push(i);
      const x = i % W, y = (i - x) / W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && mask[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (comp.length < minArea) for (const i of comp) mask[i] = 0;
  }
}

// flaechenarten aus den farben: daraus zeichnet die karte saubere wege, strassen und plaetze
async function groundMasks() {
  const W = 1200, H = 1040; // 0.5 m pro pixel
  const { data } = await (await ortho(19, -300, 300, -260, 260)).resize(W, H).raw().toBuffer({ resolveWithObject: true });
  const cls = { paved: new Float32Array(W * H), asphalt: new Float32Array(W * H), clay: new Float32Array(W * H), sand: new Float32Array(W * H) };
  for (let i = 0; i < W * H; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const L = 0.3 * r + 0.59 * g + 0.11 * b, mx = Math.max(r, g, b), sat = mx ? (mx - Math.min(r, g, b)) / mx : 0;
    if (r > 140 && r - g > 35 && g > b) cls.clay[i] = 1;
    else if (L > 150 && r > b + 22 && sat > 0.14 && sat < 0.42 && g - r < 6) cls.sand[i] = 1;
    else if (L > 148 && sat < 0.2) cls.paved[i] = 1;
    else if (L > 68 && L <= 148 && sat < 0.16 && g - r < 8) cls.asphalt[i] = 1;
  }
  // autos und einzelne pixel wegglaetten, dann kleine inseln (sonnenschirme, liegen) entfernen;
  // die wege haengen als netz zusammen und bleiben erhalten
  const opts = { paved: [3, 0.5, 160] };
  for (const [name, [rad, thr, minArea]] of Object.entries(opts)) {
    const sm = blur(cls[name], W, H, rad);
    const out = Buffer.alloc(W * H);
    for (let i = 0; i < W * H; i++) out[i] = sm[i] > thr ? 255 : 0;
    removeSmall(out, W, H, minArea);
    // kanten leicht weich, damit sie beim vergroessern nicht treppig werden
    await sharp(out, { raw: { width: W, height: H, channels: 1 } }).blur(0.6).png().toFile(path.join(ROOT, 'data', `ground-${name}.png`));
  }
}

const only = process.argv[2];
if (!only || only === 'canopy') await canopy();
if (!only || only === 'ground') await groundMasks();
if (!only || only === 'forest') await forestFloor();
console.log('fertig');
