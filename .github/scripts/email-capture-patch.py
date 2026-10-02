#!/usr/bin/env python3
"""
GEO: Add floating email bar + exit-intent popup + _next redirect to all blog posts.
- Adds sticky bottom floating bar (dismiss-able, remembers state)
- Adds exit-intent popup (mouse-leave trigger)
- Adds _next hidden field to existing capture forms → /thank-you
- Upgrades form submit to fetch() with loading state + redirect
- Only patches blog-*.html files that haven't been patched yet
"""

import os, re, subprocess

MARKER = 'wf-email-capture-v2'

# ── Shared CSS for both components ────────────────────────────────────────────
SHARED_CSS = """
<style id="wf-email-capture-v2">
/* ── Floating Email Bar ───────────────────────────────────────────────────── */
#wf-float-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #111827;
  border-top: 3px solid #f97316;
  padding: 14px 24px;
  z-index: 9000;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  transform: translateY(100%);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 -4px 24px rgba(0,0,0,0.35);
}
#wf-float-bar.visible { transform: translateY(0); }
#wf-float-bar .wf-fb-text {
  color: #fff;
  font-weight: 700;
  font-size: 0.97rem;
  flex: 0 0 auto;
  white-space: nowrap;
}
#wf-float-bar .wf-fb-text span { color: #f97316; }
#wf-float-bar form {
  display: flex;
  gap: 8px;
  flex: 1;
  min-width: 260px;
  align-items: center;
}
#wf-float-bar input[type=email] {
  flex: 1;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.95rem;
  font-family: inherit;
  outline: none;
  min-width: 0;
}
#wf-float-bar button[type=submit] {
  padding: 10px 20px;
  background: #f97316;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.93rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  font-family: inherit;
  transition: background 0.2s;
  flex-shrink: 0;
}
#wf-float-bar button[type=submit]:hover { background: #ea6c0a; }
#wf-float-bar .wf-fb-close {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
  flex-shrink: 0;
  transition: color 0.15s;
}
#wf-float-bar .wf-fb-close:hover { color: #fff; }
@media (max-width: 600px) {
  #wf-float-bar { flex-direction: column; align-items: stretch; gap: 10px; padding: 16px; }
  #wf-float-bar .wf-fb-text { font-size: 0.9rem; white-space: normal; }
  #wf-float-bar form { min-width: unset; }
}

/* ── Exit-Intent Popup ────────────────────────────────────────────────────── */
#wf-exit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}
#wf-exit-overlay.open {
  opacity: 1;
  pointer-events: all;
}
#wf-exit-modal {
  background: #fff;
  border-radius: 16px;
  max-width: 480px;
  width: 100%;
  overflow: hidden;
  transform: scale(0.92) translateY(16px);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}
#wf-exit-overlay.open #wf-exit-modal { transform: scale(1) translateY(0); }
.wf-exit-header {
  background: linear-gradient(135deg, #111827, #1f2937);
  padding: 32px 32px 24px;
  text-align: center;
}
.wf-exit-emoji { font-size: 2.8rem; margin-bottom: 12px; }
.wf-exit-header h3 {
  color: #fff;
  font-size: 1.35rem;
  font-weight: 800;
  margin-bottom: 8px;
  line-height: 1.3;
}
.wf-exit-header p { color: #9ca3af; font-size: 0.95rem; line-height: 1.55; }
.wf-exit-body { padding: 28px 32px 32px; }
.wf-exit-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.wf-exit-form input[type=email] {
  padding: 13px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 1rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
}
.wf-exit-form input[type=email]:focus { border-color: #f97316; }
.wf-exit-form button[type=submit] {
  padding: 14px;
  background: #f97316;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;
}
.wf-exit-form button[type=submit]:hover { background: #ea6c0a; }
.wf-exit-skip {
  text-align: center;
  margin-top: 12px;
  color: #9ca3af;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
}
.wf-exit-skip:hover { color: #6b7280; }
.wf-exit-close {
  position: absolute;
  top: 12px; right: 16px;
  background: none;
  border: none;
  color: #6b7280;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
  padding: 4px;
}
.wf-exit-close:hover { color: #fff; }
.wf-fine-print {
  color: #9ca3af;
  font-size: 0.78rem;
  text-align: center;
  margin-top: 10px;
}
@media (max-width: 480px) {
  .wf-exit-header { padding: 24px 20px 18px; }
  .wf-exit-body { padding: 20px 20px 24px; }
}
</style>
"""

