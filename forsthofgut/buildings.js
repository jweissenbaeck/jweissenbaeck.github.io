// erzeugt alle gebaeude als ein glb: fluegel mit satteldach, walmdach oder flachdach,
// fenster, balkone mit blumenkaesten, kamine, solarflaechen und pools.
import { MeshBuilder, quad, box, facing, writeGlb } from './gltf.js';
import { generatedTextures } from './textures.js';

const DEG = Math.PI / 180;

const STYLE = {
  chalet: { ground: 3.4, floor: 3.0, knee: 0.5, pitch: 22, eave: 1.7, gable: 1.5, plinth: 'stone', chimneys: 2 },
  house: { ground: 3.2, floor: 2.9, knee: 0.4, pitch: 24, eave: 1.3, gable: 1.1, plinth: 'stone', chimneys: 1 },
  modern: { ground: 3.2, floor: 3.1, knee: 0.2, pitch: 18, eave: 0.9, gable: 0.7, plinth: 'stone', chimneys: 0 },
  spa: { ground: 3.6, floor: 3.3, knee: 0, plinth: 'stone', chimneys: 0 },
  flat: { ground: 3.2, floor: 3.0, knee: 0, plinth: 'concrete', chimneys: 0 },
  hall: { ground: 7, floor: 7, knee: 0.3, pitch: 15, eave: 0.7, gable: 0.6, plinth: 'concrete', chimneys: 0 },
  hut: { ground: 2.6, floor: 2.6, knee: 0.2, pitch: 28, eave: 0.6, gable: 0.5, plinth: 'stone', chimneys: 0 },
};

// meter pro texturwiederholung
const TEXSCALE = { plaster: 3, woodOld: 2.2, woodNew: 2.0, woodDark: 2.2, stone: 2.5, concrete: 3, gravel: 3, deckStone: 2, tiles: 2 };

const ROOF = { green: 'roofGreen', dark: 'roofDark', grey: 'roofGrey', brown: 'roofBrown', light: 'roofLight' };

