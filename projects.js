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

  /* ── Hero reveal ── */
  var tl = gsap.timeline({ delay: 0.1 });
  tl.to('#heroLine1', { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.15)
    .to('#heroLine2', { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.28);

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

  function positionIndicator(tabEl, animated) {
    var navRect  = tabnav.getBoundingClientRect();
    var tabRect  = tabEl.getBoundingClientRect();
    var newLeft  = tabRect.left - navRect.left;
    var newWidth = tabRect.width;

    if (!animated) {
      gsap.set(indicator, { left: newLeft, width: newWidth });
      return;
    }

    var curLeft  = gsap.getProperty(indicator, 'left');
    var curWidth = gsap.getProperty(indicator, 'width');
    var unionLeft  = Math.min(curLeft, newLeft);
    var unionRight = Math.max(curLeft + curWidth, newLeft + newWidth);

    var stl = gsap.timeline();
    stl.to(indicator, { left: unionLeft, width: unionRight - unionLeft, duration: 0.3, ease: 'power2.out' })
       .to(indicator, { left: newLeft, width: newWidth, duration: 0.4, ease: 'power3.inOut' });
  }

  function setActiveTab(tabEl) {
    tabs.forEach(function (t) { t.classList.remove('is-active'); });
    tabEl.classList.add('is-active');
    positionIndicator(tabEl, true);
    renderBento(tabEl.dataset.tab);
  }

  tabs.forEach(function (tabEl) {
    tabEl.addEventListener('click', function () { setActiveTab(tabEl); });
  });

  window.addEventListener('resize', function () {
    var active = tabnav.querySelector('.proj-tab.is-active');
    if (active) positionIndicator(active, false);
  });

  /* sticky "stuck" background state, driven off the static sentinel */
  ScrollTrigger.create({
    trigger: sentinel,
    start: 'top ' + NAV_LINE + 'px',
    end: 99999,
    toggleClass: { targets: tabnavWrap, className: 'is-stuck' }
  });

  /* ============================
     BENTO GRID + SCROLL SLIDER
  ============================ */

  var BENTO_DATA = {
    uiux: [
      { size: 'lg', items: [
        { src: 'https://picsum.photos/700/900?random=201', alt: 'SaaS Dashboard', label: 'SaaS Dashboard' }
      ]},
      { size: 'md', items: [
        { src: 'https://picsum.photos/640/440?random=202', alt: 'Onboarding Flow', label: 'Onboarding Flow' },
        { src: 'https://picsum.photos/640/440?random=203', alt: 'Settings UI', label: 'Settings UI' }
      ]},
      { size: 'xl', items: [
        { src: 'https://picsum.photos/900/700?random=204', alt: 'E-Commerce Redesign', label: 'E-Commerce Redesign' }
      ]},
      { size: 'sm', items: [
        { src: 'https://picsum.photos/420/900?random=205', alt: 'Iconography', label: 'Iconography' }
      ]},
      { size: 'md', items: [
        { src: 'https://picsum.photos/640/440?random=206', alt: 'Auth Flow', label: 'Auth Flow' },
        { src: 'https://picsum.photos/640/440?random=207', alt: 'Profile UI', label: 'Profile UI' }
      ]},
      { size: 'lg', items: [
        { src: 'https://picsum.photos/700/900?random=208', alt: 'Analytics Suite', label: 'Analytics Suite' }
      ]},
      { size: 'sm', items: [
        { src: 'https://picsum.photos/420/900?random=209', alt: 'Component Library', label: 'Component Library' }
      ]}
    ],
    product: [],
    image: [],
    ads: [],
    video: []
  };

  var bentoGrid    = document.getElementById('bentoGrid');
  var sliderTrack  = document.getElementById('bentoSliderTrack');
  var sliderThumb  = document.getElementById('bentoSliderThumb');
  var arrowLeft    = document.getElementById('bentoArrowLeft');
  var arrowRight   = document.getElementById('bentoArrowRight');

  function buildBentoColumn(col) {
    var colEl = document.createElement('div');
    colEl.className = 'bento-col bento-col--' + col.size;

    col.items.forEach(function (item) {
      var itemEl = document.createElement('div');
      itemEl.className = 'bento-item';

      var img = document.createElement('img');
      img.src = item.src;
      img.alt = item.alt || '';
      img.loading = 'lazy';
      img.addEventListener('load', scheduleThumbUpdate);
      itemEl.appendChild(img);

      if (item.label) {
        var labelEl = document.createElement('div');
        labelEl.className = 'bento-item-label';
        var span = document.createElement('span');
        span.textContent = item.label;
        labelEl.appendChild(span);
        itemEl.appendChild(labelEl);
      }

      colEl.appendChild(itemEl);
    });

    return colEl;
  }

  function renderBento(tabId) {
    var cols = BENTO_DATA[tabId] || [];
    bentoGrid.innerHTML = '';
    bentoGrid.scrollLeft = 0;

    if (!cols.length) {
      var empty = document.createElement('div');
      empty.className = 'bento-empty';
      empty.textContent = 'Bald verfügbar';
      bentoGrid.appendChild(empty);
    } else {
      cols.forEach(function (col) {
        bentoGrid.appendChild(buildBentoColumn(col));
      });
    }

    scheduleThumbUpdate();
  }

  /* ── Slider thumb sizing / positioning ── */
  var thumbUpdateRaf = null;
  function scheduleThumbUpdate() {
    if (thumbUpdateRaf) cancelAnimationFrame(thumbUpdateRaf);
    thumbUpdateRaf = requestAnimationFrame(updateThumbSize);
  }

  function maxScroll() {
    return Math.max(0, bentoGrid.scrollWidth - bentoGrid.clientWidth);
  }

  function updateThumbSize() {
    var trackWidth = sliderTrack.clientWidth;
    var visibleRatio = bentoGrid.clientWidth / Math.max(bentoGrid.scrollWidth, 1);
    visibleRatio = Math.min(1, visibleRatio);
    var thumbWidth = Math.max(32, trackWidth * visibleRatio);
    sliderThumb.style.width = thumbWidth + 'px';
    updateThumbPosition();
    updateArrowStates();
  }

  function updateThumbPosition() {
    var trackWidth   = sliderTrack.clientWidth;
    var thumbWidth   = sliderThumb.offsetWidth;
    var maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
    var max          = maxScroll();
    var ratio        = max > 0 ? (bentoGrid.scrollLeft / max) : 0;
    sliderThumb.style.left = (ratio * maxThumbLeft) + 'px';
  }

  function updateArrowStates() {
    var max = maxScroll();
    arrowLeft.disabled  = bentoGrid.scrollLeft <= 1;
    arrowRight.disabled = bentoGrid.scrollLeft >= max - 1 || max <= 0;
  }

  /* grid scroll → thumb */
  bentoGrid.addEventListener('scroll', function () {
    requestAnimationFrame(updateThumbPosition);
    requestAnimationFrame(updateArrowStates);
  });

  /* mouse wheel → horizontal scroll (only redirected while there is room to scroll) */
  bentoGrid.addEventListener('wheel', function (e) {
    var max = maxScroll();
    if (max <= 0) return;

    var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    var atStart = bentoGrid.scrollLeft <= 0;
    var atEnd   = bentoGrid.scrollLeft >= max - 1;

    if ((atStart && delta < 0) || (atEnd && delta > 0)) return; /* let the page scroll instead */

    e.preventDefault();
    e.stopPropagation();
    bentoGrid.scrollLeft += delta;
  }, { passive: false });

  /* ── drag-to-scroll directly on the grid ── */
  var gridDrag = { active: false, startX: 0, startScroll: 0 };
  bentoGrid.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.bento-item')) { /* still allow drag from image area */ }
    gridDrag.active = true;
    gridDrag.startX = e.clientX;
    gridDrag.startScroll = bentoGrid.scrollLeft;
    bentoGrid.classList.add('is-dragging-scroll');
    bentoGrid.setPointerCapture(e.pointerId);
  });
  bentoGrid.addEventListener('pointermove', function (e) {
    if (!gridDrag.active) return;
    bentoGrid.scrollLeft = gridDrag.startScroll - (e.clientX - gridDrag.startX);
  });
  function endGridDrag(e) {
    gridDrag.active = false;
    bentoGrid.classList.remove('is-dragging-scroll');
  }
  bentoGrid.addEventListener('pointerup', endGridDrag);
  bentoGrid.addEventListener('pointercancel', endGridDrag);

  /* ── slider thumb drag ── */
  var thumbDrag = { active: false, startX: 0, startLeft: 0 };

  sliderThumb.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    thumbDrag.active = true;
    thumbDrag.startX = e.clientX;
    thumbDrag.startLeft = sliderThumb.offsetLeft;
    sliderThumb.setPointerCapture(e.pointerId);
  });

  sliderThumb.addEventListener('pointermove', function (e) {
    if (!thumbDrag.active) return;
    var trackWidth   = sliderTrack.clientWidth;
    var thumbWidth   = sliderThumb.offsetWidth;
    var maxThumbLeft = Math.max(0, trackWidth - thumbWidth);
    var newLeft      = thumbDrag.startLeft + (e.clientX - thumbDrag.startX);
    newLeft = Math.max(0, Math.min(maxThumbLeft, newLeft));

    sliderThumb.style.left = newLeft + 'px';
    var ratio = maxThumbLeft > 0 ? newLeft / maxThumbLeft : 0;
    bentoGrid.scrollLeft = ratio * maxScroll();
  });

  function endThumbDrag() { thumbDrag.active = false; }
  sliderThumb.addEventListener('pointerup', endThumbDrag);
  sliderThumb.addEventListener('pointercancel', endThumbDrag);

  /* ── click on track jumps to that position ── */
  sliderTrack.addEventListener('pointerdown', function (e) {
    if (e.target === sliderThumb) return;
    var rect       = sliderTrack.getBoundingClientRect();
    var thumbWidth = sliderThumb.offsetWidth;
    var clickX     = e.clientX - rect.left - (thumbWidth / 2);
    var maxThumbLeft = Math.max(0, rect.width - thumbWidth);
    clickX = Math.max(0, Math.min(maxThumbLeft, clickX));

    sliderThumb.style.left = clickX + 'px';
    var ratio = maxThumbLeft > 0 ? clickX / maxThumbLeft : 0;
    bentoGrid.scrollTo({ left: ratio * maxScroll(), behavior: 'smooth' });
  });

  /* ── arrow buttons ── */
  function scrollByColumn(dir) {
    var firstCol = bentoGrid.querySelector('.bento-col');
    var step = firstCol ? firstCol.offsetWidth + 12 : bentoGrid.clientWidth * 0.5;
    bentoGrid.scrollBy({ left: dir * step, behavior: 'smooth' });
  }
  arrowLeft.addEventListener('click', function () { scrollByColumn(-1); });
  arrowRight.addEventListener('click', function () { scrollByColumn(1); });

  /* ── keep slider correct on resize / layout shifts ── */
  window.addEventListener('resize', scheduleThumbUpdate);
  if (window.ResizeObserver) {
    new ResizeObserver(scheduleThumbUpdate).observe(bentoGrid);
  }

  /* ── init ── */
  positionIndicator(document.querySelector('.proj-tab.is-active'), false);
  renderBento(document.querySelector('.proj-tab.is-active').dataset.tab);

});