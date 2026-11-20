import { createHero } from './hero.js';
import { loading, task } from './kit.js';
import { createSky } from './sky.js';
import { createWorks } from './works.js';
import { createCave } from './cave.js';
import { createPortal } from './portal.js';
import { createStained } from './stained.js';
import * as sound from './sound.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);
// on a phone the browser's bar comes and goes as you scroll, changing the
// height; the page is not laid out anew for that, or it would jump
ScrollTrigger.config({ ignoreMobileResize: true });

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
// where the visitor is on the way down, for the sound: the flight (0..1), the
// arrival at the tower and its turning (0..1 each), the earth (0..2), the end (0..1)
const where = { hero: 0, sky: 0, a: 0, p: 0, e: 0, foot: 0 };

// the visitor's eye: where the pointer is, eased. Without a pointer it rests mid-screen.
const pointer = { x: innerWidth / 2, y: innerHeight / 2, moved: false };
const eye = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (e.pointerType === 'mouse') pointer.moved = true;
}, { passive: true });
gsap.ticker.add(() => {
  const tx = pointer.moved ? pointer.x : innerWidth / 2;
  const ty = pointer.moved ? pointer.y : innerHeight / 2;
  eye.x += (tx - eye.x) * 0.08;
  eye.y += (ty - eye.y) * 0.08;
});
// the eye as -1..1 across the screen (y up), for the scenes that follow it
const aim = (k = 1) => [(eye.x / innerWidth * 2 - 1) * k, -(eye.y / innerHeight * 2 - 1) * k];

// smooth scroll ---------------------------------------------------------------
// After a reload the page comes back where it was, but only once it is fully
// built (the browser would restore the position before the pinned parts have
// their length, and land somewhere else)
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
let resumeAt = 0;
// (only on a reload or going back, as a browser would; a fresh visit starts at the top)
const navType = performance.getEntriesByType?.('navigation')[0]?.type;
if (navType === 'reload' || navType === 'back_forward') {
  try { resumeAt = +sessionStorage.getItem('jw-scroll') || 0; } catch (e) { /* private mode */ }
}
addEventListener('pagehide', () => { try { sessionStorage.setItem('jw-scroll', String(Math.round(scrollY))); } catch (e) { /* ignore */ } });
scrollTo(0, 0);
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

$$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
  const id = a.getAttribute('href');
  if (id.length < 2) return;
  const target = id === '#top' ? 0 : $(id);
  if (target === null) return;
  e.preventDefault();
  let y = target === 0 ? 0 : target.getBoundingClientRect().top + (lenis ? lenis.scroll : scrollY) - (id === '#work' ? 110 : 0);
  // the about is read at the end of its cave, where everything has come in
  if (id === '#about') y = target.offsetTop + target.offsetHeight - innerHeight;
  if (lenis) lenis.scrollTo(y, { duration: id === '#top' ? 2.6 : 1.8 });
  else scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
}));

// menu (phones): the sections, all projects and the ways out, over the page --
const menu = $('.menu'), menuBtn = $('.menu-btn');
let menuOpen = false;
function setMenu(open) {
  if (open === menuOpen) return;
  menuOpen = open;
  menuBtn.setAttribute('aria-expanded', open);
  $('.menu-label', menuBtn).textContent = open ? 'Close' : 'Menu';
  gsap.killTweensOf(menu);
  if (open) {
    menu.hidden = false;
    lenis?.stop();
    // it rises from below, as the index does; the words come up after it
    gsap.fromTo(menu, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: reduced ? 0 : 0.9, ease: 'expo.inOut' });
    if (!reduced) {
      gsap.fromTo($$('.menu-in', menu), { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.07, delay: 0.35 });
      gsap.fromTo([$('.menu-index', menu), $('.menu-foot', menu)], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.6 });
    }
  } else {
    lenis?.start();
    gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : 0.7, ease: 'expo.inOut', onComplete: () => { menu.hidden = true; } });
  }
}
menuBtn.addEventListener('click', () => setMenu(!menuOpen));
// a section chosen: the menu goes first (caught on the way down), then the
// page travels there by the link's own way
menu.addEventListener('click', (e) => { if (e.target.closest('a[href^="#"]')) setMenu(false); }, true);
$('.menu-index', menu).addEventListener('click', () => { setMenu(false); openArchive(); });
addEventListener('keydown', (e) => { if (menuOpen && e.key === 'Escape') setMenu(false); });
// grown past a phone, there is the menu bar again
addEventListener('resize', () => { if (menuOpen && innerWidth > 760) setMenu(false); });

// scramble: letters settle one by one. The font is monospaced, so nothing shifts.
const GLYPHS = '#/\\_-+=<>*:01';
function scramble(el, duration = 0.55) {
  const text = el.dataset.plain ?? (el.dataset.plain = el.textContent);
  el._scr?.kill();
  const o = { p: 0 };
  el._scr = gsap.to(o, {
    p: 1, duration, ease: 'none',
    onUpdate() {
      const done = Math.floor(o.p * text.length);
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const c = text[i];
        out += i < done || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
    },
    onComplete() { el.textContent = text; },
  });
}
if (!reduced) {
  $$('[data-scramble]').forEach((el) => {
    const host = el.closest('a') || el;
    host.addEventListener('pointerenter', () => scramble(el, 0.45));
  });
}

