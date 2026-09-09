// canon.js — scroll-state chrome only (recreation-procedure § Fixed and sticky chrome).
// Live: the anchor nav (.table-of-contents-product-layout) switches to position:fixed;top:<nav height>
// once its natural top scrolls under the pinned site nav, and its wrapper (.tableOfContents) keeps a
// 42px min-height placeholder — so the document shrinks 12px in the pinned state. Mirrored 1:1.
(function () {
  var wrap = document.querySelector('.tableOfContents');
  var toc = wrap && wrap.querySelector('.toc');
  var nav = document.querySelector('header.topNav');
  if (!wrap || !toc || !nav) return;
  function update() {
    var navH = nav.getBoundingClientRect().height;
    var fixed = window.scrollY >= wrap.offsetTop - navH;
    toc.classList.toggle('is-fixed', fixed);
    toc.style.top = fixed ? navH + 'px' : '';
  }
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

// Carousel controls — live widget (slick) responds to arrows and dots; interaction parity requires a
// working control set. Implemented: prev/next step by the visible slot count, dots jump by page.
(function () {
  document.querySelectorAll('.carousel').forEach(function (c) {
    var track = c.querySelector('.slick-track'); var cards = c.querySelectorAll('.card');
    var real = c.querySelectorAll('.card:not(.slick-cloned)').length; var dots = c.querySelectorAll('.slick-dots li');
    if (!track || !real) return;
    var lead = 0; for (var i = 0; i < cards.length; i++) { if (cards[i].classList.contains('slick-cloned')) lead++; else break; }
    var page = 0;
    function slot() { var r = cards[0].getBoundingClientRect(); return r.width + 10; }
    function per() { return window.innerWidth <= 729 ? 1 : 3; }
    function pages() { return Math.ceil(real / per()); }
    function render() {
      var idx = lead + page * per();
      track.style.transition = 'transform .5s ease';
      track.style.transform = 'translate3d(' + (-idx * slot()) + 'px,0,0)';
      dots.forEach(function (d, i) { d.classList.toggle('active', i === page); });
    }
    c.querySelector('.slick-arrow.next') && c.querySelector('.slick-arrow.next').addEventListener('click', function () { page = (page + 1) % pages(); render(); });
    c.querySelector('.slick-arrow.prev') && c.querySelector('.slick-arrow.prev').addEventListener('click', function () { page = (page - 1 + pages()) % pages(); render(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { page = Math.min(i, pages() - 1); render(); }); });
  });
})();
