/* Results screen: always state the trophy outcome. An eligible match shows the trophies earned,
   the league and the current Season total (saved by the existing addTrophies/lbSubmit path);
   an ineligible match says exactly why nothing was awarded. No new trophy system and no change
   to the existing trophyDelta amounts. Device standings stay separate from verified rankings. */
(()=>{'use strict';
 if(window.SkylineResultTrophies)return;
 let last=null;
 function why(game){
  if(game.scAssisted)return 'Assisted practice (saved SC starting bonus): no trophies, career wins or Season progress. Start without the practice bonus to compete.';
  if(game.masteryId&&PREF.tokenMastery?.receipts?.[game.masteryId])return 'This match’s results were already recorded once.';
  if(game.progDone)return 'This match’s results were already recorded once.';
  if(!game.players.some(p=>!p.ai))return 'AI-only match: no trophies.';
  if(!ownerHumans().length)return game.online?'You were not seated in this online match.':'Pass & Play: trophies go to the device owner’s seat only.';
  return 'This match type does not award trophies.';
 }
 // Install last, outside optional feature wrappers that may skip ineligible matches.
 function install(){const original=progressGameEnd;
 progressGameEnd=function(winner){
  const game=G,ineligible=!!game&&!game.sim&&(!trackable()||game.progDone||!ownerHumans().length)?why(game):null;
  const before=PREF.trophies||0,result=original.apply(this,arguments);
  if(game&&!game.sim)last={game,result,reason:result?null:(ineligible||why(game)),before,after:PREF.trophies||0};
  return result;
 };}
 if(document.readyState==='loading')addEventListener('DOMContentLoaded',install,{once:true});else install();
 const modalBefore=modal;
 modal=function(options){
  if(last&&last.game===G&&options?.html?.includes('class="endgrid"')){
   const L=LEAGUES[leagueIdx()],S=season(),r=last.result;let html;
   if(r){const d=r.tr||0;
    html=`<div class="rt-card ok" data-trophy-result="${d}"><b>${d>0?'+':''}${d} 🏆 trophies</b><small>${d>0?(r.won?'Win':'Strong finish')+' recorded':d<0?'Last place: trophies deducted':'No trophies for this finish: win, or finish 2nd in a 3+ player game'} · ${L.icon} ${esc(L.name)} league · Season ${typeof seasonDisplay==='function'?seasonDisplay(S.n):S.n}: ${nfmt(S.tr||0)} 🏆 · total ${nfmt(PREF.trophies||0)}</small></div>`;
   }else html=`<div class="rt-card no" data-trophy-result="ineligible"><b>No trophies for this match</b><small>${esc(last.reason)}</small></div>`;
   options={...options,html:options.html.replace('<div class="endgrid">',html+'<div class="endgrid">')};
  }
  return modalBefore.apply(this,[options]);
 };
 const st=document.createElement('style');st.textContent='.rt-card{display:grid;gap:3px;margin:4px 0 8px;padding:9px 12px;border-radius:12px;border:1px solid #c9a85a;background:linear-gradient(180deg,#123049,#0b2131);color:#f2f5f7}.rt-card b{font-size:17px;color:#f4d28b}.rt-card small{font-size:12.5px;color:#cfe0e7;line-height:1.4}.rt-card.no{border-color:#8a6b4a}.rt-card.no b{color:#ffd59a}.stand div:first-child{color:#f4d28b!important}.stand div:first-child span{color:inherit}html.light .stand div:first-child{color:#5a4108!important}.xpcard .xprow,.xpcard .xprow span{color:#304a60!important;font-weight:700}';document.head.append(st);
 // Short landscape screens: keep four standings visible above the sticky action footer.
 const compact=document.createElement('style');compact.textContent=`
 @media (orientation:landscape) and (max-height:520px){
  .mp.endres{gap:5px;padding-top:9px;padding-bottom:9px;max-height:calc(100dvh - 12px);overflow-y:auto;overscroll-behavior:contain}
  .mp.endres>.mh{font-size:clamp(17px,3.5vh,22px);line-height:1.1;margin:0}
  .mp.endres>.rt-card{margin:0 0 2px;padding:5px 10px;gap:1px}
  .mp.endres>.rt-card b{font-size:15px;line-height:1.15}
  .mp.endres>.rt-card small{font-size:11px;line-height:1.2}
  .mp.endres .endgrid{gap:8px}
  .mp.endres .endgrid>div{gap:3px}
  .mp.endres .stand{gap:3px}
  .mp.endres .stand>div{padding:3px 7px;min-height:34px;gap:5px;grid-template-columns:22px 27px minmax(0,1fr) auto}
  .mp.endres .stand i{width:26px;height:26px;font-size:14px}
  .mp.endres .stand em{font-size:15px}
  .mp.endres .stand span{min-width:0}
  .mp.endres .hls{gap:3px}
  .mp.endres .hls>div{padding-top:3px;padding-bottom:3px}
  .mp.endres>.mbar{flex:none;position:sticky;bottom:-9px;margin:0 -16px -9px;padding:7px 16px max(9px,env(safe-area-inset-bottom,0px))}
  .mp.endres>.mbar .btn{min-height:44px}
 }
 `;document.head.append(compact);
 window.SkylineResultTrophies=Object.freeze({last:()=>last&&{reason:last.reason,trophies:last.result?.tr??null}});
})();