// cursor ----------------------------------------------------------------------
// what the cursor shows for the thing under it (set up below on a fine pointer)
let cursorFrom = () => {};
if (fine) {
  root.classList.add('has-cursor');
  const cur = $('.cursor'), label = $('.cursor-label', cur);
  const c = { x: -100, y: -100 };
  gsap.ticker.add(() => {
    c.x += (pointer.x - c.x) * 0.24;
    c.y += (pointer.y - c.y) * 0.24;
    cur.style.transform = `translate3d(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px, 0)`;
  });
  addEventListener('pointermove', () => cur.classList.add('is-on'), { once: true });
  document.addEventListener('mouseleave', () => cur.classList.remove('is-on'));
  document.addEventListener('mouseenter', () => cur.classList.add('is-on'));
  cursorFrom = (el) => {
    const t = el && el.closest('[data-cursor], a, button');
    const view = t && t.dataset.cursor;
    cur.classList.toggle('is-view', !!view);
    cur.classList.toggle('is-link', !!t && !view);
    if (view) label.textContent = view;
  };
  document.addEventListener('pointerover', (e) => cursorFrom(e.target));
}

// sound -----------------------------------------------------------------------
// (the one in the menu, and the one in the index, which covers the menu)
const soundBtns = $$('.sound');
const showSound = (on) => soundBtns.forEach((x) => {
  x.setAttribute('aria-pressed', on);
  $('.sound-label', x).textContent = on ? 'Sound on' : 'Sound off';
});
soundBtns.forEach((b) => b.addEventListener('click', () => {
  const on = !sound.isEnabled();
  sound.setEnabled(on);
  showSound(on);
}));

// the gate: once loaded, the page lies blurred behind a question, with sound
// or in silence; the answer lifts the blur and the page begins
const gate = $('.gate');
let gateOpen = false;
// how much the room behind follows the hand: not at all while the gate
// stands, coming back slowly once it is passed
const heroLook = { k: 0 };
function showGate(then) {
  gate.hidden = false;
  gateOpen = true;
  const kicker = $('.gate-kicker', gate), lines = $$('.gate-in', gate), buttons = $$('.gate-actions button', gate);
  if (!reduced) {
    gsap.fromTo(gate, { '--blur': '0px', '--tint': 0 }, { '--blur': '22px', '--tint': 0.42, duration: 1.4, ease: 'power2.out' });
    // quiet and exact: the small line first, then each line of the title rises
    // from behind its edge, then the two choices
    gsap.fromTo(kicker, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', delay: 0.25 });
    gsap.fromTo(lines, { yPercent: 108 }, { yPercent: 0, duration: 1.5, ease: 'expo.out', stagger: 0.12, delay: 0.4 });
    gsap.fromTo(buttons, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.07, delay: 0.95 });
  }
  // its own depth: the layers of the gate follow the hand, the title most, the
  // small line and the choices less, as if they stood at different distances
  const layers = [[kicker, 6], ...$$('.gate-line', gate).map((l, k) => [l, 16 + k * 6]), [$('.gate-actions', gate), 9]];
  const drift = () => {
    const nx = eye.x / innerWidth * 2 - 1, ny = eye.y / innerHeight * 2 - 1;
    for (const [el, d] of layers) {
      el.style.setProperty('--px', `${(-nx * d).toFixed(2)}px`);
      el.style.setProperty('--py', `${(-ny * d * 0.6).toFixed(2)}px`);
    }
  };
  if (!reduced) gsap.ticker.add(drift);
  // under the question, the cave, low. The browser may hold any sound back
  // until the first click, tap or key; then it begins (but not on the way out
  // through "in silence")
  sound.startPrelude();
  const wake = (e) => {
    const off = e.target.closest?.('.gate-off') || (e.type === 'keydown' && document.activeElement?.closest?.('.gate-off'));
    if (!off && e.key !== 'Escape') sound.wakePrelude();
  };
  addEventListener('pointerdown', wake);
  addEventListener('keydown', wake);
  setTimeout(() => $('.gate-on', gate).focus({ preventScroll: true }), reduced ? 0 : 900);
  const pass = (withSound) => {
    if (!gateOpen) return;
    gateOpen = false;
    removeEventListener('pointerdown', wake);
    removeEventListener('keydown', wake);
    // with sound, the cave sinks away as the bells come up; in silence it all fades
    sound.endPrelude(withSound);
    showSound(withSound);
    const done = () => { gsap.ticker.remove(drift); gate.remove(); then(); };
    // the room behind begins to follow the hand again, slowly
    gsap.to(heroLook, { k: 1, duration: reduced ? 0 : 2.4, ease: 'power2.inOut', delay: reduced ? 0 : 0.6 });
    if (reduced) { done(); return; }
    // the title sinks back behind its edges, the rest fades, then the blur lifts
    gsap.timeline({ onComplete: done })
      .to(lines, { yPercent: -108, duration: 0.8, ease: 'power3.in', stagger: 0.06 }, 0)
      .to([kicker, ...buttons], { autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.1)
      .to(gate, { '--blur': '0px', '--tint': 0, duration: 1.3, ease: 'power2.inOut' }, 0.55);
  };
  $('.gate-on', gate).addEventListener('click', () => pass(true));
  $('.gate-off', gate).addEventListener('click', () => pass(false));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') pass(false); });
  // the focus stays on the two choices
  gate.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const [a, b] = $$('.gate-actions button', gate);
    (document.activeElement === a ? b : a).focus();
  });
}

