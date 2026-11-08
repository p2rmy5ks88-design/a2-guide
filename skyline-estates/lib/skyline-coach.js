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
const DEF={on:false,voice:'natural',vol:.8,rate:1,mode:'important',style:'standard'};
const cfg=()=>{const c=PREF.coach=Object.assign({},DEF,PREF.coach||{});if(!c.v2){c.v2=1;c.voice='natural'}c.vol=Math.min(1,Math.max(0,+c.vol||0));c.rate=Math.min(1.4,Math.max(.7,+c.rate||1));if(!['important','mine'].includes(c.mode))c.mode='important';if(!['standard','pidgin'].includes(c.style))c.style='standard';return c};
const saveCfg=()=>{try{savePref()}catch(e){}};
const natural=()=>cfg().voice==='natural';
const tx=(en,pg)=>cfg().style==='pidgin'&&!natural()?pg:en; // Standard English or Naija Pidgin wording
/* ---------- engine adapters ---------- */
const NOVELTY=/^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Deranged|Hysterical|Pipe Organ)( \(|$)/i;
// Curated voice slots: the game offers American, British and Indian English, female and male. Each slot is filled at
// run time with the best working installed voice of that accent and gender (enhanced/premium/neural first).
const SLOTS=[['us-f','American English · Female','us','f'],['us-m','American English · Male','us','m'],['gb-f','British English · Female','gb','f'],['gb-m','British English · Male','gb','m'],['in-f','Indian English · Female','in','f'],['in-m','Indian English · Male','in','m'],['ng-f','Nigerian English · Female','ng','f'],['ng-m','Nigerian English · Male','ng','m']];
const FEMALE=/\b(female|woman|samantha|allison|ava|susan|zoe|joelle|noelle|nicky|victoria|karen|moira|tessa|kate|serena|stephanie|martha|fiona|veena|isha|sangeeta|lekha|aria|jenny|michelle|ana|emma|libby|sonia|maisie|hollie|mia|neerja|heera|ezinne|swara|kalpana|catherine|natasha|clara|salli|joanna|kendra|kimberly|ivy|amy|raveena|aditi|siri female)\b/i;
const MALE=/\b(male|man|alex|tom|evan|nathan|aaron|fred|daniel|oliver|arthur|jamie|rishi|guy|davis|christopher|eric|roger|steffan|ryan|thomas|elliot|prabhat|ravi|abeo|hemant|matthew|justin|joey|brian|siri male)\b/i;
// Android/Google network voice ids carry a code instead of a name.
const ANDROID_G={'en-us-x-sfg':'f','en-us-x-tpc':'f','en-us-x-tpf':'f','en-us-x-iob':'f','en-us-x-iog':'f','en-us-x-iol':'m','en-us-x-iom':'m','en-us-x-tpd':'m','en-gb-x-gba':'f','en-gb-x-gbc':'f','en-gb-x-gbb':'m','en-gb-x-gbd':'m','en-gb-x-gbg':'m','en-gb-x-rjs':'m','en-in-x-ahp':'f','en-in-x-cxx':'f','en-in-x-ene':'f','en-in-x-end':'m'};
const genderOf=v=>{const n=(v.name||'')+' '+(v.voiceURI||'');const a=Object.keys(ANDROID_G).find(k=>n.toLowerCase().includes(k));if(a)return ANDROID_G[a];if(/\bfemale\b/i.test(n))return'f';if(/\bmale\b/i.test(n))return'm';return FEMALE.test(n)?'f':MALE.test(n)?'m':''};
const accentOf=v=>{const l=String(v.lang||'').toLowerCase().replace('_','-');return /^en-us/.test(l)?'us':/^en-gb/.test(l)?'gb':/^en-in/.test(l)?'in':/^en-ng/.test(l)?'ng':''};
const quality=v=>{const id=(v.name+' '+(v.voiceURI||'')).toLowerCase();return(/premium|enhanced|neural|natural|online/.test(id)?4:0)+(/compact|espeak|robot/.test(id)?-3:0)+(v.localService!==false?1:0)};
function slotVoices(vs){const out={};for(const acc of ['us','gb','in','ng']){const list=vs.filter(v=>accentOf(v)===acc).sort((a,b)=>quality(b)-quality(a));const used=new Set();
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
  pick(name){const vs=this.voices();if(!vs.length)return null;if(!name&&cfg().style==='pidgin'){const sv=slotVoices(vs),v=sv['ng-f']||sv['ng-m'];if(v)return v}if(name){const v=/^(us|gb|in|ng)-[fm]$/.test(name)?slotVoices(vs)[name]:vs.find(x=>x.name===name);if(v)return v}
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
/* ---------- natural voice pack (pre-recorded clips; Kokoro af_heart, Apache-2.0) ----------
   Clips are fetched on demand (and kept in the Cache API) or downloaded once for offline play from Settings.
   They play through the game's own audio engine, never through system speech, so the natural voice is never
   mixed with robotic narration: a line without a recorded clip (names, amounts, card text) is simply skipped. */
const NAT={base:'coach/natural-en-f/',cache:'skyline-coach-natural-en-f-v1',man:null,buf:new Map(),src:null};
async function natCacheGet(url){try{if(window.caches){const c=await caches.open(NAT.cache);const r=await c.match(url);if(r)return r}}catch(e){}return null}
async function natManifest(){if(NAT.man)return NAT.man;const url=NAT.base+'manifest.json';let r=null;
  // Prefer the live index (new lines appear after an update); fall back to the stored copy when offline.
  try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),4000);const n=await fetch(url,{cache:'no-cache',signal:ac.signal});clearTimeout(to);if(n.ok){r=n;try{if(window.caches)(await caches.open(NAT.cache)).put(url,n.clone())}catch(e){}}}catch(e){}
  if(!r)r=await natCacheGet(url);if(!r)throw Error('manifest');NAT.man=await r.json();return NAT.man}
async function natBuffer(id){if(NAT.buf.has(id))return NAT.buf.get(id);const m=await natManifest(),f=m.files[id];if(!f)throw Error('no clip '+id);const url=NAT.base+f;
  let r=await natCacheGet(url);if(!r){r=await fetch(url);if(!r.ok)throw Error('clip');try{if(window.caches)(await caches.open(NAT.cache)).put(url,r.clone())}catch(e){}}
  const ab=await r.arrayBuffer();const b=await new Promise((res,rej)=>AC.decodeAudioData(ab,res,rej));if(NAT.buf.size>80)NAT.buf.delete(NAT.buf.keys().next().value);NAT.buf.set(id,b);return b}
function natPlay(ids,vol,onend){NAT.last=ids.slice();NAT.plays=(NAT.plays||0)+1;let stopped=false,ended=false;const fin=()=>{if(ended)return;ended=true;onend()};
  (async()=>{try{if(!AC)initAudio();if(!AC)throw Error('no audio');if(AC.state!=='running')await AC.resume().catch(()=>{});
    for(let k=0;k<ids.length;k++){if(stopped)return;const b=await natBuffer(ids[k]);if(stopped)return;
      await new Promise(res=>{const src=AC.createBufferSource(),g=AC.createGain();g.gain.value=vol;src.buffer=b;src.connect(g).connect(AC.destination);src.onended=res;NAT.src=src;src.start();setTimeout(res,b.duration*1000+800)});
      NAT.src=null;if(k<ids.length-1)await new Promise(r=>setTimeout(r,140))}}catch(e){}finally{NAT.src=null;fin()}})();
  return()=>{stopped=true;try{NAT.src&&NAT.src.stop()}catch(e){}NAT.src=null;fin()}}
const CLIP=[[/^Your turn\. Ready to roll\?$/,'turn_me'],[/^The computer is making its move\.$/,'turn_ai'],[/’s turn\.$/,'turn_other'],[/^You’ve acquired /,'buy_me'],[/ bought .+\.$/,'buy_other'],
  [/^You’ve completed a district! It’s ready/,'set_me_lm'],[/^You’ve completed a district!$/,'set_me'],[/ completed the .+ district\.$/,'set_other'],[/^Low-rise development complete!$/,'build_me_1'],[/^Mid-rise development complete!$/,'build_me_2'],
  [/^High-rise development complete!$/,'build_me_3'],[/^Skyscraper construction complete!$/,'build_me_sky'],[/(house|houses|Tower) (development|construction) complete!$/,'build_me_house'],[/ built a Skyscraper on /,'build_other_sky'],
  [/ is now your Landmark!$/,'lm_me'],[/^A new Landmark has been designated/,'lm_other'],[/^Choose a Landmark for /,'lm_ask'],[/^Civic Review! /,'cr_me'],[/ is under Civic Review\.$/,'cr_other'],[/^Your planning restriction has ended\.$/,'cr_end'],
  [/^Fast-Track Permit approved!$/,'fasttrack'],[/^You’re bankrupt\./,'bk_me'],[/ is bankrupt!$/,'bk_other'],[/^Congratulations! You’ve won/,'win_me'],[/ wins the match\.$/,'win_other'],[/^Pay .+ to .+\.$/,'pay_rent'],[/^Pay .+\.$/,'pay_fee'],
  [/ pays you /,'recv_rent'],[/^Payday!$/,'payday'],[/^You’re going to the Lockup\.$/,'lockup_me']];
function clipsFor(text){const ix=NAT.man&&NAT.man.index||{buy:{},ev:{}};let m;if(ix.text&&ix.text[text])return[ix.text[text]];
  if(m=/^Do you want to acquire (.+)\?$/.exec(text))return[ix.buy[m[1]]||'buy_ask'];
  if(m=/^(.+) is live! .+ rents are (up|down) \d+ percent\.$/.exec(text)){const e=ix.ev[m[1]];return(e?[e]:[]).concat(m[2]==='down'?'ev_rent_down':'ev_rent_up')}
  if(m=/^(.+)! Building .+ costs \d+ percent less\.$/.exec(text)){const e=ix.ev[m[1]];return(e?[e]:[]).concat('ev_dev')}
  for(const [r,id] of CLIP)if(r.test(text))return[id];return null}
const natPreload=()=>{if(natural()&&cfg().on)natManifest().catch(()=>{})};setTimeout(natPreload,1500);
/* ---------- queue ---------- */
const Q={cur:null,next:null,recent:new Map(),seq:0};
const quiet=()=>{const c=cfg();return !c.on||!natural()&&!engine.supported()||document.hidden||typeof FAST!=='undefined'&&FAST||!G||G.sim};
function say(text,pri=3,key=text){if(quiet()||!text)return;const now=Date.now();
  for(const [k,t] of Q.recent)if(now-t>12000)Q.recent.delete(k);if(Q.recent.has(key))return;Q.recent.set(key,now);
  const item={text,pri,key,at:now,id:++Q.seq};
  if(Q.cur){if(pri<Q.cur.pri&&Q.cur.pri===3){stop(false);start(item);return}
    if(!Q.next||pri<=Q.next.pri)Q.next=item;return}
  start(item)}
function start(item){const c=cfg();const maxAge=item.pri===1?10000:item.pri===2?6000:3500;if(Date.now()-item.at>maxAge){Q.cur=null;pump();return}
  const done0=()=>{if(!Q.cur||Q.cur.id!==item.id)return;Q.cur=null;pump()};
  if(natural()){Q.cur=item;const go=()=>{if(Q.cur!==item)return;const ids=clipsFor(item.text);if(!ids){Q.cur=null;pump();return}duck(15000);item.cancel=natPlay(ids,c.vol,done0)};
    if(NAT.man)go();else{item.cancel=()=>{};natManifest().catch(()=>{}).then(go)}return}
  Q.cur=item;const id=item.id;duck(Math.min(12000,2500+item.text.length*110/c.rate));
  const done=()=>{if(!Q.cur||Q.cur.id!==id)return;Q.cur=null;pump()};
  try{engine.speak(item.text,{voice:c.voice,volume:c.vol,rate:c.rate,onstart(){},onend:done})}catch(e){done()}
  setTimeout(done,Math.min(14000,3000+item.text.length*130/c.rate))}
function pump(){const n=Q.next;Q.next=null;if(n&&!quiet())start(n);else unduck()}
// Settings speech (preview / "Coach is on") goes through the same one-at-a-time slot, so game lines wait for it.
function speakNow(text,extra,clip){stop(false);const c=cfg(),id=++Q.seq;Q.cur={text,pri:0,key:'direct:'+id,at:Date.now(),id};
  if(natural()&&clip){duck(15000);Q.cur.cancel=natPlay([clip],c.vol,()=>{if(Q.cur&&Q.cur.id===id){Q.cur=null;pump()}});return}duck(Math.min(12000,3000+text.length*110/c.rate));
  const done=()=>{if(Q.cur&&Q.cur.id===id){Q.cur=null;pump()}};setTimeout(done,Math.min(14000,4500+text.length*130/c.rate));
  try{engine.speak(text,{voice:c.voice,volume:c.vol,rate:c.rate,onstart(){},onend:done,...(extra||{})})}catch(e){done()}}
function stop(restore=true){const cur=Q.cur;Q.next=null;Q.cur=null;engine.cancel();try{cur&&cur.cancel&&cur.cancel()}catch(e){}if(restore)unduck()}
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
  if(b.over&&!a.over){const w=standings()[0];S(you(w.id)?tx('Congratulations! You’ve won the match!','Congratulations! You don win the match!'):tx(`${nm(w)} wins the match.`,`${nm(w)} don win the match.`),1,true,'over:'+k);return}
  b.bk.forEach((v,i)=>{if(v&&!a.bk[i])S(you(i)?tx('You’re bankrupt. Better luck next game.','Ah! You don go bankrupt. Next game go better.'):tx(`${nm(G.players[i])} is bankrupt!`,`${nm(G.players[i])} don go bankrupt!`),you(i)?1:2,you(i))});
  b.cr.forEach((v,i)=>{if(v&&!a.cr[i])S(you(i)?tx('Civic Review! Your rent income is temporarily suspended.','Wahala! Civic Review don hold your rent for now.'):tx(`${nm(G.players[i])} is under Civic Review.`,`${nm(G.players[i])} dey under Civic Review.`),you(i)?1:3,you(i));
    else if(!v&&a.cr[i]&&you(i))S(tx('Your planning restriction has ended.','Your Civic Review don clear!'),2,true)});
  if(b.ev!==a.ev&&G.ev2){const e=G.ev2,name=e.name||'A city event';
    S(e.kind==='rent'?tx(`${name} is live! ${e.area} rents are ${e.pct<0?'down':'up'} ${Math.abs(e.pct)} percent.`,`${name} don start! ${e.area} rent don go up ${e.pct} percent.`):tx(`${name}! Building ${e.group?'in '+e.area:'everywhere'} costs ${e.pct} percent less.`,`${name}! To build ${e.group?'for '+e.area:'everywhere'} don cheap by ${e.pct} percent.`),2,false,'ev:'+b.ev)}
  if(b.lm!==a.lm){let A={},B={};try{A=JSON.parse(a.lm);B=JSON.parse(b.lm)}catch(e){}
    for(const g of Object.keys(B))if(!A[g]||A[g].i!==B[g].i){const L=B[g];S(you(L.pid)?tx(`${SQ[L.i].n} is now your Landmark!`,`${SQ[L.i].n} na your Landmark now!`):tx(`A new Landmark has been designated: ${SQ[L.i].n}.`,`New Landmark don land: ${SQ[L.i].n}.`),2,you(L.pid),'lm:'+g+':'+L.i)}}
  const done=new Set();
  b.o.forEach((o,i)=>{if(o===a.o[i]||o<0||a.o[i]>=0)return;const p=G.players[o];
    S(you(o)?tx(`You’ve acquired ${SQ[i].n}!`,`${SQ[i].n} don be your own!`):tx(`${nm(p)} bought ${SQ[i].n}.`,`${nm(p)} don buy ${SQ[i].n}.`),you(o)?2:3,you(o));
    const g=SQ[i].g;if(g&&!done.has(g)&&ownsAll(o,g)){done.add(g);const land=typeof lc==='function'&&lc();
      S(you(o)?(land?tx('You’ve completed a district! It’s ready for a Landmark.','You don complete the district! E ready for Landmark.'):tx('You’ve completed a district!','You don complete the district!')):tx(`${nm(p)} completed the ${GNAME[g]} district.`,`${nm(p)} don complete ${GNAME[g]}.`),2,you(o),'set:'+o+':'+g)}});
  let best=null;b.h.forEach((h,i)=>{if(h>a.h[i]&&b.o[i]>=0&&b.o[i]===a.o[i]&&(!best||h>best.h))best={i,h,o:b.o[i]}});
  if(best){const n=stageName(best.i,best.h),big=best.h>=5;
    if(you(best.o))S(big?tx(`${n} construction complete!`,`${n} don stand gidigba!`):tx(`${n} development complete!`,`${n} don finish!`),big?2:3,true,'bld:'+best.i+':'+best.h);
    else if(big)S(tx(`${nm(G.players[best.o])} built a ${n} on ${SQ[best.i].n}.`,`${nm(G.players[best.o])} don build ${n} for ${SQ[best.i].n}.`),2,false,'bld:'+best.i+':'+best.h)}
  const fresh=Math.min(10,b.logN-a.logN);
  for(let k2=fresh-1;k2>=0;k2--)line(G.log[k2]||'',you,S);
}
function line(t,you,S){const P0=G.players.slice().sort((x,y)=>y.name.length-x.name.length),pre=t=>P0.find(p=>t.startsWith(p.name+' '));
  const A=pre(t);if(!A)return;const r=t.slice(A.name.length+1);let m;
  if(r.startsWith('paid for a Fast-Track Permit')){if(you(A.id))S(tx('Fast-Track Permit approved!','Fast-Track Permit don approve!'),2,true);return}
  if(r.startsWith('paid ')){const rest=r.slice(5),B=P0.find(p=>rest.startsWith(p.name+' '));
    if(B){const amt=rest.slice(B.name.length+1);if(you(A.id))S(tx(`Pay ${spoken(amt)} to ${B.name}.`,`Pay ${spoken(amt)} give ${B.name}.`),big(amt)?2:3,true);else if(you(B.id))S(tx(`${A.name} pays you ${spoken(amt)}.`,`${A.name} don pay you ${spoken(amt)}.`),3,true)}
    else if(you(A.id)&&/\d/.test(rest)&&rest.length<16)S(`Pay ${spoken(rest)}.`,3,true);return}
  if(/^(passed|landed on) Start, \+/.test(r)){if(you(A.id))S(tx('Payday!','Payday! Alert don land!'),3,true,'pay:'+G.round+':'+A.id);return}
  if(r==='was sent to the Lockup'){S(you(A.id)?tx('You’re going to the Lockup.','You dey go Lockup o!'):tx(`${A.name} is going to the Lockup.`,`${A.name} dey go Lockup.`),you(A.id)?2:3,you(A.id));return}
  if(m=/^drew: (.+)$/.exec(r)){if(you(A.id)&&!(typeof lc==='function'&&lc())){const c=m[1].split(/[.!]/)[0].trim();if(c&&c.length<=70)S(c+'.',3,true)}}}
