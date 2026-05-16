/* ============================
   INIT
============================ */
gsap.registerPlugin(ScrollTrigger);

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
   CUSTOM CURSOR (FIXED)
============================ */

const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

gsap.set([cursorDot, cursorRing], { xPercent: -50, yPercent: -50 });

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

// Initial
gsap.set(cursorDot,  { x: mouseX, y: mouseY });
gsap.set(cursorRing, { x: mouseX, y: mouseY });

// quickSetter statt gsap.to() im mousemove — kein neues Tween pro Event, viel weniger Overhead
const setDotX  = gsap.quickSetter(cursorDot,  'x', 'px');
const setDotY  = gsap.quickSetter(cursorDot,  'y', 'px');
const setRingX = gsap.quickSetter(cursorRing, 'x', 'px');
const setRingY = gsap.quickSetter(cursorRing, 'y', 'px');

// Ring per Lerp im gsap.ticker smoothen — kein neues Tween pro Frame
let ringX = mouseX, ringY = mouseY;
gsap.ticker.add(() => {
  ringX += (mouseX - ringX) * 0.18;
  ringY += (mouseY - ringY) * 0.18;
  setRingX(ringX);
  setRingY(ringY);
});

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  setDotX(mouseX);
  setDotY(mouseY);
}, { passive: true });

// Visibility fix bleibt
document.addEventListener('mouseleave', () => {
  gsap.to([cursorDot, cursorRing], { opacity: 0, duration: 0.2 });
});

document.addEventListener('mouseenter', () => {
  gsap.to([cursorDot, cursorRing], { opacity: 1, duration: 0.2 });
});

/* Nav links: nativer pointer cursor */
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('mouseenter', () => {
    gsap.to([cursorDot, cursorRing], { opacity: 0, duration: 0.15 });
  });
  link.addEventListener('mouseleave', () => {
    gsap.to([cursorDot, cursorRing], { opacity: 1, duration: 0.15 });
  });
});



/* ============================
   HERO — Jasmine Gunarto style reveal
============================ */
const heroInit = () => {
  // ── fitText: scale JACOB WEISSENBÄCK to exactly viewport width ──
  const elName = document.getElementById('heroWordFullname');
  const fitFullname = () => {
    if (!elName) return;
    const vw = document.documentElement.clientWidth;
    const padding = vw * 0.03; // 1.5vw each side
    const maxW = vw - padding;
    let lo = 10, hi = vw;
    elName.style.visibility = 'hidden';
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      elName.style.fontSize = mid + 'px';
      if (elName.scrollWidth <= maxW) lo = mid;
      else hi = mid;
    }
    elName.style.fontSize = lo + 'px';
    elName.style.visibility = '';
  };

  document.fonts.ready.then(() => { fitFullname(); });
  window.addEventListener('resize', fitFullname);

  // Set initial animation states
  gsap.set(['#heroWordFullname', '#heroWordRole', '#heroWordDesigner'], { y: '110%' });
  // xPercent: -50 übernimmt die CSS translateX(-50%) Zentrierung, da GSAP transform kontrolliert
  gsap.set('#heroImgCard',  { opacity: 0, y: 20, xPercent: -50, scaleX: 1, transformOrigin: '50% 0' });
  gsap.set('#heroScroll',   { opacity: 0 });

  const heroTL = gsap.timeline({ delay: 0.1 });
  heroTL
    .to('#heroWordFullname', { y: '0%', duration: 1.2, ease: 'power4.out' }, 0)
    .to(['#heroWordRole', '#heroWordDesigner'], { y: '0%', duration: 1.1, ease: 'power4.out', stagger: 0.07 }, 0.15)
    .to('#heroImgCard', { opacity: 1, y: 0, xPercent: -50, scaleX: 1, duration: 0.9, ease: 'power3.out' }, 0.45)
    .to('#heroScroll', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.0);
};

