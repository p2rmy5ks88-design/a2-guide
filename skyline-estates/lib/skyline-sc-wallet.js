/* Device-local earned SC ledger. One immutable storage key per receipt prevents
   reward retries/tabs from adding the same grant twice. Never a paid/trusted wallet. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SkylineSCWallet = api;
})(typeof window === 'object' ? window : globalThis, function () {
  'use strict';
  const RULES = Object.freeze({season:40,weekly:25,daily:5,dailyLimit:3,completion:20,win:40,
    firstTower:25,threeTowers:50,cityCollection:100,practiceCap:100,practiceFraction:.1,
    minRounds:5,minMinutes:2,minActivity:3,matchDailyLimit:3});
  const PREFIX='skyline-earned-sc:v1:', MIGRATION=PREFIX+'migration';
  const valid=n=>Number.isSafeInteger(n)&&Math.abs(n)<=1000000000;
  const clone=x=>JSON.parse(JSON.stringify(x));
  function create(storage, now=()=>Date.now()) {
    let migrationBlocked=false;
    const key=id=>PREFIX+'tx:'+encodeURIComponent(id);
    function entries() {
      const rows=[];
      for(let i=0;i<storage.length;i++) {
        const k=storage.key(i);if(!k?.startsWith(PREFIX+'tx:'))continue;
        let t;try{t=JSON.parse(storage.getItem(k))}catch{throw Error('SC wallet record could not be read. Saved data was kept.')}
        if(!t||typeof t.id!=='string'||key(t.id)!==k||!valid(t.amount)||!Number.isFinite(t.at)||typeof t.source!=='string')throw Error('SC wallet record is invalid. Saved data was kept.');
        rows.push(t);
      }
      return rows;
    }
    function view() {
      const transactions=entries(),balance=transactions.reduce((n,t)=>n+t.amount,0);
      if(!valid(balance)||balance<0)throw Error('SC wallet balance is invalid. Saved data was kept.');
      const totals={};for(const t of transactions)if(t.amount>0)totals[t.source]=(totals[t.source]||0)+t.amount;
      return {balance,totals,spent:transactions.reduce((n,t)=>n+Math.max(0,-t.amount),0),transactions:transactions.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id))};
    }
    function record(id,amount,source,label,meta={}) {
      if(migrationBlocked)throw Error('SC migration needs recovery. Saved data was kept.');
      if(typeof id!=='string'||!id.length||id.length>200||!valid(amount)||typeof source!=='string')throw Error('Invalid SC transaction');
      if(storage.getItem(key(id))!==null)return false;
      const before=view();if(before.balance+amount<0||!valid(before.balance+amount))return false;
      const tx={id,amount,source,label:String(label).slice(0,160),at:now(),...meta};
      // Only internal callers supply metadata. Immutable core fields win.
      tx.id=id;tx.amount=amount;tx.source=source;tx.at=now();
      storage.setItem(key(id),JSON.stringify(tx));
      return clone(tx);
    }
    function migrate(profile,season,week) {
      if(storage.getItem(MIGRATION)!==null)return;
      const hadLegacy=Object.hasOwn(profile,'scReserve')||Object.hasOwn(profile,'scReserveLog');
      const balance=profile.scReserve===undefined?0:profile.scReserve;
      if(!Number.isSafeInteger(balance)||balance<0||balance>1000000){migrationBlocked=true;throw Error('Existing SC reserve is invalid. Saved data was kept.')}
      record('opening',balance,'opening','Carried forward SC reserve');
      // Existing legacy claims may already have been spent, and its log was bounded.
      // Acknowledge them without guessing/recrediting. A pre-SC profile can safely
      // receive current-season claimed free tiers once.
      for(let tier=5;tier<=40;tier+=5)if(season?.cf?.[tier])record('season:'+season.n+':'+tier,hadLegacy?0:RULES.season,hadLegacy?'legacy':'season',hadLegacy?'Previously claimed Season reward':'Season tier '+tier+' (retroactive)',{season:season.n});
      for(const id of week?.list||[])if(week.done?.[id])record('weekly:'+season.n+':'+week.w+':'+id,0,'legacy','Previously completed weekly challenge');
      // Do not backfill old Daily/match/milestone completions without receipts.
      storage.setItem(MIGRATION,JSON.stringify({version:1,at:now(),legacyHistory:hadLegacy}));
    }
    function highDay(){return entries().reduce((n,t)=>Math.max(n,Math.floor(t.at/86400000)),-Infinity)}
    function daily(day,id,label) {
      const d=Math.floor(now()/86400000);
      if(day!==d||d<highDay())return false;
      const count=entries().filter(t=>t.source==='daily'&&t.day===day).length;
      if(count>=RULES.dailyLimit)return false;
      return record('daily:'+day+':'+id,RULES.daily,'daily',label,{day});
    }
    function start(id,meta) {return record('start:'+id,0,'session','Local match started',meta)}
    function complete(id,{rounds,activity,won,season}) {
      const startRow=entries().find(t=>t.id==='start:'+id),day=Math.floor(now()/86400000);
      if(!startRow||!Number.isSafeInteger(rounds)||!Number.isSafeInteger(activity)||rounds<RULES.minRounds||activity<RULES.minActivity||now()-startRow.at<RULES.minMinutes*60000||day<highDay())return false;
      if(entries().filter(t=>t.source==='match'&&t.day===day).length>=RULES.matchDailyLimit)return false;
      return record('match:'+id,RULES.completion+(won?RULES.win:0),'match',won?'Completed match + win':'Completed match',{day,season,matchId:id});
    }
    function spend(id,ordinaryCash) {
      if(!Number.isFinite(ordinaryCash)||ordinaryCash<=0)return false;
      const amount=Math.min(RULES.practiceCap,Math.floor(ordinaryCash*RULES.practiceFraction),view().balance);
      if(!Number.isSafeInteger(amount)||amount<=0)return false;
      return record('practice:'+id,-amount,'practice','Solo-practice starting bonus',{matchId:id});
    }
    return Object.freeze({view,record,migrate,daily,start,complete,spend});
  }
  return Object.freeze({create,RULES,PREFIX});
});
