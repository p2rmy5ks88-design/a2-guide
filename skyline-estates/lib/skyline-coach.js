/* Skyline Coach v1 — invisible background voice commentary (opt-in, OFF by default).
   - Engine: pluggable adapter. The web adapter uses the browser's built-in speechSynthesis (no paid or external
     service). A native adapter (iOS AVSpeechSynthesizer / Android TextToSpeech) can be registered later with
     SkylineCoach.useEngine({...}) without touching event handling.
   - Events: derived from COMMITTED game state (snapshot diffs) plus a few strictly matched committed log lines, so the
     same code works for offline games, classic online guests and server-authoritative Living City rooms. A new game,
     reload, reconnect or large sync jump only sets a baseline: history is never read out.
   - Priorities: 1 critical, 2 important, 3 routine. One utterance at a time, at most one waiting; higher priority
     replaces stale routine speech; duplicates are suppressed; the game never waits for the Coach.
   - Audio: while speaking, Skyline FM and ambience fade down and game sounds soften through the existing Web Audio
     buses; levels are recomputed from the live on/off state when speech ends, fails, times out or is cancelled.
     Saved audio preferences, playlist position and playback are never touched.
   - No HUD, captions or indicators. The only UI is a "Skyline Coach" section in Settings → Sound. */
(()=>{'use strict';
if(window.SkylineCoach)return;
const DEF={on:false,voice:'',vol:.8,rate:1,mode:'important'};
const cfg=()=>{const c=PREF.coach=Object.assign({},DEF,PREF.coach||{});c.vol=Math.min(1,Math.max(0,+c.vol||0));c.rate=Math.min(1.4,Math.max(.7,+c.rate||1));if(!['important','mine'].includes(c.mode))c.mode='important';return c};
const saveCfg=()=>{try{savePref()}catch(e){}};
/* ---------- engine adapters ---------- */
const NOVELTY=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Deranged|Hysterical|Pipe Organ)( \(|$)/i;
// Curated voice slots: the game offers American, British and Indian English, female and male. Each slot is filled at
// run time with the best working installed voice of that accent and gender (enhanced/premium/neural first).
const SLOTS=[['us-f','American English · Female','us','f'],['us-m','American English · Male','us','m'],['gb-f','British English · Female','gb','f'],['gb-m','British English · Male','gb','m'],['in-f','Indian English · Female','in','f'],['in-m','Indian English · Male','in','m']];
const FEMALE=/\b(female|woman|samantha|allison|ava|susan|zoe|joelle|noelle|nicky|victoria|karen|moira|tessa|kate|serena|stephanie|martha|fiona|veena|isha|sangeeta|lekha|aria|jenny|michelle|ana|emma|libby|sonia|maisie|hollie|mia|neerja|heera|swara|kalpana|catherine|natasha|clara|salli|joanna|kendra|kimberly|ivy|amy|raveena|aditi|siri female)\b/i;
const MALE=/\b(male|man|alex|tom|evan|nathan|aaron|fred|daniel|oliver|arthur|jamie|rishi|guy|davis|christopher|eric|roger|steffan|ryan|thomas|elliot|prabhat|ravi|hemant|matthew|justin|joey|brian|siri male)\b/i;
// Android/Google network voice ids carry a code instead of a name.
const ANDROID_G={'en-us-x-sfg':'f','en-us-x-tpc':'f','en-us-x-tpf':'f','en-us-x-iob':'f','en-us-x-iog':'f','en-us-x-iol':'m','en-us-x-iom':'m','en-us-x-tpd':'m','en-gb-x-gba':'f','en-gb-x-gbc':'f','en-gb-x-gbb':'m','en-gb-x-gbd':'m','en-gb-x-gbg':'m','en-gb-x-rjs':'m','en-in-x-ahp':'f','en-in-x-cxx':'f','en-in-x-ene':'f','en-in-x-end':'m'};
const genderOf=v=>{const n=(v.name||'')+' '+(v.voiceURI||'');const a=Object.keys(ANDROID_G).find(k=>n.toLowerCase().includes(k));if(a)return ANDROID_G[a];if(/\bfemale\b/i.test(n))return'f';if(/\bmale\b/i.test(n))return'm';return FEMALE.test(n)?'f':MALE.test(n)?'m':''};
const accentOf=v=>{const l=String(v.lang||'').toLowerCase().replace('_','-');return /^en-us/.test(l)?'us':/^en-gb/.test(l)?'gb':/^en-in/.test(l)?'in':''};
const quality=v=>{const id=(v.name+' '+(v.voiceURI||'')).toLowerCase();return(/premium|enhanced|neural|natural|online/.test(id)?4:0)+(/compact|espeak|robot/.test(id)?-3:0)+(v.localService!==false?1:0)};
function slotVoices(vs){const out={};for(const acc of ['us','gb','in']){const list=vs.filter(v=>accentOf(v)===acc).sort((a,b)=>quality(b)-quality(a));const used=new Set();
    for(const g of ['f','m']){const v=list.find(x=>!used.has(x.name)&&genderOf(x)===g);if(v){out[acc+'-'+g]=v;used.add(v.name)}}
    for(const g of ['f','m'])if(!out[acc+'-'+g]){const v=list.find(x=>!used.has(x.name)&&!genderOf(x));if(v){out[acc+'-'+g]=v;used.add(v.name)}}}
  return out}
function markBad(name){const c=cfg();c.bad=[...new Set([...(c.bad||[]),name])].slice(-40);if(c.voice===name)c.voice='';saveCfg();try{renderAll()}catch(e){}}
const webEngine={
  name:'web',
  supported:()=>typeof window.speechSynthesis!=='undefined'&&typeof window.SpeechSynthesisUtterance==='function',
  // English voices that can be used here: Apple/Google novelty and robotic legacy voices are left out, duplicates
  // removed, and any voice that failed to start speaking on this device is hidden (see markBad).
  voices(){try{const seen=new Set(),bad=new Set(cfg().bad||[]);return speechSynthesis.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang||'')&&!NOVELTY.test(v.name||'')&&!bad.has(v.name)&&!seen.has(v.name)&&seen.add(v.name))}catch(e){return[]}},
  allVoices(){try{return speechSynthesis.getVoices().filter(v=>/^en([-_]|$)/i.test(v.lang||'')&&!NOVELTY.test(v.name||''))}catch(e){return[]}},
  // Automatic ('' / unknown name): the device's default English voice; otherwise the most natural-sounding English
  // voice installed (enhanced/premium/neural before compact), matching the device language when it is English.
  // No country or accent is preferred. An explicitly chosen installed voice always wins.
  pick(name){const vs=this.voices();if(!vs.length)return null;if(name){const v=/^(us|gb|in)-[fm]$/.test(name)?slotVoices(vs)[name]:vs.find(x=>x.name===name);if(v)return v}
    const def=vs.find(v=>v.default);if(def)return def;
    const nav=(navigator.languages||[navigator.language||'']).map(l=>String(l).toLowerCase()).filter(l=>l.startsWith('en'));
    const q=v=>{const id=(v.name+' '+(v.voiceURI||'')).toLowerCase();return(/premium|enhanced|neural|natural/.test(id)?4:0)+(/compact|espeak|robot/.test(id)?-3:0)+(v.localService!==false?1:0)+(nav.includes(String(v.lang).toLowerCase().replace('_','-'))?2:0)};
    return vs.slice().sort((a,b)=>q(b)-q(a))[0]},
  lang(){const l=(navigator.languages||[navigator.language||'']).find(l=>/^en/i.test(l||''));return l||'en'},
  speak(text,o){try{if(speechSynthesis.paused)speechSynthesis.resume();if(speechSynthesis.speaking&&!this.keep)speechSynthesis.cancel()}catch(e){}const u=new SpeechSynthesisUtterance(text),v=this.pick(o.voice);this.keep=u;if(v){u.voice=v;u.lang=v.lang}else u.lang=this.lang();
    u.volume=o.volume;u.rate=o.rate;u.pitch=1;let started=false,over=false;
    const end=()=>{if(over)return;over=true;clearTimeout(wd);if(this.keep===u)this.keep=null;o.onend&&o.onend()};
    const fail=()=>{if(started||over)return;over=true;clearTimeout(wd);if(this.keep===u)this.keep=null;try{speechSynthesis.cancel()}catch(e){}
      if(v&&!o.retried){markBad(v.name);o.onfail&&o.onfail(v.name);setTimeout(()=>this.speak(text,{...o,voice:'',retried:true}),60)}else o.onend&&o.onend()};
    u.onstart=()=>{started=true;o.onstart&&o.onstart()};u.onend=end;u.onerror=()=>started?end():fail();
    const wd=setTimeout(fail,4000);speechSynthesis.speak(u);return u},
  cancel(){try{speechSynthesis.cancel()}catch(e){}},
  unlock(text){try{if(speechSynthesis.paused)speechSynthesis.resume();const u=new SpeechSynthesisUtterance(text||' ');u.volume=text?cfg().vol:0;const v=this.pick(cfg().voice);if(v){u.voice=v;u.lang=v.lang}speechSynthesis.speak(u);this.keep=u}catch(e){}}
};
webEngine.check=async function(onProgress){const all=this.allVoices(),bad=[];
  for(let k=0;k<all.length;k++){const v=all[k];onProgress&&onProgress(k+1,all.length);
    const okv=await new Promise(res=>{let done=false;const fin=r=>{if(done)return;done=true;clearTimeout(t);try{speechSynthesis.cancel()}catch(e){}res(r)};
      try{const u=new SpeechSynthesisUtterance('Skyline');u.voice=v;u.lang=v.lang;u.volume=0;u.onstart=()=>fin(true);u.onend=()=>fin(true);u.onerror=()=>fin(false);speechSynthesis.speak(u)}catch(e){fin(false)}
      const t=setTimeout(()=>fin(false),2500)});
    if(!okv)bad.push(v.name);await new Promise(r=>setTimeout(r,80))}
  const c=cfg();c.bad=bad;if(bad.includes(c.voice))c.voice='';saveCfg();return{total:all.length,working:all.length-bad.length,bad}};
