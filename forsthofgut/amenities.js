// aussenanlagen nach dem lageplan: tennisplatz (23), kleinfeld, reitplatz (21), spielplatz (19),
// einfahrtstor (38), tiefgarage (33) mit stuetzmauer (39), parkplatz mit autos (37),
// sonnenschirme und weidezaun
import { quad, box, facing, beam } from './gltf.js';
import { mulberry32 } from './textures.js';
import { pointInPolygon } from './terrain.js';

const DEG = Math.PI / 180;

function frame(c, axis) {
  const a = axis * DEG, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const at = (s, t) => [c[0] + u[0] * s + n[0] * t, c[1] + u[1] * s + n[1] * t];
  const P = (s, t, z) => [...at(s, t), z];
  return { u, n, at, P };
}

export function rectPts(c, len, wid, axis, pad = 0) {
  const { at } = frame(c, axis);
  const l = len / 2 + pad, w = wid / 2 + pad;
  return [at(-l, -w), at(l, -w), at(l, w), at(-l, w)];
}

const z3 = (p, z) => [p[0], p[1], z];

// doppelseitige flaeche zwischen zwei bodenpunkten, uv in metern
function panel(g, a, b, z0, z1, tile = 1) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]), v = (z1 - z0) / tile;
  quad(g, z3(a, z0), z3(b, z0), z3(b, z1), z3(a, z1), 1, { uv: [[0, v], [len / tile, v], [len / tile, 0], [0, 0]] });
}

function post(g, p, size, z0, z1) {
  box(g, p, [1, 0], size / 2, size / 2, z0, z1, 1);
}

// zaun um ein polygon: pfosten, geflecht, oberer handlauf, optional windschutz
function fence(mb, pts, z, { height, spacing = 3, mesh = 'chainlink', postMat = 'metalGreen', screen = 0, gap = null }) {
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / spacing));
    const pt = f => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    for (let i = 0; i < n; i++) post(mb.geom(postMat), pt(i / n), 0.07, z, z + height);
    const parts = gap && gap.edge === k ? [[0, 0.5 - gap.width / len / 2], [0.5 + gap.width / len / 2, 1]] : [[0, 1]];
    for (const [f0, f1] of parts) {
      panel(mb.geom(mesh), pt(f0), pt(f1), z, z + height, 0.25);
      if (screen) panel(mb.geom('windscreen'), pt(f0), pt(f1), z + 0.03, z + screen);
      beam(mb.geom(postMat), z3(pt(f0), z + height), z3(pt(f1), z + height), 0.05);
    }
  }
}

// holzzaun mit pfosten und zwei latten (reitplatz, weide)
function railFence(mb, pts, z, { closed = true, height = 1.3, rails = [0.65, 1.2], spacing = 2.5, gap = null, H = null }) {
  const g = mb.geom('woodOld');
  const segs = closed ? pts.length : pts.length - 1;
  for (let k = 0; k < segs; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / spacing));
    const zAt = p => H ? H(p[0], p[1]) : z;
    for (let i = 0; i <= n; i++) {
      const f = i / n, p = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      if (gap && gap.edge === k && Math.abs(f - 0.5) * len < gap.width / 2) continue;
      if (i < n || !closed) post(g, p, 0.14, zAt(p) - 0.3, zAt(p) + height);
      if (i === n) continue;
      const q = [a[0] + (b[0] - a[0]) * (i + 1) / n, a[1] + (b[1] - a[1]) * (i + 1) / n];
      const fm = (i + 0.5) / n;
      if (gap && gap.edge === k && Math.abs(fm - 0.5) * len < gap.width / 2 + len / n / 2) continue;
      for (const r of rails) beam(g, z3(p, zAt(p) + r), z3(q, zAt(q) + r), 0.06, 0.14, 2.2);
    }
  }
}

function bench(mb, p, dir, z) {
  const u = [Math.cos(dir), Math.sin(dir)];
  box(mb.geom('woodOld'), p, u, 0.9, 0.2, z + 0.42, z + 0.47, 2.2);
  for (const s of [-0.75, 0.75]) box(mb.geom('metalGrey'), [p[0] + u[0] * s, p[1] + u[1] * s], u, 0.03, 0.18, z, z + 0.42, 1);
}

