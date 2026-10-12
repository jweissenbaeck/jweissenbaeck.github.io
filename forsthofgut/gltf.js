// minimaler glb-schreiber fuer die prozedural erzeugte geometrie.
// eingabe in ENU-metern (x ost, y nord, z oben), ausgabe im glTF-system (y oben).

export class Geometry {
  constructor() {
    this.pos = []; this.nor = []; this.tan = []; this.uv = []; this.idx = [];
  }

  get count() { return this.pos.length / 3; }

  vertex(p, n, t, uv) {
    this.pos.push(p[0], p[2], -p[1]);
    this.nor.push(n[0], n[2], -n[1]);
    this.tan.push(t[0], t[2], -t[1], 1);
    this.uv.push(uv[0], uv[1]);
    return this.count - 1;
  }
}

// sammelt geometrie pro material
export class MeshBuilder {
  constructor() { this.byMaterial = new Map(); }

  geom(material) {
    if (!this.byMaterial.has(material)) this.byMaterial.set(material, new Geometry());
    return this.byMaterial.get(material);
  }
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const vec = { sub, dot, cross, norm };

// viereck p0..p3 gegen den uhrzeigersinn von aussen gesehen.
// uv standardmaessig weltverankert (kacheln laufen ueber benachbarte flaechen weiter),
// alternativ explizit ueber opts.uv
export function quad(g, p0, p1, p2, p3, scale = 1, opts = {}) {
  const T = norm(sub(p1, p0));
  const e = sub(p3, p0);
  const B = norm(sub(e, T.map(v => v * dot(e, T))));
  const N = norm(cross(sub(p1, p0), sub(p3, p0)));
  const ps = [p0, p1, p2, p3];
  const uvs = opts.uv || ps.map(p => opts.local
    ? [dot(sub(p, p0), T) / scale, -dot(sub(p, p0), B) / scale]
    : [dot(p, T) / scale, -dot(p, B) / scale]);
  const i = ps.map((p, k) => g.vertex(p, N, T, uvs[k]));
  g.idx.push(i[0], i[1], i[2], i[0], i[2], i[3]);
}

export function tri(g, p0, p1, p2, scale = 1) {
  const T = norm(sub(p1, p0));
  const e = sub(p2, p0);
  const B = norm(sub(e, T.map(v => v * dot(e, T))));
  const N = norm(cross(sub(p1, p0), sub(p2, p0)));
  const i = [p0, p1, p2].map(p => g.vertex(p, N, T, [dot(p, T) / scale, -dot(p, B) / scale]));
  g.idx.push(i[0], i[1], i[2]);
}

// quader: c = mittelpunkt grundflaeche [x,y], u = laengsachse (einheitsvektor 2d),
// hl/hw = halbe laenge/breite, z0..z1 hoehe
export function box(g, c, u, hl, hw, z0, z1, scale = 1, { bottom = false, top = true } = {}) {
  const n = [-u[1], u[0]];
  const P = (s, t, z) => [c[0] + u[0] * s + n[0] * t, c[1] + u[1] * s + n[1] * t, z];
  const ring = [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]];
  for (let k = 0; k < 4; k++) {
    const [s0, t0] = ring[k], [s1, t1] = ring[(k + 1) % 4];
    quad(g, P(s0, t0, z0), P(s1, t1, z0), P(s1, t1, z1), P(s0, t0, z1), scale);
  }
  if (top) quad(g, P(-hl, -hw, z1), P(hl, -hw, z1), P(hl, hw, z1), P(-hl, hw, z1), scale);
  if (bottom) quad(g, P(-hl, hw, z0), P(hl, hw, z0), P(hl, -hw, z0), P(-hl, -hw, z0), scale);
}

// flaeche so ausrichten, dass ihre normale in richtung `want` zeigt
export function facing(g, pts, want, scale = 1, opts = {}) {
  const N = cross(sub(pts[1], pts[0]), sub(pts[pts.length - 1], pts[0]));
  let p = pts, uv = opts.uv;
  if (dot(N, want) < 0) {
    p = [...pts].reverse();
    if (uv) uv = [...uv].reverse();
  }
  if (p.length === 3) tri(g, p[0], p[1], p[2], scale);
  else quad(g, p[0], p[1], p[2], p[3], scale, { ...opts, uv });
}

