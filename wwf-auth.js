// requireAuth polyfill — queues callbacks until firebase-config.js loads.
// Since wwf-auth.js is loaded synchronously, this always runs before any
// inline page scripts, ensuring requireAuth() is never undefined.
window._wwfAuthQueue = window._wwfAuthQueue || [];
if (typeof window.requireAuth !== "function") {
  window.requireAuth = function(callback) {
    window._wwfAuthQueue.push(callback);
  };
}
// wwf-auth.js -- WinWithFred Shared Auth & Cloud Sync
// Loaded by tool pages (goal-tracker, habit-builder, journal, quiz).
// Dynamically loads the Firebase SDK if not already present, then
// initialises auth, renders the navbar, exposes window.WWF with
// Firestore helpers, and shows an upgrade banner to free users.

(function () {
  'use strict';

  var FB_VER  = '10.7.1';
  var FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve(); return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    if (typeof firebase === 'undefined') {
      await loadScript(FB_BASE + 'firebase-app-compat.js');
      await loadScript(FB_BASE + 'firebase-auth-compat.js');
      await loadScript(FB_BASE + 'firebase-firestore-compat.js');
    }
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      await loadScript('firebase-config.js');
      await new Promise(function (r) { setTimeout(r, 80); });
    }
    setup();
  }

  function setup() {
    var _auth = window.auth;
    var _db   = window.db;

    if (!_auth || !_db) {
      console.warn('WWF: Firebase not initialised.');
      setTimeout(function () {
        if (typeof window.onWWFAuth === 'function') window.onWWFAuth(null, false);
      }, 0);
      return;
    }

    // Firestore helpers
    function col(uid, name) {
      return _db.collection('users').doc(uid).collection(name);
    }

    async function loadCol(uid, name) {
      var snap = await col(uid, name).get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    }

    async function saveCol(uid, name, items) {
      var ref  = col(uid, name);
      var snap = await ref.get();
      var newIds = new Set(items.map(function (i) { return i.id; }));
      var batch  = _db.batch();
      snap.docs.forEach(function (d) {
        if (!newIds.has(d.id)) batch.delete(d.ref);
      });
      items.forEach(function (item) {
        batch.set(ref.doc(item.id), item);
      });
      await batch.commit();
    }

    // One-time localStorage -> Firestore migration
    async function migrateLocalStorage(uid) {
      var map = [
        { key: 'wwf_goals',   col: 'goals'   },
        { key: 'wwf_habits',  col: 'habits'  },
        { key: 'wwf_journal', col: 'journal' }
      ];
      for (var i = 0; i < map.length; i++) {
        var entry  = map[i];
        var local  = JSON.parse(localStorage.getItem(entry.key) || '[]');
        if (!local.length) continue;
        var existing = await col(uid, entry.col).get();
        if (existing.empty) {
          await saveCol(uid, entry.col, local);
        }
      }
    }

    // Read premium status from Firestore user doc
    async function checkPremium(uid) {
      try {
        var doc = await _db.collection('users').doc(uid).get();
        return doc.exists && doc.data().premium === true;
      } catch (e) {
        return false;
      }
    }

    // Navbar renderer
    function renderNav(user) {
      var el = document.getElementById('auth-nav');
      if (!el) return;
      if (user) {
        var initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
        var name    = user.displayName ? user.displayName.split(' ')[0] : user.email;
        el.innerHTML =
          '<div class="nav-user">' +
            '<a href="profile.html" style="text-decoration:none;display:flex;align-items:center;gap:8px;">' +
              '<div class="nav-avatar" title="' + (user.displayName || user.email) + '">' + initial + '</div>' +
              '<span class="nav-name">' + name + '</span>' +
            '</a>' +
            '<button class="nav-logout" onclick="window.auth.signOut().then(function(){window.location.href=\'index.html\';})">Sign Out</button>' +
          '</div>';
      } else {
        el.innerHTML = '<a href="login.html" class="btn btn-primary btn-sm">Sign In \u2192</a>';
      }
    }

    // Upgrade banner for signed-in free users
    function renderUpgradeBanner(user, isPremium) {
      var existing = document.getElementById('wwf-upgrade-banner');
      if (existing) existing.remove();
      if (!user || isPremium) return;

      var banner = document.createElement('div');
      banner.id = 'wwf-upgrade-banner';
      banner.innerHTML =
        '<div style="background:linear-gradient(90deg,#166534,#15803d);color:#fff;padding:10px 20px;display:flex;align-items:center;justify-content:center;gap:16px;font-size:0.875rem;font-family:inherit;flex-wrap:wrap;position:relative;">' +
          '<span>&#9889; Your data is saved locally. <strong>Go Premium</strong> to sync across all your devices \u2014 from just $3.25/mo.</span>' +
          '<a href="pricing.html" style="background:#fff;color:#166534;font-weight:700;padding:6px 16px;border-radius:20px;text-decoration:none;font-size:0.8rem;white-space:nowrap;flex-shrink:0;">Upgrade Now \u2192</a>' +
          '<button onclick="document.getElementById(\'wwf-upgrade-banner\').remove()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,0.7);font-size:1.1rem;cursor:pointer;line-height:1;padding:4px;" title="Dismiss">\u00d7</button>' +
        '</div>';

      document.body.insertBefore(banner, document.body.firstChild);
    }

    // window.WWF public API
    window.WWF = {
      user:      null,
      isPremium: false,

      loadGoals: function () {
        return window.WWF.user ? loadCol(window.WWF.user.uid, 'goals') : Promise.resolve([]);
      },
      saveGoals: function (items) {
        return window.WWF.user ? saveCol(window.WWF.user.uid, 'goals', items) : Promise.resolve();
      },
      loadHabits: function () {
        return window.WWF.user ? loadCol(window.WWF.user.uid, 'habits') : Promise.resolve([]);
      },
      saveHabits: function (items) {
        return window.WWF.user ? saveCol(window.WWF.user.uid, 'habits', items) : Promise.resolve();
      },
      loadJournal: function () {
        return window.WWF.user ? loadCol(window.WWF.user.uid, 'journal') : Promise.resolve([]);
      },
      saveJournal: function (items) {
        return window.WWF.user ? saveCol(window.WWF.user.uid, 'journal', items) : Promise.resolve();
      },
      saveQuizResult: function (result) {
        if (!window.WWF.user) return Promise.resolve();
        return col(window.WWF.user.uid, 'quizResults').add(result);
      }
    };

    // Auth state listener
    _auth.onAuthStateChanged(async function (user) {
      window.WWF.user = user || null;

      if (user) {
        // Check premium status from Firestore before rendering banner
        window.WWF.isPremium = await checkPremium(user.uid);
        try { await migrateLocalStorage(user.uid); } catch (e) { /* non-fatal */ }
      } else {
        window.WWF.isPremium = false;
      }

      renderNav(user);
      renderUpgradeBanner(user, window.WWF.isPremium);

      if (typeof window.onWWFAuth === 'function') {
        window.onWWFAuth(user, window.WWF.isPremium);
      }
    });
  }

  boot().catch(function (e) { console.error('WWF boot error:', e); });

})();
