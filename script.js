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

/* ============================
   HERO — CINEMATIC REVEAL (NEW)
============================ */

// ── Font load guard ──
const heroInit = () => {
  const heroTL = gsap.timeline({ delay: 0 });

  // Set initial states
  gsap.set('#heroNameBig',    { y: '110%' });
  gsap.set('#heroNameOutline',{ y: '110%' });
  gsap.set('#heroSurname',    { y: '110%' });
  gsap.set('#heroEyebrow',    { opacity: 0, y: 16 });
  gsap.set('#heroSubRow',     { opacity: 0, y: 24 });
  gsap.set('#heroScroll',     { opacity: 0 });
  gsap.set('#heroBadge',      { opacity: 0, y: 12 });

  heroTL
    // Eyebrow slides in
    .to('#heroEyebrow', {
      opacity: 1, y: 0,
      duration: 1.0,
      ease: 'power3.out'
    })

    // JACOB fills in — mask reveal
    .to('#heroNameBig', {
      y: '0%',
      duration: 1.4,
      ease: 'power4.out'
    }, 0.2)

    // Outline offset slightly after
    .to('#heroNameOutline', {
      y: '0%',
      duration: 1.6,
      ease: 'power4.out'
    }, 0.35)

    // WEISSENBÄCK rises
    .to('#heroSurname', {
      y: '0%',
      duration: 1.4,
      ease: 'power4.out'
    }, 0.55)

    // Subtitle row
    .to('#heroSubRow', {
      opacity: 1, y: 0,
      duration: 0.9,
      ease: 'power3.out'
    }, 0.9)

    // Scroll + Badge
    .to(['#heroScroll', '#heroBadge'], {
      opacity: 1, y: 0,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out'
    }, 1.3);
};

// Run after a minimal delay (font safety)
setTimeout(heroInit, 20);

/* ── MAGNETIC CTA ── */
const ctaBtn = document.getElementById('heroCTA');
if (ctaBtn) {
  ctaBtn.addEventListener('mousemove', (e) => {
    const rect = ctaBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    gsap.to(ctaBtn, {
      x: dx * 10,
      y: dy * 6,
      duration: 0.5,
      ease: 'power2.out'
    });

    // Update gradient position
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top)  / rect.height) * 100;
    ctaBtn.style.setProperty('--mx', `${px}%`);
    ctaBtn.style.setProperty('--my', `${py}%`);
  });

  ctaBtn.addEventListener('mouseleave', () => {
    gsap.to(ctaBtn, {
      x: 0, y: 0,
      duration: 0.8,
      ease: 'elastic.out(1, 0.5)'
    });
  });
}

/* ── HERO PARALLAX ON SCROLL ── */
const heroEl = document.getElementById('hero');
ScrollTrigger.create({
  trigger: heroEl,
  start: 'top top',
  end: 'bottom top',
  onUpdate: (self) => {
    const p = self.progress;
    gsap.set('#heroNameBig',  { y: `${p * -60}px`, opacity: 1 - p * 1.4 });
    gsap.set('#heroSurname',  { y: `${p * -40}px`, opacity: 1 - p * 1.6 });
    gsap.set('#heroSubRow',   { y: `${p * -30}px`, opacity: 1 - p * 1.8 });
    gsap.set('#heroEyebrow',  { y: `${p * -20}px`, opacity: 1 - p * 2.2 });
  }
});

/* ── MOUSE PARALLAX on hero orbs ── */
document.addEventListener('mousemove', (e) => {
  if (!heroEl) return;
  const rect = heroEl.getBoundingClientRect();
  if (e.clientY > rect.bottom) return;

  const cx = rect.width / 2;
  const cy = rect.height / 2;
  const dx = (e.clientX - rect.left - cx) / cx;
  const dy = (e.clientY - rect.top  - cy) / cy;

  gsap.to('.hero-orb--1', { x: dx * 40, y: dy * 30, duration: 2.0, ease: 'power2.out', overwrite: 'auto' });
  gsap.to('.hero-orb--2', { x: dx * -30, y: dy * -20, duration: 2.4, ease: 'power2.out', overwrite: 'auto' });
  gsap.to('.hero-orb--3', { x: dx * 20, y: dy * 25, duration: 1.8, ease: 'power2.out', overwrite: 'auto' });
});



