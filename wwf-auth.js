// ================================================================
// wwf-auth.js — WinWithFred Shared Auth & Cloud Sync
// ================================================================
// Loaded by tool pages (goal-tracker, habit-builder, journal, quiz).
// Dynamically loads the Firebase SDK if not already present, then
// initialises auth, renders the navbar, and exposes window.WWF
// with Firestore read/write helpers.
// ================================================================

(function () {
  'use strict';

  var FB_VER  = '10.7.1';
  var FB_BASE = 'https://www.gstatic.com/firebasejs/' + FB_VER + '/';

  // ── Script loader ────────────────────────────────────────────
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

  // ── Boot sequence ────────────────────────────────────────────
  async function boot() {
    // 1. Ensure Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      await loadScript(FB_BASE + 'firebase-app-compat.js');
      await loadScript(FB_BASE + 'firebase-auth-compat.js');
      await loadScript(FB_BASE + 'firebase-firestore-compat.js');
    }

    // 2. Initialise Firebase via firebase-config.js if not already done
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
      await loadScript('firebase-config.js');
      // Allow the synchronous init code inside config to run
      await new Promise(function (r) { setTimeout(r, 80); });
    }

    setup();
  }

  // ── Core setup ───────────────────────────────────────────────
  function setup() {
    var _auth = window.auth;
    var _db   = window.db;

    if (!_auth || !_db) {
      console.warn('WWF: Firebase not initialised.');
      // Unblock any page waiting on onWWFAuth
      setTimeout(function () {
        if (typeof window.onWWFAuth === 'function') window.onWWFAuth(null, false);
      }, 0);
      return;
    }

    // ── Firestore helpers ─────────────────────────────────────
    function col(uid, name) {
      return _db.collection('users').doc(uid).collection(name);
    }

    async function loadCol(uid, name) {
      var snap = await col(uid, name).get();
      return snap.docs.map(function (d) {
        return Object.assign({ id: d.id }, d.data());
      });
    }

    // Replace the entire collection with the provided items array
    // (handles additions, updates, and deletions in one batch)
    async function saveCol(uid, name, items) {
      var ref  = col(uid, name);
      var snap = await ref.get();

      var newIds = new Set(items.map(function (i) { return i.id; }));
      var batch  = _db.batch();

      // Delete docs that are no longer in the items array
      snap.docs.forEach(function (d) {
        if (!newIds.has(d.id)) batch.delete(d.ref);
      });

      // Set / update every item
      items.forEach(function (item) {
        batch.set(ref.doc(item.id), item);
      });

      await batch.commit();
    }

    // ── One-time localStorage → Firestore migration ───────────
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

    // ── Navbar renderer ───────────────────────────────────────
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

    // ── window.WWF public API ─────────────────────────────────
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

    // ── Auth state listener ───────────────────────────────────
    _auth.onAuthStateChanged(async function (user) {
      window.WWF.user = user || null;
      renderNav(user);

      if (user) {
        // Silently migrate any localStorage data on first sign-in
        try { await migrateLocalStorage(user.uid); } catch (e) { /* non-fatal */ }
      }

      if (typeof window.onWWFAuth === 'function') {
        window.onWWFAuth(user, window.WWF.isPremium);
      }
    });
  }

  // Kick off
  boot().catch(function (e) { console.error('WWF boot error:', e); });

})();
