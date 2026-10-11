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
   PIXEL-BAUSTEINE für Scroll-Einblendungen — gleiche Blockverteilung wie Seitenwechsel und Scroll-Wipe.
   pxMeasure(el, Blockgröße) einmal (bzw. nach Größenänderung), dann pxClip(el, cover 0…1, 'build' | 'dissolve').
   build = baut sich von unten auf · dissolve = zerfällt nach oben.
============================ */
const PX_REDUCE  = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const PX_CLIP_OK = !!(window.CSS && CSS.supports && CSS.supports('clip-path', "path('M0 0H1V1Z')"));
/* Handy-Version (eigenes Layout: mobile.css + mobile.js). Gesetzt im <head> jeder Seite; die Desktop-Effekte unten
   steigen bei PHONE aus, der Desktop-Pfad selbst bleibt unverändert. */
const PHONE = document.documentElement.classList.contains('is-phone');
/* Handy: Bildschirmhöhe bei eingefahrener Adressleiste (100lvh) — bleibt gleich, egal ob die Leiste gerade sichtbar ist.
   Damit ändert sich beim Scrollen nichts an Abständen, sonst „springt" die Seite, wenn die Leiste ein- oder ausfährt. */
const phoneVH = (() => {
  let probe = null;
  return () => {
    if (!PHONE) return window.innerHeight;
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
      document.documentElement.appendChild(probe);
    }
    return probe.offsetHeight || window.innerHeight;
  };
})();
function pxRand(gx, gy) {
  let x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
  x = (x ^ (x >>> 13)) * 1274126177 >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
function pxMeasure(el, B) { el._pxW = el.offsetWidth; el._pxH = el.offsetHeight; el._pxB = Math.max(4, Math.round(B)); el._pxKey = null; }
function pxClip(el, cover, mode) {
  const key = cover >= 1 ? 'full' : cover <= 0 ? 'none' : mode + Math.round(cover * 120);   // nur bei sichtbarer Änderung neu setzen; voll/leer eigene Schlüssel (sonst bliebe 99,8 % als Endzustand hängen)
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
/* GRAFFITI-SCRIBBLES (.story-scribble path): Striche haben eine feste Stärke, die Grafik ist je Wort verzerrt →
   pathLength stimmt dort nicht. Deshalb echte Strichlänge auf dem Bildschirm messen und damit zeichnen.
   scribbleMeasure(paths) nach Layout-Änderungen · scribbleDraw(paths, q): q 0…1, Strich für Strich nacheinander. */
function scribbleMeasure(paths) {
  paths.forEach((p) => {
    const m = p.getScreenCTM(); if (!m) return;
    const n = 64, L = p.getTotalLength(); let len = 0, prev = null;
    for (let k = 0; k <= n; k++) {
      const q = p.getPointAtLength(L * k / n), x = m.a * q.x + m.c * q.y, y = m.b * q.x + m.d * q.y;
      if (prev) len += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
    if (len < 1) return;                                          // (noch) nicht im Layout → später messen
    p._len = len + 2; p._o = null;
    p.style.strokeDasharray = p._len + ' ' + p._len;
    p.removeAttribute('pathLength');
  });
}
function scribbleDraw(paths, q) {
  const n = paths.length;
  paths.forEach((p, j) => {
    const k = Math.min(1, Math.max(0, q * n - j)), v = ((1 - k) * (p._len || 2000)).toFixed(1);
    if (p._o !== v) { p._o = v; p.style.strokeDashoffset = v; }
  });
}

/* HOVER-LINIE: beim Hover zeichnet sich eine Linie in --accent (von links nach rechts), ein zweiter, feiner Strich
   folgt als Skizze. Nach dem Verlassen wartet sie kurz und zieht sich dann von rechts nach links zurück.
   opt.trigger: Element für den Hover · opt.host: positioniertes Element, in das die Linie kommt · opt.ref: Bezugsrahmen
   opt.seg: [[x, y], [c1x, c1y, c2x, c2y, x, y], …] relativ zu ref (Anteile von Breite / Höhe) · opt.z: z-index der Linie
   opt.hold: Wartezeit nach dem Verlassen (ms). Startet immer vom aktuellen Zustand → kein Sprung, kein Aufblitzen. */
function hoverLine(opt) {
  const host = opt.host, ref = opt.ref || host, trigger = opt.trigger || ref;
  if (!host || PX_REDUCE || !document.documentElement.animate) return;
  if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'hv-line'); svg.setAttribute('aria-hidden', 'true');
  if (opt.z != null) svg.style.zIndex = opt.z;
  const a = document.createElementNS(NS, 'path'), b = document.createElementNS(NS, 'path');
  a.setAttribute('class', 'hv-line-a'); b.setAttribute('class', 'hv-line-b');
  svg.appendChild(b); svg.appendChild(a);
  host.insertBefore(svg, host.firstChild);
  let len = 1, lenB = 1, runA = null, runB = null, drawn = false, holdT = 0;
  const build = () => {
    const hr = host.getBoundingClientRect(), r = ref.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + Math.max(1, hr.width) + ' ' + Math.max(1, hr.height));
    const path = (dx, dy) => {
      const P = (fx, fy) => (r.left - hr.left + fx * r.width + dx).toFixed(1) + ' ' + (r.top - hr.top + fy * r.height + dy).toFixed(1);
      return opt.seg.map((s, i) => i ? 'C' + P(s[0], s[1]) + ' ' + P(s[2], s[3]) + ' ' + P(s[4], s[5]) : 'M' + P(s[0], s[1])).join(' ');
    };
    a.setAttribute('d', path(0, 0)); b.setAttribute('d', path(3, 4));
    len = a.getTotalLength() + 2; lenB = b.getTotalLength() + 2;
    a.style.strokeDasharray = len + ' ' + len; b.style.strokeDasharray = lenB + ' ' + lenB;
    if (runA) runA.cancel(); if (runB) runB.cancel(); runA = runB = null;
    a.style.strokeDashoffset = drawn ? 0 : len; b.style.strokeDashoffset = drawn ? 0 : lenB;
  };
  const run = (el, prev, to, o) => {
    const from = parseFloat(getComputedStyle(el).strokeDashoffset);
    if (prev) prev.cancel();
    el.style.strokeDashoffset = from;                          // Ausgangswert festhalten → während einer Verzögerung kein Aufblitzen
    return el.animate([{ strokeDashoffset: from }, { strokeDashoffset: to }], Object.assign({ fill: 'both' }, o));
  };
  const hidden = () => parseFloat(getComputedStyle(a).strokeDashoffset) >= len - 1;
  trigger.addEventListener('mouseenter', () => {
    clearTimeout(holdT);
    if (hidden()) { drawn = false; build(); }                     // Lage neu messen, solange die Linie ganz weg ist
    drawn = true;
    runA = run(a, runA, 0, { duration: 1300, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
    runB = run(b, runB, 0, { duration: 1300, delay: 140, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
  });
  trigger.addEventListener('mouseleave', () => {
    clearTimeout(holdT);
    holdT = setTimeout(() => {                                    // erst kurz stehen lassen, dann zurückziehen
      drawn = false;
      runB = run(b, runB, lenB, { duration: 900, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
      runA = run(a, runA, len, { duration: 1000, delay: 60, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
    }, opt.hold != null ? opt.hold : 300);
  });
  build();
  window.addEventListener('resize', () => { if (!drawn) build(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!drawn) build(); });
}

/* BUCHSTABEN-ROLL: Text in einzelne Buchstaben (.wk-l) zerlegen; per CSS rollt beim Hover jeder Buchstabe nach oben,
   seine Kopie (::after) rollt nach. Der Link bekommt den Klartext als Namen (Screenreader lesen sonst die Kopien mit). */
function splitRoll(el, text) {
  if (!el) return;
  const t = text != null ? text : el.textContent.trim();
  el.innerHTML = [...t].map((c, i) => '<span class="wk-l" style="--i:' + i + '" data-c="' + c + '">' + (c === ' ' ? '&nbsp;' : c) + '</span>').join('');
  const a = el.closest('a, button');
  if (a && !a.hasAttribute('aria-label')) a.setAttribute('aria-label', t);
}

/* einmal auslösen, sobald el ins untere Bilddrittel kommt */
function onEnterOnce(el, fn, margin) {
  if (!el) return;
  if (!('IntersectionObserver' in window)) { fn(); return; }
  let done = false;
  const m = margin || '-15%', inset = /%$/.test(m) ? -parseFloat(m) / 100 : 0;   // z. B. '-15%' → untere 15 % zählen noch nicht
  const fire = () => { if (done) return; done = true; io.disconnect(); window.removeEventListener('scroll', check); fn(); };
  /* sichtbar — oder schon oberhalb (direkt dorthin gesprungen, z. B. Neuladen mitten auf der Seite) → trotzdem auslösen */
  const io = new IntersectionObserver((en) => { if (en[0].isIntersecting || en[0].boundingClientRect.bottom < 0) fire(); },
    { rootMargin: '0px 0px ' + m + ' 0px' });
  /* Absicherung: harte Sprünge (immediate scroll) meldet der Beobachter nicht immer → zusätzlich die Lage prüfen */
  function check() { const r = el.getBoundingClientRect(); if (r.top < window.innerHeight * (1 - inset)) fire(); }
  io.observe(el);
  window.addEventListener('scroll', check, { passive: true });
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
   FOOTER — Buchstaben-Explosion
   Klick auf einen Buchstaben des großen JCKY im Footer → er zerplatzt in Pixel und kommt zurück.
============================ */
(function initFooterExplosion() {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* ── gemeinsamer Pixel-Regen ── */
  var rain = null;
  function burstFrom(points, cx, halfW) {
    if (reduce || !points.length) return;
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#FFFFFF';
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
        c: Math.random() < 0.15 ? 'rgba(255,255,255,0.35)' : ink
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
   PAGE LOADER — nach dem Vorbild landonorris.com
   Fläche in --accent, in der Mitte das Logo „JCKY“ (SVG-Text in Anton, gestreckt); unten zählt „Loading Jacky“ mit
   (echte Bereitschaft: load + Schriften deckelt bei 90 %). Ist die Seite da, wird das Logo zum Fenster: die Fläche
   bekommt ein Loch in Form des Logos (Maske), dahinter liegt schon die Seite. Man fliegt hinein — das Logo wächst genau
   aus seiner Mitte (nichts wandert seitlich), und die Buchstaben werden dabei immer fetter, bis sie ineinanderlaufen
   und den ganzen Bildschirm einnehmen. Die Fläche wird nie ausgeblendet, sie verschwindet einfach aus dem Bild.
   Volle Länge einmal pro Sitzung; bei erneutem Laden eine kurze Version. Zeit läuft Bild für Bild
   (max. 1/30 s pro Bild) → hängt der Browser kurz, springt nichts.
============================ */
(function initLoader() {
  const loader = document.getElementById('pageLoader');
  if (!loader) return;

  /* Bei interner Navigation Loader überspringen — die Seitenwechsel-Transition
     sorgt bereits für Kontinuität; Hero danach normal einblenden. */
  if (ARRIVED_VIA_INTERNAL_NAV) {
    loader.style.display = 'none';
    loader.classList.add('is-hidden');
    window.__introDone = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (typeof window.__heroInit === 'function') window.__heroInit(true);
    }));
    return;
  }

  document.documentElement.style.overflow = 'hidden';
  const quick = vtStoreGet('jcky:introSeen') === '1';                 // schon gesehen → kurze Version
  vtStoreSet('jcky:introSeen', '1');
  const COUNT = PX_REDUCE ? 0 : quick ? 700 : 1400;                   // Füllen (ms)
  const ZOOM = PX_REDUCE ? 0 : 950;                                   // Hineinfliegen (ms)

  const FS = 200, SX = 1.18;                                          // Schriftgröße im SVG · Streckung wie die Überschriften
  const plate = loader.querySelector('.ld-plate'), logo = loader.querySelector('.ld-logo');
  const tfs = [...loader.querySelectorAll('.ld-tf')], fulls = [...loader.querySelectorAll('.ld-full')];
  const hole = loader.querySelector('.ld-hole');
  const num = loader.querySelector('.ld-num');
  const fontOk = (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('400 100px "Anton"'), new Promise(r => setTimeout(r, 900))])
    : Promise.resolve();
  /* echte Bereitschaft */
  const ready = new Promise((resolve) => {
    const go = () => (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(resolve);
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  });
  let isReady = false; ready.then(() => { isReady = true; });

  /* ── Vermessen (per Canvas): Tinten-Box des Schriftzugs, O = ihre Mitte, K = Ziel im K ── */
  let ink = null, O = null, K = null, W = 0, H = 0, k = 1, P = null, want = 0;
  function measure() {
    const x = document.createElement('canvas').getContext('2d');
    x.font = '400 ' + FS + 'px Anton, Impact, sans-serif';
    const m = x.measureText('JCKY');
    ink = { l: -m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, t: -m.actualBoundingBoxAscent, b: m.actualBoundingBoxDescent };
    O = { x: (ink.l + ink.r) / 2, y: (ink.t + ink.b) / 2 };
    /* Ziel im K: die dickste Stelle des Buchstabens (Abstandskarte, zwei Durchläufe) → der Kreis darum liegt ganz im
       Strich; fliegt man dort hinein, füllt das K am Ende den ganzen Bildschirm */
    const kx0 = x.measureText('JC').width, kx1 = x.measureText('JCK').width;
    const pad = 4, cw = Math.ceil(ink.r - ink.l) + pad * 2, ch = Math.ceil(ink.b - ink.t) + pad * 2;
    const c = x.canvas; c.width = cw; c.height = ch;
    x.font = '400 ' + FS + 'px Anton, Impact, sans-serif'; x.fillStyle = '#000';
    x.fillText('JCKY', pad - ink.l, pad - ink.t);
    const px = x.getImageData(0, 0, cw, ch).data, D = new Float32Array(cw * ch), R2 = Math.SQRT2;
    for (let i = 0; i < cw * ch; i++) D[i] = px[i * 4 + 3] > 128 ? 1e9 : 0;
    for (let j = 1; j < ch; j++) for (let i = 1; i < cw - 1; i++) {
      const q = j * cw + i; if (D[q]) D[q] = Math.min(D[q], D[q - 1] + 1, D[q - cw] + 1, D[q - cw - 1] + R2, D[q - cw + 1] + R2);
    }
    for (let j = ch - 2; j >= 0; j--) for (let i = cw - 2; i > 0; i--) {
      const q = j * cw + i; if (D[q]) D[q] = Math.min(D[q], D[q + 1] + 1, D[q + cw] + 1, D[q + cw + 1] + R2, D[q + cw - 1] + R2);
    }
    let best = { i: Math.round(pad - ink.l + (kx0 + kx1) / 2), j: Math.round(ch / 2), d: 0 };
    const i0 = Math.max(1, Math.round(pad - ink.l + kx0)), i1 = Math.min(cw - 2, Math.round(pad - ink.l + kx1));
    for (let j = 1; j < ch - 1; j++) for (let i = i0; i <= i1; i++) {
      const d = D[j * cw + i] - Math.abs(j - ch / 2) * 0.01;          // bei Gleichstand: auf halber Höhe
      if (d > best.d) best = { i, j, d };
    }
    K = { x: best.i - pad + ink.l, y: best.j - pad + ink.t, r: Math.max(4, D[best.j * cw + best.i] - 1) };
  }
  /* Bildschirm: Logo-Breite → Maßstab k; das Logo sitzt genau in der Mitte und wächst auch von dort */
  function layout() {
    W = window.innerWidth; H = PHONE ? phoneVH() : window.innerHeight;
    fulls.forEach((r) => { r.setAttribute('width', W); r.setAttribute('height', H); });
    want = PHONE ? Math.min(W * 0.62, 300) : Math.min(Math.max(W * 0.2, 220), 420);   // Breite des Logos (px)
    k = want / ((ink.r - ink.l) * SX);
    P = { x: W / 2, y: H / 2 };
  }
  /* z = Zoom · at = Bildschirmpunkt · L = Stelle im Logo, die dort liegt (Standard: Logo-Mitte) */
  function place(z, at, L) {
    L = L || O;
    const tf = 'translate(' + at.x.toFixed(2) + ' ' + at.y.toFixed(2) + ') scale(' + (z * SX * k).toFixed(5) + ' ' + (z * k).toFixed(5) + ') translate(' + (-L.x).toFixed(2) + ' ' + (-L.y).toFixed(2) + ')';
    tfs.forEach((g) => g.setAttribute('transform', tf));
  }

  function render(p) { num.textContent = String(Math.round(p * 100)).padStart(3, '0'); }

  const filled = new Promise((resolve) => {
    fontOk.then(() => {
      measure(); layout(); place(1, P); render(0);
      window.addEventListener('resize', onResize);
      requestAnimationFrame(() => loader.classList.add('is-in'));   // Logo + Zähler blenden ein
      if (!COUNT) { ready.then(() => { render(1); resolve(); }); return; }
      let elapsed = 0, last = 0;
      requestAnimationFrame(function frame(now) {
        if (last) elapsed += Math.min(now - last, 1000 / 30);
        last = now;
        const t = Math.min(1, elapsed / COUNT);
        const p = Math.min(1 - Math.pow(1 - t, 2.2), isReady ? 1 : 0.9);    // schnell an, ruhig aus
        render(p);
        if (p < 1) requestAnimationFrame(frame); else resolve();
      });
    });
  });
  let zooming = false;
  function onResize() { if (!zooming && ink) { layout(); place(1, P); } }

  function finish() {
    window.removeEventListener('resize', onResize);
    loader.classList.add('is-hidden');
    loader.style.display = 'none';
    window.__introDone = true;
    window.dispatchEvent(new Event('jcky:intro-done'));             // jetzt darf die schwere Vorarbeit starten (afterIntro)
  }
  /* ── Logo wird zum Fenster und wächst, bis die Seite frei ist ── */
  function zoom() {
    document.documentElement.style.overflow = '';
    if (!ZOOM) {
      if (typeof window.__heroInit === 'function') window.__heroInit();
      loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }).finished.then(finish);
      return;
    }
    zooming = true;
    loader.classList.add('is-zoom');
    plate.setAttribute('mask', 'url(#ldHole)');                     // Loch in Form des Logos → Seite scheint durch
    logo.style.transition = 'opacity 0.14s ease'; logo.style.opacity = '0';   // dunkle Füllung gibt das Fenster frei
    /* Hineinfliegen durchs K: der Schriftzug wächst (exponentiell → wirkt gleichmäßig; Kurve: ruhig los, in der Mitte
       sehr schnell, weich aus) und wandert dabei nach links, bis die dickste Stelle des K in der Bildschirmmitte liegt —
       man fliegt durch das K. Am Ende deckt der Strich des K den ganzen Bildschirm; zusätzlich werden die Buchstaben im
       Loch zuletzt etwas fetter (Kontur in der Maske wächst) → Restkanten laufen zu, ausgeblendet wird nichts. */
    const LZ = Math.log(Math.hypot(W, H) / 2 * 1.05 / (K.r * k));     // Kreis im K-Strich reicht bis in die Ecken
    const SW = FS * 0.4;                                              // Endstärke der Kontur (in Schrift-Einheiten)
    const bez = cubicBezier(0.7, 0, 0.2, 1), grow = cubicBezier(0.45, 0, 0.3, 1), pan = cubicBezier(0.5, 0, 0.3, 1);
    const t0 = performance.now();
    let heroDone = false;
    requestAnimationFrame(function frame(now) {
      const t = Math.min(1, (now - t0) / ZOOM);
      const e = pan(t);                                             // 0 = Logo-Mitte · 1 = K in der Bildschirmmitte
      place(Math.exp(LZ * bez(t)), P, { x: O.x + (K.x - O.x) * e, y: O.y + (K.y - O.y) * e });
      hole.setAttribute('stroke-width', (SW * grow(Math.max(0, Math.min(1, (t - 0.55) / 0.4)))).toFixed(2));
      if (!heroDone && t > 0.3) { heroDone = true; if (typeof window.__heroInit === 'function') window.__heroInit(); }
      if (t < 1) requestAnimationFrame(frame); else finish();
    });
  }
  /* cubic-bezier(x1, y1, x2, y2) als Funktion (wie in CSS) */
  function cubicBezier(x1, y1, x2, y2) {
    const f = (a, b, t) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return (x) => {
      if (x <= 0) return 0; if (x >= 1) return 1;
      let lo = 0, hi = 1, t = x;
      for (let i = 0; i < 24; i++) { t = (lo + hi) / 2; if (f(x1, x2, t) < x) lo = t; else hi = t; }
      return f(y1, y2, t);
    };
  }

  Promise.all([filled, ready]).then(() => setTimeout(zoom, PX_REDUCE ? 0 : quick ? 100 : 200));
})();
/* ============================
   PAGE TRANSITIONS — drei Schichten mit schräger Pixel-Kante
   · Weg: kurz nacheinander rollen drei Flächen von unten herein: --accent, Weiß, Tiefschwarz. Ihre Oberkante ist schräg
     (rechts voraus, wie die Kanten der Abschnitte) und pixelig ausgefranst → über den Bildschirm zieht ein Farbstreifen
     Schiefer / Weiß, dahinter wird es schwarz. Darauf rollt der Zielname riesig (Anton, gestreckt) Buchstabe für Buchstabe
     aus der Maske, darunter füllt sich eine Pixelreihe in --accent (wie im Intro), dann wird navigiert.
   · Ankunft: der Name rollt nach oben weg, dann heben die Flächen in umgekehrter Reihenfolge ab (wieder mit Streifen).
   · Rückwärts (zu einer Seite weiter links in der Nav) läuft alles gespiegelt von oben nach unten.
   Handoff via sessionStorage (jcky:internalNav, jcky:vtDir); ohne Bewegung: sofort abdecken / ausblenden.
============================ */
(function initPageTransition() {
  const PAGE = {
    'index.html':    { name: 'Start',   order: 0 },
    'projects.html': { name: 'My Work', order: 1 },
    'cv.html':       { name: 'Me',      order: 2 },
  };
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B6BEC8';
  const LAYERS = [ACC, '#F2F2F2', '#121212'];                         // unten → oben gezeichnet; die schwarze deckt zuletzt
  const LAG = 0.1;                                                      // Versatz zwischen den Schichten (Anteil der Zeit)
  const B = PHONE ? 12 : 22;                                            // Pixelgröße der Kante
  const DOTS = 14;

  function pageKey(url) {
    try { const f = new URL(url, location.href).pathname.split('/').pop(); return f === '' ? 'index.html' : f; }
    catch (e) { return null; }
  }
  const metaFor = (url) => PAGE[pageKey(url)] || { name: '', order: 0 };
  const dirBetween = (fromU, toU) => metaFor(toU).order < metaFor(fromU).order ? 'back' : 'forward';
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const eio = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  /* Zeit k (0…1) → Fortschritt der Schicht i; lead = welche Schicht vorausläuft (rein: Akzent zuerst · raus: Schwarz zuerst) */
  const span = 1 - LAG * (LAYERS.length - 1);
  const layerT = (k, i, enter) => eio(c01((k - LAG * (enter ? i : LAYERS.length - 1 - i)) / span));

  /* Panel: Canvas (alle Schichten) + Name + Pixelreihe */
  function buildPanel(m) {
    const p = document.createElement('div');
    p.id = 'pgt';
    p.setAttribute('aria-hidden', 'true');
    const cv = document.createElement('canvas');
    cv.className = 'pgt-cv';
    p.appendChild(cv);
    const box = document.createElement('div');
    box.className = 'pgt-box';
    box.innerHTML = '<span class="pgt-name"><span class="pgt-in">' + m.name.split('').map((ch, i) =>
      '<span class="pgt-m"><span class="pgt-l" style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : ch) + '</span></span>').join('') + '</span></span>' +
      '<span class="pgt-px">' + '<i></i>'.repeat(DOTS) + '</span>';
    p.appendChild(box);
    document.documentElement.appendChild(p);

    const ctx = cv.getContext('2d');
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0;
    function resize() {
      W = window.innerWidth; H = PHONE ? phoneVH() : window.innerHeight;   // Handy: bis unter die Browserleiste
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      cols = Math.ceil(W / B); rows = Math.ceil(H / B);
    }
    resize();
    /* eine Schicht: t 0…1 = die Kante fährt einmal von unten nach oben über den Bildschirm.
       enter: Fläche liegt hinter (unter) der Kante · exit: Fläche liegt vor (über) der Kante und weicht zurück. */
    const J = B * 1.5;                                                  // wie weit die Pixel um die Kante ausfransen
    function layer(color, t, enter, seed) {
      if (enter ? t <= 0 : t >= 1) return;
      ctx.fillStyle = color;
      if (enter ? t >= 1 : t <= 0) { ctx.fillRect(0, 0, W, H); return; }
      const s = Math.min(H * 0.24, 220);                                // Höhenunterschied links ↔ rechts
      const y0 = H + J - t * (H + s + 2 * J);
      for (let gx = 0; gx < cols; gx++) {
        const edge = y0 + s * (1 - (gx + 0.5) / cols);                 // rechts voraus → schräge Kante
        const g0 = Math.max(0, Math.floor((edge - J) / B)), g1 = Math.min(rows - 1, Math.floor((edge + J) / B));
        /* sicher hinter / vor der Kante: ein Rechteck; im Fransenbereich Pixel für Pixel */
        if (enter) { if (g1 + 1 < rows) ctx.fillRect(gx * B, (g1 + 1) * B, B + 1, H - (g1 + 1) * B + 1); }
        else if (g0 > 0) ctx.fillRect(gx * B, 0, B + 1, g0 * B + 1);
        for (let gy = g0; gy <= g1; gy++) {
          const behind = gy * B + B / 2 + (pxRand(gx + seed, gy) - 0.5) * 2 * J > edge;
          if (enter === behind) ctx.fillRect(gx * B, gy * B, B + 1, B + 1);
        }
      }
    }
    /* ts = Fortschritt je Schicht; up = vorwärts (nach oben) · sonst gespiegelt (nach unten) */
    function draw(ts, enter, up) {
      ctx.setTransform(dpr, 0, 0, up ? dpr : -dpr, 0, up ? 0 : H * dpr);
      ctx.clearRect(0, 0, W, H);
      LAYERS.forEach((c, i) => layer(c, ts[i], enter, i * 53));
    }
    p._draw = draw;
    window.addEventListener('resize', resize);
    p._cleanup = () => window.removeEventListener('resize', resize);
    return p;
  }

  function run(dur, onFrame) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function frame(now) {
        const k = Math.min(1, (now - t0) / dur);
        onFrame(k);
        if (k < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  }
  const frameAt = (p, k, enter, up) => p._draw(LAYERS.map((_, i) => layerT(k, i, enter)), enter, up);

  /* ── WEG: interne Links abfangen → Schichten rein → navigieren ── */
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

    const dir = dirBetween(location.href, a.href), up = dir !== 'back';
    vtStoreSet('jcky:internalNav', '1');
    vtStoreSet('jcky:vtDir', dir);
    try { if (typeof lenis !== 'undefined' && lenis && lenis.stop) lenis.stop(); } catch (_) {}
    const go = () => { window.location.href = a.href; };
    const p = buildPanel(metaFor(a.href));
    p.classList.toggle('is-down', !up);
    if (reduceMotion) { frameAt(p, 1, true, up); p.classList.add('is-name', 'is-full'); setTimeout(go, 200); return; }

    const dots = [...p.querySelectorAll('.pgt-px i')];
    run(1000, (k) => {
      frameAt(p, k, true, up);
      if (k > 0.6) p.classList.add('is-name');                          // Buchstaben rollen aus der Maske
      const on = Math.round(c01((k - 0.62) / 0.38) * dots.length);
      dots.forEach((d, i) => d.classList.toggle('is-on', i < on));
    }).then(() => setTimeout(go, 140));
  }, true);

  /* ── Zurück-Button / bfcache: wiederhergestellte, noch verdeckte Seite befreien ── */
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    const leftover = document.getElementById('pgt');
    if (leftover && leftover.parentNode) leftover.parentNode.removeChild(leftover);
    document.documentElement.classList.remove('vt-arriving');
    transitioning = false;
    try { if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); } catch (_) {}
  });

  /* ── ANKUNFT: Name rollt weg, Schichten heben ab ── */
  if (ARRIVED_VIA_INTERNAL_NAV) {
    const dir = vtStoreGet('jcky:vtDir') || 'forward', up = dir !== 'back';
    vtStoreDel('jcky:vtDir');
    const cleanup = (p) => {
      if (p && p._cleanup) p._cleanup();
      if (p && p.parentNode) p.parentNode.removeChild(p);
      document.documentElement.classList.remove('vt-arriving');
      try { if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); } catch (_) {}
    };
    const start = () => {
      const p = buildPanel(metaFor(location.href));
      p.classList.toggle('is-down', !up);
      p.classList.add('is-name', 'is-still', 'is-full');               // steht schon (Name + volle Pixelreihe), ohne Einrollen
      frameAt(p, 0, false, up);                                         // deckt komplett
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('vt-arriving');
        if (reduceMotion) { p.style.transition = 'opacity 220ms'; requestAnimationFrame(() => { p.style.opacity = '0'; }); setTimeout(() => cleanup(p), 240); return; }
        setTimeout(() => {
          p.classList.remove('is-still'); p.classList.add('is-out');   // Name rollt nach oben weg, Pixelreihe erlischt
          setTimeout(() => run(1100, (k) => frameAt(p, k, false, up)).then(() => cleanup(p)), 300);
        }, 160);
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => requestAnimationFrame(start));
    else requestAnimationFrame(start);
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
if (PHONE && ScrollTrigger.config) ScrollTrigger.config({ ignoreMobileResize: true });   // Adressleiste ein/aus → Pins nicht neu berechnen

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

    /* „Find me here" → Footer (dort stehen alle Kontaktwege) */
    if (href === '#contact') {
      e.preventDefault();
      lenis.scrollTo(document.documentElement.scrollHeight, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
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
  document.querySelectorAll('.nav .nav-cell:not(.nav-brand) .nav-txt, .site-footer-bar .sf-link .sf-txt').forEach((el) => splitRoll(el));   // Nav + Footer-Links: Hover wie „My work" (CSS)
  /* „My Portfolio — made with love": statt Fläche zeichnet sich ein Schwung unter dem Text, der in einem kleinen Herz endet */
  const sfRight = document.querySelector('.site-footer-bar .sf-right'), sfFoot = document.getElementById('siteFooter');
  if (sfRight && sfFoot) hoverLine({ trigger: sfRight, host: sfFoot, ref: sfRight.querySelector('.sf-txt'), z: 0, seg: [
    [-0.04, 1.30],
    [0.30, 1.12, 0.62, 1.40, 0.96, 1.18],
    [1.02, 1.12, 1.06, 1.02, 1.075, 0.92],
    [1.040, 0.64, 1.034, 0.12, 1.062, 0.12],
    [1.074, 0.12, 1.078, 0.30, 1.078, 0.36],
    [1.078, 0.30, 1.084, 0.12, 1.096, 0.12],
    [1.124, 0.12, 1.118, 0.64, 1.075, 0.92]
  ] });
  /* JCKY oben links: Linie zieht sich hinter dem Logo durch */
  const brand = document.getElementById('navLogoName');
  if (brand) hoverLine({ trigger: brand, host: document.getElementById('mainNav'), ref: brand.querySelector('.nav-txt'), z: 0, seg: [
    [-0.30, 1.15],
    [0.05, 1.02, 0.22, 0.30, 0.45, 0.46],
    [0.62, 0.58, 0.76, 0.06, 0.95, 0.16],
    [1.08, 0.22, 1.10, 0.56, 1.22, 0.42],
    [1.30, 0.32, 1.34, 0.08, 1.44, 0.02]
  ] });
  const items = document.querySelectorAll('.projects-cta, .cvh-bubble');
  if (!items.length) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const ROWS = 6;            // feste Zeilenzahl → Blockgröße skaliert mit dem Feld (zoom-stabil)
  const BIAS  = 0.6;         // Anteil "von unten"
  const SMOOTH = 0.11;       // Sekunden – Ein-/Ausblenden
  const INK = (() => { const m = (getComputedStyle(document.documentElement).getPropertyValue('--accent') || '').trim().match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
    return m ? [1, 2, 3].map(i => parseInt(m[i], 16)).join(', ') : '182, 190, 200'; })();   // Akzentfarbe (--accent)

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
   HERO — in Ebenen (index.html → #hero)
   · Wand (hinten, unscharf), feine senkrechte Haarlinien, Person (vorne, freigestellt); Lichtkegel auf der Person
   · Maus: die Person bewegt sich dezent mit (max. ±4 px), die Wand kaum gegenläufig → leichte Tiefe (nur mit Maus);
     Bild in Schwarz-Weiß, um den Cursor eine Bubble mit Trail, in der es farbig wird
   · links unten Name + Text, rechts unten Rolle / Ort / Alter (fett / regular, gleich groß)
   · Auftritt (heroInit, nach der Intro): Linien wachsen von oben, Zahlen rollen hoch wie die Prozentanzeige,
     Name steigt aus der Maske, Text tippt sich ein, der Rest gleitet nacheinander herein; das Foto setzt sich aus
     leichtem Zoom
   · Scrollen (Parallax): die Wand sinkt deutlich langsamer weg als die Person (eigene Tempi), die Texte gleiten nach oben;
     und blenden aus; „What I do" schiebt sich mit schräger Oberkante darüber (panelEdge)
============================ */
const heroInit = (instant) => {
  const hero = document.getElementById('hero');
  window.__heroStarted = true;
  setTimeout(() => window.dispatchEvent(new CustomEvent('jcky:hero-in', { detail: { instant: !!instant } })), 0);
  if (!hero) return;
  hero.classList.add(instant || PX_REDUCE ? 'is-still' : 'is-in');
  /* Text tippt sich ein */
  const txt = hero.querySelector('.hx-text');
  if (txt && !instant && !PX_REDUCE) setTimeout(() => typeIn(txt, 1100), 900);
};
window.__heroInit = heroInit;

(function initHero() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  /* Alter aus dem Geburtsdatum (17. Jänner 2003) */
  const born = new Date(2003, 0, 17), today = new Date();
  const age = today.getFullYear() - born.getFullYear() - ((today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) ? 1 : 0);
  hero.querySelectorAll('[data-age]').forEach((el) => { el.textContent = String(age); });   // zählt jedes Jahr selbst weiter
  const txt = hero.querySelector('.hx-text');
  if (txt && !PX_REDUCE) typePrepare(txt);

  /* Parallax beim Scrollen */
  const bg = hero.querySelector('.hx-bg'), person = hero.querySelector('.hx-person'), shade = hero.querySelector('.hx-shade');
  const groups = [...hero.querySelectorAll('[data-hx-speed]')];
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  let last = -1;
  function update() {
    const y = window.scrollY, vh = phoneVH();
    if (y > vh * 1.2 && last > vh * 1.2) return;
    last = y;
    const k = c01(y / vh);
    if (!PX_REDUCE) {
      /* Wand und Person mit eigenem Tempo: die Wand sinkt deutlich langsamer weg (Tiefe), die Person etwas schneller */
      bg.style.transform = 'translate3d(0,' + (y * 0.55).toFixed(1) + 'px,0) scale(' + (1 + k * 0.08).toFixed(4) + ')';
      person.style.transform = 'translate3d(0,' + (y * 0.32).toFixed(1) + 'px,0) scale(' + (1 + k * 0.03).toFixed(4) + ')';
      groups.forEach((g) => {
        const sp = parseFloat(g.dataset.hxSpeed) || 0.2;
        g.style.transform = 'translate3d(0,' + (-y * sp).toFixed(1) + 'px,0)';
        g.style.opacity = c01(1 - k * 1.6).toFixed(3);
      });
    }
    shade.style.opacity = (k * 0.75).toFixed(3);
  }
  update();
  lenis.on('scroll', update);
  window.addEventListener('resize', update);

  /* Maus-Parallax: Person folgt spürbar, Wand minimal gegenläufig (weich nachgeführt) */
  if (!PX_REDUCE && !PHONE && (!window.matchMedia || window.matchMedia('(pointer: fine)').matches)) {
    const pImgs = [...person.querySelectorAll('img')], bImgs = [...bg.querySelectorAll('img')];
    let tx = 0, ty = 0, x = 0, yy = 0, raf = 0, lastT = 0;
    const loop = (now) => {
      const dt = Math.min(0.05, lastT ? (now - lastT) / 1000 : 0.016); lastT = now;
      x = smoothTowards(x, tx, 0.14, dt); yy = smoothTowards(yy, ty, 0.14, dt);
      const pt = (x * 8).toFixed(2) + 'px ' + (yy * 4).toFixed(2) + 'px', bt = (-x * 2).toFixed(2) + 'px ' + (-yy * 1).toFixed(2) + 'px';   // dezent: max. ±4 px
      pImgs.forEach((im) => { im.style.translate = pt; });
      bImgs.forEach((im) => { im.style.translate = bt; });
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - yy) > 0.001) raf = requestAnimationFrame(loop); else { raf = 0; lastT = 0; }
    };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5; ty = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { tx = ty = 0; if (!raf) raf = requestAnimationFrame(loop); });

    /* Farb-Bubble mit Trail: das Bild ist Schwarz-Weiß, um den Cursor wird es farbig. Die Farbkopien (.hx-col) liegen
       deckungsgleich über den grauen Ebenen und sind per mask-image nur in den Kreisen sichtbar: Kopf direkt am Zeiger
       (ohne Nachziehen), dahinter Kreise, die über ~0,7 s schrumpfen; alle Kreise mit scharfer Kante. */
    const cols = [...hero.querySelectorAll('.hx-col')];
    const R = 120, LIFE = 700, trail = [];
    let cx = -1, cy = -1, inside = false, mraf = 0;
    const nav = document.getElementById('mainNav');
    const draw = (now) => {
      mraf = 0;
      if (inside) trail.push({ x: cx, y: cy, t: now });
      while (trail.length && now - trail[0].t > LIFE) trail.shift();
      if (trail.length > 48) trail.splice(0, trail.length - 48);
      cols.forEach((im) => {
        const r = im.getBoundingClientRect(), sx = im.offsetWidth / r.width, sy = im.offsetHeight / r.height;
        const layers = [];
        for (let i = trail.length - 1; i >= 0; i -= (i === trail.length - 1 ? 1 : 2)) {          // Kopf + jeder zweite Trail-Punkt
          const p = trail[i], k = 1 - (now - p.t) / LIFE, rad = R * Math.pow(Math.max(0, k), 0.6);
          if (rad < 2) continue;
          layers.push('radial-gradient(circle ' + (rad * sx).toFixed(1) + 'px at ' + ((p.x - r.left) * sx).toFixed(1) + 'px ' + ((p.y - r.top) * sy).toFixed(1) + 'px, #000 calc(100% - 1px), transparent 100%)');   // harte, scharfe Kante (1px Kantenglättung)
        }
        const m = layers.length ? layers.join(',') : 'linear-gradient(transparent, transparent)';
        im.style.webkitMaskImage = m; im.style.maskImage = m;
      });
      if (trail.length || inside) mraf = requestAnimationFrame(draw);
    };
    const kick = () => { if (!mraf) mraf = requestAnimationFrame(draw); };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      inside = cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom && !(nav && cy <= nav.getBoundingClientRect().bottom);
      kick();
    }, { passive: true });
    document.addEventListener('mouseleave', () => { inside = false; kick(); });
    lenis.on('scroll', () => { if (cx >= 0) { const r = hero.getBoundingClientRect(); inside = cy >= r.top && cy <= r.bottom && !(nav && cy <= nav.getBoundingClientRect().bottom); kick(); } });
  }

  /* „What I do" schiebt sich mit weicher, schräger Oberkante über das Foto und zieht sich beim Hereinscrollen gerade */
  const panel = document.getElementById('mainContent');
  if (panel && !PX_REDUCE) {
    let lastEdge = '';
    const panelEdge = () => {
      const r = panel.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh * 1.5 || r.top < -vh) return;
      const S = Math.min(vh * 0.13, 120), e = Math.pow(1 - c01((vh - r.top) / (vh * 0.75)), 3);
      const clip = e < 0.002 ? 'none' : 'polygon(0 ' + (S * e).toFixed(1) + 'px, 100% 0, 100% 100%, 0 100%)';
      if (clip !== lastEdge) { lastEdge = clip; panel.style.clipPath = clip; }
    };
    panelEdge();
    lenis.on('scroll', panelEdge);
    window.addEventListener('resize', panelEdge);
  }
})();

/* ============================
   NAV — Active section tracker
============================ */
(function initNavActiveState() {
  const links = [...document.querySelectorAll('.nav-sec[data-section]')];

  const workEl    = document.getElementById('work');
  const contactEl = document.getElementById('siteFooter');            // „Find me here" = Footer mit allen Kontaktwegen

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

    if (contactTop <= vh * 0.65)     setActive('contact');
    else if (workTop <= vh * 0.55)   setActive('work');
    else                             setActive('hero');
  });
})();


/* ============================
   ZEILEN-FLÄCHE (rowBand) — eine Fläche für eine ganze Liste („What I do", „Selected Work"), wie auf „My Work":
   Ober- und Unterkante sind gedämpfte Federn (Lage, Tempo und Beschleunigung bleiben stetig) → auch bei sehr schnellem
   Wechsel über viele Zeilen nichts springt, nie eine Lücke. Nach unten führt die Unterkante (Fläche fließt von oben in die
   neue Zeile), nach oben die Oberkante; im Lauf kippen die Kanten leicht, in Ruhe stehen sie gerade.
   Über der Fläche: Kopie jeder Zeile (inkClass) in der umgekehrten Farbe, gleich beschnitten → Farbwechsel genau an der Kante.
   rowBand(list, rows, { bandClass, inkClass }) → { set(i, yViewport), poly() }   (i = −1: keine Zeile)
============================ */
function rowBand(list, rows, opt) {
  const band = document.createElement('span');
  band.className = opt.bandClass; band.setAttribute('aria-hidden', 'true');
  list.insertBefore(band, list.firstChild);
  const inks = rows.map((row) => {
    const ink = document.createElement('span');
    ink.className = opt.inkClass; ink.setAttribute('aria-hidden', 'true');
    [...row.children].forEach((ch) => ink.appendChild(ch.cloneNode(true)));
    row.appendChild(ink);
    return ink;
  });
  /* je Kante: goal = Zeilengrenze · to = weich nachgeführtes Ziel · y/v = Lage/Tempo der Feder · p = Schwingdauer */
  const T = { y: 0, v: 0, to: 0, goal: 0, p: 0.52 }, B = { y: 0, v: 0, to: 0, goal: 0, p: 0.34 };
  const LEAD = 0.34, TRAIL = 0.52, GOAL = 0.12;
  let shown = false, active = -1, dir = 1, raf = 0, lastT = 0, cur = null;   // cur: aktuelle Form (Liste, px)
  const geo = (i) => ({ t: rows[i].offsetTop, b: rows[i].offsetTop + rows[i].offsetHeight });
  function spring(e, period, dt) {                                      // kritisch gedämpft → kein Überschwingen
    e.to += (e.goal - e.to) * (1 - Math.exp(-dt / GOAL));
    e.p += (period - e.p) * (1 - Math.exp(-dt / 0.12));                 // Rollenwechsel führend ↔ folgend weich überblenden
    const w = 2 * Math.PI / e.p;
    e.v += (w * w * (e.to - e.y) - 2 * w * e.v) * dt;
    e.y += e.v * dt;
  }
  function render() {
    const W = list.clientWidth, tilt = v => Math.max(-24, Math.min(24, v * 0.03));
    let tl = T.y + tilt(T.v), tr = T.y - tilt(T.v), bl = B.y + tilt(B.v), br = B.y - tilt(B.v);
    if (bl < tl) bl = tl;
    if (br < tr) br = tr;                                               // nie umklappen
    const empty = bl - tl < 0.5 && br - tr < 0.5;
    cur = empty ? null : [[0, tl], [W, tr], [W, br], [0, bl]];
    const shape = (o) => empty ? 'inset(50%)' : 'polygon(0px ' + (tl - o).toFixed(1) + 'px, ' + W + 'px ' + (tr - o).toFixed(1) + 'px, ' + W + 'px ' + (br - o).toFixed(1) + 'px, 0px ' + (bl - o).toFixed(1) + 'px)';
    band.style.clipPath = shape(0);
    rows.forEach((r, k) => { inks[k].style.clipPath = shape(r.offsetTop - 1); });   // Kopie liegt 1px über der Zeile
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(1 / 30, lastT ? (now - lastT) / 1000 : 1 / 60); lastT = now;
    for (let s = 0; s < 2; s++) {                                       // zwei Teilschritte → stabil auch bei 30 fps
      spring(dir > 0 ? B : T, LEAD, dt / 2);
      spring(dir > 0 ? T : B, TRAIL, dt / 2);
    }
    const moving = Math.abs(T.goal - T.y) > 0.15 || Math.abs(B.goal - B.y) > 0.15 || Math.abs(T.v) > 0.8 || Math.abs(B.v) > 0.8;
    if (!moving) { T.y = T.to = T.goal; B.y = B.to = B.goal; T.v = B.v = 0; lastT = 0; if (active < 0) shown = false; }
    render();
    if (moving) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function set(i, y) {
    if (i === active) return;
    const ly = y - list.getBoundingClientRect().top;
    if (i >= 0) {
      const g = geo(i);
      if (!shown) {                                                     // aus dem Nichts: von der Seite, von der der Zeiger kommt
        const from = ly < (g.t + g.b) / 2 ? g.t : g.b;
        T.y = B.y = T.to = B.to = from; T.v = B.v = 0; shown = true;
        dir = from === g.t ? 1 : -1;
      } else dir = (g.t + g.b) / 2 > (T.goal + B.goal) / 2 ? 1 : -1;
      T.goal = g.t; B.goal = g.b;
    } else if (active >= 0) {                                           // ins Nichts: zieht sich dorthin zurück, wohin der Zeiger geht
      const g = geo(active), exit = ly > (g.t + g.b) / 2 ? g.b : g.t;
      dir = exit === g.b ? 1 : -1;
      T.goal = B.goal = exit;
    }
    rows.forEach((r, k) => r.classList.toggle('is-hot', k === i));
    active = i;
    if (PX_REDUCE) { T.y = T.to = T.goal; B.y = B.to = B.goal; T.v = B.v = 0; render(); return; }
    kick();
  }
  window.addEventListener('resize', () => { if (active >= 0) { const g = geo(active); T.y = T.to = T.goal = g.t; B.y = B.to = B.goal = g.b; T.v = B.v = 0; render(); } });
  /* aktuelle Form im Viewport (für die Scroll-Anzeige rechts) */
  function poly() {
    if (!cur) return null;
    const r = list.getBoundingClientRect();
    return cur.map(([x, y]) => [r.left + x, r.top + y]);
  }
  return { set, poly };
}

/* ============================
   VORSCHAU AM ZEIGER (rowPreview) — sitzt direkt am Mauszeiger (ohne Nachziehen); beim Wechsel der Zeile wischt der
   neue Inhalt von unten über den alten. Nur mit Maus.
   rowPreview({ scope, rows, make(row) → Element, chip, onRow(i, y), hideClass })
============================ */
function rowPreview(opt) {
  const pv = document.createElement('div');
  pv.className = 'sw-pv'; pv.setAttribute('aria-hidden', 'true');
  pv.innerHTML = '<div class="sw-pv-in"></div>' + (opt.chip || '');
  document.body.appendChild(pv);
  const inner = pv.querySelector('.sw-pv-in');
  let mx = -1, my = -1, cur = null, raf = 0;
  function show(row) {
    if (row === cur) return;
    const was = cur; cur = row;
    if (!row) { pv.classList.remove('is-on'); return; }
    const el = opt.make(row);
    el.classList.add('sw-pv-img');
    inner.appendChild(el);
    void el.offsetWidth;
    el.classList.add('is-in');                                         // neuer Inhalt wischt von unten über den alten
    const olds = [...inner.querySelectorAll('.sw-pv-img')].slice(0, -1);
    setTimeout(() => olds.forEach(o => o.remove()), 800);
    if (!was) { pv.classList.remove('is-on'); void pv.offsetWidth; pv.classList.add('is-on'); }
  }
  const place = () => { raf = 0; pv.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)'; };
  const check = (el) => {
    let row = el && el.closest ? el.closest(opt.scope) : null;
    const nav = document.getElementById('mainNav');
    if (row && nav && my <= nav.getBoundingClientRect().bottom) row = null;   // nicht über der Nav
    show(row);
    opt.onRow(row ? opt.rows.indexOf(row) : -1, my);
    document.documentElement.classList.toggle(opt.hideClass, !!row);
  };
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY; check(e.target);
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true });
  lenis.on('scroll', () => { if (mx >= 0) check(document.elementFromPoint(mx, my)); });   // Zeile fährt unter den stillstehenden Zeiger
  document.addEventListener('mouseleave', () => { show(null); opt.onRow(-1, my); mx = my = -1; document.documentElement.classList.remove(opt.hideClass); });
}