let engine=webEngine;
try{if(webEngine.supported())speechSynthesis.addEventListener('voiceschanged',()=>{try{renderAll()}catch(e){}})}catch(e){}
/* ---------- audio ducking via the existing buses ---------- */
const D={ducked:false,timer:0};
function busTargets(duck){const b=AUD&&AUD.buses;if(!b||!AC)return;const t=AC.currentTime,rad=AUD.radioOn?1:0,amb=AUD.ambOn?1:0;
  const set=(g,v,tc)=>{try{g.gain.cancelScheduledValues(t);g.gain.setValueAtTime(g.gain.value,t);g.gain.setTargetAtTime(v,t,tc)}catch(e){}};
  if(duck){set(b.rad,0,.08);set(b.amb,amb*.1,.1);set(b.sfx,.45,.08)}else{set(b.rad,rad,.35);set(b.amb,amb,.35);set(b.sfx,1,.2)}
  // Radio slots that could not be routed through Web Audio fall back to element volume.
  try{FMS.slots.forEach(s=>{if(!s.g&&s.a)s.a.volume=duck?0:(s===FMS.slots[FMS.cur]&&AUD.radioOn?Math.min(1,PREF.audio.vol):s.a.volume)})}catch(e){}}
function duck(maxMs){clearTimeout(D.timer);D.timer=setTimeout(unduck,maxMs);if(D.ducked)return;D.ducked=true;busTargets(true)}
function recover(){try{if(AC&&AC.state!=='running'&&!document.hidden)AC.resume().catch(()=>{})}catch(e){}
  try{const s=FMS.slots[FMS.cur];if(AUD.radioOn&&s&&s.a&&s.a.src&&s.a.paused&&!s.a.ended){const p=s.a.play();if(p&&p.catch)p.catch(()=>{})}}catch(e){}}
