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
 // Board 2 is City Ventures — The Living Market (owner decision 20 Nov 2026, replaces Skyline Circuit). The id stays
 // 'circuit' so existing Career records and unlocks carry over. Quick (10 turns) earns mastery XP only.
 {id:'circuit',tier:2,name:'City Ventures',difficulty:'Normal',strategy:'Six power corners',playable:false,ruleset:null,
  alpha:{ruleset:'city-ventures-v1',lengths:['standard','quick'],experimental:['quick'],defaultLength:'standard'},
  requires:[{kind:'tutorial',board:'origins'},{kind:'qualifiedWins',board:'origins',count:2}],lengths:[],
  preview:{headline:'Six power corners change the market for everyone.',geometry:'37-space hexagon with six power corners',movement:'Dice around one clockwise route',
   building:'Own 2 of a district for Low/Mid-rise; all 3 for a Landmark.',victory:'Highest City Value after 18 turns.',status:'released',design:'city-ventures.html'}},
 {id:'dominion',tier:3,name:'Skyline Dominion',difficulty:'Intermediate',strategy:'Territory and negotiation',playable:false,ruleset:null,
  requires:[{kind:'qualifiedWins',board:'circuit',count:2},{kind:'challenges',board:'circuit',tag:'district',count:3}],lengths:[],
  // Released with prototype rules (owner decision 19 Nov 2026): DOMINION.md, ruleset dominion-p1. Quick is experimental.
  alpha:{ruleset:'dominion-p1',lengths:['standard','extended','quick'],experimental:['quick'],defaultLength:'standard'},
  preview:{headline:'Contest districts and negotiate for control.',geometry:'48-space hexagonal track, eight district territories, Central District and contest exchanges',movement:'Action points across connected districts',
   building:'Owning a site allows basic development; advanced buildings need district control.',victory:'Hold the required districts or lead on control points.',status:'released-prototype',design:'dominion-production-lab.html'}},
 {id:'empire',tier:4,name:'Skyline Empire',difficulty:'Advanced',strategy:'Investment and economic control',playable:false,ruleset:null,
  requires:[{kind:'qualifiedWins',board:'dominion',count:2},{kind:'challenges',board:'dominion',tag:'negotiation',count:1}],lengths:[],
  // Released with prototype rules (owner decision 19 Nov 2026): EMPIRE.md, ruleset empire-p1. Quick is experimental.
  alpha:{ruleset:'empire-p1',lengths:['standard','extended','quick'],experimental:['quick'],defaultLength:'standard'},
  preview:{headline:'Invest across zones and complete your empire.',geometry:'44-space island loop through six zones around the Empire Tower',movement:'Strategic movement between zones',
   building:'Higher buildings need supporting investment and infrastructure.',victory:'Complete three empire milestones and keep the lead.',status:'released-prototype',design:'empire-production-lab.html'}}
].map(b=>Object.freeze({...b,requires:Object.freeze(b.requires.map(r=>Object.freeze({...r}))),preview:Object.freeze({...b.preview})})));
const BY_ID=Object.fromEntries(BOARDS.map(b=>[b.id,b]));
const int=(v,lo=0)=>Number.isSafeInteger(v)&&v>=lo?v:0;
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const ID=/^[A-Za-z0-9:_-]{1,80}$/;

