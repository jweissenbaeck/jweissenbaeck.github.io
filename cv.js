/* ============================================================
   CV PAGE — Bento-Board + Detail-Panel
   · Kacheln aus den Daten unten
   · Klick → Kachel wächst zur Detail-Ansicht über der Seite (nichts verschiebt sich)
============================================================ */
(function () {
  /* ── Einstellungen ── */
  var PORTRAIT    = 'assets/jcky-3.jpg';

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
      more: 'My main design tool. I use it for high-fidelity prototypes, for building and maintaining design systems and for everyday interface design, from first layouts to developer-ready screens.' },
    { group: 'Design & Creativity', name: 'Claude', icon: 'Claude_AI_symbol.svg',
      use:  'AI assistant for prototyping and inspiration',
      more: 'My AI assistant in the design process. I use it to prototype ideas quickly, explore different directions and find inspiration when I start something new.' },
    { group: 'Design & Creativity', name: 'Adobe Illustrator', icon: 'Adobe_Illustrator_CC_icon.svg',
      use:  'Logos and graphics',
      more: 'For vector work: logos and graphics that need to stay sharp at any size.' },
    { group: 'Design & Creativity', name: 'Adobe Photoshop', icon: 'Adobe_Photoshop_CC_icon.svg',
      use:  'Image manipulation',
      more: 'For image manipulation, from retouching and compositing to preparing images for screens and campaigns.' },
    { group: 'Design & Creativity', name: 'Adobe Lightroom Classic', icon: 'Adobe_Photoshop_Lightroom_Classic_CC_icon.svg',
      use:  'Colour grading and colour correction of photos',
      more: 'My photography workflow: colour correction and colour grading of my photos, from a consistent look across a series to the final export.' },
    { group: 'Design & Creativity', name: 'DaVinci Resolve Studio', icon: 'DaVinci_Resolve_Studio.png',
      use:  'Video editing and colour grading',
      more: 'For video, from the edit to colour grading that gives the footage its final look.' },
    { group: 'Programming', name: 'HTML5', icon: 'HTML5_logo_and_wordmark.svg',
      use:  'Prototyping websites',
      more: 'Together with CSS and JavaScript, I use HTML to prototype websites directly in the browser. HTML defines the structure and content of a page.' },
    { group: 'Programming', name: 'CSS3', icon: 'CSS3_logo.svg',
      use:  'Prototyping websites',
      more: 'Styling, layout and animation for website prototypes, so ideas can be tested as real, responsive pages.' },
    { group: 'Programming', name: 'JavaScript', icon: 'Unofficial_JavaScript_logo_2.svg',
      use:  'Prototyping websites',
      more: 'Interaction and behaviour in website prototypes: how a page responds when people actually use it.' },
    { group: 'Programming', name: 'Python', icon: 'Python-logo-notext.svg',
      use:  'Scripting and backend',
      more: 'For scripting and backend work, from small automations to the server side of a project.' },
    { group: 'Tech', name: 'GitHub', icon: 'github.svg',
      use:  'Collaboration between designers and developers',
      more: 'Where design and development meet. I use GitHub to collaborate with developers, share work, follow changes and keep the handoff close to the code.' },
    { group: 'Tech', name: 'Git', icon: 'Git_icon.svg',
      use:  'Version control',
      more: 'Version control for my projects, so every change is tracked and easy to roll back.' },
    { group: 'Tech', name: 'GitLab', icon: 'GitLab.svg',
      use:  'Occasional collaboration environment',
      more: 'An environment I sometimes use for collaboration, depending on the team and the project.' }
  ];
  function toolsIn(g) { return TOOLS.filter(function (t) { return t.group === g; }); }
  function toolIcon(t) {
    return '<span class="bn-ico" data-letter="' + esc(t.name.charAt(0)) + '">' +
      '<img src="' + ICONS + t.icon + '" alt="" decoding="async"></span>';
  }
  /* Skills: die ersten SKILLS_TILE erscheinen in der Kachel, alle im Detail */
  var SKILLS_TILE = 9;   // alle Skills passen in die Kachel
  var SKILLS = [
    { name: 'UI / UX design',                use: 'Interfaces for internal and external products, from first idea to final screen.' },
    { name: 'High-fidelity prototyping',     use: 'Detailed, interactive prototypes that look and behave like the real product.' },
    { name: 'Design system architecture',    use: 'Structuring scalable design systems with components and clear rules. I built one from the ground up at Websline.' },
    { name: 'Prototyping in Figma',          use: 'From quick flows to polished, clickable prototypes.' },
    { name: 'AI-integrated workflows',       use: 'AI tools like Claude as part of my process, for prototyping, exploration and inspiration.' },
    { name: 'Design-to-developer handover',  use: 'A smooth handover: clear specs, documented components and close collaboration with developers on GitHub.' },
    { name: 'Wireframing',                   use: 'Structure and flows before visual design.' },
    { name: 'Product thinking',              use: 'Product and design thinking across several web projects during my studies.' },
    { name: 'HCI',                           use: 'Focus of my bachelor studies, together with geoinformatics: how people and interfaces work together.' }
  ];
  /* Experience: neueste Station zuerst. Firma = Überschrift, darunter die Rolle(n).
     years = Jahres-Spalte (Kachel) · period = Zeitraum (Detail) · roles: mehrere = Beförderung in derselben Firma
     role.when = Zeitraum der Rolle (nur bei mehreren Rollen in der Kachel) · points = Aufgaben (Detail) */
  var EXPERIENCE = [
    { org: 'Websline', meta: 'Full-time, Salzburg, Austria', years: '2025 — Now', period: 'Since September 2025',
      sum: 'Hi-fi prototypes, design system architecture, close and smooth dev handover.',
      roles: [
        { title: 'Junior UI / UX Designer', when: 'Mar 2026 — Now', period: 'March 2026 — Now', current: true,
          note: 'Project: Websline Design System',
          points: [
              'High-fidelity prototyping',
              'Building and developing a scalable design system',
              'Bridge between design and development',
              'AI integration within workflows'
            ] },
        { title: 'UI / UX Design Trainee', when: 'Sep 2025 — Feb 2026', period: 'September 2025 — February 2026, 6 months' }
      ] },
    { org: 'Austrian Red Cross', meta: 'Internship, Salzburg, Austria, on-site', years: '2023', period: 'August 2023, 1 month',
      sum: 'Digital design and databases.',
      roles: [
        { title: 'Information Technology Internship',
          points: [
              'Digital design',
              'Maintaining the vehicle and equipment database',
              'Supporting the digital transformation and optimising existing processes',
              'Configuring, installing and integrating hardware components',
              'Setting up and installing Wi-Fi access points'
            ] }
      ] },
    { org: 'Austrian Red Cross', meta: 'Internship, Salzburg, Austria, on-site', years: '2019', period: 'August 2019, 1 month',
      sum: 'Digital design and databases.',
      roles: [
        { title: 'Information Technology Internship',
          points: [
              'Digital design',
              'Data synchronisation and data entry in the employee database',
              'Data collection and evaluation for the laryngeal tube study',
              'Assessing and issuing certificates',
              'General administrative tasks'
            ] }
      ] }
  ];
  /* Education: neueste zuerst */
  var EDUCATION = [
    { title: 'B.Sc. Digitalization & Innovation', org: 'Paris Lodron University of Salzburg',
      years: '2022 — 2025', period: 'October 2022 — September 2025',
      sum: 'HCI and geoinformatics. Graduated with distinction (1.4).',
      text: 'Focus on human-computer interaction and geoinformatics. Product and design thinking across several web projects, and a bachelor thesis on how apps can be designed to increase user motivation. Graduated with 1.4, passed with distinction, and received a merit scholarship for my grades.' },
    { title: 'Secondary school diploma', org: 'BRG Seekirchen', orgLong: 'BRG Seekirchen (Matura)',
      years: '2013 — 2021', period: 'September 2013 — July 2021',
      sum: 'Matura with a focus on languages.',
      text: 'Graduated with the Matura, the Austrian university entrance qualification. Focus on languages, including several foreign languages. Alongside school, internships and part-time work in IT and digital gave me hands-on experience with databases, digital design and practical projects.' }
  ];
  /* Interessen: group ordnet das Detail, note ist optional */
  var INTEREST_GROUPS = ['Creative', 'Culture', 'Sport & games'];
  var SIDE = [
    { group: 'Creative',      name: 'Music',           note: 'I play piano and guitar.' },
    { group: 'Creative',      name: 'Photography',     note: 'Also part of my work, for hotel campaigns at Websline.' },
    { group: 'Creative',      name: 'Videography',     note: 'From shooting to the final edit.' },
    { group: 'Creative',      name: 'Painting' },
    { group: 'Culture',       name: 'Art' },
    { group: 'Culture',       name: 'History',         note: 'A subject I love.' },
    { group: 'Culture',       name: 'Classical music', note: 'A big fan.' },
    { group: 'Sport & games', name: 'Gym',             note: 'Something I am passionate about.' },
    { group: 'Sport & games', name: 'Tennis' },
    { group: 'Sport & games', name: 'Chess' }
  ];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* Öffnen-Hinweis oben rechts: unsichtbar, beim Hover gleitet ein Pfeil nach rechts oben herein */
  var OPEN_ICON = '<span class="bn-open" aria-hidden="true"><svg viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 9 9 3M4.5 3H9v4.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="square"/></svg></span>';
  function head(label, noOpen) { return '<header class="bn-head"><span class="bn-label">' + label + '</span>' + (noOpen ? '' : OPEN_ICON) + '</header>'; }
  /* Eintrag mit Jahres-Spalte links (Experience + Education) */
  function tlItem(years, body) {
    return '<li class="bn-tl"><span class="bn-meta bn-tl-years">' + years + '</span><div class="bn-tl-body">' + body + '</div></li>';
  }
  function facts(rows) {
    return '<dl class="bnm-facts">' + rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('') + '</dl>';
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
        return '<div class="bnm-text">' +
          '<p>Designer with a focus on design systems, prototyping and clear developer handoff, plus photography and video on the side.</p>' +
          '<p>I turn ideas into clear, usable and considered interfaces.</p></div>';
      } },

    { id: 'po', label: 'Portrait',
      tile: function () {
        return head('Portrait') +
          '<img class="bn-photo" src="' + PORTRAIT + '" alt="Portrait of Jacob Weissenbäck" decoding="async">' +
          '<div class="bn-mono" aria-hidden="true">JW</div>';
      },
      lightbox: true },                            // öffnet nur das Foto, groß in der Bildmitte

    { id: 'in', label: 'Tools',
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
          return '<h3 class="bnm-group">' + esc(g) + '</h3><ul class="bnm-rows">' + toolsIn(g).map(function (t) {
            return '<li><div class="bnm-tool">' + toolIcon(t) + '<p class="bn-value">' + esc(t.name) + '</p></div><p>' + esc(t.more) + '</p></li>';
          }).join('') + '</ul>';
        }).join('');
      } },

    { id: 'sk', label: 'Skills',
      tile: function () {
        return head('Skills') + '<div class="bn-body"><ul class="bn-list" style="--rows:' + Math.ceil(SKILLS_TILE / 2) + '">' + SKILLS.slice(0, SKILLS_TILE).map(function (s) {   // 2 Spalten
          return '<li><span class="bn-item">' + esc(s.name) + '</span></li>';
        }).join('') + '</ul></div>';
      },
      title: 'Skills',
      detail: function () { return rows(SKILLS); } },

    { id: 'ql', label: 'Experience',
      tile: function () {
        /* Jahr · FIRMA · Titel · Kurzbeschreibung; mehrere Rollen = verbunden (Beförderung) */
        return head('Experience') + '<div class="bn-body"><ol class="bn-tls">' + EXPERIENCE.map(function (x) {
          var multi = x.roles.length > 1;
          var roles = '<ol class="bn-roles' + (multi ? ' is-multi' : '') + '">' + x.roles.map(function (r) {
            return '<li' + (r.current ? ' class="is-current"' : '') + '><span class="bn-role">' + esc(r.title) + '</span></li>';
          }).join('') + '</ol>';
          return tlItem(x.years, '<p class="bn-value">' + esc(x.org) + '</p>' + roles +
            (x.sum ? '<p class="bn-xp-sum">' + esc(x.sum) + '</p>' : ''));
        }).join('') + '</ol></div>';
      },
      title: 'Experience',
      detail: function () {
        return '<ul class="bnm-rows">' + EXPERIENCE.map(function (x) {
          var multi = x.roles.length > 1;
          var left = '<div><p class="bn-value">' + esc(x.org) + '</p><p class="bn-meta">' + esc(x.meta) + '<br>' + esc(x.period) + '</p></div>';
          var right = '<div class="bnm-roles' + (multi ? ' is-multi' : '') + '">' + x.roles.map(function (r) {
            return '<div class="bnm-role' + (r.current ? ' is-current' : '') + '"><p class="bnm-role-title">' + esc(r.title) + '</p>' +
              (r.period ? '<p class="bn-meta">' + esc(r.period) + '</p>' : '') +
              (r.note ? '<p class="bn-meta bnm-note">' + esc(r.note) + '</p>' : '') +
              (r.points ? '<ul class="bnm-points">' + r.points.map(function (pt) { return '<li>' + esc(pt) + '</li>'; }).join('') + '</ul>' : '') + '</div>';
          }).join('') + '</div>';
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

    { id: 'sq', label: 'Interests',
      tile: function () {
        return head('Interests') + '<div class="bn-body"><ul class="bn-list" style="--rows:' + Math.ceil(SIDE.length / 3) + '">' + SIDE.map(function (s) {   // 3 Spalten
          return '<li><span class="bn-item">' + esc(s.name) + '</span></li>';
        }).join('') + '</ul></div>';
      },
      title: 'Interests',
      detail: function () {
        return INTEREST_GROUPS.map(function (g) {
          return '<h3 class="bnm-group">' + g + '</h3><ul class="bnm-rows">' + SIDE.filter(function (s) { return s.group === g; }).map(function (s) {
            return '<li><div><p class="bn-value">' + esc(s.name) + '</p></div><p>' + (s.note ? esc(s.note) : '') + '</p></li>';
          }).join('') + '</ul>';
        }).join('');
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
  var preview = modal.querySelector('.bnm-preview');
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
    var h = Math.min(maxH, Math.ceil(content.scrollHeight));
    return { left: Math.round((vw - w) / 2), top: Math.round((vh - h) / 2), width: Math.round(w), height: h };
  }
  function rectOf(el) { var r = el.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; }
  function place(el, r) { el.style.left = r.left + 'px'; el.style.top = r.top + 'px'; el.style.width = r.width + 'px'; el.style.height = r.height + 'px'; }
  function lock(on) {
    document.documentElement.classList.toggle('bn-locked', on);
    try { if (typeof lenis !== 'undefined' && lenis) { if (on && lenis.stop) lenis.stop(); if (!on && lenis.start) lenis.start(); } } catch (e) {}
  }

  function open(id) {
    var entry = byId[id];
    if (!entry || busy || current) return;
    if (entry.def.lightbox) { openPhoto(entry); return; }
    busy = true; current = entry; lastFocus = document.activeElement;
    hideTip();
    var tile = entry.el, from = rectOf(tile), to;

    preview.className = 'bnm-preview bn-card bn-' + id + (tile.classList.contains('no-photo') ? ' no-photo' : '');
    preview.innerHTML = tile.innerHTML;
    label.textContent = entry.def.label;
    inner.innerHTML = (entry.def.title ? '<h2 class="bnm-title" id="bnmTitle">' + entry.def.title + '</h2>' : '') + entry.def.detail(tile);
    panel.setAttribute('aria-labelledby', entry.def.title ? 'bnmTitle' : 'bnmLabel');
    iconFallback(inner);
    modal.hidden = false;
    place(panel, from);
    to = target(entry);
    place(content, { left: 0, top: 0, width: to.width, height: to.height });
    content.scrollTop = 0;
    tile.classList.add('is-lifted');
    lock(true);

    var done = function () { busy = false; closeBtn.focus({ preventScroll: true }); };
    if (!hasGsap || reduce) {
      place(panel, to); backdrop.style.opacity = 1; preview.style.opacity = 0; content.style.opacity = 1; done(); return;
    }
    gsap.killTweensOf([panel, backdrop, preview, content]);
    gsap.set(preview, { opacity: 1 }); gsap.set(content, { opacity: 0, y: 14 });
    gsap.to(backdrop, { opacity: 1, duration: 0.5, ease: 'power2.out' });
    gsap.to(panel, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 0.8, ease: 'expo.out' });
    gsap.to(preview, { opacity: 0, duration: 0.28, ease: 'power1.out', delay: 0.06 });
    gsap.to(content, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.26, onComplete: done });
  }

  function close() {
    if (!current || busy) return;
    if (current.photo) { closePhoto(); return; }
    busy = true;
    var tile = current.el, to = rectOf(tile);
    var finish = function () {
      modal.hidden = true;
      tile.classList.remove('is-lifted');
      inner.innerHTML = ''; preview.innerHTML = '';
      lock(false);
      current = null; busy = false;
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    };
    if (!hasGsap || reduce) { finish(); return; }
    gsap.killTweensOf([panel, backdrop, preview, content]);
    gsap.to(content, { opacity: 0, duration: 0.18, ease: 'power1.in' });
    gsap.to(preview, { opacity: 1, duration: 0.3, ease: 'power1.out', delay: 0.08 });
    gsap.to(backdrop, { opacity: 0, duration: 0.5, ease: 'power2.inOut', delay: 0.05 });
    gsap.to(panel, { left: to.left, top: to.top, width: to.width, height: to.height, duration: 0.62, ease: 'expo.inOut', onComplete: finish });
  }

  /* ── Portrait-Lightbox: das Foto wächst aus der Kachel in die Bildmitte ── */
  var lb = null;
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
    var done = function () { busy = false; lb.focus({ preventScroll: true }); };
    if (!hasGsap || reduce) { place(big, to); bd.style.opacity = 1; done(); return; }
    gsap.to(bd, { opacity: 1, duration: 0.5, ease: 'power2.out' });
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
    if (!hasGsap || reduce) { finish(); return; }
    gsap.to(c.bd, { opacity: 0, duration: 0.45, ease: 'power2.inOut' });
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