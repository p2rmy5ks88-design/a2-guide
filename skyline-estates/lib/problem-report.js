/* Problem report: a privacy-safe, on-device record of what went wrong (script errors, failed promises, lost 3D
   graphics, Coach playback trouble). Nothing leaves the device by itself. In Settings → Help & data the player can
   read the report and choose to copy it or email it to support. Loaded before the game so start-up errors count.
   No names, emails, room codes, account IDs or game contents are stored: messages are trimmed and scrubbed. */
(function(){'use strict';
const KEY='skylineProblems',MAX=30,SUPPORT='kelvinaiwe@gmail.com',started=Date.now();
const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');return d&&d.v===1&&Array.isArray(d.items)?d:{v:1,items:[]}}catch(e){return{v:1,items:[]}}};
const save=d=>{try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}};
// Scrub anything personal or variable: emails, long numbers/IDs, room codes, URLs reduced to the file name.
function scrub(s){return String(s==null?'':s).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email]').replace(/\b[A-Za-z0-9_-]{20,}\b/g,'[id]')
  .replace(/\b\d{5,}\b/g,'[n]').replace(/\b[A-Z0-9]{5}\b(?=[^a-z]|$)/g,m=>/\d/.test(m)&&/[A-Z]/.test(m)?'[code]':m)
  .replace(/(?:https?|capacitor|file):\/\/[^\s)'"]*\/([^\/\s)'"?#]+)(?:\?[^\s)'"]*)?/g,'$1').replace(/\s+/g,' ').trim().slice(0,200)}
const file=u=>{try{return u?scrub(String(u).split('?')[0].split('/').pop()):''}catch(e){return''}};
function note(kind,msg,src,line){try{if(!msg)return;const d=load(),m=scrub(msg),s=file(src),l=line|0,now=Date.now();
  const hit=d.items.find(x=>x.k===kind&&x.m===m&&x.s===s&&x.l===l);
  if(hit){hit.n=(hit.n||1)+1;hit.t=now}else d.items.push({k:kind,m,s,l,n:1,t:now,up:Math.round((now-started)/1000)});
  d.items.sort((a,b)=>b.t-a.t);d.items=d.items.slice(0,MAX);save(d);if(window.__problemsUI)window.__problemsUI()}catch(e){}}
addEventListener('error',e=>{if(e&&e.target&&e.target!==window&&e.target.tagName){const t=e.target.tagName.toLowerCase();if(t==='script'||t==='link')note('load','Could not load '+t,e.target.src||e.target.href,0);return}
  note('error',String(e.message||(e.error&&e.error.message)||'Script error').replace(/^Uncaught /,''),e.filename,e.lineno)},true);
addEventListener('unhandledrejection',e=>{const r=e&&e.reason;const m=r&&(r.message||r.code)||String(r||'');if(/AbortError|aborted/i.test(m))return;note('promise',m,r&&r.stack&&(/([\w.-]+\.(?:js|html|mjs))(?:\?[^:\s)]*)?:\d+:\d+/.exec(r.stack)||[])[1],0)});
addEventListener('webglcontextlost',()=>note('graphics','3D graphics were reset by the device','',0),true);

function platform(){try{const C=window.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform())return(C.getPlatform&&C.getPlatform()==='android'?'Android app':'iPhone app');}catch(e){}return /Electron/.test(navigator.userAgent)?'Desktop app':'Web'}
function device(){const u=navigator.userAgent;let m=/OS (\d+)_(\d+)/.exec(u);if(m&&/iPhone|iPad/.test(u))return(/iPad/.test(u)?'iPadOS ':'iOS ')+m[1]+'.'+m[2];
  m=/Android (\d+(?:\.\d+)?)/.exec(u);if(m)return'Android '+m[1];m=/(Chrome|Firefox|Version)\/(\d+)/.exec(u);return(/Mac/.test(u)?'macOS':/Win/.test(u)?'Windows':/Linux/.test(u)?'Linux':'')+(m?' · '+(m[1]==='Version'?'Safari':m[1])+' '+m[2]:'')}