/* ============================
   NAV — Float pill init + scroll hide/show
============================ */
// Center the pill via GSAP (so y-animation doesn't fight CSS translateX)
gsap.set('#mainNav', { xPercent: -50 });

let navVisible = true;

lenis.on('scroll', ({ scroll, direction }) => {
  if (direction === 1 && scroll > 80 && navVisible) {
    gsap.to('#mainNav', {
      y: -80,
      opacity: 0,
      duration: 0.45,
      ease: 'power3.in'
    });
    navVisible = false;
  } else if (direction === -1 && !navVisible) {
    gsap.to('#mainNav', {
      y: 0,
      opacity: 1,
      duration: 0.65,
      ease: 'power3.out'
    });
    navVisible = true;
  }
});

/* ============================
   PROJECT HOVER PREVIEW
============================ */
const preview      = document.getElementById('projectPreview');
const previewImg   = document.getElementById('previewImg');
const previewLabel = document.getElementById('previewLabel');

// Initial hidden state
gsap.set(preview, { opacity: 0, scale: 0.9, xPercent: -50, yPercent: -50 });

let previewX   = 0, previewY = 0;
let targetX    = 0, targetY  = 0;
let isHovering = false;
let activeRow  = null;
let rafId      = null;

const OFFSET_X =  30;
const OFFSET_Y = -150;

function lerpVal(a, b, t) { return a + (b - a) * t; }

function tickPreview() {
  if (!isHovering) { rafId = null; return; }

  const pw = preview.offsetWidth  / 2;
  const ph = preview.offsetHeight / 2;
  // Clamp so preview stays on screen
  targetX = Math.min(Math.max(mouseX + OFFSET_X, pw + 8), window.innerWidth  - pw - 8);
  targetY = Math.min(Math.max(mouseY + OFFSET_Y, ph + 8), window.innerHeight - ph - 8);

  previewX = lerpVal(previewX, targetX, 0.11);
  previewY = lerpVal(previewY, targetY, 0.11);

  gsap.set(preview, { x: previewX, y: previewY });
  rafId = requestAnimationFrame(tickPreview);
}

function showPreview(row) {
  if (activeRow === row) return;
  activeRow = row;

  previewImg.src           = row.dataset.img;
  previewLabel.textContent = row.dataset.label;

  // Snap to current mouse immediately (no fly-in from stale position)
  const pw = preview.offsetWidth  / 2;
  const ph = preview.offsetHeight / 2;
  previewX = Math.min(Math.max(mouseX + OFFSET_X, pw + 8), window.innerWidth  - pw - 8);
  previewY = Math.min(Math.max(mouseY + OFFSET_Y, ph + 8), window.innerHeight - ph - 8);
  gsap.set(preview, { x: previewX, y: previewY });

  isHovering = true;
  if (!rafId) rafId = requestAnimationFrame(tickPreview);

  gsap.killTweensOf(preview);
  gsap.to(preview, {
    opacity: 1, scale: 1, rotate: -1.5,
    duration: 0.45, ease: 'power3.out',
  });
}

function hidePreview() {
  if (!activeRow) return;
  activeRow  = null;
  isHovering = false;

  gsap.killTweensOf(preview);
  gsap.to(preview, {
    opacity: 0, scale: 0.9, rotate: 0,
    duration: 0.35, ease: 'power2.in',
    onComplete: () => { rafId = null; },
  });
}

document.querySelectorAll('.project-row').forEach(row => {
  row.addEventListener('mouseenter', () => showPreview(row));
  row.addEventListener('mouseleave', hidePreview);
});

/* ============================
   SLOT MACHINE TEXT SCRAMBLE
   Only 2–3 random chars, done in ~300ms
============================ */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789·—';

