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

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;

  // DOT = instant (kein delay)
  gsap.set(cursorDot, {
    x: mouseX,
    y: mouseY
  });

  // RING = minimal smooth (weniger Verzögerung)
  gsap.to(cursorRing, {
    x: mouseX,
    y: mouseY,
    duration: 0.08,
    ease: 'power2.out'
  });
});

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

setTimeout(heroInit, 20);


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
    gsap.set([roleEl, designerEl], { x: 0, opacity: 1, filter: 'blur(0px)' });
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
    const sideBlur    = pA * 10;
    const sideOpacity = c01(1 - pA * 2.2);
    const roleTravelX     = -(cardRect.left + 200) * pA;
    const designerTravelX = (vw - cardRect.right + 200) * pA;

    gsap.set(roleEl, {
      x: roleTravelX,
      opacity: sideOpacity,
      filter: `blur(${sideBlur}px)`,
    });
    gsap.set(designerEl, {
      x: designerTravelX,
      opacity: sideOpacity,
      filter: `blur(${sideBlur}px)`,
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

      // Exit: scale weiter + blur + opacity weg — jedes Bild leicht versetzt
      const exitBlur    = pExit * 18;
      const exitScale   = zoomVal + pExit * 0.4;
      const exitOpacity = fadeIn * c01(1 - pExit * 1.8);

      gsap.set(item, {
        opacity: exitOpacity,
        scale:   exitScale,
        filter:  `blur(${exitBlur}px)`,
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
    gsap.set([roleEl, designerEl], { x: 0, opacity: 1, filter: 'blur(0px)' });
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

// ── Footer: editorial reveal ──
gsap.set('#footerTitle',        { y: '110%' });
gsap.set('#footerTitleOutline', { y: '110%' });

ScrollTrigger.create({
  trigger: '.footer',
  start: 'top 75%',
  once: true,
  onEnter() {
    const tl = gsap.timeline();
    tl.to('#footerTitle',           { y: '0%', duration: 1.4, ease: 'power4.out' })
      .to('#footerTitleOutline',    { y: '0%', duration: 1.6, ease: 'power4.out' }, 0.12)
      .to('#footerEmailCta',        { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out' }, 0.7)
      .to('.footer-social-links',   { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, 0.9)
      .to('.footer-bottom-mono',    { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.1);
  }
});




/* ============================
   FOOTER — EARTH GLOBE
   Photo texture always on — Metadaten-SVG immer sichtbar
   Kein Blueprint Easter Egg
============================ */
(function initFooterCharacter() {
  const container = document.getElementById('footerCanvas');
  if (!container || typeof THREE === 'undefined') return;

  const W = container.offsetWidth  || 480;
  const H = container.offsetHeight || 440;

  // ── Scene ──
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.insertBefore(renderer.domElement, container.querySelector('.footer-3d-label'));

  // ── Lights ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const keyLight = new THREE.DirectionalLight(0xaaccff, 1.1);
  keyLight.position.set(5, 3, 6);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x0033aa, 0.6);
  rimLight.position.set(-4, 1, -4);
  scene.add(rimLight);

  // ── Globe group ──
  const R = 1.5;
  const globe = new THREE.Group();
  scene.add(globe);

  // ── Earth sphere — Photo texture from the start ──
  const earthGeo = new THREE.SphereGeometry(R, 64, 64);
  const earthMat = new THREE.MeshStandardMaterial({
    color: 0x99bbdd,
    roughness: 1.0,
    metalness: 0.0,
    wireframe: false,
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  globe.add(earthMesh);

  // Load photo texture immediately
  const tl2 = new THREE.TextureLoader();
  tl2.crossOrigin = 'anonymous';
  tl2.load(
    'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/earth_atmos_2048.jpg',
    (tex) => { earthMat.map = tex; earthMat.needsUpdate = true; }
  );

  // ── Helper: lat/lon → 3D point (matches Three.js SphereGeometry convention) ──
  function latLonToVec3(latRad, lonRad, r) {
    return new THREE.Vector3(
       r * Math.cos(latRad) * Math.cos(lonRad),
       r * Math.sin(latRad),
      -r * Math.cos(latRad) * Math.sin(lonRad)
    );
  }

  // ── Lat / Lon grid lines — subtle for photo mode ──
  const gridMat = new THREE.LineBasicMaterial({
    color: 0x1a2d50, transparent: true, opacity: 0.45,
  });
  function addGridLine(points) {
    globe.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points), gridMat
    ));
  }
  // Latitude circles: every 30°
  [-60, -30, 0, 30, 60].forEach(latDeg => {
    const lr = latDeg * Math.PI / 180;
    const pts = [];
    for (let i = 0; i <= 72; i++) {
      const ln = (i / 72) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        R * Math.cos(lr) * Math.sin(ln),
        R * Math.sin(lr),
        R * Math.cos(lr) * Math.cos(ln)
      ));
    }
    addGridLine(pts);
  });
  // Longitude meridians: every 30°
  for (let lonDeg = 0; lonDeg < 360; lonDeg += 30) {
    const ln = lonDeg * Math.PI / 180;
    const pts = [];
    for (let i = 0; i <= 36; i++) {
      const lr = -Math.PI / 2 + (i / 36) * Math.PI;
      pts.push(new THREE.Vector3(
        R * Math.cos(lr) * Math.sin(ln),
        R * Math.sin(lr),
        R * Math.cos(lr) * Math.cos(ln)
      ));
    }
    addGridLine(pts);
  }

  // ── Country outlines — very dim under photo texture ──
  const countryMat = new THREE.LineBasicMaterial({
    color: 0x2a3a55, transparent: true, opacity: 0.2,
  });
  const countryGroup = new THREE.Group();
  globe.add(countryGroup);

  const RC = R + 0.006; // slightly above surface to avoid z-fighting

  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    .then(r => r.json())
    .then(world => {
      if (typeof topojson === 'undefined') return;
      const countries = topojson.feature(world, world.objects.countries);

      countries.features.forEach(feature => {
        const geom = feature.geometry;
        if (!geom) return;
        const polys = geom.type === 'Polygon'
          ? [geom.coordinates]
          : geom.type === 'MultiPolygon'
            ? geom.coordinates
            : [];

        polys.forEach(poly => {
          poly.forEach(ring => {
            if (ring.length < 2) return;
            const pts = ring.map(([lon, lat]) =>
              latLonToVec3(lat * Math.PI / 180, lon * Math.PI / 180, RC)
            );
            countryGroup.add(new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(pts),
              countryMat
            ));
          });
        });
      });
    })
    .catch(() => {}); // silently ignore CDN errors

  // ── Subtle atmosphere glow ──
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.045, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0x1155cc, transparent: true, opacity: 0.04, depthWrite: false,
    })
  ));
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.12, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0x0a2a77, transparent: true, opacity: 0.03,
      side: THREE.BackSide, depthWrite: false,
    })
  ));

  // ── Salzburg pin  (lat 47.8°N  lon 13.05°E) ──
  const SALZ_LAT_RAD = 47.8  * Math.PI / 180;
  const SALZ_LON_RAD = 13.05 * Math.PI / 180;

  const pinPos  = latLonToVec3(SALZ_LAT_RAD, SALZ_LON_RAD, R + 0.045);
  const outward = pinPos.clone().normalize();

  // Glowing dot — red for photo mode
  const pinDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xff2020, emissive: 0xff0000,
      emissiveIntensity: 1.8, roughness: 0.1,
    })
  );
  pinDot.position.copy(pinPos);
  globe.add(pinDot);

  // Inner pulse ring
  const ring1 = new THREE.Mesh(
    new THREE.RingGeometry(0.065, 0.10, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff3333, transparent: true, opacity: 0.7,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  ring1.position.copy(pinPos);
  ring1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), outward);
  globe.add(ring1);

  // Outer pulse ring
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(0.10, 0.145, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff4444, transparent: true, opacity: 0.3,
      side: THREE.DoubleSide, depthWrite: false,
    })
  );
  ring2.position.copy(pinPos);
  ring2.quaternion.copy(ring1.quaternion);
  globe.add(ring2);

  // Stem line from surface outward
  globe.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      pinPos.clone(),
      pinPos.clone().addScaledVector(outward, 0.18),
    ]),
    new THREE.LineBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.9 })
  ));

  // ── Base quaternion: Salzburg faces camera, North stays up ──
  const salzDir = latLonToVec3(SALZ_LAT_RAD, SALZ_LON_RAD, 1).normalize();
  const q1 = new THREE.Quaternion().setFromUnitVectors(salzDir, new THREE.Vector3(0, 0, 1));
  const northLocal = new THREE.Vector3(0, 1, 0);
  const northAfterQ1 = northLocal.clone().applyQuaternion(q1);
  const northScreenAngle = Math.atan2(northAfterQ1.x, northAfterQ1.y);
  const q2 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), northScreenAngle);
  const baseQuat = q2.multiply(q1);
  globe.quaternion.copy(baseQuat);

  // ── Hover label SVG overlay (Salzburg callout on hover) ──
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;opacity:0;transition:opacity 0.35s ease;';
  container.appendChild(svg);

  const svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  svgLine.setAttribute('stroke', 'rgba(255,80,80,0.5)');
  svgLine.setAttribute('stroke-width', '1');
  svgLine.setAttribute('stroke-dasharray', '4 3');
  svg.appendChild(svgLine);

  const svgDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  svgDot.setAttribute('r', '3');
  svgDot.setAttribute('fill', '#ff4444');
  svg.appendChild(svgDot);

  const svgText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  svgText.setAttribute('fill', 'rgba(255,120,120,0.85)');
  svgText.setAttribute('font-family', 'DM Mono, monospace');
  svgText.setAttribute('font-size', '9');
  svgText.setAttribute('letter-spacing', '0.2em');
  svgText.setAttribute('text-anchor', 'start');
  svgText.setAttribute('dominant-baseline', 'middle');
  svgText.textContent = 'Standort: Salzburg';
  svg.appendChild(svgText);

  let isHoveringGlobe = false;
  container.style.pointerEvents = 'auto';
  container.addEventListener('mouseenter', () => {
    isHoveringGlobe = true;
    svg.style.opacity = '1';
  });
  container.addEventListener('mouseleave', () => {
    isHoveringGlobe = false;
    svg.style.opacity = '0';
  });

  function projectToScreen(worldPos) {
    const v = worldPos.clone().project(camera);
    const rect = container.getBoundingClientRect();
    const x = (v.x * 0.5 + 0.5) * rect.width;
    const y = (-v.y * 0.5 + 0.5) * rect.height;
    return { x, y };
  }

  // ── Cursor look-at ──
  let tRotY = 0, tRotX = 0;
  let cRotY = 0, cRotX = 0;

  window.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (window.innerWidth  / 2);
    const dy = (e.clientY - cy) / (window.innerHeight / 2);
    tRotY =  dx * 0.52;
    tRotX =  dy * 0.22;
  });

  // ── Metadaten-SVG — immer sichtbar ──
  const bpSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  bpSvg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;opacity:1;z-index:20;';
  container.appendChild(bpSvg);

  function bpEl(tag, attrs) {
    const ns = 'http://www.w3.org/2000/svg';
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    return el;
  }

  function buildMetadata() {
    bpSvg.innerHTML = '';
    const cW = container.offsetWidth, cH = container.offsetHeight;
    const cx = cW / 2, cy = cH / 2;
    const r  = Math.min(cW, cH) * 0.34;
    const hi  = 'rgba(255,255,255,';
    const mid = 'rgba(200,200,200,';
    const lo  = 'rgba(130,130,130,';

    const add = (el) => bpSvg.appendChild(el);

    function ln(x1, y1, x2, y2, opacity = 0.4, dash = 'none', w = 1, col = lo) {
      add(bpEl('line', { x1, y1, x2, y2, stroke: `${col}${opacity})`, 'stroke-width': w, 'stroke-dasharray': dash }));
    }
    function tx(content, x, y, size = 8, opacity = 0.6, anchor = 'start', col = lo) {
      const el = bpEl('text', {
        x, y, fill: `${col}${opacity})`,
        'font-size': size, 'font-family': 'DM Mono,monospace',
        'letter-spacing': '0.18em', 'text-anchor': anchor, 'dominant-baseline': 'middle'
      });
      el.textContent = content;
      add(el);
    }
    function tick(x, y, len = 6, col = mid) {
      ln(x, y - len / 2, x, y + len / 2, 0.8, 'none', 1, col);
    }

    // ── Equator dashed line ──
    ln(cx - r - 44, cy, cx + r + 44, cy, 0.08, '3 6', 1, lo);
    tx('ÄQUATOR', cx + r + 50, cy, 6, 0.2, 'start', lo);

    // ── Horizontal diameter dimension ──
    const dimY = cy + r + 36;
    ln(cx - r, cy, cx - r, dimY + 6, 0.2, '2 4', 1, lo);
    ln(cx + r, cy, cx + r, dimY + 6, 0.2, '2 4', 1, lo);
    ln(cx - r - 8, dimY, cx + r + 8, dimY, 0.6, 'none', 1, mid);
    tick(cx - r, dimY); tick(cx + r, dimY);
    tx('Ø 12,742 KM', cx, dimY + 13, 8, 0.8, 'middle', hi);

    // ── Right vertical radius dimension ──
    const rdimX = cx + r + 50;
    ln(cx + r, cy - r, rdimX + 6, cy - r, 0.18, '2 4', 1, lo);
    ln(cx + r, cy, rdimX + 6, cy, 0.18, '2 4', 1, lo);
    ln(rdimX, cy - r - 8, rdimX, cy + 8, 0.45, 'none', 1, mid);
    tick(rdimX, cy - r); tick(rdimX, cy);
    tx('R 6,371 KM', rdimX + 7, cy - r / 2, 6.5, 0.45, 'start', mid);

    // ── Circumference annotation (left) ──
    const ldimX = cx - r - 50;
    ln(cx - r, cy - r, ldimX - 6, cy - r, 0.15, '2 4', 1, lo);
    ln(cx - r, cy + r, ldimX - 6, cy + r, 0.15, '2 4', 1, lo);
    ln(ldimX, cy - r - 8, ldimX, cy + r + 8, 0.35, 'none', 1, lo);
    tick(ldimX, cy - r, 6, lo); tick(ldimX, cy + r, 6, lo);
    tx('UMFANG 40,075 KM', ldimX - 7, cy, 6.5, 0.38, 'end', mid);

    // ── Data block (bottom-left) ──
    const dbX = 24, dbY = cH - 86;
    ln(dbX, dbY - 14, dbX + 210, dbY - 14, 0.08, 'none', 1, lo);
    [
      ['MASSE',       '5.972 × 10²⁴ KG', hi,  0.7],
      ['OBERFLÄCHE',  '510,072,000 KM²',  mid, 0.5],
      ['ALTER',       '4.543 × 10⁹ J.',   mid, 0.5],
      ['NEIGUNG',     '23.44°',           mid, 0.5],
    ].forEach(([k, v, col, op], i) => {
      tx(k,           dbX,       dbY + i * 14, 6,   op * 0.55, 'start', lo);
      tx(v,           dbX + 96,  dbY + i * 14, 6.5, op,        'start', col);
    });
  }

  // Build metadata annotations immediately and on resize
  buildMetadata();

  // ── Animation loop ──
  let clock = 0;
  const _qCursor = new THREE.Quaternion();
  const _euler   = new THREE.Euler(0, 0, 0, 'YXZ');

  function tick() {
    requestAnimationFrame(tick);
    clock += 0.01;

    cRotY += (tRotY - cRotY) * 0.055;
    cRotX += (tRotX - cRotX) * 0.055;

    _euler.set(cRotX, cRotY, 0, 'YXZ');
    _qCursor.setFromEuler(_euler);
    globe.quaternion.copy(_qCursor).multiply(baseQuat);

    // ── Update SVG hover label ──
    if (isHoveringGlobe) {
      const pinWorld = pinPos.clone().applyQuaternion(globe.quaternion);
      pinWorld.y += globe.position.y;
      const pinScreen = projectToScreen(pinWorld);
      const labelX = pinScreen.x + 55;
      const labelY = pinScreen.y - 30;
      svgLine.setAttribute('x1', pinScreen.x);
      svgLine.setAttribute('y1', pinScreen.y);
      svgLine.setAttribute('x2', labelX - 6);
      svgLine.setAttribute('y2', labelY);
      svgDot.setAttribute('cx', pinScreen.x);
      svgDot.setAttribute('cy', pinScreen.y);
      svgText.setAttribute('x', labelX);
      svgText.setAttribute('y', labelY);
    }

    // Gentle idle float
    globe.position.y = Math.sin(clock * 0.75) * 0.042;

    // Alternating pulse on rings
    const p1 = 0.5 + 0.5 * Math.sin(clock * 2.8);
    const p2 = 0.5 + 0.5 * Math.sin(clock * 2.8 + Math.PI);
    ring1.material.opacity = 0.2 + 0.6 * p1;
    ring1.scale.setScalar(1 + 0.35 * p1);
    ring2.material.opacity = 0.06 + 0.28 * p2;
    ring2.scale.setScalar(1 + 0.55 * p2);
    pinDot.material.emissiveIntensity = 1.4 + 0.6 * Math.sin(clock * 3.2);

    renderer.render(scene, camera);
  }
  tick();

  // ── Resize — debounced ──
  let resizeTimer = null;
  let lastW = W, lastH = H;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const nW = container.offsetWidth;
      const nH = container.offsetHeight;
      if (Math.abs(nW - lastW) < 4 && Math.abs(nH - lastH) < 4) return;
      lastW = nW; lastH = nH;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
      buildMetadata();
    }, 150);
  });
  ro.observe(container);
})();

