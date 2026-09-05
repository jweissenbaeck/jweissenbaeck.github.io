/* ============================
   CV PAGE — Experience Dossier
============================ */

window.addEventListener('DOMContentLoaded', function () {

  /* ── Lenis smooth scroll ── */
  var lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  var EXPO = 'cubic-bezier(0.16,1,0.3,1)';

  /* ── Daten der Stationen ── */
  var DATA = [
    {
      year: 'Sept. 2025 — now', role: 'UI / UX Designer', company: 'Websline', num: '01',
      desc: 'Essential part of the software design process for internal and external products. Built a scalable design system from the ground up and shipped high-fidelity Figma prototypes with clear developer handoff — plus photography, videography and editing for hotel campaigns.',
      tags: ['Design Systems', 'Figma', 'Prototyping', 'Photo / Video'],
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%230d0d0c'/%3E%3Crect x='88' y='96' width='180' height='320' rx='28' fill='%23f0ede8'/%3E%3Crect x='318' y='132' width='170' height='90' rx='20' fill='%23938d82'/%3E%3Crect x='318' y='252' width='170' height='110' rx='20' fill='%235e594f'/%3E%3C/svg%3E"
    },
    {
      year: '2022 — 2025', role: 'B.Sc. Student', company: 'Paris Lodron University of Salzburg', num: '02',
      desc: 'Studied Digitalization & Innovation with a focus on HCI and Design. Learned Product and Design Thinking across several web projects. Bachelor thesis on how apps can be designed to increase user motivation — graduated with 1.4, passing with distinction.',
      tags: ['HCI', 'Design Thinking', 'Web Design', 'Research'],
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 800'%3E%3Crect width='600' height='800' fill='%23110f0e'/%3E%3Crect x='100' y='120' width='400' height='520' rx='32' fill='%23f0ede8'/%3E%3Crect x='148' y='188' width='304' height='92' rx='20' fill='%23160f0d'/%3E%3Crect x='148' y='326' width='142' height='220' rx='20' fill='%23948d81'/%3E%3Crect x='310' y='326' width='142' height='220' rx='20' fill='%235e594f'/%3E%3C/svg%3E"
    },
    {
      year: '2013 — 2021', role: 'Pupil & Intern', company: 'BRG Seekirchen', num: '03',
      desc: 'Completed my Matura while doing internships and part-time work in IT and digital. Gained hands-on experience with databases, digital design and practical projects, and developed strong communication skills and several languages along the way.',
      tags: ['IT', 'Databases', 'Communication', 'Languages'],
      img: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%230f0f0e'/%3E%3Crect x='98' y='120' width='404' height='326' rx='32' fill='%23f0ede8'/%3E%3Cpath d='M160 404L284 230L402 404' stroke='%23110f0e' stroke-width='24' fill='none' stroke-linecap='round'/%3E%3C/svg%3E"
    }
  ];

  var items   = gsap.utils.toArray('.cvx-item');
  var marker  = document.getElementById('cvxMarker');
  var ghost   = document.getElementById('cvxGhost');
  var mediaEl = document.getElementById('cvxMedia');
  var mediaImg= document.getElementById('cvxMediaImg');
  var elYear  = document.getElementById('cvxYear');
  var elRole  = document.getElementById('cvxRole');
  var elComp  = document.getElementById('cvxCompany');
  var elDesc  = document.getElementById('cvxDesc');
  var elTags  = document.getElementById('cvxTags');
  var stage   = document.getElementById('cvxStage');

  var current = -1;
  var reduce  = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function moveMarker(i) {
    var btn = items[i].querySelector('.cvx-item-btn');
    if (!btn || !btn.offsetHeight) return;
    marker.style.height = btn.offsetHeight + 'px';
    marker.style.transform = 'translateY(' + items[i].offsetTop + 'px)';
  }

  function renderTags(tags) {
    elTags.innerHTML = '';
    tags.forEach(function (t, k) {
      var li = document.createElement('li');
      li.textContent = t;
      elTags.appendChild(li);
      if (!reduce) {
        gsap.fromTo(li, { y: 12, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.12 + k * 0.05 });
      }
    });
  }

  function setActive(i, instant) {
    if (i === current) return;
    current = i;
    var d = DATA[i];

    items.forEach(function (it, k) { it.classList.toggle('is-active', k === i); });
    moveMarker(i);

    elYear.textContent = d.year;
    elComp.textContent = d.company;

    if (reduce || instant) {
      ghost.textContent = d.num;
      elRole.textContent = d.role;
      elDesc.textContent = d.desc;
      gsap.set(ghost,   { opacity: 1, y: 0 });
      gsap.set(elRole,  { yPercent: 0 });
      gsap.set(elDesc,  { opacity: 1, y: 0 });
      mediaImg.src = d.img;
      gsap.set(mediaImg, { clipPath: 'inset(0 0 0% 0)', scale: 1.06 });
      renderTags(d.tags);
      return;
    }

    /* Ghost-Zahl morph */
    gsap.timeline()
      .to(ghost, { y: -30, opacity: 0, duration: 0.28, ease: 'power2.in',
        onComplete: function () { ghost.textContent = d.num; } })
      .fromTo(ghost, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' });

    /* Titel: Clip-Reveal (raus, Text tauschen, rein) */
    gsap.timeline()
      .to(elRole, { yPercent: -110, duration: 0.3, ease: 'power2.in',
        onComplete: function () { elRole.textContent = d.role; } })
      .fromTo(elRole, { yPercent: 110 }, { yPercent: 0, duration: 0.55, ease: 'power4.out' });

    /* Desc: Fade/Slide */
    gsap.timeline()
      .to(elDesc, { opacity: 0, y: 10, duration: 0.22, ease: 'power2.in',
        onComplete: function () { elDesc.textContent = d.desc; } })
      .to(elDesc, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });

    /* Media: Clip-Morph + Bildwechsel */
    gsap.to(mediaEl, {
      duration: 0.35, ease: 'power2.inOut',
      onStart: function () {
        gsap.set(mediaEl.querySelector('img'), { clipPath: 'inset(0 0 100% 0)' });
      },
      onComplete: function () {
        mediaImg.src = d.img;
        gsap.fromTo(mediaEl.querySelector('img'),
          { clipPath: 'inset(0 0 100% 0)', scale: 1.15 },
          { clipPath: 'inset(0 0 0% 0)', scale: 1.06, duration: 0.7, ease: EXPO });
      }
    });

    renderTags(d.tags);
  }

  /* Interaktion: Hover / Klick / Fokus */
  items.forEach(function (it, i) {
    var btn = it.querySelector('.cvx-item-btn');
    btn.addEventListener('mouseenter', function () { setActive(i); });
    btn.addEventListener('focus',      function () { setActive(i); });
    btn.addEventListener('click', function (e) { e.preventDefault(); setActive(i); });
  });

  /* Cursor-Parallax auf der Bühne (Ghost + Media in verschiedenen Tiefen) */
  if (!reduce) {
    var gx = 0, gy = 0, tx = 0, ty = 0;
    stage.addEventListener('mousemove', function (e) {
      var r = stage.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5);
      ty = ((e.clientY - r.top) / r.height - 0.5);
    });
    stage.addEventListener('mouseleave', function () { tx = 0; ty = 0; });
    var smooth = window.__smoothTowards || function (c, t) { return c + (t - c) * 0.06; };
    gsap.ticker.add(function (time, deltaTime) {
      var dt = Math.min(deltaTime || 16.7, 50) / 1000;
      gx = smooth(gx, tx, 0.13, dt); gy = smooth(gy, ty, 0.13, dt);   // Sekunden Nachlauf, framerate-unabhängig
      gsap.set(ghost,   { x: gx * -30, y: gy * -20 });
      gsap.set(mediaEl, { x: gx * 26,  y: gy * 22 });
    });
  }

  /* Reveal beim Laden (unabhängig von ScrollTrigger, damit Inhalt sicher erscheint) */
  gsap.set('.cvx-title-inner', { yPercent: 110 });
  function playReveal() {
    if (reduce) { gsap.set('.cvx-title-inner', { yPercent: 0 }); return; }
    gsap.timeline()
      .to('.cvx-title-inner', { yPercent: 0, duration: 0.8, ease: 'power4.out' })
      .from('.cvx-item', { y: 24, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out' }, 0.15)
      .from('.cvx-stage', { opacity: 0, y: 30, duration: 0.7, ease: 'power3.out' }, 0.2);
  }

  /* Init */
  function init() {
    current = -1;
    setActive(0, true);   /* erste Station sofort — kein Morph-Flash */
    moveMarker(0);
    playReveal();
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(init); } else { init(); }
  window.addEventListener('resize', function () { moveMarker(current < 0 ? 0 : current); });

  /* ── Nav buttons hide / Between-strip reveal at footer ── */
  var navBack     = document.getElementById('navBack');
  var navDownload = document.getElementById('navDownload');
  var strip       = document.getElementById('cvNavStrip');
  gsap.set(strip, { opacity: 0, y: 8 });
  ScrollTrigger.create({
    trigger: '#cvFooter', start: 'top 95%',
    onEnter: function () {
      gsap.to([navBack, navDownload], { opacity: 0, duration: 0.35, ease: 'power2.in', pointerEvents: 'none' });
      gsap.to(strip, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
    },
    onLeaveBack: function () {
      gsap.to([navBack, navDownload], { opacity: 1, duration: 0.35, ease: 'power2.out', pointerEvents: 'all' });
      gsap.to(strip, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    }
  });

  /* ── Footer animations ── */
  gsap.to('.cv-footer-label', { scrollTrigger: { trigger: '.cv-footer', start: 'top 80%' }, opacity: 1, y: 0, duration: 0.9, ease: 'power4.out' });
  gsap.to('.cv-footer-cta',   { scrollTrigger: { trigger: '.cv-footer', start: 'top 75%' }, opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.15 });
  gsap.to('.cv-footer-divider', { scrollTrigger: { trigger: '.cv-footer-divider', start: 'top 90%' }, scaleX: 1, duration: 1.1, ease: 'power4.inOut' });
  gsap.to('.cv-footer-bottom', { scrollTrigger: { trigger: '.cv-footer-bottom', start: 'top 90%' }, opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' });

});