function scrambleTitle(el) {
  if (!el.dataset.original) el.dataset.original = el.textContent.trim();
  const original = el.dataset.original;
  clearInterval(el._slot);

  // Pick 2–3 random non-space character indices
  const eligible = [];
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== ' ') eligible.push(i);
  }
  const pickCount = Math.min(3, Math.max(2, Math.floor(eligible.length * 0.35)));
  const scramblePos = new Set(
    eligible.sort(() => Math.random() - 0.5).slice(0, pickCount)
  );

  let frame = 0;
  const TOTAL = 12; // 12 × 25ms = 300ms

  el._slot = setInterval(() => {
    const chars = original.split('');
    scramblePos.forEach(i => {
      // Lock each scrambled char in during the last 2 frames
      if (frame < TOTAL - 2) {
        chars[i] = SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }
    });
    el.textContent = chars.join('');
    frame++;

    if (frame >= TOTAL) {
      clearInterval(el._slot);
      el.textContent = original;
    }
  }, 25);
}

function restoreTitle(el) {
  clearInterval(el._slot);
  if (el.dataset.original) el.textContent = el.dataset.original;
}

document.querySelectorAll('.project-title').forEach(title => {
  const row = title.closest('.project-row');
  row.addEventListener('mouseenter', () => scrambleTitle(title));
  row.addEventListener('mouseleave', () => restoreTitle(title));
});

document.querySelectorAll('.social-link').forEach(link => {
  const nameEl = link.querySelector('.social-name');
  if (nameEl) {
    link.addEventListener('mouseenter', () => scrambleTitle(nameEl));
    link.addEventListener('mouseleave', () => restoreTitle(nameEl));
  }
});

const footerLocation = document.querySelector('.footer-link:last-child');

if (footerLocation) {
  footerLocation.addEventListener('click', () => {
    // Quick Salzburg fact
    const facts = [
      '🏰 Heimat der Festung Hohensalzburg',
      '🎵 Geburtsstadt Mozarts',
      '🏔️ Tor zu den Alpen'
    ];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    footerLocation.textContent = randomFact;
    setTimeout(() => {
      footerLocation.textContent = 'Salzburg, Österreich';
    }, 2000);
  });
}

// Subtle cursor interaction on footer logo
const footerLogo = document.querySelector('.footer-logo');
if (footerLogo) {
  footerLogo.addEventListener('mouseenter', () => {
    gsap.to(footerLogo, { scale: 1.02, duration: 0.3, ease: 'power2.out' });
  });
  footerLogo.addEventListener('mouseleave', () => {
    gsap.to(footerLogo, { scale: 1, duration: 0.3, ease: 'power2.out' });
  });
}

/* ============================
   EASTER EGG — hover "Design" in hero title
   Shows a spellcheck-style popup: "Design" → crossed out → "Feeling."
============================ */
const designWord = document.getElementById('designWord');

if (designWord) {
  // Build popup once, attach to body so it escapes any overflow:hidden
  const eggPopup = document.createElement('div');
  eggPopup.className = 'design-egg-popup';
  eggPopup.innerHTML = `
    Did you mean: <span class="egg-correction">Design</span>
    <span class="egg-suggestion">Feeling.</span>
  `;
  document.body.appendChild(eggPopup);

  designWord.addEventListener('mouseenter', () => {
    designWord.classList.add('is-hovered');
    const rect = designWord.getBoundingClientRect();
    eggPopup.style.left = rect.left + 'px';
    eggPopup.style.top  = (rect.bottom + 10) + 'px';
    eggPopup.classList.add('is-visible');
  });

  designWord.addEventListener('mouseleave', () => {
    designWord.classList.remove('is-hovered');
    eggPopup.classList.remove('is-visible');
  });
}

