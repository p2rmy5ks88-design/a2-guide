// First trusted AI slice: original AI auction decision, without game mutation.
const vm=require('node:vm'),{section,sourceHash,validIdentities}=require('./audited-rules.cjs'),{aiAuctionView}=require('./turn-kernel.cjs');
class AiError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
let bidSource=section('function aiBid(q,i,bid){','function aiRaise(p,amt){');
if(bidSource.split('Math.floor(Math.random()*5)').length!==2)throw Error('Audit AI auction randomness');
bidSource=bidSource.replace('Math.floor(Math.random()*5)','draw(5)');
const rules=[section('const W=1100','/* ================= SOUND ================= */'),section('function validateSave(g){','function decodeRemoteGame(code,d){'),section('const COUNTRIES=','/* ---- city looks ---- */'),section('function aiReserve(p){','function aiWantsBuy(p,i){'),bidSource].join('\n');
const script=new vm.Script(rules+`
G=JSON.parse(input);FAST=true;applyCity(G.set.city||'lagos');Math.random=()=>{throw Error('Unaudited AI randomness')};
if(!G.online||G.over||!validateSave({...G,online:false})||!validIdentities(G.players)||G.players.some(p=>!Number.isSafeInteger(p.cash)))throw Error('Invalid AI game');
const q=P(seat);if(!q?.ai||q.uid!==null||q.bankrupt||!buyable(square)||G.own[square].o!==-1)throw Error('Invalid AI participant');
const amount=aiBid(q,square,bid);
if(!Number.isSafeInteger(amount)||amount<0||amount!==0&&(amount<=bid||amount>q.cash)||JSON.stringify(G)!==input)throw Error('Invalid AI result');
JSON.stringify({kind:'auction-bid',seat,square,amount});`,{filename:'audited-skyline-ai-auction'});
function decideAiAuction(game,pending,{draw=()=>{throw new AiError('entropy-required',503)}}={}){let view;try{view=aiAuctionView(game,pending)}catch(e){throw new AiError(e.code||'invalid-ai-checkpoint',e.status||409)}const input=JSON.stringify(game),draws=[];const checked=max=>{const value=draw(max);if(max!==5||!Number.isInteger(value)||value<0||value>=max)throw new AiError('invalid-ai-entropy',503);draws.push({max,value});return value};try{const decision=JSON.parse(script.runInContext(vm.createContext({input,seat:view.seat,square:view.square,bid:view.bid,draw:checked,validIdentities},{codeGeneration:{strings:false,wasm:false}}),{timeout:100}));return{decision,draws}}catch(e){if(e instanceof AiError)throw e;if(e?.status===503)throw new AiError(e.code,503);const error=new AiError('invalid-ai-decision');error.cause=e;throw error}}
module.exports={decideAiAuction,AiError,sourceHash};
