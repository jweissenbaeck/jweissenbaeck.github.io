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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
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
   EASTER EGG — Klick auf JCKY (Logo oben links)
   Klick 1–4: Buchstaben hüpfen + kurzer Hinweis.
   Klick 5:   Scramble + Pixel-Regen über die Seite.
   Nach 4s ohne Klick fängt der Zähler von vorn an.
============================ */
(function initLogoEasterEgg() {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var LINES = ['Press me again', 'Again', 'Once more', 'Last one'];
  var FINAL = 'Press me again';
  var GLYPHS = '#%&@$*+=?!01';

  /* ── gemeinsame Sprechblase ── */
  var toast = null, toastTimer = null;
  function say(msg, ms, x, y) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'egg-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    var tw = toast.offsetWidth, th = toast.offsetHeight;
    var left = Math.max(12, Math.min(window.innerWidth - tw - 12, x + 16));
    var top = y + 18;
    if (top + th > window.innerHeight - 12) top = y - th - 14;   // unten kein Platz → über den Zeiger
    toast.style.left = left + 'px';
    toast.style.top = Math.max(12, top) + 'px';
    toast.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, ms);
  }

  /* ── gemeinsamer Pixel-Regen ── */
  var rain = null;
  function burst(cx, cy) {
    if (reduce) return;
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#F0EDE8';
    if (!rain) {
      var cv = document.createElement('canvas');
      cv.className = 'egg-canvas';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      rain = { cv: cv, ctx: cv.getContext('2d'), parts: [], last: performance.now() };
      requestAnimationFrame(frame);
    }
    var up = cy > window.innerHeight * 0.5;          // unten geklickt → Fontäne nach oben
    var SIZES = [6, 9, 12, 12, 18];
    for (var n = 0; n < 190; n++) {
      var a = up ? (-Math.PI + Math.random() * Math.PI)
                 : (-Math.PI * 0.45 + Math.random() * Math.PI * 1.1);
      var v = (up ? 8 : 4) + Math.random() * (up ? 16 : 14);
      rain.parts.push({
        x: cx, y: cy,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4,
        s: SIZES[Math.floor(Math.random() * SIZES.length)],
        age: 0, life: 2600 + Math.random() * 1400,
        c: Math.random() < 0.15 ? 'rgba(240,237,232,0.35)' : ink
      });
    }
  }

  /* Dieselbe Explosion, aber die Pixel entstehen verteilt auf einer Fläche (Footer-Buchstabe).
     Gleiche Größen, Farben, Tempo und Physik wie oben; Richtung: weg von der Mitte, nach oben. */
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

  /* ── ein Easter Egg an ein Element binden ── */
  function attach(el, letters, word) {
    if (!el || !letters.length) return;
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-label', word);
    el.classList.add('egg-target');
    letters.forEach(function (s, i) {
      s.style.setProperty('--egg-r', (i % 2 ? 8 : -8) + 'deg');
      s.style.setProperty('--egg-r2', (i % 2 ? 1.5 : -1.5) + 'deg');
    });
    var count = 0, idle = null, scrambling = false;

    function jump(big) {
      var cls = big ? 'is-jump-big' : 'is-jump';
      letters.forEach(function (s, i) {
        s.classList.remove('is-jump', 'is-jump-big');
        void s.offsetWidth;                         // Animation neu starten
        s.style.animationDelay = (i * 0.05) + 's';
        s.classList.add(cls);
      });
    }
    function scramble() {
      if (scrambling || reduce) return;
      scrambling = true;
      /* Breiten fixieren → breitere Scramble-Zeichen verschieben weder Zelle noch Trennlinie */
      letters.forEach(function (s) { s.style.width = parseFloat(getComputedStyle(s).width) + 'px'; s.style.textAlign = 'center'; });
      var t0 = performance.now(), DUR = 700;
      (function tick(now) {
        var p = (now - t0) / DUR;
        letters.forEach(function (s, i) {
          s.textContent = p >= (i + 1) / letters.length ? word[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        });
        if (p < 1) requestAnimationFrame(tick);
        else { letters.forEach(function (s, i) { s.textContent = word[i]; s.style.width = ''; s.style.textAlign = ''; }); scrambling = false; }
      })(t0);
    }
    function hit(x, y) {
      clearTimeout(idle);
      idle = setTimeout(function () { count = 0; }, 4000);
      count++;
      if (count < 5) {
        jump(false);
        say(LINES[count - 1], 1600, x, y);
      } else {
        count = 0;
        jump(true);
        scramble();
        burst(x, y);
        say(FINAL, 2200, x, y);
      }
    }
    el.addEventListener('click', function (e) {
      var r = el.getBoundingClientRect();
      var x = e.clientX || (r.left + r.width / 2), y = e.clientY || (r.top + r.height / 2);
      hit(x, y);
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      var r = el.getBoundingClientRect();
      hit(r.left + r.width / 2, r.top + r.height / 2);
    });
  }

  /* ── Footer: Klick auf einen Buchstaben → genau dieser explodiert, kommt danach zurück ── */
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
    /* Nav-Logo: Buchstaben einzeln wrappen */
    var cell = document.getElementById('navLogoName');
    var txt = cell && cell.querySelector('.nav-logo-text');
    if (cell && txt) {
      var word = txt.textContent.trim();
      txt.textContent = '';
      var navLetters = word.split('').map(function (ch) {
        var s = document.createElement('span');
        s.className = 'egg-ch';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = ch;
        txt.appendChild(s);
        return s;
      });
      attach(cell, navLetters, word);
    }
    initFooterExplode();
  }
  try {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup);
    else setup();
  } catch (e) {}
})();

