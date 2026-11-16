/* Skyline Career (Phase A foundation) — data model, sequential unlocks, qualification and mastery.
   Disabled by default behind a feature flag. With the flag off this file changes nothing: no UI, no profile writes.

   Two layers in one file:
   1. A DOM-free core (window.SkylineCareerCore / module.exports) that works on plain objects, so it runs in the app,
      in Node tests and later in simulations. It never reads the game state itself.
   2. App glue (browser only): the flag, persistence in PREF.career, recording finished Origins career matches and a
      temporary functional entry point. The final Career interface is ChatGPT's design and replaces the temporary one.

   Origins is today's Classic game, unchanged. A career match is an ordinary match started with set.career='origins'
   (saves already accept extra set fields). Circuit, Dominion and Empire have no gameplay yet: they can be previewed
   and unlocked, but not played. City Boards progression (city achievements, frames, Spotlight, objectives, country
   unlocks) is not read or written here. See skyline-estates/CAREER.md. */
(function(root,factory){const core=factory();if(typeof module==='object'&&module.exports)module.exports=core;else root.SkylineCareerCore=core})(typeof self!=='undefined'?self:this,function(){'use strict';
const VERSION=1;
const LENGTHS=Object.freeze({quick:{mode:'timed',rounds:20},standard:{mode:'timed',rounds:30},extended:{mode:'timed',rounds:40},unlimited:{mode:'classic'}});
// Property categories for the future global street generator (Phase B). Listed now so manifests can be validated.
const CATEGORIES=Object.freeze(['grand-boulevards','market-streets','financial-districts','cultural-streets','residential-districts','transport-corridors']);
// Qualification thresholds. Origins reuses the Season & city objective rules (5 rounds, 2 minutes, 3 actions).
const QUALIFY=Object.freeze({minRounds:5,minMs:120000,minActivity:3,qualifyingAI:['normal','hard'],maxReceipts:400});
// Career mastery: participation and wins earn board XP (separate from profile XP, which the game already awards).
const MASTERY=Object.freeze({matchXp:50,qualifiedXp:50,winXp:100,levels:[0,300,800,1500,2500,4000]});
const BOARDS=Object.freeze([
 {id:'origins',tier:1,name:'Skyline Origins',difficulty:'Easy',strategy:'Ownership and development',playable:true,ruleset:'classic-lc',
  requires:[],lengths:['quick','standard','extended','unlimited'],defaultLength:'standard',
  preview:{headline:'Buy streets, complete groups, build your skyline.',geometry:'40-space square perimeter',movement:'Dice around the perimeter',
   building:'A complete property group allows building; five stages from Plot to Skyscraper, built evenly.',victory:'Highest Championship score at the round limit, or last solvent player.',
   status:'playable',design:null}},
 {id:'circuit',tier:2,name:'Skyline Circuit',difficulty:'Normal',strategy:'Routes and connectivity',playable:false,ruleset:null,
  requires:[{kind:'tutorial',board:'origins'},{kind:'qualifiedWins',board:'origins',count:2}],lengths:[],
  preview:{headline:'Choose your route and connect the city.',geometry:'Two connected rings with junctions (design pending)',movement:'Dice with route choices at junctions',
   building:'Owning a street allows Low-rise; higher stages need connected properties.',victory:'Reach and hold an influence target.',status:'in-development',design:null}},
 {id:'dominion',tier:3,name:'Skyline Dominion',difficulty:'Intermediate',strategy:'Territory and negotiation',playable:false,ruleset:null,
  requires:[{kind:'qualifiedWins',board:'circuit',count:2},{kind:'challenges',board:'circuit',tag:'district',count:3}],lengths:[],
  preview:{headline:'Contest districts and negotiate for control.',geometry:'Hexagonal district network (design pending)',movement:'Action points across connected districts',
   building:'Owning a site allows basic development; advanced buildings need district control.',victory:'Hold the required districts or lead on control points.',status:'planned',design:null}},
 {id:'empire',tier:4,name:'Skyline Empire',difficulty:'Advanced',strategy:'Investment and economic control',playable:false,ruleset:null,
  requires:[{kind:'qualifiedWins',board:'dominion',count:2},{kind:'challenges',board:'dominion',tag:'negotiation',count:1}],lengths:[],
  preview:{headline:'Invest across zones and complete your empire.',geometry:'Asymmetric connected economic zones (design pending)',movement:'Strategic movement between zones',
   building:'Higher buildings need supporting investment and infrastructure.',victory:'Complete three empire milestones and keep the lead.',status:'planned',design:null}}
].map(b=>Object.freeze({...b,requires:Object.freeze(b.requires.map(r=>Object.freeze({...r}))),preview:Object.freeze({...b.preview})})));
const BY_ID=Object.fromEntries(BOARDS.map(b=>[b.id,b]));
const int=(v,lo=0)=>Number.isSafeInteger(v)&&v>=lo?v:0;
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const ID=/^[A-Za-z0-9:_-]{1,80}$/;

function fresh(){return{v:VERSION,unlocked:{origins:0},boards:{},tutorials:{},challenges:{},receipts:[]}}
function boardStats(){return{xp:0,matches:0,qualified:0,wins:0,qualifiedWins:0,bestScore:0,lastAt:0}}
// Normalise stored data. Unknown boards and malformed fields are dropped; counts can only be non-negative integers.
// A record written by a newer version is returned as-is with readOnly=true so this build never overwrites it.
function normalize(raw){
 if(!isObj(raw))return fresh();
 if(int(raw.v)>VERSION)return Object.assign({},raw,{readOnly:true});
 const s=fresh();
 if(isObj(raw.unlocked))for(const b of BOARDS)if(raw.unlocked[b.id]!=null&&Number.isFinite(raw.unlocked[b.id]))s.unlocked[b.id]=Math.max(0,raw.unlocked[b.id]);
 s.unlocked.origins=s.unlocked.origins||0;
 if(isObj(raw.boards))for(const b of BOARDS){const r=raw.boards[b.id];if(!isObj(r))continue;const t=boardStats();for(const k of Object.keys(t))t[k]=int(r[k]);if(t.qualifiedWins>t.wins)t.wins=t.qualifiedWins;s.boards[b.id]=t}
 if(isObj(raw.tutorials))for(const b of BOARDS)if(raw.tutorials[b.id])s.tutorials[b.id]=int(raw.tutorials[b.id])||1;
 if(isObj(raw.challenges))for(const b of BOARDS){const c=raw.challenges[b.id];if(!isObj(c))continue;const o={};for(const [k,v] of Object.entries(c))if(ID.test(k)&&isObj(v)&&typeof v.tag==='string')o[k]={tag:v.tag.slice(0,40),at:int(v.at)};s.challenges[b.id]=o}
 if(Array.isArray(raw.receipts))s.receipts=[...new Set(raw.receipts.filter(r=>typeof r==='string'&&ID.test(r)))].slice(-QUALIFY.maxReceipts);
 return s;
}
const stats=(s,id)=>s.boards[id]||boardStats();
function masteryLevel(xp){let l=0;MASTERY.levels.forEach((t,i)=>{if(xp>=t)l=i});return l}
function progressOf(s,req,ctx={}){
 if(req.kind==='tutorial'){const done=!!s.tutorials[req.board]||(req.board==='origins'&&!!ctx.originsTutorialDone);return{have:done?1:0,need:1}}
 if(req.kind==='qualifiedWins')return{have:Math.min(req.count,stats(s,req.board).qualifiedWins),need:req.count};
 if(req.kind==='challenges'){const n=Object.values(s.challenges[req.board]||{}).filter(c=>c.tag===req.tag).length;return{have:Math.min(req.count,n),need:req.count}}
 return{have:0,need:1};
}
const reqLabel=r=>r.kind==='tutorial'?`Complete the ${BY_ID[r.board].name} tutorial`:r.kind==='qualifiedWins'?`Win ${r.count} qualifying ${BY_ID[r.board].name} matches`:`Complete ${r.count} ${r.tag} challenge${r.count===1?'':'s'} in ${BY_ID[r.board].name}`;
// Unlocks are sequential and permanent: a board unlocks when the previous board is unlocked and every requirement is met.
function evaluate(s,ctx={},now=Date.now()){
 if(s.readOnly)return [];
 const opened=[];
 for(const b of BOARDS){if(s.unlocked[b.id]!=null)continue;const prev=BOARDS[b.tier-2];if(prev&&s.unlocked[prev.id]==null)break;
  if(b.requires.every(r=>{const p=progressOf(s,r,ctx);return p.have>=p.need})){s.unlocked[b.id]=now;opened.push(b.id)}else break}
 return opened;
}
// Decide whether a finished match counts. `facts` is plain data the app gathers; nothing here reads the game.
function qualify(f){
 const reasons=[];
 if(!f||f.board!=='origins')reasons.push('not-career');
 if(f&&(f.sim||f.fast))reasons.push('simulated');
 if(f&&f.online)reasons.push('online');
 if(f&&f.assisted)reasons.push('assisted');
 if(f&&!f.over)reasons.push('unfinished');
 if(f&&!(typeof f.matchId==='string'&&ID.test(f.matchId)))reasons.push('no-match-id');
 if(f&&!f.ownerHuman)reasons.push('no-profile-owner');
 if(f&&!(Number.isFinite(f.startedAt)&&Number.isFinite(f.endedAt)&&f.endedAt-f.startedAt>=QUALIFY.minMs))reasons.push('too-short');
 if(f&&int(f.rounds)<QUALIFY.minRounds)reasons.push('too-few-rounds');
 if(f&&int(f.activity)<QUALIFY.minActivity)reasons.push('too-little-activity');
 const counts=reasons.length===0;
 // A qualifying win also needs at least one AI opponent on Normal or Hard (not an all-human or Easy-only table).
 const winCounts=counts&&!!f.won&&f.aiOpponents>0&&QUALIFY.qualifyingAI.includes(f.aiLevel);
 return{counts,winCounts,reasons};
}
// Record a finished career match once. Participation always earns some board XP if the match counts as genuine play;
// rejected (simulated, online, duplicate, too short) matches change nothing.
function record(s,f,ctx={},now=Date.now()){
 if(s.readOnly)return{ok:false,reason:'newer-version'};
 const q=qualify(f);if(!q.counts)return{ok:false,reason:q.reasons[0],reasons:q.reasons};
 if(s.receipts.includes(f.matchId))return{ok:false,reason:'duplicate'};
 const t=s.boards[f.board]=stats(s,f.board);
 t.matches++;t.qualified++;t.xp+=MASTERY.matchXp+MASTERY.qualifiedXp;if(f.won){t.wins++;t.xp+=MASTERY.winXp}if(q.winCounts)t.qualifiedWins++;
 t.bestScore=Math.max(t.bestScore,int(Math.round(f.score||0)));t.lastAt=now;
 s.receipts.push(f.matchId);if(s.receipts.length>QUALIFY.maxReceipts)s.receipts=s.receipts.slice(-QUALIFY.maxReceipts);
 const unlocked=evaluate(s,ctx,now);
 return{ok:true,qualifiedWin:q.winCounts,won:!!f.won,unlocked,xp:t.xp,level:masteryLevel(t.xp)};
}
function completeTutorial(s,board,ctx={},now=Date.now()){if(s.readOnly||!BY_ID[board])return [];s.tutorials[board]=now||1;return evaluate(s,ctx,now)}
// Board challenges (Circuit district, Dominion negotiation) are recorded by future board modules through this call.
function completeChallenge(s,board,id,tag,ctx={},now=Date.now()){if(s.readOnly||!BY_ID[board]||!ID.test(id))return{ok:false};const c=s.challenges[board]=s.challenges[board]||{};if(c[id])return{ok:false,reason:'duplicate'};c[id]={tag:String(tag).slice(0,40),at:now};return{ok:true,unlocked:evaluate(s,ctx,now)}}
// One read model for any Career interface: status, progress and preview data per board.
function view(s,ctx={}){
 return BOARDS.map(b=>{const unlocked=s.unlocked[b.id]!=null,st=stats(s,b.id),prev=BOARDS[b.tier-2];
  const status=!unlocked?(prev&&s.unlocked[prev.id]==null?'locked-hidden':'locked'):b.playable?'playable':'unlocked-preview';
  return{id:b.id,tier:b.tier,name:b.name,difficulty:b.difficulty,strategy:b.strategy,status,unlocked,playable:unlocked&&b.playable,
   unlockedAt:unlocked?s.unlocked[b.id]:null,requirements:b.requires.map(r=>({...r,label:reqLabel(r),...progressOf(s,r,ctx)})),
   mastery:{...st,level:masteryLevel(st.xp),nextLevelXp:MASTERY.levels[masteryLevel(st.xp)+1]??null},lengths:b.lengths,defaultLength:b.defaultLength||null,preview:b.preview}});
}
// ---- Property manifest (prepared for the Phase B global street generator; no generator yet) ----
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function validateManifest(m){
 const err=[];if(!isObj(m))return['not-an-object'];
 if(m.v!==1)err.push('version');if(!Number.isSafeInteger(m.seed)||m.seed<0||m.seed>0xffffffff)err.push('seed');if(typeof m.ruleset!=='string'||!m.ruleset)err.push('ruleset');
 if(!Array.isArray(m.slots)||!m.slots.length)err.push('slots');else{const names=new Set(),slots=new Set();
  for(const p of m.slots){if(!isObj(p)||!Number.isSafeInteger(p.slot)||p.slot<0||slots.has(p.slot)){err.push('slot');break}slots.add(p.slot);
   if(typeof p.name!=='string'||!p.name.trim()||names.has(p.name.trim().toLowerCase())){err.push('duplicate-or-empty-name');break}names.add(p.name.trim().toLowerCase());
   if(typeof p.city!=='string'||typeof p.country!=='string'){err.push('place');break}if(!CATEGORIES.includes(p.category)){err.push('category');break}if(!Number.isSafeInteger(p.tier)||p.tier<1||p.tier>8){err.push('tier');break}}}
 return err;
}
return Object.freeze({VERSION,BOARDS,LENGTHS,CATEGORIES,QUALIFY,MASTERY,fresh,normalize,qualify,record,evaluate,completeTutorial,completeChallenge,view,masteryLevel,rng,validateManifest});
});

