/* ============================
   NAV STATE — safe sessionStorage helpers
   (fällt bei deaktiviertem Storage / Private Mode still auf no-op zurück)
============================ */
function vtStoreGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function vtStoreSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function vtStoreDel(k) { try { sessionStorage.removeItem(k); } catch (e) {} }

/* Kamen wir über eine interne Seiten-Navigation? Einmalig konsumieren. */
const ARRIVED_VIA_INTERNAL_NAV = vtStoreGet('jcky:internalNav') === '1';
vtStoreDel('jcky:internalNav');

/* ============================
   NACH DER INTRO — schwere Vorarbeit (Globus-Land, Footer-Vermessung) erst starten, wenn sich der
   Loader geteilt hat; sonst blockiert sie den Browser genau während die Unterschrift gezeichnet wird.
   Ohne Loader (Unterseiten, interne Navigation) sofort. Sicherheitsnetz: spätestens nach 9 s.
============================ */
function afterIntro(fn) {
  const loader = document.getElementById('pageLoader');
  if (window.__introDone || !loader || ARRIVED_VIA_INTERNAL_NAV) { setTimeout(fn, 0); return; }
  let done = false;
  const run = () => { if (done) return; done = true; setTimeout(fn, 60); };
  window.addEventListener('jcky:intro-done', run, { once: true });
  setTimeout(run, 9000);
}
/* Arbeit in kleinen Häppchen auf Leerlaufzeit verteilen (≈ 8 ms pro Stück) */
const onIdle = (cb) => (window.requestIdleCallback ? requestIdleCallback(cb, { timeout: 250 }) : setTimeout(cb, 16));

/* ============================
   UNTERSCHRIFT ZEICHNEN (Intro + Nav-Logo)
   SVG startet das Strichmuster bei jedem Absetzen („M") neu → J und „cky" würden gleichzeitig wachsen.
   Darum: Pfad in einzelne Striche teilen und nacheinander zeichnen, mit kurzer Pause fürs Absetzen.
============================ */
function sigSplit(svg) {
  const src = svg && svg.querySelector('path');
  if (!src) return [];
  const parts = src.getAttribute('d').trim().split(/(?=M)/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return [src];
  parts.forEach(d => { const p = src.cloneNode(); p.setAttribute('d', d); svg.appendChild(p); });
  src.remove();
  return [...svg.querySelectorAll('path')];
}
/* Fortschritt 0…1 auf die Striche verteilen (nach Länge; dazwischen je 4 % „Luft" für den abgesetzten Stift) */
function sigPlan(paths) {
  const lens = paths.map(p => p.getTotalLength()), sum = lens.reduce((a, b) => a + b, 0), lift = sum * 0.04;
  const total = sum + lift * (paths.length - 1);
  return { lens, total, lift };
}
function sigDraw(paths, plan, p) {
  let s = p * plan.total;
  paths.forEach((el, i) => {
    const L = plan.lens[i], drawn = Math.max(0, Math.min(L, s));
    el.style.strokeDasharray = L + ' ' + L;
    el.style.strokeDashoffset = (L - drawn).toFixed(2);
    el.style.visibility = drawn > 0.5 ? '' : 'hidden';             // sonst zeigt die runde Kappe schon einen Punkt
    s -= L + plan.lift;
  });
}

/* ============================
   PIXEL-BAUSTEINE für Scroll-Einblendungen — gleiche Blockverteilung wie Seitenwechsel und Scroll-Wipe.
   pxMeasure(el, Blockgröße) einmal (bzw. nach Größenänderung), dann pxClip(el, cover 0…1, 'build' | 'dissolve').
   build = baut sich von unten auf · dissolve = zerfällt nach oben.
============================ */
const PX_REDUCE  = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const PX_CLIP_OK = !!(window.CSS && CSS.supports && CSS.supports('clip-path', "path('M0 0H1V1Z')"));
function pxRand(gx, gy) {
  let x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
  x = (x ^ (x >>> 13)) * 1274126177 >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function pxMeasure(el, B) { el._pxW = el.offsetWidth; el._pxH = el.offsetHeight; el._pxB = Math.max(4, Math.round(B)); el._pxKey = null; }
function pxClip(el, cover, mode) {
  const key = mode + Math.round(cover * 120);                     // nur bei sichtbarer Änderung neu setzen
  if (el._pxKey === key) return;
  el._pxKey = key;
  if (cover >= 1) { el.style.clipPath = 'none'; return; }
  if (cover <= 0) { el.style.clipPath = 'inset(50%)'; return; }
  const B = el._pxB, cols = Math.ceil(el._pxW / B), rows = Math.ceil(el._pxH / B);
  let d = '';
  for (let gy = 0; gy < rows; gy++) {
    const rb = rows > 1 ? gy / (rows - 1) : 0;
    for (let gx = 0; gx < cols; gx++) {
      const rn = pxRand(gx, gy);
      const thr = mode === 'dissolve' ? rb * 0.62 + rn * 0.38 : (1 - rb) * 0.62 + rn * 0.38;
      if (cover >= thr) d += 'M' + gx * B + ' ' + gy * B + 'h' + (B + 1) + 'v' + (B + 1) + 'h-' + (B + 1) + 'Z';
    }
  }
  el.style.clipPath = d ? "path('" + d + "')" : 'inset(50%)';
}

/* EINTIPPEN (Mono-Texte): Zeichen erscheinen von links, davor ein kleines Fenster aus Zufallsbuchstaben.
   typePrepare(el) leert den Text vorab (Layout bleibt: geschützte Leerzeichen), typeIn(el) spielt ihn ab. */
const TYPE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function typePrepare(el) {
  if (!el || PX_REDUCE || el._typeOrig != null) return;
  el._typeOrig = el.textContent;
  el.textContent = el._typeOrig.replace(/\S/g, ' ');
}
function typeIn(el, dur) {
  if (!el || el._typeOrig == null || el._typed) return;
  el._typed = true;
  const run = el._typeRun = (el._typeRun || 0) + 1;              // neuer Lauf bricht einen laufenden ab
  const orig = el._typeOrig, n = orig.length, t0 = performance.now(), D = dur || 700, WIN = 4;
  (function loop(now) {
    if (run !== el._typeRun) return;
    const k = Math.min(1, (now - t0) / D), upto = Math.floor(k * n), tick = Math.floor(now / 55);
    let s = '';
    for (let i = 0; i < n; i++) {
      const ch = orig[i];
      if (i < upto || /\s/.test(ch)) s += ch;
      else if (i < upto + WIN) s += TYPE_CHARS[((i * 7 + tick * 13) >>> 0) % 26];
      else s += ' ';
    }
    el.textContent = k < 1 ? s : orig;
    if (k < 1) requestAnimationFrame(loop);
  })(t0);
}
/* einmal auslösen, sobald el ins untere Bilddrittel kommt */
function onEnterOnce(el, fn, margin) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  const io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) { io.disconnect(); fn(); }
  }, { rootMargin: '0px 0px ' + (margin || '-15%') + ' 0px' });
  io.observe(el);
}

/* ============================
   FOOTER — JCKY (Anton-Text), randlos über die volle Breite
   Jeder Buchstabe wird einzeln gesetzt. Seine echte Form wird zeilenweise
   per Canvas abgetastet, damit:
   · die Buchstabenhöhe exakt die Höhe von .ftp-word füllt,
   · die ENGSTE Stelle zwischen zwei Buchstaben überall gleich ist (optisch),
   · J bündig links und Y bündig rechts sitzt (28px Padding, per scaleX),
   · .ftp-note genau so breit ist wie der linke Haken des J und darüber sitzt.
   Steht bewusst oben in der Datei + try/catch → läuft unabhängig vom Rest.
============================ */
(function initFooterWord() {
  var GAP = 0.03;   // Buchstabenabstand als Anteil der Buchstabenhöhe
  var SZ = 200;     // Abtast-Schriftgröße (px)

  function setup() {
    var box = document.getElementById('footerWord');
    var inner = box && box.querySelector('.ftp-word-inner');
    if (!box || !inner) return;
    var note = box.parentNode.querySelector('.ftp-note');
    var chars = inner.textContent.trim().split('');
    if (chars.length < 2) return;

    inner.textContent = '';
    var spans = chars.map(function (ch) {
      var s = document.createElement('span');
      s.className = 'ftp-ch';
      s.textContent = ch;
      inner.appendChild(s);
      return s;
    });
    var marker = document.createElement('span');
    marker.setAttribute('aria-hidden', 'true');
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline;';
    spans[0].appendChild(marker);
    inner.classList.add('is-fit');

    var cache = { key: null, data: null };
    var probe = document.createElement('canvas').getContext('2d');

    /* Tastet jeden Buchstaben ab: pro Zeile linke/rechte Tintenkante + Ende des ersten Tintenlaufs */
    function scan(fam) {
      /* Fingerabdruck der TATSÄCHLICH gerenderten Schrift: ändert sich, sobald Anton
         wirklich geladen ist → nie wieder Positionen der Ersatzschrift im Cache */
      probe.font = '400 ' + SZ + 'px ' + fam;
      var pm = probe.measureText(chars.join(''));
      var key = fam + '|' + pm.width.toFixed(2) + '|' + (pm.actualBoundingBoxAscent || 0).toFixed(2);
      if (cache.key === key) return cache.data;
      var cw = Math.round(SZ * 2.5), ch = Math.round(SZ * 2), ox = Math.round(SZ * 0.5), base = Math.round(SZ * 1.4);
      var c = document.createElement('canvas'); c.width = cw; c.height = ch;
      var x = c.getContext('2d');
      if (!x) return null;
      var top = Infinity, bottom = -Infinity;
      var list = chars.map(function (letter) {
        x.clearRect(0, 0, cw, ch);
        x.font = '400 ' + SZ + 'px ' + fam;
        x.fillStyle = '#000';
        x.fillText(letter, ox, base);
        var d = x.getImageData(0, 0, cw, ch).data;
        var left = new Array(ch), right = new Array(ch), run = new Array(ch);
        var l = Infinity, r = -Infinity, tt = Infinity, bb = -Infinity;
        for (var y = 0; y < ch; y++) {
          var first = -1, last = -1, runEnd = -1, row = y * cw * 4;
          for (var i = 0; i < cw; i++) {
            if (d[row + i * 4 + 3] > 127) {
              if (first < 0) first = i;
              last = i;
            } else if (first >= 0 && runEnd < 0) runEnd = i;
          }
          if (first >= 0) {
            left[y] = first; right[y] = last + 1; run[y] = runEnd < 0 ? last + 1 : runEnd;
            if (first < l) l = first;
            if (last + 1 > r) r = last + 1;
            if (y < top) top = y;
            if (y + 1 > bottom) bottom = y + 1;
            if (y < tt) tt = y;
            bb = y + 1;
          } else { left[y] = right[y] = run[y] = null; }
        }
        return { l: l, r: r, tt: tt, bb: bb, left: left, right: right, run: run };
      });
      if (!(bottom > top) || list.some(function (g) { return !(g.r > g.l); })) return null;
      cache.key = key;
      cache.data = { ox: ox, base: base, top: top, bottom: bottom, list: list, rows: ch };
      return cache.data;
    }

    function fit() {
      try {
        var W = box.clientWidth, H = box.clientHeight;
        if (!W || !H) return;
        var fam = getComputedStyle(inner).fontFamily;
        var g = scan(fam);
        if (!g) return;
        var inkH = g.bottom - g.top;
        var gap = GAP * inkH;

        /* Position der linken Tintenkante jedes Buchstabens: engste Stelle = gap */
        var pos = [0], i, y;
        for (i = 0; i < g.list.length - 1; i++) {
          var a = g.list[i], b = g.list[i + 1], need = -Infinity;
          for (y = g.top; y < g.bottom; y++) {
            if (a.right[y] == null || b.left[y] == null) continue;
            var v = (a.right[y] - a.l) - (b.left[y] - b.l);
            if (v > need) need = v;
          }
          if (need === -Infinity) need = a.r - a.l;          // keine gemeinsamen Zeilen
          pos.push(pos[i] + need + gap);
        }
        var total = 0;
        g.list.forEach(function (gl, k2) { total = Math.max(total, pos[k2] + gl.r - gl.l); });

        var k = H / inkH;                                       // Bildschirm-px pro Abtast-px (vertikal)
        var sx = W / (total * k);                               // horizontale Streckung
        inner.style.fontSize = (SZ * k) + 'px';
        var top = (g.base - g.top) * k - marker.offsetTop;      // Tinten-Oberkante = Box-Oberkante
        spans.forEach(function (s, n) {
          var gl = g.list[n];
          s.style.top = top + 'px';
          s.style.left = ((pos[n] - (gl.l - g.ox)) * k * sx) + 'px';
          s.style.transform = 'scaleX(' + sx.toFixed(4) + ')';
        });
        /* Layout merken → Footer-Explosion (Treffertest + Pixel aus der Buchstabenfläche) */
        box._jcky = {
          v: box._jcky ? box._jcky.v + 1 : 1,
          fs: SZ * k, sx: sx, fam: fam, base: (g.base - g.top) * k, chars: chars, spans: spans,
          xs: g.list.map(function (gl, n) { return (pos[n] - (gl.l - g.ox)) * k * sx; }),
          boxes: g.list.map(function (gl, n) {           // Tinten-Rechteck je Buchstabe (Box-Koordinaten)
            return { x: pos[n] * k * sx, y: (gl.tt - g.top) * k, w: (gl.r - gl.l) * k * sx, h: (gl.bb - gl.tt) * k };
          })
        };

        /* Dankestext: so breit wie der linke Haken des J, oberhalb davon */
        if (note) {
          var J = g.list[0], jw = J.r - J.l, hook = -1;
          for (y = g.top; y < g.bottom; y++) {
            if (J.left[y] != null && J.left[y] - J.l < jw * 0.25) { hook = y; break; }
          }
          if (hook > g.top) {
            var probe = Math.min(g.bottom - 1, hook + Math.round(inkH * 0.03));
            var hookW = (J.run[probe] != null ? J.run[probe] - J.l : 0) * k * sx;
            var room = (hook - g.top) * k - 12;
            if (hookW > 60 && room > 30) {
              note.style.width = hookW + 'px';
              note.style.maxHeight = room + 'px';
            }
          }
        }
      } catch (err) {}
    }

    fit();
    requestAnimationFrame(fit);
    if (document.fonts) {
      try { document.fonts.load('400 100px "Anton"').then(fit, fit); } catch (e) {}
      if (document.fonts.ready) document.fonts.ready.then(fit);
      try { document.fonts.addEventListener('loadingdone', fit); } catch (e) {}   // jede nachgeladene Schrift → neu messen
    }
    window.addEventListener('load', fit);
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(box);
    else window.addEventListener('resize', fit);
  }
  try {
    /* Abtasten kostet ~200 ms → erst nach der Intro (der Footer ist ohnehin ganz unten) */
    const start = () => afterIntro(() => { try { setup(); } catch (e) {} });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  } catch (e) {}
})();

