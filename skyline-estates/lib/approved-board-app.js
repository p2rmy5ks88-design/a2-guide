/* Premium interactive board-first replacement for the legacy Dominion/Empire lab pages.
   Actual approved GLB track, independent playing pieces, purchases, upgrades,
   auctions, rents, real turns, saves, and Career inbox report. No old saves touched. */
import {createBoard} from './approved-board-renderer.js';
import * as R from './approved-board-rules.js';
const $=id=>document.getElementById(id),Q=new URLSearchParams(location.search);
const board=Q.get('board')==='empire'?'empire':'dominion';
const base='./assets/approved-replacements/'+board,saveKey='skylineApprovedReplacement:'+board+':v1';
const career=Q.get('career')==='1',name=board==='dominion'?'SKYLINE DOMINION':'CROWN EMPIRE';
const tag=board==='dominion'?'THE HEX RING BOARD':'CROWN PLAZA PROPERTY BOARD';
const about=board==='dominion'?'Six royal districts around the central Dominion Tower. Roll, own, upgrade and trade.':'Gold-framed royal estates around Crown Plaza. Buy, build, collect rent and rule the empire.';
const seatColors=['#f2c457','#43a4ff','#53d884','#c16ef5'],emblems=['🦁','🦅','🐎','⛵'];
let source=null,spaces=null,s=null,three=null,busy=false,noticeTimer=null,boardUI=null;
let fast=(()=>{try{return localStorage.getItem('skylineBoardFast')==='1'}catch{return false}})();
window.__boardSetSpeed=f=>{fast=!!f};
const stepMs=you=>Q.get('speed')==='instant'?30:(you?(fast?55:115):(fast?20:45));
$('gameName').firstChild.textContent=name;$('setupTitle').textContent=name;$('subtitle').textContent=tag;$('description').textContent=about;
$('setupDesc').textContent='Buy streets, build towers and out-earn your rivals on this '+(board==='dominion'?'hexagonal 48-space':'crown-shaped 32-space')+' board.';
$('menuSub').textContent=(board==='dominion'?'Skyline Dominion':'Crown Empire')+' — '+tag.toLowerCase().replace(/^./,c=>c.toUpperCase());
$('rulesLead').textContent=`Have the highest total value when the last round ends (Quick ${board==='dominion'?12:12}, Standard ${board==='dominion'?18:20}, Extended ${board==='dominion'?24:28} rounds).`;
$('rulesRewards').textContent=board==='dominion'?'A Career win on Standard or Extended pays 7× the usual win coins and Skyline Cash when you return to Skyline Estates, and counts toward unlocking Crown Empire. Quick matches earn Career mastery XP only.':'A Career win on Standard or Extended pays 10× the usual win coins and Skyline Cash when you return to Skyline Estates. Quick matches earn Career mastery XP only. Crown Empire is the last Career board.';
if(['quick','standard','extended'].includes(Q.get('length')))$('length').value=Q.get('length');
const tokenCount=x=>x?.length||0;
const money=R.cashFormat;
const notice=(message,delay=2600)=>{const n=$('notice');n.textContent=message;n.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.hidden=true,delay)};
async function fetchAssets(){const res=await fetch(base+'/board_data.json');if(!res.ok)throw Error(`Board data missing (${res.status}). Please update the app.`);source=await res.json();spaces=R.preserveRules(source,board)}
const getSaved=()=>{try{return R.restore(localStorage.getItem(saveKey),spaces,board)}catch{return null}};
const store=()=>{try{if(s&&s.phase!=='over')localStorage.setItem(saveKey,JSON.stringify(s))}catch(e){console.warn('Game save unavailable',e)}};
function sendCareerResult(){if(!career||!s||s.phase!=='over'||s.endReason!=='highest-value')return;const facts=R.careerFacts(s,spaces);
 try{localStorage.setItem('skylineCareerInbox:'+facts.matchId,JSON.stringify(facts));localStorage.removeItem(saveKey)}catch(e){console.warn('Career inbox save failed',e)}}
