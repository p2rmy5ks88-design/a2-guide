/* Tutorial and rules v2 (owner-approved mockups, 11 Nov 2026).
   - The tour (welcome and Menu › How to play) is 4 slides that match today's game: how a Championship is won,
     roll and buy or auction, growing streets (Living City stages and Landmarks) and the living city.
     Classic-rules players (Living City off) get the classic wording for slides 3 and 4.
   - A one-time Home walkthrough (3 tips) after the welcome tour, for new players only.
   - A first-time intro for Skyline Duel and Harbour Ring, with "Don't show this again".
   - How to play becomes a rules hub: Standard match, Skyline Duel, Harbour Ring, Online and classic rules, Coach and tips.
   Presentation only: no rules, saves, prices or rewards change. Real game art, no emoji. */
(()=>{'use strict';
if(window.SkylineTutorialV2)return;
const LCON=()=>{try{return typeof PREF==='object'&&PREF.lc!==false}catch(e){return true}};
const tap=()=>{try{sfx('tap')}catch(e){}};
const E=s=>(typeof esc==='function'?esc(s):String(s));
const ICON=n=>`<img class="tv2-ic" src="living/icons/128/${n}.png" alt="" width="40" height="40" decoding="async">`;
const BELL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* ---------- 2. The 4-slide tour ---------- */
const scoreVis=()=>`<div class="tv2-vis tv2-score"><small>CHAMPIONSHIP SCORE</small>${[['Cash',46,'#9fd3ff'],['Streets',62,'#8fe0b0'],['Buildings',80,'#f2c457'],['Districts',26,'#ffb07a'],['Landmarks',18,'#e8a1ff']].map(([n,w,c])=>`<div class="tv2-bar"><span>${n}</span><i style="width:${w}%;background:${c}"></i></div>`).join('')}<div class="tv2-bell">${BELL}<span>Final Bell: the last 5 rounds</span></div></div>`;
const buyVis=()=>`<div class="tv2-vis tv2-buy"><img src="art/hd-dice.png" alt="" class="tv2-dice" decoding="async"><div class="tv2-deed"><i></i><b>${E((typeof SQ==='object'&&SQ[39]&&SQ[39].n)||'Harbour Drive')}</b><small>For sale</small><div><span>Buy</span><span>Auction</span></div></div></div>`;
const growVis=()=>LCON()?`<div class="tv2-vis tv2-grow"><div class="tv2-stages">${[['Plot',4],['Low',22],['Mid',40],['High',60],['Sky',86]].map(([n,h],k)=>`<span><i style="height:${h}px${k===0?';background:#6b7a9a;box-shadow:none':''}${k===4?';width:24px':''}"></i>${n}</span>`).join('')}</div><div class="tv2-lm">${ICON('landmark')}<span>Only a Landmark becomes a Skyscraper</span></div></div>`
  :`<div class="tv2-vis tv2-grow"><div class="tv2-stages">${[['1',20],['2',32],['3',44],['4',56],['Tower',86]].map(([n,h],k)=>`<span><i style="height:${h}px${k===4?';width:24px':''}"></i>${n}</span>`).join('')}</div></div>`;
const cityVis=()=>LCON()?`<div class="tv2-vis tv2-city">${[['festival','City Events','One district changes every 3 rounds'],['civic_review','Civic Review','Pay, use a Bail Pass or wait a turn'],['investment','City corners','Bonuses, grants and shortcuts']].map(([i,b,s])=>`<div class="tv2-row">${ICON(i)}<span><b>${b}</b><small>${s}</small></span></div>`).join('')}</div>`
  :`<div class="tv2-vis tv2-city">${[['city_cash','Cards','Lucky Break and City Hall'],['planning_hold','Lockup','Pay bail or roll doubles'],['investment','Short of cash','Trade, mortgage or sell']].map(([i,b,s])=>`<div class="tv2-row">${ICON(i)}<span><b>${b}</b><small>${s}</small></span></div>`).join('')}</div>`;
tutSteps=function(){const lc=LCON();return[
  {k:'goal',vis:scoreVis(),h:'How you win',p:'Play Solo is a 30-round Championship against the computer. When the last round ends, the highest Championship Score wins: your cash plus everything you own and have built. Push everyone else into bankruptcy and you win early.'},
  {k:'roll',vis:buyVis(),h:'Roll, buy or bid',p:'Tap Roll and move round the board. Every time you pass START you collect your salary. Land on a street nobody owns and you can buy it; pass, and it goes to auction. When rivals land on your streets, they pay you rent.'},
  {k:'build',vis:growVis(),h:'Grow your streets',p:lc?'Own two or more streets in a district and their rent rises. Own the whole district to build Low-rise, Mid-rise, then High-rise; every stage raises the rent a lot. Name one street as the Landmark: it earns more and is the only street that can become a Skyscraper.'
    :'Own every street of one colour and the rent doubles. Then build houses evenly, and a tower after four houses. Every building raises the rent a lot. This is how games are won.'},
  {k:'city',vis:cityVis(),h:lc?'A living city':'Cards, Lockup and cash',p:lc?'The city changes as you play: festivals raise rents and booms make building cheaper. There is no jail: a Civic Review can pause your rent instead. You get a short tip the first time each of these happens. Short of cash? Trade, mortgage or sell buildings.'
    :'Lucky Break and City Hall squares draw a card. Police Check sends you to the Lockup: pay bail or roll doubles. Short of cash? Trade, mortgage a street for half its price or sell buildings.'}]};
// The welcome tour ends on "Play my first game"; then the Home tips run once.
{const _ot=openTutorial;openTutorial=async function(fromWelcome){const r=await _ot.apply(this,arguments);try{if(fromWelcome&&!PREF.homeTour){PREF.homeTourPending=1;savePref()}}catch(e){}return r}}

/* ---------- 3. Coach tips in Living City wording ---------- */
try{const lock=COACH.find(c=>c.id==='lockup');if(lock){const t=lock.t;Object.defineProperty(lock,'t',{get:()=>LCON()?'Under <b>Civic Review</b>: you collect no rent until it ends. On your next turn pay a Fast-Track Permit, use a Bail Pass, or take a Standard Review.':t,configurable:true})}
  const bld=COACH.find(c=>c.id==='build');if(bld){const t=bld.t;Object.defineProperty(bld,'t',{get:()=>LCON()?'You own a whole district! Open <b>Portfolio</b> to build: Low-rise, Mid-rise, High-rise. Name a Landmark to reach Skyscraper.':t,configurable:true})}}catch(e){}

/* ---------- 4. Home walkthrough (3 tips, once) ---------- */
const HOME_TIPS=[
  {sel:'#tCont,#qAI',h:'Start here',p:'Play Solo starts a 30-round Championship against the computer. Leave a match and this button becomes Continue Match.'},
  {sel:'#hdModes',h:'More ways to play',p:'Game Modes has Pass &amp; Play on one phone, Play Online with friends, Custom Game, Skyline Duel and Harbour Ring.'},
  {sel:'#hdSpot,#qSeason',h:'Weekly goals and your city',p:'The card shows this week’s City Spotlight or season. The bar at the bottom opens your Portfolio, Collection, Shop, Awards and Progress.'}];
let tipEl=null;
function homeTour(force){try{if(!force&&(!PREF.homeTourPending||PREF.homeTour))return;const t=document.getElementById('title');if(!t||t.hidden||setup.tab!=='play'||document.querySelector('#modals .ov')||document.getElementById('hr'))return;
  let k=0;const end=()=>{PREF.homeTour=Date.now();PREF.homeTourPending=0;try{savePref()}catch(e){}if(tipEl){tipEl.remove();tipEl=null}};
  const show=()=>{const S=HOME_TIPS[k],target=[...document.querySelectorAll(S.sel)].find(x=>x.getClientRects().length);if(!target){if(++k<HOME_TIPS.length)return show();return end()}
    const r=target.getBoundingClientRect(),pad=8;if(tipEl)tipEl.remove();tipEl=document.createElement('div');tipEl.className='tv2-tour';
    const right=r.left+r.width/2<innerWidth/2,bw=Math.min(300,innerWidth-32);
    const left=right?Math.min(innerWidth-bw-16,r.right+20):Math.max(16,r.left-bw-20),top=Math.max(12,Math.min(innerHeight-200,r.top+r.height/2-70));
    tipEl.innerHTML=`<div class="tv2-hole" style="left:${r.left-pad}px;top:${r.top-pad}px;width:${r.width+pad*2}px;height:${r.height+pad*2}px"></div>
      <div class="tv2-tip" role="dialog" aria-label="Tip ${k+1} of ${HOME_TIPS.length}" style="left:${left}px;top:${top}px;width:${bw}px"><small>TIP ${k+1} OF ${HOME_TIPS.length}</small><b>${S.h}</b><p>${S.p}</p>
      <div><button type="button" class="tv2-b" data-t="skip">Skip tips</button><button type="button" class="tv2-b g" data-t="next">${k<HOME_TIPS.length-1?'Next':'Got it'}</button></div></div>`;
    document.body.append(tipEl);
    {const tip=tipEl.querySelector('.tv2-tip'),h=tip.getBoundingClientRect().height;tip.style.top=Math.max(8,Math.min(innerHeight-h-8,r.top+r.height/2-h/2))+'px'}
    tipEl.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(!b){return}tap();if(b.dataset.t==='skip')return end();if(++k<HOME_TIPS.length)show();else end()});
    tipEl.querySelector('[data-t="next"]').focus({preventScroll:true})};
  show()}catch(e){}}
{const _ht=homeTab;homeTab=function(k){const r=_ht.apply(this,arguments);try{if(tipEl&&setup.tab!=='play'){tipEl.remove();tipEl=null}if(setup.tab==='play')setTimeout(()=>homeTour(false),450)}catch(e){}return r}}
addEventListener('resize',()=>{if(tipEl){tipEl.remove();tipEl=null;setTimeout(()=>homeTour(false),200)}});