/* ============================
   EASTER EGG — Name letter hover
============================ */
(function initNameEasterEgg() {
  const wrap = document.getElementById('nameLetterWrap');
  if (!wrap) return;

  const chars = [...'JACOB WEISSENBACK'];
  wrap.textContent = '';

  chars.forEach((ch, i) => {
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

// Warte auf Fonts, dann init — kein arbiträres setTimeout
document.fonts.ready.then(() => requestAnimationFrame(heroInit));


/* ── SCROLL SYSTEM — Awwwards Choreography ──────────────────────────────
   Phase A [0.00 → 0.40]
     · JACOB WEISSENBACK → fliegt nach RECHTS raus (overflow hidden clip)
     · "Meine Projekte" → fliegt von LINKS rein, nimmt exakt dieselbe
       Position und Schriftgröße ein
     · UI/UX → fliegt nach LINKS raus + blur + fade
     · DESIGNER → fliegt nach RECHTS raus + blur + fade
     · Bild-Card: leichter Parallax-Scale

   Phase B [0.40 → 0.75]
     · Proxy-Bild wächst von Bild-Position auf volle Viewport-Breite

   Phase C [0.75 → 1.00]
     · Bottom Sheet fährt von unten herein
─────────────────────────────────────────────────────────────────────── */
(function initScrollSystem() {
  const hero       = document.getElementById('hero');
  const imgCard    = document.getElementById('heroImgCard');
  const nameRow    = document.getElementById('heroNameRow');
  const nameEl     = document.getElementById('heroWordFullname');
  const roleEl     = document.getElementById('heroWordRole');
  const designerEl = document.getElementById('heroWordDesigner');
  const scrollHint = document.getElementById('heroScroll');
  const panel      = document.getElementById('bottomSheet');
  const zpStage    = document.getElementById('heroZpStage');
  const zpItems    = zpStage ? [...zpStage.querySelectorAll('.hero-zp-item')] : [];

  if (!hero || !roleEl || !designerEl || !panel || !imgCard || !nameEl) return;

  const c01 = v => Math.max(0, Math.min(1, v));
  const eIO = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const ph  = (p, a, b, easeFn) => {
    const t = c01((p - a) / (b - a));
    return easeFn ? easeFn(t) : t;
  };

  let cardRect = null;
  let pinLeft  = false;

  // ── Build the incoming "Meine Projekte" ghost element ──
  // It lives in the same name-row, same font/size, clipped by the same overflow:hidden
  const incomingEl = document.createElement('span');
  incomingEl.id    = 'heroWordIncoming';
  incomingEl.textContent = 'Services';
  // Style it to exactly match #heroWordFullname
  incomingEl.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    font-family: 'Anton', 'Barlow Condensed', Arial, sans-serif;
    font-weight: 400; font-style: normal;
    line-height: 0.88; letter-spacing: -0.02em;
    color: var(--ink, #18130c);
    text-transform: uppercase;
    white-space: nowrap;
    display: block;
    will-change: transform;
    transform: translateX(-110%);
    pointer-events: none;
  `;

  // Wrap both texts in a clipping container that matches the name row layout
  if (!document.getElementById('_nameSlideStyle')) {
    const s = document.createElement('style');
    s.id = '_nameSlideStyle';
    s.textContent = `
      /* The name row clips the slide animation */
      .hero-name-row {
        overflow: hidden !important;
        position: relative !important;
      }
      /* Incoming text mirrors the fullname sizing exactly */
      #heroWordIncoming {
        font-size: inherit;
      }
      /* Make the fullname wrapper position:relative so incoming can be absolute inside */
      #heroWordFullname {
        position: relative;
        display: block;
      }
    `;
    document.head.appendChild(s);
  }

  // Insert incoming INSIDE the same clip wrapper as the name
  // #heroWordFullname is already inside .hero-name-row
  // We place incomingEl as a sibling, absolutely positioned
  const nameClip = nameEl.closest('.hero-name-row') || nameEl.parentElement;
  nameClip.style.position = 'relative';
  nameClip.appendChild(incomingEl);

  // proxy removed — static image used instead

  function syncIncomingSize() {
    // Mirror font-size from nameEl so the incoming text is identical in scale
    const fs = nameEl.style.fontSize || getComputedStyle(nameEl).fontSize;
    incomingEl.style.fontSize = fs;
    // Also mirror the top position so baseline aligns
    incomingEl.style.top  = '0';
    incomingEl.style.left = nameEl.offsetLeft + 'px';
  }

  function measure() {
    gsap.set([roleEl, designerEl], { x: 0, opacity: 1, scale: 1, clearProps: 'filter' });
    gsap.set(imgCard, { clearProps: 'transform' });
    gsap.set(imgCard, { xPercent: -50 });
    cardRect = imgCard.getBoundingClientRect();
    syncIncomingSize();
  }

  gsap.set(panel, { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });

  function update(p) {
    if (pinLeft) return;
    if (!cardRect) return;

    if (scrollHint) gsap.set(scrollHint, { opacity: c01(1 - p * 16) });

    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // ────────────────────────────────────────────────────
    // Phase A [0 → 0.40] — text swap + side words exit
    // ────────────────────────────────────────────────────
    const pA = ph(p, 0, 0.40, eIO);

    // ── 1. JACOB WEISSENBACK flies RIGHT out ──
    // Travel: 110% of its own width (= fully off screen to the right)
    const nameExitX = pA * 110; // in % (translateX)
    gsap.set(nameEl, {
      xPercent: nameExitX,
      opacity: c01(1 - pA * 1.4),
    });

    // ── 2. "Meine Projekte" slides in from LEFT ──
    // Starts at -110%, arrives at 0%
    const incomingX = -110 + pA * 110; // -110% → 0%
    syncIncomingSize();
    gsap.set(incomingEl, {
      xPercent: incomingX,
      opacity: c01(pA * 2.5),
    });

    // ── 3. UI/UX → blast LEFT, DESIGNER → blast RIGHT ──
    // filter:blur() entfernt — in Edge teuer; scale + opacity reichen optisch
    const sideOpacity = c01(1 - pA * 2.2);
    const sideScale   = 1 + pA * 0.08;
    const roleTravelX     = -(cardRect.left + 200) * pA;
    const designerTravelX = (vw - cardRect.right + 200) * pA;

    gsap.set(roleEl, {
      x: roleTravelX,
      opacity: sideOpacity,
      scale: sideScale,
    });
    gsap.set(designerEl, {
      x: designerTravelX,
      opacity: sideOpacity,
      scale: sideScale,
    });

    // ── Phase B [0.35 → 0.78]: Parallax photos haben die Bühne für sich ──
    const pB       = ph(p, 0.35, 0.78, eIO);
    const pCardZoom = ph(p, 0.78, 1.00, eIO);

    // ── 4. Image card — zoomed bis Viewport-Größe, nicht weiter ──
    // Card ist ~32vw breit → scale ~3.1 füllt den Screen; aspect ratio passt für height auch
    // pCardZoom geht 0→1, wir mappen auf scale 1→maxScale
    const cardW    = imgCard.offsetWidth || window.innerWidth * 0.32;
    const maxScale = Math.max(window.innerWidth / cardW, window.innerHeight / (cardW * 0.71));
    const cardZoom = 1 + pA * 0.05 + pCardZoom * (maxScale - 1.05);
    gsap.set(imgCard, { scale: cardZoom, opacity: 1, xPercent: -50, transformOrigin: '50% 50%' });

    // ── zpItems: rein während Phase B, coole Exit-Transition sobald Card zoomed ──
    // pExit: wenn Card anfängt zu zoomen (ab 0.78) fliegen zpItems raus
    const pExit = ph(p, 0.78, 0.92, eIO);

    zpItems.forEach((item) => {
      const isCenterItem = item.querySelector('.hero-zp-center') !== null;
      const targetScale  = parseFloat(item.dataset.scale) || 1.5;
      const delay        = parseFloat(item.dataset.delay) || 0;

      if (isCenterItem) {
        gsap.set(item, { opacity: 0, scale: 1 });
        return;
      }

      // Phase B: rein und zoomen
      const itemP   = c01((pB - delay) / (1 - delay));
      const fadeIn  = c01(itemP * 4);
      const zoomVal = 1 + itemP * (targetScale - 1);

      // Exit: scale + opacity, kein blur — filter:blur() in Edge teuer
      const exitScale   = zoomVal + pExit * 0.4;
      const exitOpacity = fadeIn * c01(1 - pExit * 1.8);

      gsap.set(item, {
        opacity: exitOpacity,
        scale:   exitScale,
      });
    });

    // ── Phase C [0.80 → 1.00]: Bottom Sheet slides up ──
    if (p < 0.80) {
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });
    } else {
      const pC      = ph(p, 0.80, 1.00, eIO);
      const insetTop = c01(1 - pC) * 100;
      gsap.set(panel, { clipPath: `inset(${insetTop}% 0 0 0 round 20px 20px 0 0)` });
    }
  }

  function resetAll() {
    gsap.set(nameEl,     { xPercent: 0, opacity: 1 });
    gsap.set(incomingEl, { xPercent: -110, opacity: 0 });
    gsap.set([roleEl, designerEl], { x: 0, opacity: 1, scale: 1, clearProps: 'filter' });
    gsap.set(imgCard,    { opacity: 1, xPercent: -50 });
    zpItems.forEach(item => gsap.set(item, { opacity: 0, scale: 1, filter: 'blur(0px)' }));
  }

  measure();

  ScrollTrigger.create({
    trigger:       hero,
    start:         'top top',
    end:           '+=230%',
    pin:           true,
    anticipatePin: 1,
    scrub:         1.0,
    onUpdate(self) { update(self.progress); },
    onLeave() {
      pinLeft = true;
      // Card ist jetzt riesig gezoomt und hinter dem Bottom Sheet — ok
    },
    onEnterBack() {
      pinLeft = false;
    },
    onLeaveBack() {
      resetAll();
    },
    onRefresh() {
      pinLeft = false;
      measure();
      resetAll();
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });
    },
  });

  document.fonts.ready.then(() => { measure(); ScrollTrigger.refresh(); });
  window.addEventListener('resize', () => { measure(); ScrollTrigger.refresh(); });
})();




/* ============================
   NAV — Live clock + show/hide on scroll
============================ */
// Live Salzburg time
function updateNavTime() {
  const now = new Date();
  const opts = { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const timeStr = now.toLocaleTimeString('de-AT', opts);
  const ampm = now.getHours() < 12 ? 'AM' : 'PM';
  const el = document.getElementById('navTime');
  if (el) el.textContent = timeStr + ' GMT+2';
}
updateNavTime();
setInterval(updateNavTime, 1000);

// No xPercent needed — nav is left:0 right:0 now
// Nav immer sichtbar — mix-blend-mode: difference übernimmt den Kontrast

/* ============================
   SERVICES HOVER
   - Image panel: fixed left edge, top = row center (viewport Y)
   - Skills: absolute to item, left computed from text right edge
   - Scramble on name
============================ */
(function initServices() {
  const imgPanel = document.getElementById('svcImgPanel');
  const section  = document.querySelector('.services-section');
  const CHARS    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—';

  if (imgPanel) {
    gsap.set(imgPanel, { opacity: 0 });
  }

  const imgInner = imgPanel ? imgPanel.querySelector('.svc-img-inner') : null;

  function showPanel(name, imgId) {
    if (!imgPanel || !section) return;

    const nameRect    = name.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const rowCenter   = (nameRect.top + nameRect.height / 2) - sectionRect.top;

    gsap.set(imgPanel, { top: rowCenter, yPercent: -50, opacity: 1, scale: 1, rotation: 0 });

    // 1. Instantly collapse clip-path back to center
    if (imgInner) imgInner.classList.remove('is-revealed');

    // 2. Swap the visible image
    document.querySelectorAll('.svc-img').forEach(img =>
      img.classList.toggle('is-active', img.id === imgId)
    );

    // 3. Force reflow so the collapsed state is painted, then reveal upward+downward
    if (imgInner) {
      void imgInner.offsetWidth;
      imgInner.classList.add('is-revealed');
    }
  }

  function hidePanel() {
    if (!imgPanel) return;
    gsap.set(imgPanel, { opacity: 0 });
    if (imgInner) imgInner.classList.remove('is-revealed');
    document.querySelectorAll('.svc-img').forEach(img => img.classList.remove('is-active'));
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

    // Trigger only on svc-name, not the full row
    name.addEventListener('mouseenter', () => {
      const nameRect    = name.getBoundingClientRect();
      const itemRect    = item.getBoundingClientRect();

      showPanel(name, imgId);

      // Skills: right of name text, relative to item
      if (skills) {
        const leftFromItem = nameRect.right - itemRect.left + 24;
        skills.style.left = leftFromItem + 'px';
        gsap.set(skills, { opacity: 1, x: 0 });
      }

      scramble(name);
    });

    name.addEventListener('mouseleave', () => {
      hidePanel();
      if (skills) {
        gsap.set(skills, { opacity: 0 });
      }
      unscramble(name);
    });
  });
})();

/* svc scramble handled in initServices above */


/* ============================
   SCROLL ANIMATIONS — cinematic
============================ */

// ── Services items: staggered slide up ──
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
   GLOBE SECTION — Three.js
   Dot-Grid Ästhetik (weiße Punkte), kein Auto-Rotate,
   Mousemove-Tilt innerhalb der Section, Salzburg zentriert, Nord oben
============================ */
(function initGlobeSection() {
  const container = document.getElementById('globeSectionCanvas');
  if (!container || typeof THREE === 'undefined') return;

  // ── Scene ──
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

  // ── Minimal light (dots are unlit points, but sphere needs some) ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const R     = 1.5;
  const globe = new THREE.Group();
  scene.add(globe);

  // ── Helper: lat/lon → 3D Vec3 ──
  function ll(latRad, lonRad, r) {
    return new THREE.Vector3(
       r * Math.cos(latRad) * Math.cos(lonRad),
       r * Math.sin(latRad),
      -r * Math.cos(latRad) * Math.sin(lonRad)
    );
  }


  // ── Ocean sphere — warm dark, matches portfolio --bg ──
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R, 64, 64),
    new THREE.MeshBasicMaterial({ color: 0x1a1714 })
  ));

  // ── Atmosphere rim ──
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.04, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0x3a3028, transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false })
  ));

  // ── ASCII OVERLAY — 2D canvas with wave interaction ──
  const RC = R + 0.008;
  const DOT_ROWS = 120;

  // The ASCII/Braille char set from DelicateAsciiDots
  const ASCII_CHARS = '⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠘⠨⠊⠋⠌⠍⠎⠏⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛⠜⠝⠞⠟⠡⠢⠣⠤⠥⠦⠧⠩⠪⠫⠬⠭⠮⠯⠱⠲⠳⠴⠵⠶⠷⠹⠺⠻⠼⠽⠾⠿⡁⡂⡃⡄⡅⡆⡇⡉⡊⡋⡌⡍⡎⡏⡑⡒⡓⡔⡕⡖⡗⡙⡚⡛⡜⡝⡞⡟⡡⡢⡣⡤⡥⡦⡧⡩⡪⡫⡬⡭⡮⡯⡱⡲⡳⡴⡵⡶⡷⡹⡺⡻⡼⡽⡾⡿⢁⢂⢃⢄⢅⢆⢇⢉⢊⢋⢌⢍⢎⢏⢑⢒⢓⢔⢕⢖⢗⢙⢚⢛⢜⢝⢞⢟⢡⢢⢣⢤⢥⢦⢧⢩⢪⢫⢬⢭⢮⢯⢱⢲⢳⢴⢵⢶⢷⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣉⣊⣋⣌⣍⣎⣏⣑⣒⣓⣔⣕⣖⣗⣙⣚⣛⣜⣝⣞⣟⣡⣢⣣⣤⣥⣦⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿';

  // Build 2D overlay canvas
  const asciiCanvas = document.createElement('canvas');
  asciiCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;border-radius:50%;z-index:2;';
  container.style.position = 'relative';
  container.appendChild(asciiCanvas);
  const asciiCtx = asciiCanvas.getContext('2d');

  // Land positions stored as lat/lon (for re-projection each frame)
  const landPoints = []; // [{lat, lon, localPos}]

  // Wave state
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

  // Mouse tracking on renderer canvas
  renderer.domElement.style.pointerEvents = 'auto';

  // Hover state fuer Label-Sichtbarkeit
  let globeHovered = false;
  renderer.domElement.addEventListener('mouseenter', () => { globeHovered = true;  });
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
    // prune old
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
          const localPos = new THREE.Vector3(
            RC * Math.cos(latRad) * Math.cos(lonRad),
            RC * Math.sin(latRad),
           -RC * Math.cos(latRad) * Math.sin(lonRad)
          );
          landPoints.push({ lat, lon, localPos });
        }
      }
    }
  }

  // Project a local globe position to screen UV [0..1]
  const _projVec = new THREE.Vector3();
  function projectPoint(localPos) {
    _projVec.copy(localPos).applyQuaternion(globe.quaternion);
    // Check visibility: z > 0 means facing camera
    const facing = _projVec.z > 0;
    const projected = _projVec.clone().project(camera);
    return {
      nx: projected.x * 0.5 + 0.5,   // [0..1]
      ny: -projected.y * 0.5 + 0.5,  // [0..1]
      facing,
      depth: projected.z,
    };
  }

  function drawAsciiOverlay() {
    const W = asciiCanvas.width;
    const H = asciiCanvas.height;
    if (W === 0 || H === 0) return;

    asciiCtx.clearRect(0, 0, W, H);
    asciiTime += 0.75 * 0.016;

    const now = Date.now();
    // Prune old click waves
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

      // Fade near the limb (edge of sphere)
      const limbDist = Math.sqrt((nx - 0.5) ** 2 + (ny - 0.5) ** 2) * 2;
      if (limbDist > 0.98) continue;
      const limbFade = Math.max(0, 1 - Math.pow(Math.max(0, limbDist - 0.72) / 0.26, 2));
      if (limbFade <= 0) continue;

      // Wave interference at this screen position
      let totalWave = 0;

      // Background waves (in normalised screen space)
      for (const wave of asciiWaves) {
        const dx = nx - wave.x, dy = ny - wave.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const falloff = 1 / (1 + dist * 4);
        totalWave += Math.sin(dist * wave.frequency * 60 - asciiTime * wave.speed + wave.phase)
                     * wave.amplitude * falloff;
      }

      // Mouse wave
      const mdx = nx - asciiMouse.x, mdy = ny - asciiMouse.y;
      const mouseDist = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mouseDist < 0.3) {
        const mEffect = (1 - mouseDist / 0.3) * 0.9;
        totalWave += mEffect * Math.sin(asciiTime * 3);
      }

      // Click waves
      totalWave += getClickInfluence(nx, ny, now);

      // Map to char + opacity
      const normalised = (totalWave + 2) / 4;
      const clamped = Math.max(0, Math.min(1, normalised));
      const charIdx = Math.floor(clamped * (ASCII_CHARS.length - 1));
      const char = ASCII_CHARS[charIdx] || ASCII_CHARS[0];

      const baseOpacity = 0.4 + clamped * 0.5;
      const opacity = Math.min(0.92, baseOpacity) * limbFade;

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

  // ── Static faint grid lines (no interaction) ──
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

  // ── Salzburg pin — refined design ──
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

  // Stem
  globe.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([pinBase.clone(), pinTip.clone()]),
    new THREE.LineBasicMaterial({ color: 0xF0EDE8, transparent: true, opacity: 0.9 })
  ));

  // White core dot at tip
  const pinCoreDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  pinCoreDot.position.copy(pinTip);
  globe.add(pinCoreDot);

  // Red crosshair ring at tip
  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(0.030, 0.042, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
  );
  ring1.position.copy(pinTip);
  ring1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  globe.add(ring1);

  // Outer diffuse ring
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(0.042, 0.075, 32),
    new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
  );
  ring2.position.copy(pinTip);
  ring2.quaternion.copy(ring1.quaternion);
  globe.add(ring2);

  // Surface anchor dot
  const pinBaseDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff4040 })
  );
  pinBaseDot.position.copy(pinBase);
  globe.add(pinBaseDot);

  // ── Orient: Salzburg faces camera, North up ──
  const salzDir = ll3(SALZ_LAT_RAD, SALZ_LON_RAD, 1).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(salzDir, new THREE.Vector3(0, 0, 1));
  const northAfterQ1 = new THREE.Vector3(0, 1, 0).applyQuaternion(q1);
  const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.atan2(northAfterQ1.x, northAfterQ1.y));
  const baseQuat = q2.multiply(q1);
  globe.quaternion.copy(baseQuat);

  // ── SVG label — dark badge ──
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

  // ── Resize ASCII canvas to match renderer ──
  function resizeAsciiCanvas() {
    const s = container.offsetWidth || 520;
    asciiCanvas.width  = s;
    asciiCanvas.height = s;
  }
  resizeAsciiCanvas();
  new ResizeObserver(resizeAsciiCanvas).observe(container);

  // ── Mouse state for tilt ──
  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;
  const globeSection = container.closest('.globe-section') || container.parentElement;

  window.addEventListener('mousemove', (e) => {
    const secRect = globeSection ? globeSection.getBoundingClientRect() : container.getBoundingClientRect();
    tRotY = ((e.clientX - secRect.left) / secRect.width  * 2 - 1) * 0.35;
    tRotX = ((e.clientY - secRect.top)  / secRect.height * 2 - 1) * 0.18;
  }, { passive: true });
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _q     = new THREE.Quaternion();
  let clockS = 0;

  function projectPin() {
    const v    = pinTip.clone().applyQuaternion(globe.quaternion).add(globe.position).project(camera);
    const rect = container.getBoundingClientRect();
    const px   = (v.x *  0.5 + 0.5) * rect.width;
    const py   = (v.y * -0.5 + 0.5) * rect.height;
    const vis  = v.z < 1 ? 1 : 0;

    const PAD = 6, H = 17;
    const textW = 75; // approx px for "SALZBURG, AT" at 8.5px + tracking
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
    // Label nur zeigen wenn: Pin auf der Vorderseite UND User hovert
    const labelVis = vis * (globeHovered ? 1 : 0);
    [svgLine, svgBadge, svgText, svgAccentDot].forEach(el => {
      el.style.opacity = String(labelVis);
      el.style.transition = globeHovered ? 'opacity 0.3s ease' : 'opacity 0.15s ease';
    });
  }

  // IntersectionObserver: Globe-Loop pausieren wenn nicht sichtbar — spart CPU in Edge
  let globeVisible = false;
  const globeObserver = new IntersectionObserver(
    ([entry]) => { globeVisible = entry.isIntersecting; },
    { threshold: 0.01 }
  );
  globeObserver.observe(container);

  (function tick() {
    requestAnimationFrame(tick);
    if (!globeVisible) return; // nicht rendern wenn außerhalb des Viewports
    clockS += 0.012;

    cRotY += (tRotY - cRotY) * 0.045;
    cRotX += (tRotX - cRotX) * 0.045;

    _euler.set(cRotX, cRotY, 0, 'YXZ');
    _q.setFromEuler(_euler);
    globe.quaternion.copy(_q).multiply(baseQuat);

    globe.position.y = Math.sin(clockS * 0.6) * 0.028;

    // Pulse pin rings
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


/* ============================
   GLOBE SECTION — ASCII BACKGROUND
   Passive Braille-Wave hinter dem Globus,
   dezente Farbe damit Erde dominiert
============================ */
(function initGlobeSectionAsciBg() {
  const section = document.getElementById('globeSection');
  if (!section) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'globe-section-ascii-bg';
  section.insertBefore(canvas, section.firstChild);
  const ctx = canvas.getContext('2d');

  const CHARS = '⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿⠁⠂⠄⠈⠐⠠⡀⢀⠃⠅⠘⠨⠊⠋⠌⠍⠎⠏⠑⠒⠓⠔⠕⠖⠗⠙⠚⠛⠜⠝⠞⠟⠡⠢⠣⠤⠥⠦⠧⠩⠪⠫⠬⠭⠮⠯⠱⠲⠳⠴⠵⠶⠷⠹⠺⠻⠼⠽⠾⠿⡁⡂⡃⡄⡅⡆⡇⡉⡊⡋⡌⡍⡎⡏⡑⡒⡓⡔⡕⡖⡗⡙⡚⡛⡜⡝⡞⡟⡡⡢⡣⡤⡥⡦⡧⡩⡪⡫⡬⡭⡮⡯⡱⡲⡳⡴⡵⡶⡷⡹⡺⡻⡼⡽⡾⡿⢁⢂⢃⢄⢅⢆⢇⢉⢊⢋⢌⢍⢎⢏⢑⢒⢓⢔⢕⢖⢗⢙⢚⢛⢜⢝⢞⢟⢡⢢⢣⢤⢥⢦⢧⢩⢪⢫⢬⢭⢮⢯⢱⢲⢳⢴⢵⢶⢷⢹⢺⢻⢼⢽⢾⢿⣀⣁⣂⣃⣄⣅⣆⣇⣉⣊⣋⣌⣍⣎⣏⣑⣒⣓⣔⣕⣖⣗⣙⣚⣛⣜⣝⣞⣟⣡⣢⣣⣤⣥⣦⣧⣩⣪⣫⣬⣭⣮⣯⣱⣲⣳⣴⣵⣶⣷⣹⣺⣻⣼⣽⣾⣿';

  // Grid resolution — coarser than globe dots for background feel
  const GRID = 60;

  // Background waves
  const waves = [];
  for (let i = 0; i < 5; i++) {
    waves.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      frequency: 0.14 + Math.random() * 0.18,
      amplitude: 0.45 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.35,
    });
  }

  let time = 0;
  const mouse = { x: 0.5, y: 0.5 };
  const clickWaves = [];

  // Mouse tracking on the section
  section.addEventListener('mousemove', (e) => {
    const rect = section.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) / rect.width;
    mouse.y = (e.clientY - rect.top)  / rect.height;
  }, { passive: true });

  section.addEventListener('click', (e) => {
    const rect = section.getBoundingClientRect();
    clickWaves.push({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top)  / rect.height,
      time: Date.now(),
      intensity: 2.0,
    });
  });

  function getClickInfluence(nx, ny, now) {
    let total = 0;
    for (const cw of clickWaves) {
      const age = now - cw.time;
      if (age > 4500) continue;
      const dx = nx - cw.x, dy = ny - cw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = (age / 4500) * 1.2;
      const width = 0.12;
      if (Math.abs(dist - radius) < width) {
        const s = (1 - age / 4500) * cw.intensity;
        const p = 1 - Math.abs(dist - radius) / width;
        total += s * p * Math.sin((dist - radius) * 18);
      }
    }
    return total;
  }

  function resize() {
    canvas.width  = section.offsetWidth;
    canvas.height = section.offsetHeight;
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    if (W === 0 || H === 0) return;

    time += 0.75 * 0.016;
    const now = Date.now();
    // prune old click waves
    for (let i = clickWaves.length - 1; i >= 0; i--) {
      if (now - clickWaves[i].time > 4500) clickWaves.splice(i, 1);
    }

    ctx.clearRect(0, 0, W, H);

    const cellW = W / GRID;
    const cellH = H / GRID;
    const fontSize = Math.min(cellW, cellH) * 0.72;
    ctx.font = `${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        const nx = (gx + 0.5) / GRID;
        const ny = (gy + 0.5) / GRID;

        let totalWave = 0;

        for (const wave of waves) {
          const dx = nx - wave.x, dy = ny - wave.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const falloff = 1 / (1 + dist * 3.5);
          totalWave += Math.sin(dist * wave.frequency * 55 - time * wave.speed + wave.phase)
                       * wave.amplitude * falloff;
        }

        // Mouse wave
        const mdx = nx - mouse.x, mdy = ny - mouse.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 0.35) {
          const eff = (1 - mDist / 0.35) * 0.85;
          totalWave += eff * Math.sin(time * 3.2);
        }

        totalWave += getClickInfluence(nx, ny, now);

        const norm = Math.max(0, Math.min(1, (totalWave + 2) / 4));

        // Only draw if wave is strong enough — keeps it sparse/airy
        if (Math.abs(totalWave) < 0.18) continue;

        const charIdx = Math.floor(norm * (CHARS.length - 1));
        const char = CHARS[charIdx] || CHARS[0];

        // Very passive: low max opacity so globe stays dominant
        // Slightly warmer color matching --ink-ghost / --ink-muted
        const opacity = (0.055 + norm * 0.085) * 0.9;
        ctx.fillStyle = `rgba(200,196,190,${opacity.toFixed(4)})`;
        ctx.fillText(char, (gx + 0.5) * cellW, (gy + 0.5) * cellH);
      }
    }
  }

  // ASCII-BG ebenfalls nur rendern wenn Section sichtbar
  let asciiBgVisible = false;
  new IntersectionObserver(
    ([entry]) => { asciiBgVisible = entry.isIntersecting; },
    { threshold: 0.01 }
  ).observe(section);

  function animate() {
    if (asciiBgVisible) draw();
    requestAnimationFrame(animate);
  }

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
  const line1      = document.getElementById('globeLine1');
  const line2      = document.getElementById('globeLine2');

  if (!section || !canvasWrap || !textLeft) return;

  const c01  = v => Math.max(0, Math.min(1, v));
  const eOut = t => 1 - Math.pow(1 - c01(t), 3);
  const ph   = (p, a, b) => eOut(c01((p - a) / (b - a)));

  gsap.set(canvasWrap, { x: 0, scale: 1, transformOrigin: 'center center' });
  gsap.set(textLeft,   { opacity: 0 });
  gsap.set([line1, line2], { y: '110%' });

  function getTargetX() {
    const vw         = window.innerWidth;
    const cw         = canvasWrap.offsetWidth;
    const scaledHalf = (cw * 1.18) / 2;
    let   target     = vw * 0.75;
    target = Math.min(target, vw - scaledHalf - 40);
    return target - vw / 2;
  }

  function applyProgress(p) {
    gsap.set(canvasWrap, {
      x:     ph(p, 0, 1.00) * getTargetX(),
      scale: 1 + ph(p, 0, 1.00) * 0.18,
    });
    gsap.set(textLeft, { opacity: ph(p, 0.45, 0.80) });
    gsap.set(line1,    { y: (1 - ph(p, 0.50, 0.85)) * 110 + '%' });
    gsap.set(line2,    { y: (1 - ph(p, 0.62, 1.00)) * 110 + '%' });
  }

  ScrollTrigger.create({
    trigger:       section,
    start:         'top top',
    end:           '+=100%',
    pin:           true,
    pinSpacing:    true,
    anticipatePin: 1,
    scrub:         true,
    onUpdate(self)  { applyProgress(self.progress); },
    onLeaveBack() {
      gsap.set(canvasWrap, { x: 0, scale: 1 });
      gsap.set(textLeft,   { opacity: 0 });
      gsap.set([line1, line2], { y: '110%' });
    },
  });
})();

/* ── Footer Name Banner: fit edge-to-edge ── */
(function () {
  function fitBanner() {
    const el = document.querySelector('.footer-name-text');
    if (!el) return;
    // reset so we can measure natural width
    el.style.transform = 'none';
    const naturalW = el.getBoundingClientRect().width;
    const viewW    = document.documentElement.clientWidth;
    const scale    = viewW / naturalW;
    // anchor left so it grows rightward
    el.style.transform = 'scaleX(' + scale + ')';
  }
  document.fonts.ready.then(fitBanner);
  window.addEventListener('resize', fitBanner);
})();