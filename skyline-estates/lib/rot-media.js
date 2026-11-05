/* Task 12: forced-landscape fix for the newer UI layers.
   On a touch phone held upright the game rotates <body> 90° (html.rot) and lays out for the
   landscape size the player sees. CSS media queries still read the upright viewport, so newer
   stylesheets (lib/*, web/*, redesign <style>s) applied portrait rules to a landscape layout and
   missed their short-landscape rules: the home Play cards were placed off screen.
   While rotated, width/height/orientation media rules of those sheets are re-evaluated against the
   visible landscape size. The original game.html styles (which carry their own html.rot rules) are
   untouched, nothing changes when not rotated, and :where() keeps specificity unchanged. */
(()=>{'use strict';
 if(window.SkylineRotMedia)return;
 const firstLink=[...document.querySelectorAll('link[rel=stylesheet]')].find(l=>/(^|\/)(lib|web)\//.test(l.getAttribute('href')||''));
 const legacy=new Set([...document.querySelectorAll('style')].filter(s=>firstLink&&(s.compareDocumentPosition(firstLink)&Node.DOCUMENT_POSITION_FOLLOWING)));
 const out=document.createElement('style');out.id='skyline-rot-media';
 const done=new WeakSet(),copies=[];
 const geo=/(min|max)-(width|height)|orientation|aspect-ratio/;
 // Collection deliberately un-rotates the page (home-redesign.js), so it is not "rotated" for layout.
 const R='.rot:not(:has(#title:not([hidden]) .collection-mode))';
 const pre=(sel,p)=>sel.split(',').map(s=>s.trim()).filter(Boolean).map(s=>/^(html|:root)(?![\w-])/.test(s)?s.replace(/^(html|:root)/,`$1:where(${p})`):`:where(html${p}) ${s}`).join(',');
 function feature(f,w,h){const [k,v]=f.slice(1,-1).replace(/\s+/g,'').split(':');
  if(k==='orientation')return v===(w>=h?'landscape':'portrait');
  if(/^(min|max)-(width|height)$/.test(k)){const x=k.endsWith('width')?w:h,n=parseFloat(v);return k.startsWith('min')?x>=n:x<=n}
  if(/aspect-ratio$/.test(k)){const [a,b]=v.split('/').map(Number),r=w/h,t=a/(b||1);return k.startsWith('min')?r>=t:k.startsWith('max')?r<=t:Math.abs(r-t)<.01}
  try{return matchMedia(f).matches}catch{return false}}
 // One media condition: comma-separated alternatives, each an and-list of (features).
 const one=(c,w,h)=>c.split(',').some(p=>{p=p.trim();if(/^not\b/.test(p))return false;return (p.match(/\([^)]*\)/g)||[]).every(f=>feature(f,w,h))});
 const all=(conds,w,h)=>conds.every(c=>one(c,w,h));
 // While rotated, the visible landscape height is the upright width (--sw) and its width the upright height (--sh).
 const VU=/(-?[\d.]+)(d|s|l)?v(h|w|min|max)\b/g;
 const conv=css=>css.replace(VU,(m,n,_,u)=>`calc(${n} * ${u==='h'||u==='min'?'var(--sw)':'var(--sh)'} / 100)`);
 const vdecls=st=>{const o=[];for(let i=0;i<st.length;i++){const k=st[i],v=st.getPropertyValue(k);if(/\dv(h|w|min|max)\b|\d[dsl]v(h|w)\b/.test(v))o.push(`${k}:${conv(v)}${st.getPropertyPriority(k)?' !important':''}`)}return o.join(';')};
 function units(list){for(const r of [...list.cssRules]){if(r.type===CSSRule.STYLE_RULE){const d=vdecls(r.style);if(d)copies.push({conds:[],css:`${pre(r.selectorText,R)}{${d}}`})}}}
 function rewrite(list,conds){
  for(const r of [...list.cssRules]){
   if(r.type===CSSRule.STYLE_RULE){copies.push({conds,css:`${pre(r.selectorText,R)}{${conv(r.style.cssText)}}`});r.selectorText=pre(r.selectorText,`:not(${R})`)}
   else if(r.type===CSSRule.MEDIA_RULE)rewrite(r,[...conds,r.conditionText])}}
 function scan(){let added=false;
  for(const sh of [...document.styleSheets]){const node=sh.ownerNode;if(!node||node===out||legacy.has(node)||done.has(sh))continue;
   let list;try{list=sh.cssRules}catch{continue}done.add(sh);
   units(sh);added=true;
   for(const r of [...list])if(r.type===CSSRule.MEDIA_RULE&&geo.test(r.conditionText)){rewrite(r,[r.conditionText])}}
  return added}
 function render(){if(!document.documentElement.classList.contains('rot')){if(out.textContent)out.textContent='';return}
  if(document.head.lastElementChild!==out)document.head.append(out);
  const w=Math.max(innerWidth,innerHeight),h=Math.min(innerWidth,innerHeight);
  out.textContent=copies.filter(x=>all(x.conds,w,h)).map(x=>x.css).join('\n')}
 // Lazy: nothing is rewritten until the screen is actually rotated, so desktops, landscape phones
 // and the landscape app keep their stylesheets exactly as authored.
 const rotated=()=>document.documentElement.classList.contains('rot');
 function refresh(){if(!rotated()&&!copies.length)return;scan();render()}
 new MutationObserver(m=>{if(m.every(x=>[...x.addedNodes].every(n=>n===out)))return;if((rotated()||copies.length)&&scan())render()}).observe(document.head,{childList:true});
 addEventListener('eko-rot',refresh);addEventListener('resize',()=>requestAnimationFrame(render));
 if(document.readyState==='loading')addEventListener('DOMContentLoaded',refresh,{once:true});else refresh();
 setTimeout(refresh,800);
 window.SkylineRotMedia=Object.freeze({refresh,count:()=>copies.length});
})();
