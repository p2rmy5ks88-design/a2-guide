/* One loading screen for every Career board (owner plan, phase 3, 24 Nov 2026). Shown from the first paint until
   the board is ready to play (its start screen, or the live match when it opens straight from Career), then fades
   out. Follows the Daylight setting. */
(function(){'use strict';
if(window.__boardLoading)return;window.__boardLoading=true;
let light=false;try{light=(JSON.parse(localStorage.getItem('skylinePrefs')||'{}').ui)==='light'}catch(e){}
const bq=new URLSearchParams(location.search).get('board'),name=bq==='empire'?'Crown Empire':bq==='dominion'?'Skyline Dominion':document.title.split('—')[0].trim();
const css=`#boardLoading{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:${light?'radial-gradient(circle at 50% 40%,#ffffff,#e3e9f1 80%)':'radial-gradient(circle at 50% 40%,#17406a,#060d1c 80%)'};
 color:${light?'#13284a':'#fff4d8'};font:600 14px/1.4 system-ui,-apple-system,sans-serif;transition:opacity .35s ease}
#boardLoading.bye{opacity:0;pointer-events:none}
#boardLoading .bl{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center}
#boardLoading small{letter-spacing:.32em;font-size:11px;color:${light?'#9a6c12':'#e2b25a'}}
#boardLoading b{font:800 26px Georgia,serif;letter-spacing:.04em;color:${light?'#13284a':'#ffdf9b'}}
#boardLoading i{width:34px;height:34px;border-radius:50%;border:3px solid ${light?'#c9a24a55':'#e2b25a44'};border-top-color:#e2b25a;animation:blspin .9s linear infinite}
@keyframes blspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#boardLoading i{animation:none}}`;
const st=document.createElement('style');st.textContent=css;(document.head||document.documentElement).append(st);
const ov=document.createElement('div');ov.id='boardLoading';ov.setAttribute('role','status');ov.setAttribute('aria-label','Loading '+name);
ov.innerHTML=`<div class="bl"><small>SKYLINE ESTATES</small><b></b><i aria-hidden="true"></i></div>`;ov.querySelector('b').textContent=name;
const mount=()=>{if(document.body&&!ov.isConnected)document.body.prepend(ov)};
if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount,{once:true});
const shown=id=>{const e=document.getElementById(id);return !!(e&&!e.hidden&&getComputedStyle(e).display!=='none')};
const ready=()=>{try{
 if(window.__cv&&window.__cv.state())return true;if(window.__cc&&window.__cc.state())return true;
 if(window.__skylineApproved&&window.__skylineApproved.state())return true;
 if(new URLSearchParams(location.search).get('autostart')==='1')return false;
 return document.readyState==='complete'&&(shown('start')&&document.querySelector('#start .card')||shown('setup'))}catch(e){return false}};
const t0=Date.now();
(function check(){if(ready()||Date.now()-t0>15000){ov.classList.add('bye');setTimeout(()=>ov.remove(),400);return}setTimeout(check,120)})();
})();
