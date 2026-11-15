import { createHero } from './hero.js';
import { createSky } from './sky.js';
import { createWorks } from './works.js';
import { createCave } from './cave.js';
import { createPortal } from './portal.js';
import { createStained } from './stained.js';
import * as sound from './sound.js';

const { gsap, ScrollTrigger, SplitText, Lenis } = window;
gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const root = document.documentElement;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
// where the visitor is on the way down, for the sound: the flight (0..1), the
// arrival at the tower and its turning (0..1 each), the earth (0..2), the end (0..1)
const where = { hero: 0, sky: 0, a: 0, p: 0, e: 0, foot: 0 };

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

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

// smooth scroll ------------------------------------------------------------
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
    const host = el.closest('a, .win') || el;
    host.addEventListener('pointerenter', () => scramble(el, 0.45));
  });
}

// cursor -----------------------------------------------------------------------
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

// sound ----------------------------------------------------------------------
const soundBtn = $('.sound');
soundBtn.addEventListener('click', () => {
  const on = !sound.isEnabled();
  sound.setEnabled(on);
  soundBtn.setAttribute('aria-pressed', on);
  $('.sound-label', soundBtn).textContent = on ? 'Sound on' : 'Sound off';
});

// hero -----------------------------------------------------------------------
const heroEl = $('.hero');
const stage = $('.hero-stage');
const about = $('.about');
let sceneReady;
const scenePromise = new Promise((r) => { sceneReady = r; });
const hero = createHero($('.hero-canvas'), { onReady: () => { root.classList.add('scene-ready'); sceneReady(); } });
if (!hero) { root.classList.add('no-webgl'); sceneReady(); }

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
  gsap.ticker.add(() => hero.setPointer(eye.x / innerWidth * 2 - 1, -(eye.y / innerHeight * 2 - 1)));
}

// name and captions leave as the camera starts walking
gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: heroEl, start: 'top top', end: 'bottom bottom', scrub: true } })
  .to('.hero-title', { y: () => -innerHeight * 0.22, autoAlpha: 0, duration: 0.3 }, 0)
  .to('.hero-foot', { autoAlpha: 0, duration: 0.12 }, 0)
  .to('.hero-shade', { autoAlpha: 0, duration: 0.25 }, 0.55)
  .set({}, {}, 1);

// loader ---------------------------------------------------------------------
const loader = $('.loader');
const count = $('.loader-count');
const bar = $('.loader-bar i');
const load = { v: 0 };
const drawLoad = () => {
  count.textContent = String(Math.round(load.v * 100)).padStart(3, '0');
  bar.style.transform = `scaleX(${load.v})`;
};
const creep = gsap.to(load, { v: 0.86, duration: 2.4, ease: 'power2.out', onUpdate: drawLoad });
gsap.set(['.hero-name', '.hero-role', '.hero-foot > *'], { autoAlpha: 0 });

// the heavy scenes further down (the cave, the wall at the end) are built while
// the visitor is still at the window, in a quiet moment, never on the way to them
let introDone;
const introPromise = new Promise((r) => { introDone = r; });
const whenIdle = (fn, delay) => introPromise.then(() => setTimeout(() => {
  if ('requestIdleCallback' in window) requestIdleCallback(fn, { timeout: 2500 }); else fn();
}, delay));

let entered = false;
function enter() {
  if (entered) return;
  entered = true;
  creep.kill();
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
      lenis?.start();
      intro();
      introDone();
    }, '-=0.55')
    .add(() => loader.remove());
}
Promise.all([document.fonts.ready, scenePromise]).then(() => setTimeout(enter, 300));
setTimeout(enter, 7000);

function intro() {
  gsap.to('.hero-name', { autoAlpha: 1, duration: 0.2 });
  if (!reduced) scramble($('.hero-name'), 1.1);
  gsap.fromTo('.hero-role', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', delay: 0.5 });
  gsap.fromTo('.hero-foot > *', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.7 });
}

