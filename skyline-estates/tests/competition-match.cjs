'use strict';
// Natural start-to-finish matches through the real service composition, using an
// isolated privileged transaction store and test identity verifier (not live auth).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {composeCompetition}=require('../competition/compose.cjs'),{settings}=require('../competition/service.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),report={production:false,matches:[]};
(async()=>{for(const city of ['lagos','stockholm','tokyo','dubai']){
 let root={},tail=Promise.resolve(),now=Date.UTC(2026,10,3,12),id=0;
 const db={ref:()=>({transaction:fn=>{const r=tail.then(()=>{let v;for(let i=0;i<3;i++)v=fn(copy(root));root=copy(v);return {committed:true,snapshot:{val:()=>copy(v)}}});tail=r.catch(()=>{});return r}})};
 const svc=composeCompetition({db,clock:()=>now,operationLimit:10000,verifyIdToken:async t=>{if(!['host','guest'].includes(t))throw Error();return {uid:t}}});
 const requestId=()=> 'natural-operation-'+String(++id).padStart(8,'0');
 const room=await svc.admission.execute('host','create',{requestId:requestId(),name:'Host',settings:settings(city)});
 await svc.admission.execute('guest','join',{requestId:requestId(),name:'Guest',code:room.code,invite:room.invite});
 for(const token of ['host','guest'])await svc.competition.updateProfile(token,{publish:true,shareName:false,community:true,name:'Player'});
 await svc.start.startGame('host',{requestId:requestId(),code:room.code,revision:1});
 let v,rolls=0,operations=0;
 for(;operations<2000;operations++){
  now+=5000;v=await svc.views.readGame('host',{code:room.code});if(v.status==='over')break;
  const actor=['host','guest'][v.actorSeat];v=await svc.views.readGame(actor,{code:room.code});const b={requestId:requestId(),code:room.code,revision:v.revision},d=v.decision;
  if(v.stage==='pre'){const r=await svc.plans.reserveRoll(actor,b);await svc.turns.commitRoll(actor,{...b,requestId:requestId(),planId:r.planId});rolls++}
  else if(v.stage==='post')await svc.turns.endTurn(actor,b);
  else if(v.stage==='purchase')await svc.turns.choose(actor,{...b,kind:d.canBuy&&v.game.players[v.seat].cash-d.price>=350?'buy':'decline'});
  else if(v.stage==='card')await svc.turns.choose(actor,{...b,kind:'drawCard'});
  else if(v.stage==='jail'){if(d.canPay)await svc.turns.choose(actor,{...b,kind:'payBail'});else{const r=await svc.plans.reserveJailRoll(actor,b);await svc.turns.commitJailRoll(actor,{...b,requestId:requestId(),planId:r.planId});rolls++}}
  else if(v.stage==='auction'){if(!Number.isInteger(d.seat))await svc.turns.choose(actor,{...b,kind:'startAuction'});else await svc.turns.auctionBid(actor,{...b,amount:0})}
  else if(v.stage==='debt')await svc.turns.debtAction(actor,{...b,kind:v.game.players[v.seat].cash>=d.amount?'pay':'bankrupt'});
  else throw Error('Unsupported natural stage '+v.stage);
 }
 assert.equal(v.status,'over','Natural match did not finish');assert(v.game.round>=5);const r=await svc.competition.ingest('host',{code:room.code,revision:v.revision});assert.equal(r.duplicate,false);assert.equal((await svc.competition.ingest('guest',{code:room.code,revision:v.revision})).duplicate,true);
 const rank=await svc.competition.rankings('host',{category:'worth',city:null}),community=await svc.competition.community('host',{});assert(rank.verified&&rank.rows.length>0);assert.equal(community.total,2);assert.equal(Object.values(root.competition.profiles).reduce((n,p)=>n+p.seasons[1001].games,0),2);
 report.matches.push({city,round:v.game.round,operations,rolls,rankingRows:rank.rows.length,communityTotal:community.total});console.log('PASS natural verified-service match',city,v.game.round,'rounds',rolls,'rolls',operations,'operations');
}})().catch(e=>{report.failure=String(e.stack||e);console.error(e);process.exitCode=1}).finally(()=>{const out=process.env.RUNNER_TEMP||path.resolve(__dirname,'../test-results');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'skyline-competition-matches.json'),JSON.stringify(report,null,2));console.log('COMPETITION MATCHES',report.matches.length,'isolated service matches')});