// receipts: the last counted matches as [matchId, startedAt]. When old receipts are evicted, `floor` keeps the latest
// evicted start time, and any match that started at or before it is refused, so an evicted match can never count again.
function fresh(){return{v:VERSION,unlocked:{origins:0},boards:{},tutorials:{},challenges:{},receipts:[],floor:0}}
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
 s.floor=Number.isFinite(raw.floor)&&raw.floor>0?raw.floor:0;
 if(Array.isArray(raw.receipts)){const seen=new Set();for(const r of raw.receipts){const id=Array.isArray(r)?r[0]:r,at=Array.isArray(r)&&Number.isFinite(r[1])?r[1]:0;if(typeof id==='string'&&ID.test(id)&&!seen.has(id)){seen.add(id);s.receipts.push([id,at])}}
  while(s.receipts.length>QUALIFY.maxReceipts)s.floor=Math.max(s.floor,s.receipts.shift()[1])}
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
const alphaOn=(b,ctx)=>!!(b&&b.alpha&&ctx&&Array.isArray(ctx.alphaBoards)&&ctx.alphaBoards.includes(b.id));
const isPlayable=(b,ctx)=>!!b&&(b.playable||alphaOn(b,ctx));
function qualify(f,ctx={}){
 const reasons=[],b=f&&BY_ID[f.board];
 if(!f||!isPlayable(b,ctx))reasons.push('not-career');
 // A board played through its alpha must report its own rules version and a length the board offers.
 const alpha=!b||b.playable?null:alphaOn(b,ctx)?b.alpha:null;
 if(alpha&&f.ruleset!==alpha.ruleset)reasons.push('wrong-ruleset');
 if(alpha&&!alpha.lengths.includes(f.length))reasons.push('unknown-length');
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
 // Experimental lengths (City Ventures Quick) earn mastery XP only; the board definition decides, not the reported facts.
 const experimental=!!(alpha&&alpha.experimental.includes(f.length))||!!(f&&f.experimental);
 const winCounts=counts&&!experimental&&!!f.won&&f.aiOpponents>0&&QUALIFY.qualifyingAI.includes(f.aiLevel);
 return{counts,winCounts,experimental,reasons};
}
// Record a finished career match once. Participation always earns some board XP if the match counts as genuine play;
// rejected (simulated, online, duplicate, too short) matches change nothing.
function record(s,f,ctx={},now=Date.now()){
 if(s.readOnly)return{ok:false,reason:'newer-version'};
 const q=qualify(f,ctx);if(!q.counts)return{ok:false,reason:q.reasons[0],reasons:q.reasons};
 if(s.unlocked[f.board]==null)return{ok:false,reason:'board-locked'};
 if(s.receipts.some(r=>r[0]===f.matchId))return{ok:false,reason:'duplicate'};
 if(f.startedAt<=s.floor)return{ok:false,reason:'older-than-history'};
 const t=s.boards[f.board]=stats(s,f.board);
 t.matches++;t.qualified++;t.xp+=MASTERY.matchXp+MASTERY.qualifiedXp;if(f.won){t.wins++;t.xp+=MASTERY.winXp}if(q.winCounts)t.qualifiedWins++;
 t.bestScore=Math.max(t.bestScore,int(Math.round(f.score||0)));t.lastAt=now;
 s.receipts.push([f.matchId,f.startedAt]);while(s.receipts.length>QUALIFY.maxReceipts)s.floor=Math.max(s.floor,s.receipts.shift()[1]);
 // Board challenges earned in this match (ids validated; each counted once ever).
 const ch=[];for(const c of Array.isArray(f.challenges)?f.challenges.slice(0,8):[]){if(!c||!ID.test(c.id)||typeof c.tag!=='string')continue;const b=s.challenges[f.board]=s.challenges[f.board]||{};if(b[c.id])continue;b[c.id]={tag:c.tag.slice(0,40),at:now};ch.push(c.id)}
 const unlocked=evaluate(s,ctx,now);
 return{ok:true,challenges:ch,qualifiedWin:q.winCounts,experimental:q.experimental,won:!!f.won,unlocked,xp:t.xp,level:masteryLevel(t.xp)};
}
function completeTutorial(s,board,ctx={},now=Date.now()){if(s.readOnly||!BY_ID[board])return [];s.tutorials[board]=now||1;return evaluate(s,ctx,now)}
// Board challenges (City Ventures district, Dominion negotiation) are recorded by future board modules through this call.
function completeChallenge(s,board,id,tag,ctx={},now=Date.now()){if(s.readOnly||!BY_ID[board]||!ID.test(id))return{ok:false};const c=s.challenges[board]=s.challenges[board]||{};if(c[id])return{ok:false,reason:'duplicate'};c[id]={tag:String(tag).slice(0,40),at:now};return{ok:true,unlocked:evaluate(s,ctx,now)}}
// One read model for any Career interface: status, progress and preview data per board.
function view(s,ctx={}){
 return BOARDS.map(b=>{const unlocked=s.unlocked[b.id]!=null,st=stats(s,b.id),prev=BOARDS[b.tier-2];
  const play=isPlayable(b,ctx),alpha=!b.playable&&alphaOn(b,ctx);
  const status=!unlocked?(prev&&s.unlocked[prev.id]==null?'locked-hidden':'locked'):play?'playable':'unlocked-preview';
  return{id:b.id,tier:b.tier,name:b.name,difficulty:b.difficulty,strategy:b.strategy,status,unlocked,playable:unlocked&&play,alpha,
   experimentalLengths:alpha?b.alpha.experimental:[],
   unlockedAt:unlocked?s.unlocked[b.id]:null,requirements:b.requires.map(r=>({...r,label:reqLabel(r),...progressOf(s,r,ctx)})),
   mastery:{...st,level:masteryLevel(st.xp),nextLevelXp:MASTERY.levels[masteryLevel(st.xp)+1]??null},lengths:alpha?b.alpha.lengths:b.lengths,defaultLength:alpha?b.alpha.defaultLength:b.defaultLength||null,preview:b.preview}});
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
// On for everyone since 19 Nov 2026 (owner decision). ?career=off turns it off on this device, ?career=on back on.
function flagOn(){try{const q=new URLSearchParams(location.search).get('career');if(q==='on')localStorage.removeItem(FLAG);else if(q==='off')localStorage.setItem(FLAG,'off');return localStorage.getItem(FLAG)!=='off'}catch(e){return true}}
const enabled=flagOn();
// Circuit playable alpha: a second flag (?circuitAlpha=on/off), only meaningful with Career on.
const ALPHA='skylineFeature.circuitAlpha';
function alphaOn(){try{const q=new URLSearchParams(location.search).get('circuitAlpha');if(q==='on')localStorage.removeItem(ALPHA);else if(q==='off')localStorage.setItem(ALPHA,'off');return localStorage.getItem(ALPHA)!=='off'}catch(e){return true}}
const circuitAlpha=enabled&&alphaOn();
const ctx=()=>({originsTutorialDone:!!PREF.tutDone,alphaBoards:circuitAlpha?['circuit','dominion','empire']:[]});
function load(){return C.normalize(PREF.career)}
// Before recording, read the saved profile again: another tab or a restored backup may already hold this match.
function loadStored(){try{const raw=JSON.parse(localStorage.getItem(PKEY)||'null');if(raw&&raw.career)return C.normalize(raw.career)}catch(e){}return load()}
function store(s){if(s.readOnly)return false;PREF.career=s;savePref();return true}
function state(){return load()}
function gather(w){
 const owner=G.players.find(p=>p.owner)||G.players.find(p=>!p.ai);let startedAt=NaN;
 try{const t=SkylineSCWallet.create(localStorage).view().transactions.find(x=>x.id==='start:'+G.masteryId);if(t)startedAt=t.at}catch(e){}
 const st=owner?.st||{},activity=['buys','houses','hotels','trades','go','aucWins'].reduce((n,k)=>n+(st[k]||0),0);
 let score=0;try{score=typeof skylineChampionshipScore==='function'&&owner?skylineChampionshipScore(owner).total:(owner?netWorth(owner):0)}catch(e){}
 return{board:G.set.career,matchId:G.masteryId,sim:!!G.sim,fast:!!FAST,online:!!G.online,assisted:!!G.scAssisted,over:!!G.over,ownerHuman:!!owner&&!owner.ai,
  startedAt,endedAt:Date.now(),rounds:G.round,activity,won:!!owner&&owner===w,score,aiOpponents:G.players.filter(p=>p.ai).length,aiLevel:G.set.ai}}
let last=null,inbox=[];
// City Ventures (Career Board 2) pays 5× the normal match rewards in coins and earned Skyline Cash (owner decision
// 20 Nov 2026). Paid once per counted match (the Career receipt already refuses repeats and too-short matches).
const BOARD_REWARD_X=5;let rewardNotes=[];
function boardRewards(f){if(f.board!=='circuit'||f.ruleset!=='city-ventures-v1')return;
 const rank=Number.isInteger(f.rank)?f.rank:(f.won?0:2),coins=(typeof gameCoinReward==='function'?gameCoinReward(!!f.won,rank):(f.won?500:rank===1?220:125))*BOARD_REWARD_X;
 let sc=0;try{const W=window.SkylineSCWallet,R=W.RULES;sc=BOARD_REWARD_X*(R.completion+(f.won?R.win:0));if(!W.create(localStorage).record('board:'+f.matchId,sc,'match',(f.won?'City Ventures win':'City Ventures match')+' ×'+BOARD_REWARD_X,{matchId:f.matchId}))sc=0}catch(e){sc=0}
 if(typeof addCoins==='function')addCoins(coins,f.won?'City Ventures win ×5':'City Ventures ×5');
 rewardNotes.push({won:!!f.won,rank,coins,sc});
 setTimeout(()=>{if(!rewardNotes.length||typeof modal!=='function')return;const n=rewardNotes.splice(0);const c=n.reduce((a,x)=>a+x.coins,0),k=n.reduce((a,x)=>a+x.sc,0);
  modal({html:`<div class="mh">💹 City Ventures rewards ×5</div><div class="mtxt">${n.some(x=>x.won)?'Your win':'Your match'} paid <b>+${c.toLocaleString('en-US')} coins</b>${k?` and <b>+${k.toLocaleString('en-US')} SC</b>`:''}.<br><small>City Ventures pays five times the usual match rewards.</small></div>`,btns:[{k:'x',label:'Great',primary:true}]})},1600)}
// Matches from separate board pages (Circuit alpha) arrive as one localStorage key per match, so two tabs can never
// overwrite each other. Each key is recorded once (receipts reject repeats) and then removed. A newer-version
// Career record is never written, and its inbox is left for that version.
const INBOX='skylineCareerInbox:';
function ingest(){if(!enabled)return [];const out=[];let keys=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(INBOX))keys.push(k)}}catch(e){return out}
 for(const k of keys.sort()){let s=loadStored();if(s.readOnly)break;let f=null;try{f=JSON.parse(localStorage.getItem(k))}catch(e){}
  const r=f?C.record(s,f,ctx()):{ok:false,reason:'invalid'};if(r.ok){store(s);try{boardRewards(f)}catch(e){}}out.push({key:k.slice(INBOX.length),...r});try{localStorage.removeItem(k)}catch(e){}}
 inbox=inbox.concat(out).slice(-20);return out}
