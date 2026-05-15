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

  // Dry, sharp tooltips — one per letter slot (17 chars incl. space)
  const tips = [
    'J — 1999',              // J
    'A — Anton. Immer.',     // A
    'C — CSS ohne Klassen',  // C
    'O — Offen für Angebote',// O
    'B — Brutal minimal',    // B
    null,                    // space
    'W — Nicht Wien.',       // W
    'E — Espresso first',    // E
    'I — Kursiv ist Haltung',// I
    'S — Spacing ist Respekt',// S
    'S — Schreib weniger',   // S
    'E — Jedes px verdient', // E
    'N — Nachts produktiver',// N
    'B — Bau, zeig, wiederhol',// B
    'A — Österreich, klar',  // A
    'C — Cmd+Z ist Mut',     // C
    'K — Kein Pixel zufällig',// K
  ];

  // Alternating tilt direction per letter
  const tilts = [-5,-3,4,-4,5,0,-3,5,-4,3,-5,4,-3,5,-4,3,-5];

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
    span.style.setProperty('--nl-tilt', (tilts[i] || -3) + 'deg');
    span.style.setProperty('--nl-tilt-soft', (tilts[i] * -0.3).toFixed(1) + 'deg');

    if (tips[i]) {
      const tip = document.createElement('span');
      tip.className = 'nl-tip';
      tip.textContent = tips[i];
      span.appendChild(tip);
    }

    wrap.appendChild(span);
  });
})();

setTimeout(heroInit, 20);