/* ============================
   HERO — Pixel-Partikel bei Mausbewegung
   Quadratische Pixel in Tintenfarbe stieben in Bewegungsrichtung der Maus, bremsen ab,
   schrumpfen und blenden aus. Nur bei Bewegung, Anzahl begrenzt. mix-blend-mode: difference
   (wie der Hero-Name) → auf hellen Bildern dunkel, auf dunklem Grund hell. Pausiert, solange
   der Play-Cursor sichtbar ist. Eigenständig + try/catch → läuft unabhängig vom Rest.
============================ */
(function initHeroParticles() {
  try {
    var hero = document.getElementById('hero');
    if (!hero) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia && !window.matchMedia('(any-hover: hover)').matches) return;
    var MAX = 220, LIFE = 1000, SIZES = [3, 4, 4, 5, 6];
    var cv = document.createElement('canvas');
    cv.className = 'hero-dust'; cv.setAttribute('aria-hidden', 'true');
    hero.appendChild(cv);
    var ctx = cv.getContext('2d');
    if (!ctx) return;
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#F0EDE8';
    var W = 0, H = 0, dpr = 1, parts = [], raf = 0, last = null, prevT = 0;
    function size() {
      W = hero.clientWidth; H = hero.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    }
    size();
    function frame(now) {
      raf = 0;
      var dt = Math.min(48, now - (prevT || now)); prevT = now;
      var f = dt / 16.67;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = ink;
      parts = parts.filter(function (p) {
        p.age += dt;
        if (p.age >= p.life) return false;
        var k = Math.pow(0.93, f);                    // Luftwiderstand
        p.vx *= k; p.vy *= k;
        p.x += p.vx * f; p.y += p.vy * f;
        var life = 1 - p.age / p.life;
        var s = Math.max(1, Math.round(p.s * (0.4 + 0.6 * life)));   // schrumpft
        ctx.globalAlpha = 0.8 * life * life;
        ctx.fillRect(Math.round(p.x) - s / 2, Math.round(p.y) - s / 2, s, s);
        return true;
      });
      ctx.globalAlpha = 1;
      if (parts.length) raf = requestAnimationFrame(frame); else prevT = 0;
    }
    window.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height || window.__playCursorActive) { last = null; return; }
      if (r.width !== W || r.height !== H) size();
      if (last) {
        var dx = x - last.x, dy = y - last.y, speed = Math.sqrt(dx * dx + dy * dy);
        var n = Math.min(5, Math.floor(speed / 7));   // mehr Tempo = mehr Pixel
        for (var i = 0; i < n && parts.length < MAX; i++) {
          var t = Math.random(), spread = (Math.random() - 0.5) * 0.9;
          var ca = Math.cos(spread), sa = Math.sin(spread), m = 0.18 + Math.random() * 0.22;
          parts.push({ x: last.x + dx * t, y: last.y + dy * t, vx: (dx * ca - dy * sa) * m, vy: (dx * sa + dy * ca) * m,
                       age: 0, life: LIFE * (0.6 + Math.random() * 0.5), s: SIZES[Math.floor(Math.random() * SIZES.length)] });
        }
        if (n && !raf) raf = requestAnimationFrame(frame);
      }
      last = { x: x, y: y };
    }, { passive: true });
    window.addEventListener('resize', size);
  } catch (e) {}
})();

/* ============================
   FOOTER — Buchstaben-Explosion
   Klick auf einen Buchstaben des großen JCKY im Footer → er zerplatzt in Pixel und kommt zurück.
============================ */
(function initFooterExplosion() {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* ── gemeinsamer Pixel-Regen ── */
  var rain = null;
  function burstFrom(points, cx, halfW) {
    if (reduce || !points.length) return;
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#F0EDE8';
    if (!rain) {
      var cv = document.createElement('canvas');
      cv.className = 'egg-canvas';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      rain = { cv: cv, ctx: cv.getContext('2d'), parts: [], last: performance.now() };
      requestAnimationFrame(frame);
    }
    var SIZES = [6, 9, 12, 12, 18];
    points.forEach(function (pt) {
      var side = Math.max(-1, Math.min(1, (pt[0] - cx) / (halfW || 1)));
      var a = -Math.PI / 2 + side * Math.PI * 0.45 + (Math.random() - 0.5) * 0.6;
      var v = 8 + Math.random() * 16;
      rain.parts.push({
        x: pt[0], y: pt[1],
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4,
        s: SIZES[Math.floor(Math.random() * SIZES.length)],
        age: 0, life: 2600 + Math.random() * 1400,
        c: Math.random() < 0.15 ? 'rgba(240,237,232,0.35)' : ink
      });
    });
  }
  function frame(now) {
    if (!rain) return;
    var dt = Math.min(48, now - rain.last), f = dt / 16.67;
    rain.last = now;
    var cv = rain.cv, ctx = rain.ctx, dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth, h = window.innerHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    rain.parts = rain.parts.filter(function (p) {
      p.age += dt;
      if (p.age > p.life) return false;
      p.vy += 0.42 * f;
      p.vx *= Math.pow(0.992, f);
      p.x += p.vx * f; p.y += p.vy * f;
      if (p.y > h - p.s) { p.y = h - p.s; p.vy *= -0.42; p.vx *= 0.82; }
      if (p.x < 0) { p.x = 0; p.vx *= -0.6; }
      if (p.x > w - p.s) { p.x = w - p.s; p.vx *= -0.6; }
      ctx.globalAlpha = Math.min(1, (p.life - p.age) / 700);
      ctx.fillStyle = p.c;
      ctx.fillRect(Math.round(p.x / 3) * 3, Math.round(p.y / 3) * 3, p.s, p.s);   // aufs Raster snappen
      return true;
    });
    ctx.globalAlpha = 1;
    if (rain.parts.length) requestAnimationFrame(frame);
    else { rain.cv.remove(); rain = null; }
  }

  function initFooterExplode() {
    var box = document.getElementById('footerWord');
    if (!box || reduce) return;
    var PARTS = 190, BACK = 2400;                   // Pixel pro Buchstabe · ms bis zum Wieder-Einblenden
    var masks = null, maskKey = null;

    /* Alpha-Maske je Buchstabe (für Treffertest + Pixel-Startpunkte), neu nur bei Layout-Änderung */
    function getMasks(Lay) {
      if (maskKey === Lay.v && masks) return masks;
      var color = '#000';
      masks = Lay.boxes.map(function (b, n) {
        var w = Math.max(1, Math.ceil(b.w)), h = Math.max(1, Math.ceil(b.h));
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d');
        x.fillStyle = color;
        x.font = '400 ' + Lay.fs + 'px ' + Lay.fam;
        x.translate(Lay.xs[n] - b.x, Lay.base - b.y);
        x.scale(Lay.sx, 1);
        x.fillText(Lay.chars[n], 0, 0);
        return { w: w, h: h, a: x.getImageData(0, 0, w, h).data };
      });
      maskKey = Lay.v;
      return masks;
    }
    function inkAt(m, x, y) {
      x = Math.round(x); y = Math.round(y);
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
      return m.a[(y * m.w + x) * 4 + 3] > 127;
    }

    box.addEventListener('click', function (e) {
      var Lay = box._jcky;
      if (!Lay) return;
      var r = box.getBoundingClientRect();
      var px = e.clientX - r.left, py = e.clientY - r.top;
      var M = getMasks(Lay), pick = -1, pickD = Infinity;
      /* Treffer: Punkt liegt auf der Tinte (mit 14px Toleranz), sonst nächster Buchstabe im Rechteck */
      Lay.boxes.forEach(function (b, n) {
        var lx = px - b.x, ly = py - b.y;
        if (lx < -14 || ly < -14 || lx > b.w + 14 || ly > b.h + 14) return;
        var d = Infinity;
        for (var oy = -14; oy <= 14 && d > 0; oy += 7) {
          for (var ox = -14; ox <= 14; ox += 7) {
            if (inkAt(M[n], lx + ox, ly + oy)) d = Math.min(d, Math.abs(ox) + Math.abs(oy));
          }
        }
        if (d < pickD) { pickD = d; pick = n; }
      });
      if (pick < 0) return;
      var span = Lay.spans[pick];
      if (!span || span.classList.contains('is-gone')) return;

      /* Startpunkte zufällig auf der Buchstabenfläche (Viewport-Koordinaten) */
      var b = Lay.boxes[pick], m = M[pick], pts = [], tries = 0;
      while (pts.length < PARTS && tries < PARTS * 40) {
        tries++;
        var sx = Math.random() * m.w, sy = Math.random() * m.h;
        if (inkAt(m, sx, sy)) pts.push([r.left + b.x + sx, r.top + b.y + sy]);
      }
      span.classList.add('is-gone');
      burstFrom(pts, r.left + b.x + b.w / 2, b.w / 2);
      setTimeout(function () { span.classList.remove('is-gone'); }, BACK);
    });
  }

  function setup() {
    initFooterExplode();
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
  } catch (e) {}
})();

/* ============================
   PAGE LOADER — Unterschrift + Teilung
   1. „Jcky" wird wie eine Unterschrift gezeichnet (Strich-Animation, ruhig an- und ausschwingend).
   2. Ist die Seite bereit, zieht sich von der Mitte aus eine feine Linie über den Bildschirm …
   3. … und der Bildschirm teilt sich entlang der Linie: obere Hälfte nach oben, untere nach unten
      (beide tragen die Unterschrift → sie wird mittendurch geschnitten). Dabei steigt der Hero-Name auf.
   Lädt die Seite länger als die Unterschrift dauert, erscheint unten rechts dezent „Loading 64 %".
   Volle Länge einmal pro Sitzung; bei erneutem Laden eine kurze Version.
============================ */
(function initLoader() {
  const loader = document.getElementById('pageLoader');
  const pct    = document.getElementById('loaderPercent');
  if (!loader) return;

  /* Bei interner Navigation Loader überspringen — die Slide-Transition
     sorgt bereits für Kontinuität; Hero danach normal einblenden. */
  if (ARRIVED_VIA_INTERNAL_NAV) {
    loader.style.display = 'none';
    loader.classList.add('is-hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (typeof window.__heroInit === 'function') window.__heroInit(true);
    }));
    return;
  }

  document.documentElement.style.overflow = 'hidden';

  const top  = loader.querySelector('.ld-top');
  const line = loader.querySelector('.ld-line');
  const meta = loader.querySelector('.ld-meta');
  sigSplit(top.querySelector('.ld-sig'));                             // J und „cky" als eigene Striche (nacheinander)
  const bot  = top.cloneNode(true);                                   // zweite Hälfte = deckungsgleiche Kopie
  bot.classList.replace('ld-top', 'ld-bot');
  top.after(bot);
  const sigs = [...loader.querySelectorAll('.ld-sig')].map(s => [...s.querySelectorAll('path')]);
  const stages = [...loader.querySelectorAll('.ld-stage')];

  const quick = vtStoreGet('jcky:introSeen') === '1';                 // schon gesehen → kurze Version
  vtStoreSet('jcky:introSeen', '1');
  const DRAW = PX_REDUCE ? 0 : quick ? 750 : 2300;                    // Unterschrift (ms)
  const LINE = PX_REDUCE ? 0 : quick ? 320 : 520;                     // Linie wächst (ms)
  const SPLIT = PX_REDUCE ? 0 : quick ? 900 : 1250;                   // Teilung (ms)
  const EXPO = 'cubic-bezier(0.76, 0, 0.24, 1)';                      // weich an- und auslaufend

  /* ── 1. Unterschrift zeichnen ── */
  const plan = sigPlan(sigs[0]);
  const drawAll = (p) => sigs.forEach(paths => sigDraw(paths, plan, p));
  drawAll(0);
  loader.classList.add('is-ready');
  const penEase = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;   // wie ein Stift: anziehen, gleiten, auslaufen
  /* Bild für Bild statt nach der Uhr: hängt der Browser kurz, pausiert der Strich (max. 1/30 s pro Bild)
     statt Teile zu überspringen. Start erst nach dem ersten wirklich gezeichneten Bild + kurzer Ruhe. */
  const drawn = new Promise((resolve) => {
    if (!DRAW) { drawAll(1); resolve(); return; }
    let elapsed = 0, last = 0;
    function frame(now) {
      if (last) elapsed += Math.min(now - last, 1000 / 30);
      last = now;
      const k = Math.min(1, elapsed / DRAW);
      drawAll(penEase(k));
      if (k < 1) requestAnimationFrame(frame); else resolve();
    }
    /* Start nach dem „load"-Ruck (ScrollTrigger vermisst dann alles neu), spätestens nach 0,7 s */
    const loaded = new Promise(r => { if (document.readyState === 'complete') r(); else window.addEventListener('load', r, { once: true }); });
    Promise.race([loaded, new Promise(r => setTimeout(r, 700))]).then(() =>
      requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => requestAnimationFrame(frame), quick ? 40 : 120))));
  });

  /* ── Laden: echte Bereitschaft (load + Schriften); Prozent nur als Fallback-Anzeige ── */
  let shown = 0, target = 0;
  const trickle = setInterval(() => { target = Math.min(88, target + Math.random() * 4 + 1.5); }, 120);
  const ready = new Promise((resolve) => {
    const go = () => { clearInterval(trickle); target = 100; (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(resolve); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
  });
  (function count() {
    shown += (target - shown) * 0.15;
    if (pct) pct.textContent = Math.floor(shown);
    if (!loader.classList.contains('is-hidden')) requestAnimationFrame(count);
  })();
  drawn.then(() => { setTimeout(() => { if (!loader.classList.contains('is-splitting')) meta.classList.add('is-on'); }, 350); });

  /* ── 2. + 3. Linie, dann Teilung ── */
  function finish() {
    loader.classList.add('is-hidden');
    loader.style.display = 'none';
    window.__introDone = true;
    window.dispatchEvent(new Event('jcky:intro-done'));             // jetzt darf die schwere Vorarbeit starten (afterIntro)
  }
  Promise.all([drawn, ready]).then(() => new Promise(r => setTimeout(r, PX_REDUCE ? 0 : quick ? 120 : 280))).then(() => {
    loader.classList.add('is-splitting');
    meta.classList.remove('is-on');
    if (PX_REDUCE) {                                                  // ohne Bewegung: kurz ausblenden
      document.documentElement.style.overflow = '';
      if (typeof window.__heroInit === 'function') window.__heroInit();
      loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(finish);
      return;
    }
    line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: LINE, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });
    setTimeout(() => {
      document.documentElement.style.overflow = '';
      line.animate([{ opacity: 1 }, { opacity: 0 }], { duration: SPLIT * 0.35, easing: 'ease-out', fill: 'forwards' });
      const opts = { duration: SPLIT, easing: EXPO, fill: 'forwards' };
      top.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-52%)' }], opts);
      bot.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(52%)' }], opts)
        .finished.then(finish);
      stages.forEach(s => s.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }], opts));   // leichte Tiefe beim Öffnen
      /* Hero-Name steigt auf, während sich die Hälften öffnen */
      setTimeout(() => { if (typeof window.__heroInit === 'function') window.__heroInit(); }, SPLIT * 0.22);
    }, LINE + 60);
  });
})();