const footerEggTrigger = document.getElementById('footerEggTrigger');
if (footerEggTrigger) {
  const footerEgg = document.createElement('div');
  footerEgg.className = 'footer-egg-popup';
  footerEgg.textContent = 'Dann Schreib mir';
  footerEggTrigger.appendChild(footerEgg);

  // Create sparkle particles
  const sparkles = [];
  const sparkleChars = ['*', '+', '·', '✦', '✧', '✩'];

  for (let i = 0; i < 6; i++) {
    const sparkle = document.createElement('div');
    sparkle.className = 'sparkle';
    sparkle.textContent = sparkleChars[i];
    footerEgg.appendChild(sparkle);
    sparkles.push(sparkle);
  }

  footerEggTrigger.addEventListener('mouseenter', () => {
    footerEggTrigger.classList.add('is-hovered');
    footerEgg.classList.add('is-visible');

    // Trigger sparkle animation
    sparkles.forEach((sparkle, index) => {
      setTimeout(() => {
        sparkle.style.animation = 'none';
        sparkle.offsetHeight; // Trigger reflow
        sparkle.style.animation = 'sparkleFade 1.2s ease-out forwards';
      }, index * 100);
    });
  });

  footerEggTrigger.addEventListener('mouseleave', () => {
    footerEggTrigger.classList.remove('is-hovered');
    footerEgg.classList.remove('is-visible');

    // Reset sparkle animations
    sparkles.forEach(sparkle => {
      sparkle.style.animation = 'none';
    });
  });
}

/* ============================
   MARQUEE SKILLS HOVER
   Shows "meine skills" popup that follows mouse
============================ */
const marqueeWrap = document.querySelector('.marquee-wrap');

if (marqueeWrap) {
  // Build popup once, attach to body
  const skillsPopup = document.createElement('div');
  skillsPopup.className = 'design-egg-popup';
  skillsPopup.innerHTML = `
    Did you mean: <span class="egg-correction">Skills</span>
    <span class="egg-suggestion">meine skills</span>
  `;
  document.body.appendChild(skillsPopup);

  // Mouse tracking variables
  let skillsX = 0, skillsY = 0;
  let skillsTargetX = 0, skillsTargetY = 0;
  let skillsHovering = false;
  let skillsRafId = null;

  function lerpVal(a, b, t) { return a + (b - a) * t; }

  function tickSkills() {
    if (!skillsHovering) { skillsRafId = null; return; }

    const sw = skillsPopup.offsetWidth  / 2;
    const sh = skillsPopup.offsetHeight / 2;
    // Clamp so popup stays on screen
    skillsTargetX = Math.min(Math.max(mouseX + 20, sw + 8), window.innerWidth  - sw - 8);
    skillsTargetY = Math.min(Math.max(mouseY - 80, sh + 8), window.innerHeight - sh - 8);

    skillsX = lerpVal(skillsX, skillsTargetX, 0.15);
    skillsY = lerpVal(skillsY, skillsTargetY, 0.15);

    gsap.set(skillsPopup, { x: skillsX, y: skillsY });
    skillsRafId = requestAnimationFrame(tickSkills);
  }

  marqueeWrap.addEventListener('mouseenter', () => {
    // Snap to current mouse immediately
    const sw = skillsPopup.offsetWidth  / 2;
    const sh = skillsPopup.offsetHeight / 2;
    skillsX = Math.min(Math.max(mouseX + 20, sw + 8), window.innerWidth  - sw - 8);
    skillsY = Math.min(Math.max(mouseY - 80, sh + 8), window.innerHeight - sh - 8);
    gsap.set(skillsPopup, { x: skillsX, y: skillsY });

    skillsHovering = true;
    if (!skillsRafId) skillsRafId = requestAnimationFrame(tickSkills);

    gsap.killTweensOf(skillsPopup);
    gsap.to(skillsPopup, {
      opacity: 1, scale: 1,
      duration: 0.3,
      ease: 'power2.out'
    });
  });

  marqueeWrap.addEventListener('mouseleave', () => {
    skillsHovering = false;
    gsap.to(skillsPopup, {
      opacity: 0, scale: 0.95,
      duration: 0.25,
      ease: 'power2.out'
    });
  });
}