if(enabled){try{ingest()}catch(e){}}
if(enabled){
 // The end-of-match code saves the whole profile, so a stale in-memory career record would overwrite a newer saved one.
 // Adopt the saved record first (unless it is from a newer version, which stays exactly as stored), then record.
 const oldEnd=progressGameEnd;progressGameEnd=function(w){let s=null;
  try{if(G&&G.set&&G.set.career==='origins'){s=loadStored();if(!s.readOnly)PREF.career=s}}catch(e){s=null}
  const r=oldEnd.apply(this,arguments);
  try{if(s){const f=gather(w);last=C.record(s,f,ctx());if(last.ok)store(s);setTimeout(()=>careerNote(last),2600)}}catch(e){last={ok:false,reason:'error',message:String(e)}}return r};
}
// After every Career Origins match the player is told whether it counted and what the next unlock needs (20 Nov 2026).
const WHY={'not-career':'it was not a Career match','simulated':'it was simulated or fast-forwarded','online':'online matches do not count','assisted':'saved Skyline Cash was used to start it',
 'unfinished':'it was not finished','no-match-id':'it was not finished on this device','no-profile-owner':'no player profile owned it','too-short':'it lasted under 2 minutes',
 'too-few-rounds':'it ended before round 5','too-little-activity':'fewer than 3 buys, builds or trades were made','duplicate':'it was already recorded','error':'it could not be saved'};