// hero ------------------------------------------------------------------------
const heroEl = $('.hero');
const stage = $('.hero-stage');
const about = $('.about');
const heroDone = task(3);
const hero = createHero($('.hero-canvas'), { onReady: () => { root.classList.add('scene-ready'); heroDone(); } });
if (!hero) { root.classList.add('no-webgl'); heroDone(); }

let heroP = 0;
function run() {
  if (!hero) return;
  if (!document.hidden && heroP < 0.999) hero.start(); else hero.stop();
}
function onHero(s) {
  heroP = s.progress;
  where.hero = heroP;
  hero?.setProgress(heroP);
  stage.style.visibility = heroP >= 0.999 ? 'hidden' : '';
  run();
}
ScrollTrigger.create({ trigger: heroEl, start: 'top top', end: 'bottom bottom', onUpdate: onHero, onRefresh: onHero });
document.addEventListener('visibilitychange', run);
if (hero && !reduced) {
  gsap.ticker.add(() => hero.setPointer(...aim(heroLook.k)));
}

// name and captions leave as the camera starts walking
gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom bottom', scrub: true } })
  .to('.hero-title', { y: () => -innerHeight * 0.22, autoAlpha: 0, duration: 0.3 }, 0)
  .to('.hero-foot', { autoAlpha: 0, duration: 0.12 }, 0)
  .to('.hero-shade', { autoAlpha: 0, duration: 0.25 }, 0.55)
  .set({}, {}, 1);

// loader ----------------------------------------------------------------------
const loader = $('.loader');
const count = $('.loader-count');
const bar = $('.loader-bar i');
const load = { v: 0 };
const drawLoad = () => {
  count.textContent = String(Math.round(load.v * 100)).padStart(3, '0');
  bar.style.transform = `scaleX(${load.v})`;
};
gsap.set(['.hero-name', '.hero-role', '.hero-foot > *'], { autoAlpha: 0 });
// The page lets the visitor in only when everything is ready: every file loaded,
// every scene built and warmed (its materials compiled, its textures on the
// graphics card), so nothing is left to do in the middle of a scroll. The bar
// shows how much of that is done, and nothing else.
const fontsDone = task(1);
document.fonts.ready.then(fontsDone, fontsDone);
// the bells, fetched now, so the sound does not have to wait for them later
const bellsDone = task(1);
fetch('audio/bells.oga').then((r) => r.arrayBuffer()).catch(() => {}).finally(bellsDone);
function loadTick() {
  const target = loading.total ? loading.done / loading.total : 0;
  load.v += (target - load.v) * 0.14;
  drawLoad();
  if (loading.done >= loading.total && load.v > 0.992) enter();
}
gsap.ticker.add(loadTick);

let entered = false;
function enter() {
  if (entered) return;
  entered = true;
  gsap.ticker.remove(loadTick);
  gsap.timeline()
    .to(load, { v: 1, duration: 0.6, ease: 'power2.inOut', onUpdate: drawLoad })
    .to(loader, { clipPath: 'inset(0 0 100% 0)', duration: 1.2, ease: 'expo.inOut' })
    .add(() => {
      root.classList.remove('is-loading');
      if (resumeAt > 0) {
        ScrollTrigger.refresh();
        if (lenis) lenis.scrollTo(resumeAt, { immediate: true, force: true }); else scrollTo(0, resumeAt);
        ScrollTrigger.update();
      }
      // the page is there, blurred, until the sound is chosen; then it begins
      showGate(() => { lenis?.start(); intro(); });
    }, '-=0.55')
    .add(() => loader.remove());
}
// (should a file never answer, the visitor is not kept out for ever)
setTimeout(enter, 40000);

function intro() {
  gsap.to('.hero-name', { autoAlpha: 1, duration: 0.2 });
  if (!reduced) scramble($('.hero-name'), 1.1);
  gsap.fromTo('.hero-role', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.5 });
  gsap.fromTo('.hero-foot > *', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.7 });
}

// sky -------------------------------------------------------------------------
// Out of the window, a short flight, a dive into a cloud, and on down through
// it until the tower comes up out of the haze below. One fixed canvas behind
// everything from the window to the cave.
const skyBox = $('.sky');
const sky = createSky($('canvas', skyBox));
ScrollTrigger.create({
  trigger: '.ascent', start: 'top bottom', end: 'bottom top',
  onUpdate: (s) => { where.sky = s.progress; sky?.setProgress(s.progress); },
});
let skyOn = false, descent = 0;
// deep in the earth nothing of the world above is on screen: the sky and the
// tower rest, so the cave has the machine to itself
let under = false;
gsap.ticker.add(() => {
  const a = about.getBoundingClientRect();
  const want = heroP > 0.3 && a.top > 0 && !under && !document.hidden;
  if (want !== skyOn) {
    skyOn = want;
    skyBox.style.visibility = want ? 'visible' : 'hidden';
    if (sky) (want ? sky.start() : sky.stop());
  }
  if (!sky) return;
  // (the menu needs no switch for light ground: it is drawn in difference)
  if (want && !reduced) sky.setPointer(...aim());
});