/* ============================
   PROJECTS TOGGLE
   Expand / Collapse extra projects
============================ */
const extra    = document.getElementById('projectsExtra');
const toggleBtn = document.getElementById('projectsToggle');
const toggleLabel = toggleBtn.querySelector('.toggle-label');
const extraRows   = extra.querySelectorAll('.project-row');

let isExpanded = false;

// Set initial state: height 0
gsap.set(extra, { height: 0, overflow: 'hidden' });

toggleBtn.addEventListener('click', () => {
  isExpanded = !isExpanded;

  if (isExpanded) {
    // Expand
    toggleBtn.classList.add('is-open');
    toggleLabel.textContent = 'Weniger Projekte';
    toggleBtn.setAttribute('aria-expanded', 'true');

    // First set height to auto so we can measure it, then animate
    gsap.to(extra, {
      height: 'auto',
      duration: 0.65,
      ease: 'power3.inOut',
      onStart: () => { extra.style.overflow = 'hidden'; },
      onComplete: () => { extra.style.overflow = 'visible'; },
    });

    // Stagger in the extra rows
    gsap.to(extraRows, {
      opacity: 1, y: 0,
      duration: 0.55,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.2,
    });

  } else {
    // Collapse
    toggleBtn.classList.remove('is-open');
    toggleLabel.textContent = 'Mehr Projekte';
    toggleBtn.setAttribute('aria-expanded', 'false');

    // Fade rows out first, then collapse height
    gsap.to(extraRows, {
      opacity: 0, y: 16,
      duration: 0.3, stagger: 0.06, ease: 'power2.in',
    });

    gsap.to(extra, {
      height: 0,
      duration: 0.55,
      ease: 'power3.inOut',
      delay: 0.25,
      onStart: () => { extra.style.overflow = 'hidden'; },
    });

    // Scroll back up to the projects section if the button is out of view
    const toggleY = toggleBtn.getBoundingClientRect().top + window.scrollY;
    const projectsTop = document.getElementById('work').offsetTop;
    if (window.scrollY > toggleY - 100) {
      lenis.scrollTo('#work', { offset: -80, duration: 1.0 });
    }
  }
});

/* ============================
   SCROLL ANIMATIONS — cinematic
============================ */

// ── Work header: title mask reveal ──
gsap.set('.work-title', { y: '105%' });
gsap.set('.work-index', { opacity: 0, x: -20 });
gsap.set('.work-intro', { opacity: 0, y: 20 });