# ── Floating Bar HTML ──────────────────────────────────────────────────────────
FLOAT_BAR_HTML = """
<!-- WinWithFred Floating Email Bar -->
<div id="wf-float-bar" role="complementary" aria-label="Email signup">
  <div class="wf-fb-text">📧 <span>Free reads.</span> No spam.</div>
  <form id="wf-float-form" novalidate>
    <input type="hidden" name="_next" value="https://winwithfred.com/thank-you">
    <input type="email" name="email" placeholder="Your email address" required autocomplete="email" aria-label="Email address">
    <button type="submit">Get Posts Free →</button>
  </form>
  <button class="wf-fb-close" aria-label="Close">&times;</button>
</div>
"""

# ── Exit-Intent Popup HTML ──────────────────────────────────────────────────────
EXIT_POPUP_HTML = """
<!-- WinWithFred Exit-Intent Popup -->
<div id="wf-exit-overlay" role="dialog" aria-modal="true" aria-label="Subscribe before you go">
  <div id="wf-exit-modal">
    <button class="wf-exit-close" aria-label="Close">&times;</button>
    <div class="wf-exit-header">
      <div class="wf-exit-emoji">🔥</div>
      <h3>Before you go — grab the good stuff.</h3>
      <p>Get Freddy's best posts on habits, mindset, and real growth delivered straight to your inbox. Free. No fluff.</p>
    </div>
    <div class="wf-exit-body">
      <form class="wf-exit-form" id="wf-exit-form" novalidate>
        <input type="hidden" name="_next" value="https://winwithfred.com/thank-you">
        <input type="email" name="email" placeholder="Enter your email address" required autocomplete="email" aria-label="Email address">
        <button type="submit">Yes — Send Me the Good Stuff →</button>
      </form>
      <div class="wf-exit-skip" id="wf-exit-skip">No thanks, I'm good</div>
      <p class="wf-fine-print">No spam. Unsubscribe with one click, anytime.</p>
    </div>
  </div>
</div>
"""

