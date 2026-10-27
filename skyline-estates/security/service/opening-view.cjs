const crypto=require('node:crypto');
const {ServiceError}=require('./admission.cjs'),{sourceHash}=require('./audited-rules.cjs');
function openingView(root,room,game){
 const record=root?.service?.starts?.[room.meta.code];if(!record)return null;
 let o;try{o=JSON.parse(record.openingJson)}catch{throw new ServiceError(409,'invalid-opening')}
 const n=game.players.length;
 if(record.version!==1||record.code!==room.meta.code||record.sourceHash!==sourceHash||!Number.isSafeInteger(record.toRevision)||record.toRevision>room.state.revision||!Array.isArray(o.keys)||o.keys.length!==n||new Set(o.keys).size!==n||o.keys.some(k=>!Number.isInteger(k)||k<2||k>99)||o.first!==o.keys.indexOf(Math.max(...o.keys))||o.lateBonus!==(o.first-1+n)%n||!Number.isSafeInteger(o.bonus)||o.bonus<0||JSON.stringify(game.keys)!==JSON.stringify(o.keys)||game.first!==o.first||game.lateBonus!==o.lateBonus)throw new ServiceError(409,'invalid-opening');
 if(record.toRevision===room.state.revision&&crypto.createHash('sha256').update(room.state.gameJson).digest('hex')!==record.gameHash)throw new ServiceError(409,'invalid-opening');
 return{keys:o.keys.slice(),first:o.first,lateBonus:o.lateBonus,bonus:o.bonus};
}
module.exports={openingView};
