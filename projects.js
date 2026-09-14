/* ============================================================
   PROJECTS — Titel-Preview + Sticky-Filter + 2-Spalten-Grid
============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Smooth scroll läuft über script.js (Lenis) — keine zweite Instanz. */

  function pic(id) { return 'https://picsum.photos/id/' + id + '/1280/720'; }
  function shots(a, b, c) { return [pic(a), pic(b), pic(c)]; }

  /* ── Projekte: je 3 Bilder (16:9) + Kategorie ── */
  var PROJECTS = [
    { name: 'Lumina',  year: '2026', cat: 'UI / UX Design', imgs: shots(1015, 1016, 1018) },
    { name: 'Kane',    year: '2026', cat: 'Video Editing',  imgs: shots(1043, 1044, 1045) },
    { name: 'The Feed',year: '2026', cat: 'Video Editing',  imgs: shots(1039, 1040, 1041) },
    { name: 'Flux',    year: '2025', cat: 'UI / UX Design', imgs: shots(1050, 1051, 1052) },
    { name: 'Prism',   year: '2025', cat: 'UI / UX Design', imgs: shots(1062, 1063, 1064) },
    { name: 'Vertex',  year: '2024', cat: 'Photography',    imgs: shots(1074, 1075, 1076) },
    { name: 'Halo',    year: '2024', cat: 'Photography',    imgs: shots(1084, 1080, 1081) },
    { name: 'Orbit',   year: '2023', cat: 'Video Editing',  imgs: shots(1069, 1070, 1071) }
  ];

  var grid = document.getElementById('pjGrid');
  var SIZE_W = [2.2, 3.1, 4.4];   // klein · mittel · groß (Breiten-Gewichte)
  function shuffle(arr) {
    arr = arr.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  PROJECTS.forEach(function (p) {
    var proj = document.createElement('div');
    proj.className = 'pj-project';
    proj.setAttribute('data-cat', p.cat);

    var weights = shuffle(SIZE_W);   // Reihenfolge klein/mittel/groß je Projekt zufällig
    var row = p.imgs.map(function (src, k) {
      return '<span class="pj-shot" style="flex-grow:' + weights[k] + '">' +
               '<img src="' + src + '" alt="' + p.name + '" loading="lazy" decoding="async">' +
             '</span>';
    }).join('');

    proj.innerHTML =
      '<div class="pj-project-head">' +
        '<span class="pj-project-name">' + p.name + '</span>' +
        '<span class="pj-project-meta">' + p.cat + ' — ' + p.year + '</span>' +
      '</div>' +
      '<div class="pj-project-row">' + row + '</div>';

    grid.appendChild(proj);
  });

  /* ── Category-Filter (funktionsfähig) ── */
  var field = document.getElementById('pjCatField');
  var btn = document.getElementById('pjCatBtn');
  var menu = document.getElementById('pjCatMenu');
  var current = document.getElementById('pjCatCurrent');

  var cats = ['All'].concat(PROJECTS.map(function (p) { return p.cat; })
    .filter(function (c, i, arr) { return arr.indexOf(c) === i; }));

  cats.forEach(function (c, i) {
    var li = document.createElement('li');
    li.textContent = c; li.setAttribute('role', 'option');
    li.setAttribute('data-cat', c);
    if (i === 0) li.classList.add('is-active');
    menu.appendChild(li);
  });

  function setFilter(cat) {
    current.textContent = cat === 'All' ? 'Category' : cat;
    menu.querySelectorAll('li').forEach(function (li) {
      li.classList.toggle('is-active', li.getAttribute('data-cat') === cat);
    });
    var items = grid.querySelectorAll('.pj-project');
    items.forEach(function (it) {
      var show = (cat === 'All' || it.getAttribute('data-cat') === cat);
      it.classList.toggle('is-hidden', !show);
    });
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  function openMenu(open) {
    field.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!field.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    setFilter(li.getAttribute('data-cat'));
    openMenu(false);
  });
  document.addEventListener('click', function () { openMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openMenu(false); });

  /* ── Work-Titel: Endlosschleife nach links (Marquee) ── */
  (function initHeroMarquee() {
    var marquee = document.getElementById('pjHeroMarquee');
    if (!marquee) return;
    var WORD = 'My Work';
    function wordEl() {
      var s = document.createElement('span');
      s.className = 'pj-hero-word';
      s.textContent = WORD;
      return s;
    }
    function build() {
      marquee.innerHTML = '';
      var g1 = document.createElement('div');
      g1.className = 'pj-hero-group';
      marquee.appendChild(g1);
      var guard = 0;
      /* so viele Wörter, dass die Gruppe mind. die Viewport-Breite füllt */
      do { g1.appendChild(wordEl()); guard++; }
      while (g1.offsetWidth < window.innerWidth * 1.05 && guard < 40);
      if (g1.children.length < 2) g1.appendChild(wordEl());
      /* Gruppe duplizieren → nahtlose Schleife bei translateX(-50%) */
      marquee.appendChild(g1.cloneNode(true));
    }
    build();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(build, 200); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
  })();

  /* Nav-Sichtbarkeit steuert global initNavScrollHide (script.js) — hier kein zweites System. */

  /* Erkennen, ob die Filterleiste oben „klemmt" (sticky aktiv) → Klasse filter-stuck.
     Sentinel an der natürlichen Flussposition des Filters; sobald er hinter die Nav
     (52px) scrollt, ist der Filter geklemmt. */
  (function initFilterStuck() {
    var filter = document.getElementById('pjFilter');
    if (!filter || !('IntersectionObserver' in window)) return;
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute; left:0; width:1px; height:1px; pointer-events:none;';
    filter.parentNode.insertBefore(sentinel, filter);
    new IntersectionObserver(function (entries) {
      document.documentElement.classList.toggle('filter-stuck', !entries[0].isIntersecting);
    }, { rootMargin: '-52px 0px 0px 0px', threshold: 0 }).observe(sentinel);
  })();

  /* ── Grid-Items beim Scroll einblenden ── */
  if (!reduce && typeof ScrollTrigger !== 'undefined') {
    gsap.utils.toArray('.pj-project').forEach(function (it) {
      gsap.set(it, { y: 26, opacity: 0 });
      ScrollTrigger.create({
        trigger: it, start: 'top 92%', once: true,
        onEnter: function () { gsap.to(it, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }); }
      });
    });
  }
});