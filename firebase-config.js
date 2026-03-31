// ================================================================
// WinWithFred — Firebase Configuration
// ================================================================
// SETUP: Replace the placeholder values below with your actual
// Firebase project credentials.
//
// How to get your config:
//   1. Go to console.firebase.google.com
//   2. Create a new project (call it "winwithfred")
//   3. Click the </> Web icon to add a web app
//   4. Copy the firebaseConfig values and paste them below
//   5. In Firebase Console → Authentication → Sign-in method:
//      Enable "Email/Password" and "Google"
//   6. In Firebase Console → Firestore Database:
//      Click "Create database" → Start in production mode → Done
// ================================================================

const firebaseConfig = {
  apiKey:            "AIzaSyDK8dYLaQKpoPi9kDCdDVmO_WRRAwHz7Xo",
  authDomain:        "winwithfred-53df4.firebaseapp.com",
  projectId:         "winwithfred-53df4",
  storageBucket:     "winwithfred-53df4.firebasestorage.app",
  messagingSenderId: "1071467470411",
  appId:             "1:1071467470411:web:7e76444ebad384eb2d77ce",
  measurementId:     "G-CX355GZZM2"
};

firebase.initializeApp(firebaseConfig);

const auth           = firebase.auth();
const db             = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// ── Shared Auth Helpers ──────────────────────────────────────────

// Call this on any page that requires login. If not authenticated,
// redirects to login.html. If authenticated, calls callback(user).
function requireAuth(callback) {
  auth.onAuthStateChanged(user => {
    if (!user) {
      window.location.href = 'login.html';
    } else {
      callback(user);
    }
  });
}

// Renders the user section of the navbar.
// Call after DOMContentLoaded on every page that has a navbar.
function initAuthNavbar(activePage) {
  auth.onAuthStateChanged(user => {
    const navEl = document.getElementById('auth-nav');
    if (!navEl) return;
    if (user) {
      const initial = (user.displayName || user.email || '?')[0].toUpperCase();
      navEl.innerHTML = `
        <div class="nav-user">
          <a href="profile.html" style="text-decoration:none;display:flex;align-items:center;gap:8px;">
            <div class="nav-avatar" title="${user.displayName || user.email}">${initial}</div>
            <span class="nav-name">${user.displayName ? user.displayName.split(' ')[0] : user.email}</span>
          </a>
          <button class="nav-logout" onclick="auth.signOut().then(()=>window.location.href='index.html')">Sign Out</button>
        </div>
      `;
    } else {
      navEl.innerHTML = `<a href="login.html" class="btn btn-primary btn-sm">Sign In →</a>`;
    }
  });
}

// Firestore helpers
const userRef = (uid) => db.collection('users').doc(uid);
const goalsRef = (uid) => userRef(uid).collection('goals');
const habitsRef = (uid) => userRef(uid).collection('habits');
const journalRef = (uid) => userRef(uid).collection('journal');
const quizRef = (uid) => userRef(uid).collection('quizResults');
