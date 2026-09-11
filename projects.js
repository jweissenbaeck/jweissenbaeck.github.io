/* ============================================================
   PROJECTS — Full list (Index-Stil) + Image-Trail on hover
============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ── Lenis ── */
  if (typeof Lenis !== 'undefined' && !reduce) {
    var lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function pic(id) { return 'https://picsum.photos/id/' + id + '/600/750'; }

  /* ── Projekte (chronologisch, neueste zuerst) ── */
  var PROJECTS = [
    { name: 'Lumina', year: '2024', tags: ['UI/UX', 'Design System', 'AI'], link: '#', images: [pic(1015), pic(1016), pic(1018)] },
    { name: 'Flux',   year: '2024', tags: ['Product', 'Collaboration'],     link: '#', images: [pic(1039), pic(1043), pic(1044)] },
    { name: 'Prism',  year: '2023', tags: ['Tool', 'Color', 'Web'],         link: '#', images: [pic(1050), pic(1062), pic(1069)] },
    { name: 'Vertex', year: '2023', tags: ['3D', 'Web', 'Toolkit'],         link: '#', images: [pic(1074), pic(1080), pic(1084)] }
  ];

  var listEl = document.getElementById('pjList');

  PROJECTS.forEach(function (p, i) {
    var row = document.createElement('li');
    row.className = 'pl-row';
    row.dataset.images = p.images.join('|');

    var tagsHtml = p.tags.map(function (t) { return '<span class="pl-tag">' + t + '</span>'; }).join('');
    row.innerHTML =
      '<a class="pl-link" href="' + p.link + '" aria-label="' + p.name + ' — ' + p.year + '">' +
        '<span class="pl-idx">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="pl-name">' + p.name + '</span>' +
        '<span class="pl-tags">' + tagsHtml + '</span>' +
        '<span class="pl-year">' + p.year + '</span>' +
        '<span class="pl-arrow">↗</span>' +
      '</a>';
    listEl.appendChild(row);
  });

  /* ── Titel-Reveal ── */
  gsap.set('.pjx-title-inner', { yPercent: 110 });
  function playTitle() {
    if (reduce) { gsap.set('.pjx-title-inner', { yPercent: 0 }); return; }
    gsap.to('.pjx-title-inner', { yPercent: 0, duration: 0.8, ease: 'power4.out' });
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(playTitle); else playTitle();

  /* ── Zeilen-Reveal beim Scroll (Clip-Wipe, Index-Stil) ── */
  var rows = Array.prototype.slice.call(document.querySelectorAll('.pl-row'));
  if (reduce) {
    gsap.set(rows, { clipPath: 'none', y: 0, opacity: 1 });
  } else {
    rows.forEach(function (row) {
      gsap.set(row, { clipPath: 'inset(0 0 100% 0)', y: 22, opacity: 0 });
      ScrollTrigger.create({
        trigger: row, start: 'top 90%', once: true,
        onEnter: function () {
          gsap.to(row, { clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1, duration: 0.85, ease: 'power4.out' });
        }
      });
    });
  }

  /* ============================================================
     IMAGE-TRAIL — Bilder haften beim Hover dem Cursor an
  ============================================================ */
  (function initImageTrail() {
    var layer = document.getElementById('plTrail');
    if (!layer || reduce) return;
    var fine = !window.matchMedia || window.matchMedia('(pointer: fine)').matches;
    if (!fine) return;

    /* Pool wiederverwendbarer Bild-Frames */
    var POOL = 12;
    var pool = [];
    for (var k = 0; k < POOL; k++) {
      var el = document.createElement('div');
      el.className = 'pl-trail-img';
      var im = document.createElement('img');
      im.alt = ''; im.decoding = 'async'; im.draggable = false;
      el.appendChild(im);
      layer.appendChild(el);
      pool.push({ el: el, img: im });
    }
    var poolIdx = 0;

    var activeImages = null, imgCycle = 0;
    var lastX = 0, lastY = 0, primed = false;
    var THRESH = 70;        // px Cursorweg zwischen zwei Frames

    /* Preload der Bilder beim Zeilen-Hover + aktive Bildmenge setzen */
    rows.forEach(function (row) {
      var imgs = (row.dataset.images || '').split('|').filter(Boolean);
      imgs.forEach(function (src) { var pi = new Image(); pi.src = src; });
      row.addEventListener('mouseenter', function () { activeImages = imgs; imgCycle = 0; });
      row.addEventListener('mouseleave', function () { activeImages = null; });
    });

    function spawn(x, y) {
      if (!activeImages || !activeImages.length) return;
      var slot = pool[poolIdx % pool.length]; poolIdx++;
      slot.img.src = activeImages[imgCycle % activeImages.length]; imgCycle++;
      gsap.killTweensOf(slot.el);
      gsap.set(slot.el, { xPercent: -50, yPercent: -50, x: x, y: y, rotation: (Math.random() * 8 - 4) });
      gsap.fromTo(slot.el,
        { opacity: 0, scale: 0.82 },
        { opacity: 1, scale: 1, duration: 0.32, ease: 'power3.out' });
      gsap.to(slot.el, { opacity: 0, scale: 0.92, duration: 0.55, delay: 0.18, ease: 'power2.in' });
    }

    window.addEventListener('mousemove', function (e) {
      var x = e.clientX, y = e.clientY;
      if (!primed) { lastX = x; lastY = y; primed = true; return; }
      if (!activeImages) { lastX = x; lastY = y; return; }
      var dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx * dx + dy * dy) >= THRESH) {
        spawn(x, y); lastX = x; lastY = y;
      }
    }, { passive: true });
  })();

});