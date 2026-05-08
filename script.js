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

  .to("#heroScroll", {
    opacity: 1,
    duration: 0.8
  }, 1.3);

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
   HERO — CURSOR SPOTLIGHT
============================ */
const spotlight = document.querySelector('.hero-spotlight');
const heroEl    = document.getElementById('hero');

if (spotlight && heroEl) {
  heroEl.addEventListener('mousemove', (e) => {
    const rect = heroEl.getBoundingClientRect();
    gsap.to(spotlight, {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      duration: 0.9,
      ease: 'power2.out'
    });
  });
}

/* ============================
   HERO — 3D PORTRAIT TILT (Apple-style)
   & SUBTLE CONTENT DEPTH SHIFT
============================ */
document.addEventListener('mousemove', (e) => {
  // Only run while in the hero viewport area
  const heroBottom = (heroEl ? heroEl.getBoundingClientRect().bottom : window.innerHeight);
  if (e.clientY > heroBottom) return;

  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  const dx = (e.clientX - cx) / cx; // -1 to 1
  const dy = (e.clientY - cy) / cy; // -1 to 1

  // Portrait — 3D card tilt (shallow, refined)
  gsap.to('#portraitReveal', {
    rotateY: dx * 5,
    rotateX: -dy * 3.5,
    duration: 1.6,
    ease: 'power2.out',
    overwrite: 'auto'
  });

  // Content — counter-drift for depth illusion
  gsap.to('.hero-content', {
    x: dx * -10,
    y: dy * -6,
    duration: 1.8,
    ease: 'power2.out',
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
  link.addEventListener('mouseenter', () => scrambleTitle(link));
  link.addEventListener('mouseleave', () => restoreTitle(link));
});

const footerLocation = document.querySelector('.footer-link:last-child');

if (footerLocation) {
  footerLocation.addEventListener('click', () => {
    // Quick Vienna fact
    const facts = [
      '🏛️ Heimat des Stephansdoms',
      '🎭 Stadt der Musik',
      '🏔️ Tor zu den Alpen'
    ];
    const randomFact = facts[Math.floor(Math.random() * facts.length)];
    footerLocation.textContent = randomFact;
    setTimeout(() => {
      footerLocation.textContent = 'Wien, Österreich';
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

(function initGalleryOrbit() {
  const folder = document.getElementById('folder');
  // Only use first 14 photos
  const photos = Array.from(document.querySelectorAll('.floating-photo')).slice(0, 14);
  // Hide any extra photos beyond 14
  Array.from(document.querySelectorAll('.floating-photo')).slice(14).forEach(p => p.style.display = 'none');
  if (!folder || !photos.length) return;

  const ORBIT_RADIUS    = 290;
  const PHOTO_HALF_W    = (160 / 2) * 2.1;
  const LABEL_GAP       = 20;
  const FOLDER_OFFSET_Y = -55;

  // 14 photos, evenly spaced (≈25.7° apart), starting top
  const ANGLES_DEG = photos.map((_, i) => -90 + i * (360 / 14));
  function toRad(d) { return d * Math.PI / 180; }
  function getStaticXY(i) {
    const rad = toRad(ANGLES_DEG[i]);
    return {
      x: Math.cos(rad) * ORBIT_RADIUS,
      y: Math.sin(rad) * ORBIT_RADIUS + FOLDER_OFFSET_Y,
    };
  }

  // z-Index by clockwise position: the photo clockwise-next to any photo is on top.
  // Clockwise order = ascending angle. So photo[i] gets zIndex = 10 + i (higher index = more clockwise = on top).
  // This means photo to the right of another is always above it.
  function applyOrbitZIndex() {
    photos.forEach((photo, i) => {
      gsap.set(photo, { zIndex: 10 + i });
    });
  }

  // Peek state — 14 photos fanned out behind folder
  const PEEK = [
    { x: -58, y: FOLDER_OFFSET_Y - 72, r: -22 },
    { x: -43, y: FOLDER_OFFSET_Y - 82, r: -16 },
    { x: -28, y: FOLDER_OFFSET_Y - 88, r: -10 },
    { x: -14, y: FOLDER_OFFSET_Y - 92, r:  -5 },
    { x:   0, y: FOLDER_OFFSET_Y - 94, r:  -1 },
    { x:  14, y: FOLDER_OFFSET_Y - 92, r:   3 },
    { x:  28, y: FOLDER_OFFSET_Y - 88, r:   8 },
    { x:  42, y: FOLDER_OFFSET_Y - 81, r:  13 },
    { x:  55, y: FOLDER_OFFSET_Y - 72, r:  19 },
    { x: -50, y: FOLDER_OFFSET_Y - 77, r: -19 },
    { x:  -7, y: FOLDER_OFFSET_Y - 90, r:  -2 },
    { x:   7, y: FOLDER_OFFSET_Y - 90, r:   2 },
    { x: -21, y: FOLDER_OFFSET_Y - 85, r:  -8 },
    { x:  35, y: FOLDER_OFFSET_Y - 78, r:  11 },
  ];

  let isOpen          = false;
  let hoveredPhoto    = null;
  let photoLeaveTimer = null;

  const REP_RADIUS   = 220;
  const REP_STRENGTH = 50;
  const galleryStage = document.querySelector('.gallery-interactive');

  // ── Folder click hint — arrow on LEFT of text
  const folderHint = document.createElement('div');
  folderHint.className = 'folder-hint';
  folderHint.innerHTML =
    '<span class="folder-hint-arrow">←</span>' +
    '<span class="folder-hint-text">Klick zum Öffnen</span>';
  galleryStage.appendChild(folderHint);
  gsap.set(folderHint, { opacity: 0, x: 8 });
  ScrollTrigger.create({
    trigger: '.gallery-section',
    start: 'top 70%',
    onEnter: () => {
      gsap.to(folderHint, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', delay: 0.3 });
    },
  });

  // ── Hover label
  const hoverLabel = document.createElement('a');
  hoverLabel.href      = '#gallery';
  hoverLabel.className = 'photo-hover-label';
  hoverLabel.innerHTML = 'Galerie ansehen <span class="phl-arrow">↗</span>';
  document.getElementById('floatingPhotos').appendChild(hoverLabel);
  gsap.set(hoverLabel, { opacity: 0, scale: 0.88, pointerEvents: 'none' });

  function setPhotoPointerEvents(enabled) {
    photos.forEach(p => { p.style.pointerEvents = enabled ? 'auto' : 'none'; });
  }

  // ── Initial peek state
  photos.forEach((photo, i) => {
    gsap.set(photo, {
      x: PEEK[i].x, y: PEEK[i].y,
      rotation: PEEK[i].r, rotateX: 0,
      opacity: 0.55, scale: 0.88,
      zIndex: 10 + i,
    });
  });
  setPhotoPointerEvents(false);

  // ── Open — mirrors the close animation: photos fly OUT from peek → orbit
  // Close goes: orbit → peek (gsap.to with ease power3.in, stagger 0.04)
  // Open goes:  peek → orbit (gsap.set to peek, then gsap.to orbit, same feel but power3.out)
  function openOrbit() {
    isOpen = true;
    folder.classList.add('is-open');
    gsap.to(folder, { scale: 0.82, duration: 0.55, ease: 'power3.out' });
    gsap.to(folderHint, { opacity: 0, x: -10, duration: 0.3, ease: 'power2.in' });

    let done = 0;
    photos.forEach((photo, i) => {
      const { x, y } = getStaticXY(i);
      photo._baseX = x;
      photo._baseY = y;

      // Start from current peek position (already there), animate out to orbit
      gsap.to(photo, {
        x, y, rotation: 0, rotateX: 0,
        opacity: 1, scale: 1,
        zIndex: 10 + i,
        duration: 0.55, delay: i * 0.04,
        ease: 'power3.out', overwrite: 'auto',
        onComplete() {
          done++;
          if (done === photos.length) setPhotoPointerEvents(true);
        },
      });
    });
  }

  // ── Close — mirrors open: orbit → peek (power3.in)
  function closeOrbit() {
    isOpen = false;
    folder.classList.remove('is-open');
    hoveredPhoto = null;
    clearTimeout(photoLeaveTimer);
    setPhotoPointerEvents(false);

    gsap.to(hoverLabel, { opacity: 0, scale: 0.88, duration: 0.18, ease: 'power2.in', overwrite: 'auto' });
    gsap.to(folder, { scale: 1, duration: 0.55, ease: 'power3.out' });
    gsap.to(folderHint, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out', delay: 0.45 });

    photos.forEach((photo, i) => {
      gsap.to(photo, {
        x: PEEK[i].x, y: PEEK[i].y,
        rotation: PEEK[i].r, rotateX: 0,
        opacity: 0.55, scale: 0.88,
        zIndex: 10 + i,
        duration: 0.5, delay: i * 0.04,
        ease: 'power3.in', overwrite: 'auto',
      });
    });
  }

  folder.addEventListener('click', () => { if (!isOpen) openOrbit(); else closeOrbit(); });

  // ── Repulsion — only active while a photo is hovered
  function handleRepulsion(e) {
    if (!isOpen || !hoveredPhoto) return;
    const rect = galleryStage.getBoundingClientRect();
    const mx = e.clientX - rect.left  - rect.width  / 2;
    const my = e.clientY - rect.top   - rect.height / 2;

    photos.forEach(photo => {
      if (photo === hoveredPhoto) return;

      const bx = photo._baseX;
      const by = photo._baseY;
      const dx = mx - bx;
      const dy = my - by;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < REP_RADIUS && dist > 0) {
        const t  = 1 - dist / REP_RADIUS;
        const nx = dx / dist;
        const ny = dy / dist;
        gsap.to(photo, {
          x: bx - nx * t * REP_STRENGTH,
          y: by - ny * t * REP_STRENGTH,
          duration: 0.55, ease: 'power2.out', overwrite: 'auto',
        });
      } else {
        gsap.to(photo, {
          x: bx, y: by,
          duration: 0.9, ease: 'power2.out', overwrite: 'auto',
        });
      }
    });
  }

  galleryStage.addEventListener('mousemove', handleRepulsion);

  galleryStage.addEventListener('mouseleave', () => {
    if (!isOpen) return;
    photos.forEach(photo => {
      if (photo === hoveredPhoto) return;
      gsap.to(photo, {
        x: photo._baseX, y: photo._baseY,
        duration: 0.9, ease: 'power2.out', overwrite: 'auto',
      });
    });
  });

  // ── Activate photo — scale DOWN slightly on hover
  function activatePhoto(photo) {
    clearTimeout(photoLeaveTimer);
    if (!isOpen) return;

    if (hoveredPhoto && hoveredPhoto !== photo) {
      const prev = hoveredPhoto;
      gsap.to(prev, {
        scale: 1, y: prev._baseY, x: prev._baseX,
        rotateX: 0, rotateY: 0, zIndex: photos.indexOf(prev) + 10,
        duration: 0.35, ease: 'power3.out', overwrite: 'auto',
      });
    }

    hoveredPhoto = photo;

    // Scale down to 0.82 (smaller than resting 1.0)
    gsap.to(photo, {
      scale: 0.82, zIndex: 20,
      y: photo._baseY - 8,
      rotateX: 0, rotateY: 0,
      duration: 0.4, ease: 'power3.out', overwrite: 'auto',
    });

    const px = gsap.getProperty(photo, 'x');
    const py = photo._baseY - 8;
    const onRight = px >= 0;
    gsap.set(hoverLabel, {
      x: onRight ? px + PHOTO_HALF_W + LABEL_GAP : px - PHOTO_HALF_W - LABEL_GAP,
      y: py, xPercent: onRight ? 0 : -100, yPercent: -50,
      pointerEvents: 'auto',
    });
    gsap.to(hoverLabel, { opacity: 1, scale: 1, duration: 0.3, delay: 0.08, ease: 'power3.out', overwrite: 'auto' });
  }

  // ── Deactivate photo
  function deactivatePhoto(photo) {
    gsap.to(hoverLabel, {
      opacity: 0, scale: 0.88, duration: 0.18, ease: 'power2.in', overwrite: 'auto',
      onComplete: () => gsap.set(hoverLabel, { pointerEvents: 'none' }),
    });
    gsap.to(photo, {
      scale: 1, y: photo._baseY, x: photo._baseX,
      rotateX: 0, rotateY: 0, zIndex: photos.indexOf(photo) + 10,
      duration: 0.45, ease: 'power3.out', overwrite: 'auto',
    });
    hoveredPhoto = null;
  }

  photos.forEach((photo) => {
    photo.addEventListener('mouseenter', () => { if (!isOpen) return; activatePhoto(photo); });
    photo.addEventListener('mouseleave', () => {
      if (!isOpen) return;
      photoLeaveTimer = setTimeout(() => deactivatePhoto(photo), 100);
    });
  });

  hoverLabel.addEventListener('mouseenter', () => { clearTimeout(photoLeaveTimer); });
  hoverLabel.addEventListener('mouseleave', () => { if (hoveredPhoto) deactivatePhoto(hoveredPhoto); });
})();