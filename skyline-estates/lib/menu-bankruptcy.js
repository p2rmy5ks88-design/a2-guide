/* In-game menu: "Declare bankruptcy" for the player whose turn it is, in local games only (solo, pass & play).
   Uses the game's own bankrupt() rule with the bank as creditor: buildings return to the bank, properties become
   unowned, and the player leaves the match. Online rooms are server/host-driven and do not offer it. */
(()=>{'use strict';
const allowed=()=>{try{return G&&!G.over&&!G.sim&&!G.online&&!G.lcNet&&alive().length>1&&isLocalHuman(P(G.turn))}catch(e){return false}};
async function declare(){const p=P(G.turn);
  const c=await modal({html:`<div class="mh">Declare bankruptcy?</div><div class="mtxt"><b>${esc(p.name)}</b> leaves this game now. Properties and buildings go back to the bank and can be bought again. This can’t be undone.</div>`,
    btns:[{k:'no',label:'Keep playing',primary:true},{k:'yes',label:'Declare bankruptcy',danger:true}]}).catch(()=>'no');
  if(c!=='yes'||!allowed()||P(G.turn)!==p)return;
  GEN++;$('#modals').innerHTML='';$('#acts').innerHTML='';
  bankrupt(p,null);
  if(G.over||endCheck()){G.over=true;await finish();return}
  advanceTurn();save();run()}
{const _m=modal;modal=function(o){
  if(o&&typeof o.html==='string'&&o.html.startsWith('<div class="mh">Menu</div>')&&Array.isArray(o.btns)&&allowed()){
    const btns=o.btns.slice(),q=btns.findIndex(b=>b.k==='quit');btns.splice(q<0?btns.length-1:q,0,{k:'bankrupt',label:'Declare bankruptcy',danger:true});
    return _m.call(this,{...o,btns}).then(k=>{if(k==='bankrupt')setTimeout(declare,0);return k})}
  return _m.apply(this,arguments)}}
window.SkylineDeclareBankruptcy={allowed,declare};
})();
