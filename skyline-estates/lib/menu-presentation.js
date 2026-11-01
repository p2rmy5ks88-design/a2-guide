/* Shared Shop/Season presentation only; native and web use the same local files. */
(()=>{'use strict';if(window.SkylineMenuPresentation)return;const html=document.documentElement,originalHomeTab=homeTab;
function decorateMenus(){
 const section=SEC_OF[setup.tab]||setup.tab;
 html.classList.toggle('menu-refined',section==='shop'||setup.tab==='season');
 html.classList.toggle('web-shop',section==='shop');html.classList.toggle('web-season',setup.tab==='season');html.classList.toggle('web-progress',setup.tab==='season');
 const track=document.querySelector('#track');if(!track)return;
 const S=season(),tier=seasonTierNow(),bar=document.querySelector('.sbar');
 if(bar){bar.setAttribute('role','progressbar');bar.setAttribute('aria-label','Season XP toward next tier');bar.setAttribute('aria-valuemin','0');bar.setAttribute('aria-valuemax',String(TIER_XP));bar.setAttribute('aria-valuenow',String(tier>=TIERS?TIER_XP:Math.max(0,S.sxp-tier*TIER_XP)))}
 if(!document.querySelector('.web-season-total')){const total=document.createElement('span');total.className='web-season-total';total.textContent='Total season XP: '+nfmt(S.sxp);document.querySelector('.sbp')?.append(total)}
 track.tabIndex=0;track.setAttribute('aria-label','Free and premium season rewards. Swipe or use arrow keys to browse tiers.');
 track.onkeydown=e=>{if(e.target!==track||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();track.scrollBy({left:e.key==='ArrowRight'?110:-110,behavior:'auto'})};
 [...track.children].forEach((node,i)=>{if(i<3)return;const n=Math.floor((i-3)/3)+1;node.dataset.tier=String(n);
  if(node.classList.contains('scell')){node.classList.toggle('web-current-tier',n===Math.max(1,tier));node.dataset.rewardState=node.classList.contains('done')?'claimed':node.classList.contains('can')?'claimable':'locked'}
 });
}
homeTab=function(){const result=originalHomeTab.apply(this,arguments);decorateMenus();return result};
const clicks=new WeakMap();document.addEventListener('click',event=>{if(!html.classList.contains('menu-refined')||!event.target.closest?.('#title'))return;const button=event.target.closest?.('.ibuy,#sAll,#sPrem,.scell.can');if(!button)return;
 const now=performance.now(),last=clicks.get(button);if(last!==undefined&&now-last<350){event.preventDefault();event.stopImmediatePropagation();return}clicks.set(button,now);
},true);


function viewport(){html.style.setProperty('--web-vh',Math.round(window.visualViewport?.height||innerHeight)+'px')}
addEventListener('resize',viewport,{passive:true});window.visualViewport?.addEventListener('resize',viewport,{passive:true});viewport();decorateMenus();window.SkylineMenuPresentation=Object.freeze({version:'menu-only-1'});
})();