function seatHtml(p,compact=false){return compact?
 `<div class="player-chip ${p.id===s.turn&&s.phase!=='over'?'active':''}" style="--seat:${seatColors[p.id]}"><span class="icon">${emblems[p.id]}</span><div class="details">${p.id===0?'You':p.name.replace(' (CPU)','')}<small>${money(p.cash)}</small></div></div>`:
 `<div class="seat ${p.id===s.turn&&s.phase!=='over'?'active':''}" style="--seat:${seatColors[p.id]}"><span class="emblem">${emblems[p.id]}</span><span class="who">${p.name}</span><span class="money">${money(p.cash)}</span></div>`}
function rankedSeats(){return R.score(s,spaces).map(p=>s.players[p.id])}
function updateCards(){const players=rankedSeats();$('roster').innerHTML=players.map(x=>seatHtml(x)).join('');$('seatSummary').innerHTML=players.map(x=>seatHtml(x,true)).join('');
 $('round').textContent=`🎲 Round ${s.round} / ${s.maxRounds}`;
 $('turn').textContent=s.phase==='over'?'🏆 Match finished':s.turn===0?'👑 Your turn':'⏳ '+s.players[s.turn].name;
}
function detailsTile(){const t=spaces[s.selected]||spaces[0],p=s.properties[t.id],owner=p?.owner==null?null:s.players[p.owner];
 $('propertyName').textContent=t.name;$('property').style.setProperty('--tile-color',{'gold':'#f6d06a','purple':'#a66cfc','blue':'#4b9fff','red':'#fd6373','green':'#49c888','cream':'#f9e7c5','pink':'#fe80b1','orange':'#f69b55'}[t.palette]||'#f2c457');
 const img=$('propertyImage');img.src=base+'/'+t.texture;img.hidden=false;img.alt=`${t.name} property art`;
 $('propertyMeta').innerHTML=`<div class="meta"><span>Type</span><b>${t.kind.replace(/^(.)/,x=>x.toUpperCase())}</b></div>`+
 (R.isOwnable(t)?`<div class="meta"><span>Price</span><b>${money(t.price_sc)}</b></div><div class="meta"><span>Owner</span><b>${owner?owner.name:'Available'}</b></div><div class="meta"><span>Rent</span><b>${money(R.rent(t,p))}</b></div>${p?.stage?`<div class="meta"><span>Building level</span><b>${p.stage}/${R.MAX_STAGE[board]}</b></div>`:''}`:
 `<div class="meta"><span>Space #${t.id}</span><b>${t.kind==='start'?'Collect salary on passing':t.kind==='tax'?money(t.price_sc):'Special event'}</b></div>`);
}
function action(id,label,cls,fn,enabled=true){const btn=document.createElement('button');btn.id=id;btn.className=cls;btn.textContent=label;btn.disabled=!enabled;
 btn.addEventListener('click',async()=>{if(busy||!enabled)return;try{await fn()}catch(e){notice(e.message||String(e),3300)}},{passive:false});return btn}
function askAmount(title,min,max,defaultValue){return new Promise(resolve=>{
 const dialog=document.createElement('dialog');dialog.style.cssText='border:2px solid #f2c457;border-radius:14px;background:#142843;color:#fff4d8;max-width:min(410px,90vw);padding:18px;box-shadow:0 10px 40px #000b';
 const heading=document.createElement('h2');heading.textContent=title;heading.style='font:800 17px Georgia;color:#ffd481';dialog.appendChild(heading);
 const form=document.createElement('form');form.method='dialog';form.style='display:flex;flex-direction:column;gap:12px';
 const num=document.createElement('input');num.type='number';num.min=String(min);num.max=String(max);num.step='1000';num.value=String(defaultValue);num.setAttribute('aria-label','Offer in Skyline Cash');num.style='min-height:44px;padding:8px;background:#061323;color:white;border:1px solid #f2c457;border-radius:8px';form.appendChild(num);
 const row=document.createElement('div');row.style='display:flex;gap:8px';for(const [txt,val] of [['Cancel','cancel'],['Confirm','confirm']]){const btn=document.createElement('button');btn.textContent=txt;btn.value=val;btn.style='min-width:100px';row.appendChild(btn)}form.appendChild(row);dialog.appendChild(form);document.body.appendChild(dialog);
 dialog.addEventListener('close',()=>{const val=dialog.returnValue==='confirm'?Number(num.value):null;dialog.remove();resolve(val)},{once:true});dialog.showModal();
 })}