function careerNote(r){try{if(!r)return;const v=C.view(load(),ctx()),o=v.find(b=>b.id==='origins'),next=v.find(b=>!b.unlocked);
 let head,body;
 if(!r.ok){head='Not counted for Career';body='This match did not count because '+(WHY[r.reason]||r.reason)+'.'}
 else if(r.won&&!r.qualifiedWin){head='Match counted, win not counted';body='Wins only count against Normal or Hard computer players.'}
 else{const nu=(r.unlocked||[]).map(id=>(v.find(b=>b.id===(id.id||id))||{}).name).filter(Boolean);head=nu.length?nu.join(' and ')+' unlocked!':r.won?'Career win counted':'Career match counted';body=o?`Skyline Origins: ${o.mastery.qualifiedWins} qualifying win${o.mastery.qualifiedWins===1?'':'s'} · ${o.mastery.matches} match${o.mastery.matches===1?'':'es'}.`:''}
 const tut=!!next&&(next.requirements||[]).some(q=>q.kind==='tutorial'&&q.have<q.need);
 const req=next&&next.requirements?next.requirements.map(q=>`<li>${esc(q.label)}: ${q.have} / ${q.need}</li>`).join(''):'';
 modal({cls:'career-note',html:`<div class="mh">${head}</div><div class="mtxt">${esc(body)}${next?`<br><br><b>To unlock ${esc(next.name)}:</b><ul>${req}</ul>`:'<br><br>All Career boards are unlocked.'}</div>`,btns:[...(tut?[{k:'tut',label:'Open tutorial'}]:[]),{k:'x',label:'OK',primary:true}]}).then(k=>{if(k==='tut'&&typeof openTutorial==='function')openTutorial()})}catch(e){}}
