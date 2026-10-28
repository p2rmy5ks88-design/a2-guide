import {createLobbyController} from './lobby-controller.mjs';
// Explicit preview using existing game classes. Public routing stays unchanged.
export function mountLobbyControls({client,code,uid,container,document=globalThis.document,tokens=[],onStarted,onError=()=>{},pollMs=2500}){
 if(!container||!container.isConnected||container.ownerDocument!==document||typeof onStarted!=='function'||typeof onError!=='function'||pollMs!==0&&(!Number.isInteger(pollMs)||pollMs<1000||pollMs>30000)||!Array.isArray(tokens)||tokens.length>96)throw Error('Invalid lobby controls');
 const choices=tokens.map(t=>{if(typeof t?.tok!=='string'||t.tok.length>16||typeof t.label!=='string'||t.label.length>80)throw Error('Invalid token choice');return{tok:t.tok,label:t.label}});
 if(new Set(choices.map(t=>t.tok)).size!==choices.length)throw Error('Duplicate token choice');
 let closed=false,timer=null,interrupted=false,entering=false,key=null,controller;
 const root=document.createElement('section');root.className='card trusted-lobby';root.setAttribute('aria-label','Trusted waiting room');container.append(root);
 const text=(tag,value,cls='')=>{const e=document.createElement(tag);e.textContent=value;e.className=cls;return e};
 async function enter(){if(closed||entering)return;if(!root.isConnected){close();return}const s=controller.status();if(!s.fresh||s.busy||s.needsRecovery||s.otherRoomOperation||!s.view||s.view.status==='lobby')return;entering=true;render(s);try{await onStarted(s.view,{client,code,uid});if(!closed)close({closeClient:false})}catch(e){if(!closed){interrupted=true;onError(e)}}finally{entering=false;if(!closed)render(controller.status())}}
 async function perform(fn){if(closed)return null;if(!root.isConnected){close();return null}try{const r=await fn();if(!closed){interrupted=false;render(controller.status());await enter()}return r}catch(e){if(!closed){interrupted=true;onError(e);render(controller.status())}return null}}
 function button(label,fn,disabled=false){const b=text('button',label,'btn');b.type='button';b.disabled=disabled;b.onclick=()=>{if(!b.disabled)void perform(fn)};root.append(b);return b}
 function render(s){if(closed)return;const next=JSON.stringify([s.view,s.busy,s.fresh,s.needsRecovery,s.otherRoomOperation,interrupted,entering]);if(key===next)return;key=next;root.replaceChildren();root.append(text('h2','Waiting room'),text('p','Room '+code));const status=text('p','','small');status.setAttribute('role','status');root.append(status);
  if(s.view){const list=document.createElement('ul');list.className='slots';for(const seat of s.view.seats)list.append(text('li',seat.name+(seat.uid===s.view.hostUid?' · Host':'')+(seat.uid===uid?' · You':'')));root.append(list)}
  if(s.busy||entering){status.textContent='Updating your game…';return}
  if(s.otherRoomOperation){status.textContent='An action in another room needs recovery before continuing.';return}
  if(s.needsRecovery){status.textContent='Recover your saved action to continue.';button('Recover action',()=>controller.recover());return}
  if(interrupted||!s.fresh||!s.view){status.textContent='Reconnect to load your waiting room.';button('Reconnect',()=>controller.refresh());return}
  const v=s.view;if(v.status!=='lobby'){status.textContent='Your game is ready.';button('Enter game',enter);return}
  const me=v.seats.find(s=>s.uid===uid),select=document.createElement('select');select.setAttribute('aria-label','Your token');let rows=choices;if(!rows.some(t=>t.tok===me.tok))rows=[{tok:me.tok,label:me.tok},...rows];for(const t of rows){const option=text('option',t.label);option.value=t.tok;select.append(option)}select.value=me.tok;root.append(select);select.onchange=()=>{const token=select.value;void perform(()=>controller.select({tok:token,fin:me.fin??null,ch:me.ch??null},v.revision))};
  if(!v.startSupported)status.textContent='This online preview requires human players, minigames off and the turn timer off.';
  else status.textContent=v.hostUid===uid?(v.seats.length<2?'Invite another player before starting.':'Start when everyone has joined.'):'Waiting for the host to start.';
  if(v.hostUid===uid)button('Start game',()=>controller.start(v.revision),!v.startSupported||v.seats.length<2);
 }
 function schedule(){if(closed||timer||!pollMs)return;timer=setTimeout(async()=>{timer=null;if(closed)return;if(!root.isConnected){close();return}try{if(!controller.status().busy&&!entering)await perform(()=>controller.refresh())}finally{schedule()}},pollMs)}
 function close({closeClient=true}={}){if(closed)return;closed=true;if(timer)clearTimeout(timer);controller.close({closeClient});root.remove()}
 controller=createLobbyController({client,code,uid,onState:render});render(controller.status());schedule();
 return{controller,refresh:()=>perform(()=>controller.refresh()),recover:()=>perform(()=>controller.recover()),close};
}