function unduck(){clearTimeout(D.timer);if(!D.ducked)return;D.ducked=false;recover();busTargets(false);setTimeout(()=>{if(!D.ducked){recover();busTargets(false)}},700);setTimeout(()=>{if(!D.ducked)recover()},2000)}
// If the audio engine is interrupted while nothing is speaking (e.g. by the system voice), bring it back.
setInterval(()=>{try{if(!D.ducked&&!Q.cur&&AC&&AC.state!=='running'&&!document.hidden&&cfg().on)recover()}catch(e){}},2000);
/* ---------- queue ---------- */
const Q={cur:null,next:null,recent:new Map(),seq:0};
const quiet=()=>{const c=cfg();return !c.on||!engine.supported()||document.hidden||typeof FAST!=='undefined'&&FAST||!G||G.sim};
function say(text,pri=3,key=text){if(quiet()||!text)return;const now=Date.now();
  for(const [k,t] of Q.recent)if(now-t>12000)Q.recent.delete(k);if(Q.recent.has(key))return;Q.recent.set(key,now);
  const item={text,pri,key,at:now,id:++Q.seq};
  if(Q.cur){if(pri<Q.cur.pri&&Q.cur.pri===3){stop(false);start(item);return}
    if(!Q.next||pri<=Q.next.pri)Q.next=item;return}
  start(item)}