/* ============================
   NAV-LOGO — dieselbe Unterschrift wie in der Intro; zeichnet sich nach der Intro einmal kurz nach
   (große Unterschrift → kleine oben links). Ohne Intro (interne Navigation, Unterseiten) oder bei
   Reduced Motion steht sie einfach da.
============================ */
(function initNavSignature() {
  const svg = document.querySelector('.nav-logo-sig');
  const loader = document.getElementById('pageLoader');
  if (!svg || !loader || PX_REDUCE || ARRIVED_VIA_INTERNAL_NAV) return;
  const paths = sigSplit(svg), plan = sigPlan(paths);
  sigDraw(paths, plan, 0);                                              // versteckt, bis die Intro fertig ist
  let started = false;
  function draw() {
    if (started) return;
    started = true;
    const t0 = performance.now(), D = 1100;
    (function frame(now) {
      const k = Math.min(1, (now - t0) / D), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      sigDraw(paths, plan, e);
      if (k < 1) requestAnimationFrame(frame);
      else paths.forEach(p => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
    })(t0);
  }
  window.addEventListener('jcky:intro-done', draw, { once: true });
  setTimeout(draw, 9000);                                               // Sicherheitsnetz: Logo nie dauerhaft unsichtbar
})();

/* ============================
   PAGE TRANSITIONS — EDITORIAL PANEL (Aino-Stil)
   Ruhiges Off-White-Panel wischt über den Seitenwechsel: Zielname (sauberer
   Text) + Katalog-Code + kleine Eckmetadaten, weiche Expo-Easings.
   Ein Panel „zieht durch": vorwärts nach oben, zurück nach unten.
   Handoff via sessionStorage; Vanilla, alle modernen Browser.
============================ */
(function initEditorialTransition() {
  const PAGE = {
    'index.html':    { name: 'Start',    code: 'A—01', order: 0 },
    'projects.html': { name: 'My Work', code: 'A—02', order: 1 },
    'cv.html':       { name: 'Me',       code: 'A—03', order: 2 },
  };
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
  const DUR = 680;

  function pageKey(url) {
    try {
      const f = new URL(url, location.href).pathname.split('/').pop();
      return f === '' ? 'index.html' : f;
    } catch (e) { return null; }
  }
  function metaFor(url) { return PAGE[pageKey(url)] || { name: '', code: '', order: 0 }; }
  function dirBetween(fromU, toU) { return metaFor(toU).order < metaFor(fromU).order ? 'back' : 'forward'; }

  const PANEL_COLOR = '#f5f5f0';
  const PX_BLOCK = 72;          // gleiche Blockgröße wie der Scroll-Pixel-Wipe
  const PX_BIAS  = 0.62;        // Anteil "von unten" (wie beim Scroll-Wipe)
  function pxRnd(gx, gy) {
    let x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
    x = (x ^ (x >>> 13)) * 1274126177 >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function buildPanel(m) {
    const p = document.createElement('div');
    p.id = 'ainoPanel';

    const canvas = document.createElement('canvas');
    canvas.className = 'aino-px';
    canvas.setAttribute('aria-hidden', 'true');
    p.appendChild(canvas);

    const center = document.createElement('div');
    center.className = 'aino-center';
    center.innerHTML =
      '<span class="aino-code">' + m.code + '</span>' +
      '<span class="aino-clip"><span class="aino-name-inner">' + m.name + '</span></span>';
    p.appendChild(center);

    const meta = document.createElement('span');
    meta.className = 'aino-meta aino-br';
    meta.textContent = 'Salzburg, AT';
    p.appendChild(meta);

    document.documentElement.appendChild(p);

    /* Pixel-Engine: Fläche aus 72er-Blöcken. cover 0..1.
       mode 'build' = von unten aufbauen · 'dissolve' = von unten abbauen (verschwindet nach oben). */
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, cols = 0, rows = 0, dpr = 1;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(W / PX_BLOCK); rows = Math.ceil(H / PX_BLOCK);
    }
    resize();
    function draw(cover, mode) {
      ctx.clearRect(0, 0, W, H);
      if (cover <= 0) return;
      ctx.fillStyle = PANEL_COLOR;
      if (cover >= 1) { ctx.fillRect(0, 0, W, H); return; }
      for (let gy = 0; gy < rows; gy++) {
        const rowBias = rows > 1 ? gy / (rows - 1) : 0;     // 0 = oben, 1 = unten
        for (let gx = 0; gx < cols; gx++) {
          const r = pxRnd(gx, gy);
          const thr = (mode === 'dissolve')
            ? rowBias * PX_BIAS + r * (1 - PX_BIAS)          // unten hoch → löst zuerst auf (nach oben)
            : (1 - rowBias) * PX_BIAS + r * (1 - PX_BIAS);   // unten niedrig → füllt zuerst (von unten)
          if (cover >= thr) ctx.fillRect(gx * PX_BLOCK, gy * PX_BLOCK, PX_BLOCK + 1, PX_BLOCK + 1);
        }
      }
    }
    p._px = { draw, resize };
    window.addEventListener('resize', resize);
    p._pxCleanup = () => window.removeEventListener('resize', resize);
    return p;
  }

  /* cover-Wert von 'from' → 'to' animieren (rAF, easeInOut); onFrame(cover) pro Frame */
  function animateCover(p, from, to, dur, mode, onFrame) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function frame(now) {
        const t = Math.min(1, (now - t0) / dur);
        const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const cover = from + (to - from) * e;
        p._px.draw(cover, mode);
        if (onFrame) onFrame(cover);
        if (t < 1) requestAnimationFrame(frame); else resolve();
      })(performance.now());
    });
  }

  function anim(el, keyframes, opts) {
    return el.animate(keyframes, Object.assign({ fill: 'forwards' }, opts));
  }

  /* ── OUTGOING: interne Links abfangen → Panel rein → navigieren ── */
  let transitioning = false;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('#') || a.target === '_blank' || a.hasAttribute('download')) return;
    const dest = pageKey(a.href);
    if (!dest || !PAGE[dest] || a.origin !== location.origin) return;

    e.preventDefault();
    if (transitioning) return;
    transitioning = true;

    const dir = dirBetween(location.href, a.href);
    vtStoreSet('jcky:internalNav', '1');
    vtStoreSet('jcky:vtDir', dir);
    try { if (typeof lenis !== 'undefined' && lenis && lenis.stop) lenis.stop(); } catch (_) {}

    const go = () => { window.location.href = a.href; };
    const p = buildPanel(metaFor(a.href));

    if (reduceMotion) {
      p._px.draw(1, 'build');
      setTimeout(go, 200);
      return;
    }

    const nameInner = p.querySelector('.aino-name-inner');
    const code = p.querySelector('.aino-code');
    nameInner.style.transform = 'translateY(110%)';
    code.style.opacity = '0';

    /* Panel baut sich aus Pixeln von unten auf, dann navigieren */
    animateCover(p, 0, 1, DUR, 'build').then(() => setTimeout(go, 110));

    /* Name/Code erscheinen, sobald die Fläche großteils aufgebaut ist */
    setTimeout(() => {
      anim(nameInner, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0%)' }], { duration: 520, easing: EASE });
      anim(code, [{ opacity: 0 }, { opacity: 1 }], { duration: 460, easing: 'ease-out' });
    }, DUR * 0.5);
  }, true);

  /* ── Zurück-Button / bfcache: wiederhergestellte, noch verdeckte Seite befreien ── */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const leftover = document.getElementById('ainoPanel');
    if (leftover && leftover.parentNode) leftover.parentNode.removeChild(leftover);
    document.documentElement.classList.remove('vt-arriving');
    transitioning = false;
    try { if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); } catch (_) {}
  });

  /* ── INCOMING: Panel ausfahren ── */
  if (ARRIVED_VIA_INTERNAL_NAV) {
    const dir = vtStoreGet('jcky:vtDir') || 'forward';
    vtStoreDel('jcky:vtDir');

    const cleanup = (p) => {
      if (p && p._pxCleanup) p._pxCleanup();
      if (p && p.parentNode) p.parentNode.removeChild(p);
      document.documentElement.classList.remove('vt-arriving');
      try { if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); } catch (_) {}
    };

    const start = () => {
      const p = buildPanel(metaFor(location.href));
      p._px.draw(1, 'build');               // deckt bereits (volle Pixel-Fläche)
      const nameInner = p.querySelector('.aino-name-inner');

      if (reduceMotion) {
        document.documentElement.classList.remove('vt-arriving');
        p.style.transition = 'opacity 220ms';
        requestAnimationFrame(() => { p.style.opacity = '0'; });
        setTimeout(() => cleanup(p), 240);
        return;
      }
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('vt-arriving');
        setTimeout(() => {
          const center = p.querySelector('.aino-center');
          /* Text bleibt sichtbar, während die Pixel von unten abbauen — und verschwindet
             genau dann, wenn der Abbau die Mitte der Seite (≈50%) erreicht (dort steht der Text). */
          animateCover(p, 1, 0, DUR, 'dissolve', (cover) => {
            if (center && cover <= 0.5) { center.style.opacity = '0'; }
          }).then(() => cleanup(p));
        }, 150);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(start));
    } else {
      requestAnimationFrame(start);
    }
  }
})();

/* ============================
   LENIS — SMOOTH SCROLL
============================ */
const lenis = new Lenis({
  duration: 1.25,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
  wheelMultiplier: 0.85,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

/* ============================
   SMOOTHING HELPER
   Frameraten-unabhängiges Lerp: gleicher „Nachlauf" (in Sekunden) auf 60/120/144 Hz.
   Ersetzt feste Pro-Frame-Faktoren, die auf High-Refresh-Displays zu schnell laufen.
   smoothTowards(current, target, smoothSeconds, deltaSeconds)
============================ */
function smoothTowards(cur, target, smooth, dt) {
  if (smooth <= 0) return target;
  const k = 1 - Math.exp(-dt / smooth);
  return cur + (target - cur) * k;
}


/* ============================
   MAGNETIC BUTTONS
   Buttons ziehen sich beim Hover leicht zum Cursor (Trägheit → "Masse").
   Dezent, framerate-unabhängig geglättet, respektiert Reduced-Motion.
============================ */
(function initMagnetic() {
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!fine || reduce) return;

  const STRENGTH = 0.28;   // wie stark der Button dem Cursor folgt (Anteil des Offsets)
  const SMOOTH   = 0.09;   // Sekunden Nachlauf

  const items = [];
  document.querySelectorAll('.projects-cta').forEach((el) => {
    const state = { el, tx: 0, ty: 0, cx: 0, cy: 0, active: false, parked: true };
    el.addEventListener('mouseenter', () => { state.active = true; });
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      state.tx = (e.clientX - (r.left + r.width / 2)) * STRENGTH;
      state.ty = (e.clientY - (r.top + r.height / 2)) * STRENGTH;
    });
    el.addEventListener('mouseleave', () => { state.tx = 0; state.ty = 0; state.active = false; });
    items.push(state);
  });
  if (!items.length) return;

  gsap.ticker.add((time, deltaTime) => {
    const dt = Math.min(deltaTime || 16.7, 50) / 1000;
    for (let i = 0; i < items.length; i++) {
      const s = items[i];
      s.cx = smoothTowards(s.cx, s.tx, SMOOTH, dt);
      s.cy = smoothTowards(s.cy, s.ty, SMOOTH, dt);
      const resting = Math.abs(s.cx) < 0.1 && Math.abs(s.cy) < 0.1 && !s.active;
      if (resting) {
        if (!s.parked) {                       // im Ruhezustand transform ganz entfernen
          s.cx = 0; s.cy = 0; s.parked = true;
          s.el.style.transform = '';
          s.el.style.willChange = '';
        }
        continue;
      }
      s.parked = false;
      s.el.style.willChange = 'transform';
      // ganzzahlige Pixel → kein Subpixel-Smear beim backdrop-filter
      s.el.style.transform = 'translate3d(' + Math.round(s.cx) + 'px,' + Math.round(s.cy) + 'px,0)';
    }
  });
})();

