/* Guided first turn for the Career boards (owner plan, phase 2, 24 Nov 2026).
   One short tip at a time, shown the first time each moment happens on that board, then never again.
   "Skip tips" turns the guide off for that board. Used by City Ventures, Crossroads Capital,
   Skyline Dominion and Crown Empire.

   SkylineBoardGuide.start({
     key:'cv',                                        // remembered per board
     facts:()=>({mine,kind,owns}),                    // null while the board is not ready
     steps:[{id,when:f=>bool,title,text}]             // shown in order of first match
   }) */
(function(){'use strict';
if(window.SkylineBoardGuide)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=`#boardGuide{position:fixed;z-index:35;left:50%;top:calc(env(safe-area-inset-top,0px) + 58px);transform:translateX(-50%);width:min(380px,calc(100vw - 40px));
 box-sizing:border-box;padding:10px 12px 10px 14px;border-radius:14px;border:1.5px solid #e2b25a;background:linear-gradient(160deg,#164a78f5,#0a1d38f8);color:#fff;
 box-shadow:0 10px 26px #0009;font:500 13px/1.4 system-ui,-apple-system,sans-serif;animation:bgIn .25s ease-out}
#boardGuide b{display:block;color:#ffdf9b;font-size:13.5px;margin-bottom:2px}
#boardGuide .bgRow{display:flex;justify-content:flex-end;gap:6px;margin-top:8px}
#boardGuide button{min-height:44px;min-width:44px;padding:4px 14px;border-radius:11px;border:1.5px solid #e2b25a;background:linear-gradient(#225f92,#0b2a50);color:#fff;font-weight:750;font-size:13px}
#boardGuide button.ok{background:linear-gradient(#f9d87e,#c4902d);color:#1d1609}
#boardGuide .n{font-size:11px;color:#9fb3c8;margin-right:auto;align-self:center}
@keyframes bgIn{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}`;

function start(o){
 const KEY='skylineBoardGuide:'+(o.key||'board');
 let seen;try{seen=JSON.parse(localStorage.getItem(KEY)||'[]')}catch(e){seen=[]}
 if(seen==='off'||!Array.isArray(seen))return {stop(){}};
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(seen))}catch(e){}};
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 let box=null,current=null,timer=null;
 const total=o.steps.length;
 function close(){if(box){box.remove();box=null}current=null}
 function show(step){current=step.id;box=document.createElement('div');box.id='boardGuide';box.setAttribute('role','status');
  box.innerHTML=`<b>${esc(step.title)}</b>${esc(step.text)}<div class="bgRow"><span class="n">Tip ${o.steps.indexOf(step)+1} of ${total}</span><button type="button" class="skip">Skip tips</button><button type="button" class="ok">Got it</button></div>`;
  box.querySelector('.ok').onclick=()=>{seen.push(step.id);save();close()};
  box.querySelector('.skip').onclick=()=>{seen='off';save();close();clearInterval(timer)};
  document.body.append(box)}
 function tick(){if(seen==='off'){clearInterval(timer);return}
  if(seen.length>=total){clearInterval(timer);return}
  let f=null;try{f=o.facts()}catch(e){f=null}if(!f){close();return}
  if(current){const cur=o.steps.find(x=>x.id===current);if(cur&&cur.until&&cur.until(f)){seen.push(cur.id);save();close()}return}
  const next=o.steps.find(x=>!seen.includes(x.id)&&x.when(f));if(next)show(next)}
 timer=setInterval(tick,700);tick();
 return {stop(){clearInterval(timer);close()}};
}
window.SkylineBoardGuide=Object.freeze({start});
})();
