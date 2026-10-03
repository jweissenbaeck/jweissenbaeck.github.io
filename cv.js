/* ============================================================
   CV PAGE — Hero + Scroll-Story
   · Hero: Name wird exakt an die Breite angepasst und baut sich beim Laden
     aus Pixeln auf; Foto + Tool-Sticker bewegen sich leicht mit der Maus.
   · Story (GSAP ScrollTrigger, pin): Szenen bauen sich aus Pixelblöcken auf
     und zerfallen nach oben – gleiche Blockverteilung wie der Seitenwechsel.
     Tools: Karten fliegen nacheinander auf einen Haufen; danach fährt die Szene leicht hoch und blendet aus.
     Interessen: Sticker kleben sich nacheinander dazu.
   · Physik: Scrollt man über die Story hinaus, fallen die Pillen in die Spielfläche über dem
     Footer, stapeln sich und lassen sich mit Maus/Finger ziehen und werfen (kleine eigene Engine).
   Inhalte stehen in cv.html; hier nur Ablauf + Darstellung.
============================================================ */
(function () {
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var fine = !window.matchMedia || window.matchMedia('(any-hover: hover)').matches;

  /* ── Pixel-Engine ── */
  var PX_BIAS = 0.62;
  function pxRnd(gx, gy) {                          // identisch zu script.js → gleiches Blockmuster
    var x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
    x = (x ^ (x >>> 13)) * 1274126177 >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  /* clip-path aus allen Blöcken, die bei 'cover' sichtbar sind · build = von unten auf, dissolve = nach oben weg */
  function blockPath(W, H, cover, mode, B) {
    var cols = Math.ceil(W / B), rows = Math.ceil(H / B), d = '';
    for (var gy = 0; gy < rows; gy++) {
      var rowBias = rows > 1 ? gy / (rows - 1) : 0;
      for (var gx = 0; gx < cols; gx++) {
        var rn = pxRnd(gx, gy);
        var thr = mode === 'dissolve' ? rowBias * PX_BIAS + rn * (1 - PX_BIAS) : (1 - rowBias) * PX_BIAS + rn * (1 - PX_BIAS);
        if (cover >= thr) d += 'M' + gx * B + ' ' + gy * B + 'h' + (B + 1) + 'v' + (B + 1) + 'h-' + (B + 1) + 'Z';
      }
    }
    return d;
  }
  function setClip(el, cover, mode) {
    if (cover >= 1) { el.style.clipPath = 'none'; return; }
    if (cover <= 0) { el.style.clipPath = 'inset(50%)'; return; }
    var d = blockPath(el._w, el._h, cover, mode, el._b);
    el.style.clipPath = d ? "path('" + d + "')" : 'inset(50%)';
  }
  function measure(el, B) {
    el._w = el.offsetWidth; el._h = el.offsetHeight;
    el._b = B || Math.max(8, Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.16));
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return 1 - Math.pow(1 - v, 3); }
  var CLIP_OK = !!(window.CSS && CSS.supports && CSS.supports('clip-path', "path('M0 0H1V1Z')"));

  /* ── Logos: fehlende Datei → Anfangsbuchstabe (Karten + Sticker sind hell, Logos bleiben wie sie sind) ── */
  document.querySelectorAll('.cvs-card-ico img, .cvh-sticker img').forEach(function (img) {
    var miss = function () { img.parentNode.classList.add('is-empty'); };
    img.addEventListener('error', miss);
    if (img.complete && !img.naturalWidth) miss();
  });

  /* ============================
     HERO
     ============================ */
  var hero = document.getElementById('cvHero');
  if (hero) (function initHero() {
    var name = document.getElementById('cvhName'), inner = name && name.querySelector('.cvh-name-inner');
    var wide = parseFloat(getComputedStyle(hero).getPropertyValue('--wide')) || 1.18;

    /* Name exakt auf ~96 % der Breite (inkl. Streckung) */
    function fitName() {
      if (!inner) return;
      name.style.fontSize = '100px';
      var w = inner.offsetWidth * wide;
      if (w) name.style.fontSize = (100 * window.innerWidth * 0.96 / w) + 'px';
    }
    fitName();
    window.addEventListener('resize', fitName);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);

    /* Laden: Name baut sich aus Pixeln auf, danach Foto + Sticker (CSS-Animationen) */
    if (!reduce && CLIP_OK && inner) {
      hero.classList.add('is-intro');
      var t0 = 0, DUR = 900;
      var start = function () {
        measure(inner, Math.max(10, Math.round(parseFloat(getComputedStyle(name).fontSize) * 0.08)));
        t0 = performance.now();
        (function frame(now) {
          var k = clamp01((now - t0) / DUR);
          setClip(inner, ease(k), 'build');
          if (k < 1) requestAnimationFrame(frame); else inner.style.clipPath = 'none';
        })(t0);
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitName(); start(); });
      else start();
      setTimeout(function () { hero.classList.remove('is-intro'); inner.style.clipPath = ''; }, 3200);   // alle Intro-Animationen fertig
    }

    /* Maus-Parallax: Sticker (je nach Tiefe) und Foto wandern leicht gegenläufig */
    if (!reduce && fine) {
      var parts = Array.prototype.slice.call(hero.querySelectorAll('.cvh-sticker')).map(function (el) {
        return { el: el, d: parseFloat(el.style.getPropertyValue('--d')) || 1 };
      });
      var cut = hero.querySelector('.cvh-cut');
      if (cut) parts.push({ el: cut, d: 0.35 });
      var tx = 0, ty = 0, gx = 0, gy = 0, raf = 0, MAX = 14;
      function frame() {
        raf = 0;
        tx += (gx - tx) * 0.08; ty += (gy - ty) * 0.08;
        parts.forEach(function (p) {
          p.el.style.setProperty('--px', (tx * p.d).toFixed(2) + 'px');
          p.el.style.setProperty('--py', (ty * p.d).toFixed(2) + 'px');
        });
        if (Math.abs(gx - tx) > 0.05 || Math.abs(gy - ty) > 0.05) raf = requestAnimationFrame(frame);
      }
      window.addEventListener('mousemove', function (e) {
        gx = -((e.clientX / window.innerWidth) - 0.5) * 2 * MAX;
        gy = -((e.clientY / window.innerHeight) - 0.5) * 2 * MAX;
        if (!raf) raf = requestAnimationFrame(frame);
      }, { passive: true });
    }
  })();

  /* ============================
     STORY
     ============================ */
  var story = document.getElementById('cvStory');
  if (!story) return;
  if (reduce || !CLIP_OK || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    story.classList.add('is-static');               // ohne Animation: alles sichtbar, Szenen untereinander
    return;
  }

  var scenes = Array.prototype.slice.call(story.querySelectorAll('.cvs-scene'));
  var inners = scenes.map(function (s) { return s.querySelector('.cvs-inner'); });
  var tools = inners[1], toolTitle = tools.querySelector('.cvs-title');
  var cards = Array.prototype.slice.call(tools.querySelectorAll('.cvs-card'));
  var loveTitle = inners[2].querySelector('.cvs-title');
  var stickers = Array.prototype.slice.call(inners[2].querySelectorAll('.cvs-sticker'));

  /* Ablauf in „Schritten“ q. Jedes Element: Aufbau-Fenster (in) und optional Zerfall-Fenster (out). */
  var C0 = 0.95, CS = 0.16;                         // Tool-Karten: Start + Abstand (fliegen nacheinander auf den Haufen)
  var CEND = C0 + cards.length * CS + 0.3;
  var TOUT = [CEND + 0.35, CEND + 0.75];             // Tools: leicht hochfahren + ausblenden (wie der Name auf der Startseite)
  var L0 = TOUT[1] + 0.4, LS = 0.2;                 // Interessen: Start + Abstand
  var timeline = [
    { el: inners[0].querySelector('.cvs-big'), scene: scenes[0], inn: null, out: [0.25, 0.55] }, // Einstieg zerfällt in Pixel
    { el: toolTitle, scene: scenes[1], inn: [0.60, 0.90], out: null },                           // Tools-Titel
    { el: loveTitle, scene: scenes[2], inn: [L0 - 0.35, L0 - 0.05], out: null }                  // I love
  ];
  cards.forEach(function (c, i) {
    var a = C0 + i * CS;
    timeline.push({ el: c, inn: [a, a + 0.22], out: null });
  });
  stickers.forEach(function (s, i) {
    var a = L0 + i * LS;
    timeline.push({ el: s, inn: [a, a + 0.2], out: null });
  });
  var Q = L0 + stickers.length * LS + 0.4;           // Ende: letzter Sticker steht noch kurz
  timeline.forEach(function (t) { t.el.classList.add('cvs-clip'); });
  story.classList.add('is-live');

  function measureAll() {
    var sceneB = Math.round(Math.max(12, Math.min(24, window.innerWidth * 0.014)));
    timeline.forEach(function (t) {
      var isText = t.el.classList.contains('cvs-wide') || t.el === toolTitle || t.el === loveTitle;
      measure(t.el, isText ? 0 : Math.max(6, Math.round(sceneB * 0.6)));
      t.el._key = null;
    });
  }

  var lastQ = 0;
  function render(q) {
    lastQ = q;
    timeline.forEach(function (t) {
      var c = 1, mode = 'build';
      if (t.inn && q < t.inn[1]) c = clamp01((q - t.inn[0]) / (t.inn[1] - t.inn[0]));
      else if (t.out && q > t.out[0]) { c = 1 - clamp01((q - t.out[0]) / (t.out[1] - t.out[0])); mode = 'dissolve'; }
      var key = mode + (Math.round(c * 200) / 200);
      if (t.el._key !== key) { t.el._key = key; setClip(t.el, c, mode); }
      if (t.scene) t.scene.classList.toggle('is-active', c > 0.5);
    });
    var e = ease(clamp01((q - TOUT[0]) / (TOUT[1] - TOUT[0])));   // Tools: hochfahren + ausblenden
    tools.style.transform = e ? 'translateY(' + (-70 * e).toFixed(1) + 'px)' : '';
    tools.style.opacity = e ? (1 - e).toFixed(3) : '';
    scenes[1].classList.toggle('is-active', q >= 0.75 && e < 0.5);
  }
  function refresh() { measureAll(); render(lastQ); }

  measureAll(); render(0);
  /* ============================
     PHYSIK — kleine Rigid-Body-Engine (Prinzip Box2D-Lite)
     Körper = gedrehte Rechtecke (Pillen), Kollision per Trennachsen + Kanten-Clipping,
     Impulse mit Reibung und leichter Federung, Ziehen per Feder am Greifpunkt.
     ============================ */
  var play = (function () {
    var area = document.getElementById('cvPlay');
    var noop = { drop: function () {}, reset: function () {} };
    if (!area) return noop;
    var G = 2600, SUB = 3, ITER = 10, MU = 0.55, BOUNCE = 0.18, SLOP = 0.6, BETA = 0.22;
    var bodies = [], walls = [], held = null, raf = 0, calm = 0, visible = true, dropped = false;
    var W = 0, H = 0, pointer = { x: 0, y: 0, cx: 0, cy: 0 };

    function body(x, y, w, h, a, isStatic) {
      var m = isStatic ? 0 : w * h * 0.001;
      return { x: x, y: y, a: a || 0, vx: 0, vy: 0, w: 0, hw: w / 2, hh: h / 2,
               im: isStatic ? 0 : 1 / m, iI: isStatic ? 0 : 1 / (m * (w * w + h * h) / 12), m: m };
    }
    function verts(b) {                               // Ecken im Uhrzeigersinn (Bildschirm, y nach unten)
      var c = Math.cos(b.a), s = Math.sin(b.a), out = [];
      [[-b.hw, -b.hh], [b.hw, -b.hh], [b.hw, b.hh], [-b.hw, b.hh]].forEach(function (p) {
        out.push({ x: b.x + p[0] * c - p[1] * s, y: b.y + p[0] * s + p[1] * c });
      });
      return out;
    }
    function normals(v) {
      return v.map(function (p, i) {
        var q = v[(i + 1) % 4], ex = q.x - p.x, ey = q.y - p.y, l = Math.sqrt(ex * ex + ey * ey) || 1;
        return { x: ey / l, y: -ex / l };
      });
    }
    function maxSep(va, na, vb) {                     // größte Trennung entlang der Normalen von A
      var best = -Infinity, idx = 0;
      for (var i = 0; i < 4; i++) {
        var mn = Infinity;
        for (var j = 0; j < 4; j++) mn = Math.min(mn, na[i].x * (vb[j].x - va[i].x) + na[i].y * (vb[j].y - va[i].y));
        if (mn > best) { best = mn; idx = i; }
      }
      return { s: best, i: idx };
    }
    function clip(p1, p2, nx, ny, off) {             // Strecke an Ebene n·p ≤ off abschneiden
      var d1 = nx * p1.x + ny * p1.y - off, d2 = nx * p2.x + ny * p2.y - off, out = [];
      if (d1 <= 0) out.push(p1);
      if (d2 <= 0) out.push(p2);
      if (d1 * d2 < 0) { var k = d1 / (d1 - d2); out.push({ x: p1.x + (p2.x - p1.x) * k, y: p1.y + (p2.y - p1.y) * k }); }
      return out;
    }
    function collide(A, B) {
      var va = verts(A), vb = verts(B), na = normals(va), nb = normals(vb);
      var sa = maxSep(va, na, vb); if (sa.s > 0) return null;
      var sb = maxSep(vb, nb, va); if (sb.s > 0) return null;
      var flip = sb.s > sa.s + 0.1;
      var R = flip ? vb : va, RN = flip ? nb : na, I = flip ? va : vb, IN = flip ? na : nb, ri = flip ? sb.i : sa.i;
      var n = RN[ri], v1 = R[ri], v2 = R[(ri + 1) % 4];
      var ii = 0, md = Infinity;                      // Gegenkante: am stärksten entgegengesetzt
      for (var k = 0; k < 4; k++) { var d = IN[k].x * n.x + IN[k].y * n.y; if (d < md) { md = d; ii = k; } }
      var tx = v2.x - v1.x, ty = v2.y - v1.y, tl = Math.sqrt(tx * tx + ty * ty) || 1; tx /= tl; ty /= tl;
      var pts = clip(I[ii], I[(ii + 1) % 4], -tx, -ty, -(tx * v1.x + ty * v1.y));
      if (pts.length < 2) return null;
      pts = clip(pts[0], pts[1], tx, ty, tx * v2.x + ty * v2.y);
      var out = [];
      pts.forEach(function (p) {
        var sep = n.x * (p.x - v1.x) + n.y * (p.y - v1.y);
        if (sep <= 0) out.push({ x: p.x, y: p.y, nx: flip ? -n.x : n.x, ny: flip ? -n.y : n.y, sep: sep });
      });
      return out.length ? out : null;
    }
    function cross(ax, ay, bx, by) { return ax * by - ay * bx; }
    function step(dt) {
      var contacts = [], all = bodies.concat(walls), i, j;
      for (i = 0; i < bodies.length; i++) for (j = i + 1; j < all.length; j++) {
        var A = bodies[i], B = all[j], cs = collide(A, B);
        if (cs) cs.forEach(function (c) { contacts.push(prep(A, B, c, dt)); });
      }
      bodies.forEach(function (b) { b.vy += G * dt; b.vx *= 0.999; b.vy *= 0.999; b.w *= 0.995; });
      if (held) drag(held, dt);
      for (var it = 0; it < ITER; it++) contacts.forEach(function (c) { solve(c); });
      bodies.forEach(function (b) { b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; });
    }
    function prep(A, B, c, dt) {
      var rax = c.x - A.x, ray = c.y - A.y, rbx = c.x - B.x, rby = c.y - B.y, nx = c.nx, ny = c.ny, tx = -ny, ty = nx;
      var rnA = cross(rax, ray, nx, ny), rnB = cross(rbx, rby, nx, ny), rtA = cross(rax, ray, tx, ty), rtB = cross(rbx, rby, tx, ty);
      var vn = (B.vx - B.w * rby - A.vx + A.w * ray) * nx + (B.vy + B.w * rbx - A.vy - A.w * rax) * ny;
      var bias = -BETA / dt * Math.min(0, c.sep + SLOP);
      if (vn < -120) bias = Math.max(bias, -BOUNCE * vn);           // leichte Federung bei hartem Aufprall
      return { A: A, B: B, rax: rax, ray: ray, rbx: rbx, rby: rby, nx: nx, ny: ny, tx: tx, ty: ty, bias: bias, pn: 0, pt: 0,
               mn: 1 / (A.im + B.im + A.iI * rnA * rnA + B.iI * rnB * rnB), mt: 1 / (A.im + B.im + A.iI * rtA * rtA + B.iI * rtB * rtB) };
    }
    function impulse(c, px, py) {
      var A = c.A, B = c.B;
      A.vx -= px * A.im; A.vy -= py * A.im; A.w -= A.iI * cross(c.rax, c.ray, px, py);
      B.vx += px * B.im; B.vy += py * B.im; B.w += B.iI * cross(c.rbx, c.rby, px, py);
    }
    function relVel(c) {
      var A = c.A, B = c.B;
      return { x: B.vx - B.w * c.rby - A.vx + A.w * c.ray, y: B.vy + B.w * c.rbx - A.vy - A.w * c.rax };
    }
    function solve(c) {
      var dv = relVel(c), vn = dv.x * c.nx + dv.y * c.ny;
      var d = c.mn * (-vn + c.bias), p0 = c.pn; c.pn = Math.max(p0 + d, 0); d = c.pn - p0;
      impulse(c, c.nx * d, c.ny * d);
      dv = relVel(c);
      var vt = dv.x * c.tx + dv.y * c.ty, dt = c.mt * -vt, max = MU * c.pn, t0 = c.pt;
      c.pt = Math.max(-max, Math.min(max, t0 + dt)); dt = c.pt - t0;
      impulse(c, c.tx * dt, c.ty * dt);
    }
    function drag(b, dt) {                            // Feder zwischen Greifpunkt und Zeiger
      var c = Math.cos(b.a), s = Math.sin(b.a);
      var rx = b.lx * c - b.ly * s, ry = b.lx * s + b.ly * c;
      var ex = pointer.x - (b.x + rx), ey = pointer.y - (b.y + ry);
      var vx = b.vx - b.w * ry, vy = b.vy + b.w * rx;
      var px = b.m * (900 * ex - 38 * vx) * dt, py = b.m * (900 * ey - 38 * vy) * dt;
      b.vx += px * b.im; b.vy += py * b.im; b.w += b.iI * cross(rx, ry, px, py);
    }
    function draw() {
      bodies.forEach(function (b) {
        b.el.style.transform = 'translate(' + (b.x - b.hw).toFixed(1) + 'px,' + (b.y - b.hh).toFixed(1) + 'px) rotate(' + b.a.toFixed(4) + 'rad)';
      });
    }
    function frame() {
      raf = 0;
      if (!dropped || !visible) return;
      for (var i = 0; i < SUB; i++) step(1 / 60 / SUB);
      draw();
      var moving = held || bodies.some(function (b) { return Math.abs(b.vx) + Math.abs(b.vy) > 8 || Math.abs(b.w) > 0.08; });
      calm = moving ? 0 : calm + 1;
      if (calm < 45) raf = requestAnimationFrame(frame);          // alles liegt → Rechnen pausiert
    }
    function wake() { calm = 0; if (!raf) raf = requestAnimationFrame(frame); }
    function buildWalls() {
      W = area.clientWidth; H = area.clientHeight;
      walls = [body(W / 2, H + 50, W + 400, 100, 0, true),             // Boden
               body(-50, H - 3000, 100, 6000, 0, true),                 // links
               body(W + 50, H - 3000, 100, 6000, 0, true)];             // rechts
    }
    function toArea(clientX, clientY) { var r = area.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; }

    function drop() {
      if (dropped) return;
      dropped = true;
      buildWalls();
      var ar = area.getBoundingClientRect();
      stickers.forEach(function (s, i) {
        var r = s.getBoundingClientRect(), w = s.offsetWidth, h = s.offsetHeight;
        var cx = r.left + r.width / 2 - ar.left, cy = r.top + r.height / 2 - ar.top;
        var deg = parseFloat(s.style.getPropertyValue('--r')) || 0;
        var el = document.createElement('div');
        el.className = 'cvs-sticker cvp-pill';
        el.textContent = s.textContent;
        el.style.setProperty('--r', '0deg');
        area.appendChild(el);
        var b = body(cx, cy, w, h, deg * Math.PI / 180);
        b.el = el; b.vx = (Math.random() - 0.5) * 60; b.w = (Math.random() - 0.5) * 1.2;
        el._b = b;
        bodies.push(b);
        s.classList.add('is-dropped');
      });
      draw(); wake();
    }
    function reset() {
      if (!dropped) return;
      dropped = false; held = null;
      bodies.forEach(function (b) { b.el.remove(); });
      bodies = [];
      stickers.forEach(function (s) { s.classList.remove('is-dropped'); });
    }

    /* Ziehen + Werfen (Maus und Finger) */
    area.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.cvp-pill'); if (!el) return;
      e.preventDefault();
      var b = el._b, p = toArea(e.clientX, e.clientY), c = Math.cos(-b.a), s = Math.sin(-b.a);
      var dx = p.x - b.x, dy = p.y - b.y;
      b.lx = dx * c - dy * s; b.ly = dx * s + dy * c;            // Greifpunkt im Körper
      pointer.x = p.x; pointer.y = p.y; pointer.cx = e.clientX; pointer.cy = e.clientY;
      held = b; el.classList.add('is-held');
      el.setPointerCapture && el.setPointerCapture(e.pointerId);
      wake();
    });
    window.addEventListener('pointermove', function (e) {
      if (!held) return;
      pointer.cx = e.clientX; pointer.cy = e.clientY;
      var p = toArea(e.clientX, e.clientY); pointer.x = p.x; pointer.y = p.y;
      wake();
    });
    window.addEventListener('scroll', function () {                 // beim Scrollen mit gehaltener Pille mitführen
      if (!held) return;
      var p = toArea(pointer.cx, pointer.cy); pointer.x = p.x; pointer.y = p.y;
    }, { passive: true });
    function release() { if (!held) return; held.el.classList.remove('is-held'); held = null; wake(); }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('resize', function () { if (dropped) { buildWalls(); wake(); } });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && dropped) wake(); }).observe(area);
    }
    return { drop: drop, reset: reset };
  })();
  var st = ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: '+=' + Math.round(Q * 60) + '%',            // 60 % Bildschirmhöhe Scrollweg pro Schritt
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: function (self) { render(self.progress * Q); },
    onRefresh: refresh,
    onLeave: function () { play.drop(); },           // über die Story hinaus → Pillen fallen
    onEnterBack: function () { play.reset(); }       // zurück → Pillen sortieren sich wieder
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refresh(); ScrollTrigger.refresh(); });

  if (st && st.progress >= 1) setTimeout(play.drop, 0);  // Seite schon unterhalb der Story geladen
})();