// sky ------------------------------------------------------------------------
// Out of the window, a short flight, a dive into a cloud, and on down through
// it until the tower comes up out of the haze below. One fixed canvas behind
// everything from the window to the cave.
const skyBox = $('.sky');
const sky = createSky($('canvas', skyBox));
ScrollTrigger.create({
  trigger: '.ascent', start: 'top bottom', end: 'bottom top',
  onUpdate: (s) => { where.sky = s.progress; sky && sky.setProgress(s.progress); },
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
  if (want && !reduced) sky.setPointer(eye.x / innerWidth * 2 - 1, -(eye.y / innerHeight * 2 - 1));
});

// work -----------------------------------------------------------------------
// A round tower in the mist. The section holds still while scrolling turns the
// tower and lifts it, one window after the other coming round to the middle.
const projects = $$('.work-list .win').map((a) => ({
  a,
  img: $('img', a),
  title: $('h3', a).textContent,
  meta: $$('p span', a).map((s) => s.textContent),
}));
const stageEl = $('.work-stage');
const worksCanvas = $('.works-canvas');
const selected = projects.filter((p) => p.a.hasAttribute('data-selected'));
const works = createWorks(worksCanvas, selected.map((p) => p.img));
if (!works) root.classList.add('no-works');

const nowTitle = $('.now-title');
const nowMeta = $$('.now-meta span');
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

// (declared before the tower's scroll is set up: when the page is reloaded halfway
// down, that scroll reports its position at once, and may already arrive)
// the title arrives when the mist has cleared
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
      sky && sky.setLower(a * 0.6 + p * 0.4);
      // the tower is there from the start, behind the cloud; it clears as we sink
      worksCanvas.style.opacity = (Math.min(1, Math.max(0, (a - 0.12) / 0.5))).toFixed(3);
      stageEl.style.setProperty('--fade', (1 - clamp(descent / 0.3, 0, 1)).toFixed(3));
      if (a > 0.6) arrive();
      $('.now-hint').style.setProperty('--seen', p.toFixed(3));
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
  function runWorks() { stageSeen && !under ? works.start() : works.stop(); }
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

// index: every project in one list, over the page --------------------------
const archive = $('.archive');
const archiveList = $('.archive-list');
const preview = $('.archive-preview');
archiveList.innerHTML = projects.map((p) => `<li data-cat="${p.meta[0]}"><a href="${p.a.getAttribute('href')}" data-cursor="View">
  <span class="a-title">${p.title}</span><span class="a-cat">${p.meta[0]}</span><span class="a-year">${p.meta[1]}</span><span class="a-arrow" aria-hidden="true">↗</span></a></li>`).join('');
