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
    'projects.html': { name: 'Projects', code: 'A—02', order: 1 },
    'cv.html':       { name: 'CV',       code: 'A—03', order: 2 },
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

  function buildPanel(m) {
    const p = document.createElement('div');
    p.id = 'ainoPanel';
    p.innerHTML =
      '<span class="aino-meta aino-tl">JCKY&#8202;&#169;</span>' +
      '<div class="aino-center">' +
        '<span class="aino-code">' + m.code + '</span>' +
        '<span class="aino-clip"><span class="aino-name-inner">' + m.name + '</span></span>' +
      '</div>' +
      '<span class="aino-meta aino-br">Salzburg, AT</span>';
    document.documentElement.appendChild(p);
    return p;
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
    const from = dir === 'back' ? '-101%' : '101%';

    if (reduceMotion) {
      p.style.transform = 'translateY(0)';
      anim(p, [{ opacity: 0 }, { opacity: 1 }], { duration: 200 }).finished.then(go);
      return;
    }

    const nameInner = p.querySelector('.aino-name-inner');
    const code = p.querySelector('.aino-code');
    nameInner.style.transform = 'translateY(110%)';
    code.style.opacity = '0';

    const panelAnim = anim(p, [{ transform: 'translateY(' + from + ')' }, { transform: 'translateY(0%)' }], { duration: DUR, easing: EASE });
    setTimeout(() => {
      anim(nameInner, [{ transform: 'translateY(110%)' }, { transform: 'translateY(0%)' }], { duration: 520, easing: EASE });
      anim(code, [{ opacity: 0 }, { opacity: 1 }], { duration: 460, easing: 'ease-out' });
    }, DUR * 0.22);
    panelAnim.finished.then(() => setTimeout(go, 110));
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
      if (p && p.parentNode) p.parentNode.removeChild(p);
      document.documentElement.classList.remove('vt-arriving');
      try { if (typeof lenis !== 'undefined' && lenis && lenis.start) lenis.start(); } catch (_) {}
    };

    const start = () => {
      const p = buildPanel(metaFor(location.href));
      p.style.transform = 'translateY(0%)'; // deckt bereits
      const to = dir === 'back' ? '101%' : '-101%';
      const nameInner = p.querySelector('.aino-name-inner');

      if (reduceMotion) {
        document.documentElement.classList.remove('vt-arriving');
        anim(p, [{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).finished.then(() => cleanup(p));
        return;
      }
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('vt-arriving');
        setTimeout(() => {
          anim(nameInner, [{ transform: 'translateY(0%)' }, { transform: 'translateY(-110%)' }], { duration: DUR * 0.8, easing: EASE });
          anim(p, [{ transform: 'translateY(0%)' }, { transform: 'translateY(' + to + ')' }], { duration: DUR, easing: EASE }).finished.then(() => cleanup(p));
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
   NAV — Click to scroll via Lenis
============================ */
document.querySelectorAll('.nav-link-1820[data-section], a[href^="#"]').forEach(link => {
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
   ALL PROJECTS CTA — radiale Füllung ab Cursor-Eintritt
============================ */
(function initProjectsCta() {
  document.querySelectorAll('.projects-cta, .globe-contact-item').forEach((btn) => {
    function setOrigin(e) {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      btn.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    }
    btn.addEventListener('mouseenter', setOrigin);
    btn.addEventListener('mouseleave', setOrigin);
  });
})();

/* ============================
   CONTACT LINKS — Adresse entschlüsselt sich beim Hover (Decode)
   Mono → keine Layout-Verschiebung; Strukturzeichen (@ . / -) bleiben stehen.
============================ */
(function initContactDecode() {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const KEEP  = { '@': 1, '.': 1, '/': 1, '-': 1, '_': 1, ' ': 1 };
  const DUR = 700;

  function run(el) {
    const target = el.dataset.text || el.textContent.trim();
    if (reduce) { el.textContent = target; return; }
    cancelAnimationFrame(el._raf || 0);
    const n = target.length;
    const start = performance.now();
    function tick(now) {
      const p = Math.min(1, (now - start) / DUR);
      let out = '';
      for (let i = 0; i < n; i++) {
        const ch = target[i];
        if (KEEP[ch]) { out += ch; continue; }
        const thr = 0.10 + (i / n) * 0.7;
        out += p >= thr ? ch : CHARS[(Math.random() * CHARS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(tick);
      else el.textContent = target;
    }
    el._raf = requestAnimationFrame(tick);
  }

  document.querySelectorAll('.globe-contact-item').forEach((item) => {
    const val = item.querySelector('.gc-value');
    if (!val) return;
    val.dataset.text = val.textContent.trim();
    item.addEventListener('mouseenter', () => run(val));
  });
})();

/* ============================
   PLAY CURSOR — Hero-Bild im Vollbild
   Kreisrunder Cursor mit Play-Icon, nur wenn das Bild Vollbild ist und
   man drüber hovert. Blendet in dem Zustand den Dot-Trail aus.
============================ */
(function initPlayCursor() {
  const card = document.getElementById('heroImgCard');
  if (!card) return;
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  if (!fine) return;

  const cur = document.createElement('div');
  cur.id = 'playCursor';
  cur.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  document.body.appendChild(cur);

  let overCard = false;
  let cx = window.innerWidth / 2, cy = window.innerHeight / 2;

  card.addEventListener('mouseenter', () => { overCard = true; });
  card.addEventListener('mouseleave', () => { overCard = false; });

  window.addEventListener('mousemove', (e) => {
    cx = e.clientX; cy = e.clientY;
  }, { passive: true });

  function active() { return overCard && window.__heroFullscreen === true; }

  (function loop() {
    requestAnimationFrame(loop);
    const on = active();
    cur.classList.toggle('is-visible', on);
    window.__playCursorActive = on;   // vom Trail gelesen → Trail aus, wenn Play-Cursor an
    if (on) {
      cur.style.transform = 'translate(' + cx + 'px,' + cy + 'px) scale(1)';
    }
  })();
})();

/* ============================
   CURSOR DOT TRAIL
   Festes Punktraster (Halbton): jeder Punkt hat eine fixe xy-Position und
   blendet über ein Hitze-Feld je nach Cursor-Nähe auf/ab — kein Drift, kein Spray.
   Canvas, Vanilla; nur bei feinem Zeiger.
============================ */
(function initDotTrail() {
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!fine || reduce) return;

  const COLOR  = '240,237,232';  // --ink
  const GRID   = 7;              // Rasterabstand (px) — kleiner = dichter
  const DOT    = 1.9;            // Punktgröße (px)

  /* Zwei Zonen: enger, sehr dichter Kern + lockerer Halo drumherum */
  const CORE_R   = 27;           // Kernradius (eng, sehr dicht)
  const CORE_SIG = 16;           // Kern-Weichheit
  const CORE_ADD = 2.2;          // Kern-Hitze (hoch → praktisch voll)
  const HALO_R   = 70;           // Halo-Radius (weit, locker)
  const HALO_SIG = 48;           // Halo-Weichheit
  const HALO_ADD = 0.55;         // Halo-Hitze (niedrig → spärlich)

  const DECAY  = 0.972;          // Abkling-Faktor pro Frame → Schweif bleibt länger sichtbar
  const TAPER  = 0.06;           // schwache Punkte klingen etwas schneller → Schweif läuft spitz zu
  const TAIL_LEN = 3.2;          // Länge der Spitze in Radius-Einheiten (größer = spitzer/länger)
  const MAXA   = 0.98;           // maximale Punkt-Deckkraft
  const THRESH_MAX = 0.9;        // Streuung der Dither-Schwelle → starkes Ausdünnen nach außen

  /* Physik: Wolke schleppt beim schnellen Wischen in Gegenrichtung nach */
  const STRETCH = 0.9;           // wie stark die Geschwindigkeit den Schweif streckt
  const MAX_STRETCH = 2.4;       // Deckel der Streckung

  /* Wellen-Feld wie beim Globe/ASCII-Hintergrund: mehrere wandernde Sinus-Wellen,
     die die Dichte pro Frame modulieren → lebendige, wogende Bewegung statt starr. */
  const WAVE_AMP = 0.8;          // Stärke der Wellen-Modulation (deutlich sichtbar)
  const WAVE_SPEED = 1.4;        // Zeittempo
  const waves = [];
  for (let i = 0; i < 4; i++) {
    waves.push({
      dirx: Math.cos((i / 4) * Math.PI * 2 + Math.random()),
      diry: Math.sin((i / 4) * Math.PI * 2 + Math.random()),
      freq: 0.045 + Math.random() * 0.045,     // kurze Wellen → mehrere Bänder in der Wolke
      amp:  0.6 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.9,
    });
  }
  let waveT = 0;

  const canvas = document.createElement('canvas');
  canvas.id = 'dotTrail';
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9997;';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let cols, rows, heat, jitter, R;

  function hash(i) { let h = (i * 2654435761) >>> 0; h ^= h >>> 15; return (h >>> 0) / 4294967296; }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(window.innerWidth / GRID) + 1;
    rows = Math.ceil(window.innerHeight / GRID) + 1;
    heat = new Float32Array(cols * rows);
    jitter = new Float32Array(cols * rows);
    for (let i = 0; i < jitter.length; i++) jitter[i] = 0.03 + hash(i) * THRESH_MAX; // breite feste Schwelle je Zelle → Dichte nach Hitze/Distanz
    R = Math.ceil((HALO_R * MAX_STRETCH) / GRID);  // Iterationsradius nach größtem möglichen Stamp
  }
  resize();
  window.addEventListener('resize', resize);

  const CORE_2S = 2 * CORE_SIG * CORE_SIG;
  const HALO_2S = 2 * HALO_SIG * HALO_SIG;

  /* Layer-Umschichtung: während die Parallax-Bilder sichtbar sind, liegt der
     Trail IM Hero unter den Bildern (z-index 2, über dem Hintergrund); sonst
     wieder auf <body> ganz oben (z-index 9997). */
  const heroEl = document.getElementById('hero');
  let layered = false;
  function updateLayer() {
    const want = !!window.__heroPhotos && !!heroEl;
    if (want === layered) return;
    layered = want;
    if (layered) { heroEl.appendChild(canvas); canvas.style.zIndex = '2'; }
    else { document.body.appendChild(canvas); canvas.style.zIndex = '9997'; }
  }

  /* Trail läuft, bis man UNTER dem "All Projects"-Button ist;
     bestehende Spur klingt dann sanft aus (kein hartes Leeren) */
  let off = false;
  var stopEl = document.getElementById('svcFlipBtn');

  /* Trail zusätzlich aus, sobald man über etwas Interaktives hovert
     (Buttons, Nav-Links, Links, Kontakt-Links bei "Find me here") */
  let hoverOff = false;
  const INTERACTIVE = 'a, button, .hero-btn, .projects-cta, .nav-link-1820, .globe-contact-item, [role="button"]';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest && e.target.closest(INTERACTIVE)) hoverOff = true;
  }, { passive: true });
  document.addEventListener('mouseout', (e) => {
    // nur zurücksetzen, wenn wir das interaktive Element wirklich verlassen
    const to = e.relatedTarget;
    if (!to || !(to.closest && to.closest(INTERACTIVE))) hoverOff = false;
  }, { passive: true });

  /* Ein Zonen-Stamp mit optionaler elliptischer Streckung entlang (ux,uy):
     Distanzen werden längs der Bewegungsachse gestaucht → die Wolke wird in
     Bewegungsrichtung gestreckt (Physik-Schleppe). str = Streckfaktor (1 = rund). */
  function stampZone(px, py, radius, twoSig2, add, ux, uy, str) {
    const back = radius * TAIL_LEN;              // wie weit die Spitze nach hinten reicht
    const rCells = Math.ceil(Math.max(radius, back) * str / GRID) + 1;
    const cgx = Math.round(px / GRID), cgy = Math.round(py / GRID);
    const invStr = 1 / str;
    const r2 = radius * radius;
    for (let gy = cgy - rCells; gy <= cgy + rCells; gy++) {
      if (gy < 0 || gy >= rows) continue;
      for (let gx = cgx - rCells; gx <= cgx + rCells; gx++) {
        if (gx < 0 || gx >= cols) continue;
        const wdx = gx * GRID - px, wdy = gy * GRID - py;
        let a = wdx * ux + wdy * uy;     // entlang der Bewegung (vorne +, hinten −)
        const p = -wdx * uy + wdy * ux;  // quer
        a *= invStr;                     // längs stauchen → visuelle Streckung
        if (a > radius) continue;        // vorderer Rand
        /* Tropfenform: hinten (a<0) verjüngt sich die Breite bis zur Spitze bei −back */
        let wr;
        if (a >= 0) { wr = radius; }
        else {
          const t = 1 + a / back;           // a ∈ [−back..0] → t ∈ [0..1]
          if (t <= 0) continue;             // jenseits der Spitze
          wr = radius * t * t;              // quadratisch → schlankerer, feinerer Auslauf
        }
        if (p > wr || p < -wr) continue;    // außerhalb der Tropfenkontur
        const d2 = a * a + p * p;
        if (a >= 0 && d2 > r2) continue;    // runder Kopf
        const idx = gy * cols + gx;
        const v = heat[idx] + add * Math.exp(-d2 / twoSig2);
        heat[idx] = v > 2.4 ? 2.4 : v;
      }
    }
  }

  function stamp(px, py, ux, uy, str) {
    stampZone(px, py, HALO_R, HALO_2S, HALO_ADD, ux, uy, str);   // lockerer Halo
    stampZone(px, py, CORE_R, CORE_2S, CORE_ADD, ux, uy, str);   // dichter Kern
  }

  let lastX = null, lastY = null;
  window.addEventListener('mousemove', (e) => {
    const x = e.clientX, y = e.clientY;
    if (off || hoverOff || window.__playCursorActive) { lastX = x; lastY = y; return; }
    if (lastX == null) { lastX = x; lastY = y; }
    const dx = x - lastX, dy = y - lastY;
    const dist = Math.hypot(dx, dy);
    // Bewegungsrichtung + Streckung aus Geschwindigkeit (Physik)
    const ux = dist > 0.001 ? dx / dist : 1;
    const uy = dist > 0.001 ? dy / dist : 0;
    const str = Math.min(MAX_STRETCH, 1 + (dist / 90) * STRETCH);
    const steps = Math.max(1, Math.min(10, Math.round(dist / GRID)));
    for (let s = 1; s <= steps; s++) stamp(lastX + dx * (s / steps), lastY + dy * (s / steps), ux, uy, str);
    lastX = x; lastY = y;
  }, { passive: true });

  function frame() {
    if (stopEl) off = stopEl.getBoundingClientRect().bottom < 0;  // unter dem "All Projects"-Button?
    updateLayer();
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    waveT += 0.016 * WAVE_SPEED;
    const half = DOT / 2;
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const idx = gy * cols + gx;
        let h = heat[idx];
        if (h <= 0.001) { heat[idx] = 0; continue; }
        /* schwache Punkte (Halo/Rand) klingen schneller ab als der helle Kern-Spine
           → hinter dem Cursor kollabiert die Breite, die Gesamtform läuft spitz zu */
        const hn = h > 2.4 ? 1 : h / 2.4;
        h *= (DECAY - (1 - hn) * TAPER);
        heat[idx] = h;
        if (h < jitter[idx]) continue;               // Dichte: nur Zellen, deren Schwelle unter der Hitze liegt
        /* wanderndes Wellen-Feld (wie Globe/Hintergrund): moduliert die HITZE selbst,
           damit die Bewegung durch die ganze Wolke wandert — auch im dichten Kern */
        const px = gx * GRID, py = gy * GRID;
        let w = 0;
        for (let k = 0; k < waves.length; k++) {
          const wv = waves[k];
          w += Math.sin((px * wv.dirx + py * wv.diry) * wv.freq - waveT * wv.speed + wv.phase) * wv.amp;
        }
        const wn = w / waves.length;                 // ~[-1..1]
        if (h < jitter[idx]) continue;               // Dichte/Form: Zonen + Physik bleiben aus der Hitze
        /* Helligkeit kommt aus dem WELLEN-Feld (wie Globe): jeder Punkt pulsiert mit
           den wandernden Wellen — auch der dichte Kern, nicht nur der Rand. */
        const wave01 = 0.5 + 0.5 * (wn > 1 ? 1 : wn < -1 ? -1 : wn); // 0..1
        const edge = h > 1 ? 1 : h;                  // Halo etwas dunkler als Kern
        const a = MAXA * (0.12 + 0.88 * wave01) * (0.55 + 0.45 * edge);
        ctx.fillStyle = 'rgba(' + COLOR + ',' + a.toFixed(3) + ')';
        ctx.fillRect(px - half, py - half, DOT, DOT);   // FIXE Rasterposition
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
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
    const targetW = document.documentElement.clientWidth / 3;
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
   HERO PARALLAX — Name + Rolle + eingeblendete Bilder folgen dem Cursor
   Professionell/subtil: mehrere Tiefen, geglättet. Bewegt den ÄUSSEREN Block
   (nicht das geclippte innere Element) → kein Abschneiden am Rand.
   Die mittlere Bild-/Video-Karte (#heroImgCard) bleibt bewusst ausgenommen.
============================ */
(function initHeroParallax() {
  const fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (!fine || reduce) return;

  const block = document.getElementById('heroTitleBlock');    // Name + Rolle zusammen (NICHT geclippt)
  const sub   = document.getElementById('heroSubtitleRow');   // Rolle bekommt etwas mehr Tiefe
  const photos = Array.prototype.slice.call(document.querySelectorAll('.hero-parallax-item'));
  const pdata = photos.map(function (el, i) {
    const f = (i % 4) / 3;                                     // 0..1 → gestaffelte Tiefe
    return { el: el, mx: 16 + f * 18, my: 12 + f * 14 };
  });

  let tx = 0, ty = 0, cx = 0, cy = 0;
  window.addEventListener('mousemove', (e) => {
    tx = (e.clientX / window.innerWidth  - 0.5);              // -0.5 .. 0.5
    ty = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  gsap.ticker.add(() => {
    cx += (tx - cx) * 0.075;                                  // geglättetes Nachlaufen
    cy += (ty - cy) * 0.075;

    /* Name/Rolle: nur oben aktiv, blendet beim Scrollen sanft aus */
    const gate = Math.max(0, Math.min(1, 1 - window.scrollY / (window.innerHeight * 0.5)));
    if (block) gsap.set(block, { x: -cx * 9  * gate, y: -cy * 6 * gate });
    if (sub)   gsap.set(sub,   { x: -cx * 11 * gate, y: -cy * 7 * gate });

    /* Eingeblendete Bilder: eigener Parallax (Sichtbarkeit steuert ihre opacity), Mittelkarte ausgenommen */
    for (let i = 0; i < pdata.length; i++) {
      gsap.set(pdata[i].el, { x: -cx * pdata[i].mx, y: -cy * pdata[i].my });
    }
  });
})();

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

  function measure() {
    gsap.set(roleEl, { opacity: 1, y: 0 });
    gsap.set(imgCard, { clearProps: 'transform' });
    gsap.set(imgCard, { xPercent: -50 });
    cardRect = imgCard.getBoundingClientRect();
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
    window.__heroPhotos = p >= 0.34 && p < 0.95;  // nur während die Parallax-Bilder sichtbar sind → Trail aus

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

    // Phase C — bottom sheet
    if (p < 0.80) {
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0)' });
    } else {
      const pC       = ph(p, 0.80, 1.00, eIO);
      const insetTop = c01(1 - pC) * 100;
      gsap.set(panel, { clipPath: `inset(${insetTop}% 0 0 0)` });
    }
  }

  function resetAll() {
    window.__heroPhotos = false;
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
  const links = [...document.querySelectorAll('.nav-link-1820[data-section]')];

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
   WHAT I DO — Hover interactions
============================ */
(function initServices() {
  const imgPanel = document.getElementById('svcImgPanel');
  const section  = document.querySelector('.services-section');
  const CHARS    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—';

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

  function scramble(el) {
    if (!el.dataset.orig) el.dataset.orig = el.textContent.trim();
    const orig = el.dataset.orig;
    clearInterval(el._slot);
    const eligible = [...orig].map((c,i) => c !== ' ' ? i : null).filter(i => i !== null);
    const pos = new Set(eligible.sort(() => Math.random()-0.5).slice(0, Math.min(3, Math.max(2, Math.floor(eligible.length*0.3)))));
    let f = 0, T = 10;
    el._slot = setInterval(() => {
      const chars = orig.split('');
      pos.forEach(i => { if (f < T-2) chars[i] = CHARS[Math.floor(Math.random()*CHARS.length)]; });
      el.textContent = chars.join('');
      if (++f >= T) { clearInterval(el._slot); el.textContent = orig; }
    }, 28);
  }

  function unscramble(el) {
    clearInterval(el._slot);
    if (el.dataset.orig) el.textContent = el.dataset.orig;
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
   GLOBE — Three.js
============================ */
(function initGlobeSection() {
  const container = document.getElementById('globeSectionCanvas');
  if (!container || typeof THREE === 'undefined') return;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;border-radius:50%;';

  function resize() {
    const s = container.offsetWidth || 520;
    renderer.setSize(s, s);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(container);

  scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const R     = 1.5;
  const globe = new THREE.Group();
  scene.add(globe);

  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x1a1714 })
  ));

  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.04, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x3a3028, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false })
  ));

  const RC = R + 0.008;
  const DOT_ROWS = 120;
  const ASCII_CHARS = '⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠘⠨⠊⠋⠌⠍⠎⠏⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛⠜⠝⠞⠟⠡⠢⠣⠤⠥⠦⠧⠩⠪⠫⠬⠭⠮⠯⠱⠲⠳⠴⠵⠶⠷⠹⠺⠻⠼⠽⠾⠿⡁⡂⡃⡄⡅⡆⡇⡉⡊⡋⡌⡍⡎⡏⡑⡒⡓⡔⡕⡖⡗⡙⡚⡛⡜⡝⡞⡟⡡⡢⡣⡤⡥⡦⡧⡩⡪⡫⡬⡭⡮⡯⡱⡲⡳⡴⡵⡶⡷⡹⡺⡻⡼⡽⡾⡿⢁⢂⢃⢄⢅⢆⢇⢉⢊⢋⢌⢍⢎⢏⢑⢒⢓⢔⢕⢖⢗⢙⢚⢛⢜⢝⢞⢟⢡⢢⢣⢤⢥⢦⢧⢩⢪⢫⢬⢭⢮⢯⢱⢲⢳⢴⢵⢶⢷⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣉⣊⣋⣌⣍⣎⣏⣑⣒⣓⣔⣕⣖⣗⣙⣚⣛⣜⣝⣞⣟⣡⣢⣣⣤⣥⣦⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿';

  const asciiCanvas = document.createElement('canvas');
  asciiCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;border-radius:50%;z-index:2;';
  container.style.position = 'relative';
  container.appendChild(asciiCanvas);
  const asciiCtx = asciiCanvas.getContext('2d');

  const landPoints = [];
  const asciiWaves = [];
  const numBgWaves = 4;
  for (let i = 0; i < numBgWaves; i++) {
    asciiWaves.push({
      x: 0.25 + Math.random() * 0.5,
      y: 0.25 + Math.random() * 0.5,
      frequency: 0.18 + Math.random() * 0.22,
      amplitude: 0.5 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.4,
    });
  }
  let asciiTime = 0;
  const asciiClickWaves = [];
  const asciiMouse = { x: 0.5, y: 0.5 };

  renderer.domElement.style.pointerEvents = 'auto';
  let globeHovered = false;
  renderer.domElement.addEventListener('mouseenter', () => { globeHovered = true; });
  renderer.domElement.addEventListener('mouseleave', () => { globeHovered = false; });
  renderer.domElement.addEventListener('mousemove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    asciiMouse.x = (e.clientX - rect.left) / rect.width;
    asciiMouse.y = (e.clientY - rect.top) / rect.height;
  });
  renderer.domElement.addEventListener('click', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    asciiClickWaves.push({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      time: Date.now(),
      intensity: 2.2,
    });
    const now = Date.now();
    while (asciiClickWaves.length > 0 && now - asciiClickWaves[0].time > 4500) asciiClickWaves.shift();
  });

  function getClickInfluence(nx, ny, now) {
    let total = 0;
    for (const cw of asciiClickWaves) {
      const age = now - cw.time;
      if (age > 4200) continue;
      const dx = nx - cw.x, dy = ny - cw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const waveRadius = (age / 4200) * 0.8;
      const waveWidth = 0.10;
      if (Math.abs(dist - waveRadius) < waveWidth) {
        const strength = (1 - age / 4200) * cw.intensity;
        const prox = 1 - Math.abs(dist - waveRadius) / waveWidth;
        total += strength * prox * Math.sin((dist - waveRadius) * 20);
      }
    }
    return total;
  }

  function pointInPolygon(lat, lon, rings) {
    for (const ring of rings) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) return true;
    }
    return false;
  }

  function isLand(lat, lon, features) {
    for (const f of features) {
      const geom = f.geometry;
      if (!geom) continue;
      const polys = geom.type === 'Polygon' ? [geom.coordinates]
                  : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      for (const poly of polys) {
        if (pointInPolygon(lat, lon, poly)) return true;
      }
    }
    return false;
  }

  function buildDots(features) {
    for (let row = 0; row < DOT_ROWS; row++) {
      const lat    = -90 + (180 / DOT_ROWS) * (row + 0.5);
      const latRad = lat * Math.PI / 180;
      const dotsInRow = Math.max(1, Math.round(DOT_ROWS * 2 * Math.cos(latRad)));
      for (let col = 0; col < dotsInRow; col++) {
        const lon    = -180 + (360 / dotsInRow) * (col + 0.5);
        const lonRad = lon * Math.PI / 180;
        if (isLand(lat, lon, features)) {
          landPoints.push({
            localPos: new THREE.Vector3(
              RC * Math.cos(latRad) * Math.cos(lonRad),
              RC * Math.sin(latRad),
             -RC * Math.cos(latRad) * Math.sin(lonRad)
            )
          });
        }
      }
    }
  }

  const _projVec = new THREE.Vector3();
  const _projOut = { nx: 0, ny: 0, facing: false, depth: 0 };
  function projectPoint(localPos) {
    _projVec.copy(localPos).applyQuaternion(globe.quaternion);
    _projOut.facing = _projVec.z > 0;   // Sichtbarkeit im Weltraum, VOR der Projektion
    _projVec.project(camera);            // in-place, keine Allokation
    _projOut.nx    =  _projVec.x * 0.5 + 0.5;
    _projOut.ny    = -_projVec.y * 0.5 + 0.5;
    _projOut.depth =  _projVec.z;
    return _projOut;                     // dasselbe Objekt wird wiederverwendet
  }

  function drawAsciiOverlay() {
    const W = asciiCanvas.width, H = asciiCanvas.height;
    if (W === 0 || H === 0) return;
    asciiCtx.clearRect(0, 0, W, H);
    asciiTime += 0.75 * 0.016;
    const now = Date.now();
    for (let i = asciiClickWaves.length - 1; i >= 0; i--) {
      if (now - asciiClickWaves[i].time > 4500) asciiClickWaves.splice(i, 1);
    }
    const FONT_SIZE = Math.max(6, Math.min(W, H) / DOT_ROWS * 1.6);
    asciiCtx.font = `${FONT_SIZE}px monospace`;
    asciiCtx.textAlign = 'center';
    asciiCtx.textBaseline = 'middle';
    for (const pt of landPoints) {
      const { nx, ny, facing, depth } = projectPoint(pt.localPos);
      if (!facing || depth > 1) continue;
      const limbDist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 2;
      if (limbDist > 0.98) continue;
      const limbFade = Math.max(0, 1 - Math.pow(Math.max(0, limbDist - 0.72) / 0.26, 2));
      if (limbFade <= 0) continue;
      let totalWave = 0;
      for (const wave of asciiWaves) {
        const dx = nx - wave.x, dy = ny - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 / (1 + dist * 4);
        totalWave += Math.sin(dist * wave.frequency * 60 - asciiTime * wave.speed + wave.phase) * wave.amplitude * falloff;
      }
      const mdx = nx - asciiMouse.x, mdy = ny - asciiMouse.y;
      const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mouseDist < 0.3) {
        totalWave += (1 - mouseDist / 0.3) * 0.9 * Math.sin(asciiTime * 3);
      }
      totalWave += getClickInfluence(nx, ny, now);
      const clamped = Math.max(0, Math.min(1, (totalWave + 2) / 4));
      const char = ASCII_CHARS[Math.floor(clamped * (ASCII_CHARS.length - 1))] || ASCII_CHARS[0];
      const opacity = Math.min(0.92, 0.4 + clamped * 0.5) * limbFade;
      asciiCtx.fillStyle = `rgba(255,255,255,${opacity.toFixed(3)})`;
      asciiCtx.fillText(char, nx * W, ny * H);
    }
  }

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(world => {
      if (typeof topojson === 'undefined') return;
      buildDots(topojson.feature(world, world.objects.countries).features);
    }).catch(() => {});

  const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.06 });
  [-60, -30, 0, 30, 60].forEach(latDeg => {
    const lr = latDeg * Math.PI / 180, pts = [];
    for (let i = 0; i <= 72; i++) {
      const ln = (i / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(R * Math.cos(lr) * Math.sin(ln), R * Math.sin(lr), R * Math.cos(lr) * Math.cos(ln)));
    }
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  });
  [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].forEach(lonDeg => {
    const ln = lonDeg * Math.PI / 180, pts = [];
    for (let i = 0; i <= 36; i++) {
      const lr = -Math.PI / 2 + (i / 36) * Math.PI;
      pts.push(new THREE.Vector3(R * Math.cos(lr) * Math.sin(ln), R * Math.sin(lr), R * Math.cos(lr) * Math.cos(ln)));
    }
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), gridMat));
  });

  const SALZ_LAT_RAD = 47.8  * Math.PI / 180;
  const SALZ_LON_RAD = 13.05 * Math.PI / 180;

  function ll3(latRad, lonRad, r) {
    return new THREE.Vector3(
       r * Math.cos(latRad) * Math.cos(lonRad),
       r * Math.sin(latRad),
      -r * Math.cos(latRad) * Math.sin(lonRad)
    );
  }

  const pinBase = ll3(SALZ_LAT_RAD, SALZ_LON_RAD, R + 0.002);
  const pinTip  = ll3(SALZ_LAT_RAD, SALZ_LON_RAD, R + 0.22);
  const outward = pinBase.clone().normalize();

  globe.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([pinBase.clone(), pinTip.clone()]),
    new THREE.LineBasicMaterial({ color: 0xF0EDE8, transparent: true, opacity: 0.9 })
  ));

  const pinCoreDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  pinCoreDot.position.copy(pinTip);
  globe.add(pinCoreDot);

  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(0.030, 0.042, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  ring1.position.copy(pinTip);
  ring1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  globe.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(0.042, 0.075, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
  );
  ring2.position.copy(pinTip);
  ring2.quaternion.copy(ring1.quaternion);
  globe.add(ring2);

  const pinBaseDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4040 })
  );
  pinBaseDot.position.copy(pinBase);
  globe.add(pinBaseDot);

  const salzDir = ll3(SALZ_LAT_RAD, SALZ_LON_RAD, 1).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(salzDir, new THREE.Vector3(0, 0, 1));
  const northAfterQ1 = new THREE.Vector3(0, 1, 0).applyQuaternion(q1);
  const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(northAfterQ1.x, northAfterQ1.y));
  const baseQuat = q2.multiply(q1);
  globe.quaternion.copy(baseQuat);

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;z-index:5;';
  container.appendChild(svg);

  const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  svgLine.setAttribute('stroke', 'rgba(240,237,232,0.4)');
  svgLine.setAttribute('stroke-width', '1');
  svgLine.setAttribute('stroke-dasharray', '3 3');
  svg.appendChild(svgLine);

  const svgBadge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  svgBadge.setAttribute('rx', '3');
  svgBadge.setAttribute('fill', 'rgba(17,17,16,0.85)');
  svgBadge.setAttribute('stroke', 'rgba(240,237,232,0.15)');
  svgBadge.setAttribute('stroke-width', '1');
  svg.appendChild(svgBadge);

  const svgAccentDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  svgAccentDot.setAttribute('r', '2.5');
  svgAccentDot.setAttribute('fill', '#ff4040');
  svg.appendChild(svgAccentDot);

  const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  svgText.setAttribute('fill', 'rgba(240,237,232,0.88)');
  svgText.setAttribute('font-family', 'DM Mono, monospace');
  svgText.setAttribute('font-size', '8.5');
  svgText.setAttribute('letter-spacing', '0.18em');
  svgText.setAttribute('text-anchor', 'start');
  svgText.setAttribute('dominant-baseline', 'middle');
  svgText.textContent = 'SALZBURG, AT';
  svg.appendChild(svgText);

  function resizeAsciiCanvas() {
    const s = container.offsetWidth || 520;
    asciiCanvas.width  = s;
    asciiCanvas.height = s;
  }
  resizeAsciiCanvas();
  new ResizeObserver(resizeAsciiCanvas).observe(container);

  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;

  window.addEventListener('mousemove', (e) => {
    const containerRect = container.getBoundingClientRect();
    const cx = containerRect.left + containerRect.width  / 2;
    const cy = containerRect.top  + containerRect.height / 2;
    tRotY = Math.max(-0.20, Math.min(0.20, ((e.clientX - cx) / (containerRect.width  / 2)) * 0.18));
    tRotX = Math.max(-0.12, Math.min(0.12, ((e.clientY - cy) / (containerRect.height / 2)) * 0.10));
  }, { passive: true });

  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _q     = new THREE.Quaternion();
  let clockS = 0;

  function projectPin() {
    const v    = pinTip.clone().applyQuaternion(globe.quaternion).add(globe.position).project(camera);
    const dpr  = Math.min(window.devicePixelRatio, 2);
    const rW   = renderer.domElement.width  / dpr;
    const rH   = renderer.domElement.height / dpr;
    const px   = (v.x *  0.5 + 0.5) * rW;
    const py   = (v.y * -0.5 + 0.5) * rH;
    const vis  = v.z < 1 ? 1 : 0;
    const PAD = 6, H = 17;
    const textW = 75;
    const DOT_R = 5, DOT_GAP = 5;
    const badgeW = DOT_R * 2 + DOT_GAP + textW + PAD * 2;
    const bx = px + 14, by = py - 28;
    svgLine.setAttribute('x1', px);  svgLine.setAttribute('y1', py);
    svgLine.setAttribute('x2', bx);  svgLine.setAttribute('y2', by + H / 2);
    svgBadge.setAttribute('x', bx);  svgBadge.setAttribute('y', by);
    svgBadge.setAttribute('width', badgeW); svgBadge.setAttribute('height', H);
    svgAccentDot.setAttribute('cx', bx + PAD + DOT_R);
    svgAccentDot.setAttribute('cy', by + H / 2);
    svgText.setAttribute('x', bx + PAD + DOT_R * 2 + DOT_GAP);
    svgText.setAttribute('y', by + H / 2);
    const labelVis = vis * (globeHovered ? 1 : 0);
    [svgLine, svgBadge, svgText, svgAccentDot].forEach(el => {
      el.style.opacity = String(labelVis);
      el.style.transition = globeHovered ? 'opacity 0.3s ease' : 'opacity 0.15s ease';
    });
  }

  let globeVisible = false;
  new IntersectionObserver(
    ([entry]) => { globeVisible = entry.isIntersecting; },
    { threshold: 0.01 }
  ).observe(container);

  (function tick() {
    requestAnimationFrame(tick);
    if (!globeVisible) return;
    clockS += 0.012;
    cRotY += (tRotY - cRotY) * 0.028;
    cRotX += (tRotX - cRotX) * 0.028;
    _euler.set(cRotX, cRotY, 0, 'YXZ');
    _q.setFromEuler(_euler);
    globe.quaternion.copy(_q).multiply(baseQuat);
    globe.position.y = Math.sin(clockS * 0.6) * 0.028;
    const p1 = 0.5 + 0.5 * Math.sin(clockS * 2.6);
    const p2 = 0.5 + 0.5 * Math.sin(clockS * 2.6 + Math.PI);
    ring1.material.opacity = 0.45 + 0.45 * p1;
    ring1.scale.setScalar(1 + 0.22 * p1);
    ring2.material.opacity = 0.08 + 0.20 * p2;
    ring2.scale.setScalar(1 + 0.45 * p2);
    drawAsciiOverlay();
    projectPin();
    renderer.render(scene, camera);
  })();

  /* ASCII Background */
  (function initGlobeSectionAsciBg() {
    const section = document.getElementById('globeSection');
    if (!section) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'globe-section-ascii-bg';
    section.insertBefore(canvas, section.firstChild);
    const ctx = canvas.getContext('2d');
    const CHARS = ASCII_CHARS;
    const GRID = 60;
    const waves = [];
    for (let i = 0; i < 5; i++) {
      waves.push({
        x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.7,
        frequency: 0.14 + Math.random() * 0.18, amplitude: 0.45 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2, speed: 0.3 + Math.random() * 0.35,
      });
    }
    let time = 0;
    const mouse = { x: 0.5, y: 0.5 };
    const clickWaves = [];
    section.addEventListener('mousemove', (e) => {
      const rect = section.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / rect.width;
      mouse.y = (e.clientY - rect.top)  / rect.height;
    }, { passive: true });
    section.addEventListener('click', (e) => {
      const rect = section.getBoundingClientRect();
      clickWaves.push({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height, time: Date.now(), intensity: 2.0 });
    });
    function bgClickInfluence(nx, ny, now) {
      let total = 0;
      for (const cw of clickWaves) {
        const age = now - cw.time;
        if (age > 4500) continue;
        const dx = nx - cw.x, dy = ny - cw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const radius = (age / 4500) * 1.2, width = 0.12;
        if (Math.abs(dist - radius) < width) {
          total += (1 - age / 4500) * cw.intensity * (1 - Math.abs(dist - radius) / width) * Math.sin((dist - radius) * 18);
        }
      }
      return total;
    }
    function resize() { canvas.width = section.offsetWidth; canvas.height = section.offsetHeight; }
    function draw() {
      const W = canvas.width, H = canvas.height;
      if (W === 0 || H === 0) return;
      time += 0.75 * 0.016;
      const now = Date.now();
      for (let i = clickWaves.length - 1; i >= 0; i--) { if (now - clickWaves[i].time > 4500) clickWaves.splice(i, 1); }
      ctx.clearRect(0, 0, W, H);
      const cellW = W / GRID, cellH = H / GRID;
      const fontSize = Math.min(cellW, cellH) * 0.72;
      ctx.font = `${fontSize}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const nx = (gx + 0.5) / GRID, ny = (gy + 0.5) / GRID;
          let totalWave = 0;
          for (const wave of waves) {
            const dx = nx - wave.x, dy = ny - wave.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            totalWave += Math.sin(dist * wave.frequency * 55 - time * wave.speed + wave.phase) * wave.amplitude / (1 + dist * 3.5);
          }
          const mdx = nx - mouse.x, mdy = ny - mouse.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 0.35) totalWave += (1 - mDist / 0.35) * 0.85 * Math.sin(time * 3.2);
          totalWave += bgClickInfluence(nx, ny, now);
          if (Math.abs(totalWave) < 0.18) continue;
          const norm = Math.max(0, Math.min(1, (totalWave + 2) / 4));
          const char = CHARS[Math.floor(norm * (CHARS.length - 1))] || CHARS[0];
          const opacity = (0.055 + norm * 0.085) * 0.9;
          ctx.fillStyle = `rgba(200,196,190,${opacity.toFixed(4)})`;
          ctx.fillText(char, (gx + 0.5) * cellW, (gy + 0.5) * cellH);
        }
      }
    }
    let asciiBgVisible = false;
    new IntersectionObserver(([entry]) => { asciiBgVisible = entry.isIntersecting; }, { threshold: 0.01 }).observe(section);
    function animate() { if (asciiBgVisible) draw(); requestAnimationFrame(animate); }
    window.addEventListener('resize', resize);
    resize();
    animate();
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
  const contactBlock = document.getElementById('globeContactList');
  const contactItems = contactBlock ? [...contactBlock.querySelectorAll('.globe-contact-item')] : [];

  if (!section || !canvasWrap || !textLeft) return;

  const c01  = v => Math.max(0, Math.min(1, v));
  const eOut = t => 1 - Math.pow(1 - c01(t), 3);
  const eInOut = t => { t = c01(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const ph   = (p, a, b) => eOut(c01((p - a) / (b - a)));
  const phIO = (p, a, b) => eInOut(c01((p - a) / (b - a)));

  gsap.set(canvasWrap, { x: 0, scale: 1, transformOrigin: 'center center' });
  gsap.set(textLeft,   { opacity: 0 });
  gsap.set(line1, { y: '110%' });
  gsap.set(contactItems, { y: 24, opacity: 0 });

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
    contactItems.forEach((item, i) => {
      const start = 0.68 + i * 0.05;
      const t     = ph(p, start, start + 0.20);
      gsap.set(item, { y: (1 - t) * 24, opacity: t });
    });
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
      gsap.set(contactItems, { y: 24, opacity: 0 });
    },
  });
})();

/* ============================
   NAV LOGO — hide in "what i do" section
============================ */
(function initLogoVisibility() {
  const logoName = document.getElementById('navLogoName');
  const logoSub  = document.getElementById('navLogoSub');
  const workEl   = document.getElementById('work');
  if (!logoName || !logoSub || !workEl) return;

  let workVisible = false;

  function update() {
    gsap.to([logoName, logoSub], { opacity: workVisible ? 0 : 1, duration: 0.08, ease: 'none' });
  }

  new IntersectionObserver(([entry]) => {
    workVisible = entry.isIntersecting;
    update();
  }, { threshold: 0.10 }).observe(workEl);
})();