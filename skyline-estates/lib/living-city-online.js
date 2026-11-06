/* Living City online rooms (casual, rule version 2) — client for the authoritative server (competition /v3/lc/*).
   The app never runs the rules for these rooms: it renders the server's game state and answers only the decision the
   server is waiting for (dice, cash and outcomes come from the server). Capability negotiation: the app declares
   {rules:[1,2],lc:1}; the room option appears only while the server flag says livingCity.online. Classic online is
   unchanged. Local saves are never touched by an online room. UI-only: loads after living-city.js. */
(()=>{
const SVC=(window.SKYLINE_COMPETITION&&window.SKYLINE_COMPETITION.service)||'https://europe-west1-eko-estates.cloudfunctions.net/skylineCompetition';
const CLIENT={rules:[1,2],lc:1},POLL_MS=1500;
const S={cur:0,code:null,view:null,shownKey:null,pending:false,poll:0,queue:Promise.resolve(),cap:null,capAt:-1e12,epoch:0};
const T=k=>({'living-city-online-disabled':'Living City rooms are switched off right now. Try classic online.','client-upgrade-required':'Update Skyline Estates to join Living City rooms.',
  'room-not-found':'No Living City room with that code.','already-started':'That room has already started.','room-full':'That room is full.','not-a-member':'You are not in that room.',
  'host-only':'Only the host can start the game.','invalid-seat-count':'A room needs 2 to 4 players.','stale-revision':'The game moved on. Updating…','not-your-decision':'It is not your move.',
  'illegal-asset-action':'That building or mortgage move is not allowed right now.','invalid-answer':'That move is not allowed.','sign-in':'Sign in or connect to the internet to play online.'}[k]||'Couldn’t reach the online service. Try again.');
async function idToken(){
  try{const A=window.SkylineAccounts;if(A&&(typeof A.enabled!=='function'||A.enabled())){const pl=await A.player();if(pl&&pl.token)return pl.token}}catch(e){}
  if(typeof FIRE!=='undefined'&&FIRE){try{const t=await FIRE.token();if(t)return t}catch(e){}}
  const e=Error('sign-in');e.code='sign-in';throw e}
async function api(path,body){const tok=await idToken();let r;
  try{r=await fetch(SVC+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+tok},body:JSON.stringify(body)})}catch(x){const e=Error('network');e.code='network';throw e}
  let j=null;try{j=await r.json()}catch(x){}if(!r.ok){const e=Error((j&&j.error)||'http-'+r.status);e.code=(j&&j.error)||'http';e.status=r.status;throw e}return j}
async function available(){if(Date.now()-S.capAt<60000)return S.cap;
  try{const ac=new AbortController(),to=setTimeout(()=>ac.abort(),3500);const r=await fetch(SVC+'/v1/competition/capabilities',{signal:ac.signal});clearTimeout(to);const j=await r.json();const L=j&&j.rulesets&&j.rulesets.livingCity;S.cap=!!(L&&L.online===true&&L.ranked!==true&&(L.minClient||1)<=CLIENT.lc)}catch(e){S.cap=false}
  S.capAt=Date.now();return S.cap}
const live=()=>typeof G!=='undefined'&&G&&G.lcNet;
/* ---------- local-state protection: an online room never touches saves, and only your seat is "local" ---------- */
{const _s=save;save=function(){if(live())return false;return _s.apply(this,arguments)}}
{const _c=clearSave;clearSave=function(){if(live())return false;return _c.apply(this,arguments)}}
{const _h=isLocalHuman;isLocalHuman=function(p){if(live())return !!p&&!p.ai&&p.id===G.lcMe;return _h.apply(this,arguments)}}
{const _t=openTrade;openTrade=async function(p){if(live()){toast('Trades aren’t available in Living City online rooms yet.');return}return _t.apply(this,arguments)}}
/* Building, selling and mortgages are shown at once, then sent to the server, which re-checks and replays them. */
const myActions=()=>S.view&&S.view.decision&&S.view.decision.type==='actions';
for(const [fn,kind] of [['build','build'],['sell','sell'],['mortgage','mortgage'],['unmortgage','redeem']]){const orig=window[fn];
  window[fn]=function(pid,i){if(!live())return orig.apply(this,arguments);
    if(!myActions()||pid!==G.lcMe){toast('You can manage properties on your turn.');return}
    const r=orig.apply(this,arguments);send({assets:[{kind,square:i}]},true);return r}}