function start(item){const c=cfg();const maxAge=item.pri===1?10000:item.pri===2?6000:3500;if(Date.now()-item.at>maxAge){Q.cur=null;pump();return}
  Q.cur=item;const id=item.id;duck(Math.min(12000,2500+item.text.length*110/c.rate));
  const done=()=>{if(!Q.cur||Q.cur.id!==id)return;Q.cur=null;pump()};
  try{engine.speak(item.text,{voice:c.voice,volume:c.vol,rate:c.rate,onstart(){},onend:done})}catch(e){done()}
  setTimeout(done,Math.min(14000,3000+item.text.length*130/c.rate))}
function pump(){const n=Q.next;Q.next=null;if(n&&!quiet())start(n);else unduck()}
function stop(restore=true){Q.next=null;Q.cur=null;engine.cancel();if(restore)unduck()}
/* ---------- wording ---------- */
function meId(){if(!G)return null;if(G.lcNet)return G.lcMe;if(G.online)return(G.players.find(p=>p.uid===NET.me)||{}).id??null;
  const h=G.players.filter(p=>!p.ai);return h.length===1?h[0].id:null}
const nm=p=>p&&p.name||'A player';
const stageName=(i,h)=>{try{if(typeof lc==='function'&&lc())return LC_STAGES[h].n}catch(e){}return h>=5?'Tower':h+(h>1?' houses':' house')};
/* ---------- committed-state watcher ---------- */
const W={key:null,s:null,at:0,aiSaid:0};
const keyOf=()=>G.lcNet?'lc:'+G.lcNet.code:G.online?'on:'+(NET.code||G.code||''):'local:'+(G.masteryId||'')+':'+G.players.map(p=>p.name).join(',');
function snap(){return{turn:G.turn,round:G.round,logN:G.logN||0,over:!!G.over,o:G.own.map(x=>x.o),h:G.own.map(x=>x.h),lm:JSON.stringify(G.lm||{}),
  ev:G.ev2?G.ev2.id+':'+G.ev2.from:'',cr:G.players.map(p=>!!p.cr),bk:G.players.map(p=>!!p.bankrupt)}}
