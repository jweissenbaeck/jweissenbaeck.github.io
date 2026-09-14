/* ============================
   CV PAGE — Rendering + Reveals (neuer Stil)
============================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Smooth scroll läuft über script.js (Lenis) — keine zweite Instanz. */

  /* ── Daten: Erfahrung & Ausbildung ── */
  var DATA = [
    {
      year: 'Sept. 2025 — Now', role: 'UI / UX Designer', company: 'Websline',
      desc: 'Essential part of the software design process for internal and external products. Built a scalable design system from the ground up and shipped high-fidelity Figma prototypes with clear developer handoff — plus photography, videography and editing for hotel campaigns.',
      tags: ['Design Systems', 'Figma', 'Prototyping', 'Photo / Video']
    },
    {
      year: '2022 — 2025', role: 'B.Sc. Student', company: 'Paris Lodron University of Salzburg',
      desc: 'Studied Digitalization & Innovation with a focus on HCI and Design. Learned Product and Design Thinking across several web projects. Bachelor thesis on how apps can be designed to increase user motivation — graduated with 1.4, passing with distinction.',
      tags: ['HCI', 'Design Thinking', 'Web Design', 'Research']
    },
    {
      year: '2013 — 2021', role: 'Pupil & Intern', company: 'BRG Seekirchen',
      desc: 'Completed my Matura while doing internships and part-time work in IT and digital. Gained hands-on experience with databases, digital design and practical projects, and developed strong communication skills and several languages along the way.',
      tags: ['IT', 'Databases', 'Communication', 'Languages']
    }
  ];

  /* ── Capabilities ── */
  var CAPS = [
    { name: 'Design', items: ['UI / UX Design', 'Design Systems', 'Prototyping', 'Wireframing'] },
    { name: 'Tools', items: ['Figma', 'Adobe Suite', 'Framer', 'Notion'] },
    { name: 'Beyond', items: ['Photography', 'Videography', 'Editing', 'Piano'] }
  ];

  /* ── Experience-Liste rendern ── */
  var list = document.getElementById('cvList');
  if (list) {
    DATA.forEach(function (d) {
      var li = document.createElement('li');
      li.className = 'cv-entry';
      var tags = d.tags.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      li.innerHTML =
        '<div class="cv-entry-year">' + d.year + '</div>' +
        '<div class="cv-entry-main">' +
          '<h3 class="cv-entry-role">' + d.role + '</h3>' +
          '<div class="cv-entry-company">' + d.company + '</div>' +
          '<p class="cv-entry-desc">' + d.desc + '</p>' +
          '<ul class="cv-tags">' + tags + '</ul>' +
        '</div>';
      list.appendChild(li);
    });
  }

  /* ── Capabilities rendern ── */
  var capsGrid = document.getElementById('cvCapsGrid');
  if (capsGrid) {
    CAPS.forEach(function (c, i) {
      var col = document.createElement('div');
      col.className = 'cv-cap';
      var idx = ('0' + (i + 1)).slice(-2);
      col.innerHTML =
        '<span class="cv-cap-idx">' + idx + '</span>' +
        '<span class="cv-cap-name">' + c.name + '</span>' +
        '<div class="cv-cap-list">' + c.items.map(function (it) { return '<span>' + it + '</span>'; }).join('') + '</div>';
      capsGrid.appendChild(col);
    });
  }

  if (reduce) return;

  /* ── Reveals ── */
  gsap.set('.cv-line-in', { yPercent: 115 });
  function play() {
    gsap.to('.cv-hero-title .cv-line-in', { yPercent: 0, duration: 0.95, ease: 'power4.out', stagger: 0.09, delay: 0.05 });
    gsap.from('.cv-hero-foot', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.45 });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(play); else play();

  if (typeof ScrollTrigger !== 'undefined') {
    /* Section-Köpfe */
    gsap.utils.toArray('.cv-sec-head').forEach(function (el) {
      gsap.from(el, { y: 28, opacity: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    /* Experience-Einträge gestaffelt */
    gsap.utils.toArray('.cv-entry').forEach(function (el, i) {
      gsap.from(el, { y: 30, opacity: 0, duration: 0.7, ease: 'power3.out', delay: (i % 3) * 0.05,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
    /* Capability-Spalten */
    gsap.utils.toArray('.cv-cap').forEach(function (el, i) {
      gsap.from(el, { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out', delay: i * 0.08,
        scrollTrigger: { trigger: '#cvCapsGrid', start: 'top 86%', once: true } });
    });
    /* Footer-Mail */
    gsap.set('.cv-foot-mail .cv-line-in', { yPercent: 115 });
    ScrollTrigger.create({
      trigger: '#cvFoot', start: 'top 80%', once: true,
      onEnter: function () { gsap.to('.cv-foot-mail .cv-line-in', { yPercent: 0, duration: 0.9, ease: 'power4.out' }); }
    });
  }
});