/* ============================
   NAV — Click to scroll via Lenis
============================ */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    let href = link.getAttribute('href');
    if (!href || href === '#') return;

    /* „Find me here" → direkt ins Kontakt-Kapitel der Story (liegt mitten im fixierten Scrollweg) */
    if (href === '#contact') {
      const y = typeof window.__storyContactY === 'function' ? window.__storyContactY() : null;
      e.preventDefault();
      if (y != null) lenis.scrollTo(y, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else { const s = document.getElementById('storySection'); if (s) lenis.scrollTo(s, { duration: 2.2 }); }
      return;
    }

    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();

    if (href === '#hero') {
      lenis.scrollTo(0, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
      return;
    }

    lenis.scrollTo(target, { offset: 0, duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  });
});


/* ============================
   CONTACT PIXEL HOVER — Ink-Blöcke steigen beim Hover verstreut von unten auf
   (überträgt den Pixel-Wipe-Stil auf die "Find me here"-Links). Canvas je Link.
============================ */
(function initContactPixels() {
  const items = document.querySelectorAll('.projects-cta, .cvh-bubble, .nav .nav-cell:not(.nav-brand), .site-footer-bar .sf-link, .site-footer-bar .sf-right');
  if (!items.length) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ROWS = 6;            // feste Zeilenzahl → Blockgröße skaliert mit dem Feld (zoom-stabil)
  const BIAS  = 0.6;         // Anteil "von unten"
  const SMOOTH = 0.11;       // Sekunden – Ein-/Ausblenden
  const INK = '240, 237, 232';

  function rnd(gx, gy) {
    let h = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  const sizers = [];
  items.forEach((item) => {
    const cv = document.createElement('canvas');
    cv.className = 'gc-pixels';
    cv.setAttribute('aria-hidden', 'true');
    item.insertBefore(cv, item.firstChild);
    const ctx = cv.getContext('2d');

    let w = 0, h = 0, cols = 0, rows = 0, dpr = 1, bs = 13;
    function size() {
      /* Exakte (fraktionale) Padding-Box → deckt sich präzise mit inset:0 des Canvas,
         damit die Pixel bündig an den Trennlinien enden (kein Rundungs-Versatz). */
      const r = item.getBoundingClientRect();
      const cs = getComputedStyle(item);
      const bl = parseFloat(cs.borderLeftWidth) || 0, brd = parseFloat(cs.borderRightWidth) || 0;
      const bt = parseFloat(cs.borderTopWidth) || 0, bb = parseFloat(cs.borderBottomWidth) || 0;
      w = Math.max(1, r.width - bl - brd); h = Math.max(1, r.height - bt - bb);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bs = Math.max(6, h / ROWS);   // Blockgröße relativ zur Feldhöhe → konstante Dichte bei jedem Zoom
      cols = Math.ceil(w / bs); rows = Math.max(1, Math.ceil(h / bs));
    }
    size();
    sizers.push(size);
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(item);

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      if (p <= 0.001) return;
      ctx.fillStyle = 'rgb(' + INK + ')';
      for (let gy = 0; gy < rows; gy++) {
        const rowBias = rows > 1 ? gy / (rows - 1) : 1;      // 0 oben, 1 unten
        for (let gx = 0; gx < cols; gx++) {
          const thr = (1 - rowBias) * BIAS + rnd(gx, gy) * (1 - BIAS); // unten zuerst
          if (p >= thr) ctx.fillRect(gx * bs, gy * bs, bs + 1, bs + 1);
        }
      }
    }

    let prog = 0, target = 0, raf = null, lastT = 0;
    function loop(now) {
      if (!lastT) lastT = now;
      const dt = Math.min((now - lastT) || 16.7, 50) / 1000; lastT = now;
      const k = reduce ? 1 : (1 - Math.exp(-dt / SMOOTH));
      prog += (target - prog) * k;
      if (Math.abs(target - prog) < 0.002) prog = target;
      draw(prog);
      if (prog !== target) { raf = requestAnimationFrame(loop); }
      else { raf = null; lastT = 0; }
    }
    function go(t) { target = t; if (!raf) { lastT = 0; raf = requestAnimationFrame(loop); } }

    item.addEventListener('mouseenter', () => go(1));
    item.addEventListener('mouseleave', () => go(0));
    item.addEventListener('focus', () => go(1));
    item.addEventListener('blur', () => go(0));
  });

  /* Nach Font-Laden und load neu vermessen → Canvas füllt das ganze Feld */
  function resizeAll() { sizers.forEach((fn) => fn()); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(resizeAll);
  window.addEventListener('load', resizeAll);
})();

/* ============================
   VIDEO CURSOR — Play-Button aus Pixelblöcken über dem Hero-Video
   Helle Pixel-Scheibe mit dunklem Play-Dreieck (wie die Nav-Hover-Zellen: Ink-Fläche, dunkles Zeichen);
   baut sich beim Hovern von der Mitte aus auf und zerfällt beim Verlassen von außen nach innen.
   Folgt der Maus mit Nachlauf, neigt sich leicht in Bewegungsrichtung, drückt sich beim Klicken ein.
   Darunter tippt sich „Play reel" ein. Aktiv, sobald das Video sichtbar ist (nicht erst im Vollbild).
============================ */
(function initVideoCursor() {
  const card = document.getElementById('heroImgCard');
  if (!card) return;
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const SIZE = 96, G = 12, B = SIZE / G;                // 12 × 12 Blöcke à 8 px
  /* Form: Scheibe minus Play-Dreieck (in Block-Einheiten, Mitte = 0) */
  const tri = [[-1.7, -2.9], [-1.7, 2.9], [3.1, 0]];
  const side = (p, a, b) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const inTri = (p) => { const d1 = side(p, tri[0], tri[1]), d2 = side(p, tri[1], tri[2]), d3 = side(p, tri[2], tri[0]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
  const cells = [];
  for (let gy = 0; gy < G; gy++) for (let gx = 0; gx < G; gx++) {
    const p = [gx + 0.5 - G / 2, gy + 0.5 - G / 2], r = Math.hypot(p[0], p[1]);
    if (r > G / 2 - 0.25) continue;
    cells.push({ x: gx * B, y: gy * B, dark: inTri(p), thr: (r / (G / 2)) * 0.6 + pxRand(gx, gy + 40) * 0.4 });   // innen zuerst
  }

  const cur = document.createElement('div');
  cur.id = 'videoCursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<div class="vc-inner"><canvas class="vc-px"></canvas><span class="vc-label">Play reel</span></div>';
  document.body.appendChild(cur);
  const inner = cur.querySelector('.vc-inner'), cv = cur.querySelector('.vc-px'), ctx = cv.getContext('2d');
  const label = cur.querySelector('.vc-label');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = SIZE * dpr; cv.height = SIZE * dpr;
  const css = getComputedStyle(document.documentElement);
  const ink = css.getPropertyValue('--ink').trim() || '#F0EDE8', dark = css.getPropertyValue('--bg-dark').trim() || '#0A0A09';

  let over = false, down = false, wasOn = false, cover = 0, press = 1, tilt = 0, lastT = 0, lastKey = -1;
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2, px = cx, py = cy;
  card.addEventListener('mouseenter', () => { over = true; });
  card.addEventListener('mouseleave', () => { over = false; down = false; });
  card.addEventListener('mousedown', () => { down = true; });
  window.addEventListener('mouseup', () => { down = false; });
  window.addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });

  function draw(c) {
    const key = Math.round(c * 60);
    if (key === lastKey) return;
    lastKey = key;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);
    for (const k of cells) if (c >= k.thr) { ctx.fillStyle = k.dark ? dark : ink; ctx.fillRect(k.x, k.y, B + 0.5, B + 0.5); }
  }

  (function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min((now - (lastT || now)) || 16.7, 50) / 1000; lastT = now;
    const visible = typeof gsap !== 'undefined' ? +gsap.getProperty(card, 'opacity') > 0.6 : true;
    const on = over && visible;
    if (on !== wasOn) {
      document.documentElement.classList.toggle('video-cursor-on', on);
      window.__playCursorActive = on;                 // Hero-Partikel pausieren, solange der Cursor da ist
      if (on) {
        if (cover < 0.05) { px = cx; py = cy; }       // beim Erscheinen direkt am Zeiger starten
        if (!PX_REDUCE) { label._typeOrig = 'Play reel'; label._typed = false; typeIn(label, 420); }
      }
      wasOn = on;
    }
    if (!on && cover <= 0.001) { if (cur.style.opacity !== '0') cur.style.opacity = '0'; return; }
    cur.style.opacity = '1';
    cover = PX_REDUCE ? (on ? 1 : 0) : smoothTowards(cover, on ? 1 : 0, on ? 0.12 : 0.08, dt);
    if (Math.abs(cover - (on ? 1 : 0)) < 0.004) cover = on ? 1 : 0;
    draw(cover);
    label.style.opacity = c01v(cover * 2 - 1).toFixed(2);
    const vx = cx - px;
    px = smoothTowards(px, cx, 0.07, dt); py = smoothTowards(py, cy, 0.07, dt);
    tilt = smoothTowards(tilt, Math.max(-14, Math.min(14, vx * 0.35)), 0.1, dt);
    press = smoothTowards(press, down ? 0.86 : 1, 0.06, dt);
    cur.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
    inner.style.transform = 'translate(-50%,-50%) rotate(' + tilt.toFixed(2) + 'deg) scale(' + press.toFixed(3) + ')';
  })(performance.now());

  function c01v(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
})();

/* ============================
   HERO — Reveal
============================ */
const heroInit = (instant) => {
  const elName  = document.getElementById('heroWordFullname');

  gsap.set('#heroWordFullname', { y: '110%' });
  gsap.set('#heroImgCard',      { opacity: 0, y: 0, xPercent: -50, transformOrigin: '50% 50%' });
  gsap.set('.hero-subtitle',    { y: '-110%' });

  const fitFullname = () => {
    if (!elName) return;
    const targetW = document.documentElement.clientWidth / 2.2;
    let lo = 10, hi = targetW * 2;
    elName.style.visibility = 'hidden';
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      elName.style.fontSize = mid + 'px';
      if (elName.scrollWidth <= targetW) lo = mid;
      else hi = mid;
    }
    elName.style.fontSize = lo + 'px';
    elName.style.visibility = '';
  };

  fitFullname();
  let fitRaf;
  window.addEventListener('resize', () => {
    clearTimeout(fitRaf);
    fitRaf = setTimeout(fitFullname, 120);
  });

  if (instant) {
    /* Interne Ankunft: Hero steht sofort — die ASCII-Transition ist der Auftritt. */
    gsap.set('#heroWordFullname', { y: '0%' });
    gsap.set('.hero-subtitle',    { y: '0%' });
    return;
  }

  const subtitle = document.querySelector('.hero-subtitle');
  typePrepare(subtitle);                                          // Untertitel tippt sich ein, während er hereingleitet
  const heroTL = gsap.timeline({ delay: 0.0 });
  heroTL
    .to('#heroWordFullname', { y: '0%', duration: 0.75, ease: 'power4.out' }, 0.05)
    .to('.hero-subtitle',    { y: '0%', duration: 0.6,  ease: 'power3.out' }, 0.65)
    .call(() => typeIn(subtitle, 650), null, 0.7);
};

/* ============================
   EASTER EGG — Name letter hover
============================ */
(function initNameEasterEgg() {
  const wrap = document.getElementById('heroNameLetters');
  if (!wrap) return;

  const chars = [...'JACOB WEISSENBACK'];
  wrap.textContent = '';

  chars.forEach((ch) => {
    if (ch === ' ') {
      const sp = document.createElement('span');
      sp.className = 'nl nl--space';
      sp.setAttribute('aria-hidden', 'true');
      wrap.appendChild(sp);
      return;
    }
    const span = document.createElement('span');
    span.className = 'nl';
    span.textContent = ch;
    wrap.appendChild(span);
  });
})();

window.__heroInit = heroInit;


