const fail=()=>{throw Object.assign(Error('invalid-invitation'),{code:'invalid-invitation'})};
function baseUrl(gameUrl,allowedOrigins){let u;try{u=new URL(gameUrl)}catch{fail()}if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||!Array.isArray(allowedOrigins)||!allowedOrigins.includes(u.origin))fail();return u}
export function makeRoomInvitation({gameUrl,allowedOrigins,code,invite}){const u=baseUrl(gameUrl,allowedOrigins);if(typeof code!=='string'||!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}$/.test(code)||typeof invite!=='string'||!/^[a-f0-9]{64}$/.test(invite))fail();u.hash='skyline-room='+code+'&invite='+invite;return u.href}
export function parseRoomInvitation(value,{gameUrl,allowedOrigins}){const base=baseUrl(gameUrl,allowedOrigins);let u;try{u=new URL(value)}catch{fail()}if(u.origin!==base.origin||u.pathname!==base.pathname||u.search||u.username||u.password)fail();const match=/^#skyline-room=([ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5})&invite=([a-f0-9]{64})$/.exec(u.hash);if(!match)fail();return{code:match[1],invite:match[2],cleanUrl:base.href}}

export async function replaceRoomInvitation({client,uid,code,gameUrl,allowedOrigins}){
 makeRoomInvitation({gameUrl,allowedOrigins,code,invite:'0'.repeat(64)});
 const pending=client.pending();let result,requestId;
 if(pending){if(pending.action!=='invite'||pending.code!==code)throw Object.assign(Error('another-admission-operation-pending'),{code:'another-admission-operation-pending'});const r=await client.reconcile(pending.requestId);requestId=r.requestId;if(r.resolution!=='committed'){await client.complete(requestId);throw Object.assign(Error('invitation-not-replaced'),{code:'invitation-not-replaced'})}result=r.receipt}
 else{const sent=await client.mutate('invite',{code},{track:true});requestId=sent.requestId;result=sent.receipt}
 let view;try{view=await client.room(code)}catch(e){if(e.status===403&&e.code==='not-authorized')await client.complete(requestId);throw e}await client.complete(requestId);
 if(view.status!=='lobby'||view.hostUid!==uid||!result.invite)throw Object.assign(Error('invitation-no-longer-active'),{code:'invitation-no-longer-active'});
 return makeRoomInvitation({gameUrl,allowedOrigins,code,invite:result.invite});
}
