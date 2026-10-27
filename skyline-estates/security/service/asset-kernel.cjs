// Isolated property-action prototype. Only checked-in, hash-pinned source is evaluated.
// Node vm is used for rule reuse, not as a security boundary for untrusted code.
const vm=require('node:vm');
const {sourceHash,section,line,cityRaw,validIdentities}=require('./audited-rules.cjs');
const rules=section('const W=1100','/* ================= SOUND ================= */')+'\n'+section('function validateSave(g){','function decodeRemoteGame(code,d){')+'\n'+line('const st=p=>')+'\n'+line('const evNow=()=>')+'\n'+line('const _build=build;build=function')+'\n';
class AssetError extends Error{constructor(code,status=409){super(code);this.code=code;this.status=status}}
const script=new vm.Script(rules+`
function updateCell(){} function float(){} function sfx(){} function fireworks(){}
const mine=()=>false; // Local profile rewards await their own trusted service; game counters still update.
G=JSON.parse(input);
if(!G.online||G.sim||!validateSave({...G,online:false})||G.players.some(p=>!Number.isSafeInteger(p.cash))||!validIdentities(G.players))result={error:'invalid-game-state'};
else if(!['pre','post'].includes(G.phase))result={error:'unsupported-game-phase'};
else {
 const pid=G.players.findIndex(p=>p.uid===actor);
 if(pid<0||pid!==G.turn||P(pid).bankrupt)result={error:'not-your-turn'};
 else {
  const pairs={build:[canBuild,build],sell:[canSell,sell],mortgage:[canMortgage,mortgage],redeem:[canUnmort,unmortgage]},pair=pairs[command.kind],i=command.square;
  if(!buyable(i)||!pair[0](pid,i))result={error:'illegal-property-action'};
  else {
   pair[1](pid,i);
   if(!validateSave({...G,online:false})||G.players.some(p=>!Number.isSafeInteger(p.cash))||G.players.some(p=>p.st&&Object.values(p.st).some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)))result={error:'invalid-result'};
   else result={game:G};
  }
 }
}
JSON.stringify(result);`,{filename:'audited-skyline-asset-rules'});
function validateCommand(command){
 if(!command||typeof command!=='object'||Array.isArray(command)||Object.keys(command).sort().join(',')!=='kind,square'||!['build','sell','mortgage','redeem'].includes(command.kind)||!Number.isInteger(command.square)||command.square<0||command.square>=40)throw new AssetError('invalid-property-command',400);
 return{kind:command.kind,square:command.square};
}
function applyAssetAction(game,actor,command){
 command=validateCommand(command);let input;try{input=JSON.stringify(game)}catch{throw new AssetError('invalid-game-state')}
 if(typeof input!=='string'||Buffer.byteLength(input)>262144||typeof actor!=='string')throw new AssetError('invalid-game-state');
 const context=vm.createContext({input,actor,command,CITY_DATA:cityRaw,validIdentities},{codeGeneration:{strings:false,wasm:false}});
 const result=JSON.parse(script.runInContext(context,{timeout:100}));
 if(result.error)throw new AssetError(result.error,result.error==='invalid-result'?500:409);
 return result.game;
}
module.exports={applyAssetAction,validateCommand,AssetError,sourceHash};
