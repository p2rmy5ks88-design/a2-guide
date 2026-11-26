/* Home-owned wallet gateway: reserve and settle through the active Skyline profile.
   Child game pages never write the live coin balance. Keep escrow journal with profile balance. */
(function(){'use strict';
let ready=null,entryOptions={mode:'solo',count:2};
const load=src=>new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error('City Forge could not load. Your coins are unchanged.'));document.head.append(el)});
async function libs(){if(!ready)ready=Promise.all([window.CityForge?null:load('./lib/city-forge-rules.js'),window.CityForgeWallet?null:load('./lib/city-forge-wallet.js')]).catch(e=>{ready=null;throw e});return ready}
const CSS=`.cfe-modal{max-width:min(760px,96vw)!important;max-height:calc(100dvh - 16px);overflow-y:auto}
.cfe{display:grid;gap:10px;text-align:left}.cfe-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.cfe-head small{font-size:10px;letter-spacing:.18em;opacity:.7}.cfe-head p{margin:2px 0 0;font-size:13px;opacity:.85}
.cfe-bal{flex:none;padding:6px 12px;border-radius:999px;border:1px solid #c9a24a;font-size:12px;white-space:nowrap}.cfe-bal b{color:#c9a24a}
.cfe h4{margin:0 0 6px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.8}.cfe-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px}.cfe-row+.cfe-row{margin-top:6px}
.cfe-chip{display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-height:46px;padding:6px 11px;border-radius:12px;border:1px solid #7f8caa55;background:#ffffff0d;color:inherit;font:inherit;text-align:left;cursor:pointer}
.cfe-chip b{font-size:14px}.cfe-chip small{font-size:11px;opacity:.75}.cfe-chip.on{border:2px solid #c9a24a;background:#c9a24a22}.cfe-chip.short:not(.on){opacity:.55}
.cfe-sum{display:grid;grid-template-columns:1fr 1fr 2fr;gap:8px;padding:10px 12px;border-radius:14px;background:#c9a24a18;border:1px solid #c9a24a66}.cfe-sum small{display:block;font-size:10px;letter-spacing:.1em;opacity:.75}.cfe-sum b{font-size:16px}.cfe-sum b.gold{color:#c9a24a}
.cfe-sum p{grid-column:1/-1;margin:2px 0 0;font-size:12px}.cfe-short{color:#e0605a}.cfe-how summary{cursor:pointer;font-size:12px;font-weight:700}.cfe-how p{font-size:12px;opacity:.85;margin:6px 0 0}
@media(max-height:500px){.cfe-head p{display:none}.cfe{gap:7px}.cfe-chip{min-height:44px;padding:5px 10px}.cfe-chip b{font-size:13px}.cfe-row+.cfe-row{margin-top:4px}.cfe-head .mh{font-size:22px}}
.cfe-tablerow{display:grid;grid-template-columns:2fr 3fr;gap:6px}.cfe-tablerow .cfe-row+.cfe-row{margin-top:0}
@media(max-width:600px){.cfe-tablerow{grid-template-columns:1fr}.cfe-sum{grid-template-columns:1fr 1fr}.cfe-sum .wide{grid-column:1/-1}}`;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function adapter(){return{read:()=>JSON.parse(JSON.stringify(PREF)),write:next=>{const disk=JSON.parse(localStorage.getItem('skylinePrefs')||'{}');if(disk.coins!==PREF.coins||disk.cloudOwner!==PREF.cloudOwner||JSON.stringify(disk.cityForgeWallet)!==JSON.stringify(PREF.cityForgeWallet))throw Error('Your profile changed in another window. Reload before funding a city.');
 // One durable write contains BOTH coins and its receipt. Only then update memory and capture cloud delta.
 localStorage.setItem('skylinePrefs',JSON.stringify(next));Object.assign(PREF,next);savePref();window.SkylineCloud?.capture?.();try{refreshCoins();railProfile()}catch{}}}}
