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

  // RING = minimal smooth (statt 0.45 laggy)
  gsap.to(cursorRing, {
    x: mouseX,
    y: mouseY,
    duration: 0.12,
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
   HERO — CINEMATIC REVEAL
   Images: clip-path polygon reveal
   Title lines: 3D rotateX perspective animation
============================ */
const heroTL = gsap.timeline({ delay: 0.2 });

// Initialize clip-path for animation
gsap.set("#portraitReveal", {
  clipPath: "polygon(0 0, 100% 0, 85% 100%, 0 100%)"
});

heroTL
  .to("#portraitReveal", {
    clipPath: "polygon(0 0, 100% 0, 95% 100%, 0 100%)",
    duration: 1.8,
    ease: "power4.out"
  })
  .to("#portraitImg", {
    scale: 1,
    duration: 2.2,
    ease: "power3.out"
  }, 0)

  .to(".line-inner", {
    y: "0%",
    rotateX: 0,
    duration: 1.2,
    stagger: 0.15,
    ease: "power4.out"
  }, 0.3)

  .to("#heroEyebrow", {
    opacity: 1,
    duration: 0.8
  }, 0.9)

  .to("#heroName", {
    opacity: 0.6,
    y: 0,
    duration: 0.8
  }, 1.1)

  .to("#heroScroll", {
    opacity: 1,
    duration: 0.8
  }, 1.3);

/* ============================
   HERO — IMAGE PARALLAX ON MOUSE (Smooth only)
============================ */
document.addEventListener('mousemove', (e) => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;

  const dx = (e.clientX - cx) / cx;
  const dy = (e.clientY - cy) / cy;

  // Smooth parallax without 3D rotation
  gsap.to("#portraitImg", {
    x: dx * -15,
    y: dy * -15,
    duration: 1.2,
    ease: "power2.out",
    overwrite: 'auto'
  });
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
   SCROLL ANIMATIONS
============================ */

// Work header
gsap.from('.work-header', {
  scrollTrigger: { trigger: '.work-header', start: 'top 84%' },
  y: 48, opacity: 0, duration: 1.0, ease: 'power3.out',
});

// Each visible project row — stagger from left
gsap.from('.projects-list .project-row', {
  scrollTrigger: {
    trigger: '.projects-list',
    start: 'top 82%',
  },
  x: -32, opacity: 0,
  duration: 0.7,
  stagger: 0.09,
  ease: 'power3.out',
});

// Toggle button
gsap.from('.toggle-wrap', {
  scrollTrigger: { trigger: '.toggle-wrap', start: 'top 90%' },
  y: 24, opacity: 0, duration: 0.6, ease: 'power2.out',
});

// Footer
gsap.from('.footer-top', {
  scrollTrigger: { trigger: '.footer', start: 'top 85%' },
  y: 40, opacity: 0, duration: 1.0, ease: 'power3.out',
});
gsap.from('.footer-grid', {
  scrollTrigger: { trigger: '.footer-grid', start: 'top 88%' },
  y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.1,
});

// Marquee subtle entrance
gsap.from('.marquee-wrap', {
  scrollTrigger: { trigger: '.marquee-wrap', start: 'top 95%' },
  opacity: 0, duration: 0.8, ease: 'power2.out',
});