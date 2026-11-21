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
let source=null,spaces=null,s=null,three=null,busy=false,noticeTimer=null;
$('gameName').firstChild.textContent=name;$('setupTitle').textContent=name;$('subtitle').textContent=tag;$('description').textContent=about;
$('setupDesc').textContent='Play the approved '+(board==='dominion'?'hexagonal 48-space':'royal crown-shaped 32-space')+' 3D property board.';
if(['quick','standard','extended'].includes(Q.get('length')))$('length').value=Q.get('length');
const tokenCount=x=>x?.length||0;
const money=R.cashFormat;
const notice=(message,delay=2600)=>{const n=$('notice');n.textContent=message;n.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.hidden=true,delay)};
async function fetchAssets(){const res=await fetch(base+'/board_data.json');if(!res.ok)throw Error(`Approved board map missing (${res.status}). Install the supplied 3D asset kit at ${base}`);source=await res.json();spaces=R.preserveRules(source,board)}
const getSaved=()=>{try{return R.restore(localStorage.getItem(saveKey),spaces,board)}catch{return null}};
const store=()=>{try{if(s&&s.phase!=='over')localStorage.setItem(saveKey,JSON.stringify(s))}catch(e){console.warn('Game save unavailable',e)}};
function sendCareerResult(){if(!career||!s||s.phase!=='over')return;const facts=R.careerFacts(s,spaces);
 try{localStorage.setItem('skylineCareerInbox:'+facts.matchId,JSON.stringify(facts));localStorage.removeItem(saveKey)}catch(e){console.warn('Career inbox save failed',e)}}
function seatHtml(p,compact=false){return compact?
 `<div class="player-chip ${p.id===s.turn&&s.phase!=='over'?'active':''}" style="--seat:${seatColors[p.id]}"><span class="icon">${emblems[p.id]}</span><div class="details">${p.id===0?'You':p.name.replace(' (CPU)','')}<small>${money(p.cash)}</small></div></div>`:
 `<div class="seat ${p.id===s.turn&&s.phase!=='over'?'active':''}" style="--seat:${seatColors[p.id]}"><span class="emblem">${emblems[p.id]}</span><span class="who">${p.name}</span><span class="money">${money(p.cash)}</span></div>`}
function updateCards(){const players=s.players;$('roster').innerHTML=players.map(x=>seatHtml(x)).join('');$('seatSummary').innerHTML=players.map(x=>seatHtml(x,true)).join('');
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
   box.append(action('buy','🛒 Buy '+money(landing.price_sc),'buy',()=>{R.buy(s,spaces);afterAction()},s.players[0].cash>=landing.price_sc));
   box.append(action('auction','⚖️ Auction','secondary',async()=>{const bid=await askAmount('Bid for '+landing.name,0,s.players[0].cash,Math.min(s.players[0].cash,Math.round(landing.price_sc*.7)));if(bid!==null){R.auction(s,spaces,bid);afterAction()}}));
  }
  if(isTurn&&owner?.owner===0){const cost=R.buildCost(chosen,owner);box.append(action('build','🏗 Upgrade '+money(cost),'secondary',()=>{R.build(s,spaces,chosen.id);afterAction()},owner.stage<R.MAX_STAGE[board]&&s.players[0].cash>=cost))}
  if(isTurn&&owner?.owner>=1){box.append(action('trade','🤝 Offer to trade','secondary',async()=>{const min=Math.round(chosen.price_sc*(1.13+owner.stage*.28));const amt=await askAmount('Buy from '+s.players[owner.owner].name,min,s.players[0].cash,min);if(amt!==null){R.trade(s,spaces,chosen.id,amt);afterAction()}}))}
  if(isTurn){box.append(action('end','▶ End turn','end',takeEnd))}
 }
 const info=document.createElement('div');info.className='message';
 info.textContent=isTurn?(phase==='roll'?'Roll to move your 3D token around the board.':`You landed on ${landing.name}. Tap a space to inspect or upgrade owned properties.`):'Opponents are taking their turns';box.appendChild(info);
 const advanced=R.score(s,spaces);$('advancedInfo').innerHTML=`<div class="info">Board: ${source.title}</div><div class="info">Turn: ${s.round} of ${s.maxRounds}</div><div class="info">Rules: ${R.ID}</div>`+
 advanced.map((p,i)=>`<div class="info">${i+1}. ${p.name}: ${money(p.worth)} total value</div>`).join('')+
 '<h3>Latest decisions</h3>'+s.log.slice(-6).reverse().map(v=>`<div class="info">${v.message}</div>`).join('');
 $('whole').classList.toggle('active',three.stats().mode==='whole');$('close').classList.toggle('active',three.stats().mode==='close');
 store();
}
function afterAction(){redraw();notice(s.log.at(-1)?.message||'Action recorded')}
async function takeRoll(){if(busy||s.phase!=='roll')return;busy=true;try{
 const result=R.roll(s,spaces);$('turn').textContent=`🎲 Rolled ${result.dice.join(' + ')}`;
 // Always move through the actual ordered 3D board spaces.
 if(result.steps.length)await three.move(0,result.steps,Q.get('speed')==='instant'?30:115);
 s.selected=s.players[0].pos;three.close(s.selected);
 if(s.phase==='over'){sendCareerResult();finish()}
 redraw();notice(s.log.at(-1)?.message||'Token moved',3000)
 }finally{busy=false;redraw()}}