/* ============================
   SCROLL SYSTEM
   Phase A [0.00 → 0.40] — Name letters float dissolve
   Phase B [0.35 → 0.78] — Parallax photos
   Phase C [0.80 → 1.00] — Bottom Sheet slides up
============================ */
(function initScrollSystem() {
  const hero       = document.getElementById('hero');
  const imgCard    = document.getElementById('heroImgCard');
  const nameEl     = document.getElementById('heroWordFullname');
  const roleEl     = document.getElementById('heroSubtitleRow');
  const panel      = document.getElementById('mainContent');
  const zpStage    = document.getElementById('heroParallaxStage');
  const zpItems    = zpStage ? [...zpStage.querySelectorAll('.hero-parallax-item')] : [];

  if (!hero || !roleEl || !panel || !imgCard || !nameEl) return;

  /* Statische Referenzen EINMALIG cachen — update() läuft pro Scroll-Frame,
     querySelector/parseFloat dort waren teuer und unnötig. */
  const letters     = [...nameEl.querySelectorAll('.nl:not(.nl--space)')];
  const subtitleEl  = document.querySelector('.hero-subtitle');
  const heroImgWrap = imgCard.querySelector('.hero-img-wrap');
  const zpData      = zpItems.map(item => ({
    item,
    wrap:  item.querySelector('.hero-parallax-wrap'),
    scale: parseFloat(item.dataset.scale) || 1.5,
    delay: parseFloat(item.dataset.delay) || 0,
  }));

  const c01 = v => Math.max(0, Math.min(1, v));
  const eIO = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const ph  = (p, a, b, easeFn) => {
    const t = c01((p - a) / (b - a));
    return easeFn ? easeFn(t) : t;
  };

  let cardRect = null;
  let pinLeft  = false;

  /* ── PIXEL-WIPE: gepixelte Treppen-Kante statt gerader clip-path-Linie ──
     Blöcke in fester Größe; jede Spalte enthüllt gestaffelt → gezackte Pixel-Grenze. */
  const PX_BLOCK = 72;        // Blockgröße in px (wie in der Referenz)
  const PX_JITTER_ROWS = 3;   // wie viele Blockreihen die Spalten gegeneinander versetzt sind
  let pxCols = 1, pxRows = 1, pxJit = [];
  function pxHash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; }
  function pxMeasure() {
    pxCols = Math.max(1, Math.ceil(window.innerWidth / PX_BLOCK));
    pxRows = Math.max(1, Math.ceil(window.innerHeight / PX_BLOCK));
    pxJit = [];
    for (let i = 0; i < pxCols; i++) pxJit[i] = pxHash(i) * PX_JITTER_ROWS;  // stabil je Spalte
  }
  pxMeasure();

  function measure() {
    gsap.set(roleEl, { opacity: 1, y: 0 });
    gsap.set(imgCard, { clearProps: 'transform' });
    gsap.set(imgCard, { xPercent: -50 });
    cardRect = imgCard.getBoundingClientRect();
    pxMeasure();
  }

  gsap.set(panel, { clipPath: 'inset(100% 0 0 0)' });

  function update(p) {
    if (pinLeft) return;
    if (!cardRect) return;

    /* Zeitachse: bisherige Phasen laufen in q (0 … 1) über die ersten 80 % des Scrollwegs;
       danach bleibt das Video kurz im Vollbild stehen (0.80–0.88), erst dann kommt die Services-Sektion. */
    const q = Math.min(1, p / 0.80);

    // Phase A — letters float up
    const pA = ph(q, 0.04, 0.40, eIO);
    const total   = letters.length;
    const center  = (total - 1) / 2;

    letters.forEach((el, i) => {
      const distFromCenter = Math.abs(i - center) / center;
      const staggerDelay = (1 - distFromCenter) * 0.30;
      const t = Math.max(0, Math.min(1, (pA - staggerDelay) / (1 - staggerDelay)));
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      gsap.set(el, {
        y:              -e * 60,
        opacity:        1 - e,
        filter:         `blur(${e * 8}px)`,
        display:        'inline-block',
        transformOrigin:'50% 100%',
      });
    });

    if (subtitleEl) gsap.set(subtitleEl, {
      y:       -pA * 30,
      opacity: c01(1 - pA * 3.5),
      filter:  `blur(${pA * 8}px)`,
    });

    // Phase B — parallax photos
    const pB        = ph(q, 0.35, 0.78, eIO);
    const pCardZoom = ph(q, 0.78, 1.00, eIO);

    const imgCardFadeIn = c01(ph(q, 0.35, 0.55));
    const cardW    = imgCard.offsetWidth || window.innerWidth * 0.26;
    const maxScale = Math.max(window.innerWidth / cardW, window.innerHeight / (cardW * 0.5625));
    const cardZoom = 1 + pA * 0.05 + pCardZoom * (maxScale - 1.05);
    gsap.set(imgCard, { scale: cardZoom, opacity: imgCardFadeIn, xPercent: -50, transformOrigin: '50% 50%' });
    window.__heroFullscreen = pCardZoom > 0.9;   // Bild praktisch Vollbild → Play-Cursor aktiv

    if (heroImgWrap) {
      if (q >= 0.35) {
        if (!heroImgWrap.classList.contains('is-revealed')) {
          void heroImgWrap.offsetWidth;
          heroImgWrap.classList.add('is-revealed');
        }
      } else {
        heroImgWrap.classList.remove('is-revealed');
      }
    }

    const pExit = ph(q, 0.78, 0.92, eIO);

    zpData.forEach(({ item, wrap, scale: targetScale, delay }) => {
      const itemP   = c01((pB - delay) / (1 - delay));
      const fadeIn  = c01(itemP * 4);
      const zoomVal = 1 + itemP * (targetScale - 1);
      const exitScale   = zoomVal + pExit * 0.4;
      const exitOpacity = fadeIn * c01(1 - pExit * 1.8);

      gsap.set(item, { opacity: exitOpacity, scale: exitScale });

      if (wrap) {
        if (itemP > 0) {
          if (!wrap.classList.contains('is-revealed')) {
            void wrap.offsetWidth;
            wrap.classList.add('is-revealed');
          }
        } else {
          wrap.classList.remove('is-revealed');
        }
      }
    });

    // Phase C — bottom sheet (Hero-Reveal; der Pixel-Effekt wird separat an #work getriggert)
    if (p < 0.88) {                                   // bis hierhin: Video bleibt im Vollbild
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0)' });
    } else {
      const pC = ph(p, 0.88, 1.00, eIO);
      const insetTop = c01(1 - pC) * 100;
      gsap.set(panel, { clipPath: `inset(${insetTop}% 0 0 0)` });
    }
  }

  function resetAll() {
    window.__heroPixel = 0;
    gsap.set(nameEl, { opacity: 1, clearProps: 'filter' });
    letters.forEach(el => gsap.set(el, { y: 0, opacity: 1, filter: 'none' }));
    gsap.set(roleEl, { opacity: 1 });
    gsap.set(imgCard, { opacity: 0, xPercent: -50, scale: 1 });
    if (subtitleEl) gsap.set(subtitleEl, { y: 0, opacity: 1, filter: 'blur(0px)' });
    if (heroImgWrap) heroImgWrap.classList.remove('is-revealed');
    zpData.forEach(({ item, wrap }) => {
      gsap.set(item, { opacity: 0, scale: 1 });
      if (wrap) wrap.classList.remove('is-revealed');
    });
  }

  measure();

  ScrollTrigger.create({
    trigger:       hero,
    start:         'top top',
    end:           '+=290%',                          // +60 %: kurze Haltephase im Vollbild-Video
    pin:           true,
    anticipatePin: 1,
    scrub:         0.4,
    onUpdate(self) { update(self.progress); },
    onLeave()      { pinLeft = true; },
    onEnterBack()  { pinLeft = false; },
    onLeaveBack()  { resetAll(); },
    onRefresh() {
      pinLeft = false;
      measure();
      resetAll();
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0)' });
    },
  });

  document.fonts.ready.then(() => { measure(); ScrollTrigger.refresh(); });

  let resizeRaf;
  window.addEventListener('resize', () => {
    clearTimeout(resizeRaf);
    resizeRaf = setTimeout(() => { measure(); ScrollTrigger.refresh(); }, 150);
  });
})();

/* ============================
   NAV — Active section tracker
============================ */
(function initNavActiveState() {
  const links = [...document.querySelectorAll('.nav-sec[data-section]')];

  const workEl    = document.getElementById('work');
  const contactEl = document.getElementById('storySection') || document.getElementById('contact');

  function setActive(sectionId) {
    links.forEach(link => {
      link.classList.toggle('is-active', link.dataset.section === sectionId);
    });
  }

  setActive('hero');

  lenis.on('scroll', () => {
    const vh = window.innerHeight;
    const workTop    = workEl    ? workEl.getBoundingClientRect().top    : Infinity;
    const contactTop = contactEl ? contactEl.getBoundingClientRect().top : Infinity;

    if (contactTop <= vh * 0.55)     setActive('contact');
    else if (workTop <= vh * 0.55)   setActive('work');
    else                             setActive('hero');
  });
})();

