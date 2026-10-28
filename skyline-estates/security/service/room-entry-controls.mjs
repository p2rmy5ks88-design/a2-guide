import {makeRoomInvitation,parseRoomInvitation} from './room-invitation.mjs';
// Explicit room-entry preview. Public title routing and native links are not activated.
export function mountRoomEntryControls({client,uid,container,document=globalThis.document,gameUrl,allowedOrigins,settings,name='',onRoom,onError=()=>{}}){
 if(!container?.isConnected||container.ownerDocument!==document||typeof onRoom!=='function'||typeof onError!=='function'||typeof name!=='string'||typeof uid!=='string')throw Error('Invalid room entry');
 // Validate the configured destination without generating a real capability.
 makeRoomInvitation({gameUrl,allowedOrigins,code:'ABCDE',invite:'0'.repeat(64)});
 const selected=JSON.parse(JSON.stringify(settings));let closed=false,busy=false,ready=null,message='';
 const root=document.createElement('section');root.className='card trusted-room-entry';root.setAttribute('aria-label','Multiplayer room entry');container.append(root);
 const text=(tag,value)=>{const e=document.createElement(tag);e.textContent=value;return e};
 function button(label,fn){const b=text('button',label);b.type='button';b.className='btn';b.onclick=()=>{if(!busy&&!closed)void perform(fn)};root.append(b);return b}
 async function accepted(action,receipt,requestId){
  if(action==='leave'){await client.complete(requestId);ready=null;message='You left the room.';return}
  const room=await client.room(receipt.code);if(closed)throw Error('session-closed');
  const invitationUrl=receipt.invite&&room.status==='lobby'&&room.hostUid===uid?makeRoomInvitation({gameUrl,allowedOrigins,code:receipt.code,invite:receipt.invite}):null;
  await client.complete(requestId);ready={room,invitationUrl};message='';
 }
 async function act(action,body){const sent=await client.mutate(action,body,{track:true});if(closed)return;await accepted(action,sent.receipt,sent.requestId)}
 async function recover(){const p=client.pending();if(!p)return;const r=await client.reconcile(p.requestId);if(closed)return;if(r.resolution==='committed')await accepted(r.action,r.receipt,r.requestId);else{await client.complete(r.requestId);ready=null;message='That action was not applied. Try again; paste the invitation again if needed.'}}
 async function perform(fn){if(closed)return;if(!root.isConnected){close();return}busy=true;render();try{await fn()}catch(e){if(!closed){message='The action could not finish. Recover a saved action or try again.';onError(e)}}finally{busy=false;if(!closed)render()}}
 function render(){if(closed)return;root.replaceChildren();root.append(text('h2','Play with friends'));const status=text('p',busy?'Updating your room…':message);status.setAttribute('role','status');root.append(status);if(busy)return;
  if(client.pending()){status.textContent='Recover your saved room action before continuing.';button('Recover room action',recover);return}
  if(ready){root.append(text('p','Room '+ready.room.code));if(ready.invitationUrl){const share=document.createElement('input');share.readOnly=true;share.setAttribute('aria-label','Private invitation link');share.value=ready.invitationUrl;root.append(share,text('p','Share this private link only with the people you want to invite.'))}
   button('Enter waiting room',async()=>{await onRoom(ready.room,{invitationUrl:ready.invitationUrl});if(!closed)close()});
   if(ready.room.status==='lobby'&&ready.room.hostUid===uid){root.append(text('p','Replacing the invitation stops previous links from working.'));button('Replace invitation',()=>act('invite',{code:ready.room.code}))}
   if(ready.room.status==='lobby')button('Leave room',()=>act('leave',{code:ready.room.code}));return;
  }
  const who=document.createElement('input');who.setAttribute('aria-label','Player name');who.maxLength=12;who.value=name;who.oninput=()=>name=who.value;root.append(who);
  button('Create room',()=>act('create',{name,settings:selected}));
  const link=document.createElement('input');link.setAttribute('aria-label','Invitation to join');link.autocomplete='off';root.append(link);
  button('Join room',()=>{const invite=parseRoomInvitation(link.value,{gameUrl,allowedOrigins});return act('join',{name,code:invite.code,invite:invite.invite})});
 }
 function close(){if(closed)return;closed=true;client.close();root.remove()}
 render();return{recover:()=>perform(recover),close};
}
