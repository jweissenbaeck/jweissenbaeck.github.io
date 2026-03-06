gsap.registerPlugin(ScrollTrigger);

/* HERO VIDEO ZOOM */

gsap.to(".hero-video",{
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

for(let i=0;i<cols*rows;i++){

const tile = document.createElement("div");
tile.classList.add("tile");

const inner = document.createElement("div");
inner.classList.add("tile-inner");

const front = document.createElement("div");
front.classList.add("tile-face","tile-front");

const back = document.createElement("div");
back.classList.add("tile-face","tile-back");

inner.appendChild(front);
inner.appendChild(back);
tile.appendChild(inner);
container.appendChild(tile);

let isHovered = false;

const tl = gsap.timeline({
paused:true,
defaults:{
duration:0.35,
ease:"power2.out"
}
});

tl.to(inner,{rotationX:180});

tile.addEventListener("mouseenter",()=>{

isHovered=true;
tl.play();

});

tile.addEventListener("mouseleave",()=>{

isHovered=false;

if(tl.progress()<1){

tl.eventCallback("onComplete",()=>{

if(!isHovered){
tl.reverse();
}

});

}else{

tl.reverse();

}

});

}

const cursor=document.querySelector(".cursor");
const ring=document.querySelector(".cursor-ring");

document.addEventListener("mousemove",(e)=>{

gsap.to(cursor,{
x:e.clientX,
y:e.clientY,
duration:0.15
});

gsap.to(ring,{
x:e.clientX,
y:e.clientY,
duration:0.25
});

});

const words = [
"DESIGN",
"MOTION",
"STUDIO",
"EXPERIENCE",
"CREATIVE"
];

let index = 0;
const wordElement = document.getElementById("cursorWord");

function changeWord(){

index++;

if(index >= words.length){
index = 0;
}

gsap.to(wordElement,{
opacity:0,
y:-3,
duration:0.08,
ease:"power2.out",
onComplete:()=>{

wordElement.textContent = words[index];

gsap.fromTo(wordElement,
{opacity:0,y:3},
{opacity:1,y:0,duration:0.12,ease:"power2.out"}
);

}
});

}

setInterval(changeWord,1500);

