/* Skyline Circuit — functional alpha presentation layer (replaceable). Not the final art, camera or HUD: those come
   from the approved ChatGPT design. This layer only proves the rules-to-renderer interface end to end:
   - all ten interaction states (CIRCUIT-RENDERER.md §6), driven by SC.pending/SC.view and the effect stream;
   - deterministic animation: events are replayed visually after the rules have already moved on, so speed,
     skipping or a hidden screen can never change the match;
   - its own save slot (SC.SAVE_KEY) written after every action, and a Career inbox entry at the end;
   - geometry from lib/circuit-screen.js (the same functions the design validators use).
   Replace this file to change the presentation; the rules and the screen checks stay. */
(function(){'use strict';
const SC=window.SkylineCircuit,SS=window.SkylineCircuitScreen;if(!SC||!SS)return;
const $=s=>document.querySelector(s),esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
// Approved V2 player identities (owner decision 17 Nov 2026): colour and shape, never colour alone.
const PLAYERS=[{c:'#FF7A59',shape:'circle'},{c:'#4C7DFF',shape:'square'},{c:'#F8F6EF',shape:'triangle'},{c:'#E055C8',shape:'hex'}],COLORS=PLAYERS.map(p=>p.c),
 DISTRICT_NAMES=['Harbour Quarter','Civic Heights','Verdant Mile','Neon Exchange'],DISTRICT=[{c:'#2c8f86',sym:'●'},{c:'#7a5cc7',sym:'▲'},{c:'#c7703a',sym:'■'},{c:'#3a78c7',sym:'◆'}];
const LEVELS={easy:'Easy · picks routes at random',normal:'Normal · plans its routes',hard:'Hard · plans its routes (same as Normal in this alpha)'};
const LENGTH_TEXT={standard:'Standard · target 300, up to 40 rounds',extended:'Extended · target 480, up to 60 rounds',quick:'Quick · experimental · target 200 · mastery XP only, never unlocks'};
const REASON={'not-owned':'Not yours','max-stage':'Already a Skyscraper','one-stage-per-turn':'Already built this turn','bought-this-turn':'Bought this turn — build next turn',
 'needs-network-2':'Needs 2 connected properties','needs-network-3':'Needs 3 connected properties','needs-network-3-both-rings':'Needs 3 connected properties on both rings','cannot-afford':'Not enough cash'};
const CARD={grant:'City grant: +150',fund:'Development fund: +100',festival:'Festival: +6 influence',inspection:'Inspection: −3 influence',tax:'City tax: 10% of cash',toll:'Toll: −50',repairs:'Repairs: 25 per building stage',rentday:'Rent day: every other player pays you 30'};
const q=new URLSearchParams(location.search);
const opts={speed:q.get('speed')||'normal',camera:q.get('camera')||'top',perf:q.get('perf')==='1',career:q.get('career')==='1',renderer:q.get('renderer')||'3d'};
const reducedMotion=(()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){return false}})();
// 3D renderer (lib/circuit-renderer-3d.js) with the 2D placeholder as fallback when WebGL is unavailable or ?renderer=2d.
let R3=null,R3tried=false,camCur=null;const CINEMATIC={pitch:15,dist:5};
const tokSvg=(i,sz=12)=>{const c=PLAYERS[i].c,sh=PLAYERS[i].shape;const body=sh==='circle'?'<circle cx="6" cy="6" r="5"/>':sh==='square'?'<rect x="1.5" y="1.5" width="9" height="9"/>':sh==='triangle'?'<path d="M6 .8 11.2 10.6H.8z"/>':'<path d="M11 6 8.5 10.3h-5L1 6l2.5-4.3h5z"/>';return`<svg class="cx-tok" width="${sz}" height="${sz}" viewBox="0 0 12 12" fill="${c}" stroke="#0B1633" stroke-width="1.4" aria-hidden="true">${body}</svg>`};
const SPEED={normal:{step:170,cross:280,ai:450,hold:900},fast:{step:60,cross:90,ai:120,hold:250},instant:{step:0,cross:0,ai:0,hold:0}};
let s=null,layout=SC.referenceLayout(),G=SS.geometry(layout),C=null,cam=SS.CAMERAS[opts.camera]||SS.CAMERAS.top,plan='stay';
let anim={queue:[],cur:null,t0:0,tokens:{}},notes=[],tally=null,dirty=true,overlay={},timer=null,stagesOverride=null;
// ---------- storage ----------
const store={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v);return true}catch(e){return false}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};
function save(){if(s&&!s.over)store.set(SC.SAVE_KEY,SC.serialize(s))}
// ---------- setup ----------
function setupScreen(){const saved=store.get(SC.SAVE_KEY),r=saved?SC.restore(saved):null;
 $('#cx-setup').hidden=false;$('#cx-game').hidden=true;
 $('#cx-setup').innerHTML=`<h1>Skyline Circuit <small>playable alpha</small></h1>
 <p class="cx-note">Functional prototype: placeholder board and HUD. Final art, camera and HUD come from the approved design.</p>
 ${r&&r.ok?`<button id="cx-resume" class="cx-primary">Resume match (round ${r.state.round})</button>`:r&&r.reason==='newer-version'?'<p class="cx-warn">A saved Circuit match from a newer version is kept untouched.</p>':''}
 <fieldset><legend>Match length</legend>${['standard','extended','quick'].map(k=>`<label><input type="radio" name="len" value="${k}" ${k===(['standard','extended','quick'].includes(q.get('length'))?q.get('length'):'standard')?'checked':''}> ${esc(LENGTH_TEXT[k])}</label>`).join('')}</fieldset>
 <fieldset><legend>Opponents</legend><label>Computer players <select id="cx-n">${[1,2,3].map(n=>`<option ${n===3?'selected':''}>${n}</option>`).join('')}</select></label>
 <div id="cx-levels"></div></fieldset>
 ${opts.career?'<p class="cx-note">Career match: Standard and Extended can count toward unlocks (Normal or Hard opponents; a mixed table counts as its weakest computer player). Quick earns mastery XP only.</p>':'<p class="cx-note">Practice match (not recorded to Career).</p>'}
 <button id="cx-start" class="cx-primary">Start</button> <a href="./index.html" class="cx-link">Back to Skyline Estates</a>`;
 const lv=()=>{const n=+$('#cx-n').value;$('#cx-levels').innerHTML=[...Array(n)].map((_,i)=>`<label>Computer ${i+1} <select data-lv="${i}">${Object.entries(LEVELS).map(([k,t])=>`<option value="${k}" ${k==='normal'?'selected':''}>${esc(t)}</option>`).join('')}</select></label>`).join('')};
 $('#cx-n').onchange=lv;lv();
 if($('#cx-resume'))$('#cx-resume').onclick=()=>begin(r.state);
 $('#cx-start').onclick=()=>{const length=document.querySelector('input[name=len]:checked').value,levels=[...document.querySelectorAll('[data-lv]')].map(e=>e.value);
  const seed=q.get('seed')?+q.get('seed'):(()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]})(),startedAt=Date.now();
  begin(SC.newMatch({seed,length,fx:true,players:[{name:'You'},...levels.map((level,i)=>({name:'Computer '+(i+1),level}))],meta:{matchId:'circuit-'+seed.toString(36)+'-'+startedAt.toString(36),startedAt,career:opts.career}}))}}