function tennis(mb, court, z) {
  const { u, n, at } = frame(court.c, court.axis);
  fence(mb, rectPts(court.c, court.len, court.wid, court.axis), z, { height: 3.6, screen: 2.2 });
  // netzpfosten, netz und weisses netzband
  for (const t of [-6.4, 6.4]) box(mb.geom('metalGreen'), at(0, t), u, 0.05, 0.05, z, z + 1.07, 1);
  quad(mb.geom('net'), z3(at(0, -6.4), z + 0.02), z3(at(0, 6.4), z + 0.02), z3(at(0, 6.4), z + 1.0), z3(at(0, -6.4), z + 0.92), 1,
    { uv: [[0, 2], [25.6, 2], [25.6, 0], [0, 0]] });
  beam(mb.geom('white'), z3(at(0, -6.4), z + 0.98), z3(at(0, 0), z + 0.9), 0.05, 0.07);
  beam(mb.geom('white'), z3(at(0, 0), z + 0.9), z3(at(0, 6.4), z + 0.98), 0.05, 0.07);
  // schiedsrichterstuhl am netz
  const chair = at(0, -7.4);
  for (const [ds, dt] of [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]]) {
    beam(mb.geom('white'), z3([chair[0] + u[0] * ds + n[0] * dt, chair[1] + u[1] * ds + n[1] * dt], z),
      z3([chair[0] + u[0] * ds * 0.6 + n[0] * dt * 0.6, chair[1] + u[1] * ds * 0.6 + n[1] * dt * 0.6], z + 1.9), 0.06);
  }
  box(mb.geom('white'), chair, u, 0.3, 0.3, z + 1.9, z + 1.98, 1);
  box(mb.geom('metalGreen'), at(0, -7.62), u, 0.3, 0.04, z + 1.98, z + 2.5, 1);
  // spielerbaenke
  bench(mb, at(-2.2, -7.6), court.axis * DEG, z);
  bench(mb, at(2.2, -7.6), court.axis * DEG, z);
}

function soccer(mb, court, z) {
  const { u, n, at } = frame(court.c, court.axis);
  fence(mb, rectPts(court.c, court.len, court.wid, court.axis), z, { height: 4 });
  const L = court.len / 2 - 0.6;
  for (const e of [-1, 1]) {
    const g = mb.geom('white'), s = e * L, back = e * (L + 1.0);
    const p = t => z3(at(s, t), 0), b = t => z3(at(back, t), 0);
    for (const t of [-1.5, 1.5]) beam(g, [...at(s, t), z], [...at(s, t), z + 2], 0.08);
    beam(g, [...at(s, -1.5), z + 2], [...at(s, 1.5), z + 2], 0.08);
    // tornetz
    const net = mb.geom('net');
    const zz = (q, h) => [q[0], q[1], z + h];
    quad(net, zz(b(-1.5), 0), zz(b(1.5), 0), zz(b(1.5), 1.6), zz(b(-1.5), 1.6), 1, { uv: [[0, 3.2], [6, 3.2], [6, 0], [0, 0]] });
    quad(net, zz(p(-1.5), 2), zz(p(1.5), 2), zz(b(1.5), 1.6), zz(b(-1.5), 1.6), 1, { uv: [[0, 2], [6, 2], [6, 0], [0, 0]] });
    for (const t of [-1.5, 1.5]) quad(net, zz(p(t), 0), zz(b(t), 0), zz(b(t), 1.6), zz(p(t), 2), 1, { uv: [[0, 4], [2, 4], [2, 0], [0, 0]] });
  }
}

// reitplatz mit holzzaun, einfahrt und springparcours
function arena(mb, court, z) {
  const { u, n, at } = frame(court.c, court.axis);
  railFence(mb, rectPts(court.c, court.len, court.wid, court.axis), z, { gap: { edge: 2, width: 4 } });
  const jumps = [[-11, -4, 0], [-2, 5, 0], [8, -3, 0], [14, 5, 90], [-15, 6, 90]];
  for (const [s, t, rot] of jumps) {
    const a = (court.axis + 90 + rot) * DEG, d = [Math.cos(a), Math.sin(a)];
    const c = at(s, t), side = e => [c[0] + d[0] * e * 1.9, c[1] + d[1] * e * 1.9];
    for (const e of [-1, 1]) {
      box(mb.geom('white'), side(e), d, 0.08, 0.08, z, z + 1.6, 1);
      box(mb.geom('stripes'), side(e * 1.12), d, 0.2, 0.25, z, z + 1.3, 0.6);
    }
    for (const h of [0.55, 1.0, 1.25]) beam(mb.geom('stripes'), z3(side(-1), z + h), z3(side(1), z + h), 0.1, 0.1, 0.6);
  }
}