/* ============================
   PAGE LOADER
============================ */
(function initLoader() {
  const loader  = document.getElementById('pageLoader');
  const bar     = document.getElementById('loaderBar');
  const pct     = document.getElementById('loaderPercent');
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

  let progress = 0;
  let targetProgress = 0;
  let done = false;
  let progressRaf = null;

  function renderProgress() {
    progress += (targetProgress - progress) * 0.16;
    if (bar) bar.style.width = Math.round(progress) + '%';
    if (pct) pct.textContent = Math.floor(progress) + '%';

    if (Math.abs(targetProgress - progress) > 0.4) {
      progressRaf = requestAnimationFrame(renderProgress);
    } else {
      progress = targetProgress;
      if (bar) bar.style.width = Math.round(progress) + '%';
      if (pct) pct.textContent = Math.floor(progress) + '%';
      progressRaf = null;
    }
  }

  function setProgress(p) {
    targetProgress = Math.min(100, Math.max(targetProgress, p));
    if (!progressRaf) {
      progressRaf = requestAnimationFrame(renderProgress);
    }
  }

  function hideLoader() {
    if (done) return;
    done = true;
    setProgress(100);

    setTimeout(() => {
      const nameEl     = document.getElementById('heroWordFullname');
      const subtitleEl = document.querySelector('.hero-subtitle');
      if (nameEl)     nameEl.style.transform     = 'translateY(110%)';
      if (subtitleEl) subtitleEl.style.transform = 'translateY(110%)';

      loader.style.transition = 'opacity 0.55s cubic-bezier(0.16,1,0.3,1), transform 0.75s cubic-bezier(0.16,1,0.3,1)';
      loader.style.opacity    = '0';
      loader.style.transform  = 'translateY(-12px)';

      setTimeout(() => {
        loader.classList.add('is-hidden');
        loader.style.display = 'none';

        document.documentElement.style.overflow = '';

        if (nameEl)     nameEl.style.transform     = '';
        if (subtitleEl) subtitleEl.style.transform = '';

        requestAnimationFrame(() => {
          if (typeof window.__heroInit === 'function') {
            window.__heroInit();
          }
        });
      }, 700);
    }, 700);
  }

  let trickle = 0;
  const trickleInterval = setInterval(() => {
    trickle += Math.random() * 3.8 + 1.2;
    if (trickle >= 84) { trickle = 84; clearInterval(trickleInterval); }
    setProgress(trickle);
  }, 120);

  if (document.readyState === 'complete') {
    clearInterval(trickleInterval);
    hideLoader();
  } else {
    window.addEventListener('load', () => {
      clearInterval(trickleInterval);
      setProgress(90);
      document.fonts.ready.then(() => {
        setProgress(97);
        setTimeout(hideLoader, 240);
      });
    });
  }
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

    if (href === '#contact') href = '#globeSection';

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
  const items = document.querySelectorAll('.projects-cta, .cvh-bubble, .nav .nav-cell, .site-footer-bar .sf-link, .site-footer-bar .sf-right');
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
   PLAY CURSOR — Hero-Bild im Vollbild
   Eckiges Label im Stil der Nav-Hover-Zellen (helle Fläche, dunkle Schrift, Barlow):
   Play-Dreieck + „Play“. Wischt von unten herein, folgt der Maus mit leichter Verzögerung;
   der System-Cursor wird dabei ausgeblendet. Nur wenn das Bild Vollbild ist und man drüber hovert.
============================ */
(function initPlayCursor() {
  const card = document.getElementById('heroImgCard');
  if (!card) return;
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const cur = document.createElement('div');
  cur.id = 'playCursor';
  cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<span class="pc-inner"><svg viewBox="0 0 12 12"><path d="M3 2v8l7-4z"/></svg><span class="pc-txt">Play</span></span>';
  document.body.appendChild(cur);

  let overCard = false, wasOn = false;
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2, px = cx, py = cy;

  card.addEventListener('mouseenter', () => { overCard = true; });
  card.addEventListener('mouseleave', () => { overCard = false; });
  window.addEventListener('mousemove', (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });

  function active() { return overCard && window.__heroFullscreen === true; }

  (function loop() {
    requestAnimationFrame(loop);
    const on = active();
    if (on && !wasOn) { px = cx; py = cy; }          // beim Erscheinen direkt am Zeiger starten
    wasOn = on;
    cur.classList.toggle('is-visible', on);
    document.documentElement.classList.toggle('play-cursor-on', on);
    window.__playCursorActive = on;                  // Hero-Partikel pausieren, solange das Label sichtbar ist
    if (on) {
      px += (cx - px) * 0.28; py += (cy - py) * 0.28; // leicht nachgezogen
      cur.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
    }
  })();
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

  const heroTL = gsap.timeline({ delay: 0.0 });
  heroTL
    .to('#heroWordFullname', { y: '0%', duration: 0.75, ease: 'power4.out' }, 0.05)
    .to('.hero-subtitle',    { y: '0%', duration: 0.6,  ease: 'power3.out' }, 0.65);
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

    // Phase A — letters float up
    const pA = ph(p, 0.04, 0.40, eIO);
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
    const pB        = ph(p, 0.35, 0.78, eIO);
    const pCardZoom = ph(p, 0.78, 1.00, eIO);

    const imgCardFadeIn = c01(ph(p, 0.35, 0.55));
    const cardW    = imgCard.offsetWidth || window.innerWidth * 0.26;
    const maxScale = Math.max(window.innerWidth / cardW, window.innerHeight / (cardW * 0.5625));
    const cardZoom = 1 + pA * 0.05 + pCardZoom * (maxScale - 1.05);
    gsap.set(imgCard, { scale: cardZoom, opacity: imgCardFadeIn, xPercent: -50, transformOrigin: '50% 50%' });
    window.__heroFullscreen = pCardZoom > 0.9;   // Bild praktisch Vollbild → Play-Cursor aktiv

    if (heroImgWrap) {
      if (p >= 0.35) {
        if (!heroImgWrap.classList.contains('is-revealed')) {
          void heroImgWrap.offsetWidth;
          heroImgWrap.classList.add('is-revealed');
        }
      } else {
        heroImgWrap.classList.remove('is-revealed');
      }
    }

    const pExit = ph(p, 0.78, 0.92, eIO);

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
    if (p < 0.80) {
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0)' });
    } else {
      const pC = ph(p, 0.80, 1.00, eIO);
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
    end:           '+=230%',
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
  const contactEl = document.getElementById('globeSection') || document.getElementById('contact');

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

    name.addEventListener('mouseenter', () => {
      const nameRect = name.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      showPanel(name, imgId);
      if (skills) {
        skills.style.left = (nameRect.right - itemRect.left + 24) + 'px';
        gsap.set(skills, { opacity: 1, x: 0 });
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
   SCROLL ANIMATIONS
============================ */
gsap.set('.svc-item', { opacity: 0, y: 24 });
ScrollTrigger.create({
  trigger: '.services-list',
  start: 'top 82%',
  once: true,
  onEnter() {
    gsap.to('.svc-item', {
      opacity: 1, y: 0,
      duration: 0.75, stagger: 0.07,
      ease: 'power3.out',
    });
  }
});

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
   GLOBE — Canvas 2D (ohne Three.js)
   Die Erde als Kugel aus Licht: Landmassen aus feinen Punkten, beleuchtet von oben links
   (Tag/Nacht mit weicher Schattengrenze, vereinzelte Stadtlichter auf der Nachtseite),
   gedämpfte Ozean-Punkte zeigen die Kugelform, ein weicher Atmosphären-Schein am Rand.
   Maus: Land leuchtet unter dem Cursor auf, die Kugel neigt sich leicht; Klick: Welle über die
   Oberfläche. Salzburg-Pin mit rotem Puls + Label beim Hover. Kamera wie zuvor (Abstand 4.8, 38°).
============================ */
(function initGlobeSection() {
  const container = document.getElementById('globeSectionCanvas');
  if (!container) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const INK = '240,237,232', ACCENT = '#ff4040';
  const PAD = 1.3;                                   // Canvas größer als der Container → Platz für den Atmosphären-Schein

  const cv = document.createElement('canvas');
  cv.className = 'globe-canvas';
  cv.setAttribute('role', 'img');
  cv.setAttribute('aria-label', 'Globe with a pin on Salzburg, Austria');
  container.style.position = 'relative';
  container.appendChild(cv);
  const ctx = cv.getContext('2d');
  let S = 520, dpr = 1;
  function resize() {
    S = container.offsetWidth || 520;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(S * PAD * dpr); cv.height = Math.round(S * PAD * dpr);
  }
  resize();
  new ResizeObserver(resize).observe(container);

  /* ── Geometrie ── */
  const R = 1.5, D = 4.8, TANF = Math.tan(19 * Math.PI / 180), VIS = R * R / D;   // sichtbar, wenn z > R²/D
  const DISC = (R / Math.sqrt(D * D - R * R)) / TANF * 0.5;                       // Kugel-Radius in Anteilen von S
  const off = () => S * (PAD - 1) / 2;                                             // Versatz Container → Canvas
  function proj(X, Y, Z, o) {
    const d = D - Z;
    o.x = off() + (0.5 + X / (d * TANF) * 0.5) * S;
    o.y = off() + (0.5 - Y / (d * TANF) * 0.5) * S;
    return o;
  }
  function ll(lat, lon, r) {
    const a = lat * Math.PI / 180, b = lon * Math.PI / 180;
    return [r * Math.cos(a) * Math.cos(b), r * Math.sin(a), -r * Math.cos(a) * Math.sin(b)];
  }
  function mul(A, B) {                               // 3×3-Matrizen, zeilenweise
    const o = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
    return o;
  }
  const rotY = t => { const c = Math.cos(t), s = Math.sin(t); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const rotX = t => { const c = Math.cos(t), s = Math.sin(t); return [1, 0, 0, 0, c, -s, 0, s, c]; };
  /* Grundstellung: Salzburg schaut zum Betrachter, Norden oben */
  const LAT0 = 47.8, LON0 = 13.05;
  const BASE = mul(rotX(LAT0 * Math.PI / 180), rotY(-Math.PI / 2 - LON0 * Math.PI / 180));
  const LIGHT = (function () { const v = [-0.86, 0.34, 0.42], l = Math.hypot(v[0], v[1], v[2]); return v.map(x => x / l); })();   // seitlich → sichtbare Tag/Nacht-Grenze

  /* ── Punkte: Ozean (gleichmäßig auf der Kugel), Land (aus den Länderumrissen) ── */
  const ocean = [];
  const NO = 2300, GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < NO; i++) {
    const y = 1 - (i + 0.5) / NO * 2, r = Math.sqrt(1 - y * y), t = GA * i;
    ocean.push([Math.cos(t) * r * R, y * R, Math.sin(t) * r * R]);
  }
  const land = [];
  function pointInPolygon(lat, lon, rings) {
    for (const ring of rings) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) return true;
    }
    return false;
  }
  function isLand(lat, lon, features) {
    for (const f of features) {
      const g = f.geometry; if (!g) continue;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (const p of polys) if (pointInPolygon(lat, lon, p)) return true;
    }
    return false;
  }
  function buildLand(features) {
    const ROWS = 150;
    for (let row = 0; row < ROWS; row++) {
      const lat = -90 + (180 / ROWS) * (row + 0.5), n = Math.max(1, Math.round(ROWS * 2 * Math.cos(lat * Math.PI / 180)));
      for (let col = 0; col < n; col++) {
        const lon = -180 + (360 / n) * (col + 0.5);
        if (!isLand(lat, lon, features)) continue;
        const cell = 180 / ROWS, jl = lat + (Math.random() - 0.5) * cell * 0.9, jo = lon + (Math.random() - 0.5) * (360 / n) * 0.9;   // organisch statt Raster
        land.push({ p: ll(jl, jo, R * 1.004), ph: Math.random() * 6.283, city: Math.random() < 0.08, big: Math.random() < 0.22 });
      }
    }
  }
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(world => { if (typeof topojson !== 'undefined') buildLand(topojson.feature(world, world.objects.countries).features); })
    .catch(() => {});

  /* ── Gradnetz + Pin ── */
  const grid = [];
  [-60, -30, 0, 30, 60].forEach(lat => { const l = []; for (let i = 0; i <= 96; i++) l.push(ll(lat, -180 + i * 3.75, R)); grid.push(l); });
  for (let lon = 0; lon < 360; lon += 30) { const l = []; for (let i = 0; i <= 48; i++) l.push(ll(-90 + i * 3.75, lon, R)); grid.push(l); }
  const PIN_BASE = ll(LAT0, LON0, R + 0.002), PIN_TIP = ll(LAT0, LON0, R + 0.22);

  /* ── Interaktion ── */
  const mouse = { x: -1e4, y: -1e4, on: false };
  const ripples = [];
  let hovered = false;
  cv.addEventListener('mouseenter', () => { hovered = true; });
  cv.addEventListener('mouseleave', () => { hovered = false; mouse.on = false; });
  cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width * S * PAD; mouse.y = (e.clientY - r.top) / r.height * S * PAD; mouse.on = true; });
  cv.addEventListener('click', e => {
    const r = cv.getBoundingClientRect();
    ripples.push({ x: (e.clientX - r.left) / r.width * S * PAD, y: (e.clientY - r.top) / r.height * S * PAD, t: performance.now() });
  });
  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;
  window.addEventListener('mousemove', e => {
    const b = container.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    tRotY = Math.max(-0.20, Math.min(0.20, ((e.clientX - cx) / (b.width / 2)) * 0.18));
    tRotX = Math.max(-0.12, Math.min(0.12, ((e.clientY - cy) / (b.height / 2)) * 0.10));
  }, { passive: true });

  /* ── Label (SVG) wie bisher ── */
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5;';
  container.appendChild(svg);
  function el(tag, attrs) { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) n.setAttribute(k, attrs[k]); n.style.opacity = '0'; svg.appendChild(n); return n; }
  const sLine = el('line', { stroke: 'rgba(240,237,232,0.55)', 'stroke-width': '1', 'stroke-dasharray': '3 3' });
  const sBadge = el('rect', { rx: '3', fill: '#0a0a09', stroke: 'rgba(240,237,232,0.24)', 'stroke-width': '1' });
  const sDot = el('circle', { r: '2.5', fill: ACCENT });
  const sText = el('text', { fill: '#F0EDE8', 'font-family': 'DM Mono, monospace', 'font-size': '9', 'letter-spacing': '0.2em', 'text-anchor': 'start', 'dominant-baseline': 'middle' });
  sText.textContent = 'SALZBURG, AT';

  /* ── Zeichnen ── */
  const v = [0, 0, 0], o = { x: 0, y: 0 }, o2 = { x: 0, y: 0 };
  function rot(M, p, fy) { v[0] = M[0] * p[0] + M[1] * p[1] + M[2] * p[2]; v[1] = M[3] * p[0] + M[4] * p[1] + M[5] * p[2] + fy; v[2] = M[6] * p[0] + M[7] * p[1] + M[8] * p[2]; return v; }
  const BUCKETS = 24;
  const bucket = Array.from({ length: BUCKETS }, () => []), bucketBig = Array.from({ length: BUCKETS }, () => []);
  let clock = 0, last = performance.now(), visible = false;

  function draw(now) {
    const W = S * PAD, cx = W / 2;
    const fy = reduce ? 0 : Math.sin(clock * 0.6) * 0.028;                        // leichtes Schweben
    const M = mul(mul(rotY(cRotY), rotX(cRotX)), BASE);
    const cy = cx - fy / (D * TANF) * 0.5 * S, rr = DISC * S;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, W);

    /* Atmosphäre: weicher Schein am Rand */
    let g = ctx.createRadialGradient(cx, cy, rr * 0.94, cx, cy, rr * 1.18);
    g.addColorStop(0, 'rgba(' + INK + ',0.13)'); g.addColorStop(0.35, 'rgba(' + INK + ',0.05)'); g.addColorStop(1, 'rgba(' + INK + ',0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr * 1.18, 0, 6.2832); ctx.fill();
    /* Kugelkörper: dunkel, zur Lichtseite minimal heller */
    g = ctx.createRadialGradient(cx - rr * 0.38, cy - rr * 0.34, rr * 0.05, cx, cy, rr);
    g.addColorStop(0, '#24211c'); g.addColorStop(0.7, '#151412'); g.addColorStop(1, '#0d0c0b');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.fill();

    const limb = (x, y) => { const d = Math.hypot(x - cx, y - cy) / rr; return d >= 1 ? 0 : Math.min(1, (1 - d) / 0.16); };

    /* Gradnetz */
    ctx.strokeStyle = 'rgba(' + INK + ',0.05)'; ctx.lineWidth = 1; ctx.beginPath();
    for (const line of grid) {
      let pen = false;
      for (const p of line) {
        rot(M, p, fy);
        if (v[2] <= VIS) { pen = false; continue; }
        proj(v[0], v[1], v[2], o);
        if (pen) ctx.lineTo(o.x, o.y); else { ctx.moveTo(o.x, o.y); pen = true; }
      }
    }
    ctx.stroke();

    /* Ozean: feine, gedämpfte Punkte */
    ctx.fillStyle = 'rgba(' + INK + ',1)';
    for (let i = 0; i < BUCKETS; i++) bucket[i].length = 0;
    const so = Math.max(1, S / 420);
    for (const p of ocean) {
      rot(M, p, fy);
      if (v[2] <= VIS) continue;
      const lit = (v[0] * LIGHT[0] + v[1] * LIGHT[1] + (v[2]) * LIGHT[2]) / R;
      proj(v[0], v[1], v[2], o);
      let a = (0.04 + 0.09 * Math.max(0, lit)) * limb(o.x, o.y);
      for (const rp of ripples) { const age = (now - rp.t) / 2600, w = Math.abs(Math.hypot(o.x - rp.x, o.y - rp.y) - age * S * 0.75); if (w < S * 0.05) a += (1 - age) * 0.35 * (1 - w / (S * 0.05)); }
      if (a > 0.004) bucket[Math.min(BUCKETS - 1, Math.floor(a * BUCKETS))].push(o.x, o.y);
    }
    flush(so);

    /* Land: hell auf der Tagseite, weicher Übergang zur Nacht, Stadtlichter; Maus + Klick-Wellen */
    const sl = Math.max(1.3, S / 300), t = now / 1000;
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 2600) ripples.splice(i, 1);
    for (const pt of land) {
      rot(M, pt.p, fy);
      if (v[2] <= VIS) continue;
      const lit = (v[0] * LIGHT[0] + v[1] * LIGHT[1] + v[2] * LIGHT[2]) / R;
      proj(v[0], v[1], v[2], o);
      const day = Math.max(0, Math.min(1, (lit + 0.12) / 0.5));
      let a = 0.16 + 0.74 * day * day * (3 - 2 * day);
      if (pt.city && lit < 0.05 && !reduce) a += 0.55 * (0.5 + 0.5 * Math.sin(t * 2.2 + pt.ph));
      if (mouse.on) { const md = Math.hypot(o.x - mouse.x, o.y - mouse.y), mr = S * 0.2; if (md < mr) a += 0.45 * (1 - md / mr); }
      for (const rp of ripples) {
        const age = (now - rp.t) / 2600, rad = age * S * 0.75, d = Math.hypot(o.x - rp.x, o.y - rp.y);
        const w = Math.abs(d - rad); if (w < S * 0.05) a += (1 - age) * 1.1 * (1 - w / (S * 0.05));   // deutliche Welle
      }
      a = Math.min(1, a) * limb(o.x, o.y);
      if (a > 0.01) (pt.big ? bucketBig : bucket)[Math.min(BUCKETS - 1, Math.floor(a * BUCKETS))].push(o.x, o.y);
    }
    flush(sl * 0.8);                                   // zwei Punktgrößen → Sternenstaub statt Gitter
    flush(sl * 1.35, bucketBig);

    /* Salzburg-Pin */
    rot(M, PIN_TIP, fy); const tipVis = v[2] > VIS; proj(v[0], v[1], v[2], o);
    rot(M, PIN_BASE, fy); proj(v[0], v[1], v[2], o2);
    if (tipVis) {
      const pulse = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 2.6), pulse2 = reduce ? 0.5 : 0.5 + 0.5 * Math.sin(clock * 2.6 + Math.PI), u = S / 520;
      ctx.strokeStyle = 'rgba(' + INK + ',0.9)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(o2.x, o2.y); ctx.lineTo(o.x, o.y); ctx.stroke();
      ctx.fillStyle = ACCENT; ctx.beginPath(); ctx.arc(o2.x, o2.y, 2.2 * u, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.08 + 0.2 * pulse2; ctx.beginPath(); ctx.arc(o.x, o.y, (7 + 6 * pulse2) * u, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.45 + 0.45 * pulse; ctx.strokeStyle = ACCENT; ctx.lineWidth = 1.6 * u; ctx.beginPath(); ctx.arc(o.x, o.y, (4.6 + 1.2 * pulse) * u, 0, 6.2832); ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(o.x, o.y, 2.6 * u, 0, 6.2832); ctx.fill();
    }
    /* Label beim Hover (Container-Koordinaten) */
    const px = o.x - off(), py = o.y - off(), H = 17, P = 6, TW = 84, DR = 5, DG = 5, bw = DR * 2 + DG + TW + P * 2, bx = px + 14, by = py - 28;
    sLine.setAttribute('x1', px); sLine.setAttribute('y1', py); sLine.setAttribute('x2', bx); sLine.setAttribute('y2', by + H / 2);
    sBadge.setAttribute('x', bx); sBadge.setAttribute('y', by); sBadge.setAttribute('width', bw); sBadge.setAttribute('height', H);
    sDot.setAttribute('cx', bx + P + DR); sDot.setAttribute('cy', by + H / 2);
    sText.setAttribute('x', bx + P + DR * 2 + DG); sText.setAttribute('y', by + H / 2);
    const lv = tipVis && hovered ? 1 : 0;
    [sLine, sBadge, sDot, sText].forEach(n => { n.style.opacity = String(lv); n.style.transition = hovered ? 'opacity 0.3s ease' : 'opacity 0.15s ease'; });
  }
  function flush(size, set) {                         // Punkte gebündelt nach Helligkeit zeichnen (schnell)
    set = set || bucket;
    for (let i = 0; i < BUCKETS; i++) {
      const b = set[i]; if (!b.length) continue;
      ctx.globalAlpha = (i + 0.5) / BUCKETS;
      for (let k = 0; k < b.length; k += 2) ctx.fillRect(b[k] - size / 2, b[k + 1] - size / 2, size, size);
      b.length = 0;
    }
    ctx.globalAlpha = 1;
  }

  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.01 }).observe(container);
  (function tick(now) {
    requestAnimationFrame(tick);
    now = now || performance.now();
    const dt = Math.min(now - last || 16.7, 50) / 1000; last = now;
    if (!visible) return;
    if (!reduce) {
      clock += 0.72 * dt;
      const k = 1 - Math.exp(-dt / 0.55);
      cRotY += (tRotY - cRotY) * k; cRotX += (tRotX - cRotX) * k;
    }
    draw(now);
  })();
})();

