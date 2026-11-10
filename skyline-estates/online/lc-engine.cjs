// Authoritative Living City match engine (rule version 2).
// The server owns the match: it runs the SAME shared rules core as the app (headless-runtime.cjs; parity-tested) and
// advances the game until a human decision is needed ("boundary"). A player answers only their own boundary; the server
// replays the current turn from its start snapshot with the recorded answers (deterministic, seeded per turn), so a
// client can never submit outcomes, dice, cash or state. Invalid, out-of-turn, stale or duplicate answers are rejected.
'use strict';
const crypto=require('node:crypto');
const {readSources,sourceHash,createRuntime}=require('./headless-runtime.cjs');
class EngineError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
const ADAPTER=String.raw`
var __E={tape:[],cursor:0,seed:'',turnNo:0};
function __seed(){let h=2166136261;for(const c of __E.seed+':'+__E.turnNo)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;let s=h||1;Math.random=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296}}
class __Stop{constructor(b){this.boundary=b}}
function __decide(type,pid,options,valid){
  if(__E.cursor<__E.tape.length){const e=__E.tape[__E.cursor];if(e.type!==type||e.pid!==pid)throw Error('out-of-order-answer');if(!valid(e.value))throw Error('invalid-answer');__E.cursor++;return e.value}
  throw new __Stop({type,pid,options})}
function __assetOps(pid){while(__E.cursor<__E.tape.length&&__E.tape[__E.cursor].type==='asset'&&__E.tape[__E.cursor].pid===pid){const {kind,square:i}=__E.tape[__E.cursor].value;
    const ok={build:canBuild,sell:canSell,mortgage:canMortgage,redeem:canUnmort}[kind];if(!ok||!Number.isInteger(i)||!ok(pid,i))throw Error('illegal-asset-action');
    ({build,sell,mortgage,redeem:unmortgage})[kind](pid,i);__E.cursor++}}
sleep=()=>Promise.resolve();ttStart=()=>{};ttStop=()=>{};
function __btns(b){return b.map(x=>({k:x.k,label:String(x.label||''),primary:!!x.primary,danger:!!x.danger,disabled:!!x.disabled}))}
function __cut(h){h=String(h||'');return h.length>12000?h.slice(0,12000):h}
actions=async function(text,btns){const pid=G.turn;__assetOps(pid);const keys=btns.filter(b=>!b.disabled).map(b=>b.k);return __decide('actions',pid,{keys,ui:{text:__cut(text),btns:__btns(btns)}},v=>keys.includes(v))};
modal=async function(o){const btns=(o&&o.btns)||[];const keys=btns.filter(b=>!b.disabled).map(b=>b.k);if(!keys.length||o.auto)return btns[0]&&btns[0].k;const pid=G.turn;__assetOps(pid);return __decide('modal',pid,{keys,cls:o.cls||'',ui:{html:__cut(o.html),btns:__btns(btns),cls:String(o.cls||'')}},v=>keys.includes(v))};
openAssets=async function(p){__assetOps(p.id)};
isRemote=q=>!!(q&&!q.ai);
askRemote=async function(q,kind,payload){
  if(kind==='bid'){const v=__decide('bid',q.id,{square:payload.i,bid:payload.bid,max:q.cash},x=>Number.isInteger(x)&&(x===0||x>=payload.bid+10&&x<=q.cash));return{v}}
  if(kind==='trade'){const v=__decide('trade',q.id,{trade:payload},x=>typeof x==='boolean');return{v}}
  return null};
`;
const ADAPTER_RULES=String.raw`
LCUI.humanInFast=true;
LCUI.decide=async function(kind,p,s){
  const opt=kind==='card'?{deck:s.deck,id:s.c&&s.c.id,choices:(s.ch||[]).map(x=>({k:x.k,ok:x.ok!==false,label:String(x.label||''),info:String(x.info||'')}))}:kind==='review'?{can:s.can,passes:p.goojf.length}:kind==='landmark'?{group:s.g,opts:s.opts}:kind==='corner'?{square:p.pos,icon:s.icon,title:s.title,text:s.text,choices:s.choices.map(x=>({k:x.k,ok:x.ok!==false,label:String(x.label||''),info:String(x.info||'')}))}:{};
  if(kind==='info'||kind==='card'&&!s.ch)return 'ok';
  let spec=null;try{spec=JSON.parse(JSON.stringify({...s,aiPick:undefined}))}catch(e){}opt.spec=spec;
  return __decide('lc:'+kind,p.id,opt,v=>typeof v==='string'&&v.length<=16)};
async function __step(){
  for(let guard=0;guard<400;guard++){
    if(G.over||endCheck()||G.set.maxRounds&&G.round>G.set.maxRounds){G.over=true;return{over:true}}
    const p=P(G.turn);if(p.bankrupt){advanceTurn();__E.turnNo++;__E.turnStart=JSON.stringify(G);__E.tape=[];continue}
    __seed();__E.cursor=0;
    try{await playTurn(p)}catch(e){if(e instanceof __Stop)return{boundary:e.boundary};throw e}
    if(p.tmo){p.ai=false;delete p.tmo}   // Duel timeout: the AI played this one turn for an idle player
    if(__E.cursor<__E.tape.length)throw Error('unused-answer');
    if(endCheck()){G.over=true;return{over:true}}
    advanceTurn();__E.turnNo++;__E.turnStart=JSON.stringify(G);__E.tape=[];__E.cursor=0}
  throw Error('step-limit')}
`;
function createEngine(root){
  const src=readSources(root),hash=sourceHash(src),rt=createRuntime(src,{beforeLibs:ADAPTER,afterLibs:ADAPTER_RULES});
  const E=rt.ctx.__E;
  async function load(state){E.seed=state.seed;E.turnNo=state.turnNo;E.turnStart=state.turnStart;E.tape=state.tape.map(x=>({...x}));E.cursor=0;
    rt.ctx.__in=state.turnStart;rt.run(`G=JSON.parse(__in);FAST=true;GEN++;applyCity(G.set.city||'lagos')`)}
  async function settle(state){let r;try{r=await rt.run('__step()')}catch(e){throw new EngineError(e&&e.message||'invalid',400)}
    return{...state,v:1,rules:'living-city-2',source:hash,turnNo:E.turnNo,turnStart:E.turnStart,tape:E.tape.map(x=>({...x})),G:JSON.parse(rt.run('JSON.stringify(G)')),boundary:r.boundary||null,over:!!r.over,revision:(state.revision||0)+1}}
  return{
    sourceHash:hash,
    async create({seats,set,seed,scenario}){
      if(!Array.isArray(seats)||seats.length<2||seats.length>6)throw new EngineError('invalid-seats',400);
      const ids=seats.filter(s=>!s.ai).map(s=>s.uid);if(!ids.length||ids.some(u=>typeof u!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(u))||new Set(ids).size!==ids.length)throw new EngineError('invalid-seats',400);
      rt.run('FAST=true;GEN++');rt.ctx.__cfg={seats,set:{ai:'normal',speed:'fast',pot:false,maxRounds:300,city:'lagos',perks:false,...set,online:false},seed};
      rt.run(`applyCity(__cfg.set.city);newGame({lc:true,cash:1600,set:__cfg.set,players:__cfg.seats.map((s,i)=>({name:s.name,tok:s.tok||TOKENS[i],col:PCOL[i],ai:!!s.ai,tl:1,uid:s.ai?null:s.uid}))});G.first=0;G.turn=0;G.players.forEach((p,i)=>{p.uid=__cfg.seats[i].ai?null:__cfg.seats[i].uid});if(G.set.duel===1)lcDuelSetup()`);
      if(rt.run('G.rv')!==2)throw new EngineError('living-city-unavailable',500);
      // Test rooms only: the first human holds one whole district (Landmark + development) and the second human opens
      // the match under Civic Review. Everything after this is ordinary server play.
      if(scenario==='lc-test')rt.run(`(()=>{const hs=G.players.filter(p=>!p.ai);const g=Object.keys(GROUPS).find(k=>GROUPS[k].every(i=>SQ[i].t==='prop'));GROUPS[g].forEach(i=>{G.own[i].o=hs[0].id;G.own[i].h=0;G.own[i].m=false});if(hs[1])hs[1].cr={from:1,why:'card'};log('Test room: '+hs[0].name+' starts with a district; '+(hs[1]?hs[1].name+' starts under Civic Review.':''))})()`);
      const s0={seed:String(seed||crypto.randomBytes(12).toString('hex')),turnNo:0,turnStart:rt.run('JSON.stringify(G)'),tape:[],revision:0};
      await load(s0);return settle(s0)},
    async act(state,uid,{revision,answer}){
      if(state.over)throw new EngineError('match-over');if(revision!==state.revision)throw new EngineError('stale-revision');
      const b=state.boundary;if(!b)throw new EngineError('no-decision-pending');const seat=state.G.players[b.pid];if(!seat||seat.uid!==uid)throw new EngineError('not-your-decision',403);
      const ops=Array.isArray(answer&&answer.assets)?answer.assets:[];if(ops.length>20)throw new EngineError('too-many-assets',400);
      const entries=ops.map(o=>({type:'asset',pid:b.pid,value:{kind:o.kind,square:o.square}}));if('value' in (answer||{}))entries.push({type:b.type,pid:b.pid,value:answer.value});else if(!entries.length||b.type!=='actions')throw new EngineError('missing-answer',400);
      const strikes=state.strikes&&state.strikes[b.pid]?{...state.strikes,[b.pid]:0}:state.strikes;
      await load({...state,tape:state.tape.concat(entries)});return settle({...state,...(strikes?{strikes}:{})})},
    // Skyline Duel turn timer: an idle player's whole current turn is played by the AI. Three timeouts in a row forfeit
    // the match (the idle player goes bankrupt to the bank). The service decides when the deadline has passed.
    async timeout(state){
      if(state.over)throw new EngineError('match-over');const b=state.boundary;if(!b)throw new EngineError('no-decision-pending');
      const strikes={...(state.strikes||{})};strikes[b.pid]=(strikes[b.pid]||0)+1;
      if(strikes[b.pid]>=3){await load({...state,tape:[]});rt.ctx.__pid=b.pid;rt.run('bankrupt(P(__pid),null);G.over=true');
        return{...state,strikes,turnStart:rt.run('JSON.stringify(G)'),tape:[],G:JSON.parse(rt.run('JSON.stringify(G)')),boundary:null,over:true,forfeit:b.pid,revision:state.revision+1}}
      const g0=JSON.parse(state.turnStart);g0.players[b.pid].ai=true;g0.players[b.pid].tmo=1;
      const next={...state,strikes,turnStart:JSON.stringify(g0),tape:[]};await load(next);return settle(next)},
    view(state,uid){const me=state.G.players.findIndex(p=>p.uid===uid);return{revision:state.revision,rules:state.rules,over:state.over,G:state.G,me,decision:state.boundary&&state.boundary.pid===me?state.boundary:null,waitingFor:state.boundary?state.boundary.pid:null}}}}
module.exports={createEngine,EngineError};
