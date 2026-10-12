// gezeichneter boden im stil des lageplans: in der lichtung gras, wege, strassen, parkplaetze
// und sportplaetze, rundherum waldboden, alles mit hangschattierung aus dem gelaende.
// ausserhalb der weltgrenze bleibt das echte orthofoto sichtbar.
import { toLocal, toLonLat } from './terrain.js';
import { groundTextures } from './ground-textures.js';
import { MASK_AREA } from './masks.js';

const SIZE = 256;
const FOREST_METERS = 75;

function noise(x, y) {
  const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return (h(i, j) * (1 - sx) + h(i + 1, j) * sx) * (1 - sy) + (h(i, j + 1) * (1 - sx) + h(i + 1, j + 1) * sx) * sy;
}

function newCanvas(w = SIZE, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export async function createGroundLayer({ base, clearing, outer, masks, height, sun, roads, parking, courts, lines, lakes }) {
  const forestImg = new Image();
  forestImg.src = base + 'tex/forest_floor.jpg';
  await forestImg.decode();
  const tex = { ...groundTextures(), forest: [forestImg, FOREST_METERS] };

  const tilingScheme = new Cesium.GeographicTilingScheme();
  const xs = outer.map(p => p[0]), ys = outer.map(p => p[1]);
  const [w, s] = toLonLat(Math.min(...xs) - 50, Math.min(...ys) - 50);
  const [e, n] = toLonLat(Math.max(...xs) + 50, Math.max(...ys) + 50);
  const rectangle = Cesium.Rectangle.fromDegrees(w, s, e, n);
  const deg = 180 / Math.PI;
  const temp = newCanvas(), tg = temp.getContext('2d');
  const sunLen = Math.hypot(...sun);
  const sunDir = sun.map(v => v / sunLen);

  function drawTile(x, y, level) {
    const r = tilingScheme.tileXYToRectangle(x, y, level);
    const [x0, y0] = toLocal(r.west * deg, r.south * deg);
    const [x1, y1] = toLocal(r.east * deg, r.north * deg);
    const sx = SIZE / (x1 - x0), sy = SIZE / (y1 - y0);
    const px = ([X, Y]) => [(X - x0) * sx, (y1 - Y) * sy];

    const pattern = (g, name) => {
      const [img, meters] = tex[name];
      const p = g.createPattern(img, 'repeat');
      const k = meters / img.width;
      p.setTransform(new DOMMatrix([k * sx, 0, 0, k * sy, -x0 * sx, y1 * sy]));
      return p;
    };
    const path = (g, pts, close = true, pad = 0) => {
      g.beginPath();
      pts.forEach((p, i) => { const [X, Y] = px(p); i ? g.lineTo(X + pad, Y + pad) : g.moveTo(X + pad, Y + pad); });
      if (close) g.closePath();
    };
    const masked = (g, name, mask) => {
      tg.globalCompositeOperation = 'source-over';
      tg.clearRect(0, 0, SIZE, SIZE);
      tg.fillStyle = pattern(tg, name);
      tg.fillRect(0, 0, SIZE, SIZE);
      tg.globalCompositeOperation = 'destination-in';
      const kx = mask.w / MASK_AREA.width, ky = mask.h / MASK_AREA.height;
      tg.drawImage(mask.canvas, (x0 - MASK_AREA.x0) * kx, (MASK_AREA.y0 + MASK_AREA.height - y1) * ky, (x1 - x0) * kx, (y1 - y0) * ky, 0, 0, SIZE, SIZE);
      g.drawImage(temp, 0, 0);
    };
    const feathered = (pts, meters) => {
      const blur = Math.min(24, meters * sx), pad = Math.ceil(blur * 3);
      const m = newCanvas(SIZE + 2 * pad), mg = m.getContext('2d');
      if (blur > 0.5) mg.filter = `blur(${blur}px)`;
      mg.fillStyle = '#fff';
      path(mg, pts, true, pad); mg.fill();
      return [m, pad];
    };

    // lichtung
    const A = newCanvas(), ag = A.getContext('2d');
    ag.lineJoin = ag.lineCap = 'round';
    ag.fillStyle = pattern(ag, 'grass'); ag.fillRect(0, 0, SIZE, SIZE);
    masked(ag, 'forest', masks.canopy);
    masked(ag, 'paving', masks.paved);
    for (const poly of parking) {
      path(ag, poly); ag.fillStyle = pattern(ag, 'pavers'); ag.fill();
      ag.strokeStyle = '#d6d0c4'; ag.lineWidth = 0.8 * sx; ag.stroke();
    }
    // stellplatzmarkierungen
    ag.strokeStyle = 'rgba(245,245,240,0.9)'; ag.lineWidth = Math.max(0.6, 0.12 * sx);
    ag.beginPath();
    for (const [a, b] of lines) { const [ax, ay] = px(a), [bx, by] = px(b); ag.moveTo(ax, ay); ag.lineTo(bx, by); }
    ag.stroke();
    for (const c of courts) drawCourt(ag, c);
    for (const rd of roads) {
      path(ag, rd.pts, false);
      ag.strokeStyle = '#d6d0c4'; ag.lineWidth = (rd.width + 1) * sx; ag.stroke();
      ag.strokeStyle = pattern(ag, 'asphalt'); ag.lineWidth = rd.width * sx; ag.stroke();
    }
    for (const lake of lakes) {
      path(ag, lake.pts);
      ag.fillStyle = '#2d6f78'; ag.fill();
      ag.strokeStyle = pattern(ag, 'stone'); ag.lineWidth = 2.6 * sx; ag.stroke();
    }

    // sportplatz in eigenen koordinaten (s entlang der laengsachse, t quer) zeichnen
    function drawCourt(g, c) {
      const a = c.axis * Math.PI / 180, u = [Math.cos(a), Math.sin(a)], n = [-u[1], u[0]];
      g.save();
      g.setTransform(sx * u[0], -sy * u[1], sx * n[0], -sy * n[1], sx * (c.c[0] - x0), sy * (y1 - c.c[1]));
      const L = c.len / 2, W = c.wid / 2;
      const fillTex = (name, color) => {
        const [img, meters] = tex[name];
        const p = g.createPattern(img, 'repeat');
        p.setTransform(new DOMMatrix().scale(meters / img.width));
        g.fillStyle = color ?? p;
        g.fillRect(-L, -W, 2 * L, 2 * W);
      };
      const line = (w, f) => { g.strokeStyle = '#f6f4ee'; g.lineWidth = Math.max(w, 1.2 / sx); g.beginPath(); f(); g.stroke(); };
      if (c.type === 'tennis') {
        fillTex('clay');
        // linien nach ITF: doppel 23,77 x 10,97 m, einzel 8,23 m, aufschlaglinien 6,40 m vom netz
        line(0.06, () => {
          g.rect(-11.885, -5.485, 23.77, 10.97);
          g.moveTo(-11.885, -4.115); g.lineTo(11.885, -4.115);
          g.moveTo(-11.885, 4.115); g.lineTo(11.885, 4.115);
          g.moveTo(-6.4, -4.115); g.lineTo(-6.4, 4.115);
          g.moveTo(6.4, -4.115); g.lineTo(6.4, 4.115);
          g.moveTo(-6.4, 0); g.lineTo(6.4, 0);
          g.moveTo(-11.885, 0); g.lineTo(-11.685, 0);
          g.moveTo(11.885, 0); g.lineTo(11.685, 0);
        });
      } else if (c.type === 'soccer') {
        // kunstrasen mit maehstreifen
        for (let s = -L, k = 0; s < L; s += 2.6, k++) { g.fillStyle = k % 2 ? '#3f8f3c' : '#47993f'; g.fillRect(s, -W, Math.min(2.6, L - s), 2 * W); }
        line(0.1, () => {
          g.rect(-L + 0.6, -W + 0.6, 2 * L - 1.2, 2 * W - 1.2);
          g.moveTo(0, -W + 0.6); g.lineTo(0, W - 0.6);
          g.moveTo(3, 0); g.arc(0, 0, 3, 0, Math.PI * 2);
          g.rect(-L + 0.6, -3.5, 4, 7); g.rect(L - 4.6, -3.5, 4, 7);
        });
      } else {
        // reitplatz: sand mit dunklerem hufschlag entlang der bande
        fillTex('sand');
        g.strokeStyle = 'rgba(120,90,50,0.22)'; g.lineWidth = 2.2;
        g.strokeRect(-L + 1.6, -W + 1.6, 2 * L - 3.2, 2 * W - 3.2);
      }
      g.restore();
    }

    // waldboden rundherum, lichtung weich daruebergelegt
    const out = newCanvas(), og = out.getContext('2d');
    og.fillStyle = pattern(og, 'forest'); og.fillRect(0, 0, SIZE, SIZE);
    const [cm, cpad] = feathered(clearing, 5);
    ag.globalCompositeOperation = 'destination-in';
    ag.drawImage(cm, -cpad, -cpad);
    og.drawImage(A, 0, 0);

    // hangschattierung und grossflaechige farbunterschiede
    const N = 16, cw = SIZE / N, step = Math.max(2, (x1 - x0) / N);
    const shade = newCanvas(N + 1), sg = shade.getContext('2d'), id = sg.createImageData(N + 1, N + 1);
    for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
      const X = x0 + (x1 - x0) * i / N, Y = y1 - (y1 - y0) * j / N;
      const dx = (height(X + step, Y) - height(X - step, Y)) / (2 * step);
      const dy = (height(X, Y + step) - height(X, Y - step)) / (2 * step);
      const nl = Math.hypot(dx, dy, 1);
      const lambert = (-dx * sunDir[0] - dy * sunDir[1] + sunDir[2]) / nl;
      const rel = lambert / sunDir[2];
      const v = Math.min(0.9, Math.max(0.12, 0.5 + 0.3 * (rel - 1) + 0.08 * (noise(X / 70, Y / 70) - 0.5)));
      const k = (j * (N + 1) + i) * 4;
      id.data[k] = id.data[k + 1] = id.data[k + 2] = v * 255; id.data[k + 3] = 255;
    }
    sg.putImageData(id, 0, 0);
    og.globalCompositeOperation = 'soft-light';
    og.imageSmoothingEnabled = true;
    og.drawImage(shade, 0, 0, N + 1, N + 1, -cw / 2, -cw / 2, SIZE + cw, SIZE + cw);

    // an der weltgrenze ins echte orthofoto uebergehen
    const [om, opad] = feathered(outer, 25);
    og.globalCompositeOperation = 'destination-in';
    og.drawImage(om, -opad, -opad);
    return out;
  }

  const provider = {
    tilingScheme,
    rectangle,
    tileWidth: SIZE,
    tileHeight: SIZE,
    minimumLevel: 0,
    maximumLevel: 22,
    tileDiscardPolicy: undefined,
    errorEvent: new Cesium.Event(),
    credit: undefined,
    proxy: undefined,
    hasAlphaChannel: true,
    getTileCredits: () => [],
    requestImage: (x, y, level) => Promise.resolve(drawTile(x, y, level)),
    pickFeatures: () => undefined,
  };
  return new Cesium.ImageryLayer(provider, { rectangle });
}