function playground(mb, pg, H) {
  // schaukel
  {
    const { u, n, at } = frame(pg.swing.c, pg.swing.axis), z = H(...pg.swing.c);
    const g = mb.geom('woodOld');
    for (const s of [-1.6, 1.6]) {
      for (const t of [-0.9, 0.9]) beam(g, z3(at(s, t), z - 0.2), z3(at(s, 0), z + 2.4), 0.12);
    }
    beam(g, z3(at(-1.7, 0), z + 2.45), z3(at(1.7, 0), z + 2.45), 0.14);
    for (const s of [-0.7, 0.7]) {
      for (const e of [-0.22, 0.22]) beam(mb.geom('metalGrey'), z3(at(s + e, 0), z + 2.4), z3(at(s + e, 0), z + 0.48), 0.025);
      box(mb.geom('opening'), at(s, 0), u, 0.25, 0.1, z + 0.44, z + 0.48, 1);
    }
  }
  // kletterturm mit rutsche
  {
    const { u, n, at } = frame(pg.tower.c, pg.tower.axis), z = H(...pg.tower.c);
    const g = mb.geom('woodOld');
    for (const [s, t] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) box(g, at(s, t), u, 0.06, 0.06, z - 0.2, z + 2.6, 2.2);
    box(g, at(0, 0), u, 0.75, 0.75, z + 1.2, z + 1.28, 2.2);
    const r = mb.geom('roofGrey');
    for (const e of [-1, 1]) facing(r, [z3(at(-0.95, e * 0.95), z + 2.55), z3(at(0.95, e * 0.95), z + 2.55), z3(at(0.95, 0), z + 3.1), z3(at(-0.95, 0), z + 3.1)], [n[0] * e, n[1] * e, 1], 4);
    beam(mb.geom('slide'), z3(at(0.75, 0), z + 1.25), z3(at(3.3, 0), z + 0.15), 0.55, 0.06);
    for (const e of [-0.3, 0.3]) beam(mb.geom('woodOld'), z3(at(-0.75, e), z + 1.25), z3(at(-1.6, e), z), 0.06);
    for (let k = 1; k < 5; k++) {
      const f = k / 5, s = -0.75 - 0.85 * f, zz = z + 1.25 * (1 - f);
      beam(mb.geom('woodOld'), z3(at(s, -0.3), zz), z3(at(s, 0.3), zz), 0.04);
    }
  }
  // sandkiste
  {
    const { u, n, at } = frame(pg.sandbox.c, pg.sandbox.axis), z = H(...pg.sandbox.c);
    const g = mb.geom('woodOld');
    for (const e of [-1, 1]) {
      box(g, at(0, e * 1.5), u, 1.6, 0.1, z - 0.2, z + 0.25, 2.2);
      box(g, at(e * 1.5, 0), n, 1.4, 0.1, z - 0.2, z + 0.25, 2.2);
    }
    facing(mb.geom('sandMat'), [z3(at(-1.4, -1.4), z + 0.15), z3(at(1.4, -1.4), z + 0.15), z3(at(1.4, 1.4), z + 0.15), z3(at(-1.4, 1.4), z + 0.15)], [0, 0, 1], 2);
  }
}