ScrollTrigger.create({
  trigger: '.work-header',
  start: 'top 82%',
  once: true,
  onEnter() {
    const tl = gsap.timeline();
    tl.to('.work-title',  { y: '0%', duration: 1.2, ease: 'power4.out' })
      .to('.work-index',  { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, 0.1)
      .to('.section-label', { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.2)
      .to('.work-intro',  { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.35);
  }
});

// Wrap work-title in a mask so the reveal clips properly
document.querySelectorAll('.work-title').forEach(el => {
  el.parentElement.style.overflow = 'hidden';
  el.parentElement.style.paddingBottom = '0.1em';
});

// ── Project rows: staggered slide up ──
gsap.set('.projects-list .project-row', { opacity: 0, y: 40 });
ScrollTrigger.create({
  trigger: '.projects-list',
  start: 'top 80%',
  once: true,
  onEnter() {
    gsap.to('.projects-list .project-row', {
      opacity: 1, y: 0,
      duration: 0.9, stagger: 0.1,
      ease: 'power3.out',
    });
  }
});

// ── Toggle button ──
gsap.set('.toggle-wrap', { opacity: 0, y: 24 });
ScrollTrigger.create({
  trigger: '.toggle-wrap', start: 'top 90%', once: true,
  onEnter() { gsap.to('.toggle-wrap', { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }); }
});

// ── Ghost word parallax ──
gsap.to('.work-bg-word', {
  scrollTrigger: {
    trigger: '.work-section',
    start: 'top bottom', end: 'bottom top',
    scrub: 2,
  },
  y: -80, ease: 'none'
});

// ── Footer: title mask reveal ──
gsap.set('#footerTitle',        { y: '105%' });
gsap.set('#footerTitleOutline', { y: '105%' });
gsap.set('#footerRule',         { scaleX: 0 });
gsap.set('.footer-item',        { opacity: 0, y: 24 });
gsap.set('.social-link',        { opacity: 0, x: 30 });
gsap.set('.footer-bottom',      { opacity: 0 });

ScrollTrigger.create({
  trigger: '.footer',
  start: 'top 80%',
  once: true,
  onEnter() {
    const tl = gsap.timeline();
    tl.to('#footerTitle',        { y: '0%', duration: 1.3, ease: 'power4.out' })
      .to('#footerTitleOutline', { y: '0%', duration: 1.5, ease: 'power4.out' }, 0.15)
      .to('#footerRule',         { scaleX: 1, duration: 1.2, ease: 'power3.inOut' }, 0.6)
      .to('.footer-item',        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.85)
      .to('.social-link',        { opacity: 1, x: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.95)
      .to('.footer-bottom',      { opacity: 1, duration: 0.8, ease: 'power2.out' }, 1.2);
  }
});

// ── Marquee: slow in ──
gsap.from('.marquee-wrap', {
  scrollTrigger: { trigger: '.marquee-wrap', start: 'top 95%' },
  opacity: 0, duration: 1.0, ease: 'power2.out',
});


(function initGalleryFilm() {
  const gallerySection  = document.getElementById('gallery');
  const galleryPin      = document.getElementById('galleryPin');
  const galleryTrack    = document.getElementById('galleryTrack');
  const trackWrap       = document.getElementById('galleryTrackWrap');
  const galleryNumEl    = document.getElementById('galleryNum');
  const galleryTotalEl  = document.getElementById('galleryTotal');
  const progressBar     = document.getElementById('galleryProgressBar');

  if (!gallerySection || !galleryTrack || !trackWrap) return;

  const items = Array.from(galleryTrack.querySelectorAll('.g-item'));
  const total = items.length;

  // Update total label
  if (galleryTotalEl) galleryTotalEl.textContent = String(total).padStart(2, '0');

  // ─── DYNAMIC SECTION HEIGHT ───────────────────────────────────────────────
  // We want the section to be tall enough so the horizontal scroll finishes.
  // Height = 100vh (for the sticky viewport) + maxX (the remaining track width)
  function getMaxX() {
    return Math.max(0, galleryTrack.scrollWidth - trackWrap.offsetWidth);
  }

  function setSectionHeight() {
    const maxX = getMaxX();
    gallerySection.style.height = `calc(100vh + ${maxX}px)`;
  }

  // Wait for images to size correctly before measuring
  window.addEventListener('load', () => {
    setSectionHeight();
    buildScrollTrigger();
    revealItems();
  });

  // Fallback if load already fired
  if (document.readyState === 'complete') {
    setSectionHeight();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setSectionHeight();
      // Refresh ScrollTrigger so end value updates
      ScrollTrigger.refresh();
    }, 180);
  });

  // ─── COUNTER ANIMATION ────────────────────────────────────────────────────
  let lastIdx = -1;

  function updateCounter(progress) {
    const idx = Math.min(Math.round(progress * (total - 1)), total - 1);
    if (idx === lastIdx || !galleryNumEl) return;
    lastIdx = idx;

    // Quick flash: fade out → update → fade in
    galleryNumEl.classList.add('is-changing');
    setTimeout(() => {
      galleryNumEl.textContent = String(idx + 1).padStart(2, '0');
      galleryNumEl.classList.remove('is-changing');
    }, 80);
  }

  // ─── SCROLL TRIGGER ───────────────────────────────────────────────────────
  let filmTrigger = null;

  function buildScrollTrigger() {
    if (filmTrigger) filmTrigger.kill();

    filmTrigger = ScrollTrigger.create({
      trigger: '#gallery',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate(self) {
        const maxX = getMaxX();
        gsap.set(galleryTrack, { x: -maxX * self.progress });
        updateCounter(self.progress);
        if (progressBar) progressBar.style.width = `${self.progress * 100}%`;
      },
    });
  }

  // ─── CURTAIN REVEAL (clip-path wipe) ─────────────────────────────────────
  function revealItems() {
    ScrollTrigger.create({
      trigger: '#gallery',
      start: 'top 85%',
      once: true,
      onEnter() {
        items.forEach((item, i) => {
          const wrap = item.querySelector('.g-img-wrap');
          // 1. Fade / lift the item card
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay: 0.06 * i,
            ease: 'power3.out',
          });
          // 2. Clip-path curtain: slides up to reveal image
          if (wrap) {
            gsap.fromTo(
              wrap,
              { clipPath: 'inset(100% 0 0 0)' },
              {
                clipPath: 'inset(0% 0 0 0)',
                duration: 1.1,
                delay: 0.06 * i + 0.12,
                ease: 'power4.out',
              }
            );
          }
        });
      },
    });
  }

  // ─── MOUSE PARALLAX — subtle vertical drift on images ────────────────────
  if (galleryPin) {
    galleryPin.addEventListener('mousemove', (e) => {
      const rect = galleryPin.getBoundingClientRect();
      const dy = (e.clientY - rect.height / 2) / rect.height; // −0.5 → 0.5

      gsap.to('.g-img-wrap img', {
        y: dy * 14,
        duration: 1.6,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });

    galleryPin.addEventListener('mouseleave', () => {
      gsap.to('.g-img-wrap img', {
        y: 0,
        duration: 1.4,
        ease: 'power2.out',
        overwrite: 'auto',
      });
    });
  }

  // ─── CURSOR RING EXPANSION on g-item hover ────────────────────────────────
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      gsap.to(cursorRing, {
        width: 68, height: 68,
        duration: 0.35, ease: 'power2.out',
      });
    });
    item.addEventListener('mouseleave', () => {
      gsap.to(cursorRing, {
        width: 40, height: 40,
        duration: 0.35, ease: 'power2.out',
      });
    });
  });
})();