const spoken=s=>{const m=/([\d.,]+)\s*([KMB])\b/.exec(s);return m?`${m[1]} ${{K:'thousand',M:'million',B:'billion'}[m[2]]} Skyline Cash`:s};
const big=s=>{const m=/([\d.,]+)\s*([KMB])\b/.exec(s);if(!m)return false;const v=parseFloat(m[1].replace(/,/g,''))*({K:1e-3,M:1,B:1000}[m[2]]);return v>=300};
function turnSay(p){try{check()}catch(e){}if(quiet()||!p||p.bankrupt||G.over||W.key!==keyOf())return;const me=meId(),you=me!=null&&p.id===me,mode=cfg().mode,now=Date.now();
  if(you)say(tx('Your turn. Ready to roll?','Na your turn o! Roll am!'),2,'turn:'+G.round+':'+p.id);
  else if(!p.ai){if(mode==='important'||me==null)say(tx(`${nm(p)}’s turn.`,`Na ${nm(p)} turn now.`),3,'turn:'+G.round+':'+p.id)}
  else if(mode==='important'&&now-W.aiSaid>20000&&!Q.cur){W.aiSaid=now;say(tx('The computer is making its move.','Computer don dey move.'),3,'ai:'+G.round)}}
{const _b=banner;banner=function(p){try{turnSay(p)}catch(e){}return _b.apply(this,arguments)}}
/* popup cards and city corners: title + short hint (same wording as the recorded lines; see tools/coach-voice) */
const DECKN={chance:'Lucky Break',esusu:'City Hall'};
const CORNERS={'Skyline HQ':'Skyline HQ! Pick your head-office bonus.','Planning Office':'Planning Office! A Pre-approval is on offer.','Transit Exchange':'Transit Exchange! Ride to any transit hub for a fare.','Investment Forum':'Investment Forum! Buy a street, or network for a stipend.'};
function classicLine(t){return String(t||'').replace(/[Cc]ollect \{m\d+\} for every street you own/g,'collect a bonus for every street you own').replace(/Collect \{m\d+\}/g,'Collect your reward').replace(/Pay \{m\d+\}/g,'Pay the fee').replace('{festival}','the festival').trim()}
function cardLine(deck,c,choice){const d=DECKN[deck];if(!d||!c)return null;
  if(c.classic||!c.id){const t=classicLine(c.t);return t&&!/[{}]/.test(t)?`${d}! ${t}`:null}
  let title=c.title;try{if(typeof title==='function')title=title()}catch(e){title=null}return title?`${d}! ${title}.`+(choice?' Make your choice.':''):null}
