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
window.__smoothTowards = smoothTowards;

/* ============================
   SCROLL VELOCITY SKEW
   Elemente mit .skew-on-scroll bekommen beim schnellen Scrollen einen minimalen
   Skew/Scale, der beim Stoppen ausläuft — der typische "flüssige" Trägheits-Look.
   Nutzt Lenis-Velocity, framerate-unabhängig geglättet, respektiert Reduced-Motion.
============================ */
(function initScrollSkew() {
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduce || typeof lenis === 'undefined') return;
  const els = Array.prototype.slice.call(document.querySelectorAll('.skew-on-scroll'));
  if (!els.length) return;

  let skew = 0;
  gsap.ticker.add((time, deltaTime) => {
    const dt = Math.min(deltaTime || 16.7, 50) / 1000;
    const v = lenis.velocity || 0;                       // px/frame-ish
    const target = Math.max(-6, Math.min(6, v * 0.35));  // Grad, gedeckelt
    skew = smoothTowards(skew, target, 0.12, dt);
    if (Math.abs(skew) < 0.01) skew = 0;
    for (let i = 0; i < els.length; i++) {
      els[i].style.transform = 'skewY(' + skew.toFixed(3) + 'deg)';
    }
  });
})();

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
  const RADIUS   = 1.6;    // Aktionsradius als Vielfaches der halben Buttonbreite
  const SMOOTH   = 0.09;   // Sekunden Nachlauf

  const items = [];
  document.querySelectorAll('.hero-btn, .projects-cta').forEach((el) => {
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
   CONTACT PIXEL HOVER — Ink-Blöcke steigen beim Hover verstreut von unten auf
   (überträgt den Pixel-Wipe-Stil auf die "Find me here"-Links). Canvas je Link.
============================ */
(function initContactPixels() {
  const items = document.querySelectorAll('.globe-contact-item, .hero-btn, .projects-cta');
  if (!items.length) return;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const BLOCK = 13;          // kleine Blöcke (Zeilen sind niedrig)
  const BIAS  = 0.6;         // Anteil "von unten"
  const SMOOTH = 0.11;       // Sekunden – Ein-/Ausblenden
  const INK = '240, 237, 232';

  function rnd(gx, gy) {
    let h = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
    h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  items.forEach((item) => {
    const cv = document.createElement('canvas');
    cv.className = 'gc-pixels';
    cv.setAttribute('aria-hidden', 'true');
    item.insertBefore(cv, item.firstChild);
    const ctx = cv.getContext('2d');

    let w = 0, h = 0, cols = 0, rows = 0, dpr = 1;
    function size() {
      const r = item.getBoundingClientRect();
      w = Math.max(1, r.width); h = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.floor(w * dpr); cv.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / BLOCK); rows = Math.max(1, Math.ceil(h / BLOCK));
    }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(item);

    function draw(p) {
      ctx.clearRect(0, 0, w, h);
      if (p <= 0.001) return;
      ctx.fillStyle = 'rgb(' + INK + ')';
      for (let gy = 0; gy < rows; gy++) {
        const rowBias = rows > 1 ? gy / (rows - 1) : 1;      // 0 oben, 1 unten
        for (let gx = 0; gx < cols; gx++) {
          const thr = (1 - rowBias) * BIAS + rnd(gx, gy) * (1 - BIAS); // unten zuerst
          if (p >= thr) ctx.fillRect(gx * BLOCK, gy * BLOCK, BLOCK + 1, BLOCK + 1);
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
    window.__heroPhotos = false;
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

  let _lastT = performance.now();
  (function tick(now) {
    requestAnimationFrame(tick);
    now = now || performance.now();
    const dt = Math.min((now - _lastT) || 16.7, 50) / 1000;   // s, gedeckelt
    _lastT = now;
    if (!globeVisible) return;
    const noMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (!noMotion) {
      clockS += 0.72 * dt;                                       // vorher 0.012/Frame ≈ 0.72/s @60Hz
      const kRot = 1 - Math.exp(-dt / 0.55);                     // vorher 0.028/Frame, jetzt framerate-unabhängig
      cRotY += (tRotY - cRotY) * kRot;
      cRotX += (tRotX - cRotX) * kRot;
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
    }
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





/* ============================
   FOOTER — Text auf volle Breite strecken
============================ */
(function initFooterStretch() {
  const wrap = document.getElementById('footerText');
  if (!wrap) return;
  const line = wrap.querySelector('.ftp-line');
  if (!line) return;

  function fit() {
    const cs = getComputedStyle(wrap);
    const availW = wrap.clientWidth - parseFloat(cs.paddingLeft || 0) - parseFloat(cs.paddingRight || 0);
    const availH = wrap.clientHeight;
    line.style.transform = 'none';
    const rect = line.getBoundingClientRect();
    const natW = rect.width || 1, natH = rect.height || 1;
    // Höhe füllt die Bühne, Breite füllt (max.) die verfügbare Breite → getrennte Faktoren, nichts läuft über
    const sy = (availH * 0.99) / natH;
    const sx = Math.min((availW * 0.99) / natW, sy * 5.5);   // Breite füllen, Streckung großzügiger
    line.style.transform = 'scale(' + sx.toFixed(4) + ',' + sy.toFixed(4) + ')';
  }
  fit();
  window.addEventListener('resize', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();