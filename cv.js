(function () {
  var fine = matchMedia('(any-hover: hover)').matches;

  function measure(el, B) {
    pxMeasure(el, B || Math.max(8, Math.round(parseFloat(getComputedStyle(el).fontSize) * 0.16)));
  }

  // hide tool icons that fail to load
  document.querySelectorAll('.cvs-i3d img').forEach(function (img) {
    var miss = function () { img.style.display = 'none'; };
    img.addEventListener('error', miss);
    if (img.complete && !img.naturalWidth) miss();
  });

  var hero = document.getElementById('cvHero');
  if (hero) (function initHero() {
    var born = new Date(2003, 0, 17), today = new Date();
    var age = today.getFullYear() - born.getFullYear() - ((today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) ? 1 : 0);
    hero.querySelectorAll('[data-age]').forEach(function (el) { el.textContent = age; });

    var name = document.getElementById('cvhName'), inner = name && name.querySelector('.cvh-name-inner');
    var wide = parseFloat(getComputedStyle(hero).getPropertyValue('--wide')) || 1.18;

    if (PHONE && inner) inner.innerHTML = inner.textContent.trim().split(/\s+/).map(function (w) { return '<span class="cvh-line">' + w + '</span>'; }).join('');
    function fitName() {
      if (!inner) return;
      name.style.fontSize = '100px';
      if (PHONE) {
        var m = Math.max.apply(null, [].map.call(inner.children, function (l) { return l.offsetWidth; }));
        if (m) name.style.fontSize = (100 * (document.documentElement.clientWidth - 32) / m) + 'px';
        return;
      }
      var w = inner.offsetWidth * wide;
      if (w) name.style.fontSize = (100 * window.innerWidth * 0.96 / w) + 'px';
    }
    fitName();
    window.addEventListener('resize', fitName);
    document.fonts.ready.then(fitName);

    // the two buttons push each other aside on hover
    var ctaBtn = hero.querySelector('.cvh-cta'), cvBtn = hero.querySelector('.cvh-cv');
    var ctaPush = hero.querySelector('.cvh-cta-push'), cvPush = hero.querySelector('.cvh-cv-push');
    if (ctaBtn && cvBtn && ctaPush && cvPush && fine && !REDUCED) {
      var tV = 0, tC = 0, pushRaf = 0, active = null, near = false, GAP = 10;
      var pushStep = function () {
        pushRaf = 0;
        var vw = ctaPush.getBoundingClientRect(), cw = cvPush.getBoundingClientRect();
        var magV = ctaBtn.getBoundingClientRect().right - vw.right;
        var magC = cvBtn.getBoundingClientRect().left - cw.left;
        var restV = vw.right - tV, restC = cw.left - tC;
        var overlap = (restV + magV) + GAP - (restC + magC);
        var goV = 0, goC = 0;
        if (overlap > 0.5) { if (active === 'cv') goV = -overlap; else goC = overlap; }
        tV += (goV - tV) * (Math.abs(goV) > Math.abs(tV) ? 0.7 : 0.18);
        tC += (goC - tC) * (Math.abs(goC) > Math.abs(tC) ? 0.7 : 0.18);
        if (Math.abs(goV - tV) < 0.5) tV = goV;
        if (Math.abs(goC - tC) < 0.5) tC = goC;
        ctaPush.style.transform = tV ? 'translateX(' + tV.toFixed(1) + 'px)' : '';
        cvPush.style.transform = tC ? 'translateX(' + tC.toFixed(1) + 'px)' : '';
        if (near || tV || tC) pushRaf = requestAnimationFrame(pushStep);
      };
      var kickPush = function () { if (!pushRaf) pushRaf = requestAnimationFrame(pushStep); };
      [[ctaBtn, 'view'], [cvBtn, 'cv']].forEach(function (p) {
        p[0].addEventListener('mouseenter', function () { active = p[1]; near = true; kickPush(); });
        p[0].addEventListener('mouseleave', function () { setTimeout(function () { near = false; }, 400); kickPush(); });
      });
    }

    if (!REDUCED && CLIP_OK && inner) {
      hero.classList.add('is-intro');
      var t0 = 0, DUR = 900;
      var start = function () {
        measure(inner, Math.max(10, Math.round(parseFloat(getComputedStyle(name).fontSize) * 0.08)));
        t0 = performance.now();
        (function frame(now) {
          var k = c01((now - t0) / DUR);
          pxClip(inner, easeOut(k), 'build');
          if (k < 1) requestAnimationFrame(frame); else inner.style.clipPath = 'none';
        })(t0);
      };
      document.fonts.ready.then(function () { fitName(); start(); });
      setTimeout(function () { hero.classList.remove('is-intro'); inner.style.clipPath = ''; }, 3200);
    }

  })();

  // sketch lines on the portrait and the job title
  var por = document.getElementById('cvhPortrait');
  if (por) hoverLine({ trigger: por, host: document.getElementById('cvHero'), ref: por, z: 2, seg: [
    [-0.66, 0.29],
    [-0.52, 0.19, -0.36, 0.10, -0.25, 0.08],
    [-0.24, 0.18, -0.255, 0.29, -0.235, 0.32],
    [-0.17, 0.33, -0.08, 0.24, 0.0, 0.23],
    [0.35, 0.30, 0.70, 0.44, 1.01, 0.50],
    [1.11, 0.47, 1.22, 0.43, 1.31, 0.43],
    [1.30, 0.53, 1.29, 0.65, 1.35, 0.70],
    [1.47, 0.62, 1.62, 0.57, 1.70, 0.61],
    [1.80, 0.66, 1.88, 0.76, 1.95, 0.84]
  ] });
  var now = document.getElementById('cvhNow'), role = now && now.querySelector('.cvh-now-role');
  if (role) hoverLine({ trigger: now, host: now, ref: role, z: -1, seg: [
    [-0.02, 1.18],
    [0.30, 1.06, 0.62, 1.30, 0.96, 1.12],
    [1.10, 1.05, 1.16, 0.86, 1.09, 0.80],
    [1.02, 0.76, 1.00, 0.96, 1.14, 1.02],
    [1.24, 1.06, 1.32, 1.00, 1.40, 0.90]
  ] });

  // --- story: pinned section with three scenes ---
  var story = document.getElementById('cvStory');
  if (!story) return;
  if (REDUCED || !CLIP_OK) {
    story.classList.add('is-static');
    return;
  }

  var scenes = Array.prototype.slice.call(story.querySelectorAll('.cvs-scene'));
  var inners = scenes.map(function (s) { return s.querySelector('.cvs-inner'); });
  var tools = inners[1], toolTitle = tools.querySelector('.cvs-title');
  var icons = Array.prototype.slice.call(tools.querySelectorAll('.cvs-i3d'));
  var loveTitle = inners[2].querySelector('.cvs-title');
  var stickers = Array.prototype.slice.call(inners[2].querySelectorAll('.cvs-sticker'));
  var intro = inners[0].querySelector('.cvs-big');
  intro.setAttribute('aria-label', intro.textContent);
  intro.innerHTML = intro.textContent.split(' ').map(function (w) { return '<span class="cvs-word" aria-hidden="true">' + w + '</span>'; }).join(' ');
  var words = Array.prototype.slice.call(intro.querySelectorAll('.cvs-word'));

  var SCRIB = {
    design: [['M2 16C20 4 40 18 58 8C72 1 86 12 99 4', 's-thick'], ['M8 21C26 12 46 23 62 15', 's-thin'], ['M-2 30L-11 24M-4 42L-15 42M-2 54L-11 60', 's-thin']],
    world: [['M50 4C76 4 96 24 96 50C96 76 76 96 50 96C24 96 4 76 4 50C4 27 21 7 44 4L58 6', 's-thick'],
            ['M50 5C33 19 29 36 29 50C29 66 35 82 50 95C65 82 71 66 71 50C71 36 65 19 50 5', 's-thin'],
            ['M5 50C30 57 70 57 95 50', 's-thin'], ['M13 28C36 33 64 33 87 28', 's-thin'], ['M13 72C36 67 64 67 87 72', 's-thin']]
  };
  function scribbleSvg(mod) {
    var globe = mod === 'world';
    return '<svg class="story-scribble story-scribble--' + (globe ? 'globe' : mod) + '" viewBox="0 0 100 100" preserveAspectRatio="' + (globe ? 'xMidYMid meet' : 'none') + '" aria-hidden="true"><g filter="url(#scribbleRough)">' +
      SCRIB[mod].map(function (p) { return '<path class="' + p[1] + '" d="' + p[0] + '"/>'; }).join('') + '</g></svg>';
  }
  var marked = {};
  words.forEach(function (w) {
    var t = w.textContent.toLowerCase().replace(/[^a-z]/g, '');
    if ((t === 'design' || t === 'world') && !marked[t]) { marked[t] = true; w.classList.add('story-mark', 'story-mark--' + t); w.insertAdjacentHTML('beforeend', scribbleSvg(t)); }
  });
  var scr = {
    design: Array.prototype.slice.call(intro.querySelectorAll('.story-scribble--design path')),
    world: Array.prototype.slice.call(intro.querySelectorAll('.story-scribble--globe path'))
  };
  function measureScribbles() { Object.keys(scr).forEach(function (k) { scribbleMeasure(scr[k]); }); }

  // timeline in "screens" of scrolling
  var W0 = PHONE ? -0.25 : 0.06, WS = 0.09, WD = 0.32;
  var WEND = W0 + (words.length - 1) * WS + WD;
  var IOUT = PHONE ? [WEND + 0.5, WEND + 0.8] : [WEND + 1.6, WEND + 1.9];
  var C0 = IOUT[1] + (PHONE ? 0.9 : 1.8), CS = 0.14;
  var CEND = C0 + icons.length * CS + (PHONE ? 0.7 : 1.6);
  var TOUT = [CEND + 0.35, CEND + 0.75];
  var L0 = TOUT[1] + 0.4, LS = 0.2;
  var timeline = [
    { el: inners[0], scene: scenes[0], inn: null, out: IOUT },
    { el: toolTitle, scene: scenes[1], inn: [C0 - 0.4, C0 - 0.1], out: null },
    { el: loveTitle, scene: scenes[2], inn: [L0 - 0.35, L0 - 0.05], out: null }
  ];
  stickers.forEach(function (s, i) {
    var a = L0 + i * LS;
    timeline.push({ el: s, inn: [a, a + 0.2], out: null });
  });
  var Q = L0 + stickers.length * LS + 0.4;
  var STEP = PHONE ? 0.42 : 0.6;
  function spanQ(q, a, b) { return c01((q - a) / (b - a)); }
  function renderScribbles(q) {
    var outI = 1 - spanQ(q, IOUT[0] - 0.22, IOUT[0]);
    [['design', spanQ(q, WEND - 0.05, WEND + 0.3) * outI], ['world', spanQ(q, WEND + 0.2, WEND + 0.55) * outI]]
      .forEach(function (g) { var ps = scr[g[0]]; if (!ps.length) return; if (!ps[0]._len) scribbleMeasure(ps); scribbleDraw(ps, g[1]); });
  }
  if (PHONE) story.classList.add('is-phone');
  else {
    timeline.forEach(function (t) { t.el.classList.add('cvs-clip'); });
    story.classList.add('is-live');
  }

  var stInst = null;
  // background dots: drifting stars -> spinning galaxy -> waves
  var bg = PHONE ? null : (function () {
    var cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    cv.className = 'cv-bgfx'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#FFFFFF';
    var N = 1000, W = 0, H = 0, VH = 0, dpr = 1, P = null, raf = 0, storyTop = 0;
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 }, GR = 1;
    function build() {
      W = window.innerWidth; H = PHONE ? (cv.clientHeight || window.innerHeight) : window.innerHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      VH = window.innerHeight;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      storyTop = (stInst && typeof stInst.start === 'number') ? stInst.start : story.getBoundingClientRect().top + window.scrollY;
      var cx = W / 2, cy = H / 2 + 10, i;
      GR = Math.min(W * 0.44, H * 0.6);
      var LINES = 7, per = Math.ceil(N / LINES);
      P = [];
      for (i = 0; i < N; i++) {
        var z = 0.18 + Math.pow(pxRand(i, 4), 2.2) * 0.82;
        var line = i % LINES, k = Math.floor(i / LINES);
        var ang = pxRand(i, 5) * 6.283, rad = Math.pow(pxRand(i, 6), 2) * 22;
        P.push({
          x: pxRand(i, 1) * W, y: pxRand(i, 2) * H, z: z,
          s: z > 0.82 ? 3 : z > 0.5 ? 2 : 1, a: 0.1 + z * 0.55,
          ph: pxRand(i, 9) * 6.283, sp: 0.5 + pxRand(i, 17),
          sx: cx + Math.cos(ang) * rad, sy: cy + Math.sin(ang) * rad,
          gr: GR * (0.03 + Math.pow(pxRand(i, 31), 0.85) * 0.97),
          garm: pxRand(i, 33) < 0.5 ? 0 : Math.PI,
          gj: (pxRand(i, 35) - 0.5) * 0.55,
          gh: (pxRand(i, 37) - 0.5) * 0.12,
          wl: line, wx: ((k + 0.5) / per) * W
        });
      }
    }
    function wave(p, time) {
      var base = H * 0.2 + p.wl * (H * 0.62 / 6), env = Math.sin(Math.PI * c01(p.wx / W));
      var amp = (10 + p.wl * 3) * env;
      return base + Math.sin(p.wx * 0.007 + time * 0.0011 * (1 + p.wl * 0.08) + p.wl * 0.9) * amp
                  + Math.sin(p.wx * 0.017 - time * 0.0007) * amp * 0.35;
    }
    function frame(now) {
      raf = 0;
      if (!P) build();
      var sy = window.scrollY, U = VH * STEP;
      var q = (sy - storyTop) / U;
      var fade = c01(1 - (q - Q) / 0.9);
      mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (fade <= 0) { schedule(sy); return; }
      ctx.fillStyle = ink;
      var cx = W / 2, cy = H / 2 + 10;
      var tC = c01((q - IOUT[0]) / (C0 - 0.2 - IOUT[0]));
      var tG = c01((q - (C0 - 0.2)) / 1.8);
      var tW = c01((q - TOUT[0]) / (L0 + 0.4 - TOUT[0]));
      var spin = now * 0.00006 + (q - C0 + 2.55) * 0.35, TILT = 0.48;
      for (var i = 0; i < N; i++) {
        var p = P[i], x, y, a, s;
        var ux = p.x + Math.sin(now * 0.00011 * p.sp + p.ph) * 7 + mouse.x * p.z * 18;
        var uy = (((p.y - sy * 0.28 * p.z) % H) + H) % H + mouse.y * p.z * 12;
        var tw = 0.72 + 0.28 * Math.sin(now * 0.0016 * p.sp + p.ph);
        x = ux; y = uy; a = p.a * tw; s = p.s;
        if (tC > 0) {
          var uc = c01((tC - p.z * 0.25) / 0.75), kc = uc < 0.5 ? 4 * uc * uc * uc : 1 - Math.pow(-2 * uc + 2, 3) / 2;
          var dx = x - cx, dy = y - cy, r0 = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx);
          var rr = r0 * Math.pow(1 - kc, 1.4), aa = a0 + kc * 2.4;
          x = cx + Math.cos(aa) * rr + (p.sx - cx) * kc; y = cy + Math.sin(aa) * rr + (p.sy - cy) * kc;
          a = a + (0.85 - a) * kc; s = kc > 0.6 ? 2 : s;
        }
        if (tG > 0) {
          var rn = p.gr / GR, kg = easeOut(c01((tG - rn * 0.55) / 0.45));
          var th = p.garm + rn * 5.2 + p.gj * (0.35 + rn) + spin * (1.6 - rn);
          var gx3 = Math.cos(th) * p.gr, gz3 = Math.sin(th) * p.gr;
          var depth = gz3 / GR;
          var gxS = cx + gx3, gyS = cy + 30 + gz3 * TILT + p.gh * GR * 0.25;
          x = x + (gxS - x) * kg; y = y + (gyS - y) * kg;
          var core = Math.max(0, 1 - rn * 3) * 0.35;
          a = a + (0.22 + (depth + 1) * 0.2 + core - a) * kg;
          s = depth > 0.35 ? 2 : (kg > 0.5 ? 1 : s);
        }
        if (tW > 0 && PHONE) a *= 1 - easeOut(c01(tW * 2.5));
        else if (tW > 0) {
          var kw = easeOut(c01((tW - (p.wx / W) * 0.5) / 0.5));
          var wy = wave(p, now);
          var mdx = p.wx - (mouse.x + 0.5) * W, mdy = (mouse.y + 0.5) * H - wy;
          var pull = Math.exp(-mdx * mdx / 16200) * Math.max(0, 1 - Math.abs(mdy) / 90);
          wy += mdy * pull * 0.22;
          x = x + (p.wx - x) * kw; y = y + (wy - y) * kw;
          a = a + (0.4 + pull * 0.35 - a) * kw;
        }
        ctx.globalAlpha = a * fade;
        ctx.fillRect(Math.round(x), Math.round(y), s, s);
      }
      ctx.globalAlpha = 1;
      schedule(sy);
    }
    function schedule(sy) {
      var end = storyTop + (Q + 1) * VH * STEP;
      if (sy < end && !document.hidden) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', function () { P = null; kick(); });
    document.addEventListener('visibilitychange', kick);
    window.addEventListener('mousemove', function (e) {
      mouse.tx = (e.clientX / window.innerWidth - 0.5); mouse.ty = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });
    kick();
    return { rebuild: function () { P = null; kick(); } };
  })();

  function measureAll() {
    var sceneB = Math.round(Math.max(12, Math.min(24, window.innerWidth * 0.014)));
    timeline.forEach(function (t) {
      var isText = t.el.classList.contains('cvs-wide') || t.el === toolTitle || t.el === loveTitle;
      var wide = t.el === inners[0];
      measure(t.el, isText ? 0 : wide ? sceneB : Math.max(6, Math.round(sceneB * 0.6)));
      t.el._key = null;
    });
  }

  var lastQ = 0, holdStickers = 0;
  function renderDeck(q) {
    icons.forEach(function (ic, i) {
      var k = c01((q - (C0 + i * CS)) / 0.26);
      var back = k < 1 ? 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2) : 1;
      ic.style.setProperty('--pop', easeOut(k).toFixed(3));
      ic.style.setProperty('--popS', back.toFixed(3));
      ic.style.setProperty('--flip', ((1 - easeOut(k)) * -180).toFixed(1) + 'deg');
    });
  }
  function render(q) {
    lastQ = q;
    if (PHONE) return;
    renderDeck(q);
    renderScribbles(q);
    var hold = performance.now() < holdStickers;
    timeline.forEach(function (t) {
      var c = 1, mode = 'build';
      if (hold && t.el.classList.contains('cvs-sticker')) { if (t.el._key !== 'hold') { t.el._key = 'hold'; pxClip(t.el, 1, 'build'); } return; }
      if (t.inn && q < t.inn[1]) c = c01((q - t.inn[0]) / (t.inn[1] - t.inn[0]));
      else if (t.out && q > t.out[0]) { c = 1 - c01((q - t.out[0]) / (t.out[1] - t.out[0])); mode = 'dissolve'; }
      var key = mode + (Math.round(c * 200) / 200);
      if (t.el._key !== key) { t.el._key = key; pxClip(t.el, c, mode); }
      if (t.scene) t.scene.classList.toggle('is-active', c > 0.5);
    });
    var e = easeOut(c01((q - TOUT[0]) / (TOUT[1] - TOUT[0])));
    tools.style.transform = e ? 'translateY(' + (-70 * e).toFixed(1) + 'px)' : '';
    tools.style.opacity = e ? (1 - e).toFixed(3) : '';
    scenes[1].classList.toggle('is-active', q >= C0 - 0.25 && e < 0.5);
    words.forEach(function (w, i) {
      var k = easeOut(c01((q - (W0 + i * WS)) / WD));
      w.style.opacity = k.toFixed(3);
      w.style.transform = k < 1 ? 'translateY(' + ((1 - k) * 0.45).toFixed(3) + 'em)' : '';
    });
  }
  function refresh() { measureAll(); measureScribbles(); render(lastQ); if (bg) bg.rebuild(); }

  var LAYERS = PHONE ? 1 : 9;
  icons.forEach(function (ic) {
    var body = ic.querySelector('.cvs-i3d-body'), img = body.querySelector('img');
    var depth = parseFloat(ic.style.getPropertyValue('--k')) || 1;
    img.style.transform = 'translateZ(0px)';
    for (var l = 1; l < LAYERS; l++) {
      var c = img.cloneNode(); c.setAttribute('aria-hidden', 'true');
      c.style.transform = 'translateZ(' + (-l * 2.3 * depth * Math.max(1, body.offsetWidth / 70)).toFixed(1) + 'px)';
      c.style.filter = 'brightness(' + (0.62 - l * 0.035).toFixed(2) + ')';
      body.insertBefore(c, img);
    }
  });
  icons.forEach(function (ic) {
    ic.addEventListener('mouseenter', function () { if (!REDUCED && !ic.classList.contains('is-spin')) ic.classList.add('is-spin'); });
    ic.addEventListener('animationend', function (e) { if (e.animationName === 'cvs-spin') ic.classList.remove('is-spin'); });
  });

  measureAll(); measureScribbles(); render(0);
  document.fonts.ready.then(function () { measureScribbles(); render(lastQ); });
  // passions fall into a small 2d physics playground below the story
  var play = (function () {
    var area = document.getElementById('cvPlay');
    var noop = { drop: function () {}, reset: function () {} };
    if (!area) return noop;
    var G = 2600, SUB = 3, ITER = 10, MU = 0.55, BOUNCE = 0.18, SLOP = 0.6, BETA = 0.22;
    var bodies = [], walls = [], held = null, raf = 0, calm = 0, visible = true, dropped = false, flights = [], fraf = 0;
    var W = 0, H = 0, pointer = { x: 0, y: 0, cx: 0, cy: 0 };

    function body(x, y, w, h, a, isStatic) {
      var m = isStatic ? 0 : w * h * 0.001;
      return { x: x, y: y, a: a || 0, vx: 0, vy: 0, w: 0, hw: w / 2, hh: h / 2,
               im: isStatic ? 0 : 1 / m, iI: isStatic ? 0 : 1 / (m * (w * w + h * h) / 12), m: m };
    }
    function verts(b) {
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
    function maxSep(va, na, vb) {
      var best = -Infinity, idx = 0;
      for (var i = 0; i < 4; i++) {
        var mn = Infinity;
        for (var j = 0; j < 4; j++) mn = Math.min(mn, na[i].x * (vb[j].x - va[i].x) + na[i].y * (vb[j].y - va[i].y));
        if (mn > best) { best = mn; idx = i; }
      }
      return { s: best, i: idx };
    }
    function clip(p1, p2, nx, ny, off) {
      var d1 = nx * p1.x + ny * p1.y - off, d2 = nx * p2.x + ny * p2.y - off, out = [];
      if (d1 <= 0) out.push(p1);
      if (d2 <= 0) out.push(p2);
      if (d1 * d2 < 0) { var k = d1 / (d1 - d2); out.push({ x: p1.x + (p2.x - p1.x) * k, y: p1.y + (p2.y - p1.y) * k }); }
      return out;
    }
    // box vs box (separating axis + clipping), good enough for a few pills
    function collide(A, B) {
      var va = verts(A), vb = verts(B), na = normals(va), nb = normals(vb);
      var sa = maxSep(va, na, vb); if (sa.s > 0) return null;
      var sb = maxSep(vb, nb, va); if (sb.s > 0) return null;
      var flip = sb.s > sa.s + 0.1;
      var R = flip ? vb : va, RN = flip ? nb : na, I = flip ? va : vb, IN = flip ? na : nb, ri = flip ? sb.i : sa.i;
      var n = RN[ri], v1 = R[ri], v2 = R[(ri + 1) % 4];
      var ii = 0, md = Infinity;
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
      if (vn < -120) bias = Math.max(bias, -BOUNCE * vn);
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
    function drag(b, dt) {
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
      if (calm < 45) raf = requestAnimationFrame(frame);
    }
    function wake() { calm = 0; if (!raf) raf = requestAnimationFrame(frame); }
    function buildWalls() {
      W = area.clientWidth; H = area.clientHeight;
      walls = [body(W / 2, H + 50, W + 400, 100, 0, true),
               body(-50, H - 3000, 100, 6000, 0, true),
               body(W + 50, H - 3000, 100, 6000, 0, true)];
    }
    function toArea(clientX, clientY) { var r = area.getBoundingClientRect(); return { x: clientX - r.left, y: clientY - r.top }; }

    function drop() {
      if (dropped) return;
      finishFlights();
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
        b.el = el; b.src = s; b.vx = (Math.random() - 0.5) * 60; b.w = (Math.random() - 0.5) * 1.2;
        el._b = b;
        bodies.push(b);
        s.classList.add('is-dropped');
      });
      draw(); wake();
    }
    function reset() {
      if (!dropped) return;
      dropped = false; held = null;
      var now = performance.now();
      bodies.forEach(function (b, i) {
        b.el.classList.remove('is-held');
        flights.push({ b: b, x0: b.x, y0: b.y, a0: b.a, t0: now + i * 40, dur: 820 });
      });
      bodies = [];
      if (!fraf) fraf = requestAnimationFrame(fly);
      var until = now + Math.max(0, flights.length - 1) * 40 + 820 + 380;
      holdStickers = until;
      if (stInst) {
        var target = stInst.start + (Q - 0.25) * STEP * window.innerHeight;
        lenis.scrollTo(target, { duration: 0.6, lock: true, force: true, easing: function (t) { return 1 - Math.pow(1 - t, 3); },
          onComplete: function () { lenis.stop(); setTimeout(function () { lenis.start(); }, Math.max(0, until - performance.now())); } });
      }
      render(lastQ);
      setTimeout(function () { render(lastQ); }, until - performance.now() + 20);
    }
    function fly(now) {
      fraf = 0;
      var ar = area.getBoundingClientRect();
      flights = flights.filter(function (f) {
        var k = c01((now - f.t0) / f.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        var sr = f.b.src.getBoundingClientRect();
        var tx = sr.left + sr.width / 2 - ar.left, ty = sr.top + sr.height / 2 - ar.top;
        var ta = (parseFloat(f.b.src.style.getPropertyValue('--r')) || 0) * Math.PI / 180;
        var da = ta - f.a0; da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        var x = f.x0 + (tx - f.x0) * e, y = f.y0 + (ty - f.y0) * e - Math.sin(k * Math.PI) * 90;
        var a = f.a0 + da * e, b = f.b;
        b.el.style.transform = 'translate(' + (x - b.hw).toFixed(1) + 'px,' + (y - b.hh).toFixed(1) + 'px) rotate(' + a.toFixed(4) + 'rad)';
        if (k >= 1) { b.el.remove(); b.src.classList.remove('is-dropped'); return false; }
        return true;
      });
      if (flights.length) fraf = requestAnimationFrame(fly);
    }
    function finishFlights() {
      flights.forEach(function (f) { f.b.el.remove(); f.b.src.classList.remove('is-dropped'); });
      flights = [];
    }

    area.addEventListener('pointerdown', function (e) {
      var el = e.target.closest('.cvp-pill'); if (!el) return;
      e.preventDefault();
      var b = el._b, p = toArea(e.clientX, e.clientY), c = Math.cos(-b.a), s = Math.sin(-b.a);
      var dx = p.x - b.x, dy = p.y - b.y;
      b.lx = dx * c - dy * s; b.ly = dx * s + dy * c;
      pointer.x = p.x; pointer.y = p.y; pointer.cx = e.clientX; pointer.cy = e.clientY;
      held = b; el.classList.add('is-held');
      el.setPointerCapture(e.pointerId);
      wake();
    });
    window.addEventListener('pointermove', function (e) {
      if (!held) return;
      pointer.cx = e.clientX; pointer.cy = e.clientY;
      var p = toArea(e.clientX, e.clientY); pointer.x = p.x; pointer.y = p.y;
      wake();
    });
    window.addEventListener('scroll', function () {
      if (!held) return;
      var p = toArea(pointer.cx, pointer.cy); pointer.x = p.x; pointer.y = p.y;
    }, { passive: true });
    function release() { if (!held) return; held.el.classList.remove('is-held'); held = null; wake(); }
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    window.addEventListener('resize', function () { if (dropped) { buildWalls(); wake(); } });
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible && dropped) wake(); }).observe(area);
    return { drop: drop, reset: reset };
  })();
  stInst = PHONE ? null : ScrollTrigger.create({
    trigger: story,
    start: 'top top',
    end: '+=' + Math.round(Q * STEP * 100) + '%',
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: function (self) { render(self.progress * Q); },
    onRefresh: refresh
  });
  document.fonts.ready.then(function () { refresh(); ScrollTrigger.refresh(); });

  var playArea = document.getElementById('cvPlay');
  function checkDrop() {
    if (!playArea) return;
    var top = playArea.getBoundingClientRect().top, vh = window.innerHeight;
    if (top < vh * 0.5) play.drop();
    else if (top > vh * 0.8) play.reset();
  }
  window.addEventListener('scroll', checkDrop, { passive: true });
  setTimeout(checkDrop, 0);
})();
