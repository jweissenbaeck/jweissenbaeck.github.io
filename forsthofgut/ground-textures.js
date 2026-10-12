// bodentexturen im stil des lageplans: sattes gras, helle pflasterwege, asphalt, sand, tennissand
import { mulberry32 } from './textures.js';

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  return c;
}

// flecken, die ueber den kachelrand hinaus wiederholt werden -> nahtlos
function blots(g, size, r, n, color, rad) {
  for (let i = 0; i < n; i++) {
    const x = r() * size, y = r() * size, s = rad[0] + r() * (rad[1] - rad[0]);
    g.fillStyle = color(r);
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      if (x + dx < -s || x + dx > size + s || y + dy < -s || y + dy > size + s) continue;
      g.beginPath(); g.arc(x + dx, y + dy, s, 0, 7); g.fill();
    }
  }
}

function grass() {
  const r = mulberry32(31);
  return canvas(512, (g, n) => {
    g.fillStyle = '#527a2e'; g.fillRect(0, 0, n, n);
    blots(g, n, r, 260, r => `hsla(${82 + r() * 18},${32 + r() * 18}%,${24 + r() * 14}%,0.2)`, [14, 46]);
    blots(g, n, r, 9000, r => `hsla(${78 + r() * 26},${30 + r() * 25}%,${18 + r() * 24}%,0.5)`, [0.6, 1.8]);
    // vereinzelt bluehende wiese (gelb, weiss)
    blots(g, n, r, 380, r => r() < 0.75 ? 'rgba(236,214,72,0.85)' : 'rgba(245,245,235,0.8)', [0.6, 1.3]);
  });
}

function paving() {
  const r = mulberry32(32);
  return canvas(512, (g, n) => {
    g.fillStyle = '#cfc7b8'; g.fillRect(0, 0, n, n);
    const s = 32;
    for (let y = 0; y < n; y += s / 2) {
      const off = (y / (s / 2)) % 2 ? s / 2 : 0;
      for (let x = -s; x < n; x += s) {
        const l = 74 + r() * 10;
        g.fillStyle = `hsl(${36 + r() * 10},${10 + r() * 8}%,${l}%)`;
        g.fillRect(x + off + 1, y + 1, s - 2, s / 2 - 2);
      }
    }
  });
}

function pavers() {
  const r = mulberry32(33);
  return canvas(512, (g, n) => {
    g.fillStyle = '#9e9b95'; g.fillRect(0, 0, n, n);
    const s = 16;
    for (let y = 0; y < n; y += s) for (let x = 0; x < n; x += s * 2) {
      const vertical = ((x / (s * 2)) + (y / s)) % 2;
      g.fillStyle = `hsl(${30 + r() * 12},${6 + r() * 6}%,${66 + r() * 10}%)`;
      if (vertical) g.fillRect(x + 1, y + 1, s - 2, s - 2), g.fillRect(x + s + 1, y + 1, s - 2, s - 2);
      else g.fillRect(x + 1, y + 1, s * 2 - 2, s - 2);
    }
  });
}

function asphalt() {
  const r = mulberry32(34);
  return canvas(256, (g, n) => {
    g.fillStyle = '#5e5f62'; g.fillRect(0, 0, n, n);
    blots(g, n, r, 3000, r => `rgba(${r() < 0.5 ? '40,40,44' : '140,140,145'},0.25)`, [0.5, 1.4]);
  });
}

function plain(base, spread, seed) {
  const r = mulberry32(seed);
  return canvas(256, (g, n) => {
    g.fillStyle = base; g.fillRect(0, 0, n, n);
    blots(g, n, r, 2500, r => `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${spread})`, [0.6, 2]);
  });
}

let cache;
// [canvas, meter pro textur]
export function groundTextures() {
  cache ??= {
    grass: [grass(), 22],
    paving: [paving(), 7],
    pavers: [pavers(), 6],
    asphalt: [asphalt(), 6],
    clay: [plain('#c46a42', 0.08, 35), 8],
    sand: [plain('#d8c49a', 0.08, 36), 8],
    stone: [plain('#bdb3a2', 0.1, 37), 5],
  };
  return cache;
}
