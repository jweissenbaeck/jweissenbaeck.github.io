/* ============================================================
   PROJECTS — Titel-Preview + Sticky-Filter + Projekt-Liste
   Effekte (im Pixel-/Tipp-Stil der Startseite; Bausteine aus script.js: pxClip, typeIn, onEnterOnce …):
   · Titel: steht von Anfang an; Laufband reagiert auf Scroll-Tempo und -Richtung;
     beim Runterscrollen bleibt er langsamer zurück (Parallax) und zerfällt in Pixel
   · Projekte: Name dekodiert sich, Meta tippt sich ein, Bilder bauen sich nacheinander aus Pixeln auf
   · Parallax: kleine / mittlere / große Bilder wandern unterschiedlich schnell, jedes Bild gleitet in seinem Rahmen
   · Filter: „Filter" + Menüeinträge tippen sich ein; beim Filtern zerfallen / entstehen Projekte in Pixeln
============================================================ */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof gsap === 'undefined') return;
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var live = !reduce && typeof PX_CLIP_OK !== 'undefined' && PX_CLIP_OK;   // Pixel-Effekte möglich?
  var hasLenis = typeof lenis !== 'undefined' && lenis && lenis.on;
  /* Smooth scroll läuft über script.js (Lenis) — keine zweite Instanz. */

  function c01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(v) { return 1 - Math.pow(1 - v, 3); }
  function onScroll(fn) { if (hasLenis) lenis.on('scroll', fn); else window.addEventListener('scroll', fn, { passive: true }); }
  /* Pixel-Aufbau / -Zerfall über die Zeit (cover 0→1 bzw. 1→0) */
  function pxTween(el, from, to, mode, dur, B) {
    pxMeasure(el, B);
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function frame(now) {
        var k = Math.min(1, (now - t0) / dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        pxClip(el, from + (to - from) * e, mode);
        if (k < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  }
  /* Dekodieren (Barlow-Namen): Zufallsbuchstaben lösen sich von links nach rechts in den Namen auf */
  function decodeIn(el, dur) {
    if (!el) return;
    el.style.visibility = '';
    if (reduce) return;
    var orig = el.dataset.t || (el.dataset.t = el.textContent), n = orig.length, t0 = performance.now(), D = dur || 650;
    var run = el._dr = (el._dr || 0) + 1;
    el.style.display = 'inline-block'; el.style.width = Math.ceil(el.getBoundingClientRect().width) + 'px'; el.style.whiteSpace = 'pre';
    (function loop(now) {
      if (run !== el._dr) return;
      var k = Math.min(1, (now - t0) / D), upto = Math.floor(k * n), tick = Math.floor(now / 50), s = '';
      for (var i = 0; i < n; i++) s += (i < upto || orig[i] === ' ') ? orig[i] : TYPE_CHARS[((i * 7 + tick * 13) >>> 0) % 26];
      el.textContent = k < 1 ? s : orig;
      if (k < 1) requestAnimationFrame(loop);
      else { el.style.width = ''; el.style.display = ''; el.style.whiteSpace = ''; }
    })(t0);
  }
  /* Mono-Text neu eintippen (auch wiederholt) */
  function retype(el, text, dur) {
    if (!el) return;
    if (reduce) { el.textContent = text; return; }
    el._typeOrig = text; el._typed = false;
    el.textContent = text.replace(/\S/g, ' ');
    typeIn(el, dur);
  }

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
  /* Parallax-Tiefe je Größe: kleine Bilder wirken näher und wandern schneller */
  var DEPTH = { '2.2': 0.075, '3.1': 0.038, '4.4': 0 };
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
      return '<span class="pj-shot" data-depth="' + DEPTH[String(weights[k])] + '" style="flex-grow:' + weights[k] + '">' +
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

  var projects = Array.prototype.slice.call(grid.querySelectorAll('.pj-project'));
  var allShots = Array.prototype.slice.call(grid.querySelectorAll('.pj-shot'));

  /* ── Projekte erscheinen: Name dekodiert, Meta tippt, Bilder bauen sich nacheinander aus Pixeln auf ── */
  projects.forEach(function (proj) {
    var name = proj.querySelector('.pj-project-name');
    var meta = proj.querySelector('.pj-project-meta');
    var row = Array.prototype.slice.call(proj.querySelectorAll('.pj-shot'));
    if (reduce) return;
    name.style.visibility = 'hidden';
    typePrepare(meta);
    if (live) row.forEach(function (s) { s.style.clipPath = 'inset(50%)'; });
    onEnterOnce(proj, function () {
      decodeIn(name, 600);
      setTimeout(function () { typeIn(meta, 650); }, 180);
      if (live) row.forEach(function (s, i) {
        setTimeout(function () { pxTween(s, 0, 1, 'build', 820, Math.max(14, s.offsetWidth / 18)); }, 140 + i * 130);
      });
    }, '-12%');
  });

  /* ── Parallax: Bilder wandern je nach Größe unterschiedlich, jedes Bild gleitet in seinem Rahmen ── */
  if (!reduce) {
    var updateParallax = function () {
      var vh = window.innerHeight, stacked = window.innerWidth <= 720;      // Handy: Bilder untereinander → nicht gegeneinander verschieben
      for (var i = 0; i < allShots.length; i++) {
        var s = allShots[i];
        if (s.offsetParent === null) continue;                              // ausgefiltert
        var r = s.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        var off = (r.top + r.height / 2 - vh / 2);                          // Abstand zur Bildmitte
        var d = stacked ? 0 : (parseFloat(s.dataset.depth) || 0);
        s.style.translate = '0 ' + Math.max(-34, Math.min(34, -off * d)).toFixed(1) + 'px';
        var img = s.firstElementChild;
        if (img) img.style.translate = '0 ' + Math.max(-6, Math.min(6, -off / vh * 9)).toFixed(2) + '%';
      }
    };
    onScroll(updateParallax);
    window.addEventListener('resize', updateParallax);
    window.addEventListener('load', updateParallax);
    updateParallax();
  }

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
  var menuItems = Array.prototype.slice.call(menu.querySelectorAll('li'));

  var filtering = false;
  function matches(it, cat) { return cat === 'All' || it.getAttribute('data-cat') === cat; }
  function setFilter(cat) {
    retype(current, cat === 'All' ? 'Filter' : cat, 420);              // aktive Kategorie direkt im Button
    menuItems.forEach(function (li) {
      li.classList.toggle('is-active', li.getAttribute('data-cat') === cat);
    });
    var leaving = projects.filter(function (it) { return !it.classList.contains('is-hidden') && !matches(it, cat); });
    var entering = projects.filter(function (it) { return it.classList.contains('is-hidden') && matches(it, cat); });
    function done() { if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh(); window.dispatchEvent(new Event('resize')); }
    if (!live || filtering) {
      projects.forEach(function (it) { it.classList.toggle('is-hidden', !matches(it, cat)); });
      done(); return;
    }
    filtering = true;
    /* raus: in Pixel zerfallen · rein: aus Pixeln entstehen (nacheinander) */
    Promise.all(leaving.map(function (it) { return pxTween(it, 1, 0, 'dissolve', 380, 36); })).then(function () {
      leaving.forEach(function (it) { it.classList.add('is-hidden'); it.style.clipPath = ''; });
      entering.forEach(function (it) { it.classList.remove('is-hidden'); it.style.clipPath = 'inset(50%)'; });
      var gTop = grid.getBoundingClientRect().top;
      if (gTop < 0 && hasLenis) lenis.scrollTo(grid, { offset: -120, duration: 0.9 });   // nach oben zur Liste
      done();
      return Promise.all(entering.map(function (it, i) {
        return new Promise(function (r) { setTimeout(r, i * 90); }).then(function () { return pxTween(it, 0, 1, 'build', 560, 36); });
      }));
    }).then(function () {
      entering.forEach(function (it) { it.style.clipPath = ''; });
      filtering = false;
      done();
    });
  }

  function openMenu(open) {
    field.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    /* Menüeinträge tippen sich nacheinander ein */
    if (open && !reduce) menuItems.forEach(function (li, i) {
      var text = li.getAttribute('data-cat');
      li.textContent = text.replace(/\S/g, ' ');
      setTimeout(function () { retype(li, text, 300); }, 60 + i * 70);
    });
  }
  btn.addEventListener('click', function (e) { e.stopPropagation(); openMenu(!field.classList.contains('is-open')); });
  menu.addEventListener('click', function (e) {
    var li = e.target.closest('li'); if (!li) return;
    setFilter(li.getAttribute('data-cat'));
    openMenu(false);
  });
  document.addEventListener('click', function () { if (field.classList.contains('is-open')) openMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && field.classList.contains('is-open')) openMenu(false); });

  /* ── Work-Titel: Endlosschleife nach links (Marquee) ── */
  var hero = document.getElementById('pjHero');
  var title = hero && hero.querySelector('.pj-hero-title');
  var marquee = document.getElementById('pjHeroMarquee');
  (function initHeroMarquee() {
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

    /* Laufband per JS statt CSS-Animation: Grundtempo wie zuvor (50 % in 26 s),
       Scroll-Tempo beschleunigt es, nach oben scrollen dreht die Richtung um; beruhigt sich wieder */
    if (reduce) return;
    marquee.style.animation = 'none';
    var x = 0, boost = 0, target = 0, dir = 1, last = 0, visible = true, BASE = 50 / 26;
    onScroll(function (e) {
      var v = e && typeof e.velocity === 'number' ? e.velocity : 0;
      if (v) dir = v > 0 ? 1 : -1;
      target = Math.min(40, Math.abs(v) * 1.4);
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }).observe(hero);
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016); last = now;
      target *= Math.pow(0.04, dt);                                       // Schub klingt ab
      boost = smoothTowards(boost, target, 0.12, dt);
      if (!visible) return;
      x = (x + (BASE + boost) * dir * dt) % 50; if (x < 0) x += 50;
      marquee.style.transform = 'scaleX(1.18) translateX(' + (-x).toFixed(3) + '%)';
    })(performance.now());
  })();

  /* ── Titel: steht von Anfang an, beim Scrollen Parallax + Zerfall in Pixel ── */
  if (title && !reduce) {
    var introDone = true;
    var blockOf = function () { return Math.max(14, parseFloat(getComputedStyle(title).fontSize) * 0.07); };
    var scrollTitle = function (e) {
      var y = (e && typeof e.scroll === 'number') ? e.scroll : window.scrollY;
      var h = hero.offsetHeight || window.innerHeight;
      title.style.translate = '0 ' + (y * 0.38).toFixed(1) + 'px';           // bleibt langsamer zurück
      if (introDone && live) pxClip(title, ease(1 - c01(y / (h * 0.7))), 'dissolve');
    };
    if (live) { pxMeasure(title, blockOf()); if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { pxMeasure(title, blockOf()); scrollTitle(); }); }
    onScroll(scrollTitle);
    window.addEventListener('resize', function () { if (introDone && live) { pxMeasure(title, blockOf()); scrollTitle(); } });
  }

  /* „Filter" tippt sich ein, sobald der Titel steht */
  if (current && !reduce) { typePrepare(current); setTimeout(function () { typeIn(current, 500); }, 900); }

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
});
