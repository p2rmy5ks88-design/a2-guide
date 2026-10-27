// Internal end-turn adapter: execute the audited online driver without UI/network effects.
const vm=require('node:vm');
const {section,line,sourceHash,validIdentities}=require('./audited-rules.cjs');
class EndError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
let events=section('const FEST_GROUP={};','function evBanner(e){');
for(const [before,after]of [["Math.random()<.25","draw(4)===0"],["Math.floor(Math.random()*pool.length)","draw(pool.length)"],["Math.floor(Math.random()*a.length)","draw(a.length)"]]){if(events.split(before).length!==2)throw Error('Audit city-event random expression');events=events.replace(before,after)}
const driver=section('async function onlineTick(){','let awayT=').replace('async function onlineTick(){','function onlineTick(){').replaceAll('await ','');
const rules=[section('const W=1100','/* ================= SOUND ================= */'),section('function validateSave(g){','function decodeRemoteGame(code,d){'),section('const COUNTRIES=','/* ---- city looks ---- */'),line('function log(t)'),line('function advanceTurn(){'),line('function endCheck(){'),line('function standings(){'),line('{const _sd=standings;'),events].join('\n');
const script=new vm.Script(rules+`
G=JSON.parse(input);FAST=true;applyCity(G.set.city||'lagos');Math.random=()=>{throw Error('Unaudited end-turn randomness')};
function valid(){return validateSave({...G,online:false,over:false})&&validIdentities(G.players)&&G.players.every(p=>Number.isSafeInteger(p.cash))&&Number.isSafeInteger(G.logN||0)&&Number.isSafeInteger(G.round)}
if(!G.online||G.sim||G.over!==false||!valid())throw Error('Invalid game state');
if(G.players[G.turn].uid!==actor)throw Error('Wrong actor');
if(G.forceWin!=null&&(!Number.isInteger(G.forceWin)||G.forceWin<0||G.forceWin>=G.players.length))throw Error('Invalid forced winner');
const bankruptPost=G.phase==='busy'&&P(G.turn).bankrupt;const alreadyEnded=endCheck();if(!alreadyEnded&&G.phase!=='post'&&!bankruptPost)throw Error('Not post-roll');
if(G.set.maxRounds!=null)throw Error('Simulation-only round cap');
if(G.phase==='post'||bankruptPost)G.phase='busy';
const NET={on:true,host:false,driving:false,applying:false,applyRun:false};
const console={error:e=>{throw e}};
let ready=false;
function shouldDrive(){return true}function spectatorPrompt(){}function playTurn(){}function pushNow(){}function finish(){G.over=true}function renderRoster(){}function pushState(){}function float(){}function toast(){}function trackable(){return false}
function setTimeout(){ready=true;G.phase=P(G.turn).inJail?'jail':'pre'}
${driver}
onlineTick();
if(!valid()||G.players.some(p=>!Number.isSafeInteger(p.cash))||!Number.isSafeInteger(G.round))throw Error('Invalid end-turn result');
let result=null,boundary=null,context=null;
if(G.over){const ranking=standings().map((p,i)=>({rank:i+1,id:p.id,cash:p.cash,netWorth:netWorth(p),bankrupt:p.bankrupt}));if(ranking.some(p=>!Number.isSafeInteger(p.netWorth)))throw Error('Unsafe net worth');result={reason:alive().length<=1?'last-player':G.set.mode==='timed'&&G.round>G.set.rounds?'timed':'quick',winnerId:ranking[0].id,standings:ranking}}
else{if(!ready)throw Error('Missing next-turn boundary');const p=P(G.turn);if(p.ai)boundary={kind:'ai-turn',seat:p.id};else if(p.inJail)boundary={kind:'jail',seat:p.id};if(boundary)context={version:1,kind:'turn-entry',seat:p.id}}
JSON.stringify({game:G,result,boundary,context});`,{filename:'audited-skyline-end-turn'});
function endTurn(game,actor,{draw=()=>{throw new EndError('entropy-required',503)}}={}){
 if(typeof actor!=='string'||!actor||!game||!Array.isArray(game.players)||game.players[game.turn]?.uid!==actor)throw new EndError('not-your-turn');
 let input;try{input=JSON.stringify(game)}catch{throw new EndError('invalid-game-state')}if(Buffer.byteLength(input)>262144)throw new EndError('game-state-too-large');const draws=[];
 const checked=max=>{const value=draw(max);if(!Number.isInteger(value)||value<0||value>=max)throw new EndError('invalid-random-result',503);draws.push({max,value});return value};
 try{const result=JSON.parse(script.runInContext(vm.createContext({input,actor,draw:checked,validIdentities},{codeGeneration:{strings:false,wasm:false}}),{timeout:100}));return{...result,draws}}
 catch(e){if(e instanceof EndError)throw e;if(e?.status===503)throw new EndError(e.code,503);const error=new EndError('invalid-end-turn');error.cause=e;throw error}
}
module.exports={endTurn,EndError,sourceHash};
