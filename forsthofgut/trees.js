// wald: fichten und laubbaeume als instanzierte modelle (EXT_mesh_gpu_instancing).
// innerhalb der lichtung stehen baeume nur dort, wo das orthofoto baumkronen zeigt,
// rundherum ist geschlossener wald bis zur weltgrenze.
import { MeshBuilder, writeGlb } from './gltf.js';
import { generatedTextures, mulberry32 } from './textures.js';
import { pointInPolygon, distanceToEdge } from './terrain.js';

// fichte, hoehe 1, etagen aus kegeln mit ausgefranstem rand
function spruce(mb, layers, seg, radius, bark, crown) {
  const trunk = mb.geom(bark), g = mb.geom(crown);
  const tr = 0.016;
  for (let i = 0; i < 4; i++) {
    const a0 = i / 4 * Math.PI * 2, a1 = (i + 1) / 4 * Math.PI * 2;
    const p = (a, z) => [Math.cos(a) * tr, Math.sin(a) * tr, z];
    const nn = [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0];
    const t = [-nn[1], nn[0], 0];
    const idx = [p(a0, -0.02), p(a1, -0.02), p(a1, 0.35), p(a0, 0.35)].map((q, k) => trunk.vertex(q, nn, t, [k === 1 || k === 2 ? 1 : 0, k >= 2 ? 0 : 3]));
    trunk.idx.push(idx[0], idx[1], idx[2], idx[0], idx[2], idx[3]);
  }
  for (let k = 0; k < layers; k++) {
    const f = k / layers;
    const z0 = 0.1 + f * 0.78;
    const z1 = k === layers - 1 ? 1 : z0 + 0.3 - f * 0.12;
    const r = radius * Math.pow(1 - f, 0.85) + 0.025;
    const apex = g.vertex([0, 0, z1], [0, 0, 1], [1, 0, 0], [0.5, 0]);
    const ringIdx = [];
    for (let i = 0; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2 + k * 0.7;
      const c = Math.cos(a), s = Math.sin(a);
      // normalen nach oben gekippt, wirkt weicher
      const nrm = [c * 0.75, s * 0.75, 0.66];
      ringIdx.push(g.vertex([c * r, s * r, z0 - 0.02], nrm, [-s, c, 0], [i / seg * 2, 1]));
    }
    for (let i = 0; i < seg; i++) g.idx.push(ringIdx[i], ringIdx[i + 1], apex);
  }
}

// laubbaum: verbeulte ellipsoid-krone
function broadleaf(mb, bark, leaves) {
  const trunk = mb.geom(bark), g = mb.geom(leaves);
  const tr = 0.025;
  for (let i = 0; i < 4; i++) {
    const a0 = i / 4 * Math.PI * 2, a1 = (i + 1) / 4 * Math.PI * 2;
    const p = (a, z) => [Math.cos(a) * tr, Math.sin(a) * tr, z];
    const nn = [Math.cos((a0 + a1) / 2), Math.sin((a0 + a1) / 2), 0];
    const idx = [p(a0, -0.02), p(a1, -0.02), p(a1, 0.4), p(a0, 0.4)].map((q, k) => trunk.vertex(q, nn, [-nn[1], nn[0], 0], [k === 1 || k === 2 ? 1 : 0, k >= 2 ? 0 : 3]));
    trunk.idx.push(idx[0], idx[1], idx[2], idx[0], idx[2], idx[3]);
  }
  const rings = 5, seg = 8, r = mulberry32(9);
  const grid = [];
  for (let j = 0; j <= rings; j++) {
    const v = j / rings, phi = v * Math.PI;
    const row = [];
    for (let i = 0; i <= seg; i++) {
      const th = (i % seg) / seg * Math.PI * 2;
      const bump = j === 0 || j === rings ? 1 : 0.85 + r() * 0.3;
      const nx = Math.sin(phi) * Math.cos(th), ny = Math.sin(phi) * Math.sin(th), nz = Math.cos(phi);
      const p = [nx * 0.3 * bump, ny * 0.3 * bump, 0.62 + nz * 0.36 * bump];
      row.push(g.vertex(p, [nx, ny, nz * 0.8 + 0.3], [-Math.sin(th), Math.cos(th), 0], [i / seg * 2, v * 2]));
    }
    grid.push(row);
  }
  for (let j = 0; j < rings; j++) for (let i = 0; i < seg; i++) {
    const a = grid[j][i], b = grid[j][i + 1], c = grid[j + 1][i + 1], d = grid[j + 1][i];
    g.idx.push(a, d, c, a, c, b);
  }
}