async function begin(state){s=state;s.cfg.fx=true;$('#cx-setup').hidden=true;$('#cx-game').hidden=false;anim={queue:[],cur:null,t0:0,tokens:{}};notes=[];tally=null;
 for(const p of s.players)anim.tokens[p.id]={node:p.pos};
 if(opts.renderer==='3d'&&!R3tried){R3tried=true;try{const m=await import('./circuit-renderer-3d.js');R3=m.create($('#cx-board'),{layout,camera:cam,onTierChange:t=>{notes.unshift({t:'Graphics quality lowered to '+t+' for smoother play',kind:'quality'});render()}})}catch(e){R3=null;console.warn('3D renderer unavailable, using 2D',e)}}
 camCur={...cam};resize();enqueue();save();if(!looping){looping=true;loop()}}
let looping=false;
// ---------- geometry / layout ----------
function hudRects(){return['#cx-players','#cx-actions'].map(sel=>{const e=$(sel),r=e.getBoundingClientRect();return{id:sel.slice(4),x:r.left,y:r.top,w:r.width,h:r.height}})}
function boardRect(){const r=$('#cx-board').getBoundingClientRect();return{x:r.left,y:r.top,w:r.width,h:r.height}}
function resize(){if(R3){R3.resize(boardRect());R3.setCamera(camCur||cam);C=R3.C;dirty=true;return}
 const cv=$('#cx-board'),r=boardRect(),dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.round(r.width||r.w)*dpr;cv.height=Math.round(r.height||r.h)*dpr;
 const rect=boardRect();C=SS.camera(G,cam,rect);dirty=true}
