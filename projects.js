/* ============================
   PROJECTS PAGE — Jacob Weissenbäck
============================ */

var NAV_LINE = 64; /* px — matches the fixed nav's height, used as the shared scroll offset */

window.addEventListener('DOMContentLoaded', function () {

  /* ── Lenis smooth scroll ── */
  var lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  lenis.on('scroll', function () {
    ScrollTrigger.update();
  });
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.addEventListener('refresh', function () { lenis.resize(); });

  /* ============================
     NAV LOGO — stays static ("JCKY / PORTFOLIO") on the projects page,
     no scroll-driven swap here.
  ============================ */
  var sentinel = document.getElementById('projTabnavSentinel');

  /* ============================
     TAB NAV — kept for looks only; no longer switches any content.
  ============================ */
  var tabnavWrap = document.getElementById('projTabnavWrap');
  var tabnav     = document.getElementById('projTabnav');
  var tabs       = gsap.utils.toArray('.proj-tab');
  var indicator  = document.getElementById('projTabIndicator');

  var listEl       = document.getElementById('projList');
  var previewEl     = document.getElementById('projListPreview');
  var previewImgEl  = document.getElementById('projListPreviewImg');
  var viewSwitchEl  = document.getElementById('projViewSwitch');
  var viewBtns      = gsap.utils.toArray('.proj-view-btn');

  var currentTab  = document.querySelector('.proj-tab.is-active').dataset.tab;
  var currentView = 'list';
  viewSwitchEl.setAttribute('data-view', currentView);

  function positionIndicator(tabEl, animated) {
    var navRect  = tabnav.getBoundingClientRect();
    var tabRect  = tabEl.getBoundingClientRect();
    var newLeft  = tabRect.left - navRect.left;
    var newWidth = tabRect.width;

    if (!animated) {
      gsap.set(indicator, { left: newLeft, width: newWidth });
      return;
    }

    gsap.to(indicator, {
      left: newLeft,
      width: newWidth,
      duration: 0.24,
      ease: 'power2.out'
    });
  }

  function setActiveTab(tabEl) {
    tabs.forEach(function (t) { t.classList.remove('is-active'); });
    tabEl.classList.add('is-active');
    positionIndicator(tabEl, true);
    currentTab = tabEl.dataset.tab;
    renderList();
  }

  tabs.forEach(function (tabEl) {
    tabEl.addEventListener('click', function () { setActiveTab(tabEl); });
  });

  window.addEventListener('resize', function () {
    var active = tabnav.querySelector('.proj-tab.is-active');
    if (active) positionIndicator(active, false);
  });

  viewBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.classList.contains('is-active')) return;
      viewBtns.forEach(function (b) {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');
      currentView = btn.dataset.view;
      viewSwitchEl.setAttribute('data-view', currentView);
      if (currentView !== 'list') deactivatePreview();
      renderList();
    });
  });

  /* sticky "stuck" background state, driven off the static sentinel */
  ScrollTrigger.create({
    trigger: sentinel,
    start: 'top ' + NAV_LINE + 'px',
    end: 99999,
    toggleClass: { targets: tabnavWrap, className: 'is-stuck' }
  });

  /* ============================
     SELECTED WORK LIST
  ============================ */

  var PROJECTS_DATA = {
    uiux: [
      {
        title: 'Lumina',
        description: 'AI-powered design system generator.',
        year: '2024',
        link: '#',
        image: 'https://plus.unsplash.com/premium_photo-1723489242223-865b4a8cf7b8?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D$0'
      },
      {
        title: 'Flux',
        description: 'Real-time collaboration for creative teams.',
        year: '2024',
        link: '#',
        image: 'https://images.unsplash.com/photo-1530435460869-d13625c69bbf?q=80&w=2670&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D$0'
      },
      {
        title: 'Prism',
        description: 'Color palette extraction from any image.',
        year: '2023',
        link: '#',
        image: 'https://i.pinimg.com/1200x/99/ca/5c/99ca5cf82cf12df8801f7b2bef38d325.jpg'
      },
      {
        title: 'Vertex',
        description: '3D modeling toolkit for the web.',
        year: '2023',
        link: '#',
        image: 'https://i.pinimg.com/736x/7c/15/39/7c1539cf7ff0207cb49ce0d338de1e5f.jpg'
      }
    ],
    product: [],
    image: [],
    ads: [],
    video: []
  };

  function buildGridItem(item) {
    var a = document.createElement('a');
    a.className = 'proj-grid-item';
    a.href = item.link;

    var img = document.createElement('img');
    img.src = item.image;
    img.alt = item.title;
    img.loading = 'lazy';
    a.appendChild(img);

    var overlay = document.createElement('div');
    overlay.className = 'proj-grid-overlay';

    var inner = document.createElement('div');
    inner.className = 'proj-grid-overlay-inner';

    var titleRow = document.createElement('div');
    titleRow.className = 'proj-grid-title-row';

    var titleLeft = document.createElement('span');
    titleLeft.style.display = 'flex';
    titleLeft.style.alignItems = 'center';
    titleLeft.style.gap = '8px';

    var title = document.createElement('span');
    title.className = 'proj-grid-title';
    title.textContent = item.title;

    var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'proj-grid-arrow');
    arrow.setAttribute('width', '16');
    arrow.setAttribute('height', '16');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('fill', 'none');
    arrow.innerHTML = '<path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

    titleLeft.appendChild(title);
    titleLeft.appendChild(arrow);

    var year = document.createElement('span');
    year.className = 'proj-grid-year';
    year.textContent = item.year;

    titleRow.appendChild(titleLeft);
    titleRow.appendChild(year);

    var desc = document.createElement('p');
    desc.className = 'proj-grid-desc';
    desc.textContent = item.description;

    inner.appendChild(titleRow);
    inner.appendChild(desc);
    overlay.appendChild(inner);
    a.appendChild(overlay);

    return a;
  }

  function buildListItem(item) {
    var a = document.createElement('a');
    a.className = 'proj-list-item';
    a.href = item.link;

    var bg = document.createElement('div');
    bg.className = 'proj-list-item-bg';
    a.appendChild(bg);

    var inner = document.createElement('div');
    inner.className = 'proj-list-item-inner';

    var main = document.createElement('div');
    main.className = 'proj-list-item-main';

    var titleRow = document.createElement('span');
    titleRow.className = 'proj-list-title-row';

    var title = document.createElement('span');
    title.className = 'proj-list-title';
    title.textContent = item.title;
    var underline = document.createElement('span');
    underline.className = 'proj-list-title-underline';
    title.appendChild(underline);

    var arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'proj-list-arrow');
    arrow.setAttribute('width', '18');
    arrow.setAttribute('height', '18');
    arrow.setAttribute('viewBox', '0 0 24 24');
    arrow.setAttribute('fill', 'none');
    arrow.innerHTML = '<path d="M7 17L17 7M9 7h8v8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>';

    titleRow.appendChild(title);
    titleRow.appendChild(arrow);

    var desc = document.createElement('p');
    desc.className = 'proj-list-desc';
    desc.textContent = item.description;

    main.appendChild(titleRow);
    main.appendChild(desc);

    var year = document.createElement('span');
    year.className = 'proj-list-year';
    year.textContent = item.year;

    inner.appendChild(main);
    inner.appendChild(year);
    a.appendChild(inner);

    a.addEventListener('mouseenter', function () { activatePreview(item.image); });
    a.addEventListener('mouseleave', deactivatePreview);

    return a;
  }

  function renderList() {
    var items = PROJECTS_DATA[currentTab] || [];
    listEl.innerHTML = '';
    listEl.classList.toggle('is-grid', currentView === 'grid');

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'proj-list-empty';
      empty.textContent = 'Bald verfügbar';
      listEl.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      listEl.appendChild(currentView === 'grid' ? buildGridItem(item) : buildListItem(item));
    });
  }

  /* ── cursor-follow preview image ── */
  var mouse  = { x: 0, y: 0 };
  var smooth = { x: 0, y: 0 };

  window.addEventListener('mousemove', function (e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function animatePreview() {
    smooth.x += (mouse.x - smooth.x) * 0.15;
    smooth.y += (mouse.y - smooth.y) * 0.15;
    previewEl.style.transform = 'translate3d(' + (smooth.x + 24) + 'px,' + (smooth.y - 100) + 'px,0)';
    requestAnimationFrame(animatePreview);
  }
  requestAnimationFrame(animatePreview);

  function activatePreview(src) {
    if (previewImgEl.getAttribute('src') !== src) {
      previewImgEl.classList.remove('is-active');
      previewImgEl.src = src;
    }
    requestAnimationFrame(function () { previewImgEl.classList.add('is-active'); });
    previewEl.classList.add('is-visible');
  }

  function deactivatePreview() {
    previewEl.classList.remove('is-visible');
  }

  /* ── init ── */
  positionIndicator(document.querySelector('.proj-tab.is-active'), false);
  renderList();

});