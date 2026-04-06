// api/server.js -- WinWithFred Stripe Webhook Handler
// Receives Stripe events and updates Firestore premium status.
// Deployed as a DigitalOcean App Platform service alongside the static site.

'use strict';

var express  = require('express');
var Stripe   = require('stripe');
var admin    = require('firebase-admin');

// ---------------------------------------------------------------------------
// Firebase Admin SDK init
// ---------------------------------------------------------------------------
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});
var db = admin.firestore();

// ---------------------------------------------------------------------------
// Stripe
// ---------------------------------------------------------------------------
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------
var app = express();

// Health check (used by DO to confirm the service is running)
app.get('/api/health', function (req, res) {
  res.json({ ok: true, ts: Date.now() });
});

// Stripe webhook -- must receive raw body for signature verification
app.post(
  '/api/stripe-webhook',
  express.raw({ type: 'application/json' }),
  async function (req, res) {
    var sig = req.headers['stripe-signature'];
    var event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature error:', err.message);
      return res.status(400).send('Webhook Error: ' + err.message);
    }

    var obj = event.data.object;

    try {
      if (event.type === 'checkout.session.completed') {
        var uid        = obj.client_reference_id;
        var customerId = obj.customer;
        if (uid) {
          await db.collection('users').doc(uid).set({
            premium:          true,
            premiumSince:     admin.firestore.FieldValue.serverTimestamp(),
            stripeCustomerId: customerId || null
          }, { merge: true });
          console.log('Premium ON for uid:', uid);
        } else {
          console.warn('checkout.session.completed missing client_reference_id');
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        var customerId = obj.customer;
        var snap = await db.collection('users')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();
        if (!snap.empty) {
          await snap.docs[0].ref.set({ premium: false }, { merge: true });
          console.log('Premium OFF for customer:', customerId);
        } else {
          console.warn('No user found for Stripe customer:', customerId);
        }
      }

    } catch (err) {
      console.error('Webhook handler error:', err);
      return res.status(500).json({ error: 'Internal error' });
    }

    res.json({ received: true });
  }
);

var PORT = process.env.PORT || 8080;
app.listen(PORT, function () {
  console.log('WWF API listening on port ' + PORT);
});
