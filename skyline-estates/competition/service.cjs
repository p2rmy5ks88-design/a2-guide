'use strict';
// Privileged projection of the existing authoritative turn service. Browser
// requests contain only a room/revision; scores and contributions are derived.
const crypto=require('node:crypto'),vm=require('node:vm');
const {ServiceError,identityVerifier}=require('../security/service/admission.cjs');
const {sourceHash,section,line,cityRaw}=require('../security/service/audited-rules.cjs');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
const fail=(n,c)=>{throw new ServiceError(n,c)},EPOCH=Date.UTC(2026,9,25),SEASON=45*864e5,WEEK=7*864e5;
const CITIES=['lagos','stockholm','tokyo','dubai'],CATEGORIES=['season','city','worth','developers','weekly'];
const rules=Object.freeze({mode:'timed',rounds:10,cash:1600,ai:'normal',speed:'fast',timer:0,minigames:false,perks:false,ffa:false,events:false,speedDie:false,pot:false,goDouble:false,jailRent:false,auction:true,even:true,interest:true});
const seasons=at=>Math.max(2,Math.floor((at-EPOCH)/SEASON)+2),weeks=at=>Math.floor((at-EPOCH)/WEEK);
const leagues=vm.runInNewContext(line('const LEAGUES=')+'\nLEAGUES',{},{timeout:100});
const project=new vm.Script(section('const W=1100','/* ================= SOUND ================= */')+'\n'+section('const COUNTRIES=','/* ---- city looks ---- */')+'\n'+line('function standings(){')+'\n'+line('{const _sd=standings;')+`\nG=JSON.parse(input);applyCity(G.set.city);JSON.stringify(standings().map((p,i)=>({rank:i+1,id:p.id,cash:p.cash,netWorth:netWorth(p),bankrupt:p.bankrupt,development:G.own.reduce((n,o)=>n+(o.o===p.id?o.h:0),0)})));`,{filename:'competition-final-projection'});
function settings(city){if(!CITIES.includes(city))fail(400,'unsupported-city');return {...rules,city,theme:city}}
function exact(value,keys){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==keys.slice().sort().join(','))fail(400,'invalid-fields')}
function createCompetitionService({db,verifyIdToken,clock=Date.now,operationLimit=30,timeoutMs=5000,randomId=()=>crypto.randomBytes(16).toString('hex')}){
 if(!db||typeof verifyIdToken!=='function')throw Error('Privileged store and verified auth required');const identity=identityVerifier(verifyIdToken);
 async function transaction(token,fn){const uid=await identity(token),now=clock();let outcome;
  let timer;try{const tx=await Promise.race([db.ref('skylineV2').transaction(root=>{root=root||{};root.competition=root.competition||{version:1,profiles:{},receipts:{},projects:{},limits:{}};const c=root.competition;
   if(c.version!==1)fail(503,'unsupported-competition-version');const k=hash(uid),old=c.limits[k];if(!old||now-old.at>=60000)c.limits[k]={at:now,n:0};if(c.limits[k].n>=operationLimit){outcome={error:new ServiceError(429,'rate-limited')};return root}c.limits[k].n++;
   try{outcome={data:fn(root,c,uid,now,k)}}catch(e){if(!(e instanceof ServiceError))throw e;outcome={error:e}}return root;
  },undefined,false),new Promise((_,reject)=>timer=setTimeout(()=>reject(new ServiceError(503,'temporarily-unavailable')),timeoutMs))]);if(!tx.committed)fail(503,'temporarily-unavailable');if(outcome.error)throw outcome.error;return copy(outcome.data);
  }finally{clearTimeout(timer)}
 }
 function profile(c,k){return c.profiles[k]||(c.profiles[k]={publicId:randomId(),publish:false,shareName:false,community:false,name:'SkylineGuest',token:'🚌',seasons:{},days:{},badges:{}})}
 async function updateProfile(token,b){exact(b,['publish','shareName','community','name']);if(['publish','shareName','community'].some(k=>typeof b[k]!=='boolean')||typeof b.name!=='string'||!b.name.trim()||b.name.length>12||/[<>\x00-\x1f\x7f]/.test(b.name))fail(400,'invalid-profile');return transaction(token,(_r,c,_u,_n,k)=>{const p=profile(c,k);Object.assign(p,b);return {protocol:1,publicId:p.publicId,publish:p.publish,shareName:p.shareName,community:p.community,name:p.shareName?p.name:'Skyline Player',badges:p.badges}})}
 async function ingest(token,b){exact(b,['code','revision']);if(!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(b.code)||!Number.isSafeInteger(b.revision)||b.revision<1)fail(400,'invalid-fields');
  return transaction(token,(root,c,uid,now)=>{
   const room=root.rooms?.[b.code],saved=root.service?.results?.[b.code],start=root.service?.starts?.[b.code];
   if(room?.members?.[uid]!==true)fail(403,'not-authorized');
   if(room.meta?.status!=='over'||room.state?.revision!==b.revision||saved?.revision!==b.revision)fail(409,'result-not-ready');
   if(saved.version!==1||start?.version!==1||saved.sourceHash!==sourceHash||start.sourceHash!==sourceHash||saved.gameHash!==hash(room.state.gameJson)||!Number.isSafeInteger(saved.at)||saved.at>now||now-saved.at>48*36e5||saved.at-start.at<120000||seasons(start.at)!==seasons(saved.at))fail(409,'invalid-result');
   let game,summary;try{game=JSON.parse(room.state.gameJson);summary=JSON.parse(saved.summaryJson)}catch{fail(409,'invalid-result')}
   if(!game.over||!game.online||game.sim||game.scAssisted||game.code!==b.code||game.players.length!==2||game.players.some(p=>p.ai||p.tl!==1||!p.uid||room.members[p.uid]!==true)||new Set(game.players.map(p=>p.uid)).size!==2||game.round<5||!CITIES.includes(game.set.city))fail(409,'ineligible-match');
   for(const [k,v]of Object.entries(settings(game.set.city)))if(game.set[k]!==v)fail(409,'ineligible-settings');
   let scores;try{scores=JSON.parse(project.runInNewContext({input:JSON.stringify(game),CITY_DATA:cityRaw},{timeout:100}));if(scores.some(p=>!Number.isSafeInteger(p.netWorth)||p.netWorth<0||p.netWorth>1e8||!Number.isSafeInteger(p.development)||p.development<0||p.development>140))throw Error()}catch{fail(409,'invalid-result')}
   if(!Array.isArray(summary.standings)||summary.standings.length!==scores.length||scores.some((p,i)=>['rank','id','cash','netWorth','bankrupt'].some(k=>p[k]!==summary.standings[i]?.[k]))||summary.winnerId!==scores[0].id)fail(409,'invalid-result');
   const draw=scores.every(s=>!s.bankrupt&&s.netWorth===scores[0].netWorth);
   const match=hash([b.code,start.gameHash,saved.gameHash,b.revision].join(':'));if(c.receipts[match])return {protocol:1,duplicate:true,match};
   const season=seasons(saved.at),week=weeks(saved.at),day=Math.floor(saved.at/864e5),projectId='bridge-s'+season;
   const bridge=c.projects[projectId]||(c.projects[projectId]={id:projectId,title:'Skyline Bridge',goal:1000,total:0,starts:EPOCH+(season-2)*SEASON,ends:EPOCH+(season-1)*SEASON});
   for(const score of scores){const player=game.players[score.id],k=hash(player.uid),p=profile(c,k);if((p.days[day]||0)>=3)continue;p.days[day]=(p.days[day]||0)+1;p.token=player.tok;
    const stats=p.seasons[season]||(p.seasons[season]={points:0,games:0,worth:0,developers:0,cities:{},weeks:{},contributions:0});const points=draw?0:score.rank===1?60:-8;
    stats.games++;stats.points=Math.max(0,stats.points+points);stats.worth=Math.max(stats.worth,score.bankrupt?0:score.netWorth);stats.developers=Math.max(stats.developers,score.development);stats.cities[game.set.city]=Math.max(stats.cities[game.set.city]||0,score.bankrupt?0:score.netWorth);stats.weeks[week]=Math.max(0,(stats.weeks[week]||0)+points);
    if(p.community){bridge.total++;stats.contributions++}
   }
   c.receipts[match]={at:saved.at,season,week};return {protocol:1,duplicate:false,match,season,week,draw};
  });
 }
 async function rankings(token,b){exact(b,['category','city']);if(!CATEGORIES.includes(b.category)||b.city!==null&&!CITIES.includes(b.city)||b.category==='city'&&!b.city)fail(400,'unsupported-filter');return transaction(token,(_r,c,_uid,now,k)=>{const season=seasons(now),week=weeks(now);const all=Object.entries(c.profiles).filter(([,p])=>p.publish&&p.seasons[season]).map(([id,p])=>{const s=p.seasons[season],score=b.category==='season'?s.points:b.category==='weekly'?(s.weeks[week]||0):b.category==='city'?(s.cities[b.city]||0):b.category==='worth'?s.worth:s.developers;return {id:p.publicId,name:p.shareName?p.name:'SkylineGuest',token:p.token,score,league:leagues.filter(l=>s.points>=l.min).at(-1).name,me:id===k}}).filter(p=>p.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));const mine=all.findIndex(p=>p.me);return {protocol:1,verified:true,category:b.category,city:b.city,season,week,mode:'timed-10-two-human-v1',ends:b.category==='weekly'?EPOCH+(week+1)*WEEK:EPOCH+(season-1)*SEASON,rows:all.slice(0,50).map((p,i)=>({...p,rank:i+1})),myPosition:mine<0?null:{...all[mine],rank:mine+1}}})}
 async function community(token,b){exact(b,[]);return transaction(token,(_r,c,_uid,now,k)=>{const season=seasons(now),id='bridge-s'+season,p=c.profiles[k],v=c.projects[id]||{id,title:'Skyline Bridge',goal:1000,total:0,starts:EPOCH+(season-2)*SEASON,ends:EPOCH+(season-1)*SEASON};return {protocol:1,verified:true,...v,contributed:p?.seasons?.[season]?.contributions||0,claimed:!!p?.badges?.[id]}})}
 async function claimProject(token,b){exact(b,[]);return transaction(token,(_r,c,_u,now,k)=>{const season=seasons(now),id='bridge-s'+season,p=profile(c,k),v=c.projects[id];if(!v||v.total<v.goal||!p.seasons[season]?.contributions)fail(409,'project-not-ready');const duplicate=!!p.badges[id];p.badges[id]=p.badges[id]||{id,title:'Skyline Bridge Contributor',at:now};return {protocol:1,duplicate,badge:p.badges[id]}})}
 async function getProfile(token,b){exact(b,[]);return transaction(token,(_r,c,_u,now,k)=>{const p=profile(c,k);return {protocol:1,publicId:p.publicId,publish:p.publish,shareName:p.shareName,community:p.community,name:p.name,badges:p.badges,stats:p.seasons[seasons(now)]||null}})}
 return {ingest,rankings,community,claimProject,updateProfile,getProfile,capabilities:()=>({protocol:1,verified:true,version:1,categories:CATEGORIES,cities:CITIES,community:'skyline-bridge',conditions:rules,dailyLimit:3})};
}
module.exports={createCompetitionService,settings,rules,CITIES,CATEGORIES,sourceHash};