// work ------------------------------------------------------------------------
// A round tower in the mist. The section holds still while scrolling turns the
// tower and lifts it, one window after the other coming round to the middle.
const projects = $$('.work-list .win').map((a) => ({
  a,
  img: $('img', a),
  title: $('h3', a).textContent,
  meta: $$('p span', a).map((s) => s.textContent),
}));
const stageEl = $('.work-stage');
let resumeWorks = () => {};   // set once the tower is there
const worksCanvas = $('.works-canvas');
const selected = projects.filter((p) => p.a.hasAttribute('data-selected'));
const works = createWorks(worksCanvas, selected.map((p) => p.img));
if (!works) root.classList.add('no-works');

const nowTitle = $('.now-title');
const nowMeta = $$('.now-meta span');
const nowHint = $('.now-hint');
const hit = $('.work-hit');
let hitIn = false;
let earthTop = Infinity;   // where the earth's surface is on the screen, as it rises
let shown = -1;
function show(i) {
  if (i === shown) return;
  shown = i;
  const p = selected[i];
  nowTitle.dataset.plain = p.title;
  nowTitle.textContent = p.title;
  nowMeta[0].textContent = p.meta[0];
  nowMeta[1].textContent = p.meta[1];
  hit.href = p.a.href;
  hit.setAttribute('aria-label', `${p.title}, view project`);
  if (!reduced) scramble(nowTitle, 0.5);
}

// the title arrives when the mist has cleared (declared before the tower's
// scroll is set up: on a reload halfway down, that scroll reports its position
// at once, and may already arrive)
gsap.set(['.work-head', '.work-now', '.now-hint'], { autoAlpha: 0 });
let arrived = false;
function arrive() {
  if (arrived) return;
  arrived = true;
  if (reduced) { gsap.set(['.work-head', '.work-now', '.now-hint'], { autoAlpha: 1 }); return; }
  gsap.fromTo('.work-head', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'power3.out' });
  gsap.fromTo(['.work-now', '.now-hint'], { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 0.4, stagger: 0.1 });
  scramble($('#work-title'), 1);
}
if (works) {
  // the fly-in: down out of the cloud while the tower comes up from below;
  // half a screen of scroll per window; then the earth rises over the tower
  const fly = () => innerHeight * 0.95;
  const turn = () => innerHeight * 0.5 * (works.count - 1);
  const sinkLen = () => innerHeight * 1.0;
  const earthEl = $('.earth');
  const strata = $$('.stratum', earthEl);
  const voidEl = $('.earth-void');
  const st = ScrollTrigger.create({
    trigger: stageEl, start: 'top top', end: () => `+=${fly() + turn() + sinkLen()}`,
    pin: true, invalidateOnRefresh: true,
    onUpdate: (s) => {
      const x = s.progress * (fly() + turn() + sinkLen());
      const a = clamp(x / fly(), 0, 1);
      const p = clamp((x - fly()) / turn(), 0, 1);
      descent = clamp((x - fly() - turn()) / sinkLen(), 0, 1);
      works.setArrive(a);
      where.a = a; where.p = p;
      works.setProgress(p);
      works.setDescent(descent);
      sky?.setLower(a * 0.6 + p * 0.4);
      // the tower is there from the start, behind the cloud; it clears as we sink
      worksCanvas.style.opacity = clamp((a - 0.12) / 0.5, 0, 1).toFixed(3);
      stageEl.style.setProperty('--fade', (1 - clamp(descent / 0.3, 0, 1)).toFixed(3));
      if (a > 0.6) arrive();
      nowHint.style.setProperty('--seen', p.toFixed(3));
    },
  });
  // the earth: rises over the foot of the tower, its strata sliding past at their
  // own depths, until the cave lies open below it. It is fixed to the screen and
  // moved by the scroll position alone, at one even speed: tied to the pinned
  // stage it would catch for a frame where the pin lets go, above all going up.
  let lastE = NaN;
  addEventListener('resize', () => { lastE = NaN; });
  gsap.ticker.add(() => {
    const vh = innerHeight;
    // 0 at the last window, 1 where the stage lets go, 2 where the cave holds
    const e = Math.max(0, (scrollY - (st.start + fly() + turn())) / vh);
    if (e === lastE) return;
    lastE = e;
    where.e = e;
    // its top edge on the screen; fast enough that the ceiling is gone before the cave holds
    const top = (1.01 - 1.39 * e) * vh;
    earthTop = top;
    const vis = top < vh && top + 1.97 * vh > 0 ? 'visible' : 'hidden';
    earthEl.style.visibility = voidEl.style.visibility = vis;
    // once even its surface has left the screen, the world above it is gone for
    // good (before that, the sky still shows above the surface)
    if ((top < -0.14 * vh) !== under) {
      under = top < -0.14 * vh;
      stageEl.classList.toggle('is-under', under);
      runWorks();
    }
    earthEl.style.setProperty('--ey', `${top.toFixed(1)}px`);
    voidEl.style.setProperty('--ey', `${top.toFixed(1)}px`);
    strata.forEach((el, k) => { el.style.transform = `translate3d(0, ${(-e * k * vh * 0.09).toFixed(1)}px, 0)`; });
    earthEl.style.setProperty('--dy', `${(e * vh * 0.35).toFixed(1)}px`);
  });
  let stageSeen = false;
  // (not while the index lies over it)
  function runWorks() { stageSeen && !under && !root.classList.contains('archive-open') ? works.start() : works.stop(); }
  resumeWorks = runWorks;
  new IntersectionObserver(([e]) => { stageSeen = e.isIntersecting; runWorks(); }).observe(stageEl);
  gsap.ticker.add(() => {
    const r = stageEl.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    if (!reduced) works.setPointer(eye.x / innerWidth, eye.y / innerHeight);
    show(works.active);
    // the link lies over the window in front, for the cursor and the click
    const f = works.frontRect();
    // only as much of it as can be seen: as the earth comes up over the window,
    // the part under the earth can no longer be pointed at (the line is taken
    // through the middle of the broken edge of the surface)
    const cover = earthTop + innerHeight * 0.07;
    const h = Math.min(f.h, cover - f.y);
    const off = h < 6;
    hit.style.cssText = `left:${f.x.toFixed(1)}px;top:${f.y.toFixed(1)}px;width:${f.w.toFixed(1)}px;height:${Math.max(0, h).toFixed(1)}px`
      + (off ? ';pointer-events:none;visibility:hidden' : '');
    // the cursor may be resting on it as the earth passes: let it see what is there now
    const inside = !off && pointer.x > f.x && pointer.x < f.x + f.w && pointer.y > f.y && pointer.y < f.y + h;
    if (inside !== hitIn) { hitIn = inside; cursorFrom(document.elementFromPoint(pointer.x, pointer.y)); }
  });
} else {
  show(0);
}