function noise(x, y) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(i, j), b = h(i + 1, j), c = h(i, j + 1), d = h(i + 1, j + 1);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

// lichtungsrand mit natuerlich ausgefranstem verlauf (gegen den uhrzeigersinn)
export function wobbleClearing(pts, step = 6, amp = 12) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
    const l = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(l / step));
    const nx = (by - ay) / l, ny = -(bx - ax) / l;
    for (let k = 0; k < n; k++) {
      const t = k / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      const o = amp * (0.5 * noise(x / 40, y / 40) + 0.5 * noise(x / 13 + 5, y / 13));
      out.push([x + nx * o, y + ny * o]);
    }
  }
  return out;
}

export function outerBoundary(center, radius) {
  const out = [];
  for (let a = 0; a < 360; a += 3) {
    const r = radius * (0.94 + 0.12 * noise(Math.cos(a * Math.PI / 180) * 3 + 10, Math.sin(a * Math.PI / 180) * 3 + 10));
    out.push([center[0] + Math.cos(a * Math.PI / 180) * r, center[1] + Math.sin(a * Math.PI / 180) * r]);
  }
  return out;
}

function distanceToLine(x, y, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, y - ay - dy * t));
  }
  return best;
}

export async function buildForest({ height, clearing, outer, wings, water, masks, roads, parking, keepClear }) {
  const canopy = (x, y) => masks.at('canopy', x, y) > 0.5;
  const rnd = mulberry32(42);
  const kinds = { a: [], b: [], broad: [] };

  // grundrisse (+ abstand) und wasser freihalten
  const blocked = (x, y) => {
    for (const w of wings) {
      const a = w.axis * Math.PI / 180, dx = x - w.c[0], dy = y - w.c[1];
      const s = dx * Math.cos(a) + dy * Math.sin(a), t = -dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(s) < w.len / 2 + 3 && Math.abs(t) < w.wid / 2 + 3) return true;
    }
    return water.some(p => pointInPolygon(x, y, p) || distanceToEdge(x, y, p) < 2.5)
      || keepClear.some(p => pointInPolygon(x, y, p));
  };

  function plant(x, y, size, broadShare) {
    const r = rnd();
    const kind = r < broadShare ? 'broad' : r < broadShare + (1 - broadShare) * 0.45 ? 'b' : 'a';
    const h = kind === 'broad' ? size * (0.55 + rnd() * 0.25) : size * (0.75 + rnd() * 0.5);
    const wScale = h * (kind === 'broad' ? 0.62 + rnd() * 0.22 : 0.78 + rnd() * 0.25);
    kinds[kind].push(x, y, height(x, y) - 0.4, rnd() * Math.PI * 2, wScale, h);
  }

  // baeume innerhalb der lichtung nach orthofoto
  let inner = 0;
  for (let y = -258; y < 258; y += 3.4) {
    for (let x = -298; x < 298; x += 3.4) {
      const px = x + (rnd() - 0.5) * 3, py = y + (rnd() - 0.5) * 3;
      if (!pointInPolygon(px, py, clearing) || !canopy(px, py) || blocked(px, py)) continue;
      // direkt an den fassaden nur kleinere laubbaeume, damit die gebaeude sichtbar bleiben
      const nearHouse = wings.some(w => Math.hypot(px - w.c[0], py - w.c[1]) < Math.max(w.len, w.wid) / 2 + 14);
      if (nearHouse && rnd() < 0.5) continue;
      plant(px, py, nearHouse ? 12 : 24, nearHouse ? 0.7 : 0.22);
      inner++;
    }
  }

  // einzelbaeume auf den wiesen und entlang der strassen, wie im lageplan
  const hard = (x, y) => masks.at('paved', x, y) > 0.3
    || parking.some(p => pointInPolygon(x, y, p) || distanceToEdge(x, y, p) < 2)
    || roads.some(r => distanceToLine(x, y, r.pts) < r.width / 2 + 2);
  for (let y = -258; y < 258; y += 5) {
    for (let x = -298; x < 298; x += 5) {
      const px = x + (rnd() - 0.5) * 4, py = y + (rnd() - 0.5) * 4;
      if (!pointInPolygon(px, py, clearing) || canopy(px, py) || blocked(px, py) || hard(px, py)) continue;
      const nearRoad = roads.some(r => distanceToLine(px, py, r.pts) < r.width / 2 + 6);
      const nearPath = [[5, 0], [-5, 0], [0, 5], [0, -5]].some(([dx, dy]) => masks.at('paved', px + dx, py + dy) > 0.5);
      const grove = noise(px / 45 + 3, py / 45 + 7) > 0.66;
      const p = nearRoad ? 0.34 : nearPath ? 0.12 : grove ? 0.16 : 0.012;
      if (rnd() > p) continue;
      plant(px, py, 13, 0.55);
      inner++;
    }
  }

  // geschlossener wald ringsum: am rand dicht, weiter draussen lockerer und mit grossen baeumen
  const [cx, cy] = [outer.reduce((s, p) => s + p[0], 0) / outer.length, outer.reduce((s, p) => s + p[1], 0) / outer.length];
  const R = Math.max(...outer.map(p => Math.hypot(p[0] - cx, p[1] - cy)));
  for (const [step, near] of [[4.6, true], [6.4, false]]) {
    for (let y = cy - R; y < cy + R; y += step) {
      for (let x = cx - R; x < cx + R; x += step) {
        const px = x + (rnd() - 0.5) * step * 0.9, py = y + (rnd() - 0.5) * step * 0.9;
        if (!pointInPolygon(px, py, outer) || pointInPolygon(px, py, clearing)) continue;
        const d = distanceToEdge(px, py, clearing);
        if ((d < 150) !== near) continue;
        if (noise(px / 55, py / 55) < 0.16 && d > 25) continue;
        if (rnd() > (near ? 0.96 : 0.9)) continue;
        plant(px, py, near ? 23 : 26, d < 30 ? 0.35 : 0.22);
      }
    }
  }

  const mb = { a: new MeshBuilder(), b: new MeshBuilder(), broad: new MeshBuilder() };
  spruce(mb.a, 6, 8, 0.2, 'bark', 'needlesA');
  spruce(mb.b, 5, 7, 0.17, 'bark', 'needlesB');
  broadleaf(mb.broad, 'bark', 'leaves');

  const gen = generatedTextures();
  const textures = [{ uri: gen.bark }, { uri: gen.needles_a }, { uri: gen.needles_b }, { uri: gen.leaves }];
  const mat = (tex, color, extra = {}) => ({
    pbrMetallicRoughness: { baseColorTexture: { index: tex }, baseColorFactor: [...color, 1], metallicFactor: 0, roughnessFactor: 0.95 },
    ...extra,
  });
  const cutout = { alphaMode: 'MASK', alphaCutoff: 0.45, doubleSided: true };
  const materials = [
    mat(0, [1, 1, 1]),
    mat(1, [0.95, 1, 0.95], cutout),
    mat(2, [0.85, 0.95, 0.95], cutout),
    mat(3, [1, 1, 1], { doubleSided: true }),
  ];
  const matIndex = { bark: 0, needlesA: 1, needlesB: 2, leaves: 3 };

  const nodes = [];
  let count = 0;
  for (const key of ['a', 'b', 'broad']) {
    const list = kinds[key], n = list.length / 6;
    if (!n) continue;
    count += n;
    const translation = new Float32Array(n * 3), rotation = new Float32Array(n * 4), scale = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const [x, y, z, rot, ws, h] = list.slice(i * 6, i * 6 + 6);
      translation.set([x, z, -y], i * 3);
      rotation.set([0, Math.sin(rot / 2), 0, Math.cos(rot / 2)], i * 4);
      scale.set([ws, h, ws], i * 3);
    }
    nodes.push({
      primitives: [...mb[key].byMaterial].map(([m, geom]) => ({ material: matIndex[m], geom })),
      instancing: { translation, rotation, scale },
    });
  }
  return { glb: writeGlb({ nodes, materials, textures }), count, inner };
}
