import {createGameController} from './game-controller.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
export function mountGameControls({client,code,document=globalThis.document,onView=()=>{},formatMoney=n=>String(n),setPromptText,rollIcon='',openPurchase,onError=()=>{}}){
 const acts=document.querySelector('#acts'),prompt=document.querySelector('#prompt');if(!acts||!prompt)throw Error('Game controls are missing');
 let closed=false,interrupted=false,purchaseRevision=null,controller;
 const say=text=>setPromptText?setPromptText(text):prompt.textContent=text;
 const perform=async fn=>{try{const result=await fn();if(!closed){interrupted=false;render(controller.status())}return result}catch(e){if(!closed){interrupted=true;purchaseRevision=null;render(controller.status());onError(e)}return null}};
 function button(label,fn,{primary=false,disabled=false,kind='pill'}={}){
  const b=document.createElement('button');b.type='button';b.className=kind==='roll'?'bigb':kind==='end'?'bigb end':'pill'+(primary?' pri':'');b.textContent=label;b.setAttribute('aria-label',label);b.disabled=disabled;
  if(kind==='roll'&&rollIcon){const icon=document.createElement('span');icon.innerHTML=rollIcon;b.prepend(icon)}
  b.onclick=()=>{if(!b.disabled)void perform(fn)};acts.append(b);return b;
 }
 function render(state){
  if(closed)return;acts.replaceChildren();const v=state.view;if(!v){say('Connecting to your game…');return}
  if(state.busy){say('Updating your game…');return}
  if(state.needsRecovery){say('Recover your saved action to continue.');button('Recover action',()=>controller.recover(),{primary:true});return}
  if(interrupted){say('Connection interrupted. Reconnect to continue.');button('Reconnect',()=>controller.refresh(),{primary:true});return}
  if(v.status==='over'||v.game.over){say('Game over.');return}
  if(v.actorSeat!==v.seat||v.game.players[v.seat].bankrupt||v.game.players[v.seat].ai){say('Waiting for '+v.game.players[v.actorSeat].name+'…');return}
  const r=v.revision,d=v.decision,p=v.game.players[v.seat],choose=kind=>controller.act('choose',{kind},r);
  say(p.name+', your turn.');
  if(v.stage==='pre')button('Roll dice',()=>controller.roll('roll',r),{primary:true,kind:'roll'});
  else if(v.stage==='post')button('End turn',()=>controller.act('endTurn',{},r),{primary:true,kind:'end'});
  else if(v.stage==='purchase'&&d?.kind==='purchase'){
   if(openPurchase){if(purchaseRevision!==r){purchaseRevision=r;void perform(async()=>{const kind=await openPurchase(v);if(closed||controller.snapshot()?.revision!==r)return;return choose(kind==='buy'?'buy':'decline')})}}
   else{button(v.game.set.auction===false?'Don’t buy':'Auction',()=>choose('decline'));button('Buy for '+formatMoney(d.price),()=>choose('buy'),{primary:true,disabled:!d.canBuy})}
  }else if(v.stage==='card'&&d?.kind==='card')button('Draw card',()=>choose('drawCard'),{primary:true});
  else if(v.stage==='reroll'&&d?.kind==='reroll'){button('Keep dice',()=>choose('keep'));button('Re-roll',()=>controller.roll('reroll',r),{primary:true,disabled:d.remaining<=0})}
  else if(v.stage==='jail'&&d?.kind==='jail'){button('Pay '+formatMoney(d.bail),()=>choose('payBail'),{disabled:!d.canPay});button('Use Bail Pass',()=>choose('useBailPass'),{disabled:d.passes<1});button('Roll dice',()=>controller.roll('jail',r),{primary:true,kind:'roll'})}
  else if(v.stage==='auction'&&d?.kind==='auction'){if(!Number.isInteger(d.seat))button('Start auction',()=>choose('startAuction'),{primary:true});else{say('Highest bid: '+formatMoney(d.bid));for(const inc of [10,50,100])button('Bid '+formatMoney(d.bid+inc),()=>controller.act('auctionBid',{amount:d.bid+inc},r),{primary:inc===10,disabled:d.bid+inc>p.cash});button('Drop out',()=>controller.act('auctionBid',{amount:0},r))}}
  else if(v.stage==='debt'&&d?.kind==='debt'){say('You owe '+formatMoney(d.amount)+'.');button('Pay',()=>controller.act('debtAction',{kind:'pay'},r),{primary:true,disabled:p.cash<d.amount});button('Bankrupt',()=>controller.act('debtAction',{kind:'bankrupt'},r),{disabled:p.cash>=d.amount})}
  else if(v.stage==='trade'&&d?.kind==='trade'){say('Trade offer received.');button('Decline',()=>controller.act('replyTrade',{decision:'decline',offerHash:d.offerHash},r))}
  else say('Waiting for the next decision…');
 }
 controller=createGameController({client,code,onView,onState:render});
 return{controller,refresh:()=>perform(()=>controller.refresh()),recover:()=>perform(()=>controller.recover()),close(){if(closed)return;closed=true;controller.close();acts.replaceChildren()}};
}