// all projects: the names stand round a drum that turns like the tower --------
// The one on the middle line (or the one the hand rests on) is shown beside
// it, a plain picture.
const archive = $('.archive');
const archiveList = $('.archive-list');
const drumEl = $('.archive-drum');
const bodyEl = $('.archive-body');
const viewEl = $('.archive-view');
const picEl = $('.archive-pic');
const panes = $$('img', picEl);
const countEl = $('.archive-count');
const info = { title: $('.ai-title'), cat: $('.ai-cat'), year: $('.ai-year') };
archiveList.innerHTML = projects.map((p) => `<li data-cat="${p.meta[0]}"><a href="${p.a.getAttribute('href')}" data-cursor="View">${p.title}<span class="sr">, ${p.meta[0]}, ${p.meta[1]}</span></a></li>`).join('');
countEl.textContent = projects.length;
$('.work-index b').textContent = projects.length;
$('.menu-index b').textContent = projects.length;
// on a touch screen the drum is turned by a swipe
if (coarse) $('.archive-foot span').textContent = 'Swipe to turn';
const rows = $$('li', archiveList);
const links = rows.map((r) => $('a', r));
const STEP = (15 * Math.PI) / 180;           // the angle from one name to the next
const drum = { pos: 0, target: 0, spin: 0, set: rows.map((_, i) => i), R: 300, lh: 70, shown: -1, drag: null, moved: false, snap: 0 };
const narrow = () => innerWidth <= 760;
// the distance of the k-th name from the middle line, the shorter way round
function wrapD(k, n, p) { let d = (((k - p) % n) + n) % n; if (d > n / 2) d -= n; return d; }
function measureDrum() {
  const h = bodyEl.clientHeight;
  drum.R = h * 0.48;
  drum.lh = drum.R * Math.sin(STEP);
  // the longest name has to fit before the picture (or the screen's edge)
  const left = archiveList.getBoundingClientRect().left;
  const right = narrow() ? innerWidth - left : picEl.getBoundingClientRect().left - 80;
  const longest = Math.max(...projects.map((p) => p.title.length));
  const fs = Math.min(drum.lh * 0.9, (right - left) / (longest * 0.56));
  archiveList.style.setProperty('--fs', `${fs.toFixed(1)}px`);
  archiveList.style.setProperty('--lh', `${drum.lh.toFixed(1)}px`);
}
// which of how many (of those the filters let through) is on the line: it
// follows the drum frame by frame and counts one at a time, the shorter way
// round, so even a fast turn reads 7, 8, 9, 10 and never 7, 10
const posNow = $('.af-now'), posAll = $('.af-all');
// (when the drum is set up anew, it starts on the name on the line at once)
const pos = { shown: 0, snap: true };
function countTo(k) {
  const n = drum.set.length;
  if (!n) return;
  if (pos.snap) { pos.snap = false; pos.shown = k; posNow.textContent = k + 1; return; }
  if (k === pos.shown) return;
  const ahead = (((k - pos.shown) % n) + n) % n;
  pos.shown = (pos.shown + (ahead <= n / 2 ? 1 : -1) + n) % n;
  posNow.textContent = pos.shown + 1;
}
function showProject(ri) {
  drum.shown = ri;
  const p = projects[ri];
  info.cat.textContent = p.meta[0];
  info.year.textContent = p.meta[1];
  info.title.dataset.plain = p.title;
  info.title.textContent = p.title;
  if (!reduced) scramble(info.title, 0.4);
  // the new picture rises over the old from below, as the index itself came;
  // a project with no picture of its own yet shows the white ground
  const [under, over] = panes;
  const was = over.getAttribute('src');
  if (was) under.setAttribute('src', was); else under.removeAttribute('src');
  if (/placeholder\.png$/.test(p.img.src)) over.removeAttribute('src'); else over.setAttribute('src', p.img.src);
  gsap.fromTo(over, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: reduced ? 0 : 0.8, ease: 'expo.out', overwrite: true });
}
let opener = null, archiveOpen = false;
addEventListener('resize', () => { if (archiveOpen) measureDrum(); });
function openArchive() {
  if (archiveOpen) return;
  archiveOpen = true;
  opener = document.activeElement;
  archive.hidden = false;
  lenis?.stop();
  sound.setMuffled(true);
  root.classList.add('archive-open');
  works?.stop();
  measureDrum();
  drum.pos = drum.target = Math.round(drum.target);
  pos.snap = true;
  // hidden below its lower edge, in place, at the first moment of its rise
  gsap.set(archive, { clipPath: 'inset(100% 0 0 0)' });
  if (!reduced) {
    gsap.set(drum, { spin: -6 });
    gsap.set(viewEl, { autoAlpha: 0, y: 40 });
    gsap.set(archive, { '--rule': 0 });
  }
  // The first picture of the index costs the browser a frame or two (laying it
  // out, the layers of the names). The page does not smooth over a slow frame
  // (the smooth scroll needs that), so a wipe started now would jump past its
  // slow beginning and look rushed. It starts once those frames are drawn.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (!archiveOpen) return;
    gsap.to(archive, { clipPath: 'inset(0% 0 0 0)', duration: reduced ? 0 : 1.1, ease: 'expo.inOut' });
    if (reduced) return;
    // the drum comes round into place as the index rises, the picture after it
    gsap.to(drum, { spin: 0, duration: 2.2, ease: 'expo.out', delay: 0.2 });
    gsap.to(viewEl, { autoAlpha: 1, y: 0, duration: 1.3, ease: 'expo.out', delay: 0.55 });
    gsap.to(archive, { '--rule': 1, duration: 1.4, ease: 'expo.out', delay: 0.5 });
    scramble($('#archive-title span'), 0.8);
  }));
  $('.archive-close').focus({ preventScroll: true });
}
function closeArchive() {
  if (!archiveOpen) return;
  archiveOpen = false;
  setYearMenu(false);
  sound.setMuffled(false);
  gsap.to(archive, {
    clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : 0.9, ease: 'expo.inOut',
    onComplete() { archive.hidden = true; lenis?.start(); root.classList.remove('archive-open'); resumeWorks(); opener?.focus?.({ preventScroll: true }); },
  });
}
$('.work-index').addEventListener('click', openArchive);
$('.archive-close').addEventListener('click', closeArchive);
// turn it: one notch of the wheel, one name; it comes to rest on a name
archive.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (yearOpen) return;
  let dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
  dy = Math.max(-240, Math.min(240, dy));
  drum.target += dy / 100;
  clearTimeout(drum.snap);
  drum.snap = setTimeout(() => { drum.target = Math.round(drum.target); }, 130);
}, { passive: false });
// by hand on a touch screen: drag it, flick it
drumEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  drum.drag = { y: e.clientY, from: drum.target, last: e.clientY, t: performance.now(), v: 0 };
  drum.moved = false;
});
addEventListener('pointermove', (e) => {
  const g = drum.drag;
  if (!g) return;
  const dy = e.clientY - g.y;
  if (Math.abs(dy) > 6) drum.moved = true;
  drum.target = g.from - dy / drum.lh;
  const now = performance.now();
  g.v = (e.clientY - g.last) / Math.max(1, now - g.t);
  g.last = e.clientY; g.t = now;
});
const release = () => {
  const g = drum.drag;
  if (!g) return;
  drum.drag = null;
  drum.target = Math.round(drum.target - (g.v * 260) / drum.lh);
};
addEventListener('pointerup', release);
addEventListener('pointercancel', release);
archiveList.addEventListener('click', (e) => { if (drum.moved) { e.preventDefault(); drum.moved = false; } }, true);
// by key: the arrows turn it; a name that takes the focus is turned to the line
archiveList.addEventListener('focusin', (e) => {
  const k = drum.set.indexOf(rows.indexOf(e.target.closest('li')));
  if (k >= 0) drum.target = Math.round(drum.pos + wrapD(k, drum.set.length, drum.pos));
});
addEventListener('keydown', (e) => {
  if (!archiveOpen) return;
  // Escape closes the list of years first, then the index
  if (e.key === 'Escape') {
    if (yearOpen) { setYearMenu(false); yearBtn.focus({ preventScroll: true }); } else closeArchive();
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    // in the list of years the arrows walk the years
    if (yearOpen) {
      const i = yearItems.indexOf(document.activeElement);
      yearItems[(i + dir + yearItems.length) % yearItems.length].focus({ preventScroll: true });
      return;
    }
    drum.target = Math.round(drum.target) + dir;
    if (archiveList.contains(document.activeElement)) {
      const n = drum.set.length;
      links[drum.set[((drum.target % n) + n) % n]].focus({ preventScroll: true });
    }
  }
  if (e.key === 'Tab') {
    if (yearOpen) setYearMenu(false);
    // keep the focus inside the index while it is open
    const f = $$('button, a', archive).filter((el) => el.offsetParent !== null && !el.disabled && !el.closest('[hidden]'));
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
// filters: a year, from the list under the chevron, and a discipline ----------
const years = [...new Set(projects.map((p) => p.meta[1]))].sort((a, b) => b - a);
const filter = { cat: '', year: '' };         // it opens on every year
const catButtons = $$('.archive-filter button');
const yearBtn = $('.year-btn');
const yearMenu = $('.year-menu');
yearMenu.innerHTML = ['', ...years].map((y) => `<button type="button" role="menuitemradio" aria-checked="false" data-year="${y}">${y || 'All years'}</button>`).join('');
const yearItems = $$('button', yearMenu);
const fits = (i, f = filter) => (!f.cat || projects[i].meta[0] === f.cat) && (!f.year || projects[i].meta[1] === f.year);
const matching = () => rows.map((_, i) => i).filter((i) => fits(i));
function syncFilters() {
  catButtons.forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.cat === filter.cat);
    // a discipline with nothing in the chosen year cannot be chosen
    b.disabled = !rows.some((_, i) => fits(i, { cat: b.dataset.cat, year: filter.year }));
  });
  yearItems.forEach((b) => b.setAttribute('aria-checked', b.dataset.year === filter.year));
  $('.year-now').textContent = filter.year || 'All years';
}
function setDrum(next) {
  rows.forEach((r, i) => { r.hidden = !next.includes(i); });
  drum.set = next;
  drum.pos = drum.target = 0;
  drum.shown = -1;
  pos.snap = true;
  posAll.textContent = next.length;
}
// a filter takes the drum away and brings it back round with only its own names
function applyFilters() {
  syncFilters();
  const next = matching();
  gsap.to(archiveList, {
    autoAlpha: 0, duration: reduced ? 0 : 0.22, overwrite: true,
    onComplete() {
      setDrum(next);
      if (!reduced) gsap.fromTo(drum, { spin: -4 }, { spin: 0, duration: 1.6, ease: 'expo.out' });
      gsap.to(archiveList, { autoAlpha: 1, duration: reduced ? 0 : 0.35 });
    },
  });
}
syncFilters();
setDrum(matching());
catButtons.forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.cat === filter.cat) return;
  filter.cat = b.dataset.cat;
  applyFilters();
}));
let yearOpen = false;
function setYearMenu(open) {
  if (open === yearOpen) return;
  yearOpen = open;
  yearBtn.setAttribute('aria-expanded', open);
  if (open) {
    yearMenu.hidden = false;
    requestAnimationFrame(() => yearMenu.classList.add('is-open'));
  } else {
    yearMenu.classList.remove('is-open');
    setTimeout(() => { if (!yearOpen) yearMenu.hidden = true; }, 550);
  }
}
yearBtn.addEventListener('click', () => {
  setYearMenu(!yearOpen);
  if (yearOpen) (yearItems.find((b) => b.getAttribute('aria-checked') === 'true') || yearItems[0]).focus({ preventScroll: true });
});
yearItems.forEach((b) => b.addEventListener('click', () => {
  setYearMenu(false);
  yearBtn.focus({ preventScroll: true });
  if (b.dataset.year === filter.year) return;
  filter.year = b.dataset.year;
  // the discipline chosen has nothing in that year: show all of the year
  if (!matching().length) filter.cat = '';
  applyFilters();
}));
addEventListener('pointerdown', (e) => { if (yearOpen && !e.target.closest('.archive-year')) setYearMenu(false); });
gsap.ticker.add((time, dt) => {
  if (archive.hidden || !drum.set.length) return;
  const ease = (r) => 1 - Math.pow(1 - r, dt / 16.67);
  drum.pos += (drum.target - drum.pos) * ease(drum.drag ? 0.45 : 0.11);
  const n = drum.set.length, p = drum.pos + drum.spin;
  const reach = n >= 12 ? 5.6 : n / 2;       // how many names show above and below
  // the name the hand rests on, if any
  let hover = -1;
  if (fine && pointer.moved && !drum.drag && !yearOpen) {
    const li = document.elementFromPoint(pointer.x, pointer.y)?.closest?.('.archive-list li');
    if (li) hover = drum.set.indexOf(rows.indexOf(li));
  }
  const centre = ((Math.round(p) % n) + n) % n;
  const act = hover >= 0 ? hover : centre;
  drum.set.forEach((ri, k) => {
    const d = wrapD(k, n, p), ad = Math.abs(d), a = d * STEP;
    let o = 0;
    if (ad < reach && Math.abs(a) < 1.5) {
      const edge = Math.min(1, (reach - ad) / 0.5);
      const away = Math.min(1, Math.max(0, (Math.cos(a) - 0.08) / 0.4));
      o = (k === act ? 1 : 0.12 + 0.6 * Math.exp(-ad * ad * 2.4)) * edge * away;
    }
    const li = rows[ri];
    li.style.transform = `translate3d(0,${(Math.sin(a) * drum.R).toFixed(2)}px,${((Math.cos(a) - 1) * drum.R).toFixed(2)}px) rotateX(${(-a).toFixed(4)}rad)`;
    li.style.opacity = o.toFixed(3);
    li.style.pointerEvents = o > 0.06 ? '' : 'none';
  });
  countTo(act);
  // the picture changes once the drum has (nearly) come to rest, or at once for the hand
  const ri = drum.set[act];
  if (ri !== drum.shown && (hover >= 0 || Math.abs(drum.target - p) < 0.5)) showProject(ri);
});