/* ---------- 5. First-time intros for Skyline Duel and Harbour Ring ---------- */
const MI={
  duel:{key:'skylineIntroDuel',title:'Skyline Duel',tag:'1 VS 1 · 15 ROUNDS',art:'art/hd-pawns.png',cards:[
    ['Six streets dealt','Each of you starts with three streets of about the same value and the same cash.'],
    ['No trades','Every street you add comes from the board: buy it, win it at auction or build on what you have.'],
    ['15 rounds','After round 15 the highest Championship Score wins. The Final Bell rings for the last five rounds.']]},
  ring:{key:'skylineIntroRing',title:'Harbour Ring',tag:'NEW BOARD · 1 VS 1 · 15 ROUNDS',art:'art/ring-icon.png',cards:[
    ['Choose your move','Roll two dice, then move by either die or the total. The tiles you can reach light up.'],
    ['Bids and takeovers','Pass on a street and both of you bid in secret. Land on a lone rival street to offer 1.5× its price; they take it or pay to block.'],
    ['8 cities every match','Each district is two real streets from a city in the game. Own both to build; the richest after round 15 wins.']]}};
function modeIntro(kind){const M=MI[kind];if(LS.get(M.key)==='1')return Promise.resolve('play');
  return modal({cls:'tv2-intro',html:`<div class="tv2-ih"><img src="${M.art}" alt="" width="52" height="52"><div><small>${M.tag}</small><b>${M.title}</b></div></div>
    <div class="tv2-cards">${M.cards.map(([b,p])=>`<div class="tv2-card"><b>${b}</b><p>${p}</p></div>`).join('')}</div>
    <label class="tv2-never"><input type="checkbox" id="tv2Never"> Don’t show this again</label>`,
    btns:[{k:'rules',label:'Full rules'},{k:'play',label:'Play',primary:true}],
    onMount:pn=>{const c=pn.querySelector('#tv2Never');if(c)c.onchange=()=>LS.set(M.key,c.checked?'1':'0')}}).then(k=>{if(k==='rules'){setup.learnTab=kind;homeTab('learn');return 'rules'}return k||'close'})}
