/* ============================
   CV PAGE v7 — Jacob Weissenbäck
============================ */

window.addEventListener('DOMContentLoaded', function () {

  /* ── Lenis smooth scroll ── */
  var lenis = new Lenis({ lerp: 0.08, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(function(time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* ── Hero reveal ── */
  var tl = gsap.timeline({ delay: 0.1 });
  tl.to('#heroLine1', { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.15)
    .to('#heroLine2', { y: '0%', duration: 0.85, ease: 'power4.out' }, 0.28);

  /* ── Stacked Cards — scale on scroll ── */
  var container = document.getElementById('cvCardStack');
  var cards     = gsap.utils.toArray('.cv-card');
  var N         = cards.length;

  cards.forEach(function(card, i) {
    card.style.zIndex   = 10 + i;
    card.style.position = 'relative';
    card.style.top      = 'calc(-4vh + ' + (i * 28) + 'px)';
  });

  function getProgress() {
    var rect    = container.getBoundingClientRect();
    var total   = container.offsetHeight - window.innerHeight;
    var scrolled = -rect.top;
    return Math.max(0, Math.min(1, scrolled / total));
  }

  function mapRange(p, a, b, from, to) {
    var t = Math.max(0, Math.min(1, (p - a) / (b - a)));
    t = 1 - Math.pow(1 - t, 3);
    return from + (to - from) * t;
  }

  function updateCards() {
    var p = getProgress();
    cards.forEach(function(card, i) {
      var targetScale = 1 - (N - i) * 0.05;
      var scale = mapRange(p, i / N, 1, 1, targetScale);
      gsap.set(card, { scale: scale });
    });
  }

  ScrollTrigger.create({
    trigger: container,
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: updateCards,
  });
  updateCards();

  /* ── Image clip-path reveal ── */
  cards.forEach(function(card) {
    var imgs = card.querySelectorAll('.cv-img-reveal');
    imgs.forEach(function(img, idx) {
      ScrollTrigger.create({
        trigger: card,
        start: 'top 80%',
        onEnter: function() {
          gsap.delayedCall(idx * 0.12, function() {
            img.classList.add('is-revealed');
          });
        },
        once: true,
      });
    });
  });

  /* ── Card text reveal ── */
  cards.forEach(function(card) {
    var title = card.querySelector('.cv-card-title');
    var body  = card.querySelector('.cv-cap-body--left');
    gsap.set([title, body], { opacity: 0, y: 24 });
    ScrollTrigger.create({
      trigger: card,
      start: 'top 75%',
      onEnter: function() {
        gsap.to(title, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.05 });
        gsap.to(body,  { opacity: 1, y: 0, duration: 0.65, ease: 'power3.out', delay: 0.18 });
      },
      once: true,
    });
  });

  /* ── Nav buttons hide / Between-strip reveal at footer ── */
  var navBack     = document.getElementById('navBack');
  var navDownload = document.getElementById('navDownload');
  var strip       = document.getElementById('cvNavStrip');

  ScrollTrigger.create({
    trigger: '#cvFooter',
    start: 'top 95%',
    onEnter: function() {
      /* hide nav buttons */
      gsap.to([navBack, navDownload], { opacity: 0, duration: 0.35, ease: 'power2.in', pointerEvents: 'none' });
      /* reveal between-strip */
      gsap.to(strip, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: 0.1 });
    },
    onLeaveBack: function() {
      /* restore nav buttons */
      gsap.to([navBack, navDownload], { opacity: 1, duration: 0.35, ease: 'power2.out', pointerEvents: 'all' });
      /* hide between-strip */
      gsap.to(strip, { opacity: 0, duration: 0.3, ease: 'power2.in' });
    },
  });

  /* initial state for strip */
  gsap.set(strip, { opacity: 0, y: 8 });

  /* ── Footer animations ── */
  gsap.to('.cv-footer-label', {
    scrollTrigger: { trigger: '.cv-footer', start: 'top 80%' },
    opacity: 1, y: 0, duration: 0.9, ease: 'power4.out',
  });
  gsap.to('.cv-footer-cta', {
    scrollTrigger: { trigger: '.cv-footer', start: 'top 75%' },
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', delay: 0.15,
  });
  gsap.to('.cv-footer-divider', {
    scrollTrigger: { trigger: '.cv-footer-divider', start: 'top 90%' },
    scaleX: 1, duration: 1.1, ease: 'power4.inOut',
  });
  gsap.to('.cv-footer-bottom', {
    scrollTrigger: { trigger: '.cv-footer-bottom', start: 'top 90%' },
    opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
  });

  /* ── NAV LOGO — hide during cards ── */
  var logoName = document.querySelector('.nav-logo-box');
  var logoSub  = document.querySelector('.nav-logo-sub');
  var mainEl   = document.getElementById('cvCardStack');
  if (logoName && logoSub && mainEl) {
    function onLogoScroll() {
      var rect   = mainEl.getBoundingClientRect();
      var active = rect.top <= 80 && rect.bottom > 80;
      gsap.to([logoName, logoSub], { opacity: active ? 0 : 1, duration: 0.4, ease: 'power2.out' });
    }
    ScrollTrigger.create({ onUpdate: onLogoScroll });
    onLogoScroll();
  }

});