// band: drifts on its own, scrolling pushes it and leans it -------------------
const track = $('.band-track');
let bx = 0, dir = 1, lean = 0;
gsap.ticker.add((t, dt) => {
  if (reduced) return;
  const v = lenis ? lenis.velocity : 0;
  if (v) dir = v > 0 ? 1 : -1;
  const w = track.firstElementChild.offsetWidth;
  if (!w) return;
  bx -= (0.045 + Math.min(Math.abs(v) * 0.012, 0.9)) * dt * dir;
  if (bx <= -w) bx += w;
  if (bx > 0) bx -= w;
  lean += (clamp(v * -0.35, -8, 8) - lean) * 0.1;
  track.style.transform = `translate3d(${bx.toFixed(1)}px, 0, 0) skewX(${lean.toFixed(2)}deg)`;
});

// a live scene: built while the page loads, behind the loader (or at the latest
// a screen before it is reached), drawn only while its section is on screen,
// and moved by how far the section has come in
function liveScene({ host, canvas, create, ahead, delay, end, value = (s) => s.progress, onScroll, onShown, onFail }) {
  let scene = null, seen = false;
  const built = task(3);
  const st = ScrollTrigger.create({
    trigger: host, start: 'top bottom', end,
    onUpdate: (s) => { onScroll?.(s); scene?.setProgress(value(s)); },
  });
  const sync = () => { if (scene) (seen && !document.hidden ? scene.start() : scene.stop()); };
  const make = () => {
    if (scene !== null) return;
    scene = create(canvas, { onReady: () => { onShown?.(); built(); } }) || false;
    if (!scene) { built(); onFail?.(); return; }
    // built after a jump: start where the scroll already is
    scene.setProgress(value(st));
    if (!reduced) gsap.ticker.add(() => scene.setPointer(...aim()));
    sync();
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) make(); sync(); }).observe(host);
  new IntersectionObserver(([e]) => { if (e.isIntersecting) make(); }, { rootMargin: `${ahead} 0px` }).observe(host);
  document.addEventListener('visibilitychange', sync);
  setTimeout(make, delay);
}

