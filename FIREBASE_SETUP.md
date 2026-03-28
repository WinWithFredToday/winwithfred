# WinWithFred — Firebase Setup Guide

Follow these steps once to get user accounts and data persistence working on your site.
The whole process takes about 15 minutes.

---

## Step 1 — Create a Firebase Project

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"**
3. Name it `winwithfred` → Continue
4. Disable Google Analytics (optional) → **Create project**

---

## Step 2 — Add a Web App

1. Inside your project, click the **`</>`** (Web) icon
2. App nickname: `WinWithFred Web`
3. Click **"Register app"**
4. You'll see a `firebaseConfig` object — **copy it**

---

## Step 3 — Paste Your Config

Open **`firebase-config.js`** and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey:            "YOUR_ACTUAL_KEY",
  authDomain:        "winwithfred.firebaseapp.com",
  projectId:         "winwithfred",
  storageBucket:     "winwithfred.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};
```

---

## Step 4 — Enable Authentication

1. In Firebase Console → left sidebar → **Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, enable:
   - **Email/Password** → toggle on → Save
   - **Google** → toggle on → enter your support email → Save

---

## Step 5 — Create Firestore Database

1. In Firebase Console → left sidebar → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** → Next
4. Select a location (pick the one closest to your users, e.g. `us-east1`) → **Done**

---

## Step 6 — Set Firestore Security Rules

1. In Firestore → **Rules** tab
2. Replace the default rules with this:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

3. Click **Publish**

---

## Step 7 — Add Your Domain (when you go live)

1. In Firebase Console → Authentication → **Settings** tab
2. Under **Authorized domains**, add: `winwithfred.com`

---

## Step 8 — Deploy to DigitalOcean

Upload all your site files to your DigitalOcean droplet. The site needs to be
served from a web server (nginx) for Firebase to work — it won't work when
opening files directly from your computer.

See the DigitalOcean setup guide for server configuration instructions.

---

## That's it!

Once deployed, users can:
- Create an account with email/password or Google Sign-In
- Log in from any device and see all their data
- Have goals, habits, journal entries, and quiz results saved permanently to the cloud
- Sign out and back in without losing anything

---

## Data Structure (for reference)

Your Firestore database will automatically organize user data like this:

```
users/
  {userId}/
    goals/         ← Goal Tracker entries
    habits/        ← Habit Builder entries + daily history
    journal/       ← Journal entries
    quizResults/   ← Mindset quiz scores
```

Each user's data is private and can only be accessed by them.
