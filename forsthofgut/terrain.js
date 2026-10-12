// gelaende aus den gebackenen hoehenrastern (siehe tools/bake-terrain.mjs).
// nahbereich 4 m raster, fernbereich 75 m raster fuer die berge am horizont.
import { ORIGIN } from './layout.js';

export const KX = 111320 * Math.cos(ORIGIN[1] * Math.PI / 180);
export const KY = 111195;
export const toLocal = (lon, lat) => [(lon - ORIGIN[0]) * KX, (lat - ORIGIN[1]) * KY];
export const toLonLat = (x, y) => [ORIGIN[0] + x / KX, ORIGIN[1] + y / KY];

export function pointInPolygon(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceToEdge(x, y, pts) {
  let best = Infinity;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ax, ay] = pts[j], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}

function bounds(pts, pad = 0) {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
}

export async function loadTerrain(base) {
  const meta = await (await fetch(base + 'data/height.json')).json();
  const grids = await Promise.all(meta.grids.map(async g => {
    const buf = await (await fetch(base + `data/height-${g.name}.bin`)).arrayBuffer();
    return { ...g, data: new Uint16Array(buf) };
  }));
  const [near, far] = grids;

  function sample(g, x, y) {
    const n = g.size;
    const fx = Math.min(Math.max((x + g.half) / g.step, 0), n - 1.001);
    const fy = Math.min(Math.max((y + g.half) / g.step, 0), n - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const d = g.data, k = j * n + i;
    return ((d[k] * (1 - u) + d[k + 1] * u) * (1 - v) + (d[k + n] * (1 - u) + d[k + n + 1] * u) * v) / 10;
  }

  // nah- und fernraster weich ineinander ueberblenden
  const edge = near.half - near.step, blend = 300;
  function baseHeight(x, y) {
    const m = Math.max(Math.abs(x), Math.abs(y));
    if (m >= edge) return sample(far, x, y);
    const h = sample(near, x, y);
    if (m <= edge - blend) return h;
    const t = (m - edge + blend) / blend;
    return h * (1 - t) + sample(far, x, y) * t;
  }

  // ausgehobene flaechen (see, teich, pools): am rand hoechstens `top`,
  // nach innen ueber `slope` meter auf `bottom` abfallend
  const carves = [];
  function carve(pts, top, bottom, slope = 4) {
    carves.push({ pts, top, bottom, slope, box: bounds(pts) });
  }

  // eingeebnete flaechen (sportplaetze) mit weichem uebergang nach aussen
  const flats = [];
  function flatten(pts, level, falloff = 4) {
    flats.push({ pts, level, falloff, box: bounds(pts, falloff) });
  }

  function height(x, y) {
    let h = baseHeight(x, y);
    for (const f of flats) {
      const [x0, y0, x1, y1] = f.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      if (pointInPolygon(x, y, f.pts)) { h = f.level; continue; }
      const d = distanceToEdge(x, y, f.pts);
      if (d < f.falloff) { const k = d / f.falloff, s = k * k * (3 - 2 * k); h = f.level * (1 - s) + h * s; }
    }
    for (const c of carves) {
      const [x0, y0, x1, y1] = c.box;
      if (x < x0 || x > x1 || y < y0 || y > y1 || !pointInPolygon(x, y, c.pts)) continue;
      const d = distanceToEdge(x, y, c.pts);
      h = Math.min(h, c.top - (c.top - c.bottom) * Math.min(1, d / c.slope));
    }
    return h;
  }

  return { baseHeight, height, carve, flatten };
}

export function createTerrainProvider(height) {
  const tilingScheme = new Cesium.GeographicTilingScheme();
  const SIZE = 65;
  const deg = 180 / Math.PI;
  return new Cesium.CustomHeightmapTerrainProvider({
    width: SIZE,
    height: SIZE,
    tilingScheme,
    credit: new Cesium.Credit('Gelände: Terrain Tiles (Mapzen, AWS Open Data), DGM Österreich © data.gv.at'),
    callback(x, y, level) {
      const r = tilingScheme.tileXYToRectangle(x, y, level);
      const out = new Float32Array(SIZE * SIZE);
      for (let j = 0; j < SIZE; j++) {
        const lat = (r.north - (r.north - r.south) * j / (SIZE - 1)) * deg;
        for (let i = 0; i < SIZE; i++) {
          const lon = (r.west + (r.east - r.west) * i / (SIZE - 1)) * deg;
          const [lx, ly] = toLocal(lon, lat);
          out[j * SIZE + i] = height(lx, ly);
        }
      }
      return out;
    },
  });
}
