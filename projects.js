/* ============================================================
   PROJECTS — Full list (Row-Layout wie Referenz)
============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* Smooth scroll läuft bereits über script.js (Lenis) — hier KEINE zweite Instanz,
     sonst kämpfen zwei Controller um die Scrollposition ("Snapping"). */

  function pic(id) { return 'https://picsum.photos/id/' + id + '/1200/675'; }

  /* ── Projekte ── */
  var PROJECTS = [
    { name: 'Lumina', lead: 'Our focus on – systems, structure and scale.',
      desc: 'An AI-assisted design system that turns a handful of brand inputs into a coherent, production-ready component library — tokens, states and documentation included.',
      cta: 'View our Lumina work', link: '#', images: [pic(1015), pic(1016), pic(1018)] },
    { name: 'Flux', lead: 'Our focus on – collaboration, presence and flow.',
      desc: 'Real-time collaboration for creative teams: shared canvases, live presence and a comment layer that keeps feedback attached to the pixels it belongs to.',
      cta: 'View our Flux work', link: '#', images: [pic(1039), pic(1043), pic(1044)] },
    { name: 'Prism', lead: 'Our focus on – colour, clarity and access.',
      desc: 'Colour palette extraction from any image, tuned for accessibility. Drop an image, get a balanced, WCAG-checked palette you can export straight into your stack.',
      cta: 'View our Prism work', link: '#', images: [pic(1050), pic(1062), pic(1069)] },
    { name: 'Vertex', lead: 'Our focus on – space, form and the browser.',
      desc: 'A lightweight 3D modelling toolkit for the browser — parametric primitives, real-time shading and a tiny footprint, built for designers who think in space.',
      cta: 'View our Vertex work', link: '#', images: [pic(1074), pic(1080), pic(1084)] }
  ];

  var listEl = document.getElementById('pjList');
  var MARK = '<svg class="pl-mark" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 0v14M0 7h14M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/></svg>';

  PROJECTS.forEach(function (p) {
    var row = document.createElement('li');
    row.className = 'pl-row';

    row.innerHTML =
      MARK +
      '<div class="pl-inner">' +
        '<h2 class="pl-title">' + p.name + '</h2>' +
        '<div class="pl-mid">' +
          '<p class="pl-desc">' + p.desc + '</p>' +
          '<a class="pl-cta" href="' + p.link + '" aria-label="' + p.cta + '">' +
            '<span class="pl-cta-txt">' + p.cta + '</span>' +
          '</a>' +
        '</div>' +
        '<div class="pl-media">' +
          '<span class="pl-media-img"><img src="' + p.images[0] + '" alt="' + p.name + '" loading="lazy" decoding="async" draggable="false"></span>' +
        '</div>' +
      '</div>';
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
  if (reduce || typeof ScrollTrigger === 'undefined') {
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
     PIXEL-HOVER — Vorschaubild materialisiert beim Hover aus Pixeln
     (Pixel-Signatur der Page-Transition, als Zeilen-Hintergrund)
  ============================================================ */
  (function initRowPixelHover() {
    if (reduce) return;
    var BLOCK = 44, BIAS = 0.62, DUR = 520;
    var PANEL = 'rgba(240,237,232,0.09)';    // subtiler Ink-Pixel-Hintergrund

    function rnd(gx, gy) {
      var x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
      x = (x ^ (x >>> 13)) * 1274126177 >>> 0;
      return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
    }

    Array.prototype.slice.call(document.querySelectorAll('.pl-row')).forEach(function (row) {
      var cv = document.createElement('canvas');
      cv.className = 'pl-bg-px'; cv.setAttribute('aria-hidden', 'true');
      row.insertBefore(cv, row.firstChild);      // als Hintergrund hinter den Inhalt
      var ctx = cv.getContext('2d');
      var W = 0, H = 0, cols = 0, rows = 0, dpr = 1, raf = null;

      function size() {
        var r = row.getBoundingClientRect();
        W = Math.max(1, r.width); H = Math.max(1, r.height);
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(W / BLOCK); rows = Math.ceil(H / BLOCK);
      }
      /* reveal 0 = kein Hintergrund, 1 = voller Pixel-Hintergrund (baut von unten auf) */
      function draw(reveal) {
        ctx.clearRect(0, 0, W, H);
        if (reveal <= 0) return;
        ctx.fillStyle = PANEL;
        for (var gy = 0; gy < rows; gy++) {
          var rowBias = rows > 1 ? gy / (rows - 1) : 0;        // 0 oben, 1 unten
          for (var gx = 0; gx < cols; gx++) {
            var thr = (1 - rowBias) * BIAS + rnd(gx, gy) * (1 - BIAS);   // unten zuerst
            if (reveal >= thr) ctx.fillRect(gx * BLOCK, gy * BLOCK, BLOCK + 1, BLOCK + 1);
          }
        }
      }
      function animate(to) {
        if (raf) cancelAnimationFrame(raf);
        var t0 = performance.now();
        (function frame(now) {
          var t = Math.min(1, (now - t0) / DUR);
          var e = 1 - Math.pow(1 - t, 3);
          draw(to === 1 ? e : 1 - e);
          if (t < 1) raf = requestAnimationFrame(frame); else raf = null;
        })(t0);
      }

      row.addEventListener('mouseenter', function () { size(); animate(1); });   // Pixel-Hintergrund baut sich auf
      row.addEventListener('mouseleave', function () { animate(0); });            // und zieht sich zurück
    });
  })();

});