'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../game.html'),'utf8');
const section=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start);return source.slice(start,end)};
function fixture(){
 let fail=false;const stored=new Map(),PREF={coins:100,tokLv:{bus:1},tokWins:{},inv:{tok:{bus:true}}};
 const c=vm.createContext({PREF,FAST:false,NET:{me:'owner'},TOKEN_INFO:{bus:['Bus']},PKEY:'profile',crypto:require('node:crypto'),cleanName:s=>String(s).slice(0,12),tokLv:()=>1,st:p=>p.stats||{},localStorage:{setItem:(k,v)=>{if(fail)throw Error('quota');stored.set(k,v)}},toast:()=>{}});
 vm.runInContext(section('/* ================= TOKEN MASTERY: DEVICE PROFILE','/* ================= END TOKEN MASTERY')+section('/* ---- daily event:','/* ---- end daily event ---- */')+section('function leaderboardRows','async function lbFetch'),c);
 return {PREF,c,stored,fail:()=>fail=true};
}
test('events rotate deterministically at UTC midnight, not when opening a tab',()=>{
 const {c}=fixture();for(let day=20000;day<20003;day++){const a=c.dailyEventView({},day*86400000),b=c.dailyEventView({},day*86400000+86399999);assert.equal(a.id,b.id);assert.equal(a.day,day);assert.notEqual(a.id,c.dailyEventView({},(day+1)*86400000).id)}
});
test('one completion award per UTC day survives save/reload and rejects backwards clock',()=>{
 const {c}=fixture(),p={};const time=20000*86400000,e=c.dailyEventView(p,time),stats={buys:5,rent:300,houses:3};assert.equal(c.applyDailyEvent(p,stats,time),e.coins);assert.equal(c.applyDailyEvent(JSON.parse(JSON.stringify(p)),stats,time),0);assert.equal(c.applyDailyEvent(p,stats,time-86400000),0);assert.ok(c.applyDailyEvent(p,stats,time+86400000)>0);
});
test('progress uses best completed game, not additive easy farming',()=>{
 const {c}=fixture(),p={},now=20000*86400000,e=c.dailyEventView({},now),stats={[e.key]:e.target-1};assert.equal(c.applyDailyEvent(p,stats,now),0);assert.equal(c.applyDailyEvent(p,stats,now),0);assert.equal(p.dailyEvent.best,e.target-1);assert.equal(c.applyDailyEvent(p,{[e.key]:e.target},now),e.coins);
});
test('match coins and daily event save atomically and replay cannot double grant',()=>{
 const f=fixture(),g={over:true,masteryId:'match-a',players:[{id:0,tok:'bus',ai:false,stats:{buys:5,rent:300,houses:3}}]};const r=f.c.grantTokenMastery(g,g.players[0],400);assert.ok(r.eventCoins>=200);assert.equal(f.PREF.coins,100+400+r.eventCoins);assert.equal(f.c.grantTokenMastery(g,g.players[0],400),null);const saved=JSON.parse(f.stored.get('profile'));assert.equal(saved.coins,f.PREF.coins);assert.equal(saved.dailyEvent.done,true);assert.equal(saved.tokenMastery.receipts['match-a'].coins,r.coins);
});
test('storage failure cannot grant an event or base reward',()=>{
 const f=fixture(),before=JSON.stringify(f.PREF);f.fail();assert.equal(f.c.grantTokenMastery({over:true,masteryId:'failed',players:[{id:0,tok:'bus',ai:false,stats:{buys:5,rent:300,houses:3}}]},{id:0},400),null);assert.equal(JSON.stringify(f.PREF),before);
});
test('simulation and unfinished matches cannot earn daily awards',()=>{
 for(const flags of [{over:false},{over:true,sim:true}]){const f=fixture();assert.equal(f.c.grantTokenMastery({...flags,players:[{id:0,tok:'bus',ai:false,stats:{buys:5,rent:300,houses:3}}]},{id:0},400),null);assert.equal(f.PREF.dailyEvent,undefined)}
});
test('leaderboard rejects malformed scores, derives identity from database key and breaks ties consistently',()=>{
 const {c}=fixture(),rows=c.leaderboardRows({z:{n:'Zed',t:4,u:'injected'},a:{n:'Amy',t:4},b:{n:'Ben',t:5},bad:{n:'Bad',t:Infinity},neg:{n:'Bad',t:-1},float:{n:'Bad',t:4.5},huge:{n:'Bad',t:100001},missing:{t:7},empty:null});assert.deepEqual(Array.from(rows,x=>x.u),['b','a','z']);assert.ok(rows.every(r=>r.l===1));
});
test('launch packs match server amounts while legacy receipt values remain intact',()=>{
 const {CATALOG,APP}=require('../security/service/wallet.cjs');const packs=vm.runInNewContext(source.match(/const IAP_PACKS=([^;]+);/)[1]);assert.deepEqual(Array.from(packs,p=>p.coins),[600,1500,4000,10000]);for(const p of packs)assert.equal(CATALOG[APP+'.'+p.id],p.coins);for(const amount of [500,1200,3000,7000])assert.equal(CATALOG[APP+'.coins_'+amount],amount);
});
test('all playlist files exist, including the three new songs',()=>{
 const tracks=vm.runInNewContext(source.match(/const FM_LIST=([^;]+);/)[1]);assert.equal(new Set(tracks.map(t=>t[0])).size,tracks.length);for(const [id]of tracks){const file=path.join(__dirname,'../../eko-estates/audio/fm',id+'.mp3');assert.ok(fs.statSync(file).size>1000,id)}for(const id of ['bad','priority','skyline-estates','dum-da-dum-answer-am'])assert.ok(tracks.some(t=>t[0]===id));
});