const decider=p=>{const me=meId();return p&&!p.ai&&(me==null||p.id===me)};
try{const _dec=LCUI.decide;LCUI.decide=function(kind,p,sp){try{if(sp&&decider(p)&&!quiet()){
    if(kind==='card'){const t=cardLine(sp.deck,sp.c,!!sp.ch);if(t)say(t,2,'card:'+G.round+':'+t)}
    else if(kind==='corner'&&CORNERS[sp.title])say(CORNERS[sp.title],2,'corner:'+G.round+':'+sp.title)}}catch(e){}
  return _dec.apply(this,arguments)}}catch(e){}
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
async function packInfo(){let man=null;try{man=await natManifest()}catch(e){}const n=man?Object.keys(man.files).length:0;let have=0;
  try{if(window.caches&&man){const c=await caches.open(NAT.cache),keys=await c.keys();have=keys.filter(k=>!/manifest\.json$/.test(k.url)).length}}catch(e){}
  return{man,n,have,mb:man?(man.bytes/1048576).toFixed(1):'?',cacheOk:!!window.caches}}
async function packDownload(onp){const man=await natManifest(),ids=Object.keys(man.files),c=await caches.open(NAT.cache);let done=0,fail=0,k=0;
  const work=async()=>{while(k<ids.length){const id=ids[k++],url=NAT.base+man.files[id];try{if(!await c.match(url)){const r=await fetch(url);if(!r.ok)throw 0;await c.put(url,r)}}catch(e){fail++}done++;onp(done,ids.length)}};
  await Promise.all([1,2,3,4,5,6].map(work));return{done,fail}}