/* ── end of gallery film ── */
/* ============================
   FOOTER 3D CHARACTER — cursor look-at
============================ */
(function initFooterCharacter() {
  const container = document.getElementById('footerCanvas');
  if (!container || typeof THREE === 'undefined') return;

  const W = container.offsetWidth  || 420;
  const H = container.offsetHeight || 360;

  // ── Scene ──
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(32, W / H, 0.1, 100);
  camera.position.set(0, 0.5, 6.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // insert before the label span
  container.insertBefore(renderer.domElement, container.querySelector('.footer-3d-label'));

  // ── Lighting ──
  scene.add(new THREE.AmbientLight(0xffffff, 0.08));

  const rimL = new THREE.DirectionalLight(0x8899ff, 1.1);
  rimL.position.set(-4, 3, -1);
  scene.add(rimL);

  const fillL = new THREE.DirectionalLight(0xffffff, 0.18);
  fillL.position.set(3, 1, 4);
  scene.add(fillL);

  const topL = new THREE.DirectionalLight(0xaabbcc, 0.5);
  topL.position.set(0, 6, 1);
  scene.add(topL);

  // ── Materials ──
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111118, roughness: 0.72, metalness: 0.08,
  });
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x2e2e48, wireframe: true, transparent: true, opacity: 0.55,
  });
  const eyeGlowMat = new THREE.MeshStandardMaterial({
    color: 0xccddff, emissive: 0x8899ff, emissiveIntensity: 0.9,
    roughness: 0.2, metalness: 0.0,
  });
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x050508, roughness: 0.9,
  });

  // ── Character group ──
  const character = new THREE.Group();
  scene.add(character);

  // Helper: add solid + wireframe
  function addMesh(geo, mat, wireGeo, parent, px, py, pz, sx, sy, sz) {
    const m = new THREE.Mesh(geo, mat);
    if (px !== undefined) m.position.set(px, py, pz);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    parent.add(m);
    if (wireGeo !== false) {
      const w = new THREE.Mesh(wireGeo || geo, wireMat);
      w.position.copy(m.position);
      if (sx !== undefined) w.scale.copy(m.scale);
      parent.add(w);
    }
    return m;
  }

  // ── HEAD ──
  const headGroup = new THREE.Group();
  character.add(headGroup);

  const headGeo = new THREE.SphereGeometry(1, 10, 8);
  // Slightly stretch to oval skull
  const pos = headGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, pos.getY(i) * 1.18);
    pos.setX(i, pos.getX(i) * 0.88);
    pos.setZ(i, pos.getZ(i) * 0.9);
  }
  headGeo.computeVertexNormals();
  headGroup.add(new THREE.Mesh(headGeo, bodyMat));
  headGroup.add(new THREE.Mesh(headGeo, wireMat));

  // ── EYES ──
  function buildEye(xOffset) {
    const g = new THREE.Group();
    g.position.set(xOffset, 0.1, 0.83);
    headGroup.add(g);

    // iris/sclera
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 12), eyeGlowMat);
    g.add(iris);

    // pupil
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), pupilMat);
    pupil.position.z = 0.1;
    g.add(pupil);
  }
  buildEye(-0.29);
  buildEye( 0.29);

  // ── NOSE ──
  const noseMesh = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 6), bodyMat);
  noseMesh.rotation.x = Math.PI / 2;
  noseMesh.position.set(0, -0.1, 0.89);
  headGroup.add(noseMesh);

  // ── MOUTH (subtle crease) ──
  const mouthGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12);
  const mouth = new THREE.Mesh(mouthGeo, bodyMat);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.4, 0.8);
  headGroup.add(mouth);

  // ── NECK ──
  const neckMesh = addMesh(
    new THREE.CylinderGeometry(0.24, 0.30, 0.6, 10),
    bodyMat, null, character, 0, -1.28, 0
  );

  // ── SHOULDERS ──
  const shoulderGeo = new THREE.BoxGeometry(2.4, 0.28, 0.7);
  addMesh(shoulderGeo, bodyMat, shoulderGeo, character, 0, -1.72, 0);

  // ── TORSO ──
  const torsoGeo = new THREE.BoxGeometry(2.0, 1.0, 0.6);
  addMesh(torsoGeo, bodyMat, torsoGeo, character, 0, -2.42, 0);

  character.position.y = 0.5;

  // ── Cursor look-at ──
  let targetY = 0, targetX = 0;
  let currY   = 0, currX   = 0;

  // Track global mouse (works across entire page)
  window.addEventListener('mousemove', (e) => {
    const nx =  (e.clientX / window.innerWidth)  * 2 - 1;
    const ny = -(e.clientY / window.innerHeight) * 2 + 1;
    targetY = nx * 0.65;   // left/right turn
    targetX = ny * 0.28;   // up/down tilt
  });

  // ── Animation loop ──
  let clock = 0;
  function tick() {
    requestAnimationFrame(tick);
    clock += 0.012;

    // Smooth follow
    currY += (targetY - currY) * 0.055;
    currX += (targetX - currX) * 0.055;

    character.rotation.y = currY;
    character.rotation.x = -currX * 0.5;

    // Idle float
    character.position.y = 0.5 + Math.sin(clock * 0.9) * 0.05;
    // Subtle idle sway
    character.rotation.z = Math.sin(clock * 0.55) * 0.018;

    renderer.render(scene, camera);
  }
  tick();

  // ── Resize ──
  const ro = new ResizeObserver(() => {
    const nW = container.offsetWidth;
    const nH = container.offsetHeight;
    camera.aspect = nW / nH;
    camera.updateProjectionMatrix();
    renderer.setSize(nW, nH);
  });
  ro.observe(container);
})();