/* ============================
   FOOTER — STARFIELD + MOON
============================ */
(function initStarfield() {
  const canvas = document.getElementById('footerStars');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    draw();
  }

  // Generate stars once
  const STAR_COUNT = 320;
  const stars = Array.from({ length: STAR_COUNT }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: Math.random() * 0.9 + 0.15,
    o: Math.random() * 0.5 + 0.15,
    // subtle twinkle phase
    phase: Math.random() * Math.PI * 2,
    speed: 0.004 + Math.random() * 0.006,
  }));

  // Moon position — far top-right, subtle
  const MOON = { x: 0.82, y: 0.14, r: 28 };

  let frame = 0;

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // ── Stars ──
    stars.forEach(s => {
      const twinkle = 0.75 + 0.25 * Math.sin(s.phase + frame * s.speed);
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${(s.o * twinkle).toFixed(3)})`;
      ctx.fill();
    });

    // ── Moon — very distant, desaturated ──
    const mx = MOON.x * W, my = MOON.y * H, mr = MOON.r;

    // Soft glow halo
    const glow = ctx.createRadialGradient(mx, my, mr * 0.6, mx, my, mr * 2.8);
    glow.addColorStop(0, 'rgba(200,210,230,0.07)');
    glow.addColorStop(1, 'rgba(200,210,230,0)');
    ctx.beginPath();
    ctx.arc(mx, my, mr * 2.8, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    // Moon disc
    const moonGrad = ctx.createRadialGradient(mx - mr * 0.25, my - mr * 0.2, mr * 0.1, mx, my, mr);
    moonGrad.addColorStop(0, 'rgba(215,220,230,0.55)');
    moonGrad.addColorStop(0.6, 'rgba(170,178,195,0.38)');
    moonGrad.addColorStop(1, 'rgba(100,110,130,0.12)');
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = moonGrad;
    ctx.fill();

    // Shadow crescent — slightly offset dark circle
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const shadowGrad = ctx.createRadialGradient(mx + mr * 0.38, my, mr * 0.1, mx + mr * 0.38, my, mr);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.72)');
    shadowGrad.addColorStop(0.55, 'rgba(0,0,0,0.55)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(mx + mr * 0.38, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad;
    ctx.fill();
    ctx.restore();
  }

  function animate() {
    frame++;
    draw();
    requestAnimationFrame(animate);
  }

  window.addEventListener('resize', resize);
  resize();
  animate();
})();

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

  // ── DOT GRID ──
  const RC = R + 0.008;
  const DOT_ROWS = 160;
  const dotGeo = new THREE.SphereGeometry(0.010, 5, 5);

  let dotMesh   = null;
  let dotCount  = 0;
  // Per-dot local positions (in globe-local space) — for proximity calc
  const dotLocalPos = [];

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
    const positions = [];
    for (let row = 0; row < DOT_ROWS; row++) {
      const lat    = -90 + (180 / DOT_ROWS) * (row + 0.5);
      const latRad = lat * Math.PI / 180;
      const dotsInRow = Math.max(1, Math.round(DOT_ROWS * 2 * Math.cos(latRad)));
      for (let col = 0; col < dotsInRow; col++) {
        const lon    = -180 + (360 / dotsInRow) * (col + 0.5);
        const lonRad = lon * Math.PI / 180;
        if (isLand(lat, lon, features)) {
          const pos = new THREE.Vector3(
            RC * Math.cos(latRad) * Math.cos(lonRad),
            RC * Math.sin(latRad),
           -RC * Math.cos(latRad) * Math.sin(lonRad)
          );
          positions.push(pos);
          dotLocalPos.push(pos);
        }
      }
    }
    if (!positions.length) return;
    dotCount = positions.length;

    // MeshBasicMaterial with white color — no vertexColors trick needed
    // We swap to InstancedMesh and use setColorAt (r128-safe way)
    dotMesh = new THREE.InstancedMesh(
      dotGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      dotCount
    );

    const dummy = new THREE.Object3D();
    const white = new THREE.Color(0xffffff);
    positions.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      dummy.updateMatrix();
      dotMesh.setMatrixAt(i, dummy.matrix);
      dotMesh.setColorAt(i, white);  // initializes instanceColor buffer correctly
    });
    dotMesh.instanceMatrix.needsUpdate = true;
    dotMesh.instanceColor.needsUpdate  = true;
    globe.add(dotMesh);
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

  // ── Mouse state ──
  let tRotY = 0, tRotX = 0, cRotY = 0, cRotX = 0;
  const globeSection = container.closest('.globe-section') || container.parentElement;

  // Raycaster for dot proximity
  const raycaster  = new THREE.Raycaster();
  const mouseNDC   = new THREE.Vector2(0, 0);
  const _rayOrigin = new THREE.Vector3();
  const _rayDir    = new THREE.Vector3();
  const _worldPos  = new THREE.Vector3();
  const _closest   = new THREE.Vector3();
  const _tmp       = new THREE.Vector3();

  window.addEventListener('mousemove', (e) => {
    // Tilt: use section coords
    const secRect = globeSection ? globeSection.getBoundingClientRect() : container.getBoundingClientRect();
    tRotY = ((e.clientX - secRect.left) / secRect.width  * 2 - 1) * 0.35;
    tRotX = ((e.clientY - secRect.top)  / secRect.height * 2 - 1) * 0.18;

    // Dot interaction: use canvas coords
    const canRect = container.getBoundingClientRect();
    mouseNDC.x =  (e.clientX - canRect.left) / canRect.width  * 2 - 1;
    mouseNDC.y = -((e.clientY - canRect.top)  / canRect.height * 2 - 1);
  }, { passive: true });

  // ── Interactive dots: color per-instance based on ray proximity ──
  // Influence radius in local globe units
  const DOT_INFLUENCE = 0.45;
  const COLOR_BASE    = new THREE.Color(0xffffff);       // resting white
  const COLOR_HOT     = new THREE.Color(0xff4040);       // close — red accent
  const COLOR_WARM    = new THREE.Color(0xffddcc);       // mid — warm tint
  const _col          = new THREE.Color();

  function updateDotColors() {
    if (!dotMesh || !dotMesh.instanceColor || dotCount === 0) return;

    raycaster.setFromCamera(mouseNDC, camera);
    _rayOrigin.copy(raycaster.ray.origin);
    _rayDir.copy(raycaster.ray.direction);

    // Transform ray into globe-local space so we don't move every dot to world space
    const invQuat = globe.quaternion.clone().invert();
    _rayOrigin.sub(globe.position).applyQuaternion(invQuat);
    _rayDir.applyQuaternion(invQuat).normalize();

    for (let i = 0; i < dotCount; i++) {
      const pos = dotLocalPos[i];
      _tmp.subVectors(pos, _rayOrigin);
      const t = Math.max(0, _tmp.dot(_rayDir));
      _closest.copy(_rayOrigin).addScaledVector(_rayDir, t);
      const dist = pos.distanceTo(_closest);

      if (dist < DOT_INFLUENCE) {
        const t01 = 1 - dist / DOT_INFLUENCE;
        if (t01 > 0.65) {
          _col.lerpColors(COLOR_WARM, COLOR_HOT, (t01 - 0.65) / 0.35);
        } else {
          _col.lerpColors(COLOR_BASE, COLOR_WARM, t01 / 0.65);
        }
      } else {
        _col.copy(COLOR_BASE);
      }
      dotMesh.setColorAt(i, _col);
    }
    dotMesh.instanceColor.needsUpdate = true;
  }

  // ── Animation loop ──
  let clockS = 0;
  const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  const _q     = new THREE.Quaternion();

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
    [svgLine, svgBadge, svgText, svgAccentDot].forEach(el => el.style.opacity = String(vis));
  }

  (function tick() {
    requestAnimationFrame(tick);
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

    updateDotColors();
    projectPin();
    renderer.render(scene, camera);
  })();
})();