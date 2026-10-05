(function () {
  function init() {
    var navbar = document.querySelector('.navbar-inner');
    var navLinks = document.querySelector('.navbar-links');
    if (!navbar || !navLinks) return;

    var style = document.createElement('style');
    style.textContent = [
      '.mobile-menu-btn{display:none;background:none;border:none;cursor:pointer;padding:8px;flex-direction:column;gap:5px;margin-left:auto;}',
      '.mobile-menu-btn span{display:block;width:24px;height:2px;background:#fff;transition:all 0.2s;border-radius:2px;}',
      '@media(max-width:768px){',
      '.mobile-menu-btn{display:flex;}',
      '.navbar-links.mob-open{display:flex!important;flex-direction:column;position:absolute;top:64px;left:0;right:0;background:#111827;padding:12px 16px 20px;gap:4px;z-index:999;box-shadow:0 8px 32px rgba(0,0,0,0.4);}',
      '.navbar-links.mob-open li{width:100%;}',
      '.navbar-links.mob-open a{display:block;padding:12px 16px;width:100%;border-radius:8px;}',
      '.navbar-links.mob-open .navbar-cta{margin-left:0;margin-top:8px;}',
      '}',
      '.mobile-menu-btn.is-open span:nth-child(1){transform:rotate(45deg) translate(5px,5px);}',
      '.mobile-menu-btn.is-open span:nth-child(2){opacity:0;}',
      '.mobile-menu-btn.is-open span:nth-child(3){transform:rotate(-45deg) translate(5px,-5px);}'
    ].join('');
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.className = 'mobile-menu-btn';
    btn.setAttribute('aria-label', 'Open navigation menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML = '<span></span><span></span><span></span>';
    navbar.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = navLinks.classList.toggle('mob-open');
      btn.classList.toggle('is-open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
      btn.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
    });

    document.addEventListener('click', function (e) {
      if (!navbar.contains(e.target)) {
        navLinks.classList.remove('mob-open');
        btn.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open navigation menu');
      }
    });

    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navLinks.classList.remove('mob-open');
        btn.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
        btn.setAttribute('aria-label', 'Open navigation menu');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