/* Flächen in --accent bzw. dunkle „Löcher" darin für die Scroll-Anzeige rechts (initScrollReveals liest sie bei jedem Bild) */
window.__accentPolys = window.__accentPolys || [];
window.__accentHoles = window.__accentHoles || [];

/* ============================
   WHAT I DO — Zitat in der Mitte, Leistungen links und rechts (index.html → #work)
   · man scrollt ganz normal (nichts hält fest); das Zitat läuft mit, die beiden Listen fliegen in eigenem Tempo vorbei
     (Parallax): links schneller als der Scroll, rechts langsamer
   · die Wörter des Zitats hellen sich nacheinander auf, während es zur Bildschirmmitte wandert
   · Handy: Zitat oben, die beiden Listen darunter nebeneinander (ohne Stehenbleiben)
============================ */
(function initWhatIDo() {
  const sec = document.getElementById('work');
  if (!sec || !sec.classList.contains('wid')) return;
  const quote = sec.querySelector('.wid-quote');
  const cols = [...sec.querySelectorAll('.wid-col')];
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  /* Zitat in Wörter teilen (Akzent-Wörter behalten ihre Farbe) */
  const words = [];
  quote.setAttribute('aria-label', quote.textContent.replace(/\s+/g, ' ').trim());
  [...quote.childNodes].forEach((node) => {
    const accent = node.nodeType === 1, text = node.textContent;
    const frag = document.createDocumentFragment();
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.className = 'wid-w' + (accent ? ' is-acc' : ''); w.setAttribute('aria-hidden', 'true'); w.textContent = part;
      frag.appendChild(w); words.push(w);
    });
    quote.replaceChild(frag, node);
  });

  if (PX_REDUCE || PHONE) { words.forEach(w => w.classList.add('is-lit')); return; }

  function update() {
    const r = sec.getBoundingClientRect(), vh = window.innerHeight;
    if (r.bottom < -vh * 0.3 || r.top > vh * 1.3) return;
    /* d > 0: Abschnitt liegt noch unter der Bildschirmmitte · < 0: schon darüber */
    const d = r.top + r.height / 2 - vh / 2;
    cols[0].style.transform = 'translate3d(0,' + (d * 0.24).toFixed(1) + 'px,0)';   // links: etwas schneller als der Scroll (ruhig)
    cols[1].style.transform = 'translate3d(0,' + (d * -0.32).toFixed(1) + 'px,0)';  // rechts: hängt hinterher
    /* Wörter hellen sich auf, während das Zitat vom unteren Rand zur Mitte wandert */
    const q = quote.getBoundingClientRect();
    const lit = c01((vh * 0.95 - q.top) / (vh * 0.5 + q.height * 0.5)) * words.length;
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  }
  update();
  lenis.on('scroll', update);
  window.addEventListener('resize', update);
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
      if (k < 1) requestAnimationFrame(frame); else el.style.clipPath = '';
    })(t0);
  }

  /* ── Footer (auf allen Seiten gleich: JCKY baut sich auf, Schreibmaschine, Leiste baut sich auf) ── */
  const onIndex = !!document.getElementById('hero');
  const footerBox = document.getElementById('footerWord');
  const note = footerBox ? document.querySelector('.ftp-note') : null;
  /* Dankestext als Schreibmaschine: Satz tippt sich hin, steht, tippt sich zeichenweise weg, der nächste kommt — in Schleife.
     Läuft nur, solange der Footer zu sehen ist. */
  if (note) {
    const PHRASES = [note.textContent.trim(), 'Check out my other stuff'];
    note.setAttribute('aria-label', PHRASES[0]);
    if (PX_REDUCE) { /* ohne Bewegung: erster Satz bleibt stehen */ }
    else {
      const caret = document.createElement('span');
      caret.className = 'ftp-caret'; caret.setAttribute('aria-hidden', 'true');
      const show = (t) => { note.textContent = t; note.appendChild(caret); };
      show('');
      let seen = false, idx = 0, waiting = null;
      const later = (fn, ms) => setTimeout(() => { if (seen) fn(); else waiting = fn; }, ms);   // unsichtbar → warten
      new IntersectionObserver(([en]) => { seen = en.isIntersecting; if (seen && waiting) { const fn = waiting; waiting = null; fn(); } }).observe(note.parentNode);
      function typeOut(text, done) {
        note.classList.add('is-typing');
        let i = 0;
        (function step() { show(text.slice(0, i)); if (i++ < text.length) setTimeout(step, 42 + Math.random() * 46); else { note.classList.remove('is-typing'); done(); } })();
      }
      function erase(text, done) {
        note.classList.add('is-typing');
        let i = text.length;
        (function step() { show(text.slice(0, i)); if (i-- > 0) setTimeout(step, 24); else { note.classList.remove('is-typing'); done(); } })();
      }
      function cycle() {
        const text = PHRASES[idx];
        typeOut(text, () => later(() => erase(text, () => { idx = (idx + 1) % PHRASES.length; later(cycle, 450); }), 3600));
      }
      onEnterOnce(footerBox, () => setTimeout(() => { seen = true; cycle(); }, 300), '-5%');
    }
  }
  if (live && footerBox) {
    /* Aufbau verteilt sich über den ganzen Weg: 0 = Wort taucht unten auf · 1 = ganz unten angekommen.
       Angezeigt wird mit Nachlauf (≈ 0,6 s) → auch bei schnellem Scrollen baut es sich ruhig auf. */
    let ftTarget = 0, ftShown = 0, ftRaf = 0, ftLast = 0;
    function footerTarget() {
      const r = footerBox.getBoundingClientRect(), vh = window.innerHeight;
      const maxY = Math.max(0, document.documentElement.scrollHeight - vh);
      const topAtEnd = r.top - (maxY - window.scrollY);                     // Lage des Worts, wenn ganz unten gescrollt
      const p = c01((vh - r.top) / Math.max(1, vh - topAtEnd));
      return p > 0.985 ? 1 : p;                                             // ganz unten: sicher komplett (Rundung)
    }
    function drawFooter(now) {
      ftRaf = 0;
      const spans = footerBox.querySelectorAll('.ftp-ch');
      if (!spans.length) return;
      const dt = Math.min(50, now - (ftLast || now)) / 1000; ftLast = now;
      ftShown = smoothTowards(ftShown, ftTarget, 0.6, dt);
      if (Math.abs(ftTarget - ftShown) < 0.002) ftShown = ftTarget;
      spans.forEach((s, i) => {
        if (s._pxW !== s.offsetWidth || s._pxH !== s.offsetHeight) pxMeasure(s, fontPx(s) * 0.05);   // Größe passt sich an (Fit)
        pxClip(s, ease(c01((ftShown - i * 0.13) / 0.6)), 'build');
      });
      if (ftShown !== ftTarget) ftRaf = requestAnimationFrame(drawFooter); else ftLast = 0;
    }
    function updateFooter() {
      ftTarget = footerTarget();
      if (!ftRaf) ftRaf = requestAnimationFrame(drawFooter);
    }
    updateFooter();
    lenis.on('scroll', updateFooter);
    window.addEventListener('resize', updateFooter);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(updateFooter);
    window.addEventListener('load', updateFooter);
  }

  /* Footer-Leiste: LinkedIn · Email · Behance · „made with love" bauen sich nacheinander aus Pixeln auf */
  const barCells = [...document.querySelectorAll('.site-footer-bar .sf-link, .site-footer-bar .sf-right')];
  if (live && barCells.length) {
    barCells.forEach(c => { c.style.clipPath = 'inset(50%)'; });
    onEnterOnce(barCells[0].parentNode.parentNode, () => barCells.forEach((c, i) =>
      setTimeout(() => buildOnce(c, Math.max(6, c.offsetHeight / 5), 520), 120 + i * 110)), '-2%');
  }

  /* Scroll-Anzeige rechts (die native Scrollbar ist ausgeblendet):
     · Pixel-Spur (eigenes Element, invertiert sich gegen den Untergrund): Blöcke füllen sich von oben, gezackter heller Kopf
     · crazy: je schneller gescrollt wird, desto stärker zittert die Spur um den Kopf und sprüht Pixel ab
     · Label = Chip in Akzentfarbe, hängt mit einer Linie am Kopf: nur die Prozentzahl (Ziffern rollen wie ein Zählwerk)
     · erscheint beim Scrollen, blendet sich nach 1,2 s Ruhe wieder aus */
  if ((onIndex || document.body.classList.contains('cv-page')) && !PX_REDUCE && !PHONE) {   // Handy: schmale Leiste oben (mobile.js)   // alle Seiten (My Work + Me tragen .cv-page)
    const wrap = document.createElement('div');
    wrap.className = 'px-scroll'; wrap.setAttribute('aria-hidden', 'true');
    const digit = '<span class="psl-d">' + '0123456789'.split('').map(d => '<span>' + d + '</span>').join('') + '</span>';
    wrap.innerHTML = '<div class="psl"><span class="psl-pct">' + digit + digit + digit + '<span class="psl-u">%</span></span></div>';
    document.body.appendChild(wrap);
    const cv = document.createElement('canvas'), g = cv.getContext('2d');
    cv.className = 'px-track'; cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    const label = wrap.querySelector('.psl');
    /* zweite, dunkle Lage des Chips: wird auf Akzent-Flächen beschnitten (wie das View-project-Label) */
    const alt = document.createElement('span');
    alt.className = 'psl-alt';
    alt.appendChild(label.querySelector('.psl-pct').cloneNode(true));
    label.appendChild(alt);
    const digits = [...wrap.querySelectorAll('.psl-d')];
    const ACC = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B6BEC8';
    /* Akzent-Flächen (Projekte: window.__accentRegions, Startseite: gehoverte große Links) als Polygone */
    const regions = () => {
      const out = typeof window.__accentRegions === 'function' ? window.__accentRegions() : [];
      document.querySelectorAll('.sn-link:hover').forEach((a) => { const r = a.getBoundingClientRect(); out.push([[r.left, r.top], [r.right, r.top], [r.right, r.bottom], [r.left, r.bottom]]); });
      (window.__accentPolys || []).forEach((f) => { const pts = f(); if (pts) out.push(pts); });   // z. B. „Selected Work", Hover-Fläche „What I do"
      return out;
    };
    const holes = () => (window.__accentHoles || []).map(f => f()).filter(Boolean);   // dunkle Flächen auf Blau (Hover „Selected Work")
    const inPoly = (x, y, pts) => { let c = false; for (let i = 0, k = pts.length - 1; i < pts.length; k = i++) { const [xi, yi] = pts[i], [xk, yk] = pts[k]; if ((yi > y) !== (yk > y) && x < (xk - xi) * (y - yi) / (yk - yi) + xi) c = !c; } return c; };
    const BS = 4, STEP = 7, X0 = 10;                                        // Blockgröße, Abstand, Abstand zum rechten Rand
    let CW = 0, CH = 0, dpr = 1, rows = 0, lim = 1, idle = 0, raf = 0;
    let p = 0, vel = 0, last = 0;
    const bits = [];
    /* Bereich der Anzeige: unter der Nav. My Work: fester Bereich mit Platz für den Filter oben und unten —
       der Filter wartet anfangs unten und rastet später oben ein; so liegt die Anzeige nie darüber und springt nicht */
    const filter = document.getElementById('pjFilter');
    let bTop = -1, bBot = -1;
    function bounds() {
      let top = 52, bot = window.innerHeight;
      if (filter) { const fh = filter.offsetHeight; top = 52 + fh; bot = window.innerHeight - fh; }
      if (top === bTop && bot === bBot) return false;
      bTop = top; bBot = bot;
      cv.style.top = top + 'px'; cv.style.height = Math.max(40, bot - top) + 'px';
      wrap.style.top = top + 'px'; wrap.style.bottom = (window.innerHeight - bot) + 'px';
      return true;
    }
    function size() {
      bounds();
      CW = cv.clientWidth; CH = cv.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(CW * dpr); cv.height = Math.round(CH * dpr);
      rows = Math.max(1, Math.floor((CH - 24) / STEP));
      lim = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    }
    function draw(now) {
      raf = 0;
      if (bounds()) size();                                                  // Filter rastet ein / fährt weg → Bereich anpassen
      const dt = Math.min(50, now - (last || now)); last = now;
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, CW, CH);
      const x = CW - X0 - BS, head = p * (rows - 1), speed = Math.min(1, Math.abs(vel) / 60);
      /* Farben: noch nicht gefüllt = Dunkelgrau · gefüllt / Kopf = Akzentfarbe; über einer Akzent-Fläche gefüllt = dunkel */
      const regs = regions(), hls = holes(), cvR = cv.getBoundingClientRect();
      const onAcc = (bx, by) => regs.length && regs.some(pts => inPoly(cvR.left + bx, cvR.top + by, pts)) && !hls.some(pts => inPoly(cvR.left + bx, cvR.top + by, pts));
      for (let i = 0; i < rows; i++) {
        const d = head - i, y = 12 + i * STEP;
        const filled = d >= -0.5;
        const near = Math.max(0, 1 - Math.abs(d) / 9);                        // Zittern rund um den Kopf
        const jit = near * speed * (pxRand(i, Math.floor(now / 60)) - 0.5) * 14;
        const acc = onAcc(x + BS / 2, y + BS / 2);
        g.fillStyle = filled ? (acc ? '#232323' : ACC) : (acc ? 'rgba(35,35,35,0.4)' : '#4A4A4A');
        g.globalAlpha = filled ? (d < 1.5 ? 1 : 0.8) : 1;
        if (Math.abs(d) < 3 && pxRand(i, 9) > 0.4) g.fillRect(Math.round(x - BS - 3 + jit), y, BS, BS);   // gezackter, breiterer Kopf
        g.fillRect(Math.round(x + jit), y, BS, BS);
      }
      g.fillStyle = ACC;
      /* abgesprühte Pixel */
      const hy = 12 + head * STEP;
      if (speed > 0.15 && bits.length < 140) for (let k = 0; k < Math.ceil(speed * 4); k++)
        bits.push({ x: x, y: hy + (Math.random() - 0.5) * 18, vx: -(1 + Math.random() * 4) * speed * 2, vy: (Math.random() - 0.5) * 1.6 + vel * 0.02, a: 1, s: Math.random() < 0.3 ? 3 : 2 });
      const f = dt / 16.67;
      for (let j = bits.length - 1; j >= 0; j--) {
        const b = bits[j]; b.x += b.vx * f; b.y += b.vy * f; b.vx *= Math.pow(0.95, f); b.a -= 0.03 * f;
        if (b.a <= 0 || b.x < 0) { bits.splice(j, 1); continue; }
        g.globalAlpha = b.a; g.fillRect(Math.round(b.x), Math.round(b.y), b.s, b.s);
      }
      g.globalAlpha = 1;
      const lh = label.offsetHeight || 28;                                   // Chip mittig auf dem Kopf
      label.style.transform = 'translate3d(0,' + Math.round(Math.max(0, Math.min(CH - lh, hy + BS / 2 - lh / 2))) + 'px,0)';
      /* dunkle Lage genau dort zeigen, wo das Chip über einer Akzent-Fläche liegt */
      const lr = label.getBoundingClientRect();
      let dpath = '';
      regs.concat(hls).forEach((pts) => { dpath += 'M' + pts.map(([px, py]) => (px - lr.left).toFixed(1) + ' ' + (py - lr.top).toFixed(1)).join('L') + 'Z'; });
      alt.style.clipPath = dpath ? (hls.length ? "path(evenodd, '" : "path('") + dpath + "')" : 'inset(50%)';   // Löcher per evenodd ausgespart
      vel *= Math.pow(0.86, f);                                              // Tempo klingt ab → Zittern beruhigt sich
      if (bits.length || Math.abs(vel) > 0.5 || wrap.classList.contains('is-on')) raf = requestAnimationFrame(draw);   // solange sichtbar: Flächen bewegen sich evtl. noch
    }
    function kick() { if (!raf) raf = requestAnimationFrame(draw); }
    size();
    lenis.on('scroll', (e) => {
      lim = (e && e.limit) || lim;
      p = c01(((e && typeof e.scroll === 'number') ? e.scroll : window.scrollY) / lim);
      if (e && typeof e.velocity === 'number') vel = e.velocity;
      const pc = String(Math.round(p * 100)).padStart(3, '0');
      digits.forEach((d, k) => d.style.setProperty('--d', pc[k % 3]));   // beide Lagen (hell + dunkel) je 3 Ziffern             // Ziffern rollen einzeln
      wrap.classList.add('is-on'); cv.classList.add('is-on');
      clearTimeout(idle);
      idle = setTimeout(() => { wrap.classList.remove('is-on'); cv.classList.remove('is-on'); }, 1200);
      kick();
    });
    window.addEventListener('resize', () => { size(); kick(); });
    window.addEventListener('load', size);
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.addEventListener('refresh', size);   // Pins verändern die Seitenlänge
  }
})();


