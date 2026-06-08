// api/server.js -- WinWithFred Stripe Webhook Handler
// Zero npm dependencies — uses only Node.js built-in modules.
// Deployed as a DigitalOcean App Platform service alongside the static site.
'use strict';

var http   = require('http');
var https  = require('https');
var crypto = require('crypto');

// ---------------------------------------------------------------------------
// Config from environment variables
// ---------------------------------------------------------------------------
var STRIPE_WEBHOOK_SECRET  = process.env.STRIPE_WEBHOOK_SECRET  || '';
var FIREBASE_PROJECT_ID    = process.env.FIREBASE_PROJECT_ID    || '';
var FIREBASE_CLIENT_EMAIL  = process.env.FIREBASE_CLIENT_EMAIL  || '';
var FIREBASE_PRIVATE_KEY   = (process.env.FIREBASE_PRIVATE_KEY  || '').replace(/\\n/g, '\n');
var PORT = process.env.PORT || 8080;

// ---------------------------------------------------------------------------
// Stripe signature verification (HMAC-SHA256, no Stripe SDK needed)
// ---------------------------------------------------------------------------
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  var parts = sigHeader.split(',');
  var tPart  = parts.find(function(p) { return p.startsWith('t=');  });
  var v1Part = parts.find(function(p) { return p.startsWith('v1='); });
  if (!tPart || !v1Part) return false;
  var t  = tPart.slice(2);
  var v1 = v1Part.slice(3);
  var payload  = t + '.' + rawBody;
  var expected = crypto.createHmac('sha256', secret).update(payload, 'utf8').digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(v1, 'hex'));
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Google service-account JWT → short-lived access token
// ---------------------------------------------------------------------------
var _accessToken    = null;
var _tokenExpiresAt = 0;

function createServiceAccountJWT() {
  var now = Math.floor(Date.now() / 1000);
  var header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  var payload = Buffer.from(JSON.stringify({
    iss:   FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600
  })).toString('base64url');
  var sign = crypto.createSign('RSA-SHA256');
  sign.update(header + '.' + payload);
  var sig = sign.sign(FIREBASE_PRIVATE_KEY, 'base64url');
  return header + '.' + payload + '.' + sig;
}

function fetchAccessToken() {
  return new Promise(function(resolve, reject) {
    var jwt  = createServiceAccountJWT();
    var body = 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt;
    var req  = https.request({
      hostname: 'oauth2.googleapis.com',
      path:     '/token',
      method:   'POST',
      headers: {
        'Content-Type':   'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try {
          var parsed = JSON.parse(data);
          if (!parsed.access_token) return reject(new Error('No access_token: ' + data));
          resolve(parsed);
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function getAccessToken() {
  var now = Math.floor(Date.now() / 1000);
  if (_accessToken && now < _tokenExpiresAt - 60) return _accessToken;
  var result = await fetchAccessToken();
  _accessToken    = result.access_token;
  _tokenExpiresAt = Math.floor(Date.now() / 1000) + (result.expires_in || 3600);
  return _accessToken;
}

// ---------------------------------------------------------------------------
// Firestore REST helpers
// ---------------------------------------------------------------------------
function httpsRequest(options, body) {
  return new Promise(function(resolve, reject) {
    var req = https.request(options, function(res) {
      var data = '';
      res.on('data', function(c) { data += c; });
      res.on('end', function() {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// PATCH a Firestore document (merge / upsert specific fields)
async function firestoreSet(collection, docId, fields) {
  var token     = await getAccessToken();
  var fieldKeys = Object.keys(fields);
  var mask      = fieldKeys.map(function(k) { return 'updateMask.fieldPaths=' + k; }).join('&');
  var body      = JSON.stringify({ fields: fields });
  var path      = '/v1/projects/' + FIREBASE_PROJECT_ID +
                  '/databases/(default)/documents/' + collection + '/' + docId +
                  '?' + mask;
  return httpsRequest({
    hostname: 'firestore.googleapis.com',
    path:     path,
    method:   'PATCH',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
}

// Query Firestore for the first document where field == value
async function firestoreQuery(collection, field, value) {
  var token = await getAccessToken();
  var body  = JSON.stringify({
    structuredQuery: {
      from:  [{ collectionId: collection }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op:    'EQUAL',
          value: { stringValue: value }
        }
      },
      limit: 1
    }
  });
  var path = '/v1/projects/' + FIREBASE_PROJECT_ID +
             '/databases/(default)/documents:runQuery';
  var res = await httpsRequest({
    hostname: 'firestore.googleapis.com',
    path:     path,
    method:   'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type':  'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  }, body);
  // Response is an array; first result has .document if found
  var results = Array.isArray(res.body) ? res.body : [];
  var hit     = results.find(function(r) { return r.document; });
  if (!hit) return null;
  // Extract the document name (last segment = doc ID)
  var nameParts = hit.document.name.split('/');
  return { id: nameParts[nameParts.length - 1], data: hit.document.fields };
}

// ---------------------------------------------------------------------------
// Firestore field value helpers
// ---------------------------------------------------------------------------
function strVal(s)  { return { stringValue:  s }; }
function boolVal(b) { return { booleanValue: b }; }
function tsVal()    { return { timestampValue: new Date().toISOString() }; }

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
var server = http.createServer(function(req, res) {
  // Health check
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ts: Date.now() }));
    return;
  }

  // Stripe webhook
  if (req.method === 'POST' && req.url === '/api/stripe-webhook') {
    var chunks = [];
    req.on('data', function(c) { chunks.push(c); });
    req.on('end', function() {
      var rawBody = Buffer.concat(chunks);
      var sigHeader = req.headers['stripe-signature'] || '';

      // 1. Verify signature
      if (!verifyStripeSignature(rawBody.toString('utf8'), sigHeader, STRIPE_WEBHOOK_SECRET)) {
        console.error('Webhook signature verification failed');
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Webhook Error: Invalid signature');
        return;
      }

      // 2. Parse event
      var event;
      try { event = JSON.parse(rawBody.toString('utf8')); }
      catch(e) {
        res.writeHead(400);
        res.end('Bad JSON');
        return;
      }

      // 3. Handle event async
      handleEvent(event)
        .then(function() {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ received: true }));
        })
        .catch(function(err) {
          console.error('Event handler error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal error' }));
        });
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------
async function handleEvent(event) {
  var obj = event.data.object;

  // checkout.session.completed → set premium: true
  if (event.type === 'checkout.session.completed') {
    var uid        = obj.client_reference_id;
    var customerId = obj.customer;
    if (!uid) {
      console.warn('checkout.session.completed missing client_reference_id');
      return;
    }
    var fields = {
      premium:          boolVal(true),
      premiumSince:     tsVal(),
      stripeCustomerId: strVal(customerId || '')
    };
    var result = await firestoreSet('users', uid, fields);
    console.log('Premium ON for uid:', uid, '| Firestore status:', result.status);
  }

  // customer.subscription.deleted → set premium: false
  if (event.type === 'customer.subscription.deleted') {
    var customerId = obj.customer;
    var doc = await firestoreQuery('users', 'stripeCustomerId', customerId);
    if (!doc) {
      console.warn('No user found for Stripe customer:', customerId);
      return;
    }
    var result = await firestoreSet('users', doc.id, { premium: boolVal(false) });
    console.log('Premium OFF for customer:', customerId, '| Firestore status:', result.status);
  }
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(PORT, function() {
  console.log('WWF API listening on port ' + PORT);
});
