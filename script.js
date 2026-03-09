gsap.registerPlugin(ScrollTrigger);

/* ============================
   SKETCH CANVAS BACKGROUND
============================ */
(function(){
  const canvas = document.getElementById("sketchCanvas");
  const ctx    = canvas.getContext("2d");

  function resize(){
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function randBetween(a, b){ return a + Math.random() * (b - a); }
  function lerp(a, b, t){ return a + (b - a) * t; }

  const STROKE_COUNT = 38;
  const strokes = [];

  function makeStroke(){
    const W = canvas.width;
    const H = canvas.height;

    const x1 = randBetween(0, W);
    const y1 = randBetween(0, H);
    const angle = Math.random() < 0.5
      ? (Math.random() < 0.5 ? 0 : Math.PI / 2)
      : randBetween(-Math.PI / 6, Math.PI / 6);
    const len  = randBetween(80, W * 0.35);
    const x2   = x1 + Math.cos(angle) * len;
    const y2   = y1 + Math.sin(angle) * len;

    const totalDur = randBetween(1800, 3600);
    const holdDur  = randBetween(600,  1800);
    const fadeDur  = randBetween(400,  900);
    const pauseDur = randBetween(200,  1200);
    const alpha    = randBetween(0.08, 0.22);
    const lineWidth= randBetween(0.5,  1.4);
    const wobble   = [
      { t: randBetween(0.2, 0.45), d: randBetween(-6, 6) },
      { t: randBetween(0.5, 0.75), d: randBetween(-6, 6) },
    ];

    return {
      x1, y1, x2, y2, wobble,
      totalDur, holdDur, fadeDur, pauseDur,
      alpha, lineWidth,
      phase: "draw", progress: 0, elapsed: 0, currentAlpha: 0,
    };
  }

  for(let i = 0; i < STROKE_COUNT; i++){
    const s = makeStroke();
    s.elapsed = -randBetween(0, s.totalDur + s.holdDur + s.fadeDur + s.pauseDur);
    strokes.push(s);
  }

  function drawStroke(s, progress, opacity){
    if(opacity <= 0) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = "#c8dbb4";
    ctx.lineWidth   = s.lineWidth;
    ctx.lineCap     = "round";

    const pts = [{ t:0, x:s.x1, y:s.y1 }];
    s.wobble.forEach(w => {
      const tx  = lerp(s.x1, s.x2, w.t);
      const ty  = lerp(s.y1, s.y2, w.t);
      const dx  = s.x2 - s.x1, dy = s.y2 - s.y1;
      const len = Math.sqrt(dx*dx + dy*dy) || 1;
      pts.push({ t: w.t, x: tx - (dy/len)*w.d, y: ty + (dx/len)*w.d });
    });
    pts.push({ t:1, x:s.x2, y:s.y2 });
    pts.sort((a,b) => a.t - b.t);

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    const endT = progress;
    for(let i = 1; i < pts.length; i++){
      const prev = pts[i-1], curr = pts[i];
      if(prev.t >= endT) break;
      const segEnd = Math.min(curr.t, endT);
      const frac   = (segEnd - prev.t) / (curr.t - prev.t);
      ctx.lineTo(lerp(prev.x, curr.x, frac), lerp(prev.y, curr.y, frac));
    }
    ctx.stroke();
    ctx.restore();
  }

  let lastTime = null;

  function tick(now){
    if(!lastTime) lastTime = now;
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    strokes.forEach(s => {
      s.elapsed += dt;
      if(s.elapsed < 0) return;

      const t = s.elapsed;

      if(s.phase === "draw"){
        s.progress     = Math.min(t / s.totalDur, 1);
        s.currentAlpha = s.alpha * Math.min(s.progress * 4, 1);
        if(t >= s.totalDur){ s.phase = "hold"; s.elapsed = 0; }

      } else if(s.phase === "hold"){
        s.progress     = 1;
        s.currentAlpha = s.alpha;
        if(t >= s.holdDur){ s.phase = "fade"; s.elapsed = 0; }

      } else if(s.phase === "fade"){
        s.progress     = 1;
        s.currentAlpha = s.alpha * (1 - t / s.fadeDur);
        if(t >= s.fadeDur){ s.phase = "pause"; s.elapsed = 0; }

      } else if(s.phase === "pause"){
        s.currentAlpha = 0;
        if(t >= s.pauseDur){
          const fresh = makeStroke();
          Object.assign(s, fresh);
          s.phase = "draw"; s.elapsed = 0; s.progress = 0; s.currentAlpha = 0;
        }
      }

      drawStroke(s, s.progress, s.currentAlpha);
    });

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();



/* CANVAS ZOOM on scroll (same as video zoom was) */
gsap.to("#sketchCanvas",{
  scale:1.2,
  scrollTrigger:{
    trigger:".hero",
    start:"top top",
    end:"bottom top",
    scrub:true
  }
});

/* HERO TEXT FADE */
gsap.to(".hero-content",{
  opacity:0,
  y:-100,
  scrollTrigger:{
    trigger:".hero",
    start:"top top",
    end:"bottom top",
    scrub:true
  }
});

/* TILE GENERATOR */
const container = document.getElementById("heroTiles");
const cols = 16;
const rows = 9;

for(let i = 0; i < cols * rows; i++){
  const tile  = document.createElement("div");
  tile.classList.add("tile");

  const inner = document.createElement("div");
  inner.classList.add("tile-inner");

  const front = document.createElement("div");
  front.classList.add("tile-face","tile-front");

  const back  = document.createElement("div");
  back.classList.add("tile-face","tile-back");

  inner.appendChild(front);
  inner.appendChild(back);
  tile.appendChild(inner);
  container.appendChild(tile);

  let isHovered = false;

  const tl = gsap.timeline({
    paused: true,
    defaults:{ duration:0.35, ease:"power2.out" }
  });
  tl.to(inner,{ rotationX:180 });

  tile.addEventListener("mouseenter", () => {
    isHovered = true;
    tl.play();
  });

  tile.addEventListener("mouseleave", () => {
    isHovered = false;
    if(tl.progress() < 1){
      tl.eventCallback("onComplete", () => {
        if(!isHovered) tl.reverse();
      });
    } else {
      tl.reverse();
    }
  });
}

/* CURSOR */
const cursor = document.querySelector(".cursor");
const ring   = document.querySelector(".cursor-ring");
const hero   = document.querySelector(".hero");
const nav    = document.querySelector(".nav");

document.addEventListener("mousemove",(e) => {
  window._cursorX = e.clientX;
  window._cursorY = e.clientY;
  gsap.to(cursor,{ x:e.clientX, y:e.clientY, duration:0.15 });
  gsap.to(ring,  { x:e.clientX, y:e.clientY, duration:0.25 });
});

hero.addEventListener("mouseenter", () => ring.classList.add("visible"));
hero.addEventListener("mouseleave", () => ring.classList.remove("visible"));
nav.addEventListener("mouseenter",  () => ring.classList.remove("visible"));
nav.addEventListener("mouseleave",  () => {
  const r = hero.getBoundingClientRect();
  const x = window._cursorX || 0;
  const y = window._cursorY || 0;
  if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom){
    ring.classList.add("visible");
  }
});

/* CURSOR WORD CYCLE */
const words = ["DESIGN","MOTION","STUDIO","EXPERIENCE","CREATIVE"];
let wordIndex = 0;
const wordEl  = document.getElementById("cursorWord");

function changeWord(){
  wordIndex = (wordIndex + 1) % words.length;
  gsap.to(wordEl,{
    opacity:0, y:-3, duration:0.08, ease:"power2.out",
    onComplete:() => {
      wordEl.textContent = words[wordIndex];
      gsap.fromTo(wordEl,
        { opacity:0, y:3 },
        { opacity:1, y:0, duration:0.12, ease:"power2.out" }
      );
    }
  });
}
setInterval(changeWord, 1500);

const workDesc  = document.getElementById("workDesc");
const workCount = document.getElementById("workCount");

let activeCardIndex = null;

function updateWorkLeft(index, desc){
  if(index === activeCardIndex) return;
  activeCardIndex = index;

  workDesc.classList.add("fade");
  workCount.classList.add("fade");

  setTimeout(() => {
    workDesc.textContent  = desc;
    workCount.textContent = index;
    workDesc.classList.remove("fade");
    workCount.classList.remove("fade");
  }, 300);
}

document.querySelectorAll(".card").forEach((card) => {
  ScrollTrigger.create({
    trigger: card,
    start: "top center",
    end:   "bottom center",
    onEnter:     () => updateWorkLeft(card.dataset.index, card.dataset.desc),
    onEnterBack: () => updateWorkLeft(card.dataset.index, card.dataset.desc),
  });
});