function check(){if(!G||!G.players||!G.own)return;const k=keyOf(),now=Date.now();
  if(k!==W.key||!W.s||now-W.at>6000&&(G.logN||0)-W.s.logN>6||(G.logN||0)<W.s.logN){W.key=k;W.s=snap();W.at=now;return}
  const a=W.s,b=snap();W.s=b;W.at=now;if(quiet())return;
  const me=meId(),you=id=>me!=null&&id===me,mode=cfg().mode,allow=(pri,mine)=>pri===1||mode==='important'||mine;
  const S=(t,pri,mine,key)=>{if(allow(pri,mine))say(t,pri,key||t)};
  if(b.over&&!a.over){const w=standings()[0];S(you(w.id)?'Congratulations! You’ve won the match!':`${nm(w)} wins the match.`,1,true,'over:'+k);return}
  b.bk.forEach((v,i)=>{if(v&&!a.bk[i])S(you(i)?'You’re bankrupt. Better luck next game.':`${nm(G.players[i])} is bankrupt!`,you(i)?1:2,you(i))});
  b.cr.forEach((v,i)=>{if(v&&!a.cr[i])S(you(i)?'Civic Review! Your rent income is temporarily suspended.':`${nm(G.players[i])} is under Civic Review.`,you(i)?1:3,you(i));
    else if(!v&&a.cr[i]&&you(i))S('Your planning restriction has ended.',2,true)});
  if(b.ev!==a.ev&&G.ev2){const e=G.ev2,name=e.name||'A city event';
    S(e.kind==='rent'?`${name} is live! ${e.area} rents are up ${e.pct} percent.`:`${name}! Building ${e.group?'in '+e.area:'everywhere'} costs ${e.pct} percent less.`,2,false,'ev:'+b.ev)}
  if(b.lm!==a.lm){let A={},B={};try{A=JSON.parse(a.lm);B=JSON.parse(b.lm)}catch(e){}
    for(const g of Object.keys(B))if(!A[g]||A[g].i!==B[g].i){const L=B[g];S(you(L.pid)?`${SQ[L.i].n} is now your Landmark!`:`A new Landmark has been designated: ${SQ[L.i].n}.`,2,you(L.pid),'lm:'+g+':'+L.i)}}
  const done=new Set();
  b.o.forEach((o,i)=>{if(o===a.o[i]||o<0||a.o[i]>=0)return;const p=G.players[o];
    S(you(o)?`You’ve acquired ${SQ[i].n}!`:`${nm(p)} bought ${SQ[i].n}.`,you(o)?2:3,you(o));
    const g=SQ[i].g;if(g&&!done.has(g)&&ownsAll(o,g)){done.add(g);const land=typeof lc==='function'&&lc();
      S(you(o)?(land?'You’ve completed a district! It’s ready for a Landmark.':'You’ve completed a district!'):`${nm(p)} completed the ${GNAME[g]} district.`,2,you(o),'set:'+o+':'+g)}});
  let best=null;b.h.forEach((h,i)=>{if(h>a.h[i]&&b.o[i]>=0&&b.o[i]===a.o[i]&&(!best||h>best.h))best={i,h,o:b.o[i]}});
  if(best){const n=stageName(best.i,best.h),big=best.h>=5;
    if(you(best.o))S(big?`${n} construction complete!`:`${n} development complete!`,big?2:3,true,'bld:'+best.i+':'+best.h);
    else if(big)S(`${nm(G.players[best.o])} built a ${n} on ${SQ[best.i].n}.`,2,false,'bld:'+best.i+':'+best.h)}
  const fresh=Math.min(10,b.logN-a.logN);
  for(let k2=fresh-1;k2>=0;k2--)line(G.log[k2]||'',you,S);
}
function line(t,you,S){const P0=G.players.slice().sort((x,y)=>y.name.length-x.name.length),pre=t=>P0.find(p=>t.startsWith(p.name+' '));
  const A=pre(t);if(!A)return;const r=t.slice(A.name.length+1);let m;
  if(r.startsWith('paid for a Fast-Track Permit')){if(you(A.id))S('Fast-Track Permit approved!',2,true);return}
  if(r.startsWith('paid ')){const rest=r.slice(5),B=P0.find(p=>rest.startsWith(p.name+' '));
    if(B){const amt=rest.slice(B.name.length+1);if(you(A.id))S(`Pay ${spoken(amt)} to ${B.name}.`,big(amt)?2:3,true);else if(you(B.id))S(`${A.name} pays you ${spoken(amt)}.`,3,true)}
    else if(you(A.id)&&/\d/.test(rest)&&rest.length<16)S(`Pay ${spoken(rest)}.`,3,true);return}
  if(/^(passed|landed on) Start, \+/.test(r)){if(you(A.id))S('Payday!',3,true,'pay:'+G.round+':'+A.id);return}
  if(r==='was sent to the Lockup'){S(you(A.id)?'You’re going to the Lockup.':`${A.name} is going to the Lockup.`,you(A.id)?2:3,you(A.id));return}
  if(m=/^drew: (.+)$/.exec(r)){if(you(A.id)){const c=m[1].split(/[.!]/)[0].trim();if(c&&c.length<=70)S(c+'.',3,true)}}}
