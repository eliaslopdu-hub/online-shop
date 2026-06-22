/* Premium interaction layer — page-wipe transitions + a bespoke cursor.
   Pure vanilla, no dependencies. Degrades gracefully (reduced-motion, touch). */
(function () {
  var root = document.documentElement;
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

  /* ---- Bespoke cursor (fine pointers only) -------------------------------- */
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduce) {
    root.classList.add('udara-cursor-on');
    var dot = document.createElement('div');  dot.className = 'udara-cursor';
    var ring = document.createElement('div'); ring.className = 'udara-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, active = false;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      if (!active) { active = true; root.classList.add('udara-cursor-active'); }
    });
    document.addEventListener('mouseleave', function () {
      root.classList.remove('udara-cursor-active'); active = false;
    });

    var hoverSel = 'a, button, .udara-card__open, [role="button"]';
    document.addEventListener('mouseover', function (e) {
      if (e.target.closest && e.target.closest(hoverSel)) root.classList.add('udara-cursor-hover');
    });
    document.addEventListener('mouseout', function (e) {
      var from = e.target.closest && e.target.closest(hoverSel);
      var to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(hoverSel);
      if (from && !to) root.classList.remove('udara-cursor-hover');
    });

    (function loop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();
  }
})();