/* ============================
   GLOBE SECTION — Sternenhimmel im Hintergrund (wie auf der Me-Seite)
   Pixel-Sterne in Tiefenebenen: funkeln leise, treiben langsam, folgen minimal der Maus.
   Alle paar Sekunden zieht eine Sternschnuppe vorbei; ein Klick schickt eine Lichtwelle durch die Sterne.
============================ */
(function initGlobeStars() {
  const section = document.getElementById('globeSection');
  if (!section) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const canvas = document.createElement('canvas');
  canvas.className = 'globe-section-stars';
  canvas.setAttribute('aria-hidden', 'true');
  section.insertBefore(canvas, section.firstChild);
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1, stars = [], visible = false, last = performance.now();
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }, ripples = [];
  let shoot = null, nextShoot = performance.now() + 2500;
  function rnd(i, k) { let h = ((i + 1) * 374761393 + (k + 1) * 668265263) >>> 0; h = (h ^ (h >>> 13)) * 1274126177 >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function build() {
    W = section.offsetWidth; H = section.offsetHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const n = Math.round(W * H / 2400);
    stars = [];
    for (let i = 0; i < n; i++) {
      const z = 0.18 + Math.pow(rnd(i, 4), 2.2) * 0.82;                       // meist fern, wenige nah
      stars.push({ x: rnd(i, 1) * W, y: rnd(i, 2) * H, z: z, s: z > 0.82 ? 3 : z > 0.5 ? 2 : 1, a: 0.1 + z * 0.55, ph: rnd(i, 9) * 6.283, sp: 0.5 + rnd(i, 17), px: 0, py: 0 });
    }
  }
  section.addEventListener('mousemove', e => { const r = section.getBoundingClientRect(); mouse.tx = (e.clientX - r.left) / r.width - 0.5; mouse.ty = (e.clientY - r.top) / r.height - 0.5; }, { passive: true });
  section.addEventListener('click', e => { const r = section.getBoundingClientRect(); ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }); });
  function draw(now, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgb(240,237,232)';
    mouse.x += (mouse.tx - mouse.x) * 0.05; mouse.y += (mouse.ty - mouse.y) * 0.05;
    for (let i = ripples.length - 1; i >= 0; i--) if (now - ripples[i].t > 2200) ripples.splice(i, 1);
    for (const s of stars) {
      if (!reduce) s.x -= s.z * 4 * dt;                                         // langsames Treiben
      if (s.x < -4) s.x += W + 8;
      let x = s.x + mouse.x * s.z * 26, y = s.y + mouse.y * s.z * 16;
      let a = s.a * (reduce ? 1 : 0.72 + 0.28 * Math.sin(now * 0.0016 * s.sp + s.ph));
      for (const rp of ripples) {                                               // Lichtwelle: hellt auf + schiebt sanft weg
        const age = (now - rp.t) / 2200, rad = age * Math.max(W, H) * 0.7, dx = x - rp.x, dy = y - rp.y, d = Math.hypot(dx, dy) || 1, w = Math.abs(d - rad);
        if (w < 60) { const k = (1 - age) * (1 - w / 60); a += k * 0.6; x += dx / d * k * 10 * s.z; y += dy / d * k * 10 * s.z; }
      }
      ctx.globalAlpha = Math.min(1, a);
      ctx.fillRect(Math.round(x), Math.round(y), s.s, s.s);
    }
    /* Sternschnuppe */
    if (!reduce) {
      if (!shoot && now > nextShoot) {
        const ang = Math.PI * (0.78 + Math.random() * 0.1);                      // schräg nach links unten
        shoot = { x: W * (0.35 + Math.random() * 0.6), y: H * (0.05 + Math.random() * 0.3), vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, life: 0, len: 140 + Math.random() * 110 };
      }
      if (shoot) {
        shoot.life += dt; shoot.x += shoot.vx * dt; shoot.y += shoot.vy * dt;
        const k = Math.min(1, shoot.life / 0.15) * Math.max(0, 1 - shoot.life / 0.95), l = shoot.len / 900;
        const g = ctx.createLinearGradient(shoot.x, shoot.y, shoot.x - shoot.vx * l, shoot.y - shoot.vy * l);
        g.addColorStop(0, 'rgba(240,237,232,' + (0.85 * k).toFixed(3) + ')'); g.addColorStop(1, 'rgba(240,237,232,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(shoot.x - shoot.vx * l, shoot.y - shoot.vy * l); ctx.stroke();
        if (shoot.life > 0.95) { shoot = null; nextShoot = now + 5000 + Math.random() * 6000; }
      }
    }
    ctx.globalAlpha = 1;
  }
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.01 }).observe(section);
  window.addEventListener('resize', build);
  build();
  (function tick(now) {
    requestAnimationFrame(tick);
    now = now || performance.now();
    const dt = Math.min(now - last || 16.7, 50) / 1000; last = now;
    if (visible) draw(now, dt);
  })();
})();