/* ---------- rendering server state ---------- */
function adopt(view){const g=view.G;g.lcNet={code:S.code};g.lcMe=view.me;g.online=false;return g}
async function show(view,first){
  const old=G,g=adopt(view);
  if(first||!old||!old.lcNet||old.players.length!==g.players.length||!tok3.length){
    GEN++;netStop();G=g;applyTheme(G.set.city||G.set.theme||'lagos');try{applyDiceSkin()}catch(e){}$('#title').hidden=true;$('#ui').hidden=false;$('#modals').innerHTML='';
    buildBoard();renderRoster();$('#log').textContent=(G.log&&G.log[0])||'';camOverview(P(G.turn).pos,0);checkRotate();try{window.SkylineLivingCity3D.all()}catch(e){}updateTools();return}
  G=g;renderRoster();
  try{if(g.lastDice&&(!old.lastDice||g.lastDice.n!==old.lastDice.n)){const dd=[g.lastDice.a,g.lastDice.b];if(g.lastDice.sv){dd.sv=g.lastDice.sv;dd.s=SPEED_FACE(dd.sv)}await throwDice(dd)}
    for(const p of G.players){const op=old.players[p.id];if(!op||(op.pos===p.pos&&op.inJail===p.inJail))continue;const steps=(p.pos-op.pos+40)%40;
      if((p.inJail&&!op.inJail)||steps>12||steps===0)await placeToken(p,true);
      else{const fin=p.pos;for(let k=1;k<=steps;k++){p.pos=(op.pos+k)%40;await hopTo(p)}p.pos=fin;await settleToken(p);highlight(fin)}
      if(G!==g)return}}catch(e){}
  SQ.forEach((_,i)=>{const a=old.own[i],b=G.own[i];if(a.o!==b.o||a.h!==b.h||a.m!==b.m)updateCell(i,true)});
  G.players.forEach(p=>{const op=old.players[p.id];if(op&&op.cash!==p.cash)float(p.id,p.cash-op.cash)});
  if((g.logN||0)!==(old.logN||0)&&g.log&&g.log[0]){$('#log').textContent=g.log[0];toast(g.log[0])}
  if(old.turn!==g.turn&&!g.over){camOverview(P(G.turn).pos,700);banner(P(G.turn)).catch(()=>{})}
  try{window.SkylineLivingCity3D.all()}catch(e){}renderRoster();updateTools()}
/* ---------- decisions ---------- */
const keyOf=d=>d?d.type+':'+d.pid+':'+JSON.stringify(d.options):null;
function cancelPrompt(){if(!S.pending)return;S.pending=false;S.cur++;GEN++;$('#acts').innerHTML='';$('#modals').innerHTML=''}
async function present(d){const o=d.options||{},p=P(d.pid),ui=o.ui||{};
  if(d.type==='actions')return actions(ui.text||'Your move.',(ui.btns||o.keys.map(k=>({k,label:k}))).filter(b=>!b.disabled||o.keys.includes(b.k)));
  if(d.type==='modal')return modal({cls:ui.cls||o.cls||'',html:ui.html||'<div class="mh">Your move</div>',btns:ui.btns||o.keys.map(k=>({k,label:k}))});
  if(d.type==='bid'){const btns=[{k:0,label:'Drop out',danger:true},...[10,50,100].filter(x=>o.bid+x<=o.max).map((x,j)=>({k:o.bid+x,label:'Bid '+fmt(o.bid+x),primary:j===0}))];
    const v=await modal({cls:'wide',html:`<div class="mh">Auction: your bid</div><div class="row2">${deedHTML(o.square)}<div class="slotbar sidecol"><div class="mtxt">Highest bid: <b>${o.bid?fmt(o.bid):'none yet'}</b>.<br>Your cash: <b>${fmt(o.max)}</b>.</div></div></div>`,btns});return +v||0}
  if(d.type==='trade'){const t=o.trade;const v=await modal({cls:'wide',html:`<div class="mh">${esc(P(t.from).name)} offers you a deal</div>${tradeSummary(t)}`,btns:[{k:'no',label:'Decline'},{k:'yes',label:'Accept deal',primary:true}]});return v==='yes'}
  if(d.type.startsWith('lc:'))return LCUI.decide(d.type.slice(3),p,o.spec||{});
  throw Error('unknown decision '+d.type)}
