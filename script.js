/* ============================
   PAGE LOADER
============================ */
(function initLoader() {
  const loader  = document.getElementById('pageLoader');
  const bar     = document.getElementById('loaderBar');
  const pct     = document.getElementById('loaderPercent');
  if (!loader) return;

  document.documentElement.style.overflow = 'hidden';

  let progress = 0;
  let done     = false;

  function setProgress(p) {
    progress = Math.min(100, Math.max(progress, p));
    if (bar) bar.style.width = progress + '%';
    if (pct) pct.textContent = Math.floor(progress);
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
    }, 250);
  }

  let trickle = 0;
  const trickleInterval = setInterval(() => {
    trickle += Math.random() * 12;
    if (trickle >= 80) { trickle = 80; clearInterval(trickleInterval); }
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
        setTimeout(hideLoader, 180);
      });
    });
  }
})();

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
   CUSTOM CURSOR
============================ */
const cursorDot  = document.getElementById('cursorDot');
const cursorRing = document.getElementById('cursorRing');

gsap.set([cursorDot, cursorRing], { xPercent: -50, yPercent: -50 });

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

gsap.set(cursorDot,  { x: mouseX, y: mouseY });
gsap.set(cursorRing, { x: mouseX, y: mouseY });

const setDotX  = gsap.quickSetter(cursorDot,  'x', 'px');
const setDotY  = gsap.quickSetter(cursorDot,  'y', 'px');
const setRingX = gsap.quickSetter(cursorRing, 'x', 'px');
const setRingY = gsap.quickSetter(cursorRing, 'y', 'px');

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

document.addEventListener('mouseleave', () => {
  gsap.to([cursorDot, cursorRing], { opacity: 0, duration: 0.2 });
});

document.addEventListener('mouseenter', () => {
  gsap.to([cursorDot, cursorRing], { opacity: 1, duration: 0.2 });
});

/* ============================
   HERO — Reveal
============================ */
const heroInit = () => {
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
  window.addEventListener('resize', fitFullname);

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
  const designerEl = document.getElementById('heroDesignerCompat');
  const panel      = document.getElementById('mainContent');
  const zpStage    = document.getElementById('heroParallaxStage');
  const zpItems    = zpStage ? [...zpStage.querySelectorAll('.hero-parallax-item')] : [];

  if (!hero || !roleEl || !designerEl || !panel || !imgCard || !nameEl) return;

  const c01 = v => Math.max(0, Math.min(1, v));
  const eIO = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const ph  = (p, a, b, easeFn) => {
    const t = c01((p - a) / (b - a));
    return easeFn ? easeFn(t) : t;
  };

  let cardRect = null;
  let pinLeft  = false;

  function measure() {
    gsap.set([roleEl, designerEl], { opacity: 1, y: 0 });
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
    const letters = nameEl.querySelectorAll('.nl:not(.nl--space)');
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

    const subtitleEl = document.querySelector('.hero-subtitle');
    if (subtitleEl) gsap.set(subtitleEl, {
      y:       -pA * 30,
      opacity: c01(1 - pA * 3.5),
      filter:  `blur(${pA * 8}px)`,
    });

    gsap.set(roleEl,     { opacity: 1 });
    gsap.set(designerEl, { opacity: 1 });

    // Phase B — parallax photos
    const pB        = ph(p, 0.35, 0.78, eIO);
    const pCardZoom = ph(p, 0.78, 1.00, eIO);

    const imgCardFadeIn = c01(ph(p, 0.35, 0.55));
    const cardW    = imgCard.offsetWidth || window.innerWidth * 0.26;
    const maxScale = Math.max(window.innerWidth / cardW, window.innerHeight / (cardW * 0.5625));
    const cardZoom = 1 + pA * 0.05 + pCardZoom * (maxScale - 1.05);
    gsap.set(imgCard, { scale: cardZoom, opacity: imgCardFadeIn, xPercent: -50, transformOrigin: '50% 50%' });

    const heroImgWrap = imgCard.querySelector('.hero-img-wrap');
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

    zpItems.forEach((item) => {
      const targetScale = parseFloat(item.dataset.scale) || 1.5;
      const delay       = parseFloat(item.dataset.delay) || 0;

      const itemP   = c01((pB - delay) / (1 - delay));
      const fadeIn  = c01(itemP * 4);
      const zoomVal = 1 + itemP * (targetScale - 1);
      const exitScale   = zoomVal + pExit * 0.4;
      const exitOpacity = fadeIn * c01(1 - pExit * 1.8);

      gsap.set(item, { opacity: exitOpacity, scale: exitScale });

      const wrap = item.querySelector('.hero-parallax-wrap');
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
    gsap.set(nameEl, { opacity: 1, clearProps: 'filter' });
    const letters = nameEl.querySelectorAll('.nl:not(.nl--space)');
    letters.forEach(el => gsap.set(el, { y: 0, opacity: 1, filter: 'none' }));
    gsap.set([roleEl, designerEl], { opacity: 1 });
    gsap.set(imgCard, { opacity: 0, xPercent: -50, scale: 1 });
    const subtitleEl = document.querySelector('.hero-subtitle');
    if (subtitleEl) gsap.set(subtitleEl, { y: 0, opacity: 1, filter: 'blur(0px)' });
    zpItems.forEach(item => gsap.set(item, { opacity: 0, scale: 1 }));
    const heroImgWrap = imgCard.querySelector('.hero-img-wrap');
    if (heroImgWrap) heroImgWrap.classList.remove('is-revealed');
    zpItems.forEach(item => {
      const wrap = item.querySelector('.hero-parallax-wrap');
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
  window.addEventListener('resize', () => { measure(); ScrollTrigger.refresh(); });
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
  function projectPoint(localPos) {
    _projVec.copy(localPos).applyQuaternion(globe.quaternion);
    const facing = _projVec.z > 0;
    const projected = _projVec.clone().project(camera);
    return {
      nx: projected.x * 0.5 + 0.5,
      ny: -projected.y * 0.5 + 0.5,
      facing,
      depth: projected.z,
    };
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
  const ph   = (p, a, b) => eOut(c01((p - a) / (b - a)));

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
    gsap.set(canvasWrap, { x: ph(p, 0.00, 1.00) * getTargetX(), scale: 1 + ph(p, 0.00, 1.00) * 0.18 });
    gsap.set(textLeft, { opacity: ph(p, 0.60, 0.90) });
    gsap.set(line1,    { y: (1 - ph(p, 0.65, 0.92)) * 110 + '%' });
    contactItems.forEach((item, i) => {
      const start = 0.72 + i * 0.055;
      const t     = ph(p, start, start + 0.18);
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
    scrub:         2.5,
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