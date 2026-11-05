/* Task 10: three recognisable AI strategies built only from the existing decision hooks
   (aiReserve, aiValue, aiProposeTrade). Same legal rules, same difficulty probabilities, no
   hidden dice or card knowledge, no extra cash. Local AI only: ranked online matches are
   human-only and run on the server kernel, so they are unaffected.

   Style comes from the AI's token (fixed per seat), so saves need no new fields.
   Explanations are short speech bubbles that never block a turn and never run in FAST/sims. */
(()=>{'use strict';
 if(window.SkylineAIStyles)return;
 const STYLES=Object.freeze({
  builder:{label:'Builder',about:'Keeps a cash cushion, completes districts and builds on them. Rarely trades.',reserve:1.2,own:1.2,fresh:.9,block:1,transit:1,trade:.5},
  trader:{label:'Trader',about:'Blocks rival districts, collects transit hubs and utilities, looks for trades.',reserve:1,own:1,fresh:1,block:1.25,transit:1.15,trade:1},
  investor:{label:'Investor',about:'Spends boldly to grow fast, buying most streets it lands on.',reserve:.88,own:1.06,fresh:1.06,block:1.06,transit:1.06,trade:1}
 });
 const ORDER=['builder','trader','investor'];
 let rotation=0; // tests rotate styles across seats to compare them fairly
 function styleOf(p){if(!p||!p.ai)return null;const k=TOKENS.indexOf(p.tok);const n=k>=0?k:[...String(p.tok||p.name||'')].reduce((a,c)=>a+c.codePointAt(0),0);return ORDER[(n+rotation)%ORDER.length]}
 const S=p=>STYLES[styleOf(p)]||null;
 // Engine-equality tests compare simulations with the base engine, so sims stay neutral unless a
 // fairness test opts in. Real local matches always use styles.
 let simulate=false;
 const live=()=>G&&!G.online&&(!G.sim||simulate);

 const reserve=aiReserve;aiReserve=function(p){const r=reserve.apply(this,arguments),s=live()&&S(p);return s?r*s.reserve:r};

 function situation(p,i){const s=SQ[i];if(!s)return null;
  if(s.t==='prop'){const gr=GROUPS[s.g],mine=gr.filter(j=>G.own[j].o===p.id).length,others=new Set(gr.map(j=>G.own[j].o).filter(o=>o>=0&&o!==p.id));
   if(others.size===0&&mine===gr.length-1)return{kind:'complete',area:GNAME[s.g]};
   if(others.size===1){const q=[...others][0];if(gr.filter(j=>G.own[j].o===q).length===gr.length-1)return{kind:'block',who:P(q).name,area:GNAME[s.g]}}
   if(mine>0&&others.size===0)return{kind:'own',area:GNAME[s.g]};
   return{kind:'fresh',area:GNAME[s.g]}}
  return{kind:'transit'}}
 const value=aiValue;aiValue=function(p,i){const v=value.apply(this,arguments),s=live()&&S(p);if(!s)return v;const k=situation(p,i)?.kind;
  return v*(k==='complete'||k==='own'?s.own:k==='block'?s.block:k==='transit'?s.transit:s.fresh)};

 const propose=aiProposeTrade;aiProposeTrade=function(p){const s=live()&&S(p);if(s&&s.trade<1&&Math.random()>s.trade)return null;return propose.apply(this,arguments)};

 // One short, non-blocking reason after a purchase decision.
 let lastWhy=0;
 function say(p,text){if(FAST||!G||G.sim||!p||!p.ai||Date.now()-lastWhy<2200)return;lastWhy=Date.now();try{bubble(p.id,text)}catch{}}
 const wants=aiWantsBuy;aiWantsBuy=function(p,i){const yes=wants.apply(this,arguments);if(!live()||FAST||!p?.ai)return yes;
  const s=S(p),x=situation(p,i);if(!s||!x)return yes;
  if(yes)say(p,x.kind==='complete'?`Completes ${x.area}!`:x.kind==='block'?`Blocking ${x.who} in ${x.area}`:x.kind==='transit'?(s===STYLES.trader?'Collecting the network':'Steady income'):s===STYLES.investor?'Growing the portfolio':s===STYLES.builder?`Building toward ${x.area}`:`A foothold in ${x.area}`);
  else if(p.cash>=SQ[i].p)say(p,s===STYLES.builder?'Keeping a cash cushion':'Not worth it at this price');
  return yes};

 // Player cards: "AI · Builder" with the strategy in the tooltip.
 const roster=renderRoster;renderRoster=function(){const r=roster.apply(this,arguments);if(!G||FAST||G.online)return r;
  for(const p of G.players){const s=S(p);if(!s)continue;const t=[...document.querySelectorAll('#pc'+p.id+' .tag')].find(x=>x.textContent.trim()==='AI');
   if(t){t.textContent='AI · '+s.label;t.title=s.about;t.classList.add('ai-style')}}
  return r};

 window.SkylineAIStyles=Object.freeze({STYLES,styleOf,setRotation:n=>{rotation=((n%3)+3)%3},simulate:on=>{simulate=!!on}});
})();