function createMaterials() {
  const gen = generatedTextures();
  const textures = [], index = new Map();
  const tex = name => {
    if (!index.has(name)) {
      const uri = name === 'water_nor' ? Cesium.buildModuleUrl('Assets/Textures/waterNormals.jpg') : gen[name] ?? `tex/${name}.jpg`;
      textures.push({ uri });
      index.set(name, textures.length - 1);
    }
    return index.get(name);
  };
  const m = (color, rough, metal = 0, map = null, normal = null, extra = {}) => ({
    pbrMetallicRoughness: {
      ...(map ? { baseColorTexture: { index: tex(map) } } : {}),
      baseColorFactor: [...color, 1],
      metallicFactor: metal,
      roughnessFactor: rough,
    },
    ...(normal ? { normalTexture: { index: tex(normal) } } : {}),
    ...extra,
  });
  const defs = {
    plaster: m([1, 0.99, 0.96], 0.92, 0, 'plaster_diff', 'plaster_nor'),
    woodOld: m([1, 0.76, 0.52], 0.85, 0, 'wood_old_diff', 'wood_old_nor'),
    woodNew: m([0.92, 0.84, 0.75], 0.85, 0, 'wood_new_diff', 'wood_new_nor'),
    woodDark: m([0.62, 0.42, 0.28], 0.8, 0, 'wood_old_diff', 'wood_old_nor'),
    stone: m([0.85, 0.84, 0.8], 0.9, 0, 'stone_diff', 'stone_nor'),
    concrete: m([0.62, 0.62, 0.6], 0.95, 0, 'plaster_diff'),
    deckStone: m([0.86, 0.82, 0.74], 0.8, 0, 'plaster_diff'),
    gravel: m([0.5, 0.5, 0.48], 0.95, 0, 'stone_diff'),
    roofGreen: m([0.5, 0.58, 0.52], 0.6, 0.25, 'roof_diff', 'roof_nor'),
    roofDark: m([0.3, 0.31, 0.33], 0.5, 0.4, 'roof_dark_diff', 'roof_nor'),
    roofGrey: m([0.74, 0.77, 0.82], 0.5, 0.35, 'roof_dark_diff', 'roof_nor'),
    roofBrown: m([0.66, 0.5, 0.45], 0.55, 0.3, 'roof_dark_diff', 'roof_nor'),
    roofLight: m([0.92, 0.92, 0.92], 0.5, 0.35, 'roof_dark_diff', 'roof_nor'),
    glass: m([0.22, 0.27, 0.31], 0.12, 0.85),
    frame: m([0.3, 0.2, 0.13], 0.7),
    frameDark: m([0.1, 0.1, 0.1], 0.5, 0.3),
    shutter: m([0.2, 0.33, 0.22], 0.7),
    trim: m([0.92, 0.92, 0.9], 0.8),
    tiles: m([0.55, 0.8, 0.85], 0.3),
    railing: m([1, 1, 1], 0.85, 0, 'railing', null, { alphaMode: 'MASK', alphaCutoff: 0.5, doubleSided: true }),
    railingModern: m([1, 1, 1], 0.6, 0.2, 'railing_modern', null, { alphaMode: 'MASK', alphaCutoff: 0.5, doubleSided: true }),
    solar: m([1, 1, 1], 0.2, 0.5, 'solar'),
    lakeWater: m([0.05, 0.3, 0.36], 0.05, 0, null, 'water_nor'),
    // aussenanlagen
    metalGreen: m([0.07, 0.2, 0.11], 0.45, 0.6),
    metalGrey: m([0.45, 0.46, 0.48], 0.4, 0.8),
    chainlink: m([1, 1, 1], 0.5, 0.5, 'chainlink', null, { alphaMode: 'MASK', alphaCutoff: 0.35, doubleSided: true }),
    windscreen: m([0.06, 0.24, 0.12], 0.9, 0, null, null, { doubleSided: true }),
    net: m([1, 1, 1], 0.8, 0, 'net', null, { alphaMode: 'MASK', alphaCutoff: 0.35, doubleSided: true }),
    white: m([0.94, 0.94, 0.92], 0.6),
    stripes: m([1, 1, 1], 0.6, 0, 'stripes'),
    sign: m([1, 1, 1], 0.7, 0, 'sign'),
    parkingSign: m([1, 1, 1], 0.5, 0, 'parking_sign'),
    opening: m([0.015, 0.015, 0.018], 1),
    asphaltMat: m([0.28, 0.28, 0.3], 0.9, 0, 'plaster_diff'),
    fabric: m([0.95, 0.92, 0.85], 0.9, 0, null, null, { doubleSided: true }),
    slide: m([0.78, 0.16, 0.1], 0.35),
    sandMat: m([0.85, 0.77, 0.6], 1, 0, 'plaster_diff'),
    tire: m([0.03, 0.03, 0.03], 0.8),
    carGlass: m([0.03, 0.04, 0.05], 0.08, 0.8),
    carWhite: m([0.88, 0.88, 0.88], 0.3, 0.4),
    carBlack: m([0.03, 0.03, 0.035], 0.25, 0.5),
    carSilver: m([0.55, 0.56, 0.58], 0.3, 0.8),
    carBlue: m([0.06, 0.12, 0.28], 0.3, 0.6),
    carRed: m([0.5, 0.04, 0.04], 0.3, 0.5),
    carGrey: m([0.28, 0.29, 0.31], 0.3, 0.6),
    poolWater: m([0.3, 0.7, 0.75], 0.03, 0, null, 'water_nor', { alphaMode: 'BLEND' }),
  };
  defs.lakeWater.normalTexture.scale = 0.35;
  defs.poolWater.normalTexture.scale = 0.2;
  defs.poolWater.pbrMetallicRoughness.baseColorFactor[3] = 0.72;
  const names = Object.keys(defs);
  return { textures, materials: names.map(n => ({ name: n, ...defs[n] })), indexOf: n => names.indexOf(n) };
}