const spoken=s=>{const m=/([\d.,]+)\s*([KMB])\b/.exec(s);return m?`${m[1]} ${{K:'thousand',M:'million',B:'billion'}[m[2]]} Skyline Cash`:s};
const big=s=>{const m=/([\d.,]+)\s*([KMB])\b/.exec(s);if(!m)return false;const v=parseFloat(m[1].replace(/,/g,''))*({K:1e-3,M:1,B:1000}[m[2]]);return v>=300};
function turnSay(p){try{check()}catch(e){}if(quiet()||!p||p.bankrupt||G.over||W.key!==keyOf())return;const me=meId(),you=me!=null&&p.id===me,mode=cfg().mode,now=Date.now();
  if(you)say('Your turn. Ready to roll?',2,'turn:'+G.round+':'+p.id);
  else if(!p.ai){if(mode==='important'||me==null)say(`${nm(p)}’s turn.`,3,'turn:'+G.round+':'+p.id)}
  else if(mode==='important'&&now-W.aiSaid>20000&&!Q.cur){W.aiSaid=now;say('The computer is making its move.',3,'ai:'+G.round)}}
{const _b=banner;banner=function(p){try{turnSay(p)}catch(e){}return _b.apply(this,arguments)}}
/* hooks: re-check after committed renders; light poll while a game is open */
{const _r=renderRoster;renderRoster=function(){const r=_r.apply(this,arguments);try{check()}catch(e){}return r}}
setInterval(()=>{try{if(cfg().on&&G&&!document.hidden)check()}catch(e){}},700);
/* lifecycle: no speech in the background, on exit or when disabled */
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
addEventListener('pagehide',()=>stop());
{const _st=showTitle;showTitle=function(){stop();W.key=null;return _st.apply(this,arguments)}}
// first user interaction unlocks speech (iOS / Safari require a gesture)
let unlocked=false;addEventListener('pointerdown',()=>{if(unlocked||!cfg().on||!engine.supported())return;unlocked=true;try{engine.unlock&&engine.unlock()}catch(e){}},{capture:true,passive:true});
/* ---------- Settings → Sound ---------- */
const CSS=`.coachbox{margin-top:10px;border-top:1px solid var(--ln,#0002);padding-top:10px}.coachbox h4{margin:0 0 6px;font:800 13px var(--display,system-ui)}.coachbox .cg{display:grid;grid-template-columns:minmax(110px,auto) 1fr;gap:8px 10px;align-items:center}
.coachbox select{max-width:100%;min-height:36px;border-radius:10px;padding:4px 8px;background:var(--bg1,#fff);color:var(--ink,#13284a);border:1px solid var(--ln,#0003)}.coachbox input[type=range]{width:100%}.coachbox .seg2{display:flex;gap:6px;flex-wrap:wrap}.coachbox .seg2 button,.coachbox .cbtn{min-height:36px;border-radius:999px;padding:4px 12px;border:1px solid var(--ln,#0003);background:transparent;color:inherit;font-weight:700}
.coachbox .seg2 button.on{background:#e2b13c;color:#10283b;border-color:#e2b13c}.coachbox .cmsg{font-size:11.5px;opacity:.75;margin-top:6px}@media (max-width:520px){.coachbox .cg{grid-template-columns:1fr}}`;
(()=>{const s=document.createElement('style');s.textContent=CSS;document.head.append(s)})();
const boxes=new Set();
function renderAll(){boxes.forEach(b=>{if(b.isConnected)draw(b);else boxes.delete(b)})}
function draw(box){const c=cfg(),ok=engine.supported(),vs=ok?engine.voices():[],sv=slotVoices(vs),slots=SLOTS.filter(x=>sv[x[0]]);if(c.voice&&!sv[c.voice]){c.voice='';saveCfg()}const chosen=c.voice||'';
  box.innerHTML=`<h4>Skyline Coach</h4>
   <div class="cg"><span>Coach voice</span><div class="seg2"><button data-on="1" class="${c.on?'on':''}" aria-pressed="${c.on}">On</button><button data-on="0" class="${c.on?'':'on'}" aria-pressed="${!c.on}">Off</button></div>
   <span>Voice</span><select aria-label="Coach voice" ${ok?'':'disabled'}><option value="" ${chosen?'':'selected'}>System English (Automatic)</option>${slots.map(x=>`<option value="${x[0]}" ${chosen===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>
   <span>Coach volume</span><input type="range" min="0" max="1" step="0.05" value="${c.vol}" aria-label="Coach volume" data-k="vol">
   <span>Speaking speed</span><input type="range" min="0.7" max="1.4" step="0.05" value="${c.rate}" aria-label="Speaking speed" data-k="rate">
   <span>Commentary</span><div class="seg2"><button data-m="important" class="${c.mode==='important'?'on':''}">Important events</button><button data-m="mine" class="${c.mode==='mine'?'on':''}">My turn + major events</button></div>
   <span></span><div class="seg2"><button class="cbtn" data-prev>▶ Preview voice</button><button class="cbtn" data-chk>Check voices</button></div></div>
   <div class="cmsg" data-note>${(c.bad||[]).length?`${c.bad.length} voice${c.bad.length>1?'s':''} didn’t work on this device and ${c.bad.length>1?'are':'is'} hidden.`:''}</div>
   <div class="cmsg">${ok?'Spoken announcements only — nothing appears on screen. Music and city sounds fade while the Coach speaks.':'This device or browser has no built-in speech voice, so the Coach is unavailable here.'}</div>`;
  box.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>{const on=b.dataset.on==='1';cfg().on=on;saveCfg();if(!on)stop();else{unlocked=true;try{engine.unlock&&engine.unlock('Skyline Coach is on.')}catch(e){}W.key=null}draw(box)});
  const sel=box.querySelector('select');sel.onchange=()=>{cfg().voice=sel.value;saveCfg()};
  box.querySelectorAll('input[data-k]').forEach(r=>r.oninput=()=>{cfg()[r.dataset.k]=+r.value;saveCfg()});
  box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{cfg().mode=b.dataset.m;saveCfg();draw(box)});
  const note=box.querySelector('[data-note]');
  box.querySelector('[data-prev]').onclick=()=>{if(!ok)return;stop(false);const c2=cfg();duck(6000);try{engine.speak('Welcome to Skyline Estates. It’s your turn. Ready to roll?',{voice:c2.voice,volume:c2.vol,rate:c2.rate,onstart(){},onend(){unduck()},onfail(n){setTimeout(()=>{const nb=box.querySelector('[data-note]');if(nb)nb.textContent=`“${n}” didn’t work on this device, so it’s hidden and Automatic is used instead.`},50)}})}catch(e){unduck()}};
  const ck=box.querySelector('[data-chk]');if(ck)ck.onclick=async()=>{if(!ok||!engine.check)return;stop();ck.disabled=true;
    const r=await engine.check((k,n)=>{note.textContent=`Checking voices… ${k} of ${n}`});draw(box);const nb=box.querySelector('[data-note]');
    if(nb)nb.textContent=r.total?`${r.working} of ${r.total} English voices work on this device${r.bad.length?'; the others are hidden':''}.`:'No English voices were found on this device.'};
  box.querySelectorAll('button,select,input').forEach(e=>e.disabled=e.disabled||(!ok&&!e.dataset.on));}
function mount(container){if(!container||container.querySelector('.coachbox'))return;const b=document.createElement('div');b.className='coachbox';container.append(b);boxes.add(b);draw(b)}
// Home → Settings → Audio (and the older Sound card layout).
{const _ps=paneSettings;paneSettings=function(T){const r=_ps.apply(this,arguments);try{const v=T.querySelector('#stVol'),ch=T.querySelector('#sChips');mount(v?v.closest('.stp'):ch&&ch.closest('.card'))}catch(e){}return r}}
// In-game menu → Sound dialog.
{const _m=modal;modal=function(o){try{if(o&&typeof o.html==='string'&&G&&!G.over&&cfg().on){const h=o.html;let m;
    if(/<div class="mh">For sale<\/div>/.test(h)&&(m=/<div class="dh"[^>]*><small>[^<]*<\/small><b>([^<]+)<\/b>/.exec(h))){const name=m[1].replace(/&amp;/g,'&').replace(/^[^A-Za-z0-9]+/,'').trim();say(`Do you want to acquire ${name}?`,1,'buy:'+name+':'+G.round)}
    else if((m=/Choose a Landmark · ([^<]+)</.exec(h)))say(`Choose a Landmark for ${m[1].replace(/&amp;/g,'&').trim()}.`,1,'lmq:'+m[1]+':'+G.round)}}catch(e){}
  if(o&&typeof o.html==='string'&&o.html.includes('id="sndChips"')){const om=o.onMount;o={...o,onMount(pn,close){const r=om&&om(pn,close);try{mount(pn.querySelector('#sndChips').parentElement)}catch(e){}return r}}}return _m.call(this,o)}}
window.SkylineCoach=Object.freeze({version:1,voice:n=>{try{const v=engine.pick&&engine.pick(n||'');return v?v.name:null}catch(e){return null}},useEngine(e){if(e&&typeof e.speak==='function'&&typeof e.supported==='function'){stop();engine=e;renderAll()}},
  say:(t,p)=>say(t,p||2),stop,check,_state:{Q,W,D}});
})();
