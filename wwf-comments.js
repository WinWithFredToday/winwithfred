// WinWithFred Comments System
// Stores comments in Firestore: comments/{postSlug}/{commentId}
// Requires Firebase auth to post -- blocks spam entirely

(function() {
  'use strict';

  const STYLES = `
    #wwf-comments { max-width: 740px; margin: 0 auto; padding: 56px 24px 72px; border-top: 2px solid #f3f4f6; }
    #wwf-comments h2 { font-size: 1.5rem; font-weight: 800; color: #111827; margin-bottom: 32px; letter-spacing: -0.3px; }
    .wwf-comment { display: flex; gap: 16px; margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid #f3f4f6; }
    .wwf-comment:last-of-type { border-bottom: none; }
    .wwf-comment-avatar { width: 40px; height: 40px; border-radius: 50%; background: #f97316; color: #fff; font-size: 1rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .wwf-comment-body { flex: 1; }
    .wwf-comment-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .wwf-comment-name { font-weight: 700; font-size: 0.95rem; color: #111827; }
    .wwf-comment-date { font-size: 0.85rem; color: #9ca3af; }
    .wwf-comment-text { font-size: 1rem; line-height: 1.75; color: #374151; }
    .wwf-comment-form { background: #f9fafb; border-radius: 12px; padding: 24px; margin-top: 32px; }
    .wwf-comment-form h3 { font-size: 1.05rem; font-weight: 700; color: #111827; margin-bottom: 16px; }
    .wwf-comment-form textarea { width: 100%; padding: 12px 16px; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: 0.97rem; font-family: 'Inter', -apple-system, sans-serif; color: #111827; background: #fff; resize: vertical; min-height: 100px; transition: border 0.2s; }
    .wwf-comment-form textarea:focus { outline: none; border-color: #f97316; }
    .wwf-comment-form button { margin-top: 12px; padding: 10px 24px; background: #f97316; color: #fff; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 700; cursor: pointer; transition: background 0.2s; font-family: inherit; }
    .wwf-comment-form button:hover { background: #ea6c0a; }
    .wwf-comment-form button:disabled { background: #d1d5db; cursor: not-allowed; }
    .wwf-login-prompt { background: #fff7ed; border: 1.5px solid #fed7aa; border-radius: 10px; padding: 20px 24px; margin-top: 28px; text-align: center; }
    .wwf-login-prompt p { color: #92400e; font-size: 0.97rem; margin: 0; }
    .wwf-login-prompt a { color: #f97316; font-weight: 700; }
    .wwf-comment-status { margin-top: 10px; font-size: 0.9rem; font-weight: 600; }
    .wwf-comment-status.success { color: #065f46; }
    .wwf-comment-status.error { color: #991b1b; }
    .wwf-no-comments { color: #9ca3af; font-size: 0.97rem; font-style: italic; margin-bottom: 8px; }
  `;

  function injectStyles() {
    if (document.getElementById('wwf-comments-styles')) return;
    const style = document.createElement('style');
    style.id = 'wwf-comments-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  function getPostSlug() {
    const path = window.location.pathname;
    const file = path.split('/').pop() || 'index';
    return file.replace('.html', '').replace(/[^a-z0-9-]/gi, '-') || 'home';
  }

  function formatDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getInitial(name) { return (name || 'A').charAt(0).toUpperCase(); }

  function escapeHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  function renderComment(data) {
    const name = escapeHtml(data.name || 'Anonymous');
    const text = escapeHtml(data.text || '').replace(/\n/g, '<br>');
    const date = formatDate(data.createdAt);
    return '<div class="wwf-comment"><div class="wwf-comment-avatar">' + getInitial(name) + '</div><div class="wwf-comment-body"><div class="wwf-comment-meta"><span class="wwf-comment-name">' + name + '</span>' + (date ? '<span class="wwf-comment-date">' + date + '</span>' : '') + '</div><div class="wwf-comment-text">' + text + '</div></div></div>';
  }

  function buildSection(container, comments, user) {
    const slug = getPostSlug();
    const count = comments.length;
    const heading = count === 1 ? '1 Comment' : count + ' Comments';
    const commentsHtml = count > 0 ? comments.map(renderComment).join('') : '<p class="wwf-no-comments">No comments yet. Be the first to share your thoughts.</p>';
    const formHtml = user
      ? '<div class="wwf-comment-form"><h3>Leave a Comment</h3><textarea id="wwf-comment-input" placeholder="Share your thoughts..." rows="4"></textarea><br><button id="wwf-comment-submit">Post Comment</button><div id="wwf-comment-status" class="wwf-comment-status"></div></div>'
      : '<div class="wwf-login-prompt"><p>Want to join the conversation? <a href="/login.html">Log in</a> to leave a comment.</p></div>';
    container.innerHTML = '<h2>' + heading + '</h2><div id="wwf-comments-list">' + commentsHtml + '</div>' + formHtml;
    if (user) {
      const btn = document.getElementById('wwf-comment-submit');
      const ta = document.getElementById('wwf-comment-input');
      const st = document.getElementById('wwf-comment-status');
      btn.addEventListener('click', async function() {
        const text = ta.value.trim();
        if (!text || text.length < 5) { st.className = 'wwf-comment-status error'; st.textContent = 'Please write at least a few words.'; return; }
        btn.disabled = true; btn.textContent = 'Posting...'; st.textContent = '';
        try {
          await window.db.collection('comments').doc(slug).collection('entries').add({ name: user.displayName || user.email.split('@')[0], text, userId: user.uid, createdAt: new Date(), postSlug: slug });
          ta.value = ''; btn.textContent = 'Post Comment'; btn.disabled = false;
          st.className = 'wwf-comment-status success'; st.textContent = 'Comment posted! Thank you.';
          loadComments(container, user);
        } catch(e) { btn.disabled = false; btn.textContent = 'Post Comment'; st.className = 'wwf-comment-status error'; st.textContent = 'Something went wrong. Please try again.'; }
      });
    }
  }

  async function loadComments(container, user) {
    const slug = getPostSlug();
    try {
      const snap = await window.db.collection('comments').doc(slug).collection('entries').orderBy('createdAt','asc').get();
      buildSection(container, snap.docs.map(d => d.data()), user);
    } catch(e) { buildSection(container, [], user); }
  }

  function init() {
    injectStyles();
    const container = document.getElementById('wwf-comments');
    if (!container) return;
    container.innerHTML = '<p style="color:#9ca3af;font-size:0.95rem;padding:24px 0">Loading comments...</p>';
    function tryInit(n) {
      if (window.db && window.firebase && window.firebase.auth) {
        window.firebase.auth().onAuthStateChanged(function(user) { loadComments(container, user); });
      } else if (n > 0) { setTimeout(function() { tryInit(n-1); }, 400); }
      else { container.innerHTML = ''; }
    }
    tryInit(15);
  }

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
  else { init(); }
})();