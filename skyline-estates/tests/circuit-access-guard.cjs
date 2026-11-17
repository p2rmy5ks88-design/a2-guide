/* Circuit public preview access gate (no gameplay or design changes). */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'circuit-alpha.html'),'utf8');
const ui=fs.readFileSync(path.join(root,'lib/circuit-ui.js'),'utf8');
const bench=fs.readFileSync(path.join(root,'lib/circuit-bench.js'),'utf8');
const m=html.match(/<script id="cx-access-guard">([\s\S]*?)<\/script>/);
assert(m,'HTML runs its access gate before loading the game scripts');
assert(html.indexOf('id="cx-access-guard"')<html.indexOf('src="./lib/circuit-rules.js"'),'gate must precede game scripts');
assert(ui.includes('if(window.__circuitAccessAllowed===false)return;'),'blocked preview must not initialize UI');
assert(bench.includes('if(window.__circuitAccessAllowed===false)return;'),'blocked preview must not start benchmark');
const run=(host,flags={},blockedStorage=false)=>{
 const panel={hidden:true,innerHTML:''};const window={};
 const storage={getItem:k=>{if(blockedStorage)throw Error('storage denied');return flags[k]??null}};
 const context={window,location:{hostname:host,search:'?career=1&bench=1&circuitAlpha=on'},
 localStorage:storage,document:{getElementById(id){assert.equal(id,'cx-setup');return panel}}};
 vm.runInNewContext(m[1],context,{timeout:1000});
 return {allow:window.__circuitAccessAllowed,hidden:panel.hidden,notice:panel.innerHTML};
};
const both={'skylineFeature.career':'on','skylineFeature.circuitAlpha':'on'};
for(const host of ['example.com','p2rmy5ks88-design.github.io','203.0.113.5']){
 const none=run(host);
 assert.equal(none.allow,false,host+' default blocked');
 assert.equal(none.hidden,false,'blocked visitors see an explanation');
 assert(none.notice.includes('Back to Skyline Estates'),'return link present');
 assert.equal(run(host,{'skylineFeature.career':'on'}).allow,false,'single flag cannot unlock');
 assert.equal(run(host,{'skylineFeature.circuitAlpha':'on'}).allow,false,'single flag cannot unlock');
 assert.equal(run(host,both).allow,true,'both Career and alpha flags allow preview');
 assert.equal(run(host,{},true).allow,false,'storage failure must fail closed');
}
for(const host of ['localhost','127.0.0.1','192.168.1.42','10.0.0.21','172.16.0.2','172.31.255.254','::1','[::1]']){
 assert.equal(run(host).allow,true,'trusted local test origin '+host);
 assert.equal(run(host,{},true).allow,true,'local QA works with storage disabled '+host);
}
for(const host of ['172.15.0.2','172.32.0.2','192.169.1.1','198.51.100.7']){
 assert.equal(run(host).allow,false,'public origin not misclassified: '+host);
}
console.log('PASS: Circuit preview soft gate blocks public default, requires dual opt-in, preserves private-LAN device QA');
