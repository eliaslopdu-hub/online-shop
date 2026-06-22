/* Premium interaction layer — page-wipe transitions.
   Pure vanilla, no dependencies. Degrades gracefully (reduced-motion, touch). */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Page wipe ---------------------------------------------------------- */
  var wipe = document.querySelector('.udara-pagewipe');
  if (wipe && !reduce) {
    // Reveal the page: let the cream veil dissolve once we've painted.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { wipe.classList.add('is-clear'); });
    });

    // Fade out before navigating to another page (cards → product, back link).
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 ||
          e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || a.target === '_blank' || a.hasAttribute('download')) return;
      if (href.charAt(0) === '#') return;                 // in-page anchors scroll
      if (/^(https?:)?\/\//i.test(href) && a.host !== location.host) return; // external
      if (!/\.html(\?|#|$)/i.test(href)) return;          // only real page navigations
      e.preventDefault();
      wipe.classList.remove('is-clear');
      wipe.classList.add('is-leaving');
      setTimeout(function () { window.location.href = href; }, 430);
    });
  } else if (wipe) {
    wipe.classList.add('is-clear');
  }
  // Restore the veil if the page is served from the back/forward cache.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && wipe) {
      wipe.classList.remove('is-leaving');
      wipe.classList.add('is-clear');
    }
  });
})();