let appVersion='';try{const A=window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.App;if(A&&A.getInfo)A.getInfo().then(i=>{appVersion=i.version+' ('+i.build+')'}).catch(()=>{})}catch(e){}
function buildId(){try{for(const s of document.scripts){const m=/offline-assets\.js\?build=([0-9a-f]{8})/.exec(s.src||'');if(m)return m[1]}}catch(e){}return''}
const ago=t=>{const s=Math.round((Date.now()-t)/1000);return s<90?s+' s ago':s<5400?Math.round(s/60)+' min ago':s<129600?Math.round(s/3600)+' h ago':Math.round(s/86400)+' days ago'};
function report(){const d=load(),P=(()=>{try{return PREF||{}}catch(e){return window.PREF||{}}})(),c=P.coach||{},nat=(()=>{try{return window.SkylineCoach&&window.SkylineCoach._state.NAT}catch(e){return null}})();
  const lines=['Skyline Estates problem report','App: '+platform()+(appVersion?' '+appVersion:'')+(buildId()?' · build '+buildId():''),'Device: '+device()+' · screen '+screen.width+'×'+screen.height,
    'Settings: '+(P.ui==='light'?'Daylight':'Dark')+' · '+(P.flat2d?'flat board':'3D board')+' · Coach '+(c.on?'on ('+(c.voice==='natural'?'natural voice':'device voice')+')':'off')+' · FM '+(P.audio&&P.audio.radio?'on':'off')];
  if(nat&&nat.diag)lines.push('Coach playback: '+Object.entries(nat.diag).map(([k,v])=>k+' '+v).join(', ')+(nat.err?' · last error: '+scrub(nat.err):''));
  lines.push('');lines.push(d.items.length?'Recent problems (newest first):':'No problems recorded on this device.');
  d.items.forEach(x=>lines.push('• '+ago(x.t)+(x.n>1?' ×'+x.n:'')+' ['+x.k+'] '+x.m+(x.s?' ('+x.s+(x.l?':'+x.l:'')+')':'')));
  return lines.join('\n')}
function clear(){save({v:1,items:[]});if(window.__problemsUI)window.__problemsUI()}
window.SkylineProblems=Object.freeze({note,report,clear,count:()=>load().items.length,scrub});

// Settings → Help & data: "Problem report" section, mounted beside "Your data".
const CSS=`.prsec .prtxt{width:100%;min-height:120px;max-height:220px;font:12px/1.45 ui-monospace,Menlo,monospace;border-radius:10px;padding:8px 10px;border:1px solid var(--line,#0003);background:var(--panel2,#0001);color:inherit;resize:vertical}
.prsec .prbtns{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.prsec .prbtns button{min-height:36px;border-radius:999px;padding:4px 14px;border:1px solid var(--line,#0003);background:transparent;color:inherit;font-weight:700}
.prsec .prmsg{font-size:12px;opacity:.8;margin-top:6px}.prsec p{margin:4px 0 8px;font-size:13px;opacity:.85}`;
function mount(T){try{if(!T||T.querySelector('.prsec'))return;const secs=[...T.querySelectorAll('section.stp')];const data=secs.find(s=>/^Your data$/i.test((s.querySelector('h3')||{}).textContent||''));if(!data)return;
  if(!document.getElementById('prcss')){const st=document.createElement('style');st.id='prcss';st.textContent=CSS;document.head.append(st)}
  const s=document.createElement('section');s.className='stp prsec';s.innerHTML=`<h3>Problem report</h3><p>If something doesn’t work, this report helps fix it. It stays on this device. Nothing is sent unless you tap Email or Copy.</p>
   <textarea class="prtxt" readonly aria-label="Problem report" id="prText"></textarea><div class="prbtns"><button type="button" data-pr="email">Email report</button><button type="button" data-pr="copy">Copy report</button><button type="button" data-pr="clear">Clear</button></div><div class="prmsg" aria-live="polite"></div>`;
  data.before(s);const ta=s.querySelector('textarea'),msg=s.querySelector('.prmsg');const fill=()=>{if(ta.isConnected)ta.value=report()};fill();window.__problemsUI=fill;
  s.querySelector('[data-pr="copy"]').onclick=async()=>{fill();try{await navigator.clipboard.writeText(ta.value);msg.textContent='Copied. Paste it into a message to support.'}catch(e){ta.focus();ta.select();msg.textContent='Selected. Copy it from the box above.'}};
  s.querySelector('[data-pr="email"]').onclick=()=>{fill();const body=ta.value.length>1800?ta.value.slice(0,1800)+'\n…':ta.value;location.href='mailto:'+SUPPORT+'?subject='+encodeURIComponent('Skyline Estates problem report')+'&body='+encodeURIComponent('What happened (optional):\n\n\n'+body);msg.textContent='Opening your email app… Support: '+SUPPORT};
  s.querySelector('[data-pr="clear"]').onclick=()=>{clear();msg.textContent='Cleared.'}}catch(e){}}
function install(){if(typeof window.paneSettings!=='function'){try{if(typeof paneSettings!=='function')return}catch(e){return}}
  const orig=paneSettings;paneSettings=function(T){const r=orig.apply(this,arguments);mount(T);return r};}
if(document.readyState==='complete')install();else addEventListener('load',install,{once:true});
})();
