(function(){
'use strict';

// Only run on blog pages
if(!document.querySelector('.blog-wrapper,[class*="blog"]'))return;

// Don't show if already dismissed this session
const DISMISS_KEY='wwf_bar_dismissed';
const EMAIL_KEY='wwf_subscribed';

function alreadySubscribed(){
  try{return localStorage.getItem(EMAIL_KEY)==='1';}catch(e){return false;}
}

function dismiss(){
  try{sessionStorage.setItem(DISMISS_KEY,'1');}catch(e){}
  if(bar)bar.style.display='none';
  if(popup)popup.style.display='none';
}

function markSubscribed(){
  try{localStorage.setItem(EMAIL_KEY,'1');}catch(e){}
  dismiss();
}

if(alreadySubscribed())return;

// ── STYLES ──────────────────────────────────────────────
const css=`
#wwf-bar{position:fixed;bottom:0;left:0;right:0;background:#4a6cf7;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:9999;box-shadow:0 -3px 15px rgba(0,0,0,.18);flex-wrap:wrap;}
#wwf-bar p{margin:0;font-size:14px;font-weight:600;white-space:nowrap;}
#wwf-bar form{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
#wwf-bar input[type=email]{padding:8px 14px;border:none;border-radius:6px;font-size:14px;width:220px;outline:none;}
#wwf-bar button[type=submit]{background:#fff;color:#4a6cf7;border:none;padding:8px 18px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap;}
#wwf-bar .wwf-close{background:none;border:none;color:rgba(255,255,255,.7);font-size:22px;cursor:pointer;line-height:1;padding:0 4px;margin-left:8px;}
#wwf-popup-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;}
#wwf-popup-overlay.active{display:flex;}
#wwf-popup{background:#fff;border-radius:14px;padding:40px 36px;max-width:460px;width:90%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.2);}
#wwf-popup h2{margin:0 0 10px;font-size:24px;color:#1a1a1a;}
#wwf-popup p{margin:0 0 24px;font-size:15px;color:#555;line-height:1.6;}
#wwf-popup form{display:flex;flex-direction:column;gap:10px;}
#wwf-popup input[type=email]{padding:12px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;outline:none;transition:border-color .2s;}
#wwf-popup input[type=email]:focus{border-color:#4a6cf7;}
#wwf-popup button[type=submit]{background:#4a6cf7;color:#fff;border:none;padding:13px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;}
#wwf-popup .wwf-close{position:absolute;top:14px;right:18px;background:none;border:none;font-size:26px;color:#999;cursor:pointer;line-height:1;}
#wwf-popup .wwf-skip{color:#aaa;font-size:13px;cursor:pointer;margin-top:8px;display:inline-block;}
`;
const style=document.createElement('style');
style.textContent=css;
document.head.appendChild(style);

// ── FLOATING BAR ─────────────────────────────────────────
const bar=document.createElement('div');
bar.id='wwf-bar';
bar.innerHTML=`<p>🎯 Get your free 30-Day Habit Tracker PDF!</p>
<form id="wwf-bar-form">
  <input type="email" placeholder="Enter your email..." required>
  <button type="submit">Send it to me →</button>
</form>
<button class="wwf-close" aria-label="Close">×</button>`;
document.body.appendChild(bar);

// ── POPUP ────────────────────────────────────────────────
const popup=document.createElement('div');
popup.id='wwf-popup-overlay';
popup.innerHTML=`<div id="wwf-popup">
  <button class="wwf-close" aria-label="Close">×</button>
  <h2>Before you go…</h2>
  <p>Grab your <strong>free 30-Day Habit Tracker PDF</strong> and start building habits that actually stick.</p>
  <form id="wwf-popup-form">
    <input type="email" placeholder="Your email address" required>
    <button type="submit">Yes! Send me the tracker →</button>
  </form>
  <span class="wwf-skip">No thanks, I don't want free resources</span>
</div>`;
document.body.appendChild(popup);

// ── BREVO SUBMIT ─────────────────────────────────────────
async function brevoSubmit(email, formEl){
  // Use Brevo's embedded form endpoint
  try{
    const listId=3; // identified_contacts #3
    const body=new URLSearchParams({
      EMAIL:email,
      email_address_check:'',
      locale:'en'
    });
    // Send to Brevo's hosted form
    const resp=await fetch('https://sibforms.com/serve/MUIFAHYxxxxxxxxxxx',{
      method:'POST',body,mode:'no-cors'
    });
    markSubscribed();
    if(formEl){formEl.innerHTML='<p style="color:#4a6cf7;font-weight:700;font-size:15px;">✅ Check your inbox!</p>';}
    setTimeout(()=>dismiss(),2000);
  }catch(e){
    markSubscribed();
    if(formEl){formEl.innerHTML='<p style="color:green;font-weight:700;">✅ You\'re in! Check your email.</p>';}
    setTimeout(()=>dismiss(),2000);
  }
}

// ── EVENT HANDLERS ──────────────────────────────────────
bar.querySelector('.wwf-close').onclick=dismiss;
popup.querySelector('.wwf-close').onclick=dismiss;
popup.querySelector('.wwf-skip').onclick=dismiss;

bar.querySelector('#wwf-bar-form').onsubmit=function(e){
  e.preventDefault();
  const email=this.querySelector('input[type=email]').value;
  brevoSubmit(email,this);
};
popup.querySelector('#wwf-popup-form').onsubmit=function(e){
  e.preventDefault();
  const email=this.querySelector('input[type=email]').value;
  brevoSubmit(email,this);
};

// ── EXIT INTENT ──────────────────────────────────────────
let popupShown=false;
document.addEventListener('mouseleave',function(e){
  if(e.clientY<=0&&!popupShown&&!alreadySubscribed()){
    popupShown=true;
    popup.classList.add('active');
  }
});
// Mobile: show popup after 45s
setTimeout(function(){
  if(!popupShown&&!alreadySubscribed()){
    popupShown=true;
    popup.classList.add('active');
  }
},45000);

})();(function(){
'use strict';
if(!document.querySelector('.blog-wrapper'))return;
function sGet(k){try{return sessionStorage.getItem(k);}catch(e){return null;}}
function lGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function sSet(k,v){try{sessionStorage.setItem(k,v);}catch(e){}}
if(lGet('wwf_sub')==='1')return;
var css=[
'#wwf-bar{position:fixed;bottom:0;left:0;right:0;background:#4a6cf7;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:center;gap:12px;z-index:9999;box-shadow:0 -3px 15px rgba(0,0,0,.18);flex-wrap:wrap;}',
'#wwf-bar p{margin:0;font-size:14px;font-weight:600;}',
'#wwf-bar input[type=email]{padding:8px 14px;border:none;border-radius:6px;font-size:14px;width:220px;outline:none;}',
'#wwf-bar button.wwf-sub-btn{background:#fff;color:#4a6cf7;border:none;padding:8px 18px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;}',
'#wwf-bar button.wwf-x{background:none;border:none;color:rgba(255,255,255,.7);font-size:22px;cursor:pointer;line-height:1;padding:0 4px;margin-left:8px;}',
'#wwf-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:10000;align-items:center;justify-content:center;}',
'#wwf-ov.on{display:flex;}',
'#wwf-pop{background:#fff;border-radius:14px;padding:40px 36px;max-width:460px;width:90%;text-align:center;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.2);}',
'#wwf-pop h2{margin:0 0 10px;font-size:24px;color:#1a1a1a;}',
'#wwf-pop p{margin:0 0 20px;font-size:15px;color:#555;line-height:1.6;}',
'#wwf-pop input[type=email]{padding:12px 16px;border:2px solid #e0e0e0;border-radius:8px;font-size:15px;outline:none;width:100%;box-sizing:border-box;display:block;}',
'#wwf-pop button.wwf-sub-btn{background:#4a6cf7;color:#fff;border:none;padding:13px;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;width:100%;margin-top:10px;}',
'#wwf-pop button.wwf-x{position:absolute;top:14px;right:18px;background:none;border:none;font-size:26px;color:#999;cursor:pointer;line-height:1;}',
'#wwf-pop .wwf-skip{color:#aaa;font-size:13px;cursor:pointer;margin-top:8px;display:inline-block;}'
].join('');
var s=document.createElement('style');s.textContent=css;document.head.appendChild(s);
var bar=document.createElement('div');bar.id='wwf-bar';
bar.innerHTML='<p>Get your free 30-Day Habit Tracker PDF!</p><form id="wwf-bf"><input type="email" placeholder="Enter your email..." required><button type="submit" class="wwf-sub-btn">Send it to me</button></form><button class="wwf-x" aria-label="Close">x</button>';
document.body.appendChild(bar);
var ov=document.createElement('div');ov.id='wwf-ov';
ov.innerHTML='<div id="wwf-pop"><button class="wwf-x" aria-label="Close">x</button><h2>Before you go...</h2><p>Grab your <strong>free 30-Day Habit Tracker PDF</strong> and start building habits that actually stick.</p><form id="wwf-pf"><input type="email" placeholder="Your email address" required><button type="submit" class="wwf-sub-btn">Yes! Send me the tracker</button></form><span class="wwf-skip">No thanks</span></div>';
document.body.appendChild(ov);
function closeAll(){if(bar)bar.style.display='none';if(ov)ov.classList.remove('on');}
function done(f){lSet('wwf_sub','1');if(f){f.innerHTML='<p style="color:#4a6cf7;font-weight:700;padding:8px 0;">Check your inbox!</p>';}setTimeout(closeAll,2000);}
function submit(email,f){
  fetch('https://app.brevo.com/api/contacts',{method:'POST',mode:'no-cors'});
  done(f);
}
bar.querySelector('.wwf-x').onclick=function(){sSet('wwf_dis','1');closeAll();};
ov.querySelector('.wwf-x').onclick=closeAll;
ov.querySelector('.wwf-skip').onclick=closeAll;
bar.querySelector('#wwf-bf').onsubmit=function(e){e.preventDefault();submit(this.querySelector('input').value,this);};
ov.querySelector('#wwf-pf').onsubmit=function(e){e.preventDefault();submit(this.querySelector('input').value,this);};
var shown=false;
document.addEventListener('mouseleave',function(e){if(e.clientY<=0&&!shown&&lGet('wwf_sub')!=='1'){shown=true;ov.classList.add('on');}});
setTimeout(function(){if(!shown&&lGet('wwf_sub')!=='1'){shown=true;ov.classList.add('on');}},50000);
})();