// Start an Origins career match: today's Classic game, same players as Quick Play (you + 3 computer players).
function startOrigins(length='standard'){
 const L=C.LENGTHS[length]||C.LENGTHS.standard,s=load();if(s.unlocked.origins==null)return false;
 ensureOriginsBoard();
 const me=setup.slots[0],over=Object.assign({career:'origins',careerLength:length,ai:setup.ai==='easy'?'normal':setup.ai},L.mode==='timed'?{mode:'timed',rounds:L.rounds,championship:1}:{mode:'classic'});
 startFromSetup($('#pane')||document.body,setup.slots.map((x,i)=>({...x,type:i===0?'human':i<4?'ai':'off',tok:i===0?me.tok:x.tok})),over);return true}
// Temporary functional entry point (testing only, flag on). The final Career screen comes from the approved design package.
// Career screen (owner request 20 Nov 2026): one card per board with its own Play button, then a short length step.
const LENGTH_CHOICES={
 circuit:[['standard','Standard','18 turns · counts for unlocks'],['quick','Quick','10 turns · mastery XP only']],
 origins:[['quick','Quick','20 rounds · about 15 min'],['standard','Standard','30 rounds · about 25 min'],['extended','Extended','40 rounds · about 35 min'],['unlimited','Unlimited','Play until one player is left']],
 alpha:[['standard','Standard','Full match · counts for unlocks'],['extended','Extended','Longer match · counts for unlocks'],['quick','Quick','Short practice · mastery XP only']]};