/* ============================
   GLOBE SECTION — Scroll Split
============================ */
(function initGlobeScrollSplit() {
  const section    = document.getElementById('globeSection');
  const canvasWrap = document.getElementById('globeSectionCanvas');
  const textLeft   = document.getElementById('globeTextLeft');
  const line1      = document.getElementById('globeHeadline');

  if (!section || !canvasWrap || !textLeft) return;

  const c01  = v => Math.max(0, Math.min(1, v));
  const eOut = t => 1 - Math.pow(1 - c01(t), 3);
  const eInOut = t => { t = c01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const ph   = (p, a, b) => eOut(c01((p - a) / (b - a)));
  const phIO = (p, a, b) => eInOut(c01((p - a) / (b - a)));

  gsap.set(canvasWrap, { x: 0, scale: 1, transformOrigin: 'center center' });
  gsap.set(textLeft,   { opacity: 0 });
  gsap.set(line1, { y: '110%' });

  function getTargetX() {
    const vw = window.innerWidth;
    const cw = canvasWrap.offsetWidth;
    const scaledHalf = (cw * 1.18) / 2;
    return Math.min(vw * 0.75, vw - scaledHalf - 40) - vw / 2;
  }

  function applyProgress(p) {
    /* Kugel: sanfter Ein-/Auslauf (eInOut) statt reinem eOut → kein „Anspringen" */
    const move = phIO(p, 0.00, 1.00);
    gsap.set(canvasWrap, { x: move * getTargetX(), scale: 1 + move * 0.18 });
    gsap.set(textLeft, { opacity: ph(p, 0.55, 0.88) });
    gsap.set(line1,    { y: (1 - ph(p, 0.60, 0.90)) * 110 + '%' });
  }

  ScrollTrigger.create({
    trigger:       section,
    start:         'top top',
    end:           '+=180%',
    pin:           true,
    pinSpacing:    true,
    anticipatePin: 1,
    scrub:         0.9,
    invalidateOnRefresh: true,
    onUpdate(self)  { applyProgress(self.progress); },
    onLeaveBack() {
      gsap.set(canvasWrap, { x: 0, scale: 1 });
      gsap.set(textLeft,   { opacity: 0 });
      gsap.set(line1, { y: '110%' });
    },
  });
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