function windowSpec(w, f, balcony, side) {
  switch (w.style) {
    case 'chalet':
    case 'house':
      return balcony
        ? { w: 1.1, h: 2.25, sill: 0.02, spacing: 3.1, margin: 1.6, frame: 'frame' }
        : { w: 1.05, h: 1.3, sill: 0.95, spacing: 3.1, margin: 1.6, frame: 'frame', muntins: true, shutters: w.style === 'chalet' ? f <= 1 : f === 0 };
    case 'modern': return { w: 2.4, h: 2.45, sill: 0.15, spacing: 3.4, margin: 1.2, frame: 'frameDark' };
    case 'spa': return { w: 2.4, h: 2.4, sill: 0.4, spacing: 3.4, margin: 1.0, frame: 'frameDark' };
    case 'flat': return f === 0
      ? { w: 2.2, h: 2.3, sill: 0.25, spacing: 3.2, margin: 1.2, frame: 'frameDark' }
      : { w: 1.6, h: 1.8, sill: 0.7, spacing: 3.0, margin: 1.2, frame: 'frameDark' };
    case 'hall': return w.stable && side.long
      ? { w: 1.3, h: 2.3, sill: 0, spacing: 3.4, margin: 2.4, frame: 'woodDark', door: true }
      : side.long ? { w: 3.4, h: 1.3, sill: (w.floorHeight ?? 7) - 2.1, spacing: 6, margin: 3, frame: 'frameDark' } : null;
    case 'hut': return side.long ? { w: 0.8, h: 0.9, sill: 1.0, spacing: 2.6, margin: 1.6, frame: 'frame', muntins: true } : null;
  }
  return null;
}

function wallMaterial(style, f) {
  switch (style) {
    case 'chalet': return f <= 1 ? 'plaster' : 'woodOld';
    case 'house': return f === 0 ? 'plaster' : 'woodOld';
    case 'modern': return 'woodNew';
    case 'hall': return 'woodOld';
    case 'spa': return f === 0 ? 'plaster' : 'woodOld';
    case 'flat': return f === 0 ? 'plaster' : 'woodNew';
    case 'hut': return 'woodOld';
    default: return 'plaster';
  }
}

