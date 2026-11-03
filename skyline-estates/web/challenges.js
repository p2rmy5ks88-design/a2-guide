/* Web progression extension. Existing Daily/Weekly rewards and premium tiers stay
   authoritative. New objectives consume qualified immutable completion receipts. */
(()=>{'use strict';
 if(window.SkylineChallenges||!window.SkylineEarnedCash)return;
 const ledger=SkylineSCWallet.create(localStorage),clone=x=>JSON.parse(JSON.stringify(x));
 const SPEC=Object.freeze([
  {id:'season-games-v1',title:'Season Investor',kind:'games',target:20,sc:50,coins:150,xp:500},
  {id:'season-cities-v1',title:'Three City Champion',kind:'cities',target:3,sc:40,coins:100,xp:350,item:['dice','midnight']},
  {id:'season-build-v1',title:'Season Developer',kind:'houses',target:30,sc:40,coins:100,xp:350,item:['fin','chrome']},
  {id:'lagos-arts-v1',city:'lagos',title:'Lagos Arts Developer',kind:'district',group:'pink',target:3,sc:25,coins:60,xp:200,item:['dice','mint']},
  {id:'stockholm-old-v1',city:'stockholm',title:'Stockholm Old Town',kind:'district',group:'sky',target:3,sc:25,coins:60,xp:200},
  {id:'tokyo-tower-v1',city:'tokyo',title:'Tokyo Tower Builder',kind:'towers',target:1,sc:25,coins:60,xp:200,item:['fin','ruby']},
  {id:'dubai-water-v1',city:'dubai',title:'Dubai Waterfront',kind:'district',group:'navy',target:2,sc:25,coins:60,xp:200}
 ].map(x=>Object.freeze({...x,version:1})));
 let error='';
 const rows=()=>{try{return ledger.view().transactions.filter(t=>t.source==='objective-match'&&t.version===1&&t.season===season().n)}catch(e){error=e.message;return []}};
 const claims=()=>PREF.challengeClaims||{};
 const key=s=>'s'+season().n+':'+s.id;
 function value(s){const a=rows().filter(r=>!s.city||r.city===s.city);return Math.min(s.target,s.kind==='games'?a.length:s.kind==='cities'?new Set(a.filter(r=>r.won).map(r=>r.city)).size:s.kind==='houses'?a.reduce((n,r)=>n+r.houses,0):s.kind==='towers'?Math.max(0,...a.map(r=>r.towers)):Math.max(0,...a.map(r=>r.districts?.[s.group]||0)))}
 function record(w){
  if(!G?.over||G.online||G.sim||G.scAssisted||FAST||!trackable()||!G.masteryId)return false;
  const p=G.players[G.owner??G.players.find(q=>!q.ai)?.id];if(!p||p.ai)return false;
  const all=ledger.view().transactions,start=all.find(t=>t.id==='start:'+G.masteryId),now=Date.now(),st=p.st||{};
  const activity=['buys','houses','hotels','trades','go','aucWins'].reduce((n,k)=>n+(st[k]||0),0);
  if(!start||start.city!==(G.set.city||'lagos')||now-start.at<120000||G.round<5||activity<3||all.some(t=>t.at>now))return false;
  const districts={};for(const [g,ids]of Object.entries(GROUPS))districts[g]=ids.filter(i=>G.own[i].o===p.id&&G.own[i].h>0&&!G.own[i].m).length;
  const receipt=ledger.record('objective-match:'+G.masteryId,0,'objective-match','Qualified challenge match',{version:1,season:season().n,city:G.set.city||'lagos',won:p===w,houses:Math.max(0,Math.min(1000,st.houses||0)),towers:G.own.filter(o=>o.o===p.id&&o.h===5).length,districts});
  if(receipt){if(G.set.events2)weeklyAdd('qualifiedStrategic',1);if(G.set.marketPulse)weeklyAdd('qualifiedPulse',1)}return receipt;
 }
 const oldProgress=progressGameEnd;progressGameEnd=function(w){if(G?.masteryId&&(PREF.tokenMastery?.receipts?.[G.masteryId]||rows().some(t=>t.id==='objective-match:'+G.masteryId)))return null;const r=oldProgress.apply(this,arguments);try{if(r)record(w)}catch(e){error=e.message}return r};
 function repair(){
  // A native device-backup restore must not reopen an already-paid objective.
  // SC receipts survive profile rollback; restore only the claim marker, never
  // award Coins/XP again or rewrite the restored profile's balances.
  for(const t of ledger.view().transactions){if(t.source!=='challenge'||!Number.isSafeInteger(t.season)||!SPEC.some(s=>t.id==='objective-reward:s'+t.season+':'+s.id&&t.amount===s.sc&&t.label===s.title))continue;
   const id=t.id.slice('objective-reward:'.length);if(!claims()[id])PREF.challengeClaims={...claims(),[id]:{version:1,season:t.season,title:t.label,sc:t.amount,at:t.at}};
  }
  for(const [id,c]of Object.entries(claims()))if(c?.version===1&&SPEC.some(s=>id==='s'+c.season+':'+s.id&&s.sc===c.sc&&s.title===c.title))ledger.record('objective-reward:'+id,c.sc,'challenge',c.title,{season:c.season});PREF.scReserve=ledger.view().balance;
 }
 async function claim(id){
  if(!navigator.locks)return {ok:false,message:'Claiming needs secure browser storage locking. Your progress is kept.'};
  return navigator.locks.request('skyline-challenge-claims',()=>{
   try{
    const stored=JSON.parse(localStorage.getItem(PKEY)||'null');if(!stored)throw Error('Saved profile is unavailable.');
    // Reload before checking receipts so simultaneous tabs cannot repeat a claim.
    Object.assign(PREF,stored);repair();const s=SPEC.find(x=>x.id===id);if(!s||claims()[key(s)]||value(s)<s.target)return {ok:false,message:'Already claimed or still in progress.'};
    const before=clone(PREF),oldSave=savePref,oldFast=FAST;let committed=false;
    try{
     // Stage the existing reward helpers, then write profile and receipt together.
     // No asynchronous operation occurs between staging and the single commit.
     savePref=()=>{};FAST=true;
     const receipt={version:1,season:season().n,title:s.title,sc:s.sc,at:Date.now()};
     PREF.challengeClaims={...claims(),[key(s)]:receipt};
     addCoins(s.coins,s.title);addXP(s.xp,s.title);
     if(s.item){const [kind,item]=s.item;if(itemOwned(kind,item)){const it=itemOf(kind,item);addCoins(Math.max(150,Math.round((it.price||600)/2)),it.name+' (already owned)')}else grantItem(kind,item)}
     localStorage.setItem(PKEY,JSON.stringify(PREF));committed=true;
    }finally{savePref=oldSave;FAST=oldFast;if(!committed){for(const k of Object.keys(PREF))delete PREF[k];Object.assign(PREF,before)}}
    // SC uses its own unique receipt; a crash here is repaired on next load.
    repair();savePref();railProfile();return {ok:true,message:s.title+' claimed. Rewards saved on this device.'};
   }catch(e){error=e.message;return {ok:false,message:'Rewards could not finish saving. Existing receipts prevent repeat grants; reopen to recover. '+error}}
  });
 }
 const until=t=>{const h=Math.max(0,Math.ceil((t-Date.now())/36e5));return h>=24?Math.floor(h/24)+'d '+h%24+'h':h+'h'};
 function panel(T){
  const S=season(),end=SEASON_EPOCH+(S.n-1)*SEASON_LEN,box=document.createElement('details');box.className='challenge-extension';box.open=false;
  box.innerHTML='<summary>Season & city objectives · '+SPEC.filter(s=>value(s)>=s.target&&!claims()[key(s)]).length+' ready</summary><p>New qualifying local matches only: 5 rounds, 2 minutes, 3 actions. Profile owner only; no online, simulation or assisted practice. Device-local dates and progress. City objectives renew each Season; district targets must be held together at the finish. Ends '+esc(new Date(end).toUTCString())+' ('+until(end)+').</p><div class="challenge-cards">'+SPEC.map(s=>{const v=value(s),done=!!claims()[key(s)],ready=v>=s.target;const detail=s.kind==='games'?'Finish 20 eligible games':s.kind==='cities'?'Win in 3 different cities':s.kind==='houses'?'Build 30 houses across eligible games':s.kind==='towers'?'Own a tower at the finish':'Develop '+s.target+' properties in '+GNAME[s.group];return '<article><b>'+esc(s.title)+'</b><small>'+esc(detail)+'</small><progress max="'+s.target+'" value="'+v+'"></progress><span>'+v+' / '+s.target+' · '+(done?'Claimed':ready?'Completed':'In progress')+'</span><small>SC '+s.sc+'M saved · '+s.coins+' Coins · '+s.xp+' XP'+(s.item?' · '+esc(itemOf(...s.item).name)+' cosmetic (owned: standard Coin compensation)':'')+'</small><button type="button" data-objective="'+s.id+'" '+(!ready||done?'disabled':'')+'>'+(done?'Claimed':ready?'Claim reward':'Keep playing')+'</button></article>'}).join('')+'</div><p class="challenge-message" role="status">'+esc(error)+'</p>';
  box.querySelectorAll('[data-objective]').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await claim(b.dataset.objective);const opened=box.open;box.remove();const next=panel(T);next.open=opened;next.querySelector('.challenge-message').textContent=r.message});T.append(box);return box;
 }
 for(const name of ['paneSeason','paneSpotlight']){const old=name==='paneSeason'?paneSeason:paneSpotlight;const fn=function(T){const r=old.apply(this,arguments);if(name==='paneSeason'){const note=document.createElement('p');note.className='small';note.textContent='Weekly reset: '+new Date(SEASON_EPOCH+(weekly().w+1)*7*864e5).toUTCString()+' · Existing weekly rewards are credited automatically once completed.';T.querySelector('.sweek')?.after(note)}panel(T);return r};if(name==='paneSeason')paneSeason=fn;else paneSpotlight=fn}
 const oldP=paneP;paneP=function(T){const r=oldP.apply(this,arguments);const b=document.createElement('button');b.className='challenge-overview';b.type='button';b.textContent='Progress overview · '+daily().list.filter(id=>!daily().done[id]).length+' Daily remaining · '+weekly().list.filter(id=>!weekly().done[id]).length+' Weekly remaining · '+seasonClaimable()+' tier rewards · '+SPEC.filter(s=>value(s)>=s.target&&!claims()[key(s)]).length+' objectives ready';b.onclick=()=>homeTab('season');T.append(b);return r};
 const oldAch=paneAch;paneAch=function(T){const r=oldAch.apply(this,arguments);const n=document.createElement('p');n.className='challenge-awards';n.textContent='Earned Season/city objective awards: '+Object.values(claims()).filter(c=>c?.version===1).map(c=>c.title).join(' · ');T.append(n);return r};
 try{repair()}catch(e){error=e.message}
 window.SkylineChallenges=Object.freeze({version:1,specs:SPEC,record,value,claim,repair,claims:()=>clone(claims())});
})();