// holztor mit satteldach und schild ueber der zufahrt
function gate(mb, gt, H) {
  const { u, n, at } = frame(gt.c, gt.axis), z = H(...gt.c);
  const half = gt.span / 2, g = mb.geom('woodOld');
  for (const e of [-1, 1]) {
    box(g, at(e * half, 0), u, 0.25, 0.25, z - 0.3, z + 5.1, 2.2);
    box(mb.geom('stone'), at(e * half, 0), u, 0.4, 0.4, z - 0.3, z + 0.6, 2.5);
    // kopfbaender
    beam(g, z3(at(e * half, 0), z + 3.9), z3(at(e * (half - 1.1), 0), z + 4.7), 0.16);
  }
  box(g, at(0, 0), u, half + 0.6, 0.22, z + 4.7, z + 5.2, 2.2);
  const r = mb.geom('roofGrey');
  for (const e of [-1, 1]) {
    facing(r, [z3(at(-half - 1, e * 0.85), z + 5.25), z3(at(half + 1, e * 0.85), z + 5.25), z3(at(half + 1, 0), z + 5.75), z3(at(-half - 1, 0), z + 5.75)],
      [n[0] * e, n[1] * e, 1], 4);
    facing(mb.geom('woodDark'), [z3(at(-half - 1, e * 0.85), z + 5.15), z3(at(half + 1, e * 0.85), z + 5.15), z3(at(half + 1, 0), z + 5.65), z3(at(-half - 1, 0), z + 5.65)],
      [0, 0, -1], 2.2);
  }
  // schild beidseitig
  for (const e of [-1, 1]) {
    const pts = [z3(at(-2.2, e * 0.24), z + 3.9), z3(at(2.2, e * 0.24), z + 3.9), z3(at(2.2, e * 0.24), z + 4.6), z3(at(-2.2, e * 0.24), z + 4.6)];
    const uv = e > 0 ? [[1, 1], [0, 1], [0, 0], [1, 0]] : [[0, 1], [1, 1], [1, 0], [0, 0]];
    facing(mb.geom('sign'), pts, [n[0] * e, n[1] * e, 0], 1, { uv });
  }
  box(mb.geom('woodDark'), at(0, 0), u, 2.3, 0.22, z + 3.85, z + 4.65, 2.2);
  for (const e of [-1.6, 1.6]) beam(mb.geom('metalGrey'), z3(at(e, 0), z + 4.65), z3(at(e, 0), z + 4.7), 0.04);
}

// tiefgarageneinfahrt: abfallende rampe zwischen betonwaenden, holzueberdachung, dunkles tor
function garage(mb, gar, H, out) {
  const { u, n, at, P } = frame(gar.c, gar.axis);
  const L = gar.len / 2, W = gar.wid / 2;
  const zTop = H(...at(L + 1, 0)), zBot = zTop - gar.depth;
  const zr = s => zBot + (zTop - zBot) * (s + L) / (2 * L);
  const up = [0, 0, 1];
  facing(mb.geom('asphaltMat'), [P(-L, -W, zBot), P(L, -W, zTop), P(L, W, zTop), P(-L, W, zBot)], up, 3);
  // seitenwaende mit holzverkleideter bruestung
  const N = 7;
  for (const e of [-1, 1]) {
    for (let i = 0; i < N; i++) {
      const s0 = -L + 2 * L * i / N, s1 = -L + 2 * L * (i + 1) / N;
      const top = Math.max(H(...at(s0, e * (W + 0.6))), H(...at(s1, e * (W + 0.6))), zr(s1)) + 0.9;
      facing(mb.geom('concrete'), [P(s0, e * W, zr(s0) - 0.1), P(s1, e * W, zr(s1) - 0.1), P(s1, e * W, top), P(s0, e * W, top)], [-n[0] * e, -n[1] * e, 0], 3);
      facing(mb.geom('woodOld'), [P(s0, e * (W + 0.3), top - 1.0), P(s1, e * (W + 0.3), top - 1.0), P(s1, e * (W + 0.3), top), P(s0, e * (W + 0.3), top)], [n[0] * e, n[1] * e, 0], 2.2);
      facing(mb.geom('woodDark'), [P(s0, e * W, top), P(s1, e * W, top), P(s1, e * (W + 0.3), top), P(s0, e * (W + 0.3), top)], up, 2.2);
    }
  }
  // tor im hang
  const zRoof = zTop + 2.9;
  facing(mb.geom('opening'), [P(-L, -W, zBot), P(-L, W, zBot), P(-L, W, zBot + 2.7), P(-L, -W, zBot + 2.7)], [u[0], u[1], 0]);
  facing(mb.geom('concrete'), [P(-L + 0.02, -W - 0.3, zBot + 2.7), P(-L + 0.02, W + 0.3, zBot + 2.7), P(-L + 0.02, W + 0.3, zRoof), P(-L + 0.02, -W - 0.3, zRoof)], [u[0], u[1], 0], 3);
  facing(mb.geom('woodOld'), [P(-L + 0.06, -W - 0.3, zRoof - 1.4), P(-L + 0.06, W + 0.3, zRoof - 1.4), P(-L + 0.06, W + 0.3, zRoof), P(-L + 0.06, -W - 0.3, zRoof)], [u[0], u[1], 0], 2.2);
  // vordach ueber dem tor auf holzstuetzen
  const r0 = -L - 0.4, r1 = -L + 4.5, rw = W + 0.8;
  facing(mb.geom('roofGrey'), [P(r0, -rw, zRoof + 0.35), P(r1, -rw, zRoof + 0.35), P(r1, rw, zRoof + 0.35), P(r0, rw, zRoof + 0.35)], up, 4);
  facing(mb.geom('woodOld'), [P(r0, -rw, zRoof), P(r1, -rw, zRoof), P(r1, rw, zRoof), P(r0, rw, zRoof)], [0, 0, -1], 2.2);
  const rc = [P(r0, -rw, 0), P(r1, -rw, 0), P(r1, rw, 0), P(r0, rw, 0)];
  for (let k = 0; k < 4; k++) {
    const a = rc[k], b = rc[(k + 1) % 4];
    facing(mb.geom('woodDark'), [z3(a, zRoof), z3(b, zRoof), z3(b, zRoof + 0.35), z3(a, zRoof + 0.35)],
      [(a[0] + b[0]) / 2 - gar.c[0], (a[1] + b[1]) / 2 - gar.c[1], 0], 2.2);
  }
  for (const e of [-1, 1]) box(mb.geom('woodOld'), at(r1 - 0.2, e * (W + 0.45)), u, 0.15, 0.15, zr(r1) - 0.2, zRoof, 2.2);
  // P-schild
  box(mb.geom('metalGrey'), at(L + 0.8, -W - 1.2), u, 0.04, 0.04, zTop, zTop + 2.6, 1);
  facing(mb.geom('parkingSign'), [P(L + 0.85, -W - 1.55, zTop + 1.9), P(L + 0.85, -W - 0.85, zTop + 1.9), P(L + 0.85, -W - 0.85, zTop + 2.6), P(L + 0.85, -W - 1.55, zTop + 2.6)],
    [u[0], u[1], 0], 1, { uv: [[0, 1], [1, 1], [1, 0], [0, 0]] });
  out.carves.push({ pts: rectPts(gar.c, gar.len, gar.wid + 0.6, gar.axis), top: zBot - 0.3, bottom: zBot - 0.6, slope: 0.05 });
}