const wallet=()=>CityForgeWallet.create(CityForge,adapter());
const guarded=async fn=>{try{if(navigator.locks)return await navigator.locks.request('skyline-profile-coins',fn);return await fn()}catch(e){toast(e.message||'City Forge could not update your coins.')}};
function rawCity(){try{const raw=localStorage.getItem(CityForge.SAVE_KEY),active=wallet().status().active,parsed=CityForge.restore(raw);return active&&parsed.ok&&parsed.state.id!==active.id&&(!parsed.state.funded||wallet().status().ok&&JSON.parse(localStorage.getItem('skylinePrefs')||'{}').cityForgeWallet?.settled?.some(r=>r.id===parsed.state.id))?null:raw}catch{return null}}
async function settle(abandon=false){await libs();const r=await guarded(()=>wallet().settle(rawCity(),{abandon}));if(!r)return;if(!r.ok){toast(r.error);return}await modal({html:'<div class="mh">City Forge coins returned</div><div class="mtxt">Unused match coins: <b>'+r.refund.toLocaleString('en-US')+'</b><br>Winner bonus: <b>'+r.bonus.toLocaleString('en-US')+'</b><br>Your balance: <b>'+r.balance.toLocaleString('en-US')+'</b></div>',btns:[{k:'ok',label:'Back to Skyline Estates',primary:true}]});}
async function start(){try{await libs();const w=wallet(),status=w.status();if(!status.ok)throw Error(status.error);if(status.active){const k=await modal({html:'<div class="mh">Your funded city is reserved</div><div class="mtxt">'+status.active.reserve.toLocaleString('en-US')+' coins are reserved for this match. Resume it, or return its verified unused coins without a winner bonus.</div>',btns:[{k:'resume',label:'Resume city',primary:true},{k:'return',label:'Return unused coins'},{k:'cancel',label:'Back'}]});if(k==='resume')location.href='./city-forge.html?entry='+encodeURIComponent(status.active.id);if(k==='return')await settle(true);return}
 // One entry screen (26 Nov 2026): table, length and investment on one sheet, with a live summary of what you put in and can win.
 const sel=Object.assign({mode:'solo',ai:2,humans:2,length:'long',level:1},entryOptions.sel||{}),balance=wallet().status().coins,fmt=n=>Number(n).toLocaleString('en-US'),RIVALS=['Mia','Noah','Zara'];
 const chip=(group,value,label,sub,extra='')=>`<button type="button" class="cfe-chip" data-g="${group}" data-v="${value}" ${extra}><b>${label}</b>${sub?`<small>${sub}</small>`:''}</button>`;
 const html=`<style>${CSS}</style><div class="cfe"><div class="cfe-head"><div><small>SKYLINE ESTATES</small><div class="mh">City Forge</div><p>Build a waterfront city with your saved coins. Finish to get your unused coins back; win for a bonus.</p></div><span class="cfe-bal">Your coins <b>${fmt(balance)}</b></span></div>
  <section><h4>1 · Who's at the table</h4><div class="cfe-tablerow"><div class="cfe-row" id="cfeMode">${chip('mode','solo','Solo vs AI','Play the computer')}${chip('mode','pass','Pass & Play','Friends on this device')}</div>
   <div class="cfe-row" id="cfeSolo">${[1,2,3].map(n=>chip('ai',n,n+' rival'+(n>1?'s':''),RIVALS.slice(0,n).join(', '))).join('')}</div>
   <div class="cfe-row" id="cfePass" hidden>${[2,3,4].map(n=>chip('humans',n,n+' players','You + '+(n-1)+' friend'+(n>2?'s':''))).join('')}</div></div></section>
  <section><h4>2 · Match length</h4><div class="cfe-row">${chip('length','quick','Quick','8 rounds · ~15 min')}${chip('length','standard','Standard','12 rounds · ~25 min')}${chip('length','long','Long','20 rounds · ~40 min')}</div></section>
  <section><h4>3 · Investment</h4><div class="cfe-row" id="cfeLevel">${chip('level',0,'Practice','Free · no rewards')}${CityForge.LEVELS.map(l=>chip('level',l.id,l.name,'×'+l.id+' coins')).join('')}</div></section>
  <div class="cfe-sum" id="cfeSum"></div>
  <details class="cfe-how"><summary>How the investment works</summary><p>Your investment becomes your match budget: it covers every build and purchase for the whole match, and nothing else is taken from your saved coins. When the match ends, every match coin you did not spend comes back to you, and a win adds the bonus. More rivals and a higher level mean a bigger bonus. Leaving early returns your unspent coins with no bonus. Rivals and friends play with equal match-only budgets. Practice costs nothing and pays nothing.</p></details></div>`;
 const k=await modal({cls:'wide cfe-modal',html,btns:[{k:'cancel',label:'Back'},{k:'go',label:'Continue',primary:true}],onMount:pn=>{
  const go=[...pn.querySelectorAll('button')].find(x=>x.textContent==='Continue');
  const paint=()=>{pn.querySelectorAll('.cfe-chip').forEach(c=>{const v=c.dataset.v,g=c.dataset.g;c.classList.toggle('on',String(sel[g])===v);c.setAttribute('aria-pressed',String(sel[g])===v)});
   pn.querySelector('#cfeSolo').hidden=sel.mode!=='solo';pn.querySelector('#cfePass').hidden=sel.mode!=='pass';
   pn.querySelectorAll('#cfeLevel .cfe-chip').forEach(c=>{const lv=+c.dataset.v;if(!lv)return;const q=CityForge.quote(sel.length,{level:lv,mode:sel.mode,ai:sel.ai});c.querySelector('small').textContent=fmt(q.reserve)+' coins';c.classList.toggle('short',balance<q.reserve)});
   const sum=pn.querySelector('#cfeSum');
   if(!sel.level){sum.innerHTML='<div><small>PRACTICE</small><b>Free</b></div><div><small>REWARDS</small><b>None</b></div><div class="wide"><small>GOOD FOR</small><b>Learning the city</b></div>';if(go){go.textContent='Start free practice';go.disabled=false}}
   else{const q=CityForge.quote(sel.length,{level:sel.level,mode:sel.mode,ai:sel.ai}),short=Math.max(0,q.reserve-balance);
    sum.innerHTML=`<div><small>YOU INVEST</small><b>${fmt(q.reserve)}</b></div><div><small>WIN BONUS</small><b class="gold">+${fmt(q.winnerBonus)}</b></div><div class="wide"><small>YOU GET BACK</small><b>Unspent coins${sel.mode==='solo'?' + bonus if you win':' + bonus if you win your seat'}</b></div>`+(short?`<p class="cfe-short">You need ${fmt(short)} more coins for this level. Pick a lower level or play Practice.</p>`:`<p class="cfe-after">Balance while you play: ${fmt(balance-q.reserve)} coins.</p>`);
    if(go){go.textContent=short?'Need '+fmt(short)+' more coins':'Invest '+fmt(q.reserve)+' & play';go.disabled=!!short}}
   entryOptions={...entryOptions,sel:{...sel}}};
  pn.addEventListener('click',e=>{const c=e.target.closest('.cfe-chip');if(!c)return;const g=c.dataset.g;sel[g]=g==='mode'||g==='length'?c.dataset.v:Number(c.dataset.v);try{sfx('tap')}catch{}paint()});paint()}});
 if(k!=='go')return;const o=entryOptions.sel||sel;
 if(!o.level){location.href='./city-forge.html?practice=1&mode='+o.mode+'&count='+(o.mode==='pass'?o.humans:o.ai)+'&length='+o.length;return}
 const id='forge-'+crypto.randomUUID(),seed=crypto.getRandomValues(new Uint32Array(1))[0];const r=await guarded(()=>wallet().enter({id,seed,features:2,length:o.length,level:o.level,mode:o.mode,ai:o.ai,humans:o.humans,names:[typeof myName==='function'?myName()||'You':'You']}));if(!r)return;if(!r.ok){toast(r.error);return}location.href='./city-forge.html?entry='+encodeURIComponent(r.receipt.id);
 }catch(e){toast(e.message||'City Forge is unavailable.')}}
window.SkylineForgeHome={start,settle};

})();