function redraw(){if(!s||!three)return;three.sync(s);updateCards();detailsTile();
 const box=$('actionbox');box.replaceChildren();const isTurn=s.turn===0&&s.phase!=='over',phase=s.phase,landing=spaces[s.players[0].pos],chosen=spaces[s.selected],owner=s.properties[chosen.id],isLanding=s.selected===landing.id;
 if(s.phase==='over'){box.append(action('again','🏆 View final results','roll',finish,true));return}
 if(phase==='roll')box.append(action('roll','🎲 ROLL DICE','roll',takeRoll,isTurn));
 if(phase==='decide'){
  if(isTurn&&isLanding&&R.isOwnable(landing)&&!s.properties[landing.id]){
   box.append(action('buy','🛒 Buy '+money(landing.price_sc),'buy',()=>{R.buy(s,spaces);SkylineFeel.play('buy');afterAction()},s.players[0].cash>=landing.price_sc));
   box.append(action('auction','⚖️ Auction','secondary',async()=>{const bid=await askAmount('Bid for '+landing.name,0,s.players[0].cash,Math.min(s.players[0].cash,Math.round(landing.price_sc*.7)));if(bid!==null){R.auction(s,spaces,bid);SkylineFeel.play(s.properties[landing.id]?.owner===0?'buy':'tap');afterAction()}}));
  }
  if(isTurn&&owner?.owner===0){const cost=R.buildCost(chosen,owner);box.append(action('build','🏗 Upgrade '+money(cost),'secondary',()=>{R.build(s,spaces,chosen.id);SkylineFeel.play('build');afterAction()},owner.stage<R.MAX_STAGE[board]&&s.players[0].cash>=cost))}
  if(isTurn&&owner?.owner>=1){box.append(action('trade','🤝 Offer to trade','secondary',async()=>{const min=Math.round(chosen.price_sc*(1.13+owner.stage*.28));const amt=await askAmount('Buy from '+s.players[owner.owner].name,min,s.players[0].cash,min);if(amt!==null){R.trade(s,spaces,chosen.id,amt);afterAction()}}))}
  if(isTurn){box.append(action('end','▶ End turn','end',takeEnd))}
 }
 const info=document.createElement('div');info.className='message';
 info.textContent=isTurn?(phase==='roll'?'Roll to move your 3D token around the board.':`You landed on ${landing.name}. Tap a space to inspect or upgrade owned properties.`):'Opponents are taking their turns';box.appendChild(info);
 $('declareBankruptcy').disabled=$('endMatch').disabled=!isTurn||busy;
 $('standings').innerHTML=R.score(s,spaces).map((p,i)=>`<span>${i+1}. ${p.name.replace(' (CPU)','')}</span><b>${money(p.worth)}</b>`).join('');
 boardUI&&boardUI.refresh();
 $('whole').classList.toggle('active',three.stats().mode==='whole');$('close').classList.toggle('active',three.stats().mode==='close');
 store();
}
function afterAction(){redraw();notice(s.log.at(-1)?.message||'Action recorded')}
async function takeRoll(){if(busy||s.phase!=='roll')return;busy=true;try{
 const cash0=s.players[0].cash,result=R.roll(s,spaces);SkylineFeel.play('dice');$('turn').textContent=`🎲 Rolled ${result.dice.join(' + ')}`;
 // Always move through the actual ordered 3D board spaces.
 if(result.steps.length)await three.move(0,result.steps,stepMs(true));
 s.selected=s.players[0].pos;three.close(s.selected);if(s.players[0].cash<cash0)SkylineFeel.play('bad');else if(s.players[0].cash>cash0)SkylineFeel.play('coin');
 if(s.phase==='over'){sendCareerResult();finish()}
 redraw();notice(s.log.at(-1)?.message||'Token moved',3000)
 }finally{busy=false;redraw()}}