async function takeEnd(){if(busy||s.phase!=='decide')return;busy=true;
 try{three.overview();$('turn').textContent='⏳ Other players';const movements=R.endTurn(s,spaces);
 if(Q.get('speed')!=='instant')for(const event of movements)if(event?.steps?.length)await three.move(event.player,event.steps,45);
 if(s.phase==='over'){sendCareerResult();finish()}else{s.selected=s.players[0].pos;three.overview();redraw()}
 }finally{busy=false;if(s.phase!=='over')redraw()}}
function finish(){if(!s)return;const results=R.score(s,spaces),champ=s.players[s.winner];
 const box=$('finish');box.innerHTML=`<div class="box"><h2>🏆 ${champ.name} Wins!</h2><p>Final property and cash ranking</p>${results.map((p,i)=>`<p>${i+1}. ${p.name}: ${money(p.worth)}</p>`).join('')}<button id="newMatch">Start another match</button> ${career?'<button id="returnCareer">Return to Skyline Estates</button>':''} <button id="exitResults">Close</button></div>`;
 box.hidden=false;box.querySelector('#newMatch').onclick=()=>{localStorage.removeItem(saveKey);location.reload()};box.querySelector('#exitResults').onclick=()=>box.hidden=true;
 sendCareerResult();
 const returnButton=box.querySelector('#returnCareer');
 if(returnButton)returnButton.onclick=()=>location.assign('./index.html');
}
function tileSelected(id){if(!s||busy)return;s.selected=id;three.choose(id);redraw()}
async function start(state){
 s=state;$('setup').hidden=true;notice('Loading approved 3D board, 3D tokens and buildings…',10000);
 try{three=await createBoard({canvas:$('board'),board,source,base,quality:Q.get('quality')||'high',onSelect:tileSelected});
   window.__skylineApproved={state:()=>s,renderer:()=>three,spaces,board,source,roll:takeRoll,endTurn:takeEnd,select:tileSelected};
   if(s.selected!==0)three.choose(s.selected);three.overview();redraw();notice('Tap a tile or roll the dice to begin.',3200)
 }catch(error){console.error(error);$('setup').hidden=false;notice('Could not load the approved GLB board: '+error.message,14000);throw error}
}
$('start').onclick=()=>start(R.createMatch(board,source,{length:$('length').value,seed:Number(Q.get('seed'))||Date.now()%1e9,career}));
$('resume').onclick=()=>{const st=getSaved();if(st)start(st);else notice('No compatible saved match')};
$('whole').onclick=()=>{if(three){three.overview();redraw()}};
$('close').onclick=()=>{if(three){three.close(s.selected);redraw()}};
$('more').onclick=()=>{const open=$('detailsDrawer').hidden;$('detailsDrawer').hidden=!open;$('more').setAttribute('aria-expanded',String(open))};
$('closeDetails').onclick=()=>{$('detailsDrawer').hidden=true;$('more').setAttribute('aria-expanded','false')};
try{await fetchAssets();const saved=getSaved();$('resume').hidden=!saved;if(saved)$('resume').textContent=`Resume round ${saved.round}`;
 if(Q.get('autostart')==='1')start(saved||R.createMatch(board,source,{length:$('length').value,seed:Number(Q.get('seed'))||20261121,career}));
}catch(error){console.error(error);notice('Approved board data unavailable: '+error.message,14000);$('setupDesc').textContent=error.message;$('start').disabled=true}