/* ============================
   PIXEL WIPE — sichtbare Pixel-Blöcke beim Übergang Video → "What I do"
   Zeichnet in Hintergrundfarbe (leicht aufgehellt, damit sie über dem Video
   lesbar sind) eine gezackte, spaltenweise gestaffelte Pixelkante, die mit dem
   Scrollen hochwächst. Reines Canvas-Overlay; liest window.__heroPixel (0..1).
============================ */
(function initPixelWipe() {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const BLOCK = 72;          // Blockgröße in px (wie in der Referenz)
  const COLOR = '17, 17, 16';        // nur EINE Farbe: --bg (#111110), Schwarz der Services-Section

  const canvas = document.createElement('canvas');
  canvas.id = 'pixelWipe';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const panelEl = document.getElementById('mainContent');   // Oberkante der Services-Section = Anker

  let cols = 1, vw = 0, vh = 0, dpr = 1;
  const BIAS = 0.62;         // Anteil "von unten" (0 = rein zufällig, 1 = strikt von unten)
  // stabiler Zufalls-Anteil pro Seiten-Zelle (Spalte, Dokument-Reihe) → fester Platz, kein Flackern
  function rnd(gx, docRow) {
    let h = ((gx + 1) * 374761393 + (docRow + 1) * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(vw * dpr); canvas.height = Math.floor(vh * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(1, Math.ceil(vw / BLOCK));
  }
  resize();
  window.addEventListener('resize', resize);

  function frame() {
    requestAnimationFrame(frame);
    const r = reduce ? (window.__heroPixel >= 0.999 ? 1 : 0) : (window.__heroPixel || 0);
    ctx.clearRect(0, 0, vw, vh);
    if (r <= 0.001) return;

    /* An der Oberkante der Services-Section verankern und von dort NACH OBEN
       aufbauen → die unterste Blockreihe schließt exakt an die Section an
       (keine halbe Pixel-Lücke). Die Kante hat eine feste Seitenposition, daher
       bleibt das Muster stabil und steigt von unten auf. */
    const boundary = Math.round(panelEl ? panelEl.getBoundingClientRect().top : vh);
    const maxK = Math.ceil((boundary + BLOCK) / BLOCK) + 1;

    ctx.fillStyle = 'rgb(' + COLOR + ')';
    for (let k = 1; k <= maxK; k++) {
      const y = boundary - k * BLOCK;            // Reihe k oberhalb der Section-Kante
      if (y > vh) continue;
      if (y + BLOCK < 0) break;                  // über dem Viewport-Rand → fertig
      const depthNorm = Math.max(0, Math.min(1, (k * BLOCK) / vh)); // Distanz zur Kante: 0 = an der Section
      for (let gx = 0; gx < cols; gx++) {
        // "von unten"-Bias (nahe der Kante zuerst) + Zufall → aufsteigend, verstreut
        const thr = depthNorm * BIAS + rnd(gx, k) * (1 - BIAS);
        // +1 px Überlappung schließt Nähte zwischen benachbarten Blöcken (gleiche Farbe → unsichtbar)
        if (r >= thr) ctx.fillRect(gx * BLOCK, y, BLOCK + 1, BLOCK + 1);
      }
    }
  }
  requestAnimationFrame(frame);
})();

/* ============================
   WHAT I DO — Hover interactions
============================ */
(function initServices() {
  const imgPanel = document.getElementById('svcImgPanel');
  const section  = document.querySelector('.services-section');

  if (imgPanel) gsap.set(imgPanel, { opacity: 0 });

  const imgInner = imgPanel ? imgPanel.querySelector('.svc-preview-inner') : null;

  function showPanel(name, imgId) {
    if (!imgPanel || !section) return;
    const nameRect    = name.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const rowCenter   = (nameRect.top + nameRect.height / 2) - sectionRect.top;
    gsap.set(imgPanel, { top: rowCenter, yPercent: -50, opacity: 1, scale: 1, rotation: 0 });
    if (imgInner) imgInner.classList.remove('is-revealed');
    document.querySelectorAll('.svc-preview-img').forEach(img =>
      img.classList.toggle('is-active', img.id === imgId)
    );
    if (imgInner) {
      void imgInner.offsetWidth;
      imgInner.classList.add('is-revealed');
    }
  }

  function hidePanel() {
    if (!imgPanel) return;
    gsap.set(imgPanel, { opacity: 0 });
    if (imgInner) imgInner.classList.remove('is-revealed');
    document.querySelectorAll('.svc-preview-img').forEach(img => img.classList.remove('is-active'));
  }

  /* HyperText-Reveal: beim Hover laeuft ein Zeiger von links nach rechts durch;
     Buchstaben links davon stehen final, rechts davon zufaellige A-Z bis erreicht. */
  const HYPER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  /* stabiles Pseudo-Zufallszeichen je Position + Flacker-Tick (kein Flimmern pro Frame) */
  function hyChar(i, tick) {
    let h = ((i * 73 + tick * 131) >>> 0) * 2654435761 >>> 0;
    return HYPER_CHARS[h % 26];
  }
  function scramble(el) {
    if (!el.dataset.orig) el.dataset.orig = el.textContent.trim();
    const orig = el.dataset.orig;
    const n = Math.max(1, orig.length);
    cancelAnimationFrame(el._raf || 0);
    /* Breite fixieren -> keine x-Sprünge durch unterschiedlich breite Zufallsbuchstaben */
    el.style.display = 'inline-block';
    el.style.width = Math.ceil(el.getBoundingClientRect().width) + 'px';
    el.style.textAlign = 'left';
    el.style.whiteSpace = 'pre';

    const duration = 420;      // ms - kurz
    const WINDOW = 2;          // nur wenige Zeichen um den Zeiger scramblen (dezent)
    const FLICKER = 55;        // ms - Takt der Zufallszeichen (ruhig, nicht pro Frame)
    const start = performance.now();
    let lastStr = null;

    function loop(now) {
      const t = Math.min(1, (now - start) / duration);
      const iter = t * n;                        // Zeiger läuft flüssig, zeitbasiert
      const tick = Math.floor(now / FLICKER);    // Zufallszeichen nur alle FLICKER ms neu
      let s = '';
      for (let i = 0; i < n; i++) {
        const ch = orig[i];
        if (ch === ' ') { s += ' '; continue; }
        if (i <= iter) s += orig[i];                         // links: final
        else if (i <= iter + WINDOW) s += hyChar(i, tick);   // kleines Fenster scramblen
        else s += orig[i];                                   // rechts: schon Original
      }
      if (s !== lastStr) { el.textContent = s; lastStr = s; }  // nur bei Änderung ins DOM
      if (t < 1) { el._raf = requestAnimationFrame(loop); }
      else { el.textContent = orig; clearWidth(el); }
    }
    el._raf = requestAnimationFrame(loop);
  }

  function clearWidth(el) {
    el.style.width = '';
    el.style.display = '';
    el.style.textAlign = '';
    el.style.whiteSpace = '';
  }

  function unscramble(el) {
    cancelAnimationFrame(el._raf || 0);
    if (el.dataset.orig) el.textContent = el.dataset.orig;
    clearWidth(el);
  }

  document.querySelectorAll('.svc-item').forEach(item => {
    const name   = item.querySelector('.svc-name');
    const skills = item.querySelector('.svc-skills');
    const imgId  = item.dataset.img;
    const skillEls = skills ? [...skills.querySelectorAll('.svc-skill')] : [];
    skillEls.forEach(s => { s.dataset.t = s.textContent; });

    name.addEventListener('mouseenter', () => {
      const nameRect = name.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      showPanel(name, imgId);
      if (skills) {
        skills.style.left = (nameRect.right - itemRect.left + 24) + 'px';
        gsap.set(skills, { opacity: 1, x: 0 });
        /* Werkzeuge tippen sich nacheinander ein (Mono, wie die Überschrift) */
        if (!PX_REDUCE) skillEls.forEach((s, i) => {
          s._typeRun = (s._typeRun || 0) + 1;                       // laufendes Tippen abbrechen
          s._typeOrig = s.dataset.t; s._typed = false;
          s.textContent = s.dataset.t.replace(/\S/g, ' ');
          const run = s._typeRun;
          setTimeout(() => { if (run === s._typeRun) typeIn(s, 260); }, i * 70);
        });
      }
      scramble(name);
    });

    name.addEventListener('mouseleave', () => {
      hidePanel();
      if (skills) gsap.set(skills, { opacity: 0 });
      unscramble(name);
    });
  });
})();

/* ============================
   SCROLL-EINBLENDUNGEN — alles im Pixel-Stil der Seite, an den Scroll gekoppelt (rückwärts genauso)
   · What I do: Überschrift tippt sich ein; jeder Service-Name baut sich beim Hereinkommen aus Pixeln auf,
     zerfällt oben wieder und driftet dabei leicht – Zeilen abwechselnd nach links / rechts
   · „My Work"-Button baut sich einmal aus Pixeln auf
   · Footer: JCKY setzt sich Buchstabe für Buchstabe aus Pixeln zusammen, „Thank you…" tippt sich ein
   Ohne Animation (Reduced Motion / kein clip-path: path) bleibt alles sofort sichtbar.
============================ */
(function initScrollReveals() {
  const live = !PX_REDUCE && PX_CLIP_OK;
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const ease = v => 1 - Math.pow(1 - v, 3);
  const fontPx = el => parseFloat(getComputedStyle(el).fontSize) || 16;

  /* Einmalig: Pixel-Aufbau über die Zeit (wie der Name auf „Me") */
  function buildOnce(el, B, dur) {
    pxMeasure(el, B);
    const t0 = performance.now(), D = dur || 900;
    (function frame(now) {
      const k = Math.min(1, (now - t0) / D);
      pxClip(el, ease(k), 'build');
      if (k < 1) requestAnimationFrame(frame);
    })(t0);
  }

  /* ── What I do ── */
  const eyebrow = document.querySelector('.svc-eyebrow-txt');
  typePrepare(eyebrow);
  onEnterOnce(eyebrow, () => typeIn(eyebrow, 650));

  const items = [...document.querySelectorAll('.svc-item')];
  const names = items.map(it => it.querySelector('.svc-name'));
  if (live && names.length) {
    const measureNames = () => names.forEach(n => pxMeasure(n, fontPx(n) * 0.09));
    function updateNames() {
      const vh = window.innerHeight, amp = Math.min(70, window.innerWidth * 0.05);
      names.forEach((n, i) => {
        const r = items[i].getBoundingClientRect();
        if (r.bottom < -vh * 0.2 || r.top > vh * 1.2) return;               // weit weg → nichts tun
        const inn = c01((vh - r.top) / (vh * 0.3));                          // kommt unten herein
        if (inn < 1) pxClip(n, ease(inn), 'build');
        else pxClip(n, ease(c01((r.bottom - 52) / (vh * 0.2))), 'dissolve'); // zerfällt unter der Nav
        const k = (r.top + r.height / 2 - vh / 2) / vh;                     // −0.5 … 0.5 um die Bildmitte
        n.style.translate = (k * amp * (i % 2 ? 1 : -1)).toFixed(1) + 'px 0';
      });
    }
    measureNames(); updateNames();
    lenis.on('scroll', updateNames);
    window.addEventListener('resize', () => { measureNames(); updateNames(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measureNames(); updateNames(); });
  }

  const cta = document.getElementById('svcFlipBtn');
  if (live && cta) {
    pxMeasure(cta, 10); pxClip(cta, 0, 'build');
    onEnterOnce(cta, () => buildOnce(cta, Math.max(8, cta.offsetHeight / 6), 700), '-10%');
  }

  /* ── Footer (nur Startseite; „Me" teilt den Footer, bleibt aber unverändert) ── */
  const onIndex = !!document.getElementById('hero');
  const footerBox = onIndex ? document.getElementById('footerWord') : null;
  const note = onIndex ? document.querySelector('.ftp-note') : null;
  typePrepare(note);
  onEnterOnce(footerBox, () => setTimeout(() => typeIn(note, 1100), 250), '-5%');
  if (live && footerBox) {
    function updateFooter() {
      const spans = footerBox.querySelectorAll('.ftp-ch');
      if (!spans.length) return;
      const r = footerBox.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh * 1.1) { spans.forEach(s => { if (s._pxW) pxClip(s, 0, 'build'); }); return; }
      const p = c01((vh - r.top) / (r.height * 1.05));                      // 0 = Wort unten am Rand · 1 = ganz im Bild
      spans.forEach((s, i) => {
        if (s._pxW !== s.offsetWidth || s._pxH !== s.offsetHeight) pxMeasure(s, fontPx(s) * 0.05);   // Größe passt sich an (Fit)
        pxClip(s, ease(c01((p - i * 0.12) / 0.55)), 'build');
      });
    }
    updateFooter();
    lenis.on('scroll', updateFooter);
    window.addEventListener('resize', updateFooter);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateFooter);
    window.addEventListener('load', updateFooter);
  }

  /* Footer-Leiste: LinkedIn · Email · Behance · „made with love" bauen sich nacheinander aus Pixeln auf */
  const barCells = onIndex ? [...document.querySelectorAll('.site-footer-bar .sf-link, .site-footer-bar .sf-right')] : [];
  if (live && barCells.length) {
    barCells.forEach(c => { c.style.clipPath = 'inset(50%)'; });
    onEnterOnce(barCells[0].parentNode.parentNode, () => barCells.forEach((c, i) =>
      setTimeout(() => buildOnce(c, Math.max(6, c.offsetHeight / 5), 520), 120 + i * 110)), '-2%');
  }

  /* Pixel-Scrollbar (die native ist ausgeblendet): Spalte aus kleinen Blöcken am rechten Rand,
     füllt sich mit dem Scrollen von oben – mit ausgefranster Pixelkante –, blendet sich im Ruhezustand aus */
  if ((onIndex || document.body.classList.contains('projects-page')) && !PX_REDUCE) {   // Startseite + My Work
    const bar = document.createElement('canvas');
    bar.className = 'px-scrollbar'; bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    const bctx = bar.getContext('2d'), BW = 4, STEP = 7, TOP = 64, BOTTOM = 14;
    let H = 0, rows = 0, dpr = 1, idle = 0;
    const thr = [];
    function sizeBar() {
      H = window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      bar.width = BW * dpr; bar.height = H * dpr;
      rows = Math.max(1, Math.floor((H - TOP - BOTTOM) / STEP));
      thr.length = 0;
      for (let i = 0; i < rows; i++) thr.push(i / rows * 0.9 + pxRand(i, 77) * 0.1);   // oben zuerst, Kante leicht verstreut
    }
    function drawBar(p) {
      bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bctx.clearRect(0, 0, BW, H);
      bctx.fillStyle = 'rgb(240,237,232)';
      for (let i = 0; i < rows; i++) {
        const d = p - thr[i];
        bctx.globalAlpha = d < 0 ? 0.14 : d < 0.04 ? 1 : 0.62;                   // Spur · heller Kopf · gefüllt
        bctx.fillRect(0, TOP + i * STEP, BW, BW);
      }
      bctx.globalAlpha = 1;
    }
    sizeBar();
    lenis.on('scroll', (e) => {
      const lim = (e && e.limit) || (document.documentElement.scrollHeight - window.innerHeight) || 1;
      drawBar(c01(((e && e.scroll) || window.scrollY) / lim));
      bar.classList.add('is-on');
      clearTimeout(idle);
      idle = setTimeout(() => bar.classList.remove('is-on'), 1200);
    });
    window.addEventListener('resize', sizeBar);
  }
})();

/* ============================
   PIXEL WIPE — an die Services-Section gekoppelt (nicht mehr am Hero-Pin)
   Der gepixelte Übergang läuft, während #work in den Viewport scrollt.
============================ */
(function initPixelTrigger() {
  const work = document.getElementById('work');
  if (!work) return;
  window.__heroPixel = 0;
  ScrollTrigger.create({
    trigger: work,
    start: 'top bottom',   // Oberkante von #work erreicht den unteren Viewport-Rand
    end:   'top top',      // … bis sie oben ankommt
    scrub: true,
    onUpdate(self) { window.__heroPixel = self.progress; },
    onLeaveBack()  { window.__heroPixel = 0; },
    onLeave()      { window.__heroPixel = 0; },   // danach Section erreicht → Effekt aus
  });
})();

/* ============================
   STORY — „Von Pixeln zu Menschen"
   Fixierte Bühne mit ~5000 Pixel-Partikeln, die beim Scrollen durch drei Kapitel morphen:
     01 Pixel-Avatar (Mosaik aus assets/jcky-3.jpg)  →  02 Skyline Salzburg (Festung, Dom, Salzach)  →  03 Winkende Hand
     + „HI!"-Sprechblase und schwebende UI-Karten
   · Morph: jeder Partikel startet leicht versetzt, wird auf halbem Weg auseinandergewirbelt und setzt sich neu zusammen
   · Tiefe: jeder Partikel hat z → Parallax zur Maus (beim Porträt treten helle Partien = Gesicht nach vorne)
   · Interaktion: Partikel weichen dem Cursor aus, Klick schickt eine Schockwelle durch; die Hand ist anklickbar (E-Mail)
   · Läuft im selben Takt wie Lenis + ScrollTrigger (gsap.ticker) → Scroll-Position und Bild nie um ein Frame versetzt
   · Kein harter Stopp: die Partikel sammeln sich schon, während die Section hereinscrollt (Sternenstaub → Porträt)
   · Formen werden erst nach der Intro aufgebaut (afterIntro), damit die Unterschrift-Intro flüssig bleibt
============================ */
(function initStory() {
  const section = document.getElementById('storySection');
  const stage = section && section.querySelector('.story-stage');
  const linesWrap = document.getElementById('storyLines');
  if (!section || !stage || !linesWrap) return;
  const animate = !PX_REDUCE && PX_CLIP_OK && typeof ScrollTrigger !== 'undefined';
  section.classList.add(animate ? 'is-live' : 'is-static');
  const MAIL = 'mailto:j.weissenbaeck@gmx.at';
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const eio = v => v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
  const span = (t, w) => c01((t - w[0]) / (w[1] - w[0]));

  /* ── Zeitachse: t in Bildschirmhöhen, 0 = Bühne oben angekommen (Pin-Beginn) ── */
  const C = 0.85;                                        // Scrollweg pro Kapitel
  const LAST = 2;                                        // Kapitel 0 … 2
  const PIN = LAST * C + 0.6;                            // zwei Wechsel + das letzte Kapitel steht noch
  const FORM = [-0.95, 0.05];                            // Sternenstaub → Porträt (Section scrollt noch herein)
  const MORPH = k => [k * C + 0.3, (k + 1) * C - 0.05];  // Wechsel Kapitel k → k+1
  const LINES = [
    { inn: [-0.45, -0.1], out: [0.3, 0.5] },
    { inn: [C - 0.25, C + 0.05], out: [C + 0.3, C + 0.5] },
    { inn: [2 * C - 0.25, 2 * C + 0.05], out: null },
  ];
  const NAMES = ['Me', 'Salzburg', 'Say hi'];

  /* ── Bühne ── */
  const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
  cv.className = 'story-canvas'; cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Pixel particles forming a pixel avatar of Jacob, then the Salzburg skyline, then a waving hand with a speech bubble saying Hi');
  stage.insertBefore(cv, stage.firstChild);
  let W = 0, H = 0, dpr = 1;
  function size() { W = stage.clientWidth; H = stage.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  size();
  window.addEventListener('resize', size);
  /* Mitte + Maßstab der Formation je Kapitel (S = Bildschirm-Pixel pro Formbreite) */
  function layout(k) {
    const m = W <= 760;
    const S = (m ? W * 0.94 : Math.min(W * 0.52, H * 1.05)) * (k === LAST ? 1.08 : 1);   // letztes Kapitel etwas größer → „HI!" gut lesbar
    return { cx: m ? W / 2 : W * 0.66, cy: m ? H * 0.29 : H * 0.47, S: S };
  }
  /* Drift: jede Form wandert in ihrem Kapitel beim Scrollen leicht nach oben (Parallax zu den Sätzen).
     Je Form berechnet und beim Morph überblendet → nie ein Sprung beim Kapitelwechsel. */
  const drift = (s, t) => s < 0 ? 0 : -(t - s * C) * H * 0.05;

  /* ============================
     FORMEN
     ============================ */
  /* 01 — Avatar: einmalig aus assets/jcky-3.jpg erzeugt (Kopf + Hals; Wand und T-Shirt freigestellt:
     Pixel mit Farbe oder dunkel = Person), bewusst abstrakt als Mosaik: 40 Spalten, 4 Helligkeitsstufen
     („1"–„4", „." = leer), große Blöcke mit Fuge. So muss die Startseite das 4-MB-Foto nicht laden. */
  const PORTRAIT_COLS = 40;
  const PORTRAIT = "..............3333223..............................332222222233..........................332221111111223........................322222211111111223.....................32222211111111111123....................222221111111111111123..................3222122211111111111122..................22112222211111111111113................322112232222221111111112................221112333333222222211111................2211233333333322222221113...............2222244444433333322222112...............2222344444433333332332112...............2223444444444333333332112...............3223444444444444433333112..............43224443333333443333333113..............33224443321223332212233124..............34334443222233332122223124..............44344443322234432112233133..............43344444433344432222233233..............4444444444444443322333323................444444444444443333333323................44444444444444333333333..................4344444344444333333333...................44444434433333333333....................44444333333322333334....................4444433333222222333......................444433333333322333......................333333333333323334......................33333444333333223.......................43333443323332223.......................4433333333332222.......................44443333333322223......................4444443333333222334.....................44444443332222233333....................444444444333333333334...................444444444443333333334....................4444444444433333333......................444444444433333334.......................4444444443333334.........................44444444333344............................4444444444..................";
  function portraitPoints() {
    const rows = PORTRAIT.length / PORTRAIT_COLS, WN = 0.46, cell = WN / PORTRAIT_COLS, pts = [];
    const TONE = [0, 0.2, 0.45, 0.72, 1];
    for (let r = 0; r < rows; r++) for (let c = 0; c < PORTRAIT_COLS; c++) {
      const ch = PORTRAIT[r * PORTRAIT_COLS + c];
      if (ch === '.') continue;
      const lv = +ch;
      pts.push({ x: (c - PORTRAIT_COLS / 2) * cell, y: (r - rows / 2) * cell, a: TONE[lv], z: (lv - 2.5) * 0.18, tag: 0, s: cell * 0.8 });
    }
    return pts;
  }

  /* Formen auf eine 1000 × 520-Leinwand zeichnen und im Pixelraster abtasten.
     Rotkanal = Helligkeit, Blaukanal = Tiefe (0 hinten … 255 vorne), Grünkanal 0 bei hellem Rot = Hand (winkt). */
  const DW = 1000, DH = 520;
  function sample(draw, step) {
    const c = document.createElement('canvas'); c.width = DW; c.height = DH;
    const g = c.getContext('2d'); draw(g);
    const d = g.getImageData(0, 0, DW, DH).data, pts = [];
    for (let y = Math.floor(step / 2); y < DH; y += step) for (let x = Math.floor(step / 2); x < DW; x += step) {
      const i = (y * DW + x) * 4, al = d[i + 3];
      if (al < 90) continue;
      pts.push({ x: (x - DW / 2) / DW, y: (y - DH / 2) / DW, a: (al / 255) * (0.3 + 0.7 * d[i] / 255), z: d[i + 2] / 127.5 - 1, tag: d[i] - d[i + 1] > 120 ? 1 : 0, s: 0 });
    }
    return pts;
  }
  const col = (lum, z, tag) => 'rgb(' + lum + ',' + (tag ? 0 : lum) + ',' + Math.round((z + 1) * 127.5) + ')';

  /* 02 — Salzburg: Festungsberg mit Hohensalzburg, Dom mit Doppeltürmen + Kuppel, Kollegienkirche, Altstadt, Salzach */
  function drawSalzburg(g) {
    g.fillStyle = col(95, -0.6);                                         // Festungsberg (hinten, gedämpft)
    g.beginPath(); g.moveTo(40, 434);
    g.bezierCurveTo(180, 432, 290, 330, 400, 282); g.bezierCurveTo(470, 254, 700, 252, 770, 278);
    g.bezierCurveTo(860, 312, 920, 402, 980, 434); g.closePath(); g.fill();
    g.fillStyle = col(255, -0.1);                                        // Festung
    g.fillRect(420, 206, 330, 60); g.fillRect(396, 238, 58, 42); g.fillRect(720, 236, 54, 44);
    g.fillRect(540, 150, 78, 60);                                       // Hoher Stock
    const roof = (x1, x2, y, top) => { g.beginPath(); g.moveTo(x1, y); g.lineTo(x2, y); g.lineTo((x1 + x2) / 2, top); g.closePath(); g.fill(); };
    roof(532, 626, 150, 110);
    g.fillRect(445, 170, 30, 40); roof(440, 480, 170, 140);              // Turm links
    g.fillRect(690, 174, 26, 36); roof(686, 720, 174, 146);              // Turm rechts
    g.fillRect(625, 180, 14, 30); roof(622, 642, 180, 150);              // Kapelle
    for (let x = 420; x < 750; x += 18) g.fillRect(x, 198, 9, 8);        // Zinnen
    g.globalCompositeOperation = 'destination-out';                     // Fenster als Lücken
    for (let x = 440; x < 735; x += 26) g.fillRect(x, 224, 8, 12);
    g.fillRect(560, 168, 9, 14); g.fillRect(590, 168, 9, 14);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = col(175, 0.2);                                         // Altstadt-Dächer (vorne, mittelhell)
    const roofs = [[90, 30], [128, 40], [300, 34], [342, 44], [392, 30], [430, 38], [478, 28], [520, 42], [566, 32],
                   [610, 40], [656, 30], [700, 36], [744, 28], [780, 40], [900, 32], [940, 26]];
    roofs.forEach(([x, h]) => g.fillRect(x, 432 - h, 36, h));
    g.fillStyle = col(255, 0.7);                                         // Dom (vorne)
    const tower = (x) => { g.fillRect(x, 312, 36, 120); g.fillRect(x + 4, 290, 28, 22); g.beginPath(); g.arc(x + 18, 290, 15, Math.PI, 0); g.fill(); g.fillRect(x + 15, 256, 6, 22); };
    tower(166); tower(248);
    g.fillRect(202, 336, 46, 96);                                       // Fassade
    g.fillRect(200, 326, 50, 14); g.beginPath(); g.arc(225, 326, 26, Math.PI, 0); g.fill(); g.fillRect(222, 288, 6, 14);   // Kuppel
    g.fillRect(818, 362, 64, 70); g.beginPath(); g.arc(850, 362, 30, Math.PI, 0); g.fill(); g.fillRect(847, 318, 6, 16);   // Kollegienkirche
    g.strokeStyle = col(120, -0.3); g.lineWidth = 5;                     // Salzach
    [454, 474].forEach((y, k) => { g.beginPath(); for (let x = 30; x <= 970; x += 10) { const yy = y + Math.sin(x * 0.02 + k * 2) * 4; x === 30 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.stroke(); });
  }
  /* 03 — Winkende Hand + schwebende UI-Karten. Die Hand ist markiert (dreht sich beim Winken ums Handgelenk). */
  function drawHand(g) {
    const rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
    const cut = (fn) => { g.globalCompositeOperation = 'destination-out'; fn(); g.globalCompositeOperation = 'source-over'; };
    /* Finger: abgerundeter Balken, leicht gespreizt (um seinen Ansatz gedreht) */
    const finger = (bx, by, w, len, ang) => { g.save(); g.translate(bx, by); g.rotate(ang); rr(-w / 2, -len, w, len + 30, w / 2); g.fill(); g.restore(); };
    g.fillStyle = col(255, 0.2, 1);
    finger(447, 262, 34, 150, -0.17);                 // Zeigefinger
    finger(487, 256, 36, 172, -0.05);                 // Mittelfinger
    finger(527, 260, 34, 158, 0.07);                  // Ringfinger
    finger(563, 272, 30, 120, 0.2);                   // kleiner Finger
    finger(440, 340, 38, 88, -0.62);                  // Daumen (schräg nach oben abgespreizt)
    rr(428, 244, 156, 168, 46); g.fill();             // Handfläche
    g.fillRect(462, 396, 92, 66);                     // Handgelenk
    /* Fugen zwischen den Fingern + Lebenslinie, damit die Form als Hand lesbar bleibt */
    cut(() => {
      g.lineWidth = 11; g.lineCap = 'round';
      [[467, 268, 465, 192], [508, 266, 509, 182], [546, 270, 551, 200]].forEach(([x1, y1, x2, y2]) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); });
      g.beginPath(); g.moveTo(452, 318); g.quadraticCurveTo(486, 342, 482, 392); g.stroke();
    });
    /* Ärmel (Umriss) */
    g.strokeStyle = col(200, 0.2, 1); g.lineWidth = 7; rr(444, 454, 128, 60, 10); g.stroke();
    /* Karte links oben: Profil */
    g.strokeStyle = col(255, 0.9); g.lineWidth = 7; rr(130, 80, 220, 128, 16); g.stroke();
    g.fillStyle = col(255, 0.9); g.beginPath(); g.arc(176, 124, 22, 0, Math.PI * 2); g.fill();
    g.fillRect(210, 112, 110, 10); g.fillStyle = col(140, 0.9); g.fillRect(210, 130, 76, 8);
    g.fillStyle = col(255, 0.9); rr(154, 166, 96, 26, 13); g.fill();
    /* Karte links unten: Farben + Typo */
    g.strokeStyle = col(200, 0.75); g.lineWidth = 6; rr(170, 300, 180, 92, 14); g.stroke();
    [255, 205, 160, 115].forEach((l, k) => { g.fillStyle = col(l, 0.75); rr(190 + k * 36, 318, 26, 26, 6); g.fill(); });
    g.fillStyle = col(140, 0.75); g.fillRect(190, 358, 120, 7); g.fillRect(190, 372, 80, 7);
    /* rechts oben: Sprechblase „HI!" (Umriss, Schrift positiv) */
    g.strokeStyle = col(255, 0.95); g.lineWidth = 7; rr(690, 52, 200, 126, 30); g.stroke();
    g.beginPath(); g.moveTo(716, 174); g.lineTo(694, 214); g.lineTo(750, 176); g.stroke();
    g.fillStyle = col(255, 0.95); g.font = '400 92px Anton, Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('HI!', 790, 118);
    /* rechts unten: Toggle + Slider */
    g.strokeStyle = col(200, 0.85); g.lineWidth = 6; rr(680, 260, 200, 120, 16); g.stroke();
    g.fillStyle = col(255, 0.85); rr(702, 282, 64, 32, 16); g.fill();
    cut(() => { g.beginPath(); g.arc(749, 298, 11, 0, Math.PI * 2); g.fill(); });
    g.fillStyle = col(140, 0.85); g.fillRect(782, 290, 76, 8);
    g.fillStyle = col(150, 0.85); g.fillRect(702, 348, 156, 5);
    g.fillStyle = col(255, 0.85); g.fillRect(702, 348, 80, 5); g.beginPath(); g.arc(784, 350, 11, 0, Math.PI * 2); g.fill();
  }
  const HAND_BOX = { x0: (380 - DW / 2) / DW, x1: (620 - DW / 2) / DW, y0: (80 - DH / 2) / DW, y1: (515 - DH / 2) / DW };    // Klickfläche (normiert)
  const HAND = { px: (508 - DW / 2) / DW, py: (470 - DH / 2) / DW, tipY: (130 - DH / 2) / DW };          // Handgelenk (Drehpunkt) + Höhe der Fingerspitzen

  /* ============================
     PARTIKEL
     ============================ */
  let N = 0, ready = false;
  let SX, SY, SA, SZ, SS, AMB, TAG;                // je Form: Ziel (normiert), Helligkeit, Tiefe, Blockgröße, „Staub"-Flag, Vibrier-Flag
  let AX, AY, AZ, DL, SCA, SCR, PH, SP;            // je Partikel: Staub-Position, Verzögerung, Streuung, Phase
  function build() {
    const shapes = [portraitPoints(), sample(drawSalzburg, 7), sample(drawHand, 6)];
    N = Math.max.apply(null, shapes.map(s => s.length)) + 480;
    const f32 = () => new Float32Array(N);
    AX = f32(); AY = f32(); AZ = f32(); DL = f32(); SCA = f32(); SCR = f32(); PH = f32(); SP = f32();
    for (let i = 0; i < N; i++) {
      AX[i] = pxRand(i, 1); AY[i] = pxRand(i, 2); AZ[i] = pxRand(i, 3) * 2 - 1;
      DL[i] = pxRand(i, 4); SCA[i] = pxRand(i, 5) * 6.2832; SCR[i] = 0.4 + pxRand(i, 6) * 0.6;
      PH[i] = pxRand(i, 7) * 6.2832; SP[i] = 0.6 + pxRand(i, 8);
    }
    SX = []; SY = []; SA = []; SZ = []; SS = []; AMB = []; TAG = [];
    shapes.forEach((pts, s) => {
      /* zufällige, aber feste Zuordnung Partikel → Punkt: ergibt beim Morphen das wirbelnde Durcheinander */
      const order = pts.map((p, k) => [pxRand(k, 40 + s), p]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
      const sx = f32(), sy = f32(), sa = f32(), sz = f32(), ss = f32(), amb = new Uint8Array(N), tag = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const p = order[i];
        if (p) { sx[i] = p.x; sy[i] = p.y; sa[i] = p.a; sz[i] = Math.max(-1, Math.min(1, p.z * 0.8 + (pxRand(i, 50 + s) - 0.5) * 0.4)); tag[i] = p.tag; ss[i] = p.s; }
        else amb[i] = 1;
      }
      SX.push(sx); SY.push(sy); SA.push(sa); SZ.push(sz); SS.push(ss); AMB.push(amb); TAG.push(tag);
    });
    ready = true;
  }

  /* Ziel von Partikel i in Form s (s = −1 → Sternenstaub) */
  const A = { x: 0, y: 0, a: 0, z: 0, s: 0 }, B = { x: 0, y: 0, a: 0, z: 0, s: 0 };
  const zSize = z => z > 0.45 ? 4 : z > -0.35 ? 3 : 2;                    // nah = größer
  function target(s, i, L, t, now, out) {
    if (s < 0 || AMB[s][i]) {
      out.x = AX[i] * W + Math.sin(now * 0.00012 * SP[i] + PH[i]) * 18;
      out.y = AY[i] * H + Math.cos(now * 0.0001 * SP[i] + PH[i]) * 14;
      out.a = 0.1 + 0.22 * (0.5 + 0.5 * Math.sin(now * 0.0016 * SP[i] + PH[i]));
      out.z = AZ[i]; out.s = zSize(out.z);
      return;
    }
    out.x = L.cx + SX[s][i] * L.S; out.y = L.cy + SY[s][i] * L.S + drift(s, t); out.a = SA[s][i]; out.z = SZ[s][i];
    out.s = SS[s][i] ? SS[s][i] * L.S : zSize(out.z);
  }

  /* ── Maus, Klick, Neigung ── */
  const mouse = { x: -9999, y: -9999 }, ripples = [];
  let tx = 0, ty = 0, rx = 0, ry = 0, handHot = false, lastT = -9;
  function overHand() {
    if (lastT < LAST * C - 0.15) return false;                             // erst, wenn das Telefon steht
    const L = layout(LAST), dy = drift(LAST, lastT);
    return mouse.x > L.cx + HAND_BOX.x0 * L.S && mouse.x < L.cx + HAND_BOX.x1 * L.S &&
           mouse.y > L.cy + HAND_BOX.y0 * L.S + dy && mouse.y < L.cy + HAND_BOX.y1 * L.S + dy;
  }
  stage.addEventListener('mousemove', e => {
    const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    const hot = overHand();
    if (hot !== handHot) { handHot = hot; stage.classList.toggle('is-hand', hot); }
  });
  stage.addEventListener('mouseleave', () => { mouse.x = mouse.y = -9999; handHot = false; stage.classList.remove('is-hand'); });
  stage.addEventListener('click', e => {
    if (e.target.closest('a')) return;
    if (overHand()) { window.location.href = MAIL; return; }                // zurückwinken → E-Mail
    const r = cv.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() });
  });
  window.addEventListener('mousemove', e => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; }, { passive: true });

  /* ── Sätze: Pixel-Aufbau / -Zerfall nach Zeitfenster ── */
  const lines = [...linesWrap.querySelectorAll('.story-line')];
  const measureLines = () => lines.forEach(l => pxMeasure(l, Math.max(8, parseFloat(getComputedStyle(l).fontSize) * 0.16)));
  function renderLines(t) {
    lines.forEach((l, i) => {
      const w = LINES[i] || LINES[LINES.length - 1];
      if (w.out && t > w.out[0]) pxClip(l, 1 - span(t, w.out), 'dissolve');
      else pxClip(l, span(t, w.inn), 'build');
    });
  }

  /* ── Kapitel-Anzeige ── */
  const num = document.getElementById('storyNum'), chapter = document.getElementById('storyChapter');
  const bars = [...section.querySelectorAll('.story-bars b')];
  let shownCh = -1;
  function renderHud(t) {
    const ch = Math.max(0, Math.min(LAST, Math.round(t / C)));
    if (ch !== shownCh) {
      shownCh = ch;
      if (num) num.textContent = '0' + (ch + 1);
      if (chapter) { chapter._typeOrig = NAMES[ch]; chapter._typed = false; chapter.textContent = NAMES[ch].replace(/\S/g, ' '); typeIn(chapter, 360); }
    }
    bars.forEach((b, j) => { b.style.transform = 'scaleX(' + c01((t + C / 2 - j * C) / C).toFixed(3) + ')'; });
  }

  /* ── Zeichnen (im gsap-Takt nach Lenis + ScrollTrigger) ── */
  const BUCK = 8, SIZES = 8, groups = Array.from({ length: BUCK * SIZES }, () => []);   // Helligkeit × Blockgröße (2–9 px)
  let story = null, visible = false, last = 0;
  const storyT = () => story ? (window.scrollY - story.start) / window.innerHeight : PIN;
  function frame() {
    const now = performance.now(), dt = Math.min(now - (last || now) || 16.7, 50) / 1000; last = now;
    if (!visible) return;
    const t = storyT(); lastT = t;
    if (animate) { renderLines(t); renderHud(t); }
    if (!ready) return;
    rx = smoothTowards(rx, tx, 0.5, dt); ry = smoothTowards(ry, ty, 0.5, dt);
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 1600) ripples.splice(i, 1);

    /* welches Kapitel / welcher Wechsel? */
    let a = LAST, b = LAST, u = 1;
    if (t < FORM[1]) { a = -1; b = 0; u = span(t, FORM); }
    else for (let k = 0; k < LAST; k++) {
      const w = MORPH(k);
      if (t < w[0]) { a = b = k; break; }
      if (t < w[1]) { a = k; b = k + 1; u = span(t, w); break; }
    }
    const LA = layout(Math.max(0, a)), LB = layout(b);
    const R = 90, swirl = Math.min(W, H) * 0.16;
    /* Hand winkt: alle 2,4 s zwei Schwünge ums Handgelenk, dann kurze Pause (sobald sie steht) */
    const handOn = b === LAST ? (a === LAST ? 1 : c01((u - 0.85) / 0.15)) : 0;
    const wp = (now % 2400) / 2400, wv = wp < 0.62 ? wp / 0.62 : -1;
    const wave = PX_REDUCE || wv < 0 ? 0 : handOn * 0.22 * Math.sin(wv * Math.PI * 4) * Math.sin(wv * Math.PI);
    const LH = layout(LAST), pivX = LH.cx + HAND.px * LH.S, pivY = LH.cy + HAND.py * LH.S + drift(LAST, t);
    const wc = Math.cos(wave), ws = Math.sin(wave);

    for (let g = 0; g < groups.length; g++) groups[g].length = 0;
    for (let i = 0; i < N; i++) {
      target(a, i, LA, t, now, A);
      let e = 1;
      if (a !== b) { target(b, i, LB, t, now, B); e = eio(c01((u - DL[i] * 0.4) / 0.6)); }
      else { B.x = A.x; B.y = A.y; B.a = A.a; B.z = A.z; B.s = A.s; }
      let x = A.x + (B.x - A.x) * e, y = A.y + (B.y - A.y) * e;
      const al = A.a + (B.a - A.a) * e, z = A.z + (B.z - A.z) * e;
      if (a !== b) { const sc = Math.sin(Math.PI * e) * SCR[i] * swirl; x += Math.cos(SCA[i]) * sc; y += Math.sin(SCA[i]) * sc; }   // auseinanderwirbeln
      if (wave && b === LAST && TAG[LAST][i] && !AMB[LAST][i]) {                   // Hand dreht sich ums Handgelenk
        const dx0 = x - pivX, dy0 = y - pivY, rxp = pivX + dx0 * wc - dy0 * ws, ryp = pivY + dx0 * ws + dy0 * wc;
        x += (rxp - x) * e; y += (ryp - y) * e;
      }
      x += z * rx * 34 + Math.sin(now * 0.0013 * SP[i] + PH[i]) * (0.3 + z * 0.25);  // Parallax + leises Atmen (ruhig → Linien bleiben scharf)
      y += z * ry * 24 + Math.cos(now * 0.0011 * SP[i] + PH[i]) * (0.3 + z * 0.25);
      const dx = x - mouse.x, dy = y - mouse.y, d2 = dx * dx + dy * dy;            // dem Cursor ausweichen
      if (d2 < R * R) { const d = Math.sqrt(d2) || 1, f = (1 - d / R); x += dx / d * f * f * 28; y += dy / d * f * f * 28; }
      for (const rp of ripples) {                                                  // Schockwelle
        const age = (now - rp.t) / 1600, rad = age * Math.max(W, H) * 0.6, ex = x - rp.x, ey = y - rp.y, dd = Math.hypot(ex, ey) || 1, w = Math.abs(dd - rad);
        if (w < 70) { const k = (1 - age) * (1 - w / 70); x += ex / dd * k * 22; y += ey / dd * k * 22; }
      }
      if (al < 0.03) continue;
      let size = A.s + (B.s - A.s) * e;
      if (a !== b) size *= 1 - 0.45 * Math.sin(Math.PI * e);                        // im Flug kleiner, landen als Block
      const sz = Math.max(0, Math.min(SIZES - 1, Math.round(size) - 2));
      groups[sz * BUCK + Math.min(BUCK - 1, Math.floor(al * BUCK))].push(x, y);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgb(240,237,232)';
    for (let g = 0; g < groups.length; g++) {
      const p = groups[g]; if (!p.length) continue;
      const s = Math.floor(g / BUCK) + 2;
      ctx.globalAlpha = ((g % BUCK) + 0.5) / BUCK;
      for (let k = 0; k < p.length; k += 2) ctx.fillRect(Math.round(p[k] - s / 2), Math.round(p[k + 1] - s / 2), s, s);
    }
    /* Bewegungsstriche neben den Fingerspitzen, solange die Hand winkt (aus Pixeln, wie beim 👋) */
    const swing = Math.abs(wave) / 0.22;
    if (swing > 0.05) {
      const tipD = (HAND.tipY - HAND.py) * LH.S, tx0 = pivX - tipD * ws, ty0 = pivY + tipD * wc;   // gedrehte Fingerspitzen-Mitte
      for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 2; k++) {
        const rad = LH.S * (0.1 + k * 0.03), al = swing * (1 - k * 0.4);
        ctx.globalAlpha = al;
        for (let a2 = -0.5; a2 <= 0.5; a2 += 0.1) ctx.fillRect(Math.round(tx0 + side * Math.cos(a2) * rad), Math.round(ty0 + 10 + Math.sin(a2) * rad * 0.9), 3, 3);
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ── Start ── */
  if (animate) {
    measureLines(); renderLines(-2);
    story = ScrollTrigger.create({
      trigger: section, start: 'top top', end: '+=' + Math.round(PIN * 100) + '%', pin: true, invalidateOnRefresh: true,
      onRefresh: () => { size(); measureLines(); },
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureLines);
  }
  /* Nav „Find me here" → direkt ins letzte Kapitel */
  window.__storyContactY = () => story ? story.start + (LAST * C + 0.1) * window.innerHeight : null;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 }).observe(stage);
  afterIntro(() => {
    const go = () => { try { build(); } catch (e) {} };
    if (document.fonts && document.fonts.load) document.fonts.load('400 92px Anton').then(go, go); else go();
  });
  if (typeof gsap !== 'undefined') gsap.ticker.add(frame);                // gleicher Takt wie Lenis + ScrollTrigger
  else (function loop() { requestAnimationFrame(loop); frame(); })();
})();

