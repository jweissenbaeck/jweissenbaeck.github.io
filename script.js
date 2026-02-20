const design = document.querySelector(".design");
const shapes = document.querySelector(".shapes");
const worlds = document.querySelector(".worlds");
const subtext = document.querySelector(".hero-subtext");
const hero = document.querySelector(".hero");

const cursor = document.querySelector(".cursor");
let mouseX=0, mouseY=0, currentX=0, currentY=0;

document.addEventListener("mousemove",(e)=>{
  mouseX=e.clientX;
  mouseY=e.clientY;
});

function animateCursor(){
  currentX += (mouseX-currentX)*0.15;
  currentY += (mouseY-currentY)*0.15;
  cursor.style.left=currentX+"px";
  cursor.style.top=currentY+"px";
  requestAnimationFrame(animateCursor);
}
animateCursor();

/* Scroll-Simulation */
let targetProgress = 0;
let currentProgress = 0;

window.addEventListener("wheel", e => {
  targetProgress += e.deltaY * 0.0009; // <- langsamer als vorher
  targetProgress = Math.min(Math.max(targetProgress,0),1);
});

function updateHero(progress){
  const designWidth = design.offsetWidth;
  const shapesWidth = shapes.offsetWidth;

  // DESIGN nach links raus
  design.style.transform = `translateX(${-progress*(window.innerWidth + designWidth)}px)`;

  // SHAPES nach rechts raus
  shapes.style.transform = `translateX(${progress*(window.innerWidth + shapesWidth)}px)`;

  // Untertext schneller dissolven
  subtext.style.opacity = `${Math.max(1 - progress*3,0)}`;

  // WORLDS smooth zur Mitte
  const heroHeight = hero.offsetHeight;
  const startOffset = 0; // initial Y in %
  const endOffset = (window.innerHeight/2 - worlds.offsetHeight/2 - hero.offsetTop) / heroHeight * 100;
  // progress clamped zwischen 0-1
  const worldsProgress = Math.min(progress / 0.5, 1); // bis progress=0.5 hoch
  const moveY = startOffset + worldsProgress * endOffset;

  worlds.style.transform = `translateY(${moveY}%)`;
}

function animateHero(){
  currentProgress += (targetProgress - currentProgress) * 0.05; // <- langsamer, smooth
  updateHero(currentProgress);
  requestAnimationFrame(animateHero);
}
animateHero();