async function takeEnd(){if(busy||s.phase!=='decide')return;busy=true;
 try{three.overview();$('turn').textContent='⏳ Other players';const movements=R.endTurn(s,spaces);
 if(Q.get('speed')!=='instant')for(const event of movements)if(event?.steps?.length)await three.move(event.player,event.steps,stepMs(false));
 if(s.phase==='over'){sendCareerResult();finish()}else{s.selected=s.players[0].pos;three.overview();redraw()}
 }finally{busy=false;if(s.phase!=='over')redraw()}}
function finish(){if(!s)return;const results=R.score(s,spaces),champ=s.players[s.winner],me=s.players[0],place=results.findIndex(p=>p.id===0)+1,won=s.winner===0,full=s.endReason==='highest-value';
 const st=me.stats||{},owned=Object.values(s.properties).filter(p=>p.owner===0),levels=owned.reduce((n,p)=>n+(p.stage||0),0);
 const mult=board==='dominion'?7:10,next=board==='dominion'?'Crown Empire':null;
 const careerLine=s.length==='quick'&&career&&full?'Quick matches earn Career mastery XP only; win a Standard or Extended match for progress.':!career?'Play this board from Career to count wins toward your Career progress.':!full?'Early finishes do not count for Career.':won?(next?`This win counts toward unlocking ${next}. Your Career updates when you return to Skyline Estates.`:'This win counts toward Crown Empire mastery. Your Career updates when you return to Skyline Estates.'):`Only wins count for Career. Win a Standard match here${next?' to work toward '+next:''}.`;
 SkylineFeel.play(won?'win':'tap');
 const box=$('finish');box.innerHTML=`<div class="box"><h2>${won?'🏆 You win!':`🏆 ${champ.name.replace(' (CPU)','')} wins`}</h2><p>${full?`You finished ${['','1st','2nd','3rd','4th'][place]} of ${results.length} with ${money(R.worth(s,spaces,0))} total value.`:'Match ended early. Final standings:'}</p>
  <div class="sumGrid"><span>Streets owned</span><b>${owned.length}</b><span>Upgrade levels</span><b>${levels}</b><span>Streets bought</span><b>${st.buys||0}</b><span>Auctions won</span><b>${st.auctions||0}</b></div>
  <div class="sumRank">${results.map((p,i)=>`<span>${i+1}. ${p.name.replace(' (CPU)','')}</span><b>${money(p.worth)}</b>`).join('')}</div>
  <p class="sumNote"><b>Rewards:</b> ${career&&full&&won&&s.length!=='quick'?`${mult}× the usual win coins and Skyline Cash, added when you return to Skyline Estates.`:`Only Career wins on Standard or Extended pay ${mult}× win rewards.`}<br><b>Career:</b> ${careerLine}</p>
  <div class="sumBtns"><button id="returnCareer">🏠 Return to Skyline Estates</button><button id="newMatch">↻ Play again</button><button id="exitResults">View board</button></div></div>`;
 box.hidden=false;box.querySelector('#newMatch').onclick=()=>{localStorage.removeItem(saveKey);location.reload()};box.querySelector('#exitResults').onclick=()=>box.hidden=true;
 sendCareerResult();
 const returnButton=box.querySelector('#returnCareer');
 if(returnButton)returnButton.onclick=()=>location.assign('./index.html?return=1');
}
function closeFromMenu(bankruptcy){
 if(!s||s.phase==='over'||busy||s.turn!==0)return;
 const question=bankruptcy?'Declare bankruptcy and return your properties to the bank?':'End this match now and score the current standings?';
 if(!window.confirm(question+' Early finishes on this board do not award Career progress.'))return;
 if(!R.closeMatch(s,spaces,bankruptcy))return;
 localStorage.removeItem(saveKey);
 $('menu').hidden=true;
 three.overview();redraw();finish();
}
$('declareBankruptcy').onclick=()=>closeFromMenu(true);
$('endMatch').onclick=()=>closeFromMenu(false);
function tileSelected(id){if(!s||busy)return;s.selected=id;three.choose(id);redraw()}
async function start(state){
 s=state;$('setup').hidden=true;notice('Loading the 3D board…',10000);
 try{three=await createBoard({canvas:$('board'),board,source,base,quality:Q.get('quality')||'high',onSelect:tileSelected});
   // Auto-assist (27 Nov 2026): plays your turn the way the computer players do: roll, buy what you can comfortably
// afford, upgrade your cheapest property when there is spare cash, then end the turn.
function assistPlan(){if(!s||s.turn!==0||s.phase==='over')return null;if(s.phase==='roll')return{type:'roll'};if(s.phase!=='decide')return null;
 const me=s.players[0],land=spaces[me.pos];if(R.isOwnable(land)&&!s.properties[land.id]&&me.cash>land.price_sc*1.2)return{type:'buy',name:land.name};
 const up=Object.keys(s.properties).map(Number).filter(id=>s.properties[id].owner===0&&s.properties[id].stage<R.MAX_STAGE[board]).map(id=>({id,cost:R.buildCost(spaces[id],s.properties[id])})).filter(x=>me.cash>x.cost+150000).sort((a,b)=>a.cost-b.cost)[0];
 if(up&&!assistBuilt)return{type:'build',id:up.id,name:spaces[up.id].name};return{type:'end'}}
let assistBuilt=false,assisting=false;
async function assistRun(){if(assisting)return;assisting=true;try{while(s&&s.turn===0&&s.phase!=='over'&&window.SkylineAssist&&SkylineAssist.on(0)){if(busy){await new Promise(r=>setTimeout(r,200));continue}
  await new Promise(r=>setTimeout(r,450));const a=assistPlan();if(!a)break;
  if(a.type==='roll'){assistBuilt=false;await takeRoll()}else if(a.type==='buy'){R.buy(s,spaces);SkylineFeel.play('buy');afterAction()}else if(a.type==='build'){R.build(s,spaces,a.id);assistBuilt=true;SkylineFeel.play('build');afterAction()}else{assistBuilt=false;await takeEnd()}}}
 catch(e){notice(e.message||String(e),3000)}finally{assisting=false;try{SkylineAssist.refresh()}catch(e){}}}
window.SkylineAssist&&SkylineAssist.connect({seat:0,mount:{parent:$('hudTop'),before:document.getElementById('boardRadio')||$('menuBtn')},myTurn:()=>!!s&&s.turn===0&&s.phase!=='over'&&!busy,turnKey:()=>s?s.round+':'+s.turn:'',over:()=>!s||s.phase==='over',run:assistRun,
 hint:()=>{const a=assistPlan();return a?({roll:'Roll the dice',buy:'Buy '+a.name,build:'Upgrade '+a.name,end:'End your turn'})[a.type]:''}});
{const _rd=redraw;redraw=function(){const r=_rd.apply(this,arguments);try{SkylineAssist.turnEnded();if(SkylineAssist.on(0)&&!assisting)setTimeout(assistRun,0)}catch(e){}return r}}
window.__skylineApproved={state:()=>s,renderer:()=>three,spaces,board,source,roll:takeRoll,endTurn:takeEnd,select:tileSelected};
   if(s.selected!==0)three.choose(s.selected);three.overview();redraw();notice('Tap a tile or roll the dice to begin.',3200)
   startGuide();
 }catch(error){console.error(error);$('setup').hidden=false;notice('Could not load the 3D board: '+error.message,14000);throw error}
}
function startGuide(){const N=s.maxRounds;
 SkylineBoardGuide.start({key:board,facts:()=>{if(!s||s.phase==='over')return null;const me=s.players[0],land=spaces[me.pos],mine=s.turn===0;
   const kind=mine&&s.phase==='roll'?'roll':mine&&s.phase==='decide'&&R.isOwnable(land)&&!s.properties[land.id]?'buy':'other';
   return {mine,kind,owns:Object.values(s.properties).filter(p=>p.owner===0).length}},
  steps:[{id:'goal',when:()=>true,title:'Your goal',text:`Have the highest total value when round ${N} ends: cash, plus your streets, plus what you spent upgrading them.`},
   {id:'roll',when:f=>f.kind==='roll',until:f=>f.kind!=='roll',title:'Roll the dice',text:'Tap ROLL DICE. Your token moves around the board.'},
   {id:'buy',when:f=>f.kind==='buy',until:f=>f.kind!=='buy',title:'Buy or auction',text:'This street is free. Buy it, or send it to auction. Rivals who land on your streets pay you rent.'},
   {id:'build',when:f=>f.mine&&f.owns>0,title:'Upgrade for more rent',text:'Tap a street you own, then Upgrade. Each level raises the rent rivals pay.'},
   {id:'menu',when:f=>f.owns>0&&!f.mine,title:'Menu',text:'☰ Menu has your Portfolio, the full rules, Fast speed and the radio.'}]})}
