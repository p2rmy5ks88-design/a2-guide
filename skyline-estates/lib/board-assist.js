/* Skyline Assist (27 Nov 2026): the same auto-assist as City Forge, shared by every Career board.
   - Hints: a small bubble shows the move the AI would make for you.
   - Assist: plays your current turn, then hands control back.
   - Auto: plays every one of your turns until you tap Stop.
   Each board connects with SkylineAssist.connect({...}) and keeps its own rules; this file only owns the
   controls, the mode setting (shared across Career boards) and the hint bubble. */
(function(){'use strict';
if(window.SkylineAssist)return;
const KEY='skylineCareerAssist';
let mode='hints',once=null,board=null,el=null;
try{mode=localStorage.getItem(KEY)||'hints'}catch(e){}
const css=`#skyAssist{position:fixed;right:calc(env(safe-area-inset-right,0px) + 12px);bottom:calc(env(safe-area-inset-bottom,0px) + 92px);z-index:40;display:flex;flex-direction:column;align-items:flex-end;gap:6px;pointer-events:none;font-family:inherit}
#skyAssist>*{pointer-events:auto}
#skyAssist .sa-row{display:flex;gap:6px}
#skyAssist button{min-height:44px;padding:0 14px;border-radius:14px;border:1.5px solid #7fb6e0;background:#10283ff2;color:#dcefff;font:800 13px system-ui,-apple-system,sans-serif;box-shadow:0 6px 16px #020e1980;cursor:pointer}
#skyAssist button.on{background:#1f5f8a;color:#fff;border-color:#cfe7ff}
#skyAssist .sa-mode{min-width:44px;padding:0 10px;font-size:12px;border-color:#bc9753;color:#fff2d1}
#skyAssist .sa-hint{max-width:min(320px,60vw);padding:7px 12px;border-radius:12px;border:1px solid #efc85f;background:#10283ff2;color:#ffe08a;font:700 12.5px/1.35 system-ui,-apple-system,sans-serif;box-shadow:0 6px 16px #020e1980}
html.light #skyAssist button,html.light #skyAssist .sa-hint{background:#fffffff2;color:#13284a}html.light #skyAssist button.on{background:#1f5f8a;color:#fff}html.light #skyAssist .sa-hint{color:#7a5410}
@media(max-height:470px){#skyAssist{bottom:calc(env(safe-area-inset-bottom,0px) + 74px)}#skyAssist button{min-height:44px;font-size:12px;padding:0 11px}}
#skyAssist.inline{position:static;flex-direction:row;align-items:center;pointer-events:auto}
#skyAssist.inline .sa-hint{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);z-index:40;white-space:nowrap;max-width:70vw;overflow:hidden;text-overflow:ellipsis}
#skyAssist.top{top:calc(env(safe-area-inset-top,0px) + 12px);bottom:auto;right:auto;left:50%;transform:translateX(-50%);flex-direction:row}#skyAssist.top .sa-hint{position:fixed;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 70px);white-space:nowrap}
#skyAssist.compact button{width:46px;height:46px;min-height:0;padding:0;border-radius:14px;font-size:18px;display:grid;place-items:center}`;
function ensure(){if(el)return el;const opt=board||{};const st=document.createElement('style');st.textContent=css;document.head.append(st);
 el=document.createElement('div');el.id='skyAssist';el.innerHTML='<div class="sa-hint" hidden></div><div class="sa-row"><button type="button" class="sa-mode" aria-label="Auto-assist mode"></button><button type="button" class="sa-go"></button></div>';
 if(opt.mount&&opt.mount.parent){el.classList.add('inline');if(opt.compact)el.classList.add('compact');if(opt.compact){el.querySelector('.sa-row').style.flexDirection='column'}opt.mount.parent.insertBefore(el,opt.mount.before||null)}else{if(opt.position==='top')el.classList.add('top');document.body.append(el)}
 el.querySelector('.sa-go').onclick=()=>{if(!board)return;if(active()){once=null;if(mode==='auto')setMode('hints');refresh();return}if(!board.myTurn())return;once=board.turnKey();refresh();board.run()};
 el.querySelector('.sa-mode').onclick=()=>{setMode({off:'hints',hints:'auto',auto:'off'}[mode]);if(mode==='auto'&&board&&board.myTurn())board.run()};
 return el}
function setMode(m){mode=m;try{localStorage.setItem(KEY,m)}catch(e){}if(m!=='auto')once=null;refresh()}
// True when the assistant should play for the local player right now.
function active(){if(!board||!board.myTurn())return false;return mode==='auto'||once!==null&&once===board.turnKey()}
function refresh(){if(!board)return;const e=ensure(),mine=board.myTurn(),on=active(),over=board.over&&board.over();
 e.style.display=over?'none':'';const go=e.querySelector('.sa-go'),md=e.querySelector('.sa-mode'),hint=e.querySelector('.sa-hint');
 const compact=!!board.compact;go.textContent=compact?(on?'■':'✦'):on?'■ Stop assist':'✦ Assist';go.setAttribute('aria-label',on?'Stop assist':'Assist this turn');go.classList.toggle('on',on);go.disabled=!on&&!mine;go.title=on?'Take back control':'Let the AI play this turn for you';
 md.textContent=compact?{off:'○',hints:'💡',auto:'⟳'}[mode]:{off:'Hints off',hints:'Hints',auto:'Auto ⟳'}[mode];md.setAttribute('aria-label','Auto-assist mode: '+{off:'hints off',hints:'hints',auto:'plays every turn'}[mode]);md.classList.toggle('on',mode==='auto');md.title='Tap to switch: Hints → Auto (plays every turn) → Off';
 let h='';if(mine&&!on&&mode==='hints'&&board.hint){try{h=board.hint()||''}catch(err){}}hint.hidden=!h;if(h)hint.textContent='💡 '+h}
window.SkylineAssist=Object.freeze({
 connect(opts){board=opts;ensure();refresh();return this},
 on:(seat)=>!!board&&(seat==null||seat===board.seat)&&active(),
 refresh, mode:()=>mode,
 // The current turn is finished for the local player; a one-turn assist ends here.
 turnEnded(){if(board&&once!==null&&once!==board.turnKey())once=null;refresh()}
});
})();