const rows = $$('li', archiveList);
let opener = null, archiveOpen = false;
function openArchive() {
  if (archiveOpen) return;
  archiveOpen = true;
  opener = document.activeElement;
  archive.hidden = false;
  lenis?.stop();
  root.classList.add('archive-open');
  gsap.fromTo(archive, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: reduced ? 0 : 1.1, ease: 'expo.inOut' });
  if (!reduced) {
    gsap.fromTo(rows.filter((r) => !r.hidden), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.04, delay: 0.45 });
    scramble($('#archive-title'), 0.8);
  }
  $('.archive-close').focus({ preventScroll: true });
}
function closeArchive() {
  if (!archiveOpen) return;
  archiveOpen = false;
  preview.classList.remove('is-on');
  gsap.to(archive, {
    clipPath: 'inset(0 0 100% 0)', duration: reduced ? 0 : 0.9, ease: 'expo.inOut',
    onComplete() { archive.hidden = true; lenis?.start(); root.classList.remove('archive-open'); opener?.focus?.({ preventScroll: true }); },
  });
}
$('.work-index').addEventListener('click', openArchive);
$('.archive-close').addEventListener('click', closeArchive);
addEventListener('keydown', (e) => {
  if (!archiveOpen) return;
  if (e.key === 'Escape') closeArchive();
  if (e.key === 'Tab') {
    // keep the focus inside the index while it is open
    const f = $$('button, a', archive).filter((el) => el.offsetParent !== null);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
$$('.archive-filter button').forEach((b) => b.addEventListener('click', () => {
  $$('.archive-filter button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  const cat = b.dataset.cat;
  rows.forEach((r) => { r.hidden = !!cat && r.dataset.cat !== cat; });
  if (!reduced) gsap.fromTo(rows.filter((r) => !r.hidden), { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'power3.out', stagger: 0.03 });
}));
// the preview follows the hand, a little behind it
const pv = { x: 0, y: 0 };
rows.forEach((r, i) => {
  const a = $('a', r);
  a.addEventListener('pointerenter', () => { $('img', preview).src = projects[i].img.src; preview.classList.add('is-on'); });
  a.addEventListener('pointerleave', () => preview.classList.remove('is-on'));
});
gsap.ticker.add(() => {
  if (!archiveOpen) return;
  pv.x += (pointer.x + 28 - pv.x) * 0.16;
  pv.y += (pointer.y - preview.offsetHeight / 2 - pv.y) * 0.16;
  preview.style.transform = `translate3d(${pv.x.toFixed(1)}px, ${pv.y.toFixed(1)}px, 0)`;
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

// the cave: a live scene that only renders while its section is on screen
function stage3d(host, create) {
  const box = host.querySelector('.scene');
  let scene = null, seen = false;
  const make = () => {
    if (scene !== null) return;
    scene = create(box.querySelector('canvas'), { onReady: () => box.classList.add('is-ready') }) || false;
    if (scene && !reduced) gsap.ticker.add(() => scene.setPointer(eye.x / innerWidth * 2 - 1, -(eye.y / innerHeight * 2 - 1)));
    // built after a jump: start where the scroll already is
    if (scene) scene.setProgress(st.progress);
    sync();
  };
  const sync = () => { if (scene) (seen && !document.hidden ? scene.start() : scene.stop()); };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) make(); sync(); }).observe(host);
  // build it a screen ahead, so it is ready when it arrives
  new IntersectionObserver(([e]) => { if (e.isIntersecting) make(); }, { rootMargin: '120% 0px' }).observe(host);
  document.addEventListener('visibilitychange', sync);
  whenIdle(make, 2400);
  const st = ScrollTrigger.create({
    trigger: host, start: 'top bottom', end: 'bottom top',
    onUpdate: (s) => scene && scene.setProgress(s.progress),
  });
  return { make };
}
stage3d(about, createCave);


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

// about ------------------------------------------------------------------------
// the stage holds; its words stand in the cave itself, drawn in 3D (cave.js)

// footer ------------------------------------------------------------------------
// The wall at the end: built a screen ahead, drawn only while the footer shows,
// brought up by how far the footer is uncovered. Two versions of it:
//   'window' - a stained-glass window, its coloured light on the floor (stained.js)
//   'door'   - a pointed door of plain light, the tower faint beyond it (portal.js)
const FOOTER_SCENE = 'window';
{
  const box = $('.foot-canvas');
  let stone = null, seen = false;
  const make = () => {
    if (stone !== null) return;
    stone = (FOOTER_SCENE === 'door' ? createPortal : createStained)(box) || false;
    if (!stone) { box.hidden = true; return; }
    stone.setProgress(reduced ? 1 : st.progress);
    if (!reduced) gsap.ticker.add(() => stone.setPointer(eye.x / innerWidth * 2 - 1, -(eye.y / innerHeight * 2 - 1)));
    sync();
  };
  const sync = () => { if (stone) (seen && !document.hidden ? stone.start() : stone.stop()); };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen) make(); sync(); }).observe(foot);
  new IntersectionObserver(([e]) => { if (e.isIntersecting) make(); }, { rootMargin: '100% 0px' }).observe(foot);
  whenIdle(make, 4200);
  document.addEventListener('visibilitychange', sync);
  const st = ScrollTrigger.create({
    trigger: foot, start: 'top bottom', end: 'bottom bottom',
    onUpdate: (s) => { where.foot = s.progress; stone && stone.setProgress(reduced ? 1 : s.progress); },
  });
}
if (!reduced) {
  const reveal = { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true };
  gsap.fromTo(['.foot-ask', '.foot-mail', '.foot-links li'], { y: 40, opacity: 0 }, { y: 0, opacity: 1, ease: 'none', stagger: 0.06, scrollTrigger: { ...reveal, start: 'top 50%' } });
  gsap.fromTo('.foot-meta', { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger: { ...reveal, start: 'top 30%' } });
}

// -------------------------------------------------------------------------------
let rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => ScrollTrigger.refresh(), 200);
});
document.fonts.ready.then(() => ScrollTrigger.refresh());
