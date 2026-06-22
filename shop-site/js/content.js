/* =============================================================================
   content.js — interactions for the 2D experience (story + products).
   Plain script (no module), scoped, no global leaks via an IIFE.
   Reveals sections on scroll with a graceful, reduced-motion-aware fallback.
   ========================================================================== */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- Fixed boutique menu (three-line toggle, top-right) ---------------- */
  const menuToggle = document.getElementById('udara-menu-toggle');
  const menu = document.getElementById('udara-menu');
  if (menuToggle && menu) {
    const menuLinks = Array.prototype.slice.call(menu.querySelectorAll('a'));
    const setMenu = function (open) {
      menuToggle.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      // inert removes the hidden links from the tab order AND the a11y tree, so
      // keyboard/screen-reader users can't land on the invisible overlay.
      if (open) {
        menu.removeAttribute('inert');
        // Move focus into the menu so keyboard users start inside the overlay.
        if (menuLinks[0]) menuLinks[0].focus();
      } else {
        // Return focus to the toggle only if it currently sits inside the menu,
        // so a link-driven scroll doesn't yank focus unexpectedly.
        if (menu.contains(document.activeElement)) menuToggle.focus();
        menu.setAttribute('inert', '');
      }
    };
    menuToggle.addEventListener('click', function () {
      setMenu(!menu.classList.contains('is-open'));
    });
    // Trap Tab within the open overlay (wrap first <-> last link).
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menu.classList.contains('is-open') || !menuLinks.length) return;
      const first = menuLinks[0];
      const last = menuLinks[menuLinks.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    // Click a link → smooth-scroll to the section and close; click backdrop → close.
    menu.addEventListener('click', function (e) {
      const link = e.target.closest('a');
      if (link) {
        const sel = link.getAttribute('href');
        const target = sel && sel.charAt(0) === '#' ? document.querySelector(sel) : null;
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
        setMenu(false);
      } else if (e.target === menu) {
        setMenu(false);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setMenu(false);
    });
  }

  /* --- Boutique CTAs → WhatsApp enquiry ---------------------------------- */
  // The boutique WhatsApp number + button label now live in js/config.js
  // (window.UDARA_CONFIG) so the homepage and the product pages share one source.
  // An empty number keeps the Enquire buttons inert (they will NOT 404).
  const UDARA_WHATSAPP      = (window.UDARA_CONFIG && window.UDARA_CONFIG.whatsapp) || '';
  const UDARA_ENQUIRE_LABEL = (window.UDARA_CONFIG && window.UDARA_CONFIG.enquireLabel) || 'Enquire on WhatsApp';

  (function wireEnquiry() {
    const ctas = Array.prototype.slice.call(
      document.querySelectorAll('a[href^="[PAYMENT_LINK"]')
    );
    if (!ctas.length) return;
    const phone = UDARA_WHATSAPP.replace(/\D/g, '');

    ctas.forEach(function (a) {
      // Build a pre-filled message naming the product / category in context.
      const card = a.closest('.udara-card');
      let nameEl = card && card.querySelector('.udara-card__name');
      if (!nameEl) {
        // Only resolve a real product name; never fall back to a section heading
        // (e.g. "Strike a few. Close your eyes.") — a non-product CTA should use
        // the generic boutique message below.
        const block = a.closest('.udara-prose, .udara-sec');
        nameEl = block && block.querySelector('.udara-card__name');
      }
      const name = (nameEl && nameEl.textContent.trim()) || 'the Udara boutique collection';
      const msg = 'Hello Udara, I would like to enquire about ' + name + '.';

      if (phone) {
        a.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = UDARA_ENQUIRE_LABEL;
        a.setAttribute('aria-label', 'Enquire about ' + name + ' on WhatsApp');
      } else {
        // No number yet → neutralise the placeholder so nothing navigates to it.
        a.setAttribute('role', 'button');
        a.setAttribute('aria-disabled', 'true');
        a.addEventListener('click', function (e) { e.preventDefault(); });
      }
    });
  })();

  const reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  if (!reveals.length) return;

  // No IntersectionObserver, or reduced motion → just show everything.
  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }

  const io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        io.unobserve(entry.target); // reveal once, then stop watching
      }
    });
  }, { threshold: 0.04, rootMargin: '0px 0px -2% 0px' });

  // Reveal as soon as a section touches the viewport — so the first text is
  // already present the instant the fork dissolves, with no late fade-in.
  reveals.forEach(function (el) { io.observe(el); });

  // Safety: reveal the opening section immediately if it's already near the top.
  const first = document.querySelector('.udara-sec--story');
  if (first) first.classList.add('in-view');
})();