async function pump(){const v=S.view;if(!v||!live())return;
  if(v.over){stopLoop();cancelPrompt();forget();G.over=true;setPrompt('Game over.');$('#acts').innerHTML='';try{await finish()}catch(e){}return}
  const d=v.decision,k=keyOf(d);
  if(!d){S.shownKey=null;cancelPrompt();const w=v.waitingFor!=null&&P(v.waitingFor);setPrompt(w?`Waiting for <b>${esc(w.name)}</b>…`:'Waiting…');$('#acts').innerHTML='';startLoop();return}
  stopLoop();if(k===S.shownKey&&S.pending)return;cancelPrompt();S.shownKey=k;S.pending=true;const id=++S.cur;
  let ans;try{ans=await present(d)}catch(e){if(S.cur===id){S.pending=false;S.shownKey=null;setTimeout(pump,50)}return}
  if(S.cur!==id||!S.pending)return;S.pending=false;S.shownKey=null;send({value:ans})}
function send(answer,keepPrompt){const ep=S.epoch;
  S.queue=S.queue.then(async()=>{if(ep!==S.epoch||!S.view)return;
    try{const r=await api('/v3/lc/act',{code:S.code,revision:S.view.revision,answer});if(ep!==S.epoch)return;S.view=r.game;await show(r.game,false)}
    catch(e){toast(T(e.code));await refresh(ep);return}
    if(!keepPrompt)S.shownKey=null;pump()}).catch(()=>{})}
async function refresh(ep=S.epoch){try{const r=await api('/v3/lc/state',{code:S.code});if(ep!==S.epoch||!r.game)return;const changed=!S.view||r.game.revision!==S.view.revision;S.view=r.game;if(changed){await show(r.game,false);pump()}}catch(e){}}
function startLoop(){if(S.poll)return;const ep=S.epoch;S.poll=setInterval(()=>{if(!live()||ep!==S.epoch){stopLoop();return}if(!document.hidden)S.queue=S.queue.then(()=>refresh(ep))},POLL_MS)}
function stopLoop(){if(S.poll){clearInterval(S.poll);S.poll=0}}
addEventListener('visibilitychange',()=>{if(!document.hidden&&live())S.queue=S.queue.then(()=>refresh())});
const remember=code=>{PREF.lcRoom={code,at:Date.now()};savePref()},forget=()=>{if(PREF.lcRoom){delete PREF.lcRoom;savePref()}};
async function enter(code,view){S.epoch++;stopLoop();S.code=code;S.view=view;S.shownKey=null;S.pending=false;S.queue=Promise.resolve();remember(code);await show(view,true);pump()}
{const _st=showTitle;showTitle=function(){S.epoch++;stopLoop();S.view=null;S.pending=false;return _st.apply(this,arguments)}}
/* ---------- rooms: menu and lobby ---------- */
async function lobby(code,first){let room=first,timer=0;
  const k=await modal({cls:'wide',html:`<div class="mh">Living City room <b>${esc(code)}</b></div><div class="mtxt muted">New rules: Strategic Events, Civic Review, building stages and Landmarks. Casual play — no ranked results.</div><div class="ollist" id="lcSeats"></div><div class="mtxt" id="lcHost"></div><div class="mtxt muted" id="lcErr"></div>`,
    btns:[{k:'x',label:'Leave'}],onMount:(pn,close)=>{
      const draw=()=>{pn.querySelector('#lcSeats').innerHTML=room.seats.map(s=>`<div class="olitem"><b>${esc(s.name)}</b><span>${s.you?'You':s.ai?'Computer':'Player'}</span></div>`).join('');
        const H=pn.querySelector('#lcHost');if(!room.host){H.textContent=`Share code ${code}. Waiting for the host to start…`;return}if(H.dataset.on)return;H.dataset.on=1;
        H.innerHTML=`<div class="olrow"><label>Computer players <select id="lcAi"><option>0</option><option selected>1</option><option>2</option></select></label><label>Mode <select id="lcMode"><option value="timed20">20 rounds</option><option value="timed10">10 rounds</option><option value="classic">Last landlord standing</option></select></label></div><button class="btn pri" id="lcStart">Start game</button>`;
        H.querySelector('#lcStart').onclick=async()=>{const ai=+H.querySelector('#lcAi').value,m=H.querySelector('#lcMode').value;
          try{const r=await api('/v3/lc/start',{code,ai,mode:m==='classic'?'classic':'timed',rounds:m==='timed10'?10:20});clearInterval(timer);close('go');enter(code,r.game)}catch(e){pn.querySelector('#lcErr').textContent=T(e.code)}}};
      draw();timer=setInterval(async()=>{if(!pn.isConnected){clearInterval(timer);return}try{const r=await api('/v3/lc/state',{code});room=r;draw();if(r.status!=='lobby'&&r.game){clearInterval(timer);close('go');enter(code,r.game)}}catch(e){}},2000)}}).catch(()=>'go');
  clearInterval(timer);return k}
