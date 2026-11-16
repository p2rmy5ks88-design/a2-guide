/* Local weekly progress adapter (preview-only).
 * Storage is untrusted, device-local, and never authorizes currency payouts.
 * The host must supply validated, uniquely identified gameplay events.
 */
(function(root,factory){
  const api=factory(typeof module==='object'&&module.exports?require('./weekly-challenges.js'):root.SkylineWeeklyChallenges);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SkylineWeeklyLocal=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(engine){
  'use strict';
  if(!engine)throw Error('Weekly engine missing');
  const KEY='skyline.weekly.preview.v1';
  function create(storage,clock){
    if(!storage||typeof storage.getItem!=='function'||typeof storage.setItem!=='function')throw Error('Storage required');
    const now=typeof clock==='function'?clock:Date.now;
    function read(){
      let raw=null;
      try{raw=storage.getItem(KEY);}catch(e){return engine.fresh(now());}
      if(!raw)return engine.fresh(now());
      try{return engine.normalize(JSON.parse(raw),now());}catch(e){return engine.fresh(now());}
    }
    function save(state){
      const normalized=engine.normalize(state,now());
      try{storage.setItem(KEY,JSON.stringify(normalized));return true;}catch(e){return false;}
    }
    function record(event){
      const before=read(),after=engine.record(before,event,now());
      const changed=JSON.stringify(before)!==JSON.stringify(after);
      return {state:after,changed,persisted:!changed||save(after)};
    }
    function view(){return engine.view(read(),now());}
    // Preview claim is deliberately unavailable: no wallet and no local
    // claim state should be mistaken for an authoritative entitlement.
    return Object.freeze({read,save,record,view,preview:true});
  }
  return Object.freeze({KEY,create,preview:true});
});
