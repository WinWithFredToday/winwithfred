/**
 * WinWithFred — Mobile Navigation + Legal Footer Links
 * Auto-injects a hamburger menu and legal links into every page.
 * Include this script on every page before </body>.
 */
(function () {
  'use strict';

  /* ── Inject CSS ─────────────────────────────────────────────── */
  const css = `
    .hamburger {
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      width: 40px;
      height: 40px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 8px;
      transition: background 0.15s;
      flex-shrink: 0;
      margin-left: 8px;
    }
    .hamburger:hover { background: rgba(255,255,255,0.1); }
    .hamburger span {
      display: block;
      width: 22px;
      height: 2px;
      background: #ffffff;
      border-radius: 2px;
      transition: all 0.25s ease;
    }
    .hamburger.open span:nth-child(1) {
      transform: translateY(7px) rotate(45deg);
    }
    .hamburger.open span:nth-child(2) {
      opacity: 0;
      transform: scaleX(0);
    }
    .hamburger.open span:nth-child(3) {
      transform: translateY(-7px) rotate(-45deg);
    }

    @media (max-width: 768px) {
      .hamburger { display: flex; }

      .navbar-links {
        display: none !important;
        position: absolute;
        top: 64px;
        left: 0;
        right: 0;
        background: #111827;
        flex-direction: column;
        align-items: stretch;
        gap: 0;
        padding: 8px 0 16px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        z-index: 99;
        list-style: none;
      }
      .navbar-links.mobile-open {
        display: flex !important;
      }
      .navbar-links li { margin: 0; }
      .navbar-links a {
        display: block !important;
        padding: 13px 24px !important;
        border-radius: 0 !important;
        font-size: 1rem !important;
      }
      .navbar-links .navbar-cta {
        padding: 12px 24px 4px;
      }
      .navbar-links .navbar-cta .btn {
        width: 100%;
        text-align: center;
        display: block;
      }
      .navbar-links .navbar-cta .nav-user {
        padding: 4px 0;
      }
      .navbar {
        position: sticky;
        top: 0;
      }
    }

    /* Legal footer bar */
    .wwf-legal-bar {
      max-width: 1120px;
      margin: 0 auto;
      padding: 12px 24px;
      display: flex;
      gap: 20px;
      justify-content: center;
      flex-wrap: wrap;
      border-top: 1px solid rgba(255,255,255,0.08);
    }
    .wwf-legal-bar a {
      color: #6b7280;
      font-size: 0.82rem;
      text-decoration: none;
      transition: color 0.15s;
    }
    .wwf-legal-bar a:hover { color: #f97316; }
  `;

  const styleEl = document.createElement('style');
  styleEl.id = 'wwf-mobile-nav-styles';
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Init on DOM ready ──────────────────────────────────────── */
  function init() {
    initHamburger();
    injectLegalLinks();
  }

  /* ── Hamburger Menu ─────────────────────────────────────────── */
  function initHamburger() {
    const navbarInner = document.querySelector('.navbar-inner');
    if (!navbarInner) return;
    if (navbarInner.querySelector('.hamburger')) return; // already injected

    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.setAttribute('aria-label', 'Toggle navigation menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    navbarInner.appendChild(btn);

    const navLinks = navbarInner.querySelector('.navbar-links');
    if (!navLinks) return;

    function openMenu() {
      navLinks.classList.add('mobile-open');
      btn.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      navLinks.classList.remove('mobile-open');
      btn.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      navLinks.classList.contains('mobile-open') ? closeMenu() : openMenu();
    });

    // Close on any link click inside menu
    navLinks.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!navbarInner.contains(e.target)) closeMenu();
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* ── Legal Footer Links ─────────────────────────────────────── */
  function injectLegalLinks() {
    // Don't inject on the legal pages themselves (they already have full footers)
    var path = window.location.pathname;
    var page = path.split('/').pop();
    if (page === 'terms.html' || page === 'privacy.html' || page === 'disclaimer.html') return;

    var footer = document.querySelector('footer');
    if (!footer) return;
    if (footer.querySelector('.wwf-legal-bar')) return; // already injected

    var bar = document.createElement('div');
    bar.className = 'wwf-legal-bar';
    bar.innerHTML =
      '<a href="terms.html">Terms of Service</a>' +
      '<a href="privacy.html">Privacy Policy</a>' +
      '<a href="disclaimer.html">Disclaimer</a>' +
      '<span style="color:#4b5563;font-size:0.82rem;">For entertainment &amp; informational purposes only.</span>';
    footer.appendChild(bar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