function wrapEntry(id,kind){document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#'+id);if(!b||b.dataset.tv2ok)return;if(LS.get(MI[kind].key)==='1')return;
  e.stopImmediatePropagation();e.preventDefault();modeIntro(kind).then(k=>{if(k==='play'){b.dataset.tv2ok='1';b.click();delete b.dataset.tv2ok}})},true)}
wrapEntry('qDuel','duel');wrapEntry('qRing','ring');

/* ---------- 6. How to play: the rules hub ---------- */
const fmtM=n=>{try{return loc(`{m${n}}`)}catch(e){return 'SC '+n+'M'}};
function rulesFor(tab){const lc=LCON();switch(tab){
  case 'duel':return['Skyline Duel','1 vs 1 · offline against the computer, ranked online when it is on',[
    ['The deal','Six streets are dealt at the start, three each, split so both sides are worth about the same. Both players start on the same cash.'],
    ['No trades','Trading is off. Streets come from the board, auctions and your own building.'],
    ['Length','15 rounds. The highest Championship Score wins; the Final Bell covers the last five rounds.'],
    ['Ranked','Online ranked Duels use a skill rating and seasons. A turn has 25 seconds; if it runs out, the game plays it for you.']]];
  case 'ring':return['Harbour Ring','New board · 1 vs computer · preview',[
    ['The board','24 spaces: 8 districts of two real streets from 8 different cities, 4 corners and 4 special spaces. The cities change every match.'],
    ['Your move','Roll two dice and move by either die or the total. Salary is paid for every full lap from your own start.'],
    ['Buying','Buy the street, or pass and both players bid in secret. Higher bid wins; a tie means no sale.'],
    ['Takeovers','Land on a lone rival street to offer 1.5× its price. The owner takes the money, or pays half the price to block and lock it for 3 rounds. Complete districts are protected.'],
    ['Corners','Payday, Permit Office (free build), Exchange (swap a street, paying the gap), Rush Hour (your rents +50% until your next turn). Specials: Ferry, Port Tax, City Events.'],
    ['Winning','After round 15, the most net worth wins; each tower adds a bonus. The Final Bell raises rents for the last three rounds.']]];
  case 'classic':return['Online and classic rules','Online rooms, and offline games with Living City turned off',[
    ['The goal','Classic mode: be the last landlord standing. Round Limit: the richest after the set rounds wins. Quick Deal: everyone starts with two streets.'],
    ['Full colour sets','Own every street of one colour and the rent doubles. Build houses evenly, then a tower after four houses.'],
    ['Cards and Lockup','Lucky Break and City Hall draw cards. Police Check sends you to the Lockup: pay bail or roll doubles to get out.'],
    ['Online rooms','Share a short room code. Online games always use the classic rules.']]];
  case 'coach':return['Coach and tips','Help while you play',[
    ['Skyline Coach','An optional voice that calls out purchases, cards and city events. Off by default; turn it on in Settings.'],
    ['Tips','Short tips appear the first time something happens in your first games. Skip them any time, or replay them here.'],
    ['The tour','Replay the 4-slide tour from the button below.']]];
  default:return['Standard match',lc?'Play Solo, Pass & Play and Custom · Living City rules':'Play Solo, Pass & Play and Custom · classic rules',lc?[
    ['Winning','Play Solo is a 30-round Championship: the highest Championship Score after the last round wins (cash, streets, buildings, full-district and Landmark bonuses). The Final Bell marks the last five rounds. Bankrupt everyone else to win early.'],
    ['Your turn','Roll two dice and move. Passing START pays your salary. Buy an unowned street or send it to auction.'],
    ['Districts','Two or more streets in a district: +15% rent. The whole district: build Low-rise, Mid-rise, High-rise, and name one Landmark, the only street that can become a Skyscraper.'],
    ['Living city','From round 3, a City Event every 3 rounds changes one district. Civic Review replaces the Lockup: pay a Fast-Track Permit, use a Bail Pass, or skip a turn. Corners give bonuses, grants and shortcuts.'],
    ['Short of cash','Trade, mortgage a street for half its price, or sell buildings for half back. If you still can’t pay, you’re out.']]:[
    ['Winning','Play Solo is a 30-round Championship: the highest Championship Score wins. Bankrupt everyone else to win early.'],
    ['Your turn','Roll two dice and move. Passing START pays your salary; doubles roll again. Buy an unowned street or send it to auction.'],
    ['Full colour sets','Own every street of one colour and the rent doubles. Build houses evenly, then a tower after four houses.'],
    ['Cards and Lockup','Lucky Break and City Hall draw cards. Police Check sends you to the Lockup: pay bail or roll doubles.'],
    ['Short of cash','Trade, mortgage a street for half its price, or sell buildings for half back.']]]}}