const BOARD_RULES={circuit:`<b>Goal:</b> the highest City Value after 18 turns (Quick: 10). City Value = cash + property values + 80% of upgrades + 200 CC per full district + 150 CC per Landmark.<br><br>
<b>Your turn:</b> roll, move round the hexagon, then buy the space or send it to auction. Own 2 of a district’s 3 properties to build Low-rise and Mid-rise; own all 3 for a Landmark (+25% district rent).<br><br>
<b>The six power corners:</b> <b>Start</b> — 200 CC when you pass; land exactly for a Charter (cheaper build, purchase or rent). <b>Free Lounge</b> — Rent Shield or keep an Opportunity card. <b>Civic Review</b> — Development Drive (−20% builds) or Tenant Protection (−30% rent) for one round. <b>Market Boom</b> — one district’s rent +50% or −40% for one round. <b>Skyline Exchange</b> — open an auction or a Deal Desk trade (+50 CC each). <b>Transit Hub</b> — ride to any station for 75 CC or collect a Transit Dividend.<br><br>
<b>Rewards:</b> City Ventures pays <b>5× the usual match coins and SC</b>. Standard wins count toward unlocking Skyline Dominion; owning a whole district at the end completes a district challenge.`};
const BOARD_ICON={origins:'🏙️',circuit:'💹',dominion:'🏛️',empire:'👑'};
function boardCard(b){
 const play=b.status==='playable',done=b.mastery||{};
 const body=play?`<div class="crc-stats"><b>${done.qualifiedWins||0}</b> wins · <b>${done.matches||0}</b> played · Lv <b>${done.level||0}</b></div>`
  :`<ul class="crc-req">${b.requirements.map(r=>`<li class="${r.have>=r.need?'ok':''}"><span>${esc(r.label)}</span><b>${Math.min(r.have,r.need)} / ${r.need}</b></li>`).join('')}</ul>`;
 return `<article class="crc ${play?'is-play':'is-locked'}"><div class="crc-top"><span class="crc-icon" aria-hidden="true">${BOARD_ICON[b.id]||'🏙️'}</span><span class="crc-tier">Board ${b.tier}</span></div>
  <h3>${esc(b.name)}</h3><p class="crc-sub">${esc(b.difficulty)}</p><p class="crc-line">${esc(b.preview.headline)}</p>${body}
  <button type="button" class="crc-btn" data-board="${b.id}"${play?'':' disabled'}>${play?'▶ Play':'🔒 Locked'}</button></article>`}
async function open(){
 try{ingest()}catch(e){}
 const v=C.view(load(),ctx());
 const bid=await modal({cls:'wide career-cards',html:`<div class="mh">Skyline Career</div><p class="crc-intro">Win on each board to unlock the next one.</p><div class="crc-grid">${v.map(boardCard).join('')}</div>`,
  btns:[{k:null,label:'Close'}],onMount:(pn,close)=>pn.querySelectorAll('.crc-btn[data-board]:not([disabled])').forEach(b=>b.onclick=()=>{try{sfx('tap')}catch(e){}close(b.dataset.board)})});
 if(!bid)return;
 const b=v.find(x=>x.id===bid);if(!b||b.status!=='playable')return;
 const opts=LENGTH_CHOICES[bid]||LENGTH_CHOICES.alpha;
 const len=await modal({cls:'career-lengths',html:`<div class="mh">${BOARD_ICON[bid]||''} ${esc(b.name)}</div><p class="crc-intro">How long do you want to play?</p><div class="crl-grid">${opts.map(([k,name,desc],i)=>`<button type="button" class="crl${k==='standard'?' rec':''}" data-len="${k}"><b>${name}</b><small>${desc}</small>${k==='standard'?'<em>Recommended</em>':''}</button>`).join('')}</div>`,
  btns:[{k:'back',label:'Back'},...(BOARD_RULES[bid]?[{k:'rules',label:'📖 How to play'}]:[])],onMount:(pn,close)=>pn.querySelectorAll('.crl').forEach(x=>x.onclick=()=>{try{sfx('tap')}catch(e){}close(x.dataset.len)})});
 if(len==='back')return open();
 if(len==='rules'){await modal({cls:'wide career-rules',html:`<div class="mh">${BOARD_ICON[bid]||''} ${esc(b.name)} — How to play</div><div class="mtxt" style="text-align:left;font-size:14px;line-height:1.45">${BOARD_RULES[bid]}</div>`,btns:[{k:'x',label:'Got it',primary:true}]});return open()}
 if(!len)return;
 const page={circuit:'./city-ventures.html',dominion:'./dominion-production-lab.html',empire:'./empire-production-lab.html'};
 if(page[bid])location.href=page[bid]+'?career=1&length='+encodeURIComponent(len);
 else startOrigins(len);
}
// Career Board 1 (owner decisions 19–20 Nov 2026): Career Origins matches are shown on the approved Origins 3D board.
// The board adapter is loaded once into this page and switches itself on only for Career Origins matches, so
// Play Solo keeps the classic board and no page reload is needed between matches.
function ensureOriginsBoard(){try{if(document.querySelector('#originsBoardCss')||window.SkylineOriginsProduction)return;window.SkylineOriginsProductionScope='career';
 const l=document.createElement('link');l.id='originsBoardCss';l.rel='stylesheet';l.href='./origins-production.css';document.head.append(l);
 const sc=document.createElement('script');sc.src='./origins-production-adapter.js';document.body.append(sc)}catch(e){}}
