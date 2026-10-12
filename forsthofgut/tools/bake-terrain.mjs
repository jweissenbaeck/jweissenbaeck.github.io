// Backt die Hoehenraster fuer die Forsthofgut-Karte aus den freien Terrarium-Kacheln
// (Mapzen / AWS Open Data, fuer Oesterreich basierend auf dem DGM von data.gv.at).
// Aufruf:  npm i sharp  &&  node forsthofgut/tools/bake-terrain.mjs
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const ORIGIN = [12.7144, 47.4393];
// terrarium liefert orthometrische hoehen, cesium rechnet mit ellipsoidhoehen
const GEOID = 48.1;
const KX = 111320 * Math.cos(ORIGIN[1] * Math.PI / 180), KY = 111195;

const grids = [
  { name: 'near', zoom: 15, half: 1600, step: 4 },
  { name: 'far', zoom: 11, half: 25000, step: 75 },
];

const cache = new Map();
async function tile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  if (!cache.has(key)) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`);
    if (!res.ok) throw new Error(`${key}: ${res.status}`);
    const { data, info } = await sharp(Buffer.from(await res.arrayBuffer())).raw().toBuffer({ resolveWithObject: true });
    cache.set(key, { data, ch: info.channels });
  }
  return cache.get(key);
}

async function pixel(z, px, py) {
  const t = await tile(z, Math.floor(px / 256), Math.floor(py / 256));
  const i = ((py & 255) * 256 + (px & 255)) * t.ch;
  return t.data[i] * 256 + t.data[i + 1] + t.data[i + 2] / 256 - 32768;
}

async function height(z, lon, lat) {
  const n = 256 * 2 ** z, r = lat * Math.PI / 180;
  const fx = (lon + 180) / 360 * n - 0.5;
  const fy = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
  const [a, b, c, d] = await Promise.all([pixel(z, x0, y0), pixel(z, x0 + 1, y0), pixel(z, x0, y0 + 1), pixel(z, x0 + 1, y0 + 1)]);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

const meta = { origin: ORIGIN, geoid: GEOID, grids: [] };
for (const g of grids) {
  const n = Math.round(2 * g.half / g.step) + 1;
  const out = new Uint16Array(n * n);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < n; j++) {
    const y = -g.half + j * g.step;
    for (let i = 0; i < n; i++) {
      const x = -g.half + i * g.step;
      const h = await height(g.zoom, ORIGIN[0] + x / KX, ORIGIN[1] + y / KY) + GEOID;
      out[j * n + i] = Math.round(h * 10);
      min = Math.min(min, h); max = Math.max(max, h);
    }
  }
  fs.writeFileSync(path.join(OUT, `height-${g.name}.bin`), Buffer.from(out.buffer));
  meta.grids.push({ name: g.name, half: g.half, step: g.step, size: n });
  console.log(g.name, n, 'x', n, 'min', min.toFixed(1), 'max', max.toFixed(1));
}
fs.writeFileSync(path.join(OUT, 'height.json'), JSON.stringify(meta, null, 1));