// Opt-in screen adapter. The shipped title/lobby does not activate it.
export function mountSkylineControls({client,code,onError=()=>{}}){
 if(typeof window.__sim!=='function'||typeof buildBoard!=='function'||!document.querySelector('#title')||document.querySelector('#title').hidden||window.__skylineTrustedControls)throw Error('Start from the game title');
 const previous={game:G,menu:openMenu,assets:document.querySelector('#bAssets').onclick,trade:document.querySelector('#bTrade').onclick,menuButton:document.querySelector('#bMenu').onclick};
 let mounted=false,closed=false,current=null,controls;
 function render(v){
  if(closed)return;current=v;
  // This is a display model, deliberately not a legacy save or an executable game state.
  const display=copy(v.game);display.players=display.players.map(p=>({...p,goojf:Object.freeze({length:p.bailPasses})}));
  if(!mounted){GEN++;netStop();ttStop();FAST=false;mounted=true;G=display;applyTheme(G.set.theme||G.set.city);applyDiceSkin();document.querySelector('#title').hidden=true;document.querySelector('#ui').hidden=false;document.querySelector('#modals').replaceChildren();buildBoard();checkRotate();camOverview(P(G.turn).pos,0)}else{G=display;document.querySelector('#modals').replaceChildren();for(let i=0;i<40;i++)updateCell(i);G.players.forEach(p=>placeToken(p))}
  const scan=achScan,push=pushState;
  try{achScan=()=>{};pushState=()=>{};renderRoster()}finally{achScan=scan;pushState=push}
  document.querySelector('#log').textContent=G.log[0]||'';
  for(const id of ['#bAssets','#bTrade'])document.querySelector(id).classList.add('off');
  const name=document.querySelector('#pc'+v.seat+' .pn');if(name&&!name.querySelector('.you')){const tag=document.createElement('span');tag.className='tag you';tag.textContent='You';name.append(tag)}
 }
 async function menu(){
  if(closed)return;
  const choice=await modal({html:'<div class="mh">Menu</div>',btns:[{k:'rules',label:'Rules'},{k:'sound',label:'Sound'},{k:'camera',label:'Camera'},{k:'exit',label:'Leave game'},{k:'back',label:'Back',primary:true}]});
  if(closed)return;if(choice==='sound')return openSound();if(choice==='camera')return document.querySelector('#camBtn').click();if(choice==='rules')return modal({cls:'wide',html:'<div class="mh">How to play</div>'+RULES,btns:[{k:'back',label:'Back',primary:true}]});if(choice==='exit')close();
 }
 function close(){
  if(closed)return;closed=true;controls.close();GEN++;document.querySelector('#modals').replaceChildren();openMenu=previous.menu;for(const [selector,key]of [['#bAssets','assets'],['#bTrade','trade'],['#bMenu','menuButton']])document.querySelector(selector).onclick=previous[key];G=previous.game;delete window.__skylineTrustedControls;showTitle();
 }
 controls=mountGameControls({client,code,onView:render,onError:e=>{document.querySelector('#modals').replaceChildren();onError(e)},formatMoney:n=>fmt(n),rollIcon:DIE_SVG,setPromptText:text=>setPrompt(esc(text)),openPurchase:async v=>{
  const d=v.decision,p=v.game.players[v.seat];
  return modal({html:'<div class="mh">For sale</div><div class="row2">'+deedHTML(d.square)+'<div class="slotbar sidecol"><div class="mtxt">You have <b>'+fmt(p.cash)+'</b>.</div></div></div>',cls:'wide',btns:[{k:'decline',label:v.game.set.auction===false?'Don’t buy':'Auction'},{k:'buy',label:'Buy for '+fmt(d.price),primary:true,disabled:!d.canBuy}]});
 }});
 openMenu=menu;document.querySelector('#bMenu').onclick=menu;document.querySelector('#bAssets').onclick=()=>{if(current&&!closed)void openAssets(G.players[current.seat],{readonly:true})};document.querySelector('#bTrade').onclick=()=>{};
 const mountedControls={...controls,close};window.__skylineTrustedControls=mountedControls;
 return mountedControls;
}