// ?careerOrigins=<length> (from origins-career.html) starts a Career Origins match once the main screen is ready.
const ORIGINS_AUTOSTART=(()=>{try{return ['quick','standard','extended','unlimited'].includes(new URLSearchParams(location.search).get('careerOrigins'))}catch(e){return false}})();
if(enabled&&ORIGINS_AUTOSTART){const len=new URLSearchParams(location.search).get('careerOrigins');try{history.replaceState(null,'',location.pathname)}catch(e){}let tries=0;
 const go=()=>{if(++tries>150)return;if(typeof setup==='undefined'||!setup.slots||typeof startFromSetup!=='function'||!document.querySelector('#title .home')){setTimeout(go,200);return}
  try{if(!startOrigins(len))(window.top||window).location.replace('./index.html')}catch(e){setTimeout(go,300)}};
 setTimeout(go,400)}
if(enabled){
 const st=document.createElement('style');st.textContent='.career-cards{width:min(980px,96vw)!important;max-height:calc(100dvh - 16px);overflow-y:auto;padding-top:12px!important;padding-bottom:12px!important}.career-cards .mh{margin-bottom:0}@media(max-height:460px){.career-cards .crc-line{display:none}.career-cards .crc-intro{display:none}}.career-cards .crc-intro,.career-lengths .crc-intro{margin:-2px 0 10px;opacity:.75;font-size:13px}.career-cards .crc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;text-align:left}@media(max-width:700px){.career-cards .crc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.career-cards .crc{display:flex;flex-direction:column;gap:3px;padding:10px 11px;border-radius:16px;background:linear-gradient(160deg,#20365a,#142339);border:1px solid #ffffff1f;min-width:0}.career-cards .crc.is-play{border-color:#e1bc66;box-shadow:0 0 0 1px #e1bc6655,0 6px 18px #0006}.career-cards .crc.is-locked{opacity:.72}.career-cards .crc-top{display:flex;justify-content:space-between;align-items:center}.career-cards .crc-icon{font-size:20px;line-height:1}.career-cards .crc-tier{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#e1bc66}.career-cards h3{margin:0;font-size:16px;line-height:1.15}.career-cards .crc-sub{margin:0;font-size:11.5px;opacity:.7}.career-cards .crc-line{margin:1px 0 4px;font-size:12px;line-height:1.3;opacity:.9}.career-cards .crc-stats{font-size:12px;opacity:.9;margin-top:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.career-cards .crc-stats b{color:#f4d28b}.career-cards .crc-req{list-style:none;margin:auto 0 0;padding:0;display:grid;gap:3px;font-size:11.5px}.career-cards .crc-req li{display:flex;justify-content:space-between;align-items:flex-start;gap:6px;opacity:.85;line-height:1.25}.career-cards .crc-req b{white-space:nowrap;flex:none}.career-cards .crc-req li.ok{color:#8fe0a8}.career-cards .crc-btn{flex:none;margin-top:6px;min-height:44px;border-radius:12px;border:0;font:inherit;font-weight:800;font-size:15px;cursor:pointer;background:linear-gradient(#f2d488,#d9a948);color:#1b1a14}.career-cards .crc-btn[disabled]{background:#ffffff14;color:#ffffffa0;cursor:default}.career-lengths .crl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.career-lengths .crl{position:relative;display:flex;flex-direction:column;gap:4px;align-items:flex-start;text-align:left;padding:14px;min-height:72px;border-radius:14px;border:1px solid #ffffff2a;background:#1b2d49;color:inherit;font:inherit;cursor:pointer}.career-lengths .crl b{font-size:17px}.career-lengths .crl small{opacity:.8;font-size:12.5px}.career-lengths .crl.rec{border-color:#e1bc66;background:#2a3b5c}.career-lengths .crl em{position:absolute;top:8px;right:10px;font-style:normal;font-size:10.5px;font-weight:800;color:#e1bc66;text-transform:uppercase;letter-spacing:.05em}.career-preview .cr-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #ffffff22}.career-preview .cr-row ul{margin:4px 0 0 18px;padding:0;font-size:12px}.career-preview .cr-row span{flex:none;font-weight:700;color:#f4d28b}.career-preview .cr-locked-hidden{opacity:.55}';document.head.append(st);
 const oldP=paneP;paneP=function(T){const r=oldP.apply(this,arguments);try{const list=T.querySelector('.hd-gm-list')||T;if(!T.querySelector('#crOpen')){const b=document.createElement('button');b.type='button';b.id='crOpen';b.className=list.classList.contains('hd-gm-list')?'hd-gm-item':'challenge-overview';b.innerHTML='<span class="tx"><b>Skyline Career</b><small>Preview build · four boards</small></span>';b.onclick=()=>{sfx('tap');open()};list.prepend(b)}}catch(e){}return r};
}
// Main-screen Career button (owner request 19 Nov 2026): a third action under Play Solo and Game Modes.
if(enabled&&typeof homeTab==='function'){
 const st=document.createElement('style');st.textContent='#title .hd-stage.v2 .hd-actions.has-career{display:grid!important;grid-template-columns:1fr 1fr;column-gap:calc(1.2*var(--hd-u,8px));align-items:center}#title .hd-stage.v2 .hd-actions.has-career>.hd-main{grid-column:1/-1}#title .hd-stage.v2 .hd-actions.has-career>.hd-gmbtn{width:100%!important;min-width:0}#title .hd-stage.v2 .hd-career small{margin-left:4px;font-size:.78em;color:#f2cf78;font-weight:600}#title .hd-stage.v2 .hd-gm{grid-column:1/-1}';document.head.append(st);
 const priorHome=homeTab;homeTab=function(){const r=priorHome.apply(this,arguments);try{const acts=document.querySelector('#title .hd-stage.v2 .hd-actions');
  if(acts&&!acts.querySelector('#hdCareer')){const v=C.view(load(),ctx()),open1=v.filter(b=>b.unlocked).length;const b=document.createElement('button');b.type='button';b.id='hdCareer';b.className='hd-gmbtn hd-career';
   b.setAttribute('aria-label','Career mode, '+open1+' of '+v.length+' boards unlocked');
   b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 18 5 7l4.5 4.5L12 5l2.5 6.5L19 7l2 11zm0 2h18v2H3z"/></svg><span>Career</span><small>'+open1+' / '+v.length+'</small>';
   b.onclick=()=>{try{sfx('tap')}catch(e){}open()};acts.append(b);acts.classList.add('has-career')}}catch(e){console.warn('Career button',e)}return r};
 try{if(typeof setup!=='undefined'&&setup.tab==='play'&&document.querySelector('#title .hd-stage.v2'))homeTab('play')}catch(e){}
}
// With the flag off every entry point is inert: nothing is read into the UI and nothing is written to the profile.
const off=()=>({ok:false,reason:'career-disabled'});
window.SkylineCareer=Object.freeze({enabled,circuitAlpha,ingest:enabled?ingest:()=>[],inbox:()=>inbox,state:()=>C.view(load(),ctx()),raw:()=>load(),last:()=>last,
 startOrigins:enabled?startOrigins:()=>false,open:enabled?open:()=>false,
 completeTutorial:enabled?board=>{const s=load();const u=C.completeTutorial(s,board,ctx());store(s);return u}:off,
 completeChallenge:enabled?(board,id,tag)=>{const s=load();const r=C.completeChallenge(s,board,id,tag,ctx());if(r.ok)store(s);return r}:off});
})();