# ── JS for both components ──────────────────────────────────────────────────────
CAPTURE_JS = """
<script id="wf-capture-js">
(function() {
  'use strict';

  // ── Shared: get formspree endpoint from inline forms ──────────────────────
  function getFormspreeEndpoint() {
    var existing = document.querySelector('.capture-form');
    if (existing && existing.action && existing.action.indexOf('formspree.io') !== -1) {
      return existing.action;
    }
    return 'https://formspree.io/f/YOUR_FORM_ID';
  }

  // ── Shared: submit via fetch, redirect on success ────────────────────────
  function submitEmail(form, email, btn, originalText) {
    var endpoint = getFormspreeEndpoint();
    var body = new FormData();
    body.append('email', email);
    body.append('_next', 'https://winwithfred.com/thank-you');
    btn.textContent = 'Sending…';
    btn.disabled = true;
    fetch(endpoint, {
      method: 'POST',
      body: body,
      headers: { 'Accept': 'application/json' }
    }).then(function(r) {
      if (r.ok) {
        window.location.href = 'https://winwithfred.com/thank-you';
      } else {
        btn.textContent = originalText;
        btn.disabled = false;
        alert('Something went wrong. Please try again.');
      }
    }).catch(function() {
      btn.textContent = originalText;
      btn.disabled = false;
      alert('Something went wrong. Please check your connection.');
    });
  }

  // ── Also upgrade existing in-page forms ──────────────────────────────────
  function upgradeInPageForms() {
    document.querySelectorAll('.capture-form').forEach(function(form) {
      if (form.dataset.wfUpgraded) return;
      form.dataset.wfUpgraded = '1';
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type=email]');
        var btn = form.querySelector('button[type=submit]');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;
        submitEmail(form, email, btn, btn.textContent);
      });
    });
  }

  // ── Floating Bar ─────────────────────────────────────────────────────────
  function initFloatBar() {
    var bar = document.getElementById('wf-float-bar');
    if (!bar) return;

    // Don't show if dismissed this session
    if (sessionStorage.getItem('wf-bar-closed')) { bar.remove(); return; }

    var form = document.getElementById('wf-float-form');
    var closeBtn = bar.querySelector('.wf-fb-close');
    var shown = false;

    // Show after 30% scroll
    function onScroll() {
      var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      if (!shown && pct > 0.30) {
        shown = true;
        bar.classList.add('visible');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Close button
    closeBtn.addEventListener('click', function() {
      bar.classList.remove('visible');
      sessionStorage.setItem('wf-bar-closed', '1');
      setTimeout(function() { bar.remove(); }, 400);
    });

    // Form submit
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type=email]');
        var btn = form.querySelector('button[type=submit]');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;
        sessionStorage.setItem('wf-bar-closed', '1');
        sessionStorage.setItem('wf-popup-seen', '1');
        submitEmail(form, email, btn, btn.textContent);
      });
    }
  }

  // ── Exit-Intent Popup ─────────────────────────────────────────────────────
  function initExitPopup() {
    var overlay = document.getElementById('wf-exit-overlay');
    if (!overlay) return;

    // Don't show if already seen or bar was submitted
    if (sessionStorage.getItem('wf-popup-seen')) { overlay.remove(); return; }

    var modal = document.getElementById('wf-exit-modal');
    var form = document.getElementById('wf-exit-form');
    var closeBtn = overlay.querySelector('.wf-exit-close');
    var skipBtn = document.getElementById('wf-exit-skip');
    var triggered = false;

    function openPopup() {
      if (triggered) return;
      triggered = true;
      sessionStorage.setItem('wf-popup-seen', '1');
      overlay.classList.add('open');
      var emailInput = form ? form.querySelector('input[type=email]') : null;
      if (emailInput) setTimeout(function() { emailInput.focus(); }, 300);
    }

    function closePopup() {
      overlay.classList.remove('open');
      setTimeout(function() { overlay.remove(); }, 300);
    }

    // Trigger: mouse leaves viewport from top
    document.addEventListener('mouseleave', function(e) {
      if (e.clientY <= 5) openPopup();
    });

    // Fallback: 45 seconds after page load if no exit intent
    setTimeout(function() { if (!triggered) openPopup(); }, 45000);

    // Close on overlay click (outside modal)
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closePopup();
    });

    // Close button
    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (skipBtn) skipBtn.addEventListener('click', closePopup);

    // ESC key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closePopup();
    });

    // Form submit
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var emailInput = form.querySelector('input[type=email]');
        var btn = form.querySelector('button[type=submit]');
        var email = emailInput ? emailInput.value.trim() : '';
        if (!email) return;
        submitEmail(form, email, btn, btn.textContent);
      });
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      upgradeInPageForms();
      initFloatBar();
      initExitPopup();
    });
  } else {
    upgradeInPageForms();
    initFloatBar();
    initExitPopup();
  }
})();
</script>
"""

# ── The injection block (CSS + HTML + JS) ──────────────────────────────────────
INJECT_BLOCK = SHARED_CSS + FLOAT_BAR_HTML + EXIT_POPUP_HTML + CAPTURE_JS


def get_blog_files():
    result = subprocess.run(['git', 'ls-files', '*.html'], capture_output=True, text=True)
    return [f for f in result.stdout.strip().split('\n')
            if f.startswith('blog-') and f.endswith('.html')]


def add_next_to_existing_forms(content):
    """Add _next hidden field to any capture-form that doesn't have it yet."""
    def inject_next(m):
        form_open = m.group(0)
        if '_next' in form_open or 'thank-you' in form_open:
            return form_open
        # Find the end of the opening <form ...> tag and insert hidden field after it
        # We'll inject after the > of the opening form tag
        return form_open + '\n      <input type="hidden" name="_next" value="https://winwithfred.com/thank-you">'
    # Match capture-form opening tags
    return re.sub(
        r'<form[^>]+class="capture-form"[^>]*>',
        inject_next,
        content
    )


def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        original = f.read()

    # Skip if already patched
    if MARKER in original:
        return False

    content = original

    # 1. Add _next to existing inline forms
    content = add_next_to_existing_forms(content)

    # 2. Inject floating bar + popup + JS before </body>
    if '</body>' in content:
        content = content.replace('</body>', INJECT_BLOCK + '\n</body>', 1)

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False


def main():
    files = get_blog_files()
    updated = []
    skipped = []

    for filepath in files:
        result = patch_file(filepath)
        if result:
            updated.append(filepath)
            print('Updated:', filepath)
        else:
            skipped.append(filepath)

    print(f'\nTotal updated: {len(updated)} files')
    print(f'Already patched / skipped: {len(skipped)} files')


if __name__ == '__main__':
    main()