function buildWing(mb, w, H, out) {
  const S = STYLE[w.style];
  const a = w.axis * DEG;
  const u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
  const hl = w.len / 2, hw = w.wid / 2;
  const P = (s, t, z) => [w.c[0] + u[0] * s + n[0] * t, w.c[1] + u[1] * s + n[1] * t, z];

  const hs = [];
  for (const s of [-hl, 0, hl]) for (const t of [-hw, 0, hw]) { const p = P(s, t, 0); hs.push(H(p[0], p[1])); }
  const hMin = Math.min(...hs), hMean = hs.reduce((x, y) => x + y) / hs.length;
  const floor0 = w.floor0 ?? hMean + 0.15;
  out.floor0[w.id] = floor0;

  const z = [floor0];
  for (let f = 0; f < w.floors; f++) z.push(z[f] + (w.floorHeight ?? (f === 0 ? S.ground : S.floor)));
  const top = z[w.floors];
  const roofType = w.roof ?? 'gable';
  const eave = roofType === 'flat' ? top : top + S.knee;
  const topMat = wallMaterial(w.style, w.floors - 1);

  const ring = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]];
  const sides = ring.map((p0, k) => {
    const p1 = ring[(k + 1) % 4];
    const A = P(p0[0], p0[1], 0), B = P(p1[0], p1[1], 0);
    const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
    return { A, len, d, o: [d[1], -d[0]], long: k % 2 === 0 };
  });
  const F = (sd, s, off, zz) => [sd.A[0] + sd.d[0] * s + sd.o[0] * off, sd.A[1] + sd.d[1] * s + sd.o[1] * off, zz];
  const fquad = (mat, sd, s0, s1, z0, z1, off, scale = 1, opts) =>
    quad(mb.geom(mat), F(sd, s0, off, z0), F(sd, s1, off, z0), F(sd, s1, off, z1), F(sd, s0, off, z1), scale, opts);

  // sockel und waende
  const plinthTop = floor0 + 0.35;
  for (const sd of sides) {
    fquad(S.plinth, sd, 0, sd.len, hMin - 2, plinthTop, 0, TEXSCALE[S.plinth]);
    for (let f = 0; f < w.floors; f++) {
      const mat = wallMaterial(w.style, f);
      const z0 = f === 0 ? plinthTop : z[f];
      const z1 = f === w.floors - 1 ? (roofType === 'flat' ? top + 0.7 : eave) : z[f + 1];
      fquad(mat, sd, 0, sd.len, z0, z1, 0, TEXSCALE[mat]);
      // gesims zwischen putz und holz
      if (f > 0 && mat !== wallMaterial(w.style, f - 1)) fquad('woodDark', sd, -0.05, sd.len + 0.05, z[f] - 0.14, z[f] + 0.06, 0.05, 2.2);
    }
  }

  const southSide = sides.filter(s => s.long).sort((p, q) => p.o[1] - q.o[1])[0];
  const balcony = (sd, f) => {
    if (f === 0) return false;
    if (w.style === 'chalet') return sd.long || f >= 2;
    if (w.style === 'house') return sd === southSide;
    if (w.style === 'modern') return sd.long;
    return false;
  };

  // fenster
  for (const sd of sides) {
    for (let f = 0; f < w.floors; f++) {
      const spec = windowSpec(w, f, balcony(sd, f), sd);
      if (!spec) continue;
      const count = Math.floor((sd.len - spec.margin) / spec.spacing) + 1;
      if (sd.len < spec.w + 0.8 || count < 1) continue;
      const step = count > 1 ? Math.min(spec.spacing, (sd.len - spec.margin) / (count - 1)) : 0;
      const start = (sd.len - (count - 1) * step) / 2;
      for (let i = 0; i < count; i++) {
        const s = start + i * step, x = spec.w / 2, zb = z[f] + spec.sill, zt = zb + spec.h;
        fquad(spec.frame, sd, s - x - 0.08, s + x + 0.08, zb - 0.08, zt + 0.08, 0.03);
        if (spec.door) {
          // stalltuer: unten geschlossen, oben offen
          fquad('woodOld', sd, s - x, s + x, zb, zb + spec.h * 0.55, 0.05, 2.2);
          fquad('opening', sd, s - x, s + x, zb + spec.h * 0.55, zt, 0.04);
          continue;
        }
        fquad('glass', sd, s - x, s + x, zb, zt, 0.05);
        if (spec.muntins) {
          fquad(spec.frame, sd, s - 0.035, s + 0.035, zb, zt, 0.065);
          fquad(spec.frame, sd, s - x, s + x, zb + spec.h * 0.62 - 0.035, zb + spec.h * 0.62 + 0.035, 0.065);
        }
        if (spec.shutters) {
          fquad('shutter', sd, s - x - 0.1 - x * 0.95, s - x - 0.1, zb - 0.03, zt + 0.03, 0.06);
          fquad('shutter', sd, s + x + 0.1, s + x + 0.1 + x * 0.95, zb - 0.03, zt + 0.03, 0.06);
        }
      }
    }
  }

  // balkone
  const up = [0, 0, 1], down = [0, 0, -1];
  for (const sd of sides) {
    for (let f = 1; f < w.floors; f++) {
      if (!balcony(sd, f)) continue;
      const modern = w.style === 'modern';
      const D = modern ? 1.8 : 1.45;
      const wrap = w.style === 'chalet' && f >= 2 && sd.long;
      const s0 = wrap ? -D : 0.3, s1 = wrap ? sd.len + D : sd.len - 0.3;
      const zf = z[f];
      const slab = modern ? 'concrete' : 'woodDark';
      facing(mb.geom(slab), [F(sd, s0, 0, zf), F(sd, s1, 0, zf), F(sd, s1, D, zf), F(sd, s0, D, zf)], up, 2.2);
      facing(mb.geom(slab), [F(sd, s0, 0, zf - 0.22), F(sd, s1, 0, zf - 0.22), F(sd, s1, D, zf - 0.22), F(sd, s0, D, zf - 0.22)], down, 2.2);
      fquad(slab, sd, s0, s1, zf - 0.22, zf, D, 2.2);
      const rail = modern ? 'railingModern' : 'railing', rs = modern ? 1.0 : 1.2;
      fquad(rail, sd, s0, s1, zf, zf + 1.0, D - 0.04, 1, { uv: [[s0 / rs, 1], [s1 / rs, 1], [s1 / rs, 0], [s0 / rs, 0]] });
      for (const s of [s0, s1]) {
        quad(mb.geom(rail), F(sd, s, 0, zf), F(sd, s, D - 0.04, zf), F(sd, s, D - 0.04, zf + 1), F(sd, s, 0, zf + 1), 1,
          { uv: [[0, 1], [D / rs, 1], [D / rs, 0], [0, 0]] });
      }
    }
  }

  // dach
  const roofMat = ROOF[w.roofColor ?? 'grey'];
  let solarSide = 0;
  if (roofType === 'flat') flatRoof();
  else {
    const tp = Math.tan(S.pitch * DEG), th = 0.3;
    const zR = eave + hw * tp;
    if (roofType === 'hip') hipRoof(tp, th, zR); else gableRoof(tp, th, zR);
    if (w.solar) solarPanels(tp, th, zR, roofType === 'hip');
    if (roofType === 'gable' && (w.style === 'chalet' || w.style === 'house') && w.wid >= 13 && w.len >= 14) dormers(tp, th);
    chimneys(tp, zR);
  }

  function gableRoof(tp, th, zR) {
    const oe = S.eave, og = S.gable;
    const sE = hl + og, tE = hw + oe, zE = eave - oe * tp;
    const g = mb.geom(roofMat), soffit = mb.geom('woodOld'), fascia = mb.geom('woodDark');
    for (const sg of [-1, 1]) {
      const outward = [n[0] * sg, n[1] * sg, 0];
      facing(g, [P(-sE, sg * tE, zE + th), P(sE, sg * tE, zE + th), P(sE, 0, zR + th), P(-sE, 0, zR + th)], [outward[0], outward[1], 1], 4);
      facing(soffit, [P(-sE, sg * tE, zE), P(sE, sg * tE, zE), P(sE, 0, zR), P(-sE, 0, zR)], down, 2.2);
      facing(fascia, [P(-sE, sg * tE, zE), P(sE, sg * tE, zE), P(sE, sg * tE, zE + th), P(-sE, sg * tE, zE + th)], outward, 2.2);
      for (const e of [-1, 1]) {
        facing(fascia, [P(e * sE, sg * tE, zE), P(e * sE, 0, zR), P(e * sE, 0, zR + th), P(e * sE, sg * tE, zE + th)], [u[0] * e, u[1] * e, 0], 2.2);
      }
    }
    for (const e of [-1, 1]) {
      facing(mb.geom(topMat), [P(e * hl, -hw, eave), P(e * hl, hw, eave), P(e * hl, 0, zR)], [u[0] * e, u[1] * e, 0], TEXSCALE[topMat]);
    }
  }

  function hipRoof(tp, th, zR) {
    const o = S.eave, r = Math.max(0, hl - hw);
    const sO = hl + o, tO = hw + o, zE = eave - o * tp;
    const g = mb.geom(roofMat), soffit = mb.geom('woodOld'), fascia = mb.geom('woodDark');
    for (const dz of [th, 0]) {
      const want = dz ? null : down;
      for (const sg of [-1, 1]) {
        facing(dz ? g : soffit, [P(-sO, sg * tO, zE + dz), P(sO, sg * tO, zE + dz), P(r, 0, zR + dz), P(-r, 0, zR + dz)], want ?? [n[0] * sg, n[1] * sg, 1], dz ? 4 : 2.2);
        facing(dz ? g : soffit, [P(sg * sO, -tO, zE + dz), P(sg * sO, tO, zE + dz), P(sg * r, 0, zR + dz)], want ?? [u[0] * sg, u[1] * sg, 1], dz ? 4 : 2.2);
      }
    }
    const c = [P(-sO, -tO, 0), P(sO, -tO, 0), P(sO, tO, 0), P(-sO, tO, 0)];
    for (let k = 0; k < 4; k++) {
      const p = c[k], q = c[(k + 1) % 4];
      const mid = [(p[0] + q[0]) / 2 - w.c[0], (p[1] + q[1]) / 2 - w.c[1], 0];
      facing(fascia, [[p[0], p[1], zE], [q[0], q[1], zE], [q[0], q[1], zE + th], [p[0], p[1], zE + th]], mid, 2.2);
    }
  }

  function flatRoof() {
    const zt = top + 0.05, i = 0.3, pz = top + 0.7;
    const gravel = mb.geom('gravel');
    const inner = [P(-hl + i, -hw + i, 0), P(hl - i, -hw + i, 0), P(hl - i, hw - i, 0), P(-hl + i, hw - i, 0)];
    const outer = [P(-hl, -hw, 0), P(hl, -hw, 0), P(hl, hw, 0), P(-hl, hw, 0)];
    const at = (p, zz) => [p[0], p[1], zz];
    if (w.rooftopPool && w.len > 10 && w.wid > 8) {
      const sP = hl - 3, tP = hw - 2.6, depth = 1.3;
      const pool = [P(-sP, -tP, 0), P(sP, -tP, 0), P(sP, tP, 0), P(-sP, tP, 0)];
      for (let k = 0; k < 4; k++) {
        const a0 = inner[k], a1 = inner[(k + 1) % 4], b0 = pool[k], b1 = pool[(k + 1) % 4];
        facing(mb.geom('deckStone'), [at(a0, zt), at(a1, zt), at(b1, zt), at(b0, zt)], up, TEXSCALE.deckStone);
        facing(mb.geom('tiles'), [at(b0, zt - depth), at(b1, zt - depth), at(b1, zt), at(b0, zt)], [w.c[0] - (b0[0] + b1[0]) / 2, w.c[1] - (b0[1] + b1[1]) / 2, 0], 2);
      }
      facing(mb.geom('tiles'), pool.map(p => at(p, zt - depth)), up, 2);
      out.pools.push({ pts: pool.map(p => [p[0], p[1]]), level: zt - 0.12, kind: 'pool' });
    } else {
      facing(gravel, inner.map(p => at(p, zt)), up, TEXSCALE.gravel);
    }
    for (let k = 0; k < 4; k++) {
      const a0 = inner[k], a1 = inner[(k + 1) % 4], o0 = outer[k], o1 = outer[(k + 1) % 4];
      const inward = [w.c[0] - (a0[0] + a1[0]) / 2, w.c[1] - (a0[1] + a1[1]) / 2, 0];
      facing(mb.geom(topMat), [at(a0, zt), at(a1, zt), at(a1, pz), at(a0, pz)], inward, TEXSCALE[topMat]);
      facing(mb.geom('trim'), [at(o0, pz), at(o1, pz), at(a1, pz), at(a0, pz)], up, 1);
    }
  }

  // gauben mit giebeldach entlang der traufen
  function dormers(tp, th) {
    const dp = Math.tan(35 * DEG), wD = 2.4, ov = 0.3, hD = 1.2;
    const count = Math.max(1, Math.floor((w.len - 4) / 6));
    const gap = (w.len - 4) / count;
    const zb = eave + 1.0 * tp + th, zw = zb + hD, zr = zw + (wD / 2) * dp, ze = zw - ov * dp;
    const tAt = zz => hw - (zz - eave - th) / tp;
    const wall = mb.geom('woodOld'), roof = mb.geom(roofMat), soffit = mb.geom('woodDark');
    for (const sg of [-1, 1]) {
      if (sg === solarSide) continue;
      const outward = [n[0] * sg, n[1] * sg, 0];
      const tf = sg * (hw - 1.0), tFront = sg * (hw - 1.0 + ov), tIn = sg * tAt(zw), tR = sg * tAt(zr), tE = sg * tAt(ze);
      for (let k = 0; k < count; k++) {
        const sc = -hl + 2 + gap * (k + 0.5), L = sc - wD / 2, R = sc + wD / 2;
        if (w.gables?.some(g => Math.abs(sc - g) < 5.8)) continue;
        facing(wall, [P(L, tf, zb - 0.3), P(R, tf, zb - 0.3), P(R, tf, zw), P(L, tf, zw)], outward, TEXSCALE.woodOld);
        facing(wall, [P(L, tf, zw), P(R, tf, zw), P(sc, tf, zr)], outward, TEXSCALE.woodOld);
        const g0 = 0.6, gz = zb + 0.05;
        facing(mb.geom('frame'), [P(sc - g0 - 0.07, tf + sg * 0.03, gz - 0.07), P(sc + g0 + 0.07, tf + sg * 0.03, gz - 0.07), P(sc + g0 + 0.07, tf + sg * 0.03, zw - 0.1), P(sc - g0 - 0.07, tf + sg * 0.03, zw - 0.1)], outward);
        facing(mb.geom('glass'), [P(sc - g0, tf + sg * 0.05, gz), P(sc + g0, tf + sg * 0.05, gz), P(sc + g0, tf + sg * 0.05, zw - 0.17), P(sc - g0, tf + sg * 0.05, zw - 0.17)], outward);
        for (const e of [-1, 1]) {
          const ss = sc + e * wD / 2, se = sc + e * (wD / 2 + ov);
          facing(wall, [P(ss, tf, zb - 0.3), P(ss, tf, zw), P(ss, tIn, zw)], [u[0] * e, u[1] * e, 0], TEXSCALE.woodOld);
          facing(roof, [P(se, tFront, ze + 0.12), P(sc, tFront, zr + 0.12), P(sc, tR, zr + 0.12), P(se, tE, ze + 0.12)], [u[0] * e, u[1] * e, 1], 4);
          facing(soffit, [P(se, tFront, ze), P(sc, tFront, zr), P(sc, tf, zr), P(se, tf, ze)], [0, 0, -1], 2.2);
        }
      }
    }
  }

  function solarPanels(tp, th, zR, hip) {
    const sg = Math.abs(n[1]) > 0.2 ? (n[1] > 0 ? -1 : 1) : (n[0] > 0 ? -1 : 1);
    const t0 = sg * hw * 0.15, t1 = sg * hw * 0.85;
    const zAt = t => zR + th + 0.12 - Math.abs(t) * tp;
    const sMax = hip ? Math.min(hl * 0.6, Math.max(0, hl - hw) + hw * 0.3) : hl * 0.75;
    facing(mb.geom('solar'), [P(-sMax, t0, zAt(t0)), P(sMax, t0, zAt(t0)), P(sMax, t1, zAt(t1)), P(-sMax, t1, zAt(t1))], up, 1.7, { local: true });
    solarSide = sg;
  }

  function chimneys(tp, zR) {
    if (!S.chimneys || w.chimneys === 0) return;
    const sg = solarSide ? -solarSide : 1;
    const spots = S.chimneys === 2 ? [-0.35, 0.35] : [0.25];
    for (const f of spots) {
      const s = f * hl, t = sg * hw * 0.4;
      const zBase = zR - Math.abs(t) * tp - 0.3;
      const c = P(s, t, 0);
      box(mb.geom('plaster'), [c[0], c[1]], u, 0.4, 0.4, zBase, zR + 1.0, TEXSCALE.plaster);
      box(mb.geom('roofDark'), [c[0], c[1]], u, 0.55, 0.55, zR + 1.0, zR + 1.12, 4);
    }
  }
}