async function join(code){try{const r=await api('/v3/lc/state',{code}).catch(()=>null);
    if(r&&r.status!=='lobby'&&r.game){if(r.game.over){forget();toast('That game has finished.');return}return enter(code,r.game)}
    const j=r&&r.status==='lobby'?r:await api('/v3/lc/join',{code,name:cleanName(myName()||PREF.nick||'Player'),client:CLIENT});return lobby(code,j)}
  catch(e){if(e.code==='not-a-member'||e.code==='room-not-found')forget();toast(T(e.code))}}
async function menu(){const last=PREF.lcRoom&&Date.now()-PREF.lcRoom.at<2*864e5?PREF.lcRoom.code:null;
  const k=await modal({cls:'wide',html:`<div class="mh">Living City online</div><div class="mtxt muted">Play the new rules with friends. The server runs the game, so every move is checked. Casual only.</div>
    <div class="olgrid"><div class="olcard"><h4>Host a room</h4><div class="mtxt muted">You choose computer players and mode before starting.</div><button class="btn pri" id="lcNew">Create room</button></div>
    <div class="olcard"><h4>Join a room</h4><div class="olrow"><input id="lcCode" maxlength="5" placeholder="Code" aria-label="Room code" autocapitalize="characters"><button class="btn" id="lcJoin">Join</button></div>${last?`<h4>Your last room</h4><div class="olrow"><b>${esc(last)}</b><button class="btn" id="lcRe">Rejoin</button></div>`:''}<div class="mtxt muted" id="lcErr"></div></div></div>`,
    btns:[{k:'x',label:'Close'}],onMount:(pn,close)=>{const err=pn.querySelector('#lcErr');
      const need=()=>{if((myName()||'').trim())return true;err.textContent='Set your player name in Play online first.';return false};
      pn.querySelector('#lcNew').onclick=async()=>{if(!need())return;try{const r=await api('/v3/lc/create',{name:cleanName(myName()),city:setup.city,client:CLIENT});close('x');remember(r.code);lobby(r.code,r)}catch(e){err.textContent=T(e.code)}};
      pn.querySelector('#lcJoin').onclick=()=>{const c=(pn.querySelector('#lcCode').value||'').trim().toUpperCase();if(!/^[A-Z0-9]{5}$/.test(c)){err.textContent='Enter the 5-character room code.';return}if(!need())return;close('x');join(c)};
      const re=pn.querySelector('#lcRe');if(re)re.onclick=()=>{close('x');join(last)}}});
  return k}
{const _oo=openOnline;openOnline=async function(pre){if(!pre&&await available()){
    const k=await modal({html:`<div class="mh">Play online</div><div class="mtxt">Choose the rules for your online room.</div><ul class="lc-ch"><li><b>Classic</b><span>The online rooms you know.</span></li><li><b>Living City</b><span>New rules, checked by the server. Casual only.</span></li></ul>`,
      btns:[{k:'classic',label:'Classic rooms'},{k:'lc',label:'Living City rooms',primary:true},{k:'x',label:'Close'}]});
    if(k==='lc')return menu().catch(()=>{});if(k!=='classic')return}
  return _oo.apply(this,arguments)}}
window.SkylineLivingCityOnline={version:1,client:CLIENT,available,join,menu,_state:S};
})();
