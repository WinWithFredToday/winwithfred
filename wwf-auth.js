/* ============================================
   WinWithFred â Auth + Premium Cloud Sync
   Supabase + Stripe powered membership
   ============================================ */

(function () {
  // ââ Config ââââââââââââââââââââââââââââââââââ
  const SB_URL  = 'https://qhwysokixisyxozuewgf.supabase.co';
  const SB_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFod3lzb2tpeGlzeXhvenVld2dmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMTE5MDAsImV4cCI6MjA5MDg4NzkwMH0.SegAjhK2NRCmE3LCU-b41fE7Ocjg52YZqkWOGQ04EIY';
  // Stripe Payment Links â update after creating in Stripe dashboard
  const STRIPE_MONTHLY = 'https://buy.stripe.com/eVqdR9gHVfDk9rg6MT33W00';
  const STRIPE_YEARLY  = 'https://buy.stripe.com/7sYeVd77l4YGgTI8V133W01';

  // ââ Init Supabase ââââââââââââââââââââââââââââ
  let sb = null;
  let currentUser = null;
  let isPremium = false;

  function initSupabase() {
    if (window.supabase) {
      sb = window.supabase.createClient(SB_URL, SB_KEY);
      bootAuth();
    } else {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
      s.onload = () => { sb = window.supabase.createClient(SB_URL, SB_KEY); bootAuth(); };
      document.head.appendChild(s);
    }
  }

  async function bootAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session) await setUser(session.user);
    sb.auth.onAuthStateChange(async (_event, session) => {
      if (session) await setUser(session.user);
      else { currentUser = null; isPremium = false; renderAuthBar(); }
    });
    injectStyles();
    injectAuthBar();
    injectModal();
  }

  async function setUser(user) {
    currentUser = user;
    const { data } = await sb.from('profiles').select('is_premium, subscription_status').eq('id', user.id).single();
    isPremium = data?.is_premium || false;
    window.WWF = window.WWF || {};
    window.WWF.user = user;
    window.WWF.isPremium = isPremium;
    renderAuthBar();
    if (typeof window.onWWFAuth === 'function') window.onWWFAuth(user, isPremium);
  }

  // ââ Auth Bar âââââââââââââââââââââââââââââââââ
  function injectAuthBar() {
    const existing = document.getElementById('wwf-auth-bar');
    if (existing) { renderAuthBar(); return; }
    const bar = document.createElement('div');
    bar.id = 'wwf-auth-bar';
    const nav = document.querySelector('.navbar');
    if (nav) nav.after(bar);
    else document.body.prepend(bar);
    renderAuthBar();
  }

  function renderAuthBar() {
    const bar = document.getElementById('wwf-auth-bar');
    if (!bar) return;
    if (!currentUser) {
      bar.innerHTML = `<div class="wwf-bar wwf-bar--free">
        <span>&#9729;&#65039; Sign in to save your data across all devices</span>
        <button onclick="WWFAuth.showModal('login')" class="wwf-bar-btn">Sign In</button>
        <button onclick="WWFAuth.showModal('signup')" class="wwf-bar-btn wwf-bar-btn--primary">Create Free Account</button>
      </div>`;
    } else if (!isPremium) {
      bar.innerHTML = `<div class="wwf-bar wwf-bar--upgrade">
        <span>&#9989; Signed in as <strong>${currentUser.email}</strong> &mdash; Upgrade to sync your data</span>
        <button onclick="WWFAuth.showUpgrade()" class="wwf-bar-btn wwf-bar-btn--primary">&#11088; Go Premium &mdash; $5/mo</button>
        <button onclick="WWFAuth.signOut()" class="wwf-bar-btn">Sign Out</button>
      </div>`;
    } else {
      bar.innerHTML = `<div class="wwf-bar wwf-bar--premium">
        <span>&#11088; Premium &mdash; <strong>${currentUser.email}</strong> &mdash; your data syncs automatically</span>
        <button onclick="WWFAuth.signOut()" class="wwf-bar-btn">Sign Out</button>
      </div>`;
    }
  }

  // ââ Modal ââââââââââââââââââââââââââââââââââââ
  function injectModal() {
    if (document.getElementById('wwf-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'wwf-modal-overlay';
    overlay.innerHTML = `
      <div class="wwf-modal" id="wwf-modal">
        <button class="wwf-modal-close" onclick="WWFAuth.hideModal()">&#10005;</button>
        <div id="wwf-modal-body"></div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) WWFAuth.hideModal(); });
    document.body.appendChild(overlay);
  }

  window.WWFAuth = {
    showModal(tab = 'login') {
      const overlay = document.getElementById('wwf-modal-overlay');
      const body = document.getElementById('wwf-modal-body');
      overlay.style.display = 'flex';
      body.innerHTML = `
        <div class="wwf-modal-tabs">
          <button class="wwf-tab ${tab==='login'?'active':''}" onclick="WWFAuth.showModal('login')">Sign In</button>
          <button class="wwf-tab ${tab==='signup'?'active':''}" onclick="WWFAuth.showModal('signup')">Create Account</button>
        </div>
        <div id="wwf-auth-error" class="wwf-auth-error" style="display:none"></div>
        ${tab === 'login' ? loginForm() : signupForm()}`;
    },
    hideModal() {
      const o = document.getElementById('wwf-modal-overlay');
      if (o) o.style.display = 'none';
    },
    showUpgrade() {
      const overlay = document.getElementById('wwf-modal-overlay');
      const body = document.getElementById('wwf-modal-body');
      overlay.style.display = 'flex';
      const email = encodeURIComponent(currentUser?.email || '');
      body.innerHTML = `
        <div style="text-align:center;padding:8px 0 24px;">
          <div style="font-size:2.5rem;margin-bottom:12px;">&#11088;</div>
          <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:8px;">Go Premium</h2>
          <p style="color:#6b7280;margin-bottom:28px;">Save your journal entries, quiz results, goals, and habits forever &mdash; across every device.</p>
          <a href="${STRIPE_MONTHLY}?prefilled_email=${email}" target="_blank" class="wwf-plan-btn" style="display:block;margin-bottom:12px;">
            <strong>$5 / month</strong><br><span style="font-size:0.85rem;opacity:0.8;">Cancel anytime</span>
          </a>
          <a href="${STRIPE_YEARLY}?prefilled_email=${email}" target="_blank" class="wwf-plan-btn wwf-plan-btn--alt" style="display:block;margin-bottom:20px;">
            <strong>$39 / year</strong> <span class="wwf-badge">Save 35%</span><br><span style="font-size:0.85rem;opacity:0.8;">Best value &mdash; $3.25/mo</span>
          </a>
          <p style="font-size:0.8rem;color:#9ca3af;">After payment, your account upgrades within a few minutes. Questions? Email fred@winwithfred.com</p>
        </div>`;
    },
    async signOut() {
      await sb.auth.signOut();
      currentUser = null; isPremium = false;
      renderAuthBar();
    }
  };

  function loginForm() {
    return `<form onsubmit="WWFAuth._login(event)" style="margin-top:4px;">
      <label class="wwf-label">Email</label>
      <input id="wwf-email" type="email" class="wwf-input" placeholder="you@example.com" required />
      <label class="wwf-label">Password</label>
      <input id="wwf-password" type="password" class="wwf-input" placeholder="â¢â¢â¢â¢â¢â¢â¢â¢" required />
      <button type="submit" class="wwf-submit">Sign In</button>
      <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:#6b7280;">
        Forgot password? <a href="#" onclick="WWFAuth._resetPassword()">Reset it</a>
      </p>
    </form>`;
  }

  function signupForm() {
    return `<form onsubmit="WWFAuth._signup(event)" style="margin-top:4px;">
      <label class="wwf-label">Email</label>
      <input id="wwf-email" type="email" class="wwf-input" placeholder="you@example.com" required />
      <label class="wwf-label">Password</label>
      <input id="wwf-password" type="password" class="wwf-input" placeholder="At least 8 characters" required minlength="8" />
      <button type="submit" class="wwf-submit">Create Free Account</button>
      <p style="text-align:center;margin-top:12px;font-size:0.8rem;color:#9ca3af;">Free account saves your spot. Upgrade anytime for cloud sync.</p>
    </form>`;
  }

  window.WWFAuth._login = async function(e) {
    e.preventDefault();
    const email = document.getElementById('wwf-email').value;
    const password = document.getElementById('wwf-password').value;
    showAuthError('');
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) showAuthError(error.message);
    else WWFAuth.hideModal();
  };

  window.WWFAuth._signup = async function(e) {
    e.preventDefault();
    const email = document.getElementById('wwf-email').value;
    const password = document.getElementById('wwf-password').value;
    showAuthError('');
    const { error } = await sb.auth.signUp({ email, password });
    if (error) showAuthError(error.message);
    else {
      document.getElementById('wwf-modal-body').innerHTML =
        `<div style="text-align:center;padding:20px 0;">
          <div style="font-size:3rem;margin-bottom:12px;">&#9993;</div>
          <h3>Check your email!</h3>
          <p style="color:#6b7280;margin-top:8px;">We sent a confirmation link to <strong>${email}</strong>. Click it to activate your account.</p>
        </div>`;
    }
  };

  window.WWFAuth._resetPassword = async function() {
    const email = document.getElementById('wwf-email')?.value;
    if (!email) { showAuthError('Enter your email above first'); return; }
    await sb.auth.resetPasswordForEmail(email, { redirectTo: 'https://winwithfred.com/reset-password.html' });
    showAuthError('Reset link sent! Check your inbox.', 'success');
  };

  function showAuthError(msg, type = 'error') {
    const el = document.getElementById('wwf-auth-error');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.textContent = msg;
    el.className = 'wwf-auth-error' + (type === 'success' ? ' wwf-auth-success' : '');
  }

  // ââ Data Sync ââââââââââââââââââââââââââââââââ
  window.WWF = window.WWF || {};

  window.WWF.saveJournal = async function(entries) {
    localStorage.setItem('wwf_journal', JSON.stringify(entries));
    if (!currentUser || !isPremium) return;
    const { data } = await sb.from('journal_entries').select('id').eq('user_id', currentUser.id);
    // Upsert all entries
    for (const entry of entries) {
      await sb.from('journal_entries').upsert({
        id: entry.id || undefined,
        user_id: currentUser.id,
        prompt: entry.prompt || '',
        content: entry.content || '',
        created_at: entry.date || new Date().toISOString()
      }, { onConflict: 'id' });
    }
  };

  window.WWF.loadJournal = async function() {
    if (!currentUser || !isPremium) return JSON.parse(localStorage.getItem('wwf_journal') || '[]');
    const { data, error } = await sb.from('journal_entries').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false });
    if (error || !data) return JSON.parse(localStorage.getItem('wwf_journal') || '[]');
    const entries = data.map(r => ({ id: r.id, prompt: r.prompt, content: r.content, date: r.created_at }));
    localStorage.setItem('wwf_journal', JSON.stringify(entries));
    return entries;
  };

  window.WWF.saveGoals = async function(data) {
    localStorage.setItem('wwf_goals', JSON.stringify(data));
    if (!currentUser || !isPremium) return;
    await sb.from('goals').upsert({ user_id: currentUser.id, data: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  };

  window.WWF.loadGoals = async function() {
    if (!currentUser || !isPremium) return JSON.parse(localStorage.getItem('wwf_goals') || 'null');
    const { data } = await sb.from('goals').select('data').eq('user_id', currentUser.id).single();
    if (data?.data) { localStorage.setItem('wwf_goals', JSON.stringify(data.data)); return data.data; }
    return JSON.parse(localStorage.getItem('wwf_goals') || 'null');
  };

  window.WWF.saveHabits = async function(data) {
    localStorage.setItem('wwf_habits', JSON.stringify(data));
    if (!currentUser || !isPremium) return;
    await sb.from('habits').upsert({ user_id: currentUser.id, data: data, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  };

  window.WWF.loadHabits = async function() {
    if (!currentUser || !isPremium) return JSON.parse(localStorage.getItem('wwf_habits') || 'null');
    const { data } = await sb.from('habits').select('data').eq('user_id', currentUser.id).single();
    if (data?.data) { localStorage.setItem('wwf_habits', JSON.stringify(data.data)); return data.data; }
    return JSON.parse(localStorage.getItem('wwf_habits') || 'null');
  };

  window.WWF.saveQuizResult = async function(result) {
    const existing = JSON.parse(localStorage.getItem('wwf_quiz_results') || '[]');
    existing.unshift(result);
    if (existing.length > 20) existing.length = 20;
    localStorage.setItem('wwf_quiz_results', JSON.stringify(existing));
    if (!currentUser || !isPremium) return;
    await sb.from('quiz_results').insert({ user_id: currentUser.id, quiz_type: result.type || 'mindset', score: result.score, answers: result.answers, result_label: result.label });
  };

  window.WWF.loadQuizResults = async function() {
    if (!currentUser || !isPremium) return JSON.parse(localStorage.getItem('wwf_quiz_results') || '[]');
    const { data } = await sb.from('quiz_results').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(20);
    return data || [];
  };

  // ââ Styles âââââââââââââââââââââââââââââââââââ
  function injectStyles() {
    if (document.getElementById('wwf-auth-styles')) return;
    const style = document.createElement('style');
    style.id = 'wwf-auth-styles';
    style.textContent = `
      .wwf-bar { display:flex; align-items:center; gap:12px; padding:10px 24px; font-size:0.85rem; flex-wrap:wrap; }
      .wwf-bar--free { background:#1f2937; color:#d1d5db; }
      .wwf-bar--upgrade { background:#1c1917; color:#d1d5db; }
      .wwf-bar--premium { background:#052e16; color:#bbf7d0; }
      .wwf-bar span { flex:1; }
      .wwf-bar-btn { padding:6px 14px; border-radius:6px; border:1px solid #374151; background:transparent; color:#d1d5db; cursor:pointer; font-size:0.8rem; font-weight:600; white-space:nowrap; }
      .wwf-bar-btn--primary { background:#f97316; color:#fff; border-color:#f97316; }
      .wwf-bar-btn:hover { opacity:0.85; }
      #wwf-modal-overlay { display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:9999; align-items:center; justify-content:center; padding:16px; }
      .wwf-modal { background:#fff; border-radius:16px; padding:36px 32px; width:100%; max-width:420px; position:relative; }
      .wwf-modal-close { position:absolute; top:12px; right:16px; background:none; border:none; font-size:1.2rem; cursor:pointer; color:#6b7280; }
      .wwf-modal-tabs { display:flex; gap:0; margin-bottom:24px; border-bottom:2px solid #e5e7eb; }
      .wwf-tab { flex:1; padding:10px; background:none; border:none; font-size:0.95rem; font-weight:600; cursor:pointer; color:#6b7280; border-bottom:2px solid transparent; margin-bottom:-2px; }
      .wwf-tab.active { color:#f97316; border-bottom-color:#f97316; }
      .wwf-label { display:block; font-size:0.85rem; font-weight:600; color:#374151; margin-bottom:6px; margin-top:16px; }
      .wwf-input { width:100%; padding:10px 14px; border:1px solid #d1d5db; border-radius:8px; font-size:0.95rem; box-sizing:border-box; }
      .wwf-input:focus { outline:none; border-color:#f97316; box-shadow:0 0 0 3px rgba(249,115,22,0.15); }
      .wwf-submit { width:100%; margin-top:20px; padding:12px; background:#f97316; color:#fff; border:none; border-radius:8px; font-size:1rem; font-weight:700; cursor:pointer; }
      .wwf-submit:hover { background:#ea6c0a; }
      .wwf-auth-error { background:#fef2f2; color:#dc2626; border-radius:8px; padding:10px 14px; font-size:0.875rem; margin-bottom:8px; }
      .wwf-auth-success { background:#f0fdf4; color:#16a34a; }
      .wwf-plan-btn { display:block; padding:16px 20px; background:#111827; color:#fff; border-radius:10px; text-decoration:none; font-weight:700; font-size:1rem; }
      .wwf-plan-btn--alt { background:#f97316; margin-top:12px; }
      .wwf-plan-btn:hover { opacity:0.9; }
      .wwf-badge { background:#fef08a; color:#713f12; font-size:0.75rem; padding:2px 8px; border-radius:999px; font-weight:700; margin-left:6px; }
      .wwf-premium-banner { background:linear-gradient(135deg,#052e16,#14532d); color:#bbf7d0; padding:14px 20px; border-radius:10px; margin-bottom:20px; display:flex; align-items:center; gap:12px; font-size:0.9rem; }
      .wwf-upgrade-banner { background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:14px 20px; border-radius:10px; margin-bottom:20px; display:flex; align-items:center; gap:12px; font-size:0.9rem; cursor:pointer; }
      .wwf-upgrade-banner:hover { background:#ffedd5; }
    `;
    document.head.appendChild(style);
  }

  // ââ Boot âââââââââââââââââââââââââââââââââââââ
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSupabase);
  else initSupabase();

})();
