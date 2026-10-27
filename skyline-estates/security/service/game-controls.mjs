import {createGameController} from './game-controller.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
export function mountGameControls({client,code,document=globalThis.document,onView=()=>{},formatMoney=n=>String(n),setPromptText,rollIcon='',openPurchase,openTradeReview,isManaging=()=>false,onState=()=>{},onError=()=>{}}){
 const acts=document.querySelector('#acts'),prompt=document.querySelector('#prompt');if(!acts||!prompt)throw Error('Game controls are missing');
 let closed=false,interrupted=false,purchaseRevision=null,tradeRevision=null,renderKey=null,controller;
 const say=text=>setPromptText?setPromptText(text):prompt.textContent=text;
 const perform=async fn=>{try{const result=await fn();if(!closed){interrupted=false;render(controller.status())}return result}catch(e){if(!closed){interrupted=true;purchaseRevision=null;tradeRevision=null;onError(e);render(controller.status())}return null}};
 function button(label,fn,{primary=false,disabled=false,kind='pill'}={}){
  const b=document.createElement('button');b.type='button';b.className=kind==='roll'?'bigb':kind==='end'?'bigb end':'pill'+(primary?' pri':'');b.textContent=label;b.setAttribute('aria-label',label);b.disabled=disabled;
  if(kind==='roll'&&rollIcon){const icon=document.createElement('span');icon.innerHTML=rollIcon;b.prepend(icon)}
  b.onclick=()=>{if(!b.disabled)void perform(fn)};acts.append(b);return b;
 }
 function render(state){
  if(closed)return;const v=state.view;const key=JSON.stringify([v?.revision,v?.stage,state.busy,state.needsRecovery,interrupted,isManaging()]);if(renderKey===key)return;renderKey=key;acts.replaceChildren();if(!v){say('Connecting to your game…');return}
  if(state.busy){say('Updating your game…');return}
  if(state.needsRecovery){say('Recover your saved action to continue.');button('Recover action',()=>controller.recover(),{primary:true});return}
  if(interrupted){say('Connection interrupted. Reconnect to continue.');button('Reconnect',()=>controller.refresh(),{primary:true});return}
  if(v.status==='over'||v.game.over){say('Game over.');return}
  if(v.actorSeat!==v.seat||v.game.players[v.seat].bankrupt||v.game.players[v.seat].ai){say('Waiting for '+v.game.players[v.actorSeat].name+'…');return}
  const r=v.revision,d=v.decision,p=v.game.players[v.seat],choose=kind=>controller.act('choose',{kind},r);
  say(p.name+', your turn.');
  if(isManaging())return;
  if(v.stage==='pre')button('Roll dice',()=>controller.roll('roll',r),{primary:true,kind:'roll'});
  else if(v.stage==='post')button('End turn',()=>controller.act('endTurn',{},r),{primary:true,kind:'end'});
  else if(v.stage==='purchase'&&d?.kind==='purchase'){
   if(openPurchase){if(purchaseRevision!==r){purchaseRevision=r;void perform(async()=>{const kind=await openPurchase(v);if(closed||controller.snapshot()?.revision!==r||kind==null)return;return choose(kind==='buy'?'buy':'decline')})}}
   else{button(v.game.set.auction===false?'Don’t buy':'Auction',()=>choose('decline'));button('Buy for '+formatMoney(d.price),()=>choose('buy'),{primary:true,disabled:!d.canBuy})}
  }else if(v.stage==='card'&&d?.kind==='card')button('Draw card',()=>choose('drawCard'),{primary:true});
  else if(v.stage==='reroll'&&d?.kind==='reroll'){button('Keep dice',()=>choose('keep'));button('Re-roll',()=>controller.roll('reroll',r),{primary:true,disabled:d.remaining<=0})}
  else if(v.stage==='jail'&&d?.kind==='jail'){button('Pay '+formatMoney(d.bail),()=>choose('payBail'),{disabled:!d.canPay});button('Use Bail Pass',()=>choose('useBailPass'),{disabled:d.passes<1});button('Roll dice',()=>controller.roll('jail',r),{primary:true,kind:'roll'})}
  else if(v.stage==='auction'&&d?.kind==='auction'){if(!Number.isInteger(d.seat))button('Start auction',()=>choose('startAuction'),{primary:true});else{say('Highest bid: '+formatMoney(d.bid));for(const inc of [10,50,100])button('Bid '+formatMoney(d.bid+inc),()=>controller.act('auctionBid',{amount:d.bid+inc},r),{primary:inc===10,disabled:d.bid+inc>p.cash});button('Drop out',()=>controller.act('auctionBid',{amount:0},r))}}
  else if(v.stage==='debt'&&d?.kind==='debt'){say('You owe '+formatMoney(d.amount)+'.');button('Pay',()=>controller.act('debtAction',{kind:'pay'},r),{primary:true,disabled:p.cash<d.amount});button('Bankrupt',()=>controller.act('debtAction',{kind:'bankrupt'},r),{disabled:p.cash>=d.amount})}
  else if(v.stage==='trade'&&d?.kind==='trade'){say('Trade offer received.');if(openTradeReview){if(tradeRevision!==r){tradeRevision=r;void perform(async()=>{const reply=await openTradeReview(v);if(closed||controller.snapshot()?.revision!==r||!reply)return;return controller.act('replyTrade',{...reply,offerHash:d.offerHash},r)})}}else button('Decline',()=>controller.act('replyTrade',{decision:'decline',offerHash:d.offerHash},r))}
  else say('Waiting for the next decision…');
 }
 controller=createGameController({client,code,onView,onState:s=>{render(s);onState(s)}});
 return{controller,dispatch:(action,fields,revision)=>perform(()=>controller.act(action,fields,revision)),redraw:({resetDecision=false}={})=>{if(resetDecision){purchaseRevision=null;tradeRevision=null;renderKey=null}const s=controller.status();render(s);onState(s)},refresh:()=>perform(()=>controller.refresh()),recover:()=>perform(()=>controller.recover()),close(){if(closed)return;closed=true;controller.close();acts.replaceChildren()}};
}