/* ============================
   SELECTED WORK — Projekt-Index auf der Akzentfläche (index.html → #selectedWork)
   · Fläche in --accent; oben eine schräge Kante, die sich beim Hereinscrollen gerade zieht; unten immer schräg
     (beim Verlassen noch etwas mehr) — wie die schrägen Kanten auf „My Work"
   · Titel baut sich beim Hereinscrollen aus Pixeln auf, die Spaltenköpfe tippen sich ein,
     Zeilen: Linie zieht von links auf, Inhalt gleitet nacheinander hoch
   · Hover wie auf „My Work": eine dunkle Fläche wandert zwischen den Zeilen — nach unten kommt sie von oben,
     nach oben von unten (Kanten = gedämpfte Federn, schräg im Lauf) → auch bei sehr schnellem Wechsel stetig, ohne Lücken
   · Schrift: dunkel auf Blau; auf der dunklen Fläche in Blau (umgekehrte Farben) — eine Kopie der Zeile (.sw-ink) wird genau
     wie die Fläche beschnitten → Wechsel exakt an der Kante (gleiches Prinzip wie die Projekttitel auf „My Work")
   · Maus: Vorschaubild sitzt direkt am Zeiger; beim Wechsel der Zeile wischt das neue Bild von unten herein
   · Handy: kleines Vorschaubild in jeder Zeile; Drücken holt die Fläche (gleiche Richtungslogik)
============================ */
(function initSelectedWork() {
  const sec = document.getElementById('selectedWork');
  if (!sec) return;
  const live = !PX_REDUCE && PX_CLIP_OK;
  const rows = [...sec.querySelectorAll('.sw-row')];
  const list = sec.querySelector('.sw-list');
  const ease = v => 1 - Math.pow(1 - v, 3);
  const c01 = v => v < 0 ? 0 : v > 1 ? 1 : v;

  /* ── Kanten: oben + unten schräg, ziehen sich beim Hereinscrollen gerade ── */
  if (!PX_REDUCE) {
    let lastClip = '';
    const edges = () => {
      const r = sec.getBoundingClientRect(), vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return;
      const S = Math.min(vh * 0.13, 120);                                     // größte Schräge (px)
      const kin = 1 - ease(c01((vh - r.top) / (vh * 1.3)));                   // oben: schräg → gerade (bleibt länger schräg)
      const kout = 1 - ease(c01(r.bottom / (vh * 0.75)));                     // beim Verlassen: noch etwas schräger
      const t = (S * kin).toFixed(1), b = (S * (0.7 + 0.3 * kout)).toFixed(1);  // unten immer schräg
      const clip = 'polygon(0 ' + t + 'px, 100% 0, 100% calc(100% - ' + b + 'px), 0 100%)';
      if (clip !== lastClip) { lastClip = clip; sec.style.clipPath = clip; }
    };
    edges();
    lenis.on('scroll', edges);
    window.addEventListener('resize', edges);
  }

  /* ── Auftritt ── */
  const title = sec.querySelector('.sw-title-in');
  const typed = [...sec.querySelectorAll('.sw-cols span')];
  if (live) {
    sec.classList.add('is-live');
    typed.forEach(typePrepare);
    title.style.clipPath = 'inset(50%)';
    onEnterOnce(title, () => {
      pxMeasure(title, Math.max(10, parseFloat(getComputedStyle(title).fontSize) * 0.07));
      const t0 = performance.now();
      (function frame(now) {
        const k = Math.min(1, (now - t0) / 900);
        pxClip(title, ease(k), 'build');
        if (k < 1) requestAnimationFrame(frame); else title.style.clipPath = '';
      })(t0);
      typed.forEach((el, i) => setTimeout(() => typeIn(el, 420), 300 + i * 90));
    }, '-10%');
    rows.forEach((r) => onEnterOnce(r, () => r.classList.add('is-in'), '-6%'));
    onEnterOnce(rows[rows.length - 1], () => list.classList.add('is-in'), '-6%');
  } else {
    rows.forEach(r => r.classList.add('is-in')); list.classList.add('is-in');
  }

  /* ── Hover: dunkle Fläche wandert zwischen den Zeilen (rowBand), Schrift darauf blau; Vorschaubild am Zeiger (rowPreview) ── */
  const band = rowBand(list, rows, { bandClass: 'sw-band', inkClass: 'sw-ink' });
  window.__accentPolys.push(() => {                                    // Abschnitt liegt auf --accent …
    const q = sec.getBoundingClientRect();
    return q.bottom > 0 && q.top < window.innerHeight ? [[q.left, q.top], [q.right, q.top], [q.right, q.bottom], [q.left, q.bottom]] : null;
  });
  window.__accentHoles.push(() => band.poly());                       // … die dunkle Hover-Fläche nicht

  /* Handy: Drücken holt die Fläche (bleibt, bis eine andere Zeile gedrückt wird) */
  rows.forEach((r, i) => r.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') band.set(i, e.clientY); }));

  if (PHONE || (window.matchMedia && !window.matchMedia('(pointer: fine)').matches)) return;
  rows.forEach((r) => { const im = new Image(); im.decoding = 'async'; im.src = r.dataset.img; });   // vorladen
  rowPreview({
    scope: '#selectedWork .sw-row', rows, hideClass: 'sw-pv-on',
    chip: '<span class="hp-chip sw-pv-chip">View project<svg viewBox="0 0 12 12"><path d="M3.5 2h6.5v6.5H8.5V4.56L3.06 10 2 8.94 7.44 3.5H3.5z"/></svg></span>',
    make: (row) => { const img = document.createElement('img'); img.alt = ''; img.src = row.dataset.img; return img; },
    onRow: (i, y) => band.set(i, y)
  });
})();

/* ============================
   WEITER — „My work" / „More about me" (#storyNext)
   · Wörter gleiten beim Hereinscrollen aus der Maske, Label tippt sich ein
   · Hover (CSS): Füllung zieht von unten auf, Buchstaben-Roll, Pfeil schießt raus und kommt nach
============================ */
(function initStoryNext() {
  /* Wege weiter: Wörter gleiten aus der Maske, Label tippt sich ein */
  const next = document.getElementById('storyNext');
  if (next) {
    next.querySelectorAll('.sn-in').forEach((el) => splitRoll(el));
    const keys = [...next.querySelectorAll('.sn-k')];
    keys.forEach(typePrepare);
    onEnterOnce(next, () => { next.classList.add('is-in'); keys.forEach((k, i) => setTimeout(() => typeIn(k, 520), 250 + i * 140)); }, '-12%');

    /* Ganz unten blendet sich die Nav ein (initNavScrollHide) → dann soll die obere Linie der beiden Felder
       genau auf der Unterlinie der Nav liegen (eine Linie). Abstand zum Footer entsprechend ausrechnen;
       reicht er nicht, werden die Felder etwas niedriger. */
    const nav = document.getElementById('mainNav'), links = [...next.querySelectorAll('.sn-link')];
    /* full = alles zurücksetzen und neu rechnen (nur bei echter Fenstergröße). Sonst nur die Differenz korrigieren —
       ein Zurücksetzen würde die Seite kurz verkürzen, der Browser schöbe die Scrollposition hoch. */
    function fitToNav(full) {
      if (full) {
        next.style.marginTop = next.style.marginBottom = '';
        links.forEach(l => { l.style.minHeight = l.style.gap = ''; });
      }
      const navLine = (nav ? nav.offsetHeight : 52) - 1;                   // Unterlinie liegt innen in der letzten Pixelzeile
      const top = () => next.getBoundingClientRect().top + window.scrollY;
      const end = () => document.body.getBoundingClientRect().bottom + window.scrollY;   // exakte Seitenunterkante (scrollHeight wäre gerundet)
      /* > 0: unten fehlt Platz · < 0: zu viel Inhalt unter der Oberkante */
      const diff = () => (phoneVH() - navLine) - (end() - top());          // Handy: stabile Höhe → kein Sprung, wenn die Adressleiste ein-/ausfährt
      const t0 = top();
      if (Math.abs(t0 - Math.round(t0)) > 0.01) {                          // ganzzahlige Lage → Linie liegt pixelgenau auf
        const mt = parseFloat(getComputedStyle(next).marginTop) || 0;
        next.style.marginTop = (mt + Math.ceil(t0) - t0) + 'px';
      }
      let d = diff();
      if (Math.abs(d) < 0.01) return;
      const mb = parseFloat(getComputedStyle(next).marginBottom) || 0;
      if (mb + d >= 0) { next.style.marginBottom = (mb + d) + 'px'; return; }
      /* zu niedriges Fenster: Abstand weg, dann die Felder niedriger, zuletzt der Innenabstand enger */
      next.style.marginBottom = '0px';
      const rows = getComputedStyle(next).gridTemplateColumns.split(' ').length > 1 ? 1 : links.length;
      d = diff();
      links.forEach(l => { l.style.minHeight = Math.max(0, l.offsetHeight + d / rows) + 'px'; });
      d = diff();
      if (d < 0) links.forEach(l => { l.style.gap = Math.max(12, (parseFloat(getComputedStyle(l).rowGap) || 48) + d / rows) + 'px'; });
      d = diff();
      if (d > 0) next.style.marginBottom = d + 'px';
    }
    let fitRaf = 0, fitFull = false;
    const fitSoon = (full) => {
      fitFull = fitFull || full === true;
      cancelAnimationFrame(fitRaf);
      fitRaf = requestAnimationFrame(() => { const f = fitFull; fitFull = false; fitToNav(f); });
    };
    fitSoon(true);
    let lastW = window.innerWidth, lastH = window.innerHeight;
    window.addEventListener('resize', () => {                                // nur echte Größenänderung → komplett neu
      if (window.innerWidth === lastW && window.innerHeight === lastH) return;
      lastW = window.innerWidth; lastH = window.innerHeight; fitSoon(true);
    });
    window.addEventListener('load', () => fitSoon());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitSoon());
    const foot = document.getElementById('siteFooter');
    if ('ResizeObserver' in window && foot) new ResizeObserver(() => fitSoon()).observe(foot);   // Footer-Wort passt sich an → Differenz korrigieren
  }
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

  /* overFilter: Nav fährt nur über den Filter (ganz unten) — der Filter bleibt oben stehen und wird verdeckt */
  let covered = false;
  function show(overFilter) {
    overFilter = !!overFilter;
    if (!hidden && covered === overFilter) return;                 // schon so sichtbar (Filter verdeckt oder darunter)
    hidden = false; covered = overFilter;
    document.documentElement.classList.add('nav-shown');
    const fTop = overFilter && pjFilter ? Math.min(0, NAV_H - pjFilter.offsetHeight) : NAV_H;   // verdeckt: Filter so weit hoch, dass er ganz unter der Nav liegt
    if (reduce) { gsap.set(nav, { yPercent: 0 }); if (pjFilter) gsap.set(pjFilter, { top: fTop }); return; }
    gsap.to(nav, { yPercent: 0, duration: 0.28, ease: 'power2.out', overwrite: true });
    if (pjFilter) gsap.to(pjFilter, { top: fTop, duration: 0.28, ease: 'power2.out', overwrite: true });
  }
  function hide() {
    if (hidden) return; hidden = true; covered = false;
    document.documentElement.classList.remove('nav-shown');
    if (reduce) { gsap.set(nav, { yPercent: -100 }); if (pjFilter) gsap.set(pjFilter, { top: 0 }); return; }
    gsap.to(nav, { yPercent: -100, duration: 0.24, ease: 'power2.in', overwrite: true });
    if (pjFilter) gsap.to(pjFilter, { top: 0, duration: 0.24, ease: 'power2.in', overwrite: true });
  }

  function handle(y, dir) {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    document.documentElement.classList.toggle('at-page-end', y >= max - 24);   // ganz unten (CSS: Filter aus, kein View-Label)
    if (y < 48) { show(); return; }   // ganz oben immer sichtbar
    if (y >= max - 24) { show(true); return; }   // ganz unten angekommen → Nav einblenden, verdeckt den Filter
    if (dir > 0 && !PHONE) hide();    // runter → smooth nach oben (Handy: Nav bleibt immer stehen)
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