/* ── SCROLL SYSTEM — Jasmine Gunarto style ──────────────────────────────
   Phase A [0.00 → 0.50]  Texte stoßen zusammen. Bild (fixed proxy)
                           gleitet nach unten und bleibt mit ~10vh
                           am unteren Rand sichtbar (Peek).
                           Seitenverhältnis bleibt unverändert.

   Phase B [0.50 → 1.00]  Bottom Sheet fährt von unten herein.
                           Fixed proxy verschwindet.
                           Das Banner-Element sitzt normal im DOM und
                           wird sichtbar wenn man dorthin scrollt.
─────────────────────────────────────────────────────────────────────── */
(function initScrollSystem() {
  const hero       = document.getElementById('hero');
  const imgCard    = document.getElementById('heroImgCard');
  const label      = document.getElementById('heroImgLabel');
  const year       = document.getElementById('heroImgYear');
  const roleEl     = document.getElementById('heroWordRole');
  const designerEl = document.getElementById('heroWordDesigner');
  const scrollHint = document.getElementById('heroScroll');
  const panel      = document.getElementById('bottomSheet');
  const banner     = document.getElementById('heroBanner');
  // Nur das Bild-Wrap-Element (ohne Labels) für präzise Proxy-Positionierung
  const imgWrapEl  = imgCard ? imgCard.querySelector('.hero-img-wrap') : null;

  if (!hero || !roleEl || !designerEl || !panel || !imgCard) return;

  const c01 = v => Math.max(0, Math.min(1, v));
  const eio = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const ph  = (p, a, b, ease) => {
    const t = c01((p - a) / (b - a));
    return ease ? eio(t) : t;
  };

  let roleFinalX = 0, designerFinalX = 0;
  let cardRect = null, wrapRect = null;

  // ── Fixed proxy — nur für die Peek-Animation (Phase A) ──
  const fixedProxy = document.createElement('div');
  fixedProxy.id = 'heroFixedProxy';
  fixedProxy.style.cssText = `
    position: fixed; z-index: 5; overflow: hidden;
    pointer-events: none; opacity: 0;
    will-change: top, left, width, height;
  `;
  const srcImg = imgCard.querySelector('img');
  const proxyImg = srcImg ? srcImg.cloneNode(true) : document.createElement('img');
  proxyImg.style.cssText = `
    width: 100%; height: 100%;
    object-fit: cover; display: block;
    filter: saturate(0.85) brightness(0.97);
  `;
  fixedProxy.appendChild(proxyImg);
  document.body.appendChild(fixedProxy);

  function measure() {
    gsap.set([roleEl, designerEl], { x: 0 });
    const rR = roleEl.getBoundingClientRect();
    const dR = designerEl.getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(roleEl).fontSize);
    const gap = fs * 0.28;
    const pw  = rR.width + gap + dR.width;
    const cx  = window.innerWidth / 2;
    roleFinalX     = (cx - pw / 2) - rR.left;
    designerFinalX = (cx - pw / 2 + rR.width + gap) - dR.left;

    gsap.set(imgCard, { clearProps: 'transform' });
    gsap.set(imgCard, { xPercent: -50 });
    cardRect = imgCard.getBoundingClientRect();
    // wrapRect = nur der Bild-Bereich (ohne Label-Text darüber)
    wrapRect = imgWrapEl ? imgWrapEl.getBoundingClientRect() : cardRect;
  }

  gsap.set(panel, { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });

  function update(p) {
    if (scrollHint) gsap.set(scrollHint, { opacity: c01(1 - p * 14) });
    if (!cardRect || !wrapRect) return;

    const vh = window.innerHeight;

    // pA drives Phase A (0→0.40): texte zusammen + bild gleitet nach unten
    const pA = ph(p, 0, 0.40, true);
    const pB = ph(p, 0.40, 0.75, true);

    gsap.set(roleEl,     { x: roleFinalX     * pA });
    gsap.set(designerEl, { x: designerFinalX * pA });
    if (label) gsap.set(label, { x: (pA * 52)   + '%', opacity: c01(1 - pA * 3) });
    if (year)  gsap.set(year,  { x: (pA * -380) + '%', opacity: c01(1 - pA * 3) });

    // FIX: imgCard bleibt sichtbar (Labels müssen bleiben) —
    // nur das img-wrap (das Bild selbst) wird versteckt, sobald der Proxy übernimmt.
    const showProxy = p > 0.005 && p < 0.995;
    gsap.set(imgCard, { xPercent: -50 });
    if (imgWrapEl) gsap.set(imgWrapEl, { opacity: showProxy ? 0 : 1 });

    // Proxy:
    // Phase A [0 → 0.40]: gleitet nach unten bis 10vh Peek, Größe = wrapRect (nur Bild)
    // Phase B [0.40 → 0.75]: wächst auf volle Viewport-Breite (16:7 Seitenverhältnis)
    // Phase C [0.75 → 1.00]: Bottom Sheet kommt rein

    const peekH  = vh * 0.10;
    const endTop = vh - peekH;

    // Phase A: Startposition = wrapRect (Bild-only, kein Label-Offset mehr)
    const proxyTopA = wrapRect.top + (endTop - wrapRect.top) * pA;

    // Phase B: Zielgröße = volle Viewport-Breite, 16:7 Aspect (= hero-banner CSS)
    // FIX: Ziel direkt aus window berechnen statt bannerRect (das ist off-screen während Pin)
    const targetW = window.innerWidth;
    const targetL = 0;
    const targetH = targetW * (7 / 16);

    const dispTop  = endTop;
    const dispLeft = wrapRect.left  + (targetL - wrapRect.left)  * pB;
    const dispW    = wrapRect.width + (targetW - wrapRect.width) * pB;
    const dispH    = wrapRect.height + (targetH - wrapRect.height) * pB;

    gsap.set(fixedProxy, {
      opacity: showProxy ? 1 : 0,
      top:    pA < 1 ? proxyTopA : dispTop,
      left:   pB > 0 ? dispLeft  : wrapRect.left,
      width:  pB > 0 ? dispW     : wrapRect.width,
      height: pB > 0 ? dispH     : wrapRect.height,
    });

    // ── Phase C [0.75 → 1.00]: Bottom Sheet enthüllen ──
    if (p < 0.75) {
      gsap.set(panel, { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });
    } else {
      const pC = ph(p, 0.75, 1.00, true);
      const insetTop = c01(1 - pC) * 100;
      gsap.set(panel, { clipPath: `inset(${insetTop}% 0 0 0 round 20px 20px 0 0)` });
    }
  }

  measure();

  ScrollTrigger.create({
    trigger:       hero,
    start:         'top top',
    end:           '+=220%',
    pin:           true,
    anticipatePin: 1,
    scrub:         1.1,
    onUpdate(self) { update(self.progress); },
    onLeave() {
      gsap.set(fixedProxy, { opacity: 0 });
      // imgWrapEl wiederherstellen, imgCard sichtbar lassen
      if (imgWrapEl) gsap.set(imgWrapEl, { opacity: 1 });
    },
    onEnterBack()  { /* update() kümmert sich drum */ },
    onRefresh()    {
      measure();
      gsap.set(panel,      { clipPath: 'inset(100% 0 0 0 round 20px 20px 0 0)' });
      gsap.set(fixedProxy, { opacity: 0 });
      if (imgWrapEl) gsap.set(imgWrapEl, { opacity: 1 });
    },
  });

  document.fonts.ready.then(() => { measure(); ScrollTrigger.refresh(); });
  window.addEventListener('resize',  () => { measure(); ScrollTrigger.refresh(); });
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
let navVisible = true;

lenis.on('scroll', ({ scroll, direction }) => {
  if (direction === 1 && scroll > 80 && navVisible) {
    gsap.to('#mainNav', { y: -80, opacity: 0, duration: 0.45, ease: 'power3.in' });
    navVisible = false;
  } else if (direction === -1 && !navVisible) {
    gsap.to('#mainNav', { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out' });
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
  function getMaxX() {
    return Math.max(0, galleryTrack.scrollWidth - trackWrap.offsetWidth);
  }

  function setSectionHeight() {
    const maxX = getMaxX();
    gallerySection.style.height = `calc(100vh + ${maxX}px)`;
  }

  window.addEventListener('load', () => {
    setSectionHeight();
    buildScrollTrigger();
    revealItems();
  });

  if (document.readyState === 'complete') {
    setSectionHeight();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      setSectionHeight();
      ScrollTrigger.refresh();
    }, 180);
  });

  // ─── COUNTER ANIMATION ────────────────────────────────────────────────────
  let lastIdx = -1;

  function updateCounter(progress) {
    const idx = Math.min(Math.round(progress * (total - 1)), total - 1);
    if (idx === lastIdx || !galleryNumEl) return;
    lastIdx = idx;

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
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay: 0.06 * i,
            ease: 'power3.out',
          });
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

  // ─── MOUSE PARALLAX ───────────────────────────────────────────────────────
  if (galleryPin) {
    galleryPin.addEventListener('mousemove', (e) => {
      const rect = galleryPin.getBoundingClientRect();
      const dy = (e.clientY - rect.height / 2) / rect.height;

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