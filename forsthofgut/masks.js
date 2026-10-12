// flaechenmasken aus dem orthofoto (siehe tools/bake-imagery.mjs).
// alle decken x -300..300, y -260..260 ab.
export const MASK_AREA = { x0: -300, y0: -260, width: 600, height: 520 };

const FILES = {
  canopy: 'data/canopy.png',
  paved: 'data/ground-paved.png',
};

async function load(url) {
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height);
  const values = new Uint8Array(c.width * c.height);
  // als alpha-maske fuer canvas-compositing (weiss mit deckkraft = maskenwert)
  for (let i = 0; i < values.length; i++) {
    values[i] = id.data[i * 4];
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = values[i];
  }
  g.putImageData(id, 0, 0);
  return { canvas: c, values, w: c.width, h: c.height };
}

export async function loadMasks(base) {
  const entries = await Promise.all(Object.entries(FILES).map(async ([k, f]) => [k, await load(base + f)]));
  const masks = Object.fromEntries(entries);
  return {
    masks,
    // maskenwert 0..1 an einem punkt in lokalen metern
    at(name, x, y) {
      const m = masks[name];
      const i = Math.floor((x - MASK_AREA.x0) / MASK_AREA.width * m.w);
      const j = Math.floor((MASK_AREA.y0 + MASK_AREA.height - y) / MASK_AREA.height * m.h);
      return i >= 0 && j >= 0 && i < m.w && j < m.h ? m.values[j * m.w + i] / 255 : 0;
    },
  };
}