// about: the cave; its words stand in it, drawn in 3D (cave.js) ---------------
const caveBox = $('.scene--cave');
liveScene({
  host: about, canvas: $('canvas', caveBox), create: createCave,
  ahead: '120%', delay: 60, end: 'bottom top',
  onShown: () => caveBox.classList.add('is-ready'),
});

// sound follows the visitor, fading from room to room with the scroll: the bells
// behind the window; out of it only wind, thinning the lower you sink; the chord
// of the tower; the hollow of the cave; at the very end, a faint halo
const foot = $('.foot');
let mixed = '';
gsap.ticker.add(() => {
  const { hero: h, sky: s, a, p, e, foot: f } = where;
  // coming up to the window the wind outside can already be heard, and the bells
  // behind us grow quieter; through it, the bells are gone and the wind is all
  const near = smoothstep(0.45, 1, h), out = smoothstep(0, 0.45, s);
  const mix = {
    nave: (1 - 0.55 * near) * (1 - out),
    sky: (0.5 * near + 0.5 * out) * (1 - 0.35 * smoothstep(0.67, 1, s)) * (1 - 0.9 * smoothstep(0, 1, a * 0.3 + p * 0.7)) * (1 - smoothstep(0, 0.5, e)),
    tower: smoothstep(0.1, 0.8, a) * (1 - smoothstep(0.15, 0.8, e)),
    cave: smoothstep(0.45, 1.3, e) * (1 - 0.85 * smoothstep(0.15, 0.8, f)),
    halo: smoothstep(0.3, 0.95, f),
    // how far down the tower: its chord sinks with you, and rises again
    towerDepth: p,
  };
  // only tell the sound when something has really changed
  const key = Object.values(mix).map((v) => v.toFixed(2)).join();
  if (key !== mixed) { mixed = key; sound.setMix(mix); }
});