const TABS=[['standard','Standard match'],['duel','Skyline Duel'],['ring','Harbour Ring'],['classic','Online and classic rules'],['coach','Coach and tips']];
paneLearn=function(T){const tab=TABS.some(t=>t[0]===setup.learnTab)?setup.learnTab:'standard';const [h,sub,rows]=rulesFor(tab);
  T.innerHTML=`<div class="tv2-hub"><nav class="tv2-nav" aria-label="Rules" role="tablist">${TABS.map(([k,l])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?'on':''}" data-lt="${k}">${l}</button>`).join('')}
      <div class="tv2-sp"></div><button type="button" class="tv2-b g" id="lTut">Replay the tour</button><button type="button" class="tv2-b" id="lTips">Replay tips</button></nav>
    <section class="tv2-body" role="tabpanel" aria-label="${E(h)}"><div class="tv2-bh"><h2>${E(h)}</h2><span>${E(sub)}</span></div>${rows.map(([b,p])=>`<div class="tv2-sec"><b>${E(b)}</b><p>${E(p)}</p></div>`).join('')}</section></div>`;
  T.querySelectorAll('[data-lt]').forEach(b=>b.onclick=()=>{tap();setup.learnTab=b.dataset.lt;paneLearn(T)});
  T.querySelector('#lTut').onclick=()=>{tap();openTutorial(false)};
  T.querySelector('#lTips').onclick=e=>{PREF.coach={};PREF.coachOff=0;PREF.coachReplay=1;try{savePref()}catch(x){}e.target.textContent='Tips are back on';e.target.disabled=true}};

/* ---------- styles ---------- */
const css=`
.tutm{max-width:min(700px,94vw)!important}
.tutm .tin{grid-template-columns:220px minmax(0,1fr);gap:20px;align-items:stretch}
.tutm .ttx h3{font:800 24px/1.1 var(--display,'Outfit',system-ui,sans-serif);margin:6px 0 0}.tutm .ttx p{font:600 13.5px/1.5 var(--body,'Manrope',system-ui,sans-serif)}
.tv2-vis{width:220px;min-height:210px;box-sizing:border-box;border-radius:18px;padding:14px;display:flex;flex-direction:column;justify-content:center;gap:8px;background:radial-gradient(120% 90% at 50% 20%,#2b3e78,#0d1736 70%);color:#fff;box-shadow:inset 0 0 0 1px rgba(242,196,87,.35)}
.tv2-score small{font:800 9.5px/1 var(--body,'Manrope',sans-serif);letter-spacing:.16em;color:#f6e2a8}
.tv2-bar{display:flex;align-items:center;gap:8px;font:700 11px var(--body,'Manrope',sans-serif);color:#dfe6f4}.tv2-bar span{width:62px;flex:none}.tv2-bar i{height:11px;border-radius:6px}
.tv2-bell{display:flex;align-items:center;gap:8px;margin-top:4px;padding:7px 9px;border-radius:12px;background:rgba(255,90,95,.15);border:1px solid rgba(255,90,95,.45);font:700 11px/1.2 var(--body,'Manrope',sans-serif);color:#ffd6d8}.tv2-bell svg{width:18px;height:18px;flex:none;color:#ff9da0}
.tv2-buy{align-items:center}.tv2-dice{width:140px;height:96px;object-fit:contain}
.tv2-deed{width:160px;border-radius:12px;overflow:hidden;background:#fdf8ec;color:#13284a;box-shadow:0 8px 20px rgba(0,0,0,.4);display:flex;flex-direction:column}
.tv2-deed>i{height:18px;background:#2f80ed}.tv2-deed b{padding:7px 10px 0;font:800 13px var(--display,'Outfit',sans-serif)}.tv2-deed small{padding:2px 10px 7px;font:700 11px var(--body,'Manrope',sans-serif);color:#4a5874}
.tv2-deed div{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #e3e8f0}.tv2-deed div span{padding:6px 0;text-align:center;font:800 11px var(--body,'Manrope',sans-serif);color:#8a5a10}.tv2-deed div span+span{color:#4a5874;border-left:1px solid #e3e8f0}
.tv2-grow{align-items:center;gap:14px}.tv2-stages{display:flex;align-items:flex-end;gap:7px;height:110px}
.tv2-stages span{display:flex;flex-direction:column;align-items:center;gap:4px;font:700 9.5px/1 var(--body,'Manrope',sans-serif);color:#dfe6f4}
.tv2-stages i{display:block;width:20px;border-radius:3px 3px 0 0;background:repeating-linear-gradient(180deg,transparent 0 4px,rgba(255,255,255,.5) 4px 6px),linear-gradient(180deg,#ffe7a3,#a8721f);box-shadow:0 0 10px rgba(242,196,87,.45)}
.tv2-lm{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:12px;background:rgba(242,196,87,.12);border:1px solid rgba(242,196,87,.45);font:700 11px/1.25 var(--body,'Manrope',sans-serif);color:#f6e2a8}
.tv2-ic{width:36px;height:36px;object-fit:contain;flex:none}
.tv2-city{gap:7px}.tv2-row{display:flex;align-items:center;gap:9px;padding:7px 9px;border-radius:12px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)}
.tv2-row b{display:block;font:800 12px/1.2 var(--display,'Outfit',sans-serif)}.tv2-row small{font:600 10.5px/1.3 var(--body,'Manrope',sans-serif);color:#c9d3e6}
@media (max-width:620px){.tutm .tin{grid-template-columns:1fr}.tv2-vis{width:100%;min-height:0}}
.tv2-tour{position:fixed;inset:0;z-index:9500;pointer-events:none}
.tv2-hole{position:fixed;border-radius:28px;box-shadow:0 0 0 3px #fff,0 0 0 4000px rgba(3,6,18,.7),0 0 30px rgba(255,255,255,.45);pointer-events:none}
.tv2-tip{position:fixed;box-sizing:border-box;padding:14px 16px 12px;border-radius:18px;background:linear-gradient(180deg,#121d40,#080e24);border:1.5px solid rgba(242,196,87,.6);box-shadow:0 18px 40px rgba(0,0,0,.6);color:#fff;pointer-events:auto}
.tv2-tip small{font:800 10px/1 var(--body,'Manrope',sans-serif);letter-spacing:.16em;color:#9aa6c2}.tv2-tip b{display:block;margin-top:6px;font:800 17px/1.2 var(--display,'Outfit',sans-serif)}
.tv2-tip p{margin:6px 0 0;font:600 12.5px/1.45 var(--body,'Manrope',sans-serif);color:#dfe6f4}.tv2-tip div{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
.tv2-b{min-height:44px;padding:0 16px;border-radius:22px;border:1.5px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;font:700 13px var(--body,'Manrope',sans-serif);cursor:pointer}
.tv2-b.g{border-color:#fff1b8;background:linear-gradient(180deg,#ffe7a3,#d9a23a);color:#241703;font-weight:800}
.tv2-b:focus-visible,.tv2-nav button:focus-visible{outline:3px solid #fff3c4;outline-offset:2px}
.tv2-intro{max-width:min(720px,94vw)!important}
.tv2-ih{display:flex;align-items:center;gap:12px}.tv2-ih img{width:52px;height:52px;border-radius:14px;object-fit:cover}
.tv2-ih small{display:block;font:800 10px/1 var(--body,'Manrope',sans-serif);letter-spacing:.16em;color:#c9a64e}.tv2-ih b{font:800 22px/1.15 var(--display,'Outfit',sans-serif)}
.tv2-cards{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.tv2-card{padding:12px;border-radius:14px;background:rgba(127,140,170,.12);border:1px solid rgba(127,140,170,.25)}.tv2-card b{font:800 14px/1.2 var(--display,'Outfit',sans-serif)}.tv2-card p{margin:6px 0 0;font:600 12px/1.45 var(--body,'Manrope',sans-serif)}
.tv2-never{display:flex;align-items:center;gap:8px;min-height:44px;margin-top:6px;font:600 12.5px var(--body,'Manrope',sans-serif)}.tv2-never input{width:20px;height:20px;accent-color:#d9a23a}
@media (max-width:620px){.tv2-cards{grid-template-columns:1fr}}
.tv2-hub{display:grid;grid-template-columns:minmax(170px,210px) minmax(0,1fr);gap:16px;min-height:0}
.tv2-nav{display:flex;flex-direction:column;gap:4px}.tv2-nav [role=tab]{min-height:44px;padding:0 12px;border-radius:12px;border:0;background:none;color:inherit;opacity:.85;font:700 13px var(--display,'Outfit',sans-serif);text-align:left;cursor:pointer}
.tv2-nav [role=tab].on{opacity:1;background:rgba(242,196,87,.16);box-shadow:inset 3px 0 0 #f2c457}.tv2-sp{flex:1;min-height:6px}
html.light .tv2-nav .tv2-b:not(.g){color:#13284a;border-color:rgba(19,40,74,.25)}
.tv2-body{min-width:0;padding-left:16px;border-left:1px solid rgba(127,140,170,.25)}
.tv2-bh{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 10px;padding:4px 0 8px}.tv2-bh h2{margin:0;font:800 20px var(--display,'Outfit',sans-serif)}.tv2-bh span{font:600 11.5px var(--body,'Manrope',sans-serif);opacity:.75}
.tv2-sec{display:grid;grid-template-columns:120px minmax(0,1fr);gap:12px;padding:9px 0;border-top:1px solid rgba(127,140,170,.2)}
.tv2-sec b{font:800 12.5px/1.3 var(--display,'Outfit',sans-serif);color:#c9a64e}.tv2-sec p{margin:0;font:600 12.5px/1.5 var(--body,'Manrope',sans-serif)}
@media (max-width:560px){.tv2-hub{grid-template-columns:1fr}.tv2-body{padding-left:0;border-left:0}.tv2-sec{grid-template-columns:1fr;gap:2px}}
`;
const st=document.createElement('style');st.id='tv2-style';st.textContent=css;document.head.append(st);
window.SkylineTutorialV2=Object.freeze({homeTour:()=>homeTour(true),modeIntro,rulesFor});
})();