// konvexes polygon um m nach aussen versetzen
function offsetPolygon(pts, m) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; area += p[0] * q[1] - q[0] * p[1]; }
  const sign = area > 0 ? 1 : -1;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
    const nx = sign * dy / l, ny = -sign * dx / l;
    return { p: [p[0] + nx * m, p[1] + ny * m], d: [dx, dy] };
  });
  return lines.map((L, i) => {
    const K = lines[(i + lines.length - 1) % lines.length];
    const den = K.d[0] * L.d[1] - K.d[1] * L.d[0];
    const t = ((L.p[0] - K.p[0]) * L.d[1] - (L.p[1] - K.p[1]) * L.d[0]) / den;
    return [K.p[0] + K.d[0] * t, K.p[1] + K.d[1] * t];
  });
}

function buildPool(mb, pool, H, out) {
  const level = out.floor0[pool.ref] + pool.offset;
  const deckTop = level + 0.15, depth = 1.4;
  const deck = offsetPolygon(pool.pts, 1.4);
  const cx = pool.pts.reduce((s, p) => s + p[0], 0) / 4, cy = pool.pts.reduce((s, p) => s + p[1], 0) / 4;
  const ground = Math.min(...deck.map(p => H(p[0], p[1])));
  const at = (p, z) => [p[0], p[1], z];
  for (let k = 0; k < 4; k++) {
    const a0 = deck[k], a1 = deck[(k + 1) % 4], b0 = pool.pts[k], b1 = pool.pts[(k + 1) % 4];
    facing(mb.geom('deckStone'), [at(a0, deckTop), at(a1, deckTop), at(b1, deckTop), at(b0, deckTop)], [0, 0, 1], TEXSCALE.deckStone);
    facing(mb.geom('stone'), [at(a0, ground - 1.5), at(a1, ground - 1.5), at(a1, deckTop), at(a0, deckTop)], [(a0[0] + a1[0]) / 2 - cx, (a0[1] + a1[1]) / 2 - cy, 0], TEXSCALE.stone);
    facing(mb.geom('tiles'), [at(b0, level - depth), at(b1, level - depth), at(b1, deckTop), at(b0, deckTop)], [cx - (b0[0] + b1[0]) / 2, cy - (b0[1] + b1[1]) / 2, 0], TEXSCALE.tiles);
  }
  facing(mb.geom('tiles'), pool.pts.map(p => at(p, level - depth)), [0, 0, 1], TEXSCALE.tiles);
  out.pools.push({ pts: pool.pts, level, kind: 'pool' });
  out.carves.push({ pts: deck, top: deckTop - 0.05, bottom: level - depth - 0.8, slope: 0.05 });
}