// footer ----------------------------------------------------------------------
// The wall at the end: built a screen ahead, drawn only while the footer shows,
// brought up by how far the footer is uncovered. Two versions of it:
//   'window' - a stained-glass window, its coloured light on the floor (stained.js)
//   'door'   - a pointed door of plain light, the tower faint beyond it (portal.js)
const FOOTER_SCENE = 'window';
const footCanvas = $('.foot-canvas');
liveScene({
  host: foot, canvas: footCanvas, create: FOOTER_SCENE === 'door' ? createPortal : createStained,
  ahead: '100%', delay: 140, end: 'bottom bottom',
  value: (s) => (reduced ? 1 : s.progress),
  onScroll: (s) => { where.foot = s.progress; },
  onFail: () => { footCanvas.hidden = true; },
});
if (!reduced) {
  const reveal = { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true };
  gsap.fromTo(['.foot-ask', '.foot-mail', '.foot-links li'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', stagger: 0.06, scrollTrigger: { ...reveal, start: 'top 50%' } });
  gsap.fromTo('.foot-meta', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { ...reveal, start: 'top 30%' } });
}

// layout ----------------------------------------------------------------------
// laid out anew for a new width; on a touch screen not for the height alone
// (that is the browser's bar coming and going while you scroll)
let rt, lastW = innerWidth;
addEventListener('resize', () => {
  if (coarse && innerWidth === lastW) return;
  lastW = innerWidth;
  clearTimeout(rt);
  rt = setTimeout(() => ScrollTrigger.refresh(), 200);
});
document.fonts.ready.then(() => ScrollTrigger.refresh());
