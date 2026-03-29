gsap.registerPlugin(ScrollTrigger);

/* ============================
   3D SPIRAL MOUSE PARALLAX
============================ */
const spiralWrapper = document.getElementById("spiralWrapper");

document.addEventListener("mousemove", (e) => {
  if(!spiralWrapper) return;
  const x = (window.innerWidth  / 2 - e.pageX) / 20;
  const y = (window.innerHeight / 2 - e.pageY) / 20;
  spiralWrapper.style.transform = `rotateX(${y}deg) rotateZ(${x / 2}deg)`;
});

/* ============================
   CURSOR
============================ */
const cursor = document.querySelector(".cursor");
const ring   = document.querySelector(".cursor-ring");
const hero   = document.querySelector(".hero-spiral");
const nav    = document.querySelector(".nav");

document.addEventListener("mousemove", (e) => {
  window._cursorX = e.clientX;
  window._cursorY = e.clientY;
  gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.15 });
  gsap.to(ring,   { x: e.clientX, y: e.clientY, duration: 0.25 });
});

if(hero){
  hero.addEventListener("mouseenter", () => ring.classList.add("visible"));
  hero.addEventListener("mouseleave", () => ring.classList.remove("visible"));
}
if(nav){
  nav.addEventListener("mouseenter", () => ring.classList.remove("visible"));
  nav.addEventListener("mouseleave", () => {
    if(!hero) return;
    const r = hero.getBoundingClientRect();
    const x = window._cursorX || 0;
    const y = window._cursorY || 0;
    if(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom){
      ring.classList.add("visible");
    }
  });
}

/* ============================
   CURSOR WORD CYCLE
============================ */
const words    = ["DESIGN","MOTION","STUDIO","EXPERIENCE","CREATIVE"];
let wordIndex  = 0;
const wordEl   = document.getElementById("cursorWord");

function changeWord(){
  wordIndex = (wordIndex + 1) % words.length;
  gsap.to(wordEl, {
    opacity:0, y:-3, duration:0.08, ease:"power2.out",
    onComplete: () => {
      wordEl.textContent = words[wordIndex];
      gsap.fromTo(wordEl,
        { opacity:0, y:3 },
        { opacity:1, y:0, duration:0.12, ease:"power2.out" }
      );
    }
  });
}
setInterval(changeWord, 1500);

/* ============================
   WORK LEFT — scroll update
============================ */
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