// geschwungene stuetzmauer mit holzverkleidung
function curvedWall(mb, cw, H) {
  const pts = cw.pts.map(p => {
    const dx = p[0] - cw.around[0], dy = p[1] - cw.around[1], l = Math.hypot(dx, dy);
    return [p[0] + dx / l * cw.offset, p[1] + dy / l * cw.offset];
  });
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], za = H(...a), zb = H(...b);
    beam(mb.geom('woodOld'), [a[0], a[1], (za + zb) / 2 + 0.2], [b[0], b[1], (za + zb) / 2 + 0.2], 0.35, 2.4, 2.2);
    box(mb.geom('woodDark'), a, [1, 0], 0.22, 0.22, za - 1, za + 1.45, 2.2);
  }
}

function parasol(mb, p, z, { loungers = 0, table = false, rnd }) {
  beam(mb.geom('white'), [p[0], p[1], z], [p[0], p[1], z + 2.5], 0.05);
  const rim = [], R = 1.45;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * Math.PI * 2;
    rim.push([p[0] + Math.cos(a) * R, p[1] + Math.sin(a) * R, z + 2.2]);
  }
  const apex = [p[0], p[1], z + 2.7];
  for (let k = 0; k < 8; k++) facing(mb.geom('fabric'), [rim[k], rim[(k + 1) % 8], apex], [0, 0, 1], 2);
  if (table) {
    box(mb.geom('woodOld'), p, [1, 0], 0.45, 0.45, z + 0.7, z + 0.75, 2.2);
    for (const a of [0, 1.57, 3.14, 4.71]) {
      box(mb.geom('woodDark'), [p[0] + Math.cos(a) * 0.85, p[1] + Math.sin(a) * 0.85], [Math.cos(a), Math.sin(a)], 0.22, 0.22, z, z + 0.45, 2.2);
    }
  }
  for (let i = 0; i < loungers; i++) {
    const a = rnd() * 0.3 + Math.PI / 2, d = [Math.cos(a), Math.sin(a)];
    const c = [p[0] + (i ? 0.9 : -0.9), p[1] - 0.4];
    box(mb.geom('white'), c, d, 0.95, 0.32, z + 0.22, z + 0.36, 1);
    beam(mb.geom('white'), [c[0] + d[0] * 0.5, c[1] + d[1] * 0.5, z + 0.36], [c[0] + d[0] * 0.95, c[1] + d[1] * 0.95, z + 0.85], 0.62, 0.06);
  }
}