// Cinematic camera: up to 15° during movement and celebrations, 0° for every decision (approved V2 decision 4).
function cameraStep(dt){if(!R3||!camCur)return;const want=(!reducedMotion&&opts.speed!=='instant'&&(busy()||(s&&s.over)))?CINEMATIC:cam;
 if(camCur.pitch===want.pitch&&camCur.dist===want.dist)return;const k=Math.min(1,dt/350);
 const step=(a,b)=>Math.abs(b-a)<.05?b:a+(b-a)*Math.max(k,.12);camCur={pitch:step(camCur.pitch,want.pitch),dist:step(camCur.dist,want.dist)};R3.setCamera(camCur);C=R3.C;dirty=true}
// ---------- driving the rules ----------
function enqueue(){anim.queue.push(...SC.drain(s));dirty=true}
// The match result is stored as soon as the rules end the match, never waiting for the animation to reach it.
function act(a){const pd=SC.pending(s);if(!pd)return;SC.act(s,pd.player,a);if(s.over)finish();enqueue();save();render()}
function busy(){return anim.cur||anim.queue.length}
function stepAnim(now){const sp=SPEED[opts.speed]||SPEED.normal;if(anim.queue.length)dirty=true;
 while(!anim.cur&&anim.queue.length){const e=anim.queue.shift();
  if(e.t==='step'){anim.cur={e,dur:e.via==='connector'?sp.cross:sp.step};anim.t0=now;if(!anim.cur.dur){anim.tokens[e.pid]={node:e.to};anim.cur=null}}
  else if(e.t==='round'){tally=e;if(sp.hold){anim.cur={e,dur:sp.hold};anim.t0=now}}
  else note(e)}
 if(anim.cur){const k=Math.min(1,(now-anim.t0)/anim.cur.dur),e=anim.cur.e;if(e.t==='step'){anim.tokens[e.pid]={node:e.from,to:e.to,k}}
  if(k>=1){if(e.t==='step')anim.tokens[e.pid]={node:e.to};anim.cur=null}dirty=true}}
function skip(){while(anim.queue.length||anim.cur){if(anim.cur){const e=anim.cur.e;if(e.t==='step')anim.tokens[e.pid]={node:e.to};anim.cur=null}
  const e=anim.queue.shift();if(!e)break;if(e.t==='step')anim.tokens[e.pid]={node:e.to};else if(e.t==='round')tally=e;else note(e)}dirty=true;render()}
function name(pid){return pid==null?'Nobody':s.players[pid].name}
function note(e){const P=e.pid!=null?name(e.pid):'';let t=null;
 if(e.t==='card')t=`${P} · ${CARD[e.card]||e.card}`;else if(e.t==='rent')t=`${P} paid ${e.amount} rent to ${name(e.to)} (${e.node})`;
 else if(e.t==='payday')t=`${P} passed Payday: +${e.amount}`;else if(e.t==='buy')t=`${P} bought ${e.node} for ${e.price}`;
 else if(e.t==='build')t=`${P} built ${SC.STAGES[e.stage]} on ${e.node}`;else if(e.t==='sell')t=`${P} sold a stage on ${e.node} (+${e.refund})`;
 else if(e.t==='bankrupt')t=`${P} is bankrupt — their properties return to the bank`;else if(e.t==='order')t=`Turn order reverses: ${e.order.map(i=>i+1).join(' → ')}`;
 else if(e.t==='clock-reset')t=`${P} lost the lead — victory clock reset`;else if(e.t==='roll')t=`${P} rolled ${e.dice[0]}+${e.dice[1]} (${e.plan==='cross'?'cross':'stay'})`;
 if(t){notes.unshift({t,kind:e.t});notes=notes.slice(0,6)}}
let finished=null;
function finish(){if(finished===s)return;finished=s;if(!s.meta||!s.meta.career){store.del(SC.SAVE_KEY);return}
 const f=SC.careerFacts(s,{ownerSeat:0,endedAt:Date.now()});store.set('skylineCareerInbox:'+f.matchId,JSON.stringify(f));store.del(SC.SAVE_KEY)}
// ---------- loop ----------
const perf={frames:[],draw:[]};let last=0;
function loop(now=performance.now()){const dt=last?now-last:16;if(opts.perf&&last)perf.frames.push(now-last);last=now;stepAnim(now);cameraStep(dt);
 if(!busy()&&s&&!s.over){const pd=SC.pending(s);if(pd&&s.players[pd.player].ai&&!timer){const sp=SPEED[opts.speed]||SPEED.normal;
   const go=()=>{timer=null;if(!busy()&&SC.pending(s)&&s.players[SC.pending(s).player].ai){act(SC.ai(s,SC.pending(s).player))}};if(sp.ai)timer=setTimeout(go,sp.ai);else go()}}
 if(dirty){const t=performance.now();draw();render();if(opts.perf)perf.draw.push(performance.now()-t);dirty=false}
 if(R3){if(busy())R3.tick(now);R3.render(now)}
 requestAnimationFrame(loop)}
// ---------- drawing (placeholder art) ----------
function tokenXY(pid,slot){const a=anim.tokens[pid];const at=q=>C.project(SS.tokenPoint(G,q,slot));if(!a)return null;if(a.to==null)return at(a.node);
 const p=at(a.node),r=at(a.to);return{x:p.x+(r.x-p.x)*a.k,y:p.y+(r.y-p.y)*a.k,d:p.d}}
function stages(){if(stagesOverride)return stagesOverride;const o={};for(const id of SC.PROPS)o[id]=s.own[id].h;return o}
function draw(){if(R3)return draw3d();draw2d()}
// 3D: the renderer draws; the overlay record (used by the checks) is computed with the same projection.
function draw3d(){const v=SC.view(s),me=s.players[s.turn],st=stages();overlay={routeStay:[],routeCross:[],tokens:{},buildings:SC.PROPS.filter(id=>st[id]>0)};
 const showRoute=v.preview&&!me.ai&&!busy();if(showRoute){const paths=SS.routePaths(me.pos);overlay.routeStay=paths.stay.map(g=>g.to);overlay.routeCross=paths.cross.map(g=>g.to)}
 const toks=[],counts={};for(const p of s.players)if(!p.out){const a=anim.tokens[p.id]||{node:p.pos};toks.push({pid:p.id,...a});const slot=counts[a.node]=(counts[a.node]??-1)+1;const xy=tokenXY(p.id,slot%4);if(xy)overlay.tokens[p.id]={node:a.node,x:xy.x,y:xy.y,r:G.tokenR*C.ppu({...G.nodes[a.node],z:0})}}
 R3.update({view:v,stages:st,tokens:toks,route:showRoute?{pos:me.pos,plan,preview:v.preview}:null,networkFor:s.players.filter(p=>!p.out).map(p=>p.id)})}
function draw2d(){const cv=$('#cx-board'),ctx=cv.getContext('2d'),dpr=cv.width/Math.max(1,boardRect().w),R=boardRect();ctx.setTransform(dpr,0,0,dpr,-R.x*dpr,-R.y*dpr);
 ctx.clearRect(R.x,R.y,R.w,R.h);const v=SC.view(s),me=s.players[s.turn],st=stages();overlay={routeStay:[],routeCross:[],tokens:{},buildings:[]};
 const P=id=>C.project({...G.nodes[id],z:0});
 // connectors
 ctx.lineWidth=6;ctx.strokeStyle='#d9c79a55';for(const [a,b] of Object.entries(SC.LINKS))if(a[0]==='O'){const p=P(a),r=P(b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(r.x,r.y);ctx.stroke()}
 // tiles, far to near
 const ids=Object.keys(G.nodes).sort((a,b)=>P(b).d-P(a).d);
 for(const id of ids){const n=v.nodes.find(x=>x.id===id),cs=SS.tileCorners(G,id,.47).map(C.project);ctx.beginPath();cs.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
  ctx.fillStyle=n.type==='junction'?'#1d2c44':n.type==='event'?'#3b2f55':DISTRICT[n.quadrant].c+'cc';ctx.fill();
  ctx.lineWidth=n.owner>=0?3:1;ctx.strokeStyle=n.owner>=0?COLORS[n.owner]:'#ffffff33';ctx.stroke();
  const c=P(id);ctx.fillStyle='#fff';ctx.font='600 9px system-ui';ctx.textAlign='center';ctx.fillText(n.type==='junction'?'⇄':n.type==='event'?'★':DISTRICT[n.quadrant].sym,c.x,c.y-4);
  ctx.font='8px system-ui';ctx.fillText(n.type==='property'?n.price:id,c.x,c.y+8)}
 // network of the current human player
 const human=s.players.find(p=>!p.ai&&!p.out);if(human){const vp=v.players[human.id];ctx.strokeStyle=COLORS[human.id]+'aa';ctx.lineWidth=3;
  for(const net of vp.networks)if(net.size>=2){const set=new Set(net.props);for(const j of SC.NODES.filter(n=>n.type==='junction').map(n=>n.id)){const near=[SC.next(j),...SC.NODES.filter(n=>SC.next(n.id)===j).map(n=>n.id)];if(near.some(x=>set.has(x)))set.add(j)}
   for(const a of set){for(const b of [SC.next(a),SC.LINKS[a]].filter(Boolean))if(set.has(b)){const p=P(a),r=P(b);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(r.x,r.y);ctx.stroke()}}}}
 // route preview: both plans at once, before a human roll
 if(v.preview&&!me.ai&&!busy()){const paths=SS.routePaths(me.pos);for(const via of ['stay','cross']){const seq=paths[via];ctx.setLineDash(via==='cross'?[6,5]:[]);ctx.lineWidth=via===plan?4:2;ctx.strokeStyle=via==='cross'?'#ffd36b':'#ffffff';
   ctx.beginPath();const o=P(me.pos);ctx.moveTo(o.x,o.y);for(const g of seq){const p=P(g.to);ctx.lineTo(p.x,p.y)}ctx.stroke();ctx.setLineDash([]);
   overlay[via==='stay'?'routeStay':'routeCross']=seq.map(g=>g.to);
   for(const l of v.preview[via].landing){const p=P(l.node);ctx.beginPath();ctx.arc(p.x+(via==='cross'?5:-5),p.y+12,2+18*l.p,0,7);ctx.fillStyle=via==='cross'?'#ffd36b99':'#ffffff99';ctx.fill()}}}
 // buildings and tokens, depth sorted
 const items=[];for(const id of SC.PROPS)if(st[id]>0){const box=SS.buildingBox(G,id,st[id]).map(C.project);items.push({d:Math.min(...box.map(p=>p.d)),draw:()=>{const h=SS.hull(box),top=box.slice(4);
   ctx.beginPath();h.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#0b1526';ctx.fill();ctx.strokeStyle=s.own[id].o>=0?COLORS[s.own[id].o]:'#999';ctx.lineWidth=1.5;ctx.stroke();
   ctx.beginPath();top.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=s.own[id].o>=0?COLORS[s.own[id].o]+'cc':'#999';ctx.fill();overlay.buildings.push(id)}})}
 const counts={};for(const p of s.players)if(!p.out){const a=anim.tokens[p.id];const node=a?a.node:p.pos;const slot=counts[node]=(counts[node]??-1)+1;const xy=tokenXY(p.id,slot%4);if(!xy)continue;
  items.push({d:xy.d-1e-6,draw:()=>{const r=G.tokenR*C.ppu({...G.nodes[node],z:0});ctx.beginPath();ctx.arc(xy.x,xy.y,r,0,7);ctx.fillStyle=COLORS[p.id];ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#081018';ctx.stroke();overlay.tokens[p.id]={node,x:xy.x,y:xy.y,r}}})}
 items.sort((a,b)=>b.d-a.d).forEach(i=>i.draw())}
// ---------- HUD (placeholder composition; one panel per interaction state) ----------
function render(){if(!s)return;const v=SC.view(s),pd=v.pending,me=pd?s.players[pd.player]:null;
 const cur=v.players[s.turn],standings=[...v.players].sort((a,b)=>b.influence-a.influence);
 $('#cx-players').innerHTML=`<div class="cx-cur">${tokSvg(cur.id,16)}<div><b>${esc(cur.name)}</b><div class="cx-k">Cash ${cur.cash}</div></div></div>
 <div class="cx-sect"><div class="cx-k">Influence → target ${v.target}${s.cfg.length==='quick'?' · Quick (experimental)':''}</div>
 ${standings.map((p,r)=>`<div class="cx-p ${p.id===s.turn?'cx-turn':''} ${p.out?'cx-out':''}">${tokSvg(p.id)}<span class="cx-n1">${r+1}. ${esc(p.name)}${p.level?` <span class="cx-k">${esc(p.level[0].toUpperCase()+p.level.slice(1))}</span>`:''}</span><span>${p.influence}</span></div><div class="cx-bar"><span style="width:${Math.min(100,100*p.influence/v.target)}%;background:${COLORS[p.id]}"></span></div>`).join('')}</div>
 <div class="cx-sect cx-order"><div>Round ${v.round} / ${v.rounds}</div><div class="cx-k">Order · reverses each round</div><div>${v.order.map((i,k)=>(k?'<span class="cx-k">›</span>':'')+tokSvg(i)).join('')}</div></div>`;
 let h='';
 // 9. victory clock
 if(v.clock)h+=`<div class="cx-clock" role="status"><b>${esc(name(v.clock.pid))}</b> is at the target — wins at the end of round ${v.clock.winsAtEndOfRound} if still leading</div>`;
 if(v.over){// 10. game over
  const why={influence:'reached the influence target and held the lead','last-solvent':'is the last solvent player','round-limit':'had the most influence at the round limit'}[v.endReason];
  h+=`<div class="cx-panel" data-state="over"><h2>${esc(name(v.winner))} wins</h2><p>${esc(name(v.winner))} ${why}.</p>${v.players.map(p=>`<div>${esc(p.name)}: ${p.influence} influence · ${p.netWorth} net worth</div>`).join('')}
   ${s.meta&&s.meta.career?`<p class="cx-note">${s.cfg.length==='quick'?'Quick is experimental: mastery XP only, no unlocks.':'Career result saved.'} It is added to your Career when you return to Skyline Estates.</p>`:''}
   <button id="cx-again" class="cx-primary">New match</button> <a href="./index.html" class="cx-link">Back</a></div>`}
 else if(busy())h+=`<div class="cx-panel" data-state="moving"><p>${esc(me?me.name:'')}…</p><button id="cx-skip">Skip animation</button></div>`; // 2. movement
 else if(pd&&me.ai)h+=`<div class="cx-panel" data-state="ai"><p>${esc(me.name)} is thinking…</p></div>`;
 else if(pd&&pd.type==='roll'){// 1. plan and roll
  const pv=v.preview,fj=pv.firstJunction,chance=Math.round(100*pv[plan].junctionChance);
  h+=`<div class="cx-panel" data-state="roll"><h2>Your route</h2><div class="cx-seg" role="radiogroup" aria-label="Route plan"><button role="radio" aria-checked="${plan==='stay'}" data-plan="stay" class="cx-stay"><i aria-hidden="true"></i>Stay</button><button role="radio" aria-checked="${plan==='cross'}" data-plan="cross" class="cx-cross"><i aria-hidden="true"></i>Cross</button></div>
   <p>${fj?`First junction <b>${fj.node}</b>${fj.stepsAway?` · ${fj.stepsAway} step${fj.stepsAway===1?'':'s'}`:' · here'}`:''}</p><p class="cx-k">${chance?`Plan applies on ${chance}% of rolls. Dots show likely landings, not certainties.`:'No junction can be reached this roll — the plan has no effect.'}</p>
   <button id="cx-roll" class="cx-primary">Roll</button></div>`}
 else if(pd&&pd.type==='buy'){// 3. buy
  const n=v.nodes.find(x=>x.id===pd.node);
  const after=JSON.parse(JSON.stringify(s));after.own[pd.node]={o:pd.player,h:0};const sizeAfter=(SC.networks(after,pd.player).find(x=>x.props.includes(pd.node))||{size:1}).size;
  h+=`<div class="cx-panel" data-state="buy"><h2>${pd.node} · ${DISTRICT_NAMES[n.quadrant]}</h2><p>Price ${pd.price} · rent ${Math.round(pd.price*.12)} at Plot${n.ring==='I'?' · inner ring (premium)':''}</p>
   <p class="cx-k">${sizeAfter>1?`Joins a network of ${sizeAfter}.`:'Does not connect to your properties yet.'}</p><button id="cx-buy" class="cx-primary">Buy</button> <button id="cx-pass">Pass</button></div>`}
 else if(pd&&pd.type==='build'){// 4. build
  const rows=v.build||[];h+=`<div class="cx-panel" data-state="build"><h2>Build</h2>${rows.length?rows.map(r=>`<div class="cx-b"><span>${r.node} · ${SC.STAGES[r.stage]}</span>${r.reason?`<span class="cx-why">${esc(REASON[r.reason]||r.reason)}</span>`:`<button data-build="${r.node}">${SC.STAGES[r.stage+1]} · ${r.cost}</button>`}</div>`).join(''):'<p class="cx-k">You own no properties yet.</p>'}
   <button id="cx-end" class="cx-primary">End turn</button></div>`}
 // 8. end of round tally
 if(tally)h+=`<div class="cx-tally" data-state="round"><b>Round ${tally.round} influence</b>${tally.tally.map(t=>`<div>${tokSvg(t.pid)} +${t.total} <span class="cx-k">(${t.properties} properties · ${t.networks} networks · ${t.districts} districts)</span></div>`).join('')}</div>`;
 // 5–7. card, rent, payday, bankruptcy and other events
 h+=`<div class="cx-feed" aria-live="polite">${notes.map(n=>`<div class="cx-n cx-${n.kind}">${esc(n.t)}</div>`).join('')}</div>`;
 const A=$('#cx-actions');if(A.dataset.h!==h){A.innerHTML=h;A.dataset.h=h;wire()}}
function wire(){const on=(sel,f)=>{const e=$(sel);if(e)e.onclick=f};
 document.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{plan=b.dataset.plan;dirty=true;render()});
 on('#cx-roll',()=>{tally=null;act({type:'roll',via:plan})});on('#cx-buy',()=>act({type:'buy'}));on('#cx-pass',()=>act({type:'pass'}));
 on('#cx-end',()=>act({type:'end'}));on('#cx-skip',skip);on('#cx-again',()=>{s=null;setupScreen()});
 document.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>act({type:'build',node:b.dataset.build}))}
// Tap on the board: identifies the node under the finger (the nearest centre within 22 pt), for inspection.
function hit(x,y){if(R3&&camCur&&camCur.pitch!==cam.pitch)return null; // no selection while the camera is tilted
 let best=null,bd=SS.MIN_TOUCH/2;for(const id of Object.keys(G.nodes)){const p=C.project({...G.nodes[id],z:0}),d=Math.hypot(p.x-x,p.y-y);if(d<=bd){bd=d;best=id}}return best}
window.addEventListener('resize',()=>{if(s)resize()});
// Re-measure whenever the board's box changes (layout settling, rotation, safe-area changes).
let lastBox='';try{new ResizeObserver(()=>{const r=boardRect(),k=[r.x,r.y,r.w,r.h].map(Math.round).join();if(s&&k!==lastBox){lastBox=k;resize()}}).observe(document.getElementById('cx-board')||document.body)}catch(e){}
document.addEventListener('DOMContentLoaded',()=>{setupScreen();$('#cx-board').addEventListener('click',e=>{const id=hit(e.clientX,e.clientY);if(id){notes.unshift({t:`${id}: ${describe(id)}`,kind:'inspect'});notes=notes.slice(0,6);render()}})});
function describe(id){const n=SC.view(s).nodes.find(x=>x.id===id);if(n.type!=='property')return n.type==='junction'?`junction, connector to ${n.link}`:'event space';return `${n.owner>=0?name(n.owner):'Bank'} · ${n.stageName} · rent ${n.rent||Math.round(n.price*.12)}`}
// Test and measurement hooks (no effect on the match).
window.__circuitUI=Object.freeze({load:state=>{SC.drain(state);return begin(state)}, // review/tests: show a prepared rules state
 present:events=>{anim.queue.push(...events);dirty=true}, // presentation-only (tests): never reaches the rules
 state:()=>s,view:()=>SC.view(s),busy:()=>!!busy(),skip,hudRects,boardRect,overlay:()=>overlay,
 projected:()=>Object.keys(G.nodes).map(id=>{const p=C.project({...G.nodes[id],z:0});return{id,x:p.x,y:p.y}}),geometry:()=>({G,C,cam}),hit,
 setStages:o=>{stagesOverride=o;dirty=true},setDesign:({layout:l,spec,cam:c})=>{layout=l;G=SS.geometry(l,spec);if(c){cam=c;camCur={...c}}resize()},setCamera:k=>{cam=SS.CAMERAS[k];camCur={...cam};resize()},r3:()=>R3,setLayout:l=>{layout=l;G=SS.geometry(l);resize()},
 placeAll:node=>{for(const p of s.players){p.pos=node;anim.tokens[p.id]={node}}dirty=true},perf:()=>{const f=[...perf.frames].sort((a,b)=>a-b),d=[...perf.draw].sort((a,b)=>a-b),pc=(a,k)=>a.length?+a[Math.min(a.length-1,Math.floor(k*a.length))].toFixed(2):null;
  return{frames:f.length,p50:pc(f,.5),p95:pc(f,.95),max:f.length?+f[f.length-1].toFixed(2):null,long50:f.filter(x=>x>50).length,drawP50:pc(d,.5),drawP95:pc(d,.95)}}});
})();