async function packRemove(){try{await caches.delete(NAT.cache)}catch(e){}NAT.man=null;NAT.buf.clear()}
function draw(box){const c=cfg(),nat=c.voice==='natural',sys=engine.supported(),vs=sys?engine.voices():[],sv=slotVoices(vs),slots=SLOTS.filter(x=>sv[x[0]]);
  if(c.voice&&!nat&&!sv[c.voice]){c.voice='';saveCfg()}const chosen=c.voice||'';const ok=nat||sys;
  box.innerHTML=`<h4>Skyline Coach</h4>
   <div class="cg"><span>Coach voice</span><div class="seg2"><button data-on="1" class="${c.on?'on':''}" aria-pressed="${c.on}">On</button><button data-on="0" class="${c.on?'':'on'}" aria-pressed="${!c.on}">Off</button></div>
   <span>Voice</span><select aria-label="Coach voice"><option value="natural" ${nat?'selected':''}>Natural voice · Female (recommended)</option>${sys?`<optgroup label="Device voices"><option value="" ${chosen===''?'selected':''}>System English (Automatic)</option>${slots.map(x=>`<option value="${x[0]}" ${chosen===x[0]?'selected':''}>${x[1]}</option>`).join('')}</optgroup>`:''}</select>
   ${nat?`<span>Voice pack</span><div><div class="seg2" data-pack><span class="cmsg" style="margin:0">Checking…</span></div></div>`:''}
   <span>Coach volume</span><input type="range" min="0" max="1" step="0.05" value="${c.vol}" aria-label="Coach volume" data-k="vol">
   ${nat?'':`<span>Speaking speed</span><input type="range" min="0.7" max="1.4" step="0.05" value="${c.rate}" aria-label="Speaking speed" data-k="rate">
   <span>Style</span><div class="seg2"><button data-s="standard" class="${c.style==='standard'?'on':''}">Standard English</button><button data-s="pidgin" class="${c.style==='pidgin'?'on':''}">Naija Pidgin</button></div>`}
   <span>Commentary</span><div class="seg2"><button data-m="important" class="${c.mode==='important'?'on':''}">Important events</button><button data-m="mine" class="${c.mode==='mine'?'on':''}">My turn + major events</button></div>
   <span></span><div class="seg2"><button class="cbtn" data-prev>▶ Preview voice</button>${nat?'':'<button class="cbtn" data-chk>Check voices</button>'}</div></div>
   <div class="cmsg" data-note>${!nat&&(c.bad||[]).length?`${c.bad.length} voice${c.bad.length>1?'s':''} didn’t work on this device and ${c.bad.length>1?'are':'is'} hidden.`:''}</div>
   <div class="cmsg">${nat?'A recorded natural voice. Lines are fetched as needed; download the pack to use it offline. Speed and Naija Pidgin apply to device voices.':ok?'Spoken announcements only — nothing appears on screen. Music and city sounds fade while the Coach speaks.':'This device or browser has no built-in speech voice. Choose the Natural voice instead.'}</div>`;
  box.querySelectorAll('[data-on]').forEach(b=>b.onclick=()=>{const on=b.dataset.on==='1';cfg().on=on;saveCfg();if(!on)stop();else{unlocked=true;try{initAudio()}catch(e){}try{speakNow(tx('Skyline Coach is on.','Skyline Coach don land!'),null,'coach_on')}catch(e){}W.key=null}draw(box)});
  const sel=box.querySelector('select');sel.onchange=()=>{cfg().voice=sel.value;saveCfg();stop();natPreload();draw(box)};
  box.querySelectorAll('input[data-k]').forEach(r=>r.oninput=()=>{cfg()[r.dataset.k]=+r.value;saveCfg()});
  box.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{cfg().mode=b.dataset.m;saveCfg();draw(box)});
  box.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{cfg().style=b.dataset.s;saveCfg();draw(box)});
  const note=box.querySelector('[data-note]');
  box.querySelector('[data-prev]').onclick=()=>{if(!ok)return;try{initAudio()}catch(e){}speakNow(tx('Welcome to Skyline Estates. It’s your turn. Ready to roll?','Welcome to Skyline Estates. Na your turn o, roll am!'),{onfail(n){setTimeout(()=>{const nb=box.querySelector('[data-note]');if(nb)nb.textContent=`“${n}” didn’t work on this device, so it’s hidden and Automatic is used instead.`},50)}},'preview')};
  const ck=box.querySelector('[data-chk]');if(ck)ck.onclick=async()=>{if(!sys||!engine.check)return;stop();ck.disabled=true;
    const r=await engine.check((k,n)=>{note.textContent=`Checking voices… ${k} of ${n}`});draw(box);const nb=box.querySelector('[data-note]');
    if(nb)nb.textContent=r.total?`${r.working} of ${r.total} English voices work on this device${r.bad.length?'; the others are hidden':''}.`:'No English voices were found on this device.'};
  const pk=box.querySelector('[data-pack]');if(pk)(async()=>{const inf=await packInfo();if(!pk.isConnected)return;
    if(!inf.man){pk.innerHTML='<span class="cmsg" style="margin:0">Voice pack unavailable offline. Connect to the internet once to use the natural voice.</span>';return}
    if(!inf.cacheOk){pk.innerHTML=`<span class="cmsg" style="margin:0">Streams as needed (${inf.mb} MB in total).</span>`;return}
    const full=inf.have>=inf.n;
    pk.innerHTML=full?`<span class="cmsg" style="margin:0">✓ Downloaded · ${inf.mb} MB · works offline</span><button class="cbtn" data-rm>Remove</button>`:`<span class="cmsg" style="margin:0">${inf.mb} MB${inf.have?` · ${Math.round(inf.have/inf.n*100)}% saved`:''}</span><button class="cbtn" data-dl>⬇ Download</button>`;
    const dl=pk.querySelector('[data-dl]');if(dl)dl.onclick=async()=>{dl.disabled=true;const msg=pk.querySelector('.cmsg');const r=await packDownload((d,n)=>{msg.textContent=`Downloading… ${Math.round(d/n*100)}%`});draw(box);if(r.fail){const nb=box.querySelector('[data-note]');if(nb)nb.textContent=`${r.fail} clips couldn’t be saved. Check your connection and try again.`}};
    const rm=pk.querySelector('[data-rm]');if(rm)rm.onclick=async()=>{stop();await packRemove();draw(box)}})();}
