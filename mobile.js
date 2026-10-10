/* ============================================================
   HANDY-VERSION — Verhalten zum eigenen Layout (mobile.css)
   Läuft nur bei PHONE (html.is-phone, im <head> gesetzt); nutzt die Bausteine aus script.js
   (lenis, pxMeasure/pxClip, typePrepare/typeIn, onEnterOnce, afterIntro).
   · Scroll-Anzeige: Pixel-Leiste oben, nur während gescrollt wird
   · Start: Showreel-Karte öffnet sich nach der Intro, „Play reel" wischt auf; What-I-do-Zeilen bauen sich
     beim Hereinkommen einmal aus Pixeln auf, die Werkzeuge tippen sich ein
   · My Work: Zähler + Pixel-Punkte unter jeder Wisch-Galerie
============================================================ */
(function initPhone() {
  if (typeof PHONE === 'undefined' || !PHONE) return;
  const live = !PX_REDUCE && PX_CLIP_OK;
  const ease = (v) => 1 - Math.pow(1 - v, 3);
  const onScroll = (fn) => { if (typeof lenis !== 'undefined' && lenis && lenis.on) lenis.on('scroll', fn); else window.addEventListener('scroll', fn, { passive: true }); };

  /* ── Scroll-Anzeige ── */
  const bar = document.createElement('div');
  bar.className = 'm-progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  let idle = 0;
  onScroll(() => {
    const lim = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    bar.style.setProperty('--p', Math.min(1, Math.max(0, window.scrollY / lim)).toFixed(4));
    bar.classList.add('is-on');
    clearTimeout(idle);
    idle = setTimeout(() => bar.classList.remove('is-on'), 1200);
  });

  /* Pixel-Aufbau über die Zeit */
  function build(el, B, dur) {
    if (!live) return;
    pxMeasure(el, B);
    const t0 = performance.now();
    (function frame(now) {
      const k = Math.min(1, (now - t0) / dur);
      pxClip(el, ease(k), 'build');
      if (k < 1) requestAnimationFrame(frame); else el.style.clipPath = '';
    })(t0);
  }

  /* ── Start: Showreel-Karte ── */
  const card = document.getElementById('heroImgCard');
  if (card) {
    const wrap = card.querySelector('.hero-img-wrap');
    card.insertAdjacentHTML('beforeend',
      '<span class="m-reel-chip" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="M3 2v8l7-4z"/></svg>Play reel</span>');
    card.insertAdjacentHTML('afterend', '<div class="m-reel-meta" aria-hidden="true"><span>Showreel</span><span>' + new Date().getFullYear() + '</span></div>');
    const open = () => setTimeout(() => wrap && wrap.classList.add('is-revealed'), 650);   // nach dem Namen
    if (typeof afterIntro === 'function') afterIntro(open); else open();
  }

  /* ── Start: Porträt hinter dem Namen — rechts neben „JACOB“, unten bündig hinter „…NBACK“.
       Lage aus den Buchstaben gemessen (offset* ignoriert die Einblend-Verschiebung des Namens). ── */
  const heroBlock = document.getElementById('heroTitleBlock');
  const letters = [...document.querySelectorAll('#heroNameLetters .nl')];
  const gapAt = letters.findIndex((l) => l.classList.contains('nl--space'));
  if (heroBlock && gapAt > 0) {
    const photo = document.createElement('img');
    photo.className = 'm-hero-photo'; photo.src = 'assets/jcky-3.jpg'; photo.alt = ''; photo.decoding = 'async';
    photo.setAttribute('aria-hidden', 'true');
    heroBlock.insertBefore(photo, heroBlock.firstChild);
    const box = (el) => { let x = 0, y = 0, n = el; while (n && n !== heroBlock) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; } return { x, y, w: el.offsetWidth, h: el.offsetHeight }; };
    /* rechtsbündig mit „…NBACK“, senkrecht mittig zu Name + Rolle; schmal genug, um rechts neben „JACOB“ zu passen */
    const role = document.getElementById('heroSubtitleRow');
    const place = () => {
      const first = letters.slice(0, gapAt).map(box), second = letters.slice(gapAt + 1).map(box);
      if (!first.length || !second.length) return;
      const right = Math.max(...second.map((b) => b.x + b.w));
      const top = Math.min(...first.map((b) => b.y)) + first[0].h * 0.1;            // Oberkante der Großbuchstaben
      const bottom = role ? box(role).y + role.offsetHeight : Math.max(...second.map((b) => b.y + b.h));
      const free = right - (Math.max(...first.map((b) => b.x + b.w)) + 16);
      const w = Math.round(Math.max(90, Math.min(free, right * 0.34))), h = Math.round(w * 1.25);
      Object.assign(photo.style, { left: (right - w) + 'px', width: w + 'px', top: Math.round((top + bottom) / 2 - h / 2) + 'px', height: h + 'px' });
    };
    const show = () => { place(); setTimeout(() => photo.classList.add('is-in'), 420); };
    if (typeof afterIntro === 'function') afterIntro(() => setTimeout(show, 200)); else show();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(place, 220); });   // nach dem Neu-Einpassen des Namens
  }

  /* ── Start: „My work“ / „More about me“ — Drücken zeigt die Akzent-Fläche; sie wandert zwischen den Feldern:
       erstes Drücken von oben nach unten, zum unteren Feld nach unten, zum oberen nach oben ── */
  const sn = [...document.querySelectorAll('#storyNext .sn-link')];
  let snOn = -1;
  sn.forEach((a, i) => a.addEventListener('pointerdown', () => {
    if (snOn === i) return;
    const down = snOn < 0 || i > snOn;
    sn.forEach((b) => b.classList.remove('m-in-top', 'm-in-bot', 'm-out-top', 'm-out-bot'));
    if (snOn >= 0) sn[snOn].classList.add(down ? 'm-out-bot' : 'm-out-top');
    a.classList.add(down ? 'm-in-top' : 'm-in-bot');
    snOn = i;
  }));

  /* ── Start: What I do — Antippen öffnet darunter ein Mini-Modal mit einem Satz zum Service (data-desc in index.html);
       immer nur eines offen, nochmal tippen schließt. Der Satz tippt sich ein (Mono → Umbruch steht von Anfang an). ── */
  const svcItems = [...document.querySelectorAll('.svc-item')];
  svcItems.forEach((item) => {
    const desc = item.dataset.desc;
    if (!desc) return;
    item.insertAdjacentHTML('beforeend', '<span class="m-svc-ico" aria-hidden="true"></span><div class="m-svc-more"><div class="m-svc-clip"><p class="m-svc-card"></p></div></div>');
    const card = item.querySelector('.m-svc-card');
    card.textContent = desc;
    item.setAttribute('role', 'button'); item.tabIndex = 0; item.setAttribute('aria-expanded', 'false');
    const set = (it, open) => { it.classList.toggle('is-open', open); it.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    const toggle = () => {
      const open = !item.classList.contains('is-open');
      svcItems.forEach((o) => { if (o !== item && o.classList.contains('is-open')) set(o, false); });
      set(item, open);
      if (open && !PX_REDUCE) { card._typeOrig = desc; card._typed = false; card.textContent = desc.replace(/\S/g, ' '); typeIn(card, 900); }
    };
    item.addEventListener('click', toggle);
    item.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  });

  /* What I do: Zeilen bauen sich beim Hereinkommen einmal aus Pixeln auf */
  svcItems.forEach((item) => {
    const name = item.querySelector('.svc-name');
    const skills = [...item.querySelectorAll('.svc-skill')];
    if (!live) return;
    name.style.clipPath = 'inset(50%)';
    skills.forEach(typePrepare);
    onEnterOnce(item, () => {
      build(name, Math.max(5, parseFloat(getComputedStyle(name).fontSize) * 0.09), 700);
      skills.forEach((s, i) => setTimeout(() => typeIn(s, 320), 260 + i * 90));
    }, '-8%');
  });

  /* ── Me: eigene Seite (cv.js überspringt auf dem Handy die Story). Satz Wort für Wort, Tools als gruppiertes Raster,
       Sticker poppen auf — jeweils einmal beim Hereinscrollen. Die Pillen-Physik (cv.js) bleibt. ── */
  const meStory = document.querySelector('.cvs.is-phone');
  if (meStory) {
    const cloud = meStory.querySelector('.cvs-cloud');
    if (cloud) {
      const byName = {};
      [...cloud.children].forEach((li) => { byName[li.querySelector('.cvs-i3d-name').textContent.trim()] = li; });
      const GROUPS = [
        ['Design & Video', ['Figma', 'Illustrator', 'Photoshop', 'Lightroom Classic', 'DaVinci Resolve Studio']],
        ['Code', ['HTML5', 'CSS3', 'JavaScript', 'Python']],
        ['Workflow & AI', ['Git', 'GitHub', 'GitLab', 'Claude']]
      ];
      const tools = document.createElement('div');
      tools.className = 'm-tools';
      GROUPS.forEach(([title, names], gi) => {
        const g = document.createElement('div');
        g.className = 'm-tools-group';
        g.innerHTML = '<p class="m-tools-k"><span>0' + (gi + 1) + '</span>' + title + '</p><ul class="m-tools-grid"></ul>';
        const ul = g.querySelector('ul');
        names.forEach((n) => { if (byName[n]) { ul.appendChild(byName[n]); delete byName[n]; } });
        Object.keys(byName).forEach((n) => { if (gi === GROUPS.length - 1) ul.appendChild(byName[n]); });   // falls ein Tool dazukommt
        tools.appendChild(g);
      });
      cloud.replaceWith(tools);
      tools.addEventListener('click', (e) => {                          // Antippen: Münzwurf (Drehung, cv.js räumt danach auf)
        const li = e.target.closest('.cvs-i3d');
        if (li && !PX_REDUCE && !li.classList.contains('is-spin')) li.classList.add('is-spin');
      });
      if (live) tools.querySelectorAll('.cvs-i3d').forEach((li) => {
        li.style.clipPath = 'inset(50%)';
        onEnterOnce(li, () => setTimeout(() => build(li, 8, 520), (li.parentNode.children.length > 1 ? [...li.parentNode.children].indexOf(li) : 0) * 70), '-6%');
      });
    }
    if (!PX_REDUCE) {
      const words = [...meStory.querySelectorAll('.cvs-word')];
      const big = meStory.querySelector('.cvs-big');
      words.forEach((w, i) => { w.classList.add('m-word'); w.style.transitionDelay = (i * 70) + 'ms'; });
      if (big) onEnterOnce(big, () => words.forEach((w) => w.classList.add('is-in')), '-12%');
      const stickers = [...meStory.querySelectorAll('.cvs-sticker')];
      const list = meStory.querySelector('.cvs-stickers');
      stickers.forEach((s, i) => { s.classList.add('m-pop'); s.style.transitionDelay = (i * 55) + 'ms'; });
      if (list) onEnterOnce(list, () => stickers.forEach((s) => s.classList.add('is-in')), '-10%');
    }
  }

  /* ── My Work: Zähler unter jeder Galerie (nach projects.js, das die Projekte ebenfalls auf window baut) ── */
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.pj-project').forEach((proj) => {
      const row = proj.querySelector('.pj-project-row');
      const shots = row ? [...row.querySelectorAll('.pj-shot')] : [];
      if (shots.length < 2) return;
      const n = String(shots.length).padStart(2, '0');
      const count = document.createElement('div');
      count.className = 'm-count'; count.setAttribute('aria-hidden', 'true');
      count.innerHTML = '<span class="m-count-n">01 / ' + n + '</span><span class="m-count-dots">' + shots.map(() => '<i></i>').join('') + '</span>';
      row.after(count);
      const num = count.querySelector('.m-count-n'), dots = [...count.querySelectorAll('i')];
      let cur = -1;
      const update = () => {
        const step = shots[1].offsetLeft - shots[0].offsetLeft || 1;
        const i = Math.max(0, Math.min(shots.length - 1, Math.round(row.scrollLeft / step)));
        if (i === cur) return;
        cur = i;
        num.textContent = String(i + 1).padStart(2, '0') + ' / ' + n;
        dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      };
      row.addEventListener('scroll', update, { passive: true });
      update();
    });
  });
})();
