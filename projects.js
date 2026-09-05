/* ============================
   PROJECTS — Chronological Index
============================ */
window.addEventListener('DOMContentLoaded', function () {

  /* ── Lenis smooth scroll ── */
  var lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  var EXPO = 'power4.out';

  /* Monochrome SVG-Platzhalter (bis echte Projektbilder da sind) */
  function ph(seed) {
    var bg = ['0d0d0c', '121110', '0f0f0d', '16150f'][seed % 4];
    var fg = 'f0ede8', mid = ['938d82', '5e594f', '7a756f', 'b7b0a6'][seed % 4];
    var shapes = [
      "%3Crect x='90' y='120' width='220' height='360' rx='24' fill='%23" + fg + "'/%3E%3Crect x='340' y='150' width='170' height='150' rx='18' fill='%23" + mid + "'/%3E",
      "%3Ccircle cx='260' cy='300' r='150' fill='%23" + fg + "'/%3E%3Ccircle cx='400' cy='230' r='80' fill='%23" + mid + "'/%3E",
      "%3Cpath d='M110 440L280 160L450 440' stroke='%23" + fg + "' stroke-width='30' fill='none' stroke-linecap='round'/%3E%3Cpath d='M220 440L360 250L470 440' stroke='%23" + mid + "' stroke-width='22' fill='none' stroke-linecap='round'/%3E",
      "%3Crect x='120' y='150' width='360' height='110' rx='18' fill='%23" + fg + "'/%3E%3Crect x='120' y='300' width='160' height='160' rx='18' fill='%23" + mid + "'/%3E%3Crect x='320' y='300' width='160' height='160' rx='18' fill='%23" + fg + "'/%3E"
    ];
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 600'%3E%3Crect width='600' height='600' fill='%23" + bg + "'/%3E" + shapes[seed % 4] + "%3C/svg%3E";
  }
  function imgs(base) { return [ph(base), ph(base + 1), ph(base + 2)]; }

  /* Chronologisch (neueste zuerst) */
  var PROJECTS = [
    { title: 'Lumina', year: '2024', tags: ['UI/UX', 'Design System', 'AI'],
      desc: 'An AI-powered design system generator that turns a handful of brand inputs into a coherent, production-ready component library — tokens, states and documentation included.',
      link: '#', images: imgs(0) },
    { title: 'Flux', year: '2024', tags: ['Product', 'UI/UX', 'Collaboration'],
      desc: 'Real-time collaboration for creative teams: shared canvases, live presence and a comment layer that keeps feedback attached to the pixels it belongs to.',
      link: '#', images: imgs(1) },
    { title: 'Prism', year: '2023', tags: ['Tool', 'Color', 'Web'],
      desc: 'Colour palette extraction from any image, tuned for accessibility. Drop an image, get a balanced, WCAG-checked palette you can export straight into your stack.',
      link: '#', images: imgs(2) },
    { title: 'Vertex', year: '2023', tags: ['3D', 'Web', 'Toolkit'],
      desc: 'A lightweight 3D modelling toolkit for the browser — parametric primitives, real-time shading and a tiny footprint, built for designers who think in space.',
      link: '#', images: imgs(3) }
  ];

  var listEl = document.getElementById('pjxList');
  var openRow = null;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* Horizontaler Drag-Swipe: Linksklick halten + nach links/rechts ziehen */
  function enableDragScroll(track) {
    var down = false, startX = 0, startScroll = 0, moved = 0;

    track.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      down = true; moved = 0;
      startX = e.pageX;
      startScroll = track.scrollLeft;
      track.classList.add('is-dragging');
    });

    window.addEventListener('mousemove', function (e) {
      if (!down) return;
      e.preventDefault();
      var walk = e.pageX - startX;
      moved = Math.abs(walk);
      track.scrollLeft = startScroll - walk;
    }, { passive: false });

    function end() {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
    }
    window.addEventListener('mouseup', end);
    window.addEventListener('mouseleave', end);

    /* Klick unterdrücken, wenn tatsächlich gezogen wurde (kein versehentliches Öffnen) */
    track.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  PROJECTS.forEach(function (p, i) {
    var row = el('article', 'pjx-row');

    /* head (button) */
    var head = el('button', 'pjx-head-row');
    head.type = 'button';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('aria-label', p.title + ' — ' + p.year + ', expand');

    head.appendChild(el('span', 'pjx-idx', String(i + 1).padStart(2, '0')));
    head.appendChild(el('span', 'pjx-title-main', p.title));

    var tags = el('span', 'pjx-tags');
    p.tags.forEach(function (t) { tags.appendChild(el('span', 'pjx-tag', t)); });
    head.appendChild(tags);

    head.appendChild(el('span', 'pjx-year', "'" + p.year.slice(2)));

    var toggle = el('span', 'pjx-toggle',
      '(&nbsp;<span class="pjx-toggle-sign">+</span>&nbsp;)');
    head.appendChild(toggle);

    var strip = el('span', 'pjx-strip');
    p.images.forEach(function (src) {
      var wrap = el('span', 'pjx-strip-img skew-on-scroll');
      var im = document.createElement('img'); im.src = src; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      wrap.appendChild(im); strip.appendChild(wrap);
    });
    head.appendChild(strip);

    row.appendChild(head);

    /* detail */
    var detail = el('div', 'pjx-detail');
    var inner = el('div', 'pjx-detail-inner');

    var textCol = el('div');
    textCol.appendChild(el('p', 'pjx-detail-desc', p.desc));
    var meta = el('div', 'pjx-detail-meta',
      '<span>' + p.tags.join(' · ') + '</span><span>' + p.year + '</span>');
    textCol.appendChild(meta);
    var link = el('a', 'pjx-detail-link', 'View Project ↗');
    link.href = p.link;
    textCol.appendChild(link);
    inner.appendChild(textCol);

    var gal = el('div', 'pjx-gallery');
    p.images.forEach(function (src) {
      var g = el('div', 'pjx-gallery-img');
      var im = document.createElement('img'); im.src = src; im.alt = p.title; im.loading = 'lazy'; im.decoding = 'async'; im.draggable = false;
      g.appendChild(im); gal.appendChild(g);
    });
    enableDragScroll(gal);
    inner.appendChild(gal);

    detail.appendChild(inner);
    row.appendChild(detail);
    listEl.appendChild(row);

    /* toggle expand/collapse (accordion: nur eine offen) */
    head.addEventListener('click', function () {
      var isOpen = row.classList.contains('is-open');
      if (openRow && openRow !== row) closeRow(openRow);
      if (isOpen) { closeRow(row); openRow = null; }
      else { openRow_(row, detail); openRow = row; }
    });
  });

  function openRow_(row, detail) {
    row.classList.add('is-open');
    row.querySelector('.pjx-head-row').setAttribute('aria-expanded', 'true');
    gsap.set(detail, { height: 'auto' });
    gsap.from(detail, { height: 0, duration: 0.6, ease: EXPO });
    var inner = detail.querySelector('.pjx-detail-inner');
    gsap.fromTo(inner, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.1 });
  }
  function closeRow(row) {
    var detail = row.querySelector('.pjx-detail');
    row.classList.remove('is-open');
    row.querySelector('.pjx-head-row').setAttribute('aria-expanded', 'false');
    gsap.to(detail, { height: 0, duration: 0.5, ease: 'power3.inOut' });
  }

  /* Reveal: Titel beim Laden, Zeilen scroll-getrieben per Clip-Path-Wipe */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.set('.pjx-title-inner', { yPercent: 110 });

  function revealRows() {
    var rows = gsap.utils.toArray('.pjx-row');
    if (reduce) {
      gsap.set(rows, { clipPath: 'none', y: 0, opacity: 1 });
      return;
    }
    rows.forEach(function (row) {
      gsap.set(row, { clipPath: 'inset(0 0 100% 0)', y: 24, opacity: 0 });
      ScrollTrigger.create({
        trigger: row,
        start: 'top 88%',
        once: true,
        onEnter: function () {
          gsap.to(row, {
            clipPath: 'inset(0 0 0% 0)', y: 0, opacity: 1,
            duration: 0.9, ease: 'power4.out'
          });
        }
      });
    });
  }

  function playReveal() {
    if (reduce) { gsap.set('.pjx-title-inner', { yPercent: 0 }); revealRows(); return; }
    gsap.timeline().to('.pjx-title-inner', { yPercent: 0, duration: 0.8, ease: 'power4.out' });
    revealRows();
  }
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(playReveal); } else { playReveal(); }

});