function mount(container){if(!container||container.querySelector('.coachbox'))return;const b=document.createElement('div');b.className='coachbox';container.append(b);boxes.add(b);draw(b)}
// Home → Settings → Audio (and the older Sound card layout).
{const _ps=paneSettings;paneSettings=function(T){const r=_ps.apply(this,arguments);try{const v=T.querySelector('#stVol'),ch=T.querySelector('#sChips');mount(v?v.closest('.stp'):ch&&ch.closest('.card'))}catch(e){}return r}}
// In-game menu → Sound dialog.
{const _m=modal;modal=function(o){try{if(o&&typeof o.html==='string'&&G&&!G.over&&cfg().on){const h=o.html;let m;
    if(/<div class="mh">For sale<\/div>/.test(h)&&(m=/<div class="dh"[^>]*><small>[^<]*<\/small><b>([^<]+)<\/b>/.exec(h))){const name=m[1].replace(/&amp;/g,'&').replace(/^[^A-Za-z0-9]+/,'').trim();say(tx(`Do you want to acquire ${name}?`,`You wan buy ${name}?`),1,'buy:'+name+':'+G.round)}
    else if((m=/Choose a Landmark · ([^<]+)</.exec(h)))say(tx(`Choose a Landmark for ${m[1].replace(/&amp;/g,'&').trim()}.`,`Choose Landmark for ${m[1].replace(/&amp;/g,'&').trim()}!`),1,'lmq:'+m[1]+':'+G.round)}}catch(e){}
  if(o&&typeof o.html==='string'&&o.html.includes('id="sndChips"')){const om=o.onMount;o={...o,onMount(pn,close){const r=om&&om(pn,close);try{mount(pn.querySelector('#sndChips').parentElement)}catch(e){}return r}}}return _m.call(this,o)}}
window.SkylineCoach=Object.freeze({version:1,voice:n=>{try{const v=engine.pick&&engine.pick(n||'');return v?v.name:null}catch(e){return null}},useEngine(e){if(e&&typeof e.speak==='function'&&typeof e.supported==='function'){stop();engine=e;renderAll()}},
  say:(t,p)=>say(t,p||2),stop,check,_state:{Q,W,D,NAT}});
})();
