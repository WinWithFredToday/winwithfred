// api/server.js -- WinWithFred Stripe Webhook Handler
// Zero npm dependencies: uses only Node.js built-in modules (http, https, crypto).
'use strict';

var http   = require('http');
var https  = require('https');
var crypto = require('crypto');

var STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
var FIREBASE_PROJECT_ID   = process.env.FIREBASE_PROJECT_ID   || '';
var FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
var FIREBASE_PRIVATE_KEY  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
var PORT = process.env.PORT || 8080;

// Stripe signature verification
function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader) return false;
  var parts  = sigHeader.split(',');
  var tPart  = parts.find(function(p) { return p.startsWith('t=');  });
  var v1Part = parts.find(function(p) { return p.startsWith('v1='); });
  if (!tPart || !v1Part) return false;
  var expected = crypto.createHmac('sha256', secret)
    .update(tPart.slice(2) + '.' + rawBody, 'utf8').digest('hex');
  try { return crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(v1Part.slice(3),'hex')); }
  catch(e) { return false; }
}

// Google OAuth2 via service account JWT
var _tok = null, _tokExp = 0;
function makeJWT() {
  var now = Math.floor(Date.now()/1000);
  var hdr = Buffer.from(JSON.stringify({alg:'RS256',typ:'JWT'})).toString('base64url');
  var pld = Buffer.from(JSON.stringify({
    iss: FIREBASE_CLIENT_EMAIL, scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now+3600
  })).toString('base64url');
  var s = crypto.createSign('RSA-SHA256');
  s.update(hdr+'.'+pld);
  return hdr+'.'+pld+'.'+s.sign(FIREBASE_PRIVATE_KEY,'base64url');
}
function httpsPost(host, path, headers, body) {
  return new Promise(function(res,rej){
    var r=https.request({hostname:host,path:path,method:'POST',headers:headers},function(s){
      var d='';s.on('data',function(c){d+=c;});
      s.on('end',function(){try{res({status:s.statusCode,body:JSON.parse(d)});}catch(e){res({status:s.statusCode,body:d});}});
    });r.on('error',rej);if(body)r.write(body);r.end();
  });
}
function httpsPatch(host, path, headers, body) {
  return new Promise(function(res,rej){
    var r=https.request({hostname:host,path:path,method:'PATCH',headers:headers},function(s){
      var d='';s.on('data',function(c){d+=c;});
      s.on('end',function(){try{res({status:s.statusCode,body:JSON.parse(d)});}catch(e){res({status:s.statusCode,body:d});}});
    });r.on('error',rej);if(body)r.write(body);r.end();
  });
}
async function getToken() {
  var now=Math.floor(Date.now()/1000);
  if(_tok&&now<_tokExp-60)return _tok;
  var body='grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion='+makeJWT();
  var r=await httpsPost('oauth2.googleapis.com','/token',
    {'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body)},body);
  if(!r.body.access_token)throw new Error('Token error: '+JSON.stringify(r.body));
  _tok=r.body.access_token;_tokExp=now+(r.body.expires_in||3600);return _tok;
}

// Firestore helpers
var strVal  = function(s){return{stringValue:s};};
var boolVal = function(b){return{booleanValue:b};};
var tsVal   = function(){return{timestampValue:new Date().toISOString()};};

async function fsSet(col,id,fields) {
  var tok=await getToken();
  var mask=Object.keys(fields).map(function(k){return'updateMask.fieldPaths='+k;}).join('&');
  var body=JSON.stringify({fields:fields});
  return httpsPatch('firestore.googleapis.com',
    '/v1/projects/'+FIREBASE_PROJECT_ID+'/databases/(default)/documents/'+col+'/'+id+'?'+mask,
    {'Authorization':'Bearer '+tok,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},body);
}
async function fsQuery(col,field,value) {
  var tok=await getToken();
  var body=JSON.stringify({structuredQuery:{
    from:[{collectionId:col}],
    where:{fieldFilter:{field:{fieldPath:field},op:'EQUAL',value:{stringValue:value}}},limit:1
  }});
  var r=await httpsPost('firestore.googleapis.com',
    '/v1/projects/'+FIREBASE_PROJECT_ID+'/databases/(default)/documents:runQuery',
    {'Authorization':'Bearer '+tok,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)},body);
  var hit=(Array.isArray(r.body)?r.body:[]).find(function(x){return x.document;});
  if(!hit)return null;
  var parts=hit.document.name.split('/');
  return{id:parts[parts.length-1],data:hit.document.fields};
}

// Event handler
async function handleEvent(event) {
  var obj=event.data.object;
  if(event.type==='checkout.session.completed'){
    var uid=obj.client_reference_id,cid=obj.customer;
    if(!uid){console.warn('Missing client_reference_id');return;}
    var r=await fsSet('users',uid,{premium:boolVal(true),premiumSince:tsVal(),stripeCustomerId:strVal(cid||'')});
    console.log('Premium ON uid:',uid,'status:',r.status);
  }
  if(event.type==='customer.subscription.deleted'){
    var cid=obj.customer;
    var doc=await fsQuery('users','stripeCustomerId',cid);
    if(!doc){console.warn('No user for customer:',cid);return;}
    var r=await fsSet('users',doc.id,{premium:boolVal(false)});
    console.log('Premium OFF customer:',cid,'status:',r.status);
  }
}

// HTTP server
http.createServer(function(req,res){
  if(req.method==='GET'&&req.url==='/api/health'){
    res.writeHead(200,{'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true,ts:Date.now()}));return;
  }
  if(req.method==='POST'&&req.url==='/api/stripe-webhook'){
    var chunks=[];
    req.on('data',function(c){chunks.push(c);});
    req.on('end',function(){
      var raw=Buffer.concat(chunks);
      if(!verifyStripeSignature(raw.toString('utf8'),req.headers['stripe-signature']||'',STRIPE_WEBHOOK_SECRET)){
        res.writeHead(400);res.end('Bad signature');return;
      }
      var event;try{event=JSON.parse(raw);}catch(e){res.writeHead(400);res.end('Bad JSON');return;}
      handleEvent(event)
        .then(function(){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({received:true}));})
        .catch(function(err){console.error(err);res.writeHead(500);res.end(JSON.stringify({error:'Internal error'}));});
    });return;
  }
  res.writeHead(404);res.end('Not found');
}).listen(PORT,function(){console.log('WWF API listening on port '+PORT);});
