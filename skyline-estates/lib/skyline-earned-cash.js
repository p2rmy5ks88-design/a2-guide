/* Web-only earned SC progression and wallet. Reuses PR #95's SC badge identity. */
(function () {
  'use strict';
  if(window.SkylineEarnedCash)return;
  const fmtSC=SkylineCurrency.formatCash,R=SkylineSCWallet.RULES;
  const wallet=SkylineSCWallet.create(localStorage);
  let error='',lastResult=null;
  function safe(fn,fallback=null){try{return fn()}catch(e){error=e.message;return fallback}}
  safe(()=>wallet.migrate(PREF,season(),weekly()));
  const view=()=>safe(()=>wallet.view(),{balance:0,totals:{},spent:0,transactions:[]});
  const balance=()=>view().balance;
  function refresh(){const n=balance();if(!error)PREF.scReserve=n;refreshCashHeader()}
  function saved(){refresh();savePref()}
  function credit(id,amount,source,label,meta){const t=safe(()=>wallet.record(id,amount,source,label,meta));if(t)saved();return t}
  const localEligible=()=>!!(G&&!G.online&&!G.sim&&!G.scAssisted&&!FAST&&trackable());
  const oldClaim=claimTier;
  claimTier=function(tier,premium){
    if(!Number.isInteger(tier)||tier<1||tier>TIERS)return false;
    const S=season(),done=oldClaim.apply(this,arguments);
    if(!premium&&tier%5===0&&S.cf[tier]&&seasonTierNow()>=tier)credit('season:'+S.n+':'+tier,R.season,'season','Free Season tier '+tier,{season:S.n});
    return done;
  };
  const oldWeekly=weeklyAdd;
  weeklyAdd=function(kind,number){
    const S=season(),W=weekly(),before=new Set(W.list.filter(id=>W.done[id]));
    const result=oldWeekly.apply(this,arguments);
    for(const id of W.list){const m=WEEKLY.find(x=>x.id===id);if(W.done[id]&&m&&(W.prog[id]||0)>=m.g)credit('weekly:'+S.n+':'+W.w+':'+id,R.weekly,'weekly','Weekly: '+loc(m.n),{season:S.n,week:W.w});}
    return result;
  };
  const oldMissions=missionScan;
  missionScan=function(){
    const D=daily(),before=new Set(D.list.filter(id=>D.done[id])),eligible=localEligible();
    const result=oldMissions.apply(this,arguments);
    if(eligible&&D.date===today())for(const id of D.list)if(!before.has(id)&&D.done[id]){
      const m=MISSIONS.find(x=>x.id===id);
      if(m){const t=safe(()=>wallet.daily(Math.floor(Date.now()/86400000),id,'Daily: '+loc(m.n)));if(t)saved();}
    }
    return result;
  };
  const major={hotel:R.firstTower,hotels3:R.threeTowers};
  const oldAward=achAward;
  achAward=function(id){
    if(G&&G.scAssisted)return;
    const before=!!PREF.ach[id],eligible=localEligible(),result=oldAward.apply(this,arguments);
    if(eligible&&!before&&PREF.ach[id]&&major[id])credit('achievement:'+id,major[id],'achievement',ACH.find(a=>a.id===id)?.name||id,{season:season().n});
    return result;
  };
  const oldQuiz=quiz;
  quiz=async function(){
    if(!(G&&G.scAssisted))return oldQuiz.apply(this,arguments);
    const game=G,before=PREF.stats.quiz;
    try{return await oldQuiz.apply(this,arguments)}finally{if(G===game){if(before===undefined)delete PREF.stats.quiz;else PREF.stats.quiz=before;savePref()}}
  };
  const oldCity=cityScan;
  cityScan=function(){
    const city=cityNow(),before=cityDone(city),eligible=localEligible(),result=oldCity.apply(this,arguments);
    if(eligible&&before<CT.length&&cityDone(city)===CT.length)credit('city:'+city,R.cityCollection,'city','All '+CITY_DATA[city].name+' City Awards',{season:season().n});
    return result;
  };
  const fresh=new WeakSet(),oldNew=newGame;
  newGame=function(){const result=oldNew.apply(this,arguments);if(G)fresh.add(G);return result};
  const oldStart=startWith;
  function begin(game,args){
    const result=oldStart.apply(null,args);
    if(game===G&&!game.online&&!game.sim&&!game.scAssisted&&game.masteryId&&game.players.some(p=>!p.ai))safe(()=>wallet.start(game.masteryId,{city:game.set.city}));
    return result;
  }
  startWith=function(game){
    const args=arguments,isFresh=fresh.delete(game),solo=isFresh&&game&&!game.online&&!game.sim&&!game.masteryId&&game.players.filter(p=>!p.ai).length===1&&!game.players.some(p=>p.uid);
    if(!(solo&&PREF.scBoostNext&&balance()>0))return begin(game,args);
    // Serialize spending across tabs. No-lock browsers keep the wallet usable but
    // cannot spend it; rewards remain unique immutable receipt keys.
    if(!navigator.locks){toast('Solo bonuses need a browser with secure wallet locking. Your SC is kept.');return begin(game,args)}
    const generation=GEN,prior=G;
    return navigator.locks.request('skyline-earned-sc-practice',()=>{
      if(G!==prior||GEN!==generation)return;
      let stored;try{stored=JSON.parse(localStorage.getItem(PKEY)||'{}')}catch{toast('Saved practice selection could not be read.');return begin(game,args)}
      if(!stored.scBoostNext){PREF.scBoostNext=false;return begin(game,args)}
      const me=game.players.find(p=>!p.ai),id=stored.scBoostId||crypto.randomUUID();
      const spent=safe(()=>wallet.spend(id,me.cash));
      if(spent){me.cash-=spent.amount;game.scAssisted=true;game.scStartingBonus=-spent.amount;PREF.scBoostNext=false;saved()}
      return begin(game,args);
    });
  };
  const oldTrackable=trackable;
  trackable=function(){return oldTrackable.apply(this,arguments)&&!(G&&G.scAssisted)};
  const oldPrompt=setPrompt;
  setPrompt=function(html){return oldPrompt.call(this,(G?.scAssisted?'<b>Practice · no trophies or career wins</b><br>':'')+html)};
  const oldProgress=progressGameEnd;
  progressGameEnd=function(winner){
    const id=G?.masteryId,eligible=localEligible()&&G.over&&!G.progDone&&!PREF.tokenMastery?.receipts?.[id],before=balance();
    const result=oldProgress.apply(this,arguments);
    if(eligible&&result&&id){const humans=ownerHumans(),activity=humans.reduce((n,p)=>{const s=st(p);return n+(s.buys||0)+(s.houses||0)+(s.hotels||0)+(s.trades||0)+(s.go||0)+(s.aucWins||0)},0);
      const t=safe(()=>wallet.complete(id,{rounds:G.round,activity,won:humans.includes(winner),season:season().n}));if(t)saved();}
    if(result)lastResult={game:G,amount:Math.max(0,balance()-before)};
    return result;
  };
  const oldFinish=finish;
  let finishBalance=null;
  finish=function(){finishBalance=balance();return oldFinish.apply(this,arguments)};
  const oldModal=modal;
  modal=function(options){
    if(options?.html?.includes('class="endgrid"')){
      const earned=lastResult?.game===G?Math.max(0,balance()-(finishBalance??(balance()-lastResult.amount))):0;
      const note='<div class="sc-result"><b>Saved SC rewards: '+fmtSC(earned)+'</b><small>Final standings show match net worth, not a wallet deposit.'+(G?.scAssisted?' Practice complete: no trophies, career wins or building-upgrade eligibility were awarded. Play without the practice bonus to progress.':'')+'</small></div>';
      options={...options,html:options.html+note};
    }
    return oldModal.apply(this,[options]);
  };
  async function toggleBonus(){
    if(PREF.scBoostNext){PREF.scBoostNext=false;savePref();refreshCashHeader();return false}
    if(error||balance()<=0)return false;
    const choice=await modal({html:'<div class="mh">Use saved SC for solo practice?</div><div class="mtxt">Up to <b>'+fmtSC(R.practiceCap)+'</b>, capped at 10% of normal starting cash, will be spent once when your next new offline solo game starts.</div><div class="mtxt"><b>Assisted practice earns no career wins, building upgrade eligibility, XP, trophies, Season progress, challenges or saved SC.</b> Online, pass-and-play and resumed games cannot use this bonus. You can cancel before starting.</div>',btns:[{k:'x',label:'Keep my SC'},{k:'enable',label:'Start practice without progression',primary:true}]});
    if(choice==='enable'){PREF.scBoostNext=true;PREF.scBoostId=crypto.randomUUID();savePref();refreshCashHeader();return true}return false;
  }
  async function openWallet(){
    const v=view(),S=season(),seasonEarned=v.transactions.filter(t=>t.amount>0&&t.source!=='opening'&&(t.season??Math.max(2,Math.floor((t.at-SEASON_EPOCH)/SEASON_LEN)+2))===S.n).reduce((n,t)=>n+t.amount,0);
    const stats=[['Earned this Season',seasonEarned],['Free Season tiers',v.totals.season||0],['Weekly challenges',v.totals.weekly||0],['Daily challenges',v.totals.daily||0],['Completed matches',v.totals.match||0],['Major milestones',(v.totals.achievement||0)+(v.totals.city||0)],['Used in solo practice',v.transactions.filter(t=>t.source==='practice').reduce((n,t)=>n-t.amount,0)],['Building upgrades',v.transactions.filter(t=>t.source==='estate-upgrade').reduce((n,t)=>n-t.amount,0)]];
    const history=v.transactions.filter(t=>t.amount!==0).slice(0,16);
    const list=history.map(t=>'<li><span><b>'+esc(t.label)+'</b><small>'+esc(new Date(t.at).toLocaleDateString())+'</small></span><strong class="'+(t.amount<0?'debit':'')+'">'+(t.amount>0?'+':'')+fmtSC(t.amount)+'</strong></li>').join('')||'<li>No transactions yet. Complete challenges to earn saved SC.</li>';
    const html='<div class="mh">Skyline Cash</div><div class="sc-wallet"><div class="sc-available"><span class="skyline-sc-symbol" aria-hidden="true">SC</span><span><small>Available · saved on this device</small><b>'+(error?'Unavailable':fmtSC(v.balance))+'</b></span></div>'+(error?'<p class="sc-error">'+esc(error)+'</p>':'')+'<p>Skyline Cash is used for property transactions during matches. Earned SC rewards are saved separately. Spend them on permanent building rarity upgrades in Portfolio, or optional solo-practice bonuses.</p><dl class="sc-stats">'+stats.map(([label,n])=>'<div><dt>'+esc(label)+'</dt><dd>'+fmtSC(n)+'</dd></div>').join('')+'</dl><details open><summary>Ways to earn</summary><ul class="sc-methods"><li>Free Season tiers 5, 10…40: '+fmtSC(R.season)+' each.</li><li>Completed weekly challenge: '+fmtSC(R.weekly)+'.</li><li>Eligible Daily mission: '+fmtSC(R.daily)+'; up to three daily.</li><li>Qualifying local match: '+fmtSC(R.completion)+' + '+fmtSC(R.win)+' for a win; up to three daily. At least 5 rounds, 2 minutes and 3 recorded actions. Online results are not verified for this reward.</li><li>First tower '+fmtSC(R.firstTower)+'; three towers '+fmtSC(R.threeTowers)+'; complete a City Awards collection '+fmtSC(R.cityCollection)+', once each.</li></ul></details><details><summary>Recent transactions</summary><ul class="sc-history">'+list+'</ul></details><p class="sc-disclosure">Opening reserve: '+fmtSC(v.totals.opening||0)+'. Source totals cover recorded rewards since this wallet update; older reserve history may be incomplete. This is device-local progression, not a tamper-proof online wallet. It does not sync between devices or buy Coins, Shop items or entitlements. Rent and payday stay inside the match.</p><p class="sc-practice-note">'+(PREF.scBoostNext?'Solo practice bonus enabled. You can cancel below.':'Solo practice is optional: up to SC 100M and 10% of starting cash. Assisted matches earn no normal profile progression.')+'</p></div>';
    const choice=await modal({cls:'wide sc-wallet-modal',html,btns:[{k:'x',label:'Close'},{k:'season',label:'Season / weekly'},{k:'daily',label:'Daily challenges'},{k:'portfolio',label:'Building upgrades',primary:true},{k:'practice',label:PREF.scBoostNext?'Cancel solo bonus':'Use SC in solo practice',disabled:!!error||(!PREF.scBoostNext&&v.balance===0)}]});
    if(choice==='season'||choice==='daily')homeTab(choice==='season'?'season':'daily');
    if(choice==='portfolio')homeTab('portfolio');
    if(choice==='practice'){await toggleBonus();openWallet()}
  }
  // PR #95's round SC badge, extended to the full earned-wallet panel.
  function refreshCashHeader(){
    const coins=document.querySelector('#rprof #tbCoins');if(!coins)return;
    let button=document.querySelector('#tbSkylineCash');
    if(!button){button=document.createElement('button');button.type='button';button.id='tbSkylineCash';button.className='tpill skyline-sc-header';button.innerHTML='<span class="skyline-sc-symbol" aria-hidden="true">SC</span><b class="skyline-sc-header-amount"></b>';coins.before(button);button.onclick=openWallet;}
    button.querySelector('b').textContent=error?'—':fmtSC(balance()).replace(/^SC /,'');
    button.setAttribute('aria-label','Skyline Cash wallet: '+(error?'unavailable':fmtSC(balance()))+'. View earnings, history and uses.');
    button.title='Saved earned Skyline Cash · separate from match cash';
    coins.title='Skyline Coins · Shop, cosmetics and premium unlocks';
    if(!coins.querySelector('.skyline-coin-label'))coins.insertAdjacentHTML('beforeend','<span class="skyline-coin-label">Coins</span>');
  }
  const oldRail=railProfile;
  railProfile=function(){const result=oldRail.apply(this,arguments);refreshCashHeader();return result};
  function chip(text){const e=document.createElement('small');e.className='sc-reward';e.textContent=text;return e}
  const oldSeason=paneSeason;
  paneSeason=function(panel){
    const result=oldSeason.apply(this,arguments),S=season(),track=panel.querySelector('#track');
    if(track)[...track.children].forEach((node,i)=>{const tier=Math.floor((i-3)/3)+1;if(i>=3&&node.classList.contains('scell')&&!node.classList.contains('prem')&&tier%5===0){const status=S.cf[tier]?'Claimed':seasonTierNow()>=tier?'Claimable':'Locked';node.classList.add('sc-cash-tier');node.querySelector('small')?.append(chip('+SC '+R.season+'M'));node.setAttribute('aria-label',(node.getAttribute('aria-label')||'Free tier '+tier)+'. SC '+R.season+'M: '+status)}});
    panel.querySelectorAll('.swc').forEach((node,i)=>{const id=weekly().list[i],done=weekly().done[id];node.append(chip(WEEK_SXP+' XP · '+WEEK_COINS+' Coins · SC '+R.weekly+'M'+(done?' · Completed':'')))});
    const section=document.createElement('section');section.className='skyline-sc-reserve';section.innerHTML='<div><strong>Earned SC wallet: '+fmtSC(balance())+'</strong><small>Spend saved SC on permanent building upgrades in Portfolio. Match cash is separate; practice bonuses earn no progression.</small></div><button class="skyline-sc-use" type="button">'+(PREF.scBoostNext?'Cancel solo bonus':'Practice bonus (no rewards)')+'</button><button class="skyline-sc-details" type="button">Wallet &amp; history</button>';
    const b=section.querySelector('.skyline-sc-use');b.disabled=!!error||(!PREF.scBoostNext&&balance()===0);b.onclick=async()=>{await toggleBonus();paneSeason(panel)};section.querySelector('.skyline-sc-details').onclick=openWallet;(track||panel.querySelector('.sban')).after(section);
    return result;
  };
  const oldDaily=paneDaily;
  paneDaily=function(panel){const result=oldDaily.apply(this,arguments);panel.querySelectorAll('.dgrid .goal:not(.bonus) .grw').forEach(node=>node.append(chip('SC '+R.daily+'M saved')));const title=panel.querySelector('.dgrid .gh');if(title)title.append(chip('Eligible completed missions also earn SC '+R.daily+'M each; maximum three per day. Saved on this device.'));return result};
  const oldSpot=paneSpotlight;
  paneSpotlight=function(panel){const result=oldSpot.apply(this,arguments);panel.querySelectorAll('.spweek .sprw').forEach(node=>node.append(chip('SC '+R.weekly+'M saved')));return result};
  const oldAch=paneAch;
  paneAch=function(panel){const result=oldAch.apply(this,arguments);const note=document.createElement('p');note.className='sc-awards-note';note.textContent='Saved SC milestones: first tower SC '+R.firstTower+'M · three towers SC '+R.threeTowers+'M · all City Awards SC '+R.cityCollection+'M. New eligible local achievements only; once each.';panel.querySelector('.achbody')?.prepend(note);return result};
  const style=document.createElement('link');style.rel='stylesheet';style.href='./lib/skyline-earned-cash.css';document.head.append(style);
  addEventListener('storage',e=>{if(e.key?.startsWith(SkylineSCWallet.PREFIX))refresh()});
  window.SkylineEarnedCash=Object.freeze({version:'earned-wallet-1',balance,view,open:openWallet,rules:R,toggleBonus});
  refresh();
})();