/* ---------------- App glue (browser only) ---------------- */
(function(){'use strict';
if(typeof window==='undefined'||typeof PREF==='undefined'||window.SkylineCareer)return;
const C=window.SkylineCareerCore,FLAG='skylineFeature.career';
// Disabled by default. Enable for testing with ?career=on (persists on this device) and disable with ?career=off.
function flagOn(){try{const q=new URLSearchParams(location.search).get('career');if(q==='on')localStorage.setItem(FLAG,'on');else if(q==='off')localStorage.removeItem(FLAG);return localStorage.getItem(FLAG)==='on'}catch(e){return false}}
const enabled=flagOn();
const ctx=()=>({originsTutorialDone:!!PREF.tutDone});
function load(){return C.normalize(PREF.career)}
function store(s){if(s.readOnly)return false;PREF.career=s;savePref();return true}
function state(){return load()}
function gather(w){
 const owner=G.players.find(p=>p.owner)||G.players.find(p=>!p.ai);let startedAt=NaN;
 try{const t=SkylineSCWallet.create(localStorage).view().transactions.find(x=>x.id==='start:'+G.masteryId);if(t)startedAt=t.at}catch(e){}
 const st=owner?.st||{},activity=['buys','houses','hotels','trades','go','aucWins'].reduce((n,k)=>n+(st[k]||0),0);
 let score=0;try{score=typeof skylineChampionshipScore==='function'&&owner?skylineChampionshipScore(owner).total:(owner?netWorth(owner):0)}catch(e){}
 return{board:G.set.career,matchId:G.masteryId,sim:!!G.sim,fast:!!FAST,online:!!G.online,assisted:!!G.scAssisted,over:!!G.over,ownerHuman:!!owner&&!owner.ai,
  startedAt,endedAt:Date.now(),rounds:G.round,activity,won:!!owner&&owner===w,score,aiOpponents:G.players.filter(p=>p.ai).length,aiLevel:G.set.ai}}
let last=null;
if(enabled){
 const oldEnd=progressGameEnd;progressGameEnd=function(w){const r=oldEnd.apply(this,arguments);
  try{if(G&&G.set&&G.set.career==='origins'){const s=load();last=C.record(s,gather(w),ctx());if(last.ok)store(s)}}catch(e){last={ok:false,reason:'error',message:String(e)}}return r};
}
// Start an Origins career match: today's Classic game, same players as Quick Play (you + 3 computer players).
function startOrigins(length='standard'){
 const L=C.LENGTHS[length]||C.LENGTHS.standard,s=load();if(s.unlocked.origins==null)return false;
 const me=setup.slots[0],over=Object.assign({career:'origins',careerLength:length},L.mode==='timed'?{mode:'timed',rounds:L.rounds,championship:1}:{mode:'classic'});
 startFromSetup($('#pane')||document.body,setup.slots.map((x,i)=>({...x,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:x.tok})),over);return true}
// Temporary functional entry point (testing only, flag on). The final Career screen comes from the approved design package.
async function open(){
 const v=C.view(load(),ctx());
 const row=b=>`<div class="cr-row cr-${b.status}"><div><b>${b.tier} · ${esc(b.name)}</b> <small>${esc(b.difficulty)} · ${esc(b.strategy)}</small><br><small>${esc(b.preview.headline)}</small>${b.status==='playable'?`<br><small>Mastery level ${b.mastery.level} · ${b.mastery.qualifiedWins} qualifying wins · ${b.mastery.matches} matches</small>`:''}${b.requirements.length&&!b.unlocked?`<ul>${b.requirements.map(r=>`<li>${esc(r.label)}: ${r.have} / ${r.need}</li>`).join('')}</ul>`:''}</div><span>${b.status==='playable'?'Play':b.status==='unlocked-preview'?'Unlocked · coming soon':b.status==='locked'?'Locked':'Locked'}</span></div>`;
 const k=await modal({cls:'wide career-preview',html:`<div class="mh">Skyline Career <small>(preview build)</small></div><div class="mtxt">${v.map(row).join('')}</div>`,
  btns:[{k:'quick',label:'Origins · Quick 20'},{k:'standard',label:'Origins · Standard 30',primary:true},{k:'extended',label:'Origins · Extended 40'},{k:'unlimited',label:'Origins · Unlimited'},{k:null,label:'Close'}]});
 if(k)startOrigins(k);
}
if(enabled){
 const st=document.createElement('style');st.textContent='.career-preview .cr-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #ffffff22}.career-preview .cr-row ul{margin:4px 0 0 18px;padding:0;font-size:12px}.career-preview .cr-row span{flex:none;font-weight:700;color:#f4d28b}.career-preview .cr-locked-hidden{opacity:.55}';document.head.append(st);
 const oldP=paneP;paneP=function(T){const r=oldP.apply(this,arguments);try{const list=T.querySelector('.hd-gm-list')||T;if(!T.querySelector('#crOpen')){const b=document.createElement('button');b.type='button';b.id='crOpen';b.className=list.classList.contains('hd-gm-list')?'hd-gm-item':'challenge-overview';b.innerHTML='<span class="tx"><b>Skyline Career</b><small>Preview build · four boards</small></span>';b.onclick=()=>{sfx('tap');open()};list.prepend(b)}}catch(e){}return r};
}
// With the flag off every entry point is inert: nothing is read into the UI and nothing is written to the profile.
const off=()=>({ok:false,reason:'career-disabled'});
window.SkylineCareer=Object.freeze({enabled,state:()=>C.view(load(),ctx()),raw:()=>load(),last:()=>last,
 startOrigins:enabled?startOrigins:()=>false,open:enabled?open:()=>false,
 completeTutorial:enabled?board=>{const s=load();const u=C.completeTutorial(s,board,ctx());store(s);return u}:off,
 completeChallenge:enabled?(board,id,tag)=>{const s=load();const r=C.completeChallenge(s,board,id,tag,ctx());if(r.ok)store(s);return r}:off});
})();
