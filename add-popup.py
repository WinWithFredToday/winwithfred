import os

BREVO_URL = "https://b0a4908b.sibforms.com/v2/serve/MUIFAIyZfejVz8HaBjH-rgzTct8G025A-3rLx9JPNaGGjuwzFgf3keyzyLwEFgJjKe7A2yMJKQGUo8WM93shIKqvqI8jGEc8YRaePejm0I-8fMOtSmHI77tgaAavCIUbT11MQlxawGWXKvkxClIhzFbQKz7rNHKkJARUdQqwA2u6Xp16kUJsswaBwEqU1N2MPfb6kP5r9LuNd0Dqrw=="

POPUP = """
<!-- WF Exit Intent Popup -->
<div id="wf-popup" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.72);z-index:10000;align-items:center;justify-content:center;padding:20px;">
  <div style="background:#fff;border-radius:18px;max-width:460px;width:100%;padding:44px 36px 36px;text-align:center;position:relative;animation:wfIn 0.3s ease;">
    <button id="wf-popup-close" style="position:absolute;top:14px;right:18px;background:none;border:none;font-size:26px;cursor:pointer;color:#9ca3af;line-height:1;">&#215;</button>
    <div style="font-size:52px;margin-bottom:14px;">&#127919;</div>
    <h2 style="font-size:22px;font-weight:900;color:#111827;margin:0 0 10px;line-height:1.3;">Hold on \u2014 grab your free tracker</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;line-height:1.7;">A free 30-day printable habit tracker PDF. Track your habits, build your streak, and make progress you can actually see.</p>
    <form action="https://b0a4908b.sibforms.com/v2/serve/MUIFAIyZfejVz8HaBjH-rgzTct8G025A-3rLx9JPNaGGjuwzFgf3keyzyLwEFgJjKe7A2yMJKQGUo8WM93shIKqvqI8jGEc8YRaePejm0I-8fMOtSmHI77tgaAavCIUbT11MQlxawGWXKvkxClIhzFbQKz7rNHKkJARUdQqwA2u6Xp16kUJsswaBwEqU1N2MPfb6kP5r9LuNd0Dqrw==" method="POST" data-type="subscription" style="display:flex;flex-direction:column;gap:10px;">
      <input type="email" name="EMAIL" placeholder="Your email address" required autocomplete="email" style="padding:13px 16px;border-radius:8px;border:2px solid #e5e7eb;font-size:14px;outline:none;width:100%;font-family:inherit;box-sizing:border-box;">
      <input type="text" name="email_address_check" value="" style="display:none" aria-hidden="true" tabindex="-1">
      <input type="hidden" name="locale" value="en">
      <button type="submit" style="padding:14px;background:#f97316;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit;">Send Me the Free Tracker &#8594;</button>
    </form>
    <p style="color:#9ca3af;font-size:11px;margin:12px 0 0;">No spam. Unsubscribe anytime.</p>
  </div>
</div>
<style>@keyframes wfIn{from{opacity:0;transform:translateY(-16px)}to{opacity:1;transform:translateY(0)}}</style>
<script>
(function(){
  if(sessionStorage.getItem('wf-popup-closed')) return;
  var popup = document.getElementById('wf-popup');
  var triggered = false;
  function show(){
    if(triggered) return;
    triggered = true;
    popup.style.display = 'flex';
  }
  document.addEventListener('mouseleave', function(e){ if(e.clientY < 40) show(); });
  setTimeout(function(){ show(); }, 90000);
  document.getElementById('wf-popup-close').addEventListener('click', function(){
    popup.style.display = 'none';
    sessionStorage.setItem('wf-popup-closed','1');
  });
  popup.addEventListener('click', function(e){
    if(e.target===popup){ popup.style.display='none'; sessionStorage.setItem('wf-popup-closed','1'); }
  });
})();
<\/script>
""";

updated = 0
skipped_done = 0
skipped_nobar = 0

for fname in sorted(os.listdir('.')):
    if not (fname.startswith('blog-') and fname.endswith('.html')):
        continue
    with open(fname, 'r', encoding='utf-8') as f:
        content = f.read()
    if 'wf-popup' in content:
        skipped_done += 1
        continue
    if 'wf-sticky-bar' not in content:
        skipped_nobar += 1
        continue
    content = content.replace('</body>', POPUP + '\n</body>')
    with open(fname, 'w', encoding='utf-8') as f:
        f.write(content)
    updated += 1
    print('Updated: ' + fname)

print(f'DONE: {updated} updated, {skipped_done} already done, {skipped_nobar} missing bar')
