/* ============================
   CV PAGE — Rendering + ruhige Reveals
============================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Smooth scroll läuft über script.js (Lenis) — keine zweite Instanz. */

  var DATA = [
    {
      year: '2025 — Now', role: 'UI / UX Designer', company: 'Websline',
      desc: 'Essential part of the software design process for internal and external products. Built a scalable design system from the ground up and shipped high-fidelity Figma prototypes with clear developer handoff — plus photography, videography and editing for hotel campaigns.'
    },
    {
      year: '2022 — 2025', role: 'B.Sc. Student', company: 'PLUS Salzburg',
      desc: 'Studied Digitalization & Innovation with a focus on HCI and Design. Learned Product and Design Thinking across several web projects. Bachelor thesis on how apps can be designed to increase user motivation — graduated with 1.4, passing with distinction.'
    },
    {
      year: '2013 — 2021', role: 'Pupil & Intern', company: 'BRG Seekirchen',
      desc: 'Completed my Matura while doing internships and part-time work in IT and digital. Gained hands-on experience with databases, digital design and practical projects, and developed strong communication skills and several languages along the way.'
    }
  ];

  var CAPS = [
    { k: 'Design', v: 'UI / UX Design, Design Systems, Prototyping, Wireframing' },
    { k: 'Tools',  v: 'Figma, Adobe Suite, Framer, Notion' },
    { k: 'Beyond', v: 'Photography, Videography, Editing, Piano' }
  ];

  /* Experience */
  var list = document.getElementById('cvList');
  if (list) {
    DATA.forEach(function (d) {
      var li = document.createElement('li');
      li.className = 'cv-row reveal';
      li.innerHTML =
        '<span class="cv-row-year">' + d.year + '</span>' +
        '<h3 class="cv-row-role">' + d.role + ' <span class="cv-row-co">' + d.company + '</span></h3>' +
        '<p class="cv-row-desc">' + d.desc + '</p>';
      list.appendChild(li);
    });
  }

  /* Capabilities */
  var caps = document.getElementById('cvCaps');
  if (caps) {
    CAPS.forEach(function (c) {
      var row = document.createElement('div');
      row.className = 'cv-cap reveal';
      row.innerHTML = '<span class="cv-cap-k">' + c.k + '</span><span class="cv-cap-v">' + c.v + '</span>';
      caps.appendChild(row);
    });
  }

  if (reduce) { document.querySelectorAll('.reveal').forEach(function (el) { el.style.opacity = '1'; }); return; }

  /* ── Ruhige Reveals ── */
  /* Hero beim Laden, sanft gestaffelt */
  var heroEls = document.querySelectorAll('.cv-hero .reveal');
  gsap.set(heroEls, { y: 18, opacity: 0 });
  function playHero() {
    gsap.to(heroEls, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.05 });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(playHero); else playHero();

  /* Restliche .reveal beim Scrollen (dezent) */
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.utils.toArray('.reveal').forEach(function (el) {
      if (el.closest('.cv-hero')) return;               // Hero läuft separat
      gsap.set(el, { y: 16, opacity: 0 });
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(el, { y: 0, opacity: 1, duration: 0.85, ease: 'power2.out' }); }
      });
    });
  }
});