/* Auto-assist for Career Skyline Origins on the classic board (27 Nov 2026). Not shown in ordinary classic games.
   Offline games with one human only (never online or Living City rooms). While Assist plays, the human seat is
   handled by the same computer logic as the AI players for that turn, then handed straight back.
   The audited game code is not modified: this wraps playTurn from the outside. */
(function(){'use strict';
if(typeof playTurn!=='function'||!window.SkylineAssist)return;
const MARK='skylineAssistSeat';
// Career Skyline Origins only (owner decision 27 Nov 2026): ordinary classic games have no assist.
const allowed=p=>!!(G&&p&&G.set&&G.set.career==='origins'&&!G.online&&!G.lcNet&&typeof isLocalHuman==='function'&&isLocalHuman(p)&&G.players.filter(q=>!q.ai).length===1);
let held=null;
function take(p){held=p;try{localStorage.setItem(MARK,JSON.stringify({seat:G.players.indexOf(p),name:p.name}))}catch(e){}p.ai=true}
function release(){if(held){held.ai=false;held=null}try{localStorage.removeItem(MARK)}catch(e){}}
// A save written in the middle of an assisted turn must never leave the seat as a computer player.
function repair(){try{const m=JSON.parse(localStorage.getItem(MARK)||'null');if(!m||!G||!G.players)return;const p=G.players[m.seat];if(p&&p.name===m.name&&p.ai)p.ai=false;localStorage.removeItem(MARK)}catch(e){}}
if(typeof startWith==='function'){const _sw=startWith;startWith=function(){repair();const r=_sw.apply(this,arguments);repair();return r}}
{const _pt=playTurn;playTurn=async function(p){if(!held&&allowed(p)&&SkylineAssist.on(0))take(p);try{return await _pt.apply(this,arguments)}finally{if(held===p)release();try{SkylineAssist.turnEnded()}catch(e){}}}}
const me=()=>G&&!G.over&&P(G.turn);
SkylineAssist.connect({seat:0,position:'top',
 myTurn:()=>{const p=me();return !!p&&!held&&allowed(p)&&(G.phase==='pre'||G.phase==='post')&&!document.querySelector('#modals .ov')},
 turnKey:()=>G?G.round+':'+G.turn:'',over:()=>!G||G.over||!(G.set&&G.set.career==='origins')||!document.getElementById('title')||!document.getElementById('title').hidden,
 run:async()=>{const p=me();if(!p||held||!allowed(p))return;const post=G.phase==='post';take(p);
  if(post){try{await aiPostTurn(p)}catch(e){}}
  const b=document.querySelector('#acts button.pri,#acts .btn.pri,#acts button');if(b)b.click()},
 hint:()=>{const p=me();if(!p)return '';if(G.phase==='pre')return 'Roll the dice';if(G.phase==='post')return Object.keys(GROUPS).some(g=>ownsAll(p.id,g))?'Build on your full colour set from Properties, then end your turn':'End your turn';return ''}});
// The classic board has no single render hook; keep the Assist controls in step with the turn.
setInterval(()=>{try{SkylineAssist.refresh()}catch(e){}},600);
})();