/* ============================
   NAV — Hide on scroll down, show on scroll up (ganz oben + ganz unten immer sichtbar)
============================ */
(function initNavScrollHide() {
  const nav = document.getElementById('mainNav');
  if (!nav) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pjFilter = document.getElementById('pjFilter');   // Projects-Filter (falls vorhanden)
  const NAV_H = 52;
  let hidden = false;
  nav.style.willChange = 'transform';
  document.documentElement.classList.add('nav-shown');
  if (pjFilter) gsap.set(pjFilter, { top: NAV_H });        // startet unter der Nav

  function show() {
    if (!hidden) return; hidden = false;
    document.documentElement.classList.add('nav-shown');
    if (reduce) { gsap.set(nav, { yPercent: 0 }); if (pjFilter) gsap.set(pjFilter, { top: NAV_H }); return; }
    gsap.to(nav, { yPercent: 0, duration: 0.28, ease: 'power2.out', overwrite: true });
    if (pjFilter) gsap.to(pjFilter, { top: NAV_H, duration: 0.28, ease: 'power2.out', overwrite: true });
  }
  function hide() {
    if (hidden) return; hidden = true;
    document.documentElement.classList.remove('nav-shown');
    if (reduce) { gsap.set(nav, { yPercent: -100 }); if (pjFilter) gsap.set(pjFilter, { top: 0 }); return; }
    gsap.to(nav, { yPercent: -100, duration: 0.24, ease: 'power2.in', overwrite: true });
    if (pjFilter) gsap.to(pjFilter, { top: 0, duration: 0.24, ease: 'power2.in', overwrite: true });
  }

  function handle(y, dir) {
    if (y < 48) { show(); return; }   // ganz oben immer sichtbar
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (y >= max - 24) { show(); return; }   // ganz unten angekommen → ebenfalls einblenden
    if (dir > 0) hide();              // runter → smooth nach oben
    else if (dir < 0) show();         // hoch → einblenden
  }

  /* Lenis liefert die Scroll-Richtung sofort (1 = runter, -1 = hoch) → kein „aggressives" Scrollen nötig. */
  if (typeof lenis !== 'undefined' && lenis && lenis.on) {
    lenis.on('scroll', (e) => {
      const y = (e && typeof e.scroll === 'number') ? e.scroll : (window.scrollY || 0);
      const dir = (e && typeof e.direction === 'number') ? e.direction : 0;
      handle(y, dir);
    });
  } else {
    let lastY = window.scrollY || 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY || 0;
      handle(y, y > lastY ? 1 : (y < lastY ? -1 : 0));
      lastY = y;
    }, { passive: true });
  }
})();