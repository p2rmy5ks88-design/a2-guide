/* Collection › Tokens: reference card grid (image left; name, rarity, level, XP bar right), then
   Token Progress and Evolution stages underneath. The large showcase panel is removed; its Equip
   button moves into the Token Progress header so equipping keeps working. Layout only. */
(()=>{'use strict';
 if(window.SkylineCollectionTokens)return;
 function tidy(){const pane=document.querySelector('#pane.sec-collection.tab-tokens');if(!pane)return;
  const hero=pane.querySelector('.rf-token-hero'),head=pane.querySelector('.rf-token-progress header');
  const eq=hero&&hero.querySelector('.rf-equip');if(eq&&head&&!head.contains(eq)){eq.classList.add('ct-equip');head.append(eq)}}
 new MutationObserver(()=>tidy()).observe(document.documentElement,{childList:true,subtree:true});
 const st=document.createElement('style');st.textContent=`
#title #pane.sec-collection.tab-tokens .rf-collection-grid{display:flex!important;flex-direction:column;gap:8px;height:100%;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-bottom:calc(56px + env(safe-area-inset-bottom,0px));box-sizing:border-box}
#title #pane.sec-collection.tab-tokens .rf-token-list{flex:none;height:auto!important;overflow:visible!important}
#title #pane.sec-collection.tab-tokens .rf-token-grid{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:auto!important;gap:6px;overflow:visible!important;height:auto!important;max-height:none!important;padding:2px!important}#title #pane.sec-collection.tab-tokens .rf-filters button,#title #pane.sec-collection.tab-tokens .rf-sort{min-height:40px!important;font-size:12px}#title #pane.sec-collection.tab-tokens .rf-token-card .rf-owned{transform:scale(.8);transform-origin:top right}
#title #pane.sec-collection.tab-tokens .rf-token-card{display:grid!important;grid-template-columns:56px minmax(0,1fr);grid-auto-rows:auto;column-gap:8px;row-gap:2px;align-items:center;align-content:center;justify-items:start;text-align:left;min-height:0!important;height:auto!important;padding:6px 8px!important;position:relative}
#title #pane.sec-collection.tab-tokens .rf-token-card .rf-token-thumb{grid-column:1;grid-row:1/span 5;width:56px!important;height:56px!important;margin:0;align-self:center}
#title #pane.sec-collection.tab-tokens .rf-token-card>:not(.rf-token-thumb):not(.rf-owned){grid-column:2;margin:0}
#title #pane.sec-collection.tab-tokens .rf-token-card strong{font-size:12.5px;padding-right:20px}
#title #pane.sec-collection.tab-tokens .rf-token-card .rf-rarity{font-size:9.5px;padding:0 8px}
#title #pane.sec-collection.tab-tokens .rf-token-card small{font-size:10px}
#title #pane.sec-collection.tab-tokens .rf-token-card .rf-bar{display:block!important;width:100%;height:5px}
#title #pane.sec-collection.tab-tokens .rf-token-card .rf-owned{position:absolute;top:6px;right:6px;margin:0}
#title #pane.sec-collection.tab-tokens .rf-token-detail{flex:none;height:auto!important;max-height:none!important;overflow:visible!important;padding-bottom:0!important;display:flex!important;flex-direction:column;gap:8px}
#title #pane.sec-collection.tab-tokens .rf-token-hero{display:none!important}
#title #pane.sec-collection.tab-tokens .rf-token-progress header{display:flex;align-items:center;gap:10px}
#title #pane.sec-collection.tab-tokens .rf-token-progress header>b:nth-child(2){margin-left:auto}
#title #pane.sec-collection.tab-tokens .ct-equip{min-height:40px;padding:6px 14px;font-size:12.5px}
@media (max-width:760px){#title #pane.sec-collection.tab-tokens .rf-token-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:430px){#title #pane.sec-collection.tab-tokens .rf-token-grid{grid-template-columns:minmax(0,1fr)}}`;
 document.head.append(st);
 window.SkylineCollectionTokens=Object.freeze({tidy});
})();