// Opt-in screen adapter. The shipped title/lobby does not activate it.
export function mountSkylineControls({client,code,onError=()=>{},pollMs=2500}){
 if(pollMs!==0&&(!Number.isInteger(pollMs)||pollMs<1000||pollMs>30000))throw Error('Invalid refresh interval');
 if(typeof window.__sim!=='function'||typeof buildBoard!=='function'||!document.querySelector('#title')||document.querySelector('#title').hidden||window.__skylineTrustedControls)throw Error('Start from the game title');
 const previous={game:G,menu:openMenu,roster:renderRoster,build,sell,mortgage,redeem:unmortgage,openTrade,assets:document.querySelector('#bAssets').onclick,trade:document.querySelector('#bTrade').onclick,menuButton:document.querySelector('#bMenu').onclick};
 let mounted=false,closed=false,current=null,controls,timer=null,dialog=null,serial=0;
 const mutable=v=>v&&v.status==='playing'&&!v.game.over&&v.actorSeat===v.seat&&!v.game.players[v.seat].bankrupt&&!v.game.players[v.seat].ai;
 const editable=v=>mutable(v)&&['pre','post','purchase','debt'].includes(v.stage);
 const tradableNow=v=>mutable(v)&&['pre','post'].includes(v.stage);
 const terms=t=>Object.fromEntries(['to','give','get','gc','rc','gcard','rcard'].map(k=>[k,t[k]]));
 function schedule(){if(closed||timer||!pollMs)return;timer=setTimeout(async()=>{timer=null;if(closed)return;try{if(!controls.controller.status().busy)await controls.refresh()}finally{schedule()}},pollMs)}
 function safeRoster(){const scan=achScan,push=pushState;try{achScan=()=>{};pushState=()=>{};return previous.roster()}finally{achScan=scan;pushState=push}}
 function fail(e){if(closed)return;dialog=null;serial++;document.querySelector('#modals').replaceChildren();onError(e)}
 function sync(s){
  if(closed)return;
  const held=s.busy||s.needsRecovery;document.querySelector('#bAssets').disabled=held;document.querySelector('#bTrade').disabled=held||!tradableNow(s.view);
  document.querySelector('#bAssets').classList.toggle('off',!editable(s.view));document.querySelector('#bTrade').classList.toggle('off',!tradableNow(s.view));
  if(held){if(s.needsRecovery&&!s.busy){dialog=null;serial++;document.querySelector('#modals').replaceChildren()}else for(const b of document.querySelectorAll('#modals button'))b.disabled=true;return}
  if(dialog?.type==='portfolio'&&!document.querySelector('#modals .pf2'))showPortfolio(dialog);
 }
 function render(v){
  if(closed)return;
  if(current&&current.revision!==v.revision&&dialog?.type!=='portfolio'){dialog=null;serial++}
  current=v;const display=copy(v.game);display.players=display.players.map(p=>({...p,goojf:Object.freeze({length:p.bailPasses})}));
  if(!mounted){GEN++;netStop();ttStop();FAST=false;mounted=true;G=display;applyTheme(G.set.theme||G.set.city);applyDiceSkin();document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;document.querySelector('#modals').replaceChildren();buildBoard();checkRotate();camOverview(P(G.turn).pos,0)}else{G=display;document.querySelector('#modals').replaceChildren();for(let i=0;i<40;i++)updateCell(i);G.players.forEach(p=>placeToken(p))}
  safeRoster();document.querySelector('#log').textContent=G.log[0]||'';
  const name=document.querySelector('#pc'+v.seat+' .pn');if(name&&!name.querySelector('.you')){const tag=document.createElement('span');tag.className='tag you';tag.textContent='You';name.append(tag)}
 }
 function showPortfolio(frame){
  if(closed||!current||dialog!==frame)return;
  const v=current,edit=frame.edit&&editable(v),debt=edit&&v.stage==='debt',token=++serial;frame.token=token;
  const promise=openAssets(G.players[frame.seat],{readonly:!edit,debt:debt?v.decision.amount:0,who:debt&&v.seat!==v.game.turn,to:debt&&v.decision.to!=null?G.players[v.decision.to]:null});
  if(debt&&v.game.players[v.seat].cash>=v.decision.amount){const b=[...document.querySelectorAll('#modals button')].find(x=>x.textContent==='Declare bankruptcy');if(b)b.disabled=true}
  if(frame.selected!=null){const name=SQ[frame.selected]?.n;const row=[...document.querySelectorAll('.pf2row')].find(r=>r.tagName==='BUTTON'&&r.querySelector('.pf2rn')?.textContent===name);row?.click()}
  void promise.then(async choice=>{
   if(closed||dialog!==frame||frame.token!==token)return;dialog=null;
   if(debt&&['pay','bankrupt'].includes(choice)){await controls.dispatch('debtAction',{kind:choice},v.revision)}
   controls.redraw({resetDecision:true});
  }).catch(e=>{if(!closed)fail(e)});
 }
 function portfolio(){
  if(!current||closed||controls.controller.status().busy||client.pending())return;
  dialog={type:'portfolio',edit:editable(current),seat:current.seat,selected:null};document.querySelector('#modals').replaceChildren();showPortfolio(dialog);controls.redraw();
 }
 function property(kind,pid,square){
  if(closed||!current||!editable(current)||pid!==current.seat||controls.controller.status().busy||client.pending())return;
  const v=current;if(v.stage==='debt'&&!['sell','mortgage'].includes(kind))return;
  if(dialog?.type==='portfolio')dialog.selected=square;
  const action=v.stage==='debt'?'debtAction':v.stage==='purchase'?'purchaseAsset':'assetAction';
  const fields=action==='debtAction'?{kind,square}:{command:{kind,square}};
  void controls.dispatch(action,fields,v.revision);
  queueMicrotask(()=>{if(!closed&&controls.controller.status().busy)for(const b of document.querySelectorAll('#modals button'))b.disabled=true});
 }
 async function propose(){
  if(closed||!tradableNow(current)||controls.controller.status().busy||client.pending())return;
  const v=current,frame={type:'editor',token:++serial};dialog=frame;controls.redraw();
  try{const offer=await tradeEditor(G.players[v.seat],{});if(closed||dialog!==frame||current.revision!==v.revision)return;dialog=null;
   if(offer)await controls.dispatch('proposeTrade',{offer:terms(offer)},v.revision);controls.redraw({resetDecision:true});
  }catch(e){if(!closed)fail(e)}
 }
 async function review(v){
  const d=v.decision,frame={type:'review',token:++serial};dialog=frame;
  try{
   const k=await modal({cls:'wide',html:'<div class="mh">'+(d.depth?'Counter offer':'Deal offered')+' to '+esc(v.game.players[v.seat].name)+'</div>'+tradeSummary(d.offer),btns:[{k:'decline',label:'Decline'},...(d.depth<3?[{k:'counter',label:'Counter offer'}]:[]),{k:'accept',label:'Accept deal',primary:true}]});
   if(closed||dialog!==frame||current.revision!==v.revision)return null;
   if(k==='counter'){
    const t=await tradeEditor(G.players[v.seat],{partner:d.offer.from,pre:counterOf(d.offer),title:'Counter offer to '+esc(G.players[d.offer.from].name),cta:'Send counter offer'});
    if(closed||dialog!==frame||current.revision!==v.revision)return null;
    return t?{decision:'counter',offer:terms(t)}:{decision:'decline'};
   }
   return{decision:k==='accept'?'accept':'decline'};
  }finally{if(dialog===frame)dialog=null}
 }
 async function menu(){
  if(closed)return;
  const choice=await modal({html:'<div class="mh">Menu</div>',btns:[{k:'rules',label:'Rules'},{k:'sound',label:'Sound'},{k:'camera',label:'Camera'},{k:'exit',label:'Leave game'},{k:'back',label:'Back',primary:true}]});
  if(closed)return;if(choice==='sound')return openSound();if(choice==='camera')return document.querySelector('#camBtn').click();if(choice==='rules')return modal({cls:'wide',html:'<div class="mh">How to play</div>'+RULES,btns:[{k:'back',label:'Back',primary:true}]});if(choice==='exit')close();
 }
 function close(){
  if(closed)return;closed=true;clearTimeout(timer);dialog=null;serial++;controls.close();GEN++;document.querySelector('#modals').replaceChildren();openMenu=previous.menu;renderRoster=previous.roster;build=previous.build;sell=previous.sell;mortgage=previous.mortgage;unmortgage=previous.redeem;openTrade=previous.openTrade;
  for(const [selector,key]of [['#bAssets','assets'],['#bTrade','trade'],['#bMenu','menuButton']]){document.querySelector(selector).onclick=previous[key];document.querySelector(selector).disabled=false}
  G=previous.game;delete window.__skylineTrustedControls;showTitle();
 }
 controls=mountGameControls({client,code,onView:render,onState:sync,isManaging:()=>!!dialog,onError:fail,formatMoney:n=>fmt(n),rollIcon:DIE_SVG,setPromptText:text=>setPrompt(esc(text)),openTradeReview:review,openPurchase:async v=>{
  const d=v.decision,p=v.game.players[v.seat];
  const k=await modal({html:'<div class="mh">For sale</div><div class="row2">'+deedHTML(d.square)+'<div class="slotbar sidecol"><div class="mtxt">You have <b>'+fmt(p.cash)+'</b>.</div></div></div>',cls:'wide',btns:[{k:'decline',label:v.game.set.auction===false?'Don’t buy':'Auction'},...(!d.canBuy?[{k:'raise',label:'Raise cash'}]:[]),{k:'buy',label:'Buy for '+fmt(d.price),primary:true,disabled:!d.canBuy}]});
  if(k==='raise'){if(!closed&&current.revision===v.revision)portfolio();return null}return k;
 }});
 renderRoster=safeRoster;build=(pid,i)=>property('build',pid,i);sell=(pid,i)=>property('sell',pid,i);mortgage=(pid,i)=>property('mortgage',pid,i);unmortgage=(pid,i)=>property('redeem',pid,i);openTrade=propose;
 openMenu=menu;document.querySelector('#bMenu').onclick=menu;document.querySelector('#bAssets').onclick=portfolio;document.querySelector('#bTrade').onclick=propose;
 const mountedControls={...controls,refresh:async()=>{const v=await controls.refresh();schedule();return v},close};window.__skylineTrustedControls=mountedControls;
 return mountedControls;
}