// stellplaetze: reihen quer zur hauptachse, 2,5 m breit, 5 m tief, 6,5 m fahrgasse
export function parkingStalls(poly, axis) {
  const a = axis * DEG, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const st = poly.map(p => [p[0] * u[0] + p[1] * u[1], p[0] * n[0] + p[1] * n[1]]);
  const s0 = Math.min(...st.map(p => p[0])), s1 = Math.max(...st.map(p => p[0]));
  const t0 = Math.min(...st.map(p => p[1])), t1 = Math.max(...st.map(p => p[1]));
  const W = (s, t) => [u[0] * s + n[0] * t, u[1] * s + n[1] * t];
  const stalls = [], lines = [];
  for (let tb = t0 + 0.5; tb + 5 <= t1; tb += 16.5) {
    for (const [ta, tbEnd, facingSign] of [[tb, tb + 5, 1], [tb + 11.5, tb + 16.5, -1]]) {
      if (tbEnd > t1) continue;
      for (let s = s0 + 1; s + 2.5 <= s1; s += 2.5) {
        const corners = [W(s, ta), W(s + 2.5, ta), W(s + 2.5, tbEnd), W(s, tbEnd)];
        if (!corners.every(c => pointInPolygon(c[0], c[1], poly))) continue;
        stalls.push({ c: W(s + 1.25, (ta + tbEnd) / 2), dir: axis + 90 * facingSign });
        lines.push([W(s, ta), W(s, tbEnd)], [W(s + 2.5, ta), W(s + 2.5, tbEnd)]);
      }
    }
  }
  return { stalls, lines };
}

function car(mb, p, dirDeg, z, paint) {
  const a = dirDeg * DEG, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const at = (s, t) => [p[0] + u[0] * s + n[0] * t, p[1] + u[1] * s + n[1] * t];
  box(mb.geom(paint), p, u, 2.2, 0.88, z + 0.32, z + 0.95, 1);
  box(mb.geom('carGlass'), at(-0.25, 0), u, 1.15, 0.78, z + 0.95, z + 1.4, 1, { top: false });
  facing(mb.geom(paint), [z3(at(-1.35, -0.76), z + 1.42), z3(at(0.85, -0.76), z + 1.42), z3(at(0.85, 0.76), z + 1.42), z3(at(-1.35, 0.76), z + 1.42)], [0, 0, 1]);
  for (const s of [-1.4, 1.4]) for (const t of [-0.8, 0.8]) box(mb.geom('tire'), at(s, t), u, 0.33, 0.12, z, z + 0.66, 1);
}

export function buildAmenities(mb, { H, courts, garage: gar, curvedWall: cw, gate: gt, playground: pg, parasols, parking, fenceLine }) {
  const out = { carves: [], flattens: [], clear: [], lines: [] };
  const rnd = mulberry32(77);
  for (const c of courts) {
    const pts = rectPts(c.c, c.len, c.wid, c.axis);
    const z = pts.concat([c.c]).reduce((s, p) => s + H(...p), 0) / 5;
    c.level = z;
    out.flattens.push({ pts, level: z });
    out.clear.push(rectPts(c.c, c.len, c.wid, c.axis, 2.5));
    if (c.type === 'tennis') tennis(mb, c, z);
    else if (c.type === 'soccer') soccer(mb, c, z);
    else arena(mb, c, z);
  }
  playground(mb, pg, H);
  for (const k of ['swing', 'tower', 'sandbox']) out.clear.push(rectPts(pg[k].c, 6, 6, pg[k].axis));
  gate(mb, gt, H);
  garage(mb, gar, H, out);
  out.clear.push(rectPts(gar.c, gar.len + 4, gar.wid + 4, gar.axis));
  curvedWall(mb, cw, H);
  for (const p of parasols) parasol(mb, p.c, H(...p.c), { ...p, rnd });
  railFence(mb, fenceLine, 0, { closed: false, height: 1.2, rails: [0.5, 1.0], spacing: 3, H });

  const paints = ['carWhite', 'carBlack', 'carSilver', 'carBlue', 'carGrey', 'carWhite', 'carSilver', 'carRed'];
  for (const lot of parking) {
    const { stalls, lines } = parkingStalls(lot.pts, lot.axis);
    out.lines.push(...lines);
    for (const s of stalls) {
      if (rnd() > lot.occupancy) continue;
      car(mb, s.c, s.dir + (rnd() < 0.5 ? 0 : 180), H(...s.c), paints[Math.floor(rnd() * paints.length)]);
    }
  }
  return out;
}