// balken mit rechteckigem querschnitt zwischen zwei beliebigen 3d-punkten
export function beam(g, p0, p1, w, h = w, scale = 1) {
  const d = norm(sub(p1, p0));
  const up = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const a = norm(cross(d, up)).map(v => v * w / 2);
  const b = norm(cross(a, d)).map(v => v * h / 2);
  const add = (p, ...vs) => vs.reduce((q, v) => [q[0] + v[0], q[1] + v[1], q[2] + v[2]], p);
  const neg = v => v.map(x => -x);
  const c = (p, sa, sb) => add(p, sa > 0 ? a : neg(a), sb > 0 ? b : neg(b));
  const ring = [[1, 1], [-1, 1], [-1, -1], [1, -1]];
  for (let k = 0; k < 4; k++) {
    const [a0, b0] = ring[k], [a1, b1] = ring[(k + 1) % 4];
    const mid = add(neg(d.map(v => 0)), a.map(v => v * (a0 + a1) / 2), b.map(v => v * (b0 + b1) / 2));
    facing(g, [c(p0, a0, b0), c(p0, a1, b1), c(p1, a1, b1), c(p1, a0, b0)], mid, scale);
  }
  facing(g, ring.map(([sa, sb]) => c(p1, sa, sb)), d, scale);
  facing(g, ring.map(([sa, sb]) => c(p0, sa, sb)), neg(d), scale);
}

// ---------------------------------------------------------------------------

// nodes: [{ primitives: [{ material, geom }], instancing?: { translation, rotation, scale } }]
// materials: glTF-materialobjekte, textures: [{ uri }]
export function writeGlb({ nodes, materials, textures = [] }) {
  const chunks = [];
  let byteLength = 0;
  const bufferViews = [], accessors = [];

  function addView(typed, target) {
    const pad = (4 - (byteLength % 4)) % 4;
    if (pad) { chunks.push(new Uint8Array(pad)); byteLength += pad; }
    const bytes = new Uint8Array(typed.buffer, typed.byteOffset, typed.byteLength);
    chunks.push(bytes);
    bufferViews.push({ buffer: 0, byteOffset: byteLength, byteLength: bytes.byteLength, ...(target ? { target } : {}) });
    byteLength += bytes.byteLength;
    return bufferViews.length - 1;
  }

  function addAccessor(typed, type, componentType, target, withBounds) {
    const view = addView(typed, target);
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type];
    const acc = { bufferView: view, componentType, count: typed.length / size, type };
    if (withBounds) {
      const min = Array(size).fill(Infinity), max = Array(size).fill(-Infinity);
      for (let i = 0; i < typed.length; i++) {
        const k = i % size;
        if (typed[i] < min[k]) min[k] = typed[i];
        if (typed[i] > max[k]) max[k] = typed[i];
      }
      acc.min = min; acc.max = max;
    }
    accessors.push(acc);
    return accessors.length - 1;
  }

  const meshes = [], gltfNodes = [];
  let instanced = false;
  for (const node of nodes) {
    const primitives = [];
    for (const { material, geom } of node.primitives) {
      if (!geom.idx.length) continue;
      primitives.push({
        attributes: {
          POSITION: addAccessor(new Float32Array(geom.pos), 'VEC3', 5126, 34962, true),
          NORMAL: addAccessor(new Float32Array(geom.nor), 'VEC3', 5126, 34962),
          TANGENT: addAccessor(new Float32Array(geom.tan), 'VEC4', 5126, 34962),
          TEXCOORD_0: addAccessor(new Float32Array(geom.uv), 'VEC2', 5126, 34962),
        },
        indices: addAccessor(new Uint32Array(geom.idx), 'SCALAR', 5125, 34963),
        material,
      });
    }
    if (!primitives.length) continue;
    meshes.push({ primitives });
    const n = { mesh: meshes.length - 1 };
    if (node.instancing) {
      instanced = true;
      const { translation, rotation, scale } = node.instancing;
      n.extensions = {
        EXT_mesh_gpu_instancing: {
          attributes: {
            TRANSLATION: addAccessor(translation, 'VEC3', 5126, undefined, true),
            ROTATION: addAccessor(rotation, 'VEC4', 5126),
            SCALE: addAccessor(scale, 'VEC3', 5126),
          },
        },
      };
    }
    gltfNodes.push(n);
  }

  const json = {
    asset: { version: '2.0', generator: 'forsthofgut' },
    scene: 0,
    scenes: [{ nodes: gltfNodes.map((_, i) => i) }],
    nodes: gltfNodes,
    meshes,
    materials,
    accessors,
    bufferViews,
    buffers: [{ byteLength }],
  };
  if (textures.length) {
    json.samplers = [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }];
    json.images = textures.map(t => ({ uri: t.uri }));
    json.textures = textures.map((_, i) => ({ source: i, sampler: 0 }));
  }
  if (instanced) json.extensionsUsed = json.extensionsRequired = ['EXT_mesh_gpu_instancing'];

  let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
  const binPad = (4 - (byteLength % 4)) % 4;
  const total = 12 + 8 + jsonBytes.length + jsonPad + 8 + byteLength + binPad;
  const out = new Uint8Array(total);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546c67, true);
  dv.setUint32(4, 2, true);
  dv.setUint32(8, total, true);
  dv.setUint32(12, jsonBytes.length + jsonPad, true);
  dv.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.length, 20 + jsonBytes.length + jsonPad);
  let o = 20 + jsonBytes.length + jsonPad;
  dv.setUint32(o, byteLength + binPad, true);
  dv.setUint32(o + 4, 0x004e4942, true);
  o += 8;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}