// wasserflaechen (see, teich, pools) als glaenzende flaechen, die den himmel spiegeln
function buildWater(mb, water) {
  for (const { pts, level, kind } of water) {
    const g = mb.geom(kind === 'lake' ? 'lakeWater' : 'poolWater');
    const idx = Cesium.PolygonPipeline.triangulate(pts.map(p => new Cesium.Cartesian2(p[0], p[1])));
    const base = g.count;
    for (const p of pts) g.vertex([p[0], p[1], level], [0, 0, 1], [1, 0, 0], [p[0] / 8, -p[1] / 8]);
    for (let i = 0; i < idx.length; i += 3) {
      const [a, b, c] = [pts[idx[i]], pts[idx[i + 1]], pts[idx[i + 2]]];
      const ccw = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) > 0;
      g.idx.push(base + idx[i], base + idx[ccw ? i + 1 : i + 2], base + idx[ccw ? i + 2 : i + 1]);
    }
  }
}

// holzstege knapp ueber dem wasserspiegel
function buildDocks(mb, docks, lakes) {
  for (const d of docks) {
    const level = lakes.find(l => l.id === d.lake).level;
    for (let i = 1; i < d.pts.length; i++) {
      const [a, b] = [d.pts[i - 1], d.pts[i]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      box(mb.geom('woodOld'), [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], u, len / 2, d.width / 2, level - 0.8, level + 0.45, TEXSCALE.woodOld);
    }
  }
}

// lakes: [{ id, pts, level }] mit bereits bestimmtem wasserspiegel
// extras(mb): weitere geometrie (aussenanlagen) im selben modell
export function buildBuildings(wings, pools, lakes, docks, H, extras) {
  const mb = new MeshBuilder();
  const out = { pools: [], carves: [], floor0: {} };
  for (const w of wings) {
    buildWing(mb, w, H, out);
    // zwerchgiebel: schmaler querfluegel gleicher hoehe, der beidseitig 1,2 m vorsteht
    const a = w.axis * DEG;
    (w.gables ?? []).forEach((s, i) => buildWing(mb, {
      ...w, id: `${w.id}-giebel-${i}`, gables: undefined, solar: false, chimneys: 0, roof: 'gable',
      c: [w.c[0] + Math.cos(a) * s, w.c[1] + Math.sin(a) * s], axis: w.axis + 90,
      len: w.wid + 2.4, wid: 7.5, floor0: out.floor0[w.id],
    }, H, out));
  }
  for (const p of pools) buildPool(mb, p, H, out);
  buildDocks(mb, docks, lakes);
  extras?.(mb);
  buildWater(mb, [...out.pools, ...lakes.map(l => ({ ...l, kind: 'lake' }))]);
  const { textures, materials, indexOf } = createMaterials();
  const primitives = [...mb.byMaterial].map(([name, geom]) => ({ material: indexOf(name), geom }));
  return { glb: writeGlb({ nodes: [{ primitives }], materials, textures }), ...out };
}