$('start').onclick=()=>start(R.createMatch(board,source,{length:$('length').value,seed:Number(Q.get('seed'))||Date.now()%1e9,career}));
$('resume').onclick=()=>{const st=getSaved();if(st)start(st);else notice('No compatible saved match')};
$('whole').onclick=()=>{if(three){three.overview();redraw()}};
$('close').onclick=()=>{if(three){three.close(s.selected);redraw()}};
$('menuBtn').onclick=()=>{if(s)redraw();$('menu').hidden=false};
$('mResume').onclick=()=>{$('menu').hidden=true};
$('mRules').onclick=()=>{$('menu').hidden=true;$('rules').hidden=false};
$('rulesClose').onclick=()=>{$('rules').hidden=true};
$('mNew').onclick=()=>{if(!window.confirm('Start a new match? This match will not count.'))return;localStorage.removeItem(saveKey);location.reload()};
$('mHome').onclick=()=>{store();location.assign('./index.html?return=1')};
const PAL={gold:'#f6d06a',purple:'#a66cfc',blue:'#4b9fff',red:'#fd6373',green:'#49c888',cream:'#f9e7c5',pink:'#fe80b1',rose:'#fe80b1',orange:'#f69b55',emerald:'#2fb67c'};
const PAL_NAME={gold:'Gold',purple:'Royal Purple',blue:'Harbour Blue',red:'Crimson',green:'Garden Green',cream:'Ivory',pink:'Rose',rose:'Rose',orange:'Amber',emerald:'Emerald'};
boardUI=SkylineBoardUI.init({key:board,sideWidth:'clamp(189px,22vw,253px)',money,
 groups:()=>{if(!s||!spaces)return [];const g=new Map();for(const t of spaces){if(!R.isOwnable(t))continue;const k=t.palette||'gold';if(!g.has(k))g.set(k,{name:PAL_NAME[k]||k,color:PAL[k]||'#f2c457',items:[]});
  const p=s.properties[t.id],o=p?s.players[p.owner]:null;g.get(k).items.push({id:t.id,name:t.name,price:t.price_sc,stage:p?p.stage+'/'+R.MAX_STAGE[board]:null,rent:p?R.rent(t,p):null,owner:o?{you:o.id===0,name:o.name.replace(' (CPU)',''),color:seatColors[o.id]}:null})}return [...g.values()]},
 onTile:id=>tileSelected(+id)});
try{await fetchAssets();const saved=getSaved();$('resume').hidden=!saved;if(saved)$('resume').textContent=`Resume round ${saved.round}`;
 if(Q.get('autostart')==='1')start(saved||R.createMatch(board,source,{length:$('length').value,seed:Number(Q.get('seed'))||20261121,career}));
}catch(error){console.error(error);notice('Board data unavailable: '+error.message,14000);$('setupDesc').textContent=error.message;$('start').disabled=true}
