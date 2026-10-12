// kleine texturen, die im browser gezeichnet werden (statt zusaetzlicher bilddateien)

export function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  return c.toDataURL('image/png');
}

// geschnitztes holzgelaender mit luecken (alpha)
function railing(base, dark) {
  const r = mulberry32(5);
  return canvas(256, 128, (g, w, h) => {
    const wood = (x, y, ww, hh) => {
      g.fillStyle = base; g.fillRect(x, y, ww, hh);
      for (let i = 0; i < ww * hh / 30; i++) {
        g.fillStyle = r() < 0.5 ? dark : 'rgba(255,240,220,0.08)';
        g.fillRect(x + r() * ww, y + r() * hh, 1, 2 + r() * 8);
      }
    };
    const board = 22, gap = 10;
    for (let x = 0; x < w; x += board + gap) wood(x, 10, board, h - 20);
    wood(0, 0, w, 12);
    wood(0, h - 12, w, 12);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, 12, w, 3);
  });
}

function railingSlats() {
  return canvas(128, 128, (g, w, h) => {
    g.fillStyle = '#2b2b2b';
    for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 5, h);
    g.fillRect(0, 0, w, 8);
  });
}

function solar() {
  return canvas(128, 128, (g, w, h) => {
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0d1a33'; g.fillRect(3, 3, w - 6, h - 6);
    g.strokeStyle = 'rgba(140,160,200,0.35)'; g.lineWidth = 1;
    for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(3 + i * (w - 6) / 6, 3); g.lineTo(3 + i * (w - 6) / 6, h - 3); g.stroke(); }
    for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(3, 3 + i * (h - 6) / 10); g.lineTo(w - 3, 3 + i * (h - 6) / 10); g.stroke(); }
  });
}

// nadelzweige fuer die fichten-etagen: oben = spitze, unten = ausgefranster rand
function needles(seed, hue) {
  const r = mulberry32(seed);
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = `hsl(${hue},38%,13%)`; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const x = r() * w, y = r() * h, l = 4 + r() * 10, a = Math.PI / 2 + (r() - 0.5) * 1.6;
      g.strokeStyle = `hsl(${hue + (r() - 0.5) * 16},${30 + r() * 25}%,${10 + r() * 22 + (1 - y / h) * 6}%)`;
      g.lineWidth = 1 + r() * 1.5;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    // zacken am unteren rand freistellen
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h - 8 - r() * 52 * (0.4 + 0.6 * Math.abs(Math.sin(x * 0.07))));
    g.lineTo(w, h); g.closePath(); g.fill();
    for (let i = 0; i < 260; i++) { g.beginPath(); g.arc(r() * w, h * (0.45 + r() * 0.55), 1 + r() * 3.5, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-over';
  });
}

function leaves() {
  const r = mulberry32(11);
  return canvas(256, 256, (g, w, h) => {
    g.fillStyle = '#2c4a22'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = `hsl(${85 + r() * 30},${35 + r() * 25}%,${14 + r() * 26}%)`;
      g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 4, 1 + r() * 2.5, r() * 3, 0, 7); g.fill();
    }
  });
}

function bark() {
  const r = mulberry32(13);
  return canvas(64, 64, (g, w, h) => {
    g.fillStyle = '#3a2a1f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) { g.fillStyle = r() < 0.5 ? '#2a1d14' : '#4a3828'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 4 + r() * 10); }
  });
}

// maschendraht (diagonal), nur die draehte sind deckend
function chainlink() {
  return canvas(64, 64, (g, w, h) => {
    g.strokeStyle = '#1f3d26'; g.lineWidth = 3;
    for (let k = -64; k <= 64; k += 16) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 64); g.stroke();
      g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 64); g.stroke();
    }
  });
}

function net() {
  return canvas(64, 64, (g, w, h) => {
    g.strokeStyle = '#151515'; g.lineWidth = 3;
    for (let k = 0; k <= 64; k += 8) {
      g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 64); g.stroke();
      g.beginPath(); g.moveTo(0, k); g.lineTo(64, k); g.stroke();
    }
  });
}

// rot-weisse hindernisstangen
function stripes() {
  return canvas(64, 16, (g, w, h) => {
    g.fillStyle = '#f2f2ee'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#c4161c'; g.fillRect(0, 0, w / 2, h);
  });
}

function sign() {
  return canvas(512, 128, (g, w, h) => {
    g.fillStyle = '#3a2618'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 2);
    g.fillStyle = '#f1e7d0';
    g.font = '600 64px Georgia, serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FORSTHOFGUT', w / 2, h / 2 + 4);
  });
}

function parkingSign() {
  return canvas(64, 64, (g, w, h) => {
    g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d4f9c'; g.fillRect(4, 4, w - 8, h - 8);
    g.fillStyle = '#fff'; g.font = 'bold 44px Arial, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('P', w / 2, h / 2 + 2);
  });
}

let cache;
export function generatedTextures() {
  cache ??= {
    railing: railing('#a36a3a', 'rgba(60,32,14,0.3)'),
    railing_modern: railingSlats(),
    solar: solar(),
    needles_a: needles(21, 135),
    needles_b: needles(22, 150),
    leaves: leaves(),
    bark: bark(),
    chainlink: chainlink(),
    net: net(),
    stripes: stripes(),
    sign: sign(),
    parking_sign: parkingSign(),
  };
  return cache;
}
