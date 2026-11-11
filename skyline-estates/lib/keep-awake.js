/* Keep the screen on during a match (iPhone/Android app and the web). The phone dims and locks as usual on the
   menus. App: SkylineAwake native plugin (iOS idle timer). Web: Screen Wake Lock API where the browser supports it. */
(function(){'use strict';
let want=false,lock=null;
const plugin=()=>{try{const C=window.Capacitor;return C&&C.isNativePlatform&&C.isNativePlatform()&&C.Plugins&&C.Plugins.SkylineAwake}catch(e){return null}};
async function apply(){const pl=plugin();
  if(pl){try{await pl.set({on:want&&!document.hidden})}catch(e){}return}
  try{if(want&&!document.hidden&&navigator.wakeLock&&!lock){lock=await navigator.wakeLock.request('screen');lock.addEventListener('release',()=>{lock=null})}
    else if((!want||document.hidden)&&lock){await lock.release();lock=null}}catch(e){lock=null}}
function set(on){if(want===on)return;want=on;apply()}
document.addEventListener('visibilitychange',apply);
const inMatch=()=>{try{if(window.HarbourRing&&HarbourRing.active())return true;return !!(G&&!G.over&&!G.sim&&document.getElementById('title')?.hidden)}catch(e){return false}};
{const _sw=startWith;startWith=function(){const r=_sw.apply(this,arguments);set(inMatch());return r}}
{const _st=showTitle;showTitle=function(){set(false);return _st.apply(this,arguments)}}
{const _fin=finish;finish=async function(){set(false);return _fin.apply(this,arguments)}}
// Online matches enter through their own path; a light check catches any start or end the hooks above miss.
setInterval(()=>set(inMatch()),5000);
window.SkylineKeepAwake=Object.freeze({set,active:()=>want});
})();
