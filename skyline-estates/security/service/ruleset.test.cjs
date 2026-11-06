// Versioned ruleset negotiation: classic stays default for old clients; Living City is advertised but not enabled online.
const assert=require('node:assert/strict');
const {validateAdmissionRequest,RULESETS}=require('./admission.cjs');
const base={requestId:'r'.repeat(20),name:'Ada',settings:{mode:'classic',city:'lagos'}};
const code=f=>{try{f();return 'ok'}catch(e){return e.code}};
assert.equal(code(()=>validateAdmissionRequest('create',base)),'ok','old client (no ruleset field) creates classic');
assert.equal(code(()=>validateAdmissionRequest('create',{...base,settings:{...base.settings,ruleset:1}})),'ok','explicit classic accepted');
assert.deepEqual(validateAdmissionRequest('create',{...base,settings:{...base.settings,ruleset:1}}).settings,{city:'lagos',mode:'classic'},'classic room state is identical to old clients');
assert.equal(code(()=>validateAdmissionRequest('create',{...base,settings:{...base.settings,ruleset:2}})),'ruleset-not-enabled');
assert.equal(code(()=>validateAdmissionRequest('create',{...base,settings:{...base.settings,ruleset:'x'}})),'invalid-ruleset');
assert.equal(code(()=>validateAdmissionRequest('create',{...base,settings:{...base.settings,rv:2}})),'invalid-fields','V2 client state keys are never accepted');
assert.equal(code(()=>validateAdmissionRequest('create',{...base,settings:{...base.settings,events2:true}})),'invalid-fields');
assert.deepEqual(RULESETS,{classic:{version:1,online:true},livingCity:{version:2,online:false}});
console.log('RULESET 8 checks');
