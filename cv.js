/* ============================================================
   CV PAGE — Bento-Board + Detail-Panel
   · Kacheln aus den Daten unten
   · Klick → Kachel wächst zur Detail-Ansicht über der Seite (nichts verschiebt sich)
============================================================ */
(function () {
  /* ── Einstellungen ── */
  var PORTRAIT    = 'assets/jcky-3.jpg';
  var BIRTHDATE   = new Date(2003, 0, 17);   // 17. Jänner 2003 → Alter im Profil zählt automatisch weiter
  function ageNow() {
    var n = new Date(), a = n.getFullYear() - BIRTHDATE.getFullYear();
    if (n.getMonth() < BIRTHDATE.getMonth() || (n.getMonth() === BIRTHDATE.getMonth() && n.getDate() < BIRTHDATE.getDate())) a--;
    return a;
  }

  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var hasGsap = typeof gsap !== 'undefined';

  /* ── Inhalte ── */
  /* Offizielle Icons liegen in assets/ (neben dem Portrait). Fehlt eine Datei,
     erscheint ein neutrales Kästchen mit Anfangsbuchstaben. */
  var ICONS = 'assets/';
  /* use  = Tooltip (kurz) · more = Beschreibung im Modal (ausführlich)
     Reihenfolge = Anzeige-Reihenfolge */
  var TOOL_GROUPS = ['Design & Creativity', 'Programming', 'Tech'];
  var TOOLS = [                                     // Reihenfolge innerhalb der Gruppe = Anzeige-Reihenfolge
    { group: 'Design & Creativity', name: 'Figma', icon: 'Figma-logo.svg',
      use:  'High-fidelity prototypes, design systems and general design',
      more: 'My main design tool, used for high-fidelity prototypes, design systems and everyday interface design.' },
    { group: 'Design & Creativity', name: 'Claude', icon: 'Claude_AI_symbol.svg',
      use:  'AI assistant for prototyping and inspiration',
      more: 'An AI assistant that helps me prototype quickly, explore directions and find inspiration.' },
    { group: 'Design & Creativity', name: 'Illustrator', icon: 'Adobe_Illustrator_CC_icon.svg',
      use:  'Logos and graphics',
      more: 'Logos and graphics, built as clean vectors.' },
    { group: 'Design & Creativity', name: 'Photoshop', icon: 'Adobe_Photoshop_CC_icon.svg',
      use:  'Image manipulation',
      more: 'Used for image manipulation.' },
    { group: 'Design & Creativity', name: 'Lightroom Classic', icon: 'Adobe_Photoshop_Lightroom_Classic_CC_icon.svg',
      use:  'Colour correction and grading of photos',
      more: 'Colour correction and colour grading of my photos.' },
    { group: 'Design & Creativity', name: 'DaVinci Resolve Studio', icon: 'DaVinci_Resolve_Studio.png',
      use:  'Video editing and colour grading',
      more: 'Video editing and colour grading for my films.' },
    { group: 'Programming', name: 'HTML5', icon: 'HTML5_logo_and_wordmark.svg', combo: 'web',
      use:  'Learned at university, used for personal web projects and quick prototypes',
      more: 'Learned at university and used for personal web projects and quick prototypes.' },
    { group: 'Programming', name: 'CSS3', icon: 'CSS3_logo.svg', combo: 'web',
      use:  'Learned at university, used for personal web projects and quick prototypes',
      more: 'Learned at university and used for personal web projects and quick prototypes.' },
    { group: 'Programming', name: 'JS', icon: 'Unofficial_JavaScript_logo_2.svg', combo: 'web',
      use:  'Learned at university, used for personal web projects and quick prototypes',
      more: 'Learned at university and used for personal web projects and quick prototypes.' },
    { group: 'Programming', name: 'Python', icon: 'Python-logo-notext.svg',
      use:  'Learned at university, used for scripting and backend',
      more: 'Picked up at university, now used for scripting and backend work.' },
    { group: 'Tech', name: 'GitHub', icon: 'github.svg',
      use:  'Handover between designers and developers',
      more: 'Where the handover between designers and developers happens.' },
    { group: 'Tech', name: 'Git', icon: 'Git_icon.svg',
      use:  'Version control',
      more: 'Keeps every project under version control.' },
    { group: 'Tech', name: 'GitLab', icon: 'GitLab.svg',
      use:  'Sometimes for collaboration',
      more: 'Occasionally used for collaboration.' }
  ];
  function toolsIn(g) { return TOOLS.filter(function (t) { return t.group === g; }); }
  var COMBO_NAMES = { web: 'HTML, CSS & JS' };           // im Detail zusammengefasst
  function toolIcon(t) {
    return '<span class="bn-ico" data-letter="' + esc(t.name.charAt(0)) + '">' +
      '<img src="' + ICONS + t.icon + '" alt="" decoding="async"></span>';
  }
  /* Skills: die ersten SKILLS_TILE erscheinen in der Kachel, alle im Detail */
  /* Skills: alle erscheinen in der Kachel (2 Spalten), die Beschreibung im Detail */
  var SKILLS = [
    { name: 'UI / UX design',                use: 'Software products are my focus: internal tools as well as products sold to clients, designed within large, scalable systems.' },
    { name: 'High-fidelity prototyping',     use: 'Polished, detailed prototypes that are genuinely usable.' },
    { name: 'Design system architecture',    use: 'From the ground up, I structured a large, scalable design system used across products, then adapted, organised, fixed and modernised it.' },
    { name: 'AI-integrated workflows',       use: 'Rather than a threat, AI is a chance to work more efficiently, so I integrate it into my design workflow.' },
    { name: 'Design-to-developer handover',  use: 'Finished screens are prepared so developers can easily work with them and rebuild them.' },
    { name: 'Product thinking',              use: 'Designing my current products means thinking across platforms and products.' },
    { name: 'HCI',                           use: 'Human-computer interaction was the main focus of my studies, and I keep up with the latest trends in how people interact with computers.' }
  ];
  var SKILLS_TILE = SKILLS.length;
  /* Experience: neueste Station zuerst. Firma = Überschrift, darunter die Rolle(n).
     years = Jahres-Spalte (Kachel) · period = Zeitraum (Detail) · roles: mehrere = Beförderung in derselben Firma
     role.when = Zeitraum der Rolle (nur bei mehreren Rollen in der Kachel) · points = Aufgaben (Detail) */
  var EXPERIENCE = [
    { org: 'Websline', type: 'Full-time', meta: 'Salzburg, Austria', years: 'Sep 2025<br>— Now', period: 'September 2025 — Now',
      roles: [
        { title: 'Junior UI / UX Designer', when: 'Mar 2026 — Now', period: 'March 2026 — Now', current: true,
          points: [
              'High-fidelity prototyping',
              'Building and developing a scalable design system',
              'Bridge between design and development',
              'AI integration within workflows'
            ] },
        { title: 'UI / UX Design Trainee', when: 'Sep 2025 — Feb 2026', period: 'September 2025 — February 2026, 6 months' }
      ] },
    /* zwei Praktika unter einer Überschrift; stack = untereinander, ohne Beförderungs-Linie */
    { org: 'Austrian Red Cross', type: 'Internship', meta: 'Salzburg, Austria, on-site', years: 'Aug 2023<br>Aug 2019',
      period: 'August 2023 and August 2019', sub: 'Information Technology Internship', sum: 'Two one-month internships in the IT department, working on digital design and database management and gaining hands-on experience during my education.', stack: true,
      roles: [
        { title: 'Information Technology Internship', period: 'August 2023, 1 month', points: ['Digital design', 'Database maintenance'] },
        { title: 'Information Technology Internship', period: 'August 2019, 1 month', points: ['Digital design', 'Database maintenance'] }
      ] }
  ];
  /* Education: neueste zuerst */
  var EDUCATION = [
    { title: 'B.Sc. Digitalization & Innovation', org: 'Paris Lodron University of Salzburg',
      years: '2022 — 2025', period: 'October 2022 — September 2025',
      sum: 'HCI and geoinformatics. Graduated with distinction (1.4).',
      text: 'Graduated with distinction and an overall grade of 1.4. My studies centred on human-computer interaction, design and geoinformatics, and I went on to specialise in UI / UX, gaining first experience in interdisciplinary projects. My bachelor thesis explored a UI / UX topic as well: how apps can be designed to increase user motivation. I also received a merit scholarship for my grades.' },
    { title: 'Secondary school', org: 'BRG Seekirchen (Diploma)',
      years: '2013 — 2021', period: 'September 2013 — July 2021',
      sum: 'Matura with a focus on languages.',
      text: 'Graduated with the Matura, the qualification for studying at Austrian universities. My focus was on languages: I learned French, Latin, English and some Russian.' }
  ];
  /* Interessen: Namen für die Kachel-Liste */
  var SIDE = ['Music', 'Photography', 'Videography', 'Painting', 'Art', 'History', 'Classical music', 'Gym', 'Tennis', 'Chess'];
  /* Detail als Fließtext: ein Eintrag = ein Absatz */
  var INTERESTS_TEXT = [
    'Music has been a big part of my life for as long as I can remember. I taught myself to play the piano and the guitar, and I\'ve been playing both for around nine years now. When I\'m listening rather than playing, it\'s often classical music, especially Claude Debussy and Frédéric Chopin.',
    'Photography and videography have been with me for just as long. I picked it all up on my own, from shooting photos and videos to editing and colour grading them, and finally cutting everything together into creative films.',
    'I\'m also fascinated by art. I love looking at paintings and trying to figure out what the artist had in mind while creating them. My favourite period is the Renaissance, and the style I like most is pointillism.',
    'Away from the creative side, I\'m passionate about the gym and have been training with discipline for two years. I also enjoy playing tennis and chess, and I\'m into computers and video games.'
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* Öffnen-Hinweis oben rechts: unsichtbar, beim Hover gleitet ein Pfeil nach rechts oben herein */
  var OPEN_ICON = '<span class="bn-open" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 9 9 3M4.5 3H9v4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/></svg></span>';
  function head(label, noOpen) { return '<header class="bn-head"><span class="bn-label">' + label + '</span>' + (noOpen ? '' : OPEN_ICON) + '</header>'; }
  /* Rollenblock wie im Modal: Titel · Zeitraum · Stichpunkte; mehrere Rollen = Punkte + Linie.
     Kachel und Modal nutzen dieselbe Funktion → sehen identisch aus. */
  function rolesBlock(x) {
    var multi = x.roles.length > 1 && !x.stack;      // Punkte + Linie nur bei Beförderung (nicht bei stack)
    return '<div class="bnm-roles' + (multi ? ' is-multi' : '') + '">' + x.roles.map(function (r) {
      return '<div class="bnm-role' + (r.current ? ' is-current' : '') + '"><p class="bnm-role-title">' + esc(r.title) + '</p>' +
        (r.period ? '<p class="bn-meta bnm-role-date">' + esc(r.period) + '</p>' : '') +
        (r.points ? '<ul class="bnm-points">' + r.points.map(function (pt) { return '<li>' + esc(pt) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
    }).join('') + '</div>';
  }
  /* Eintrag mit Jahres-Spalte links (Experience + Education) */
  function tlItem(years, body) {
    return '<li class="bn-tl"><span class="bn-meta bn-tl-years">' + years + '</span><div class="bn-tl-body">' + body + '</div></li>';
  }
  /* Sprachen: 2×2 gleich große Boxen · Stufe nach GER/CEFR (Muttersprache ohne Stufe) */
  var LANGUAGES = [
    { name: 'German',  level: '',   note: 'Native' },
    { name: 'English', level: 'C1', note: 'Fluent' },
    { name: 'French',  level: 'B1', note: 'Limited working proficiency' },
    { name: 'Russian', level: 'A1', note: 'Elementary' }
  ];
  function langBoxes() {
    return '<div class="bnm-langs">' + LANGUAGES.map(function (l) {
      return '<div class="bnm-lang"><div class="bnm-lang-top"><span class="bnm-lang-name">' + esc(l.name) + '</span>' +
        (l.level ? '<span class="bnm-lang-level">' + esc(l.level) + '</span>' : '') + '</div>' +
        '<span class="bnm-lang-note">' + esc(l.note) + '</span></div>';
    }).join('') + '</div>';
  }
  function facts(rows) {                         // [Bezeichnung, Wert, 'stack' = Wert unter die Bezeichnung]
    return '<dl class="bnm-facts">' + rows.map(function (r) { return '<div' + (r[2] === 'stack' ? ' class="is-stack"' : '') + '><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
  }
  function rows(items, metaFn) {
    return '<ul class="bnm-rows">' + items.map(function (it) {
      return '<li><div><p class="bn-value">' + esc(it.name) + '</p>' + (metaFn ? metaFn(it) : '') + '</div><p>' + esc(it.use) + '</p></li>';
    }).join('') + '</ul>';
  }

  var TILES = [
    { id: 'pl', label: 'Profile', narrow: true,
      tile: function () {
        return head('Profile') +
          '<div class="bn-body"><h1 class="bn-display">Jacob<br>Weissenbäck</h1></div>';
      },
      title: 'Jacob Weissenbäck',
      detail: function () {
        return facts([['Age', ageNow() + ' years old'], ['Location', 'Living and working in Salzburg'],
                      ['Languages', langBoxes(), 'stack']]);
      } },

    { id: 'po', label: 'Portrait',
      tile: function () {
        return head('Portrait') +
          '<img class="bn-photo" src="' + PORTRAIT + '" alt="Portrait of Jacob Weissenbäck" decoding="async">' +
          '<div class="bn-mono" aria-hidden="true">JW</div>';
      },
      lightbox: true },                            // öffnet nur das Foto, groß in der Bildmitte

    { id: 'in', label: 'Tools', equalRows: true,
      tile: function () {
        /* drei Gruppen nebeneinander, alle Icons gleich groß; Name + Einsatz im Tooltip */
        return head('Tools') + '<div class="bn-body"><div class="bn-toolgroups">' + TOOL_GROUPS.map(function (g) {
          var list = toolsIn(g);
          return '<div class="bn-tg" style="--n:' + list.length + '"><span class="bn-tg-label">' + esc(g) + '</span><ul class="bn-icons">' + list.map(function (t) {
            return '<li data-tip="' + esc(t.use) + '" data-tip-title="' + esc(t.name) + '" aria-label="' + esc(t.name) + '">' + toolIcon(t) + '</li>';
          }).join('') + '</ul></div>';
        }).join('') + '</div></div>';
      },
      title: 'Tools',
      detail: function () {
        return TOOL_GROUPS.map(function (g) {
          var seen = {};
          return '<h3 class="bnm-group">' + esc(g) + '</h3><ul class="bnm-rows">' + toolsIn(g).map(function (t) {
            if (t.combo) {                                // HTML, CSS & JavaScript: ein Eintrag, alle Icons
              if (seen[t.combo]) return '';
              seen[t.combo] = 1;
              var set = toolsIn(g).filter(function (x) { return x.combo === t.combo; });
              return '<li><div class="bnm-tool"><span class="bnm-icons">' + set.map(toolIcon).join('') + '</span><p class="bn-value">' + esc(COMBO_NAMES[t.combo]) + '</p></div><p>' + esc(t.more) + '</p></li>';
            }
            return '<li><div class="bnm-tool">' + toolIcon(t) + '<p class="bn-value">' + esc(t.name) + '</p></div><p>' + esc(t.more) + '</p></li>';
          }).join('') + '</ul>';
        }).join('');
      } },

    { id: 'sk', label: 'Skills', equalRows: true,
      tile: function () {
        return head('Skills') + '<div class="bn-body"><ul class="bn-list" style="--rows:' + Math.ceil(SKILLS_TILE / 2) + '">' + SKILLS.slice(0, SKILLS_TILE).map(function (s) {   // 2 Spalten
          return '<li><span class="bn-item">' + esc(s.name) + '</span></li>';
        }).join('') + '</ul></div>';
      },
      title: 'Skills',
      detail: function () { return rows(SKILLS); } },

    { id: 'ql', label: 'Experience',
      tile: function () {
        /* Jahr · FIRMA · Titel · Kurzbeschreibung; mehrere Rollen = Rollenblock wie im Modal */
        return head('Experience') + '<div class="bn-body"><ol class="bn-tls">' + EXPERIENCE.map(function (x) {
          var roles = x.stack
            ? '<ol class="bn-roles"><li><span class="bn-role">' + esc(x.sub) + '</span></li></ol>'   // zusammengefasst: Titel einmal
            : x.roles.length > 1
              ? rolesBlock(x)                              // Beförderung: exakt wie im Modal
              : '<ol class="bn-roles">' + x.roles.map(function (r) { return '<li><span class="bn-role">' + esc(r.title) + '</span></li>'; }).join('') + '</ol>';
          return tlItem(x.years, '<p class="bn-xp-org"><span class="bn-value">' + esc(x.org) + '</span><span class="bn-type">' + esc(x.type) + '</span></p>' + roles +
            (x.sum ? '<p class="bn-xp-sum">' + esc(x.sum) + '</p>' : ''));
        }).join('') + '</ol></div>';
      },
      title: 'Experience',
      detail: function () {
        return '<ul class="bnm-rows">' + EXPERIENCE.map(function (x) {
          var left = '<div><p class="bn-xp-org"><span class="bn-value">' + esc(x.org) + '</span><span class="bn-type">' + esc(x.type) + '</span></p><p class="bn-meta">' + esc(x.meta) + '<br>' + esc(x.period) + '</p></div>';
          var right = rolesBlock(x);
          return '<li>' + left + right + '</li>';
        }).join('') + '</ul>';
      } },

    { id: 'ed', label: 'Education',
      tile: function () {
        return head('Education') + '<div class="bn-body"><ol class="bn-tls">' + EDUCATION.map(function (q) {
          return tlItem(q.years, '<p class="bn-value">' + esc(q.org) + '</p><p class="bn-role bn-tl-sub">' + esc(q.title) + '</p>' +
            (q.sum ? '<p class="bn-xp-sum">' + esc(q.sum) + '</p>' : ''));
        }).join('') + '</ol></div>';
      },
      title: 'Education',
      detail: function () {
        return '<ul class="bnm-rows">' + EDUCATION.map(function (q) {
          return '<li><div><p class="bn-value">' + esc(q.orgLong || q.org) + '</p><p class="bnm-role-title bnm-sub">' + esc(q.title) + '</p><p class="bn-meta">' + q.period + '</p></div><p>' + esc(q.text) + '</p></li>';
        }).join('') + '</ul>';
      } },

    { id: 'sq', label: 'Interests', narrow: true,
      tile: function () {
        return head('Interests') + '<div class="bn-body"><ul class="bn-list" style="--rows:' + Math.ceil(SIDE.length / 3) + '">' + SIDE.map(function (s) {   // 3 Spalten
          return '<li><span class="bn-item">' + esc(s) + '</span></li>';
        }).join('') + '</ul></div>';
      },
      title: 'Interests',
      detail: function () {
        return '<div class="bnm-text bnm-prose">' + INTERESTS_TEXT.map(function (pp) {
          return '<p>' + esc(pp) + '</p>';
        }).join('') + '</div>';
      } }
  ];

  /* ── Board rendern ── */
  var board = document.getElementById('bento');
  if (!board) return;
  var byId = {};
  var ORDER = ['pl', 'po', 'ql', 'in', 'sk', 'ed', 'sq'];   // Lese- und Tab-Reihenfolge (zeilenweise)
  TILES.sort(function (a, b) { return ORDER.indexOf(a.id) - ORDER.indexOf(b.id); });
  var STACK = { ql: 1, ed: 1 }, stack = null;       // rechte Spalte: Experience füllt, Education unten
  TILES.forEach(function (t) {
    var el = document.createElement('article');
    el.className = 'bn-card bn-tile bn-' + t.id;
    el.style.gridArea = t.id;
    el.setAttribute('data-tile', t.id);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.setAttribute('aria-haspopup', 'dialog');
    el.setAttribute('aria-label', t.lightbox ? 'Portrait, enlarge photo' : t.label + ', show details');
    el.innerHTML = t.tile();
    if (STACK[t.id]) {
      if (!stack) { stack = document.createElement('div'); stack.className = 'bn-stack'; board.appendChild(stack); }
      stack.appendChild(el);
    } else board.appendChild(el);
    byId[t.id] = { def: t, el: el };
  });
  /* fehlendes Icon → neutrales Kästchen mit Anfangsbuchstaben */
  function isDarkMono(img) {                        // fast schwarz + ohne Farbe → auf dunklem Grund unsichtbar
    try {
      var c = document.createElement('canvas'); c.width = c.height = 24;
      var x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      var d = x.getImageData(0, 0, 24, 24).data, n = 0, lum = 0, sat = 0;
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        var r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        lum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; sat += mx ? (mx - mn) / mx : 0; n++;
      }
      return n > 20 && lum / n < 0.22 && sat / n < 0.15;
    } catch (e) { return false; }                  // z. B. lokal per file:// geöffnet
  }
  function iconFallback(root) {
    root.querySelectorAll('.bn-ico img').forEach(function (img) {
      var miss = function () { img.parentNode.classList.add('is-empty'); };
      var ok = function () { if (isDarkMono(img)) img.parentNode.classList.add('is-light'); };
      img.addEventListener('error', miss);
      img.addEventListener('load', ok);
      if (img.complete) { if (!img.naturalWidth) miss(); else ok(); }
    });
  }
  iconFallback(board);

  /* Tooltip: ein fixes Element über allem → wird von keiner Kachel abgeschnitten */
  var tip = document.createElement('div');
  tip.className = 'bn-tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);
  function showTip(el) {
    var title = el.getAttribute('data-tip-title');
    tip.innerHTML = (title ? '<strong>' + esc(title) + '</strong>' : '') + esc(el.getAttribute('data-tip'));
    var r = el.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
    /* zentriert über dem Icon; oben kein Platz (Nav) → darunter */
    var left = Math.max(10, Math.min(window.innerWidth - tw - 10, r.left + r.width / 2 - tw / 2));
    var top = r.top - th - 10;
    if (top < 62) top = r.bottom + 10;
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
    tip.classList.add('is-on');
  }
  function hideTip() { tip.classList.remove('is-on'); }
  board.addEventListener('mouseover', function (e) {
    var el = e.target.closest('[data-tip]');
    if (el) showTip(el); else hideTip();
  });
  board.addEventListener('mouseleave', hideTip);
  window.addEventListener('scroll', hideTip, { passive: true });

  var photo = board.querySelector('.bn-photo');
  if (photo) {
    var noPhoto = function () { byId.po.el.classList.add('no-photo'); };
    photo.addEventListener('error', noPhoto);
    if (photo.complete && !photo.naturalWidth) noPhoto();
  }

  /* ── Portrait „Aufdecken“: das Foto ist standardmäßig ein Pixel-Mosaik. Um den Cursor wird es
     Block für Block scharf (weicher Rand im selben Raster), hinter dem Cursor verpixelt es sich
     sanft wieder; verlässt die Maus das Foto, ist es nach kurzer Zeit wieder ganz verpixelt.
     Das Skript liest keine Bildpunkte → funktioniert auch per file://. Ohne Maus (Touch):
     kein Mosaik, das Foto bleibt normal sichtbar. */
  (function portraitReveal() {
    var tile = byId.po && byId.po.el, img = tile && tile.querySelector('.bn-photo');
    if (!tile || !img) return;
    if (window.matchMedia && !window.matchMedia('(any-hover: hover)').matches) return;
    tile.classList.add('px-pending');                // Foto erst zeigen, wenn das Mosaik steht
    var cv = document.createElement('canvas');
    cv.className = 'bn-po-mosaic'; cv.setAttribute('aria-hidden', 'true');
    img.insertAdjacentElement('afterend', cv);
    var ctx = cv.getContext('2d'), mosaic = document.createElement('canvas'), mctx = mosaic.getContext('2d');
    var small = document.createElement('canvas'), sctx = small.getContext('2d');
    if (!ctx || !mctx || !sctx) { tile.classList.remove('px-pending'); return; }
    var W = 0, H = 0, dpr = 1, B = 24, R = 120, cols = 0, rows = 0, reveal = null;
    var inside = false, mx = -1e4, my = -1e4, raf = 0, ready = false;

    /* Mosaik einmal vorberechnen (Bild klein zeichnen → ohne Glättung hochskalieren) */
    function build() {
      W = tile.clientWidth; H = tile.clientHeight;
      if (!W || !H || !img.naturalWidth) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      B = Math.max(9, Math.round(W / 26));             // Blockgröße passt sich der Kachel an (≈ 26 Blöcke in der Breite)
      R = Math.max(90, Math.round(W * 0.3));           // Radius der Aufdeckung
      cols = Math.ceil(W / B); rows = Math.ceil(H / B);
      var iw = img.naturalWidth, ih = img.naturalHeight, sc = Math.max(W / iw, H / ih);
      var ox = (W - iw * sc) * 0.5, oy = (H - ih * sc) * 0.3;          // wie object-fit: cover, 50% 30%
      small.width = cols; small.height = rows;
      sctx.drawImage(img, -ox / sc, -oy / sc, cols * B / sc, rows * B / sc, 0, 0, cols, rows);
      [cv, mosaic].forEach(function (c) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); });
      mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      mctx.imageSmoothingEnabled = false;
      mctx.drawImage(small, 0, 0, cols, rows, 0, 0, cols * B, rows * B);
      reveal = new Float32Array(cols * rows);
      ready = true;
      frame();                                         // Ruhezustand: komplett verpixelt
      tile.classList.remove('px-pending');
    }

    function frame() {
      raf = 0;
      if (!ready) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.drawImage(mosaic, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'destination-out';   // aufgedeckte Blöcke aus dem Mosaik „radieren“
      var busy = false;
      for (var gy = 0; gy < rows; gy++) {
        var cy = gy * B + B / 2;
        for (var gx = 0; gx < cols; gx++) {
          var i = gy * cols + gx, cx = gx * B + B / 2, target = 0;
          if (inside) {
            var dx = cx - mx, dy = cy - my, d = Math.sqrt(dx * dx + dy * dy);
            if (d < R) target = d < R * 0.55 ? 1 : 1 - (d - R * 0.55) / (R * 0.45);   // innen scharf, Rand weich
          }
          var a = reveal[i];
          a += target > a ? (target - a) * (reduce ? 1 : 0.35) : (target - a) * (reduce ? 1 : 0.07);
          if (Math.abs(a - target) < 0.004) a = target;   // einrasten → Animation endet, wenn nichts mehr passiert
          if (a < 0.01) a = 0; else if (a > 0.99) a = 1;
          reveal[i] = a;
          if (a !== target) busy = true;
          if (!a) continue;
          ctx.globalAlpha = a;
          ctx.fillRect(gx * B, gy * B, B, B);
        }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (busy) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    tile.addEventListener('mousemove', function (e) {
      if (!ready) return;
      var r = tile.getBoundingClientRect();
      mx = e.clientX - r.left; my = e.clientY - r.top;
      var pr = tile._parallax;                          // Mosaik ist per Parallax verschoben/skaliert → zurückrechnen
      if (pr) { mx = (mx - W / 2 - pr.tx) / pr.s + W / 2; my = (my - H / 2 - pr.ty) / pr.s + H / 2; }
      inside = true; kick();
    });
    tile.addEventListener('mouseleave', function () { inside = false; kick(); });
    if (img.complete && img.naturalWidth) build();
    else {
      img.addEventListener('load', build);
      img.addEventListener('error', function () { tile.classList.remove('px-pending'); cv.remove(); });
    }
    window.addEventListener('resize', function () { ready = false; build(); });
  })();

  /* ── Portrait-Parallax: das Foto wandert ganz leicht gegenläufig zur Mausposition auf der Seite.
     Max. 8px, weich nachgezogen. Foto + Mosaik bewegen sich gemeinsam; die minimale Vergrößerung
     deckt genau den Spielraum ab, damit nie eine Kante sichtbar wird. */
  (function portraitParallax() {
    var tile = byId.po && byId.po.el;
    if (!tile || reduce) return;
    if (window.matchMedia && !window.matchMedia('(any-hover: hover)').matches) return;
    var MAX = 8, EASE_K = 0.08;
    var tx = 0, ty = 0, gx = 0, gy = 0, s = 1, raf = 0;
    function scale() { var m = Math.min(tile.clientWidth, tile.clientHeight) || 1; s = 1 + (2 * MAX + 2) / m; }
    function apply() {
      var tf = 'translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      tile.querySelectorAll('.bn-photo, .bn-po-mosaic').forEach(function (el) { el.style.transform = tf; });
      tile._parallax = { tx: tx, ty: ty, s: s };
    }
    function frame() {
      raf = 0;
      tx += (gx - tx) * EASE_K; ty += (gy - ty) * EASE_K;
      if (Math.abs(gx - tx) < 0.02 && Math.abs(gy - ty) < 0.02) { tx = gx; ty = gy; } else raf = requestAnimationFrame(frame);
      apply();
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }
    window.addEventListener('mousemove', function (e) {
      gx = -((e.clientX / window.innerWidth) - 0.5) * 2 * MAX;     // gegenläufig zur Maus
      gy = -((e.clientY / window.innerHeight) - 0.5) * 2 * MAX;
      kick();
    }, { passive: true });
    document.addEventListener('mouseleave', function () { gx = gy = 0; kick(); });   // Maus verlässt das Fenster → Mitte
    window.addEventListener('resize', function () { scale(); apply(); });
    scale(); apply();
  })();

  /* Name passt immer in die Kachel (egal welche Schrift gerade geladen ist) */
  function fitName() {
    var h = board.querySelector('.bn-pl .bn-display');
    if (!h) return;
    h.style.fontSize = '';
    var fs = parseFloat(getComputedStyle(h).fontSize), w = h.clientWidth, sw = h.scrollWidth;
    if (w && sw > w) { fs = fs * w / sw * 0.98; h.style.fontSize = fs + 'px'; }
    var tile = h.closest('.bn-card');                  // und passt auch in die Höhe
    for (var i = 0; i < 20 && tile.scrollHeight > tile.clientHeight + 1 && fs > 28; i++) { fs *= 0.95; h.style.fontSize = fs + 'px'; }
  }
  fitName();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitName);
  window.addEventListener('resize', fitName);


  /* Ein einziger Auftritt: Kacheln erscheinen diagonal gestaffelt */
  if (hasGsap && !reduce) {
    var cards = Array.prototype.slice.call(board.querySelectorAll('.bn-card'));
    gsap.set(cards, { opacity: 0 });
    var play = function () {
      gsap.to(cards, {
        opacity: 1, duration: 0.8, ease: 'power2.out',
        stagger: function (i, el) { var r = el.getBoundingClientRect(); return (r.left + r.top) / 4200; }
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(play); else play();
  }

  /* ── Detail-Panel ── */
  var modal = document.getElementById('bnModal');
  var panel = modal.querySelector('.bnm-panel');
  var backdrop = modal.querySelector('.bnm-backdrop');
  var content = modal.querySelector('.bnm-content');
  var label = document.getElementById('bnmLabel');
  var inner = document.getElementById('bnmInner');
  var closeBtn = modal.querySelector('.bnm-close');
  var current = null, busy = false, lastFocus = null;

  function target(entry) {
    var vw = window.innerWidth, vh = window.innerHeight, mobile = vw <= 640;
    var w = mobile ? vw - 20 : Math.min(entry && entry.def.narrow ? 680 : 1040, vw - 64);
    var maxH = mobile ? vh - 20 : Math.min(760, vh - 64);
    /* Höhe = natürliche Höhe des Inhalts bei Zielbreite, gedeckelt auf den Bildschirm */
    content.style.width = w + 'px'; content.style.height = 'auto';
    if (entry && entry.def.equalRows) equalRows(inner);   // erst bei Zielbreite messen
    var h = Math.min(maxH, Math.ceil(content.scrollHeight));
    return { left: Math.round((vw - w) / 2), top: Math.round((vh - h) / 2), width: Math.round(w), height: h };
  }
  /* Alle Einträge einer Detail-Liste auf die Höhe des höchsten bringen (Beschreibung bleibt oben) */
  function equalRows(root) {
    var lis = root.querySelectorAll('.bnm-rows > li'), max = 0, i;
    for (i = 0; i < lis.length; i++) lis[i].style.minHeight = '';
    /* Höhe ohne unteres Padding/Linie vergleichen – der letzte Eintrag hat beides nicht */
    function tail(li) { var cs = getComputedStyle(li); return parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth); }
    for (i = 0; i < lis.length; i++) max = Math.max(max, lis[i].offsetHeight - tail(lis[i]));
    for (i = 0; i < lis.length; i++) lis[i].style.minHeight = (max + tail(lis[i])) + 'px';
  }
  function place(el, r) { el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; }
  function lock(on) {
    document.documentElement.classList.toggle('bn-locked', on);
    try { if (typeof lenis !== 'undefined' && lenis) { if (on && lenis.stop) lenis.stop(); if (!on && lenis.start) lenis.start(); } } catch (e) {}
  }
  function fade(el, on) { el.style.opacity = on ? '1' : '0'; }       // Übergang über CSS-transition

  /* ── Pixel-Aufbau im Stil der Seitenwechsel (script.js → initEditorialTransition) ──
     Das Modal selbst erscheint in 72px-Blöcken: von unten nach oben, zufällig gestaffelt,
     gleiche Blockgröße, Verteilung und Kurve wie der Seitenwechsel. Umgesetzt als clip-path,
     der pro Frame genau die bereits sichtbaren Blöcke freigibt; Schließen = Zerfall nach oben. */
  var PX_BLOCK = 72, PX_BIAS = 0.62, PX_DUR = 560;
  var CLIP_OK = !!(window.CSS && CSS.supports && CSS.supports('clip-path', "path('M0 0H1V1Z')"));
  function pxRnd(gx, gy) {
    var x = ((gx + 1) * 374761393 + (gy + 1) * 668265263) >>> 0;
    x = (x ^ (x >>> 13)) * 1274126177 >>> 0;       // identisch zu script.js → gleiches Blockmuster
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  /* Pfad aus allen Blöcken, die bei 'cover' sichtbar sind. build = von unten auf · dissolve = nach oben weg */
  function blockPath(W, H, cover, mode) {
    var cols = Math.ceil(W / PX_BLOCK), rows = Math.ceil(H / PX_BLOCK), d = '';
    for (var gy = 0; gy < rows; gy++) {
      var rowBias = rows > 1 ? gy / (rows - 1) : 0;   // 0 = oben, 1 = unten
      for (var gx = 0; gx < cols; gx++) {
        var rn = pxRnd(gx, gy);
        var thr = mode === 'dissolve' ? rowBias * PX_BIAS + rn * (1 - PX_BIAS)
                                      : (1 - rowBias) * PX_BIAS + rn * (1 - PX_BIAS);
        if (cover >= thr) d += 'M' + gx * PX_BLOCK + ' ' + gy * PX_BLOCK + 'h' + (PX_BLOCK + 1) + 'v' + (PX_BLOCK + 1) + 'h-' + (PX_BLOCK + 1) + 'Z';
      }
    }
    return d;
  }
  function setClip(el, W, H, cover, mode) {
    if (cover >= 1) { el.style.clipPath = 'none'; return; }
    var d = cover > 0 ? blockPath(W, H, cover, mode) : '';
    el.style.clipPath = d ? "path('" + d + "')" : 'inset(50%)';   // inset(50%) = nichts sichtbar
  }
  /* cover von 'from' nach 'to' animieren. Öffnen: easeOutCubic (reagiert sofort auf den Klick),
     Schließen: easeInOutCubic wie der Seitenwechsel */
  function pixelClip(el, from, to, mode, dur) {
    var W = el.offsetWidth, H = el.offsetHeight;
    return new Promise(function (resolve) {
      if (!CLIP_OK) {                                 // sehr alte Browser: einfach einblenden
        el.animate([{ opacity: from }, { opacity: to }], { duration: dur, easing: 'ease' }).onfinish = resolve;
        return;
      }
      setClip(el, W, H, from, mode);
      var t0 = performance.now();
      (function frame(now) {
        var k = Math.max(0, Math.min(1, (now - t0) / dur));
        var ez = mode === 'build' ? 1 - Math.pow(1 - k, 3) : (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
        setClip(el, W, H, from + (to - from) * ez, mode);
        if (k < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  }

  function open(id) {
    var entry = byId[id];
    if (!entry || busy || current) return;
    if (entry.def.lightbox) { openPhoto(entry); return; }
    busy = true; current = entry; lastFocus = document.activeElement;
    hideTip();
    label.textContent = entry.def.label;
    inner.innerHTML = (entry.def.title ? '<h2 class="bnm-title" id="bnmTitle">' + entry.def.title + '</h2>' : '') + entry.def.detail(entry.el);
    panel.setAttribute('aria-labelledby', entry.def.title ? 'bnmTitle' : 'bnmLabel');
    iconFallback(inner);
    modal.hidden = false;
    if (!reduce) panel.style.clipPath = 'inset(50%)'; // startet unsichtbar, baut sich blockweise auf
    var to = target(entry);
    place(panel, to);
    place(content, { left: 0, top: 0, width: to.width, height: to.height });
    content.scrollTop = 0;
    lock(true);
    void backdrop.offsetWidth; fade(backdrop, true);
    var done = function () { panel.style.clipPath = ''; busy = false; closeBtn.focus({ preventScroll: true }); };
    if (reduce) { done(); return; }
    pixelClip(panel, 0, 1, 'build', PX_DUR).then(done);
  }

  function close() {
    if (!current || busy) return;
    if (current.photo) { closePhoto(); return; }
    busy = true;
    var finish = function () {
      modal.hidden = true;
      panel.style.clipPath = '';
      inner.innerHTML = '';
      lock(false);
      current = null; busy = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (reduce) { fade(backdrop, false); finish(); return; }
    fade(backdrop, false);
    pixelClip(panel, 1, 0, 'dissolve', PX_DUR * 0.8).then(finish);   // zerfällt blockweise nach oben
  }

  /* ── Portrait-Lightbox: das Foto gleitet aus der Kachel groß in die Bildmitte ── */
  var lb = null;
  function rectOf(el) { var r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  function photoTarget(img) {
    var vw = window.innerWidth, vh = window.innerHeight;
    var ar = img.naturalWidth / img.naturalHeight;
    var w = Math.min(vw * 0.86, 1200), h = w / ar;
    if (h > vh * 0.84) { h = vh * 0.84; w = h * ar; }
    return { left: Math.round((vw - w) / 2), top: Math.round((vh - h) / 2), width: Math.round(w), height: Math.round(h) };
  }
  function openPhoto(entry) {
    var tile = entry.el, img = tile.querySelector('.bn-photo');
    if (tile.classList.contains('no-photo') || !img || !img.naturalWidth) return;
    busy = true; lastFocus = document.activeElement; hideTip();
    lb = document.createElement('div');
    lb.className = 'bnl';
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Portrait of Jacob Weissenbäck'); lb.tabIndex = -1;
    lb.innerHTML = '<div class="bnl-backdrop"></div><img class="bnl-img" alt="Portrait of Jacob Weissenbäck">';
    var big = lb.querySelector('.bnl-img'), bd = lb.querySelector('.bnl-backdrop');
    big.src = img.currentSrc || img.src;
    document.body.appendChild(lb);
    var from = rectOf(tile), to = photoTarget(img);
    place(big, from);
    tile.classList.add('is-lifted');
    lock(true);
    current = { photo: true, el: tile, img: img, big: big, bd: bd };
    lb.addEventListener('click', close);
    void bd.offsetWidth; fade(bd, true);
    var done = function () { busy = false; lb.focus({ preventScroll: true }); };
    if (!hasGsap || reduce) { place(big, to); done(); return; }
    gsap.to(big, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 0.8, ease: 'expo.out', onComplete: done });
  }
  function closePhoto() {
    busy = true;
    var c = current, to = rectOf(c.el);
    var finish = function () {
      if (lb) lb.remove(); lb = null;
      c.el.classList.remove('is-lifted');
      lock(false); current = null; busy = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    fade(c.bd, false);
    if (!hasGsap || reduce) { finish(); return; }
    gsap.to(c.big, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 0.6, ease: 'expo.inOut', onComplete: finish });
  }

  board.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tile]');
    if (t) open(t.getAttribute('data-tile'));
  });
  board.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target.closest('[data-tile]');
    if (!t) return;
    e.preventDefault(); open(t.getAttribute('data-tile'));
  });
  modal.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]')) { close(); return; }
  });
  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (current.photo) { if (e.key === 'Tab') e.preventDefault(); return; }
    if (e.key === 'Tab') {                                     // Fokus bleibt im Panel
      var f = panel.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('resize', function () {
    if (!current || busy) return;
    if (current.photo) { place(current.big, photoTarget(current.img)); return; }
    var to = target(current); place(panel, to); place(content, { left: 0, top: 0, width: to.width, height: to.height });
  });
})();