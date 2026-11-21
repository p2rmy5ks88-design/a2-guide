'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');let checks=0;
function run(file,{host='p2rmy5ks88-design.github.io',protocol='https:',platform=null}={}){
 const window={location:{hostname:host,protocol}};
 if(platform)window.Capacitor={isNativePlatform:()=>true,getPlatform:()=>platform};
 vm.runInNewContext(fs.readFileSync(path.join(root,file),'utf8'),{window});
 assert.ok(Object.isFrozen(window.SKYLINE_CLOUD));return window.SKYLINE_CLOUD;
}
function check(name,fn){fn();checks++;console.log('PASS',name);}
const web='skyline-estates/lib/cloud-config.js',progress='skyline-estates-app/cloud/private-progress.js';
check('published HTTPS web enables cloud save with purchases off',()=>{const c=run(web);assert.equal(c.enabled,true);assert.equal(c.purchases,false);assert.equal(c.channel,'web');assert.equal(c.service,'https://europe-west1-eko-estates.cloudfunctions.net/skylinePlayer');});
for(const options of [{host:'localhost',protocol:'http:'},{host:'127.0.0.1',protocol:'http:'},{host:'untrusted.example'},{host:'',protocol:'file:'},{platform:'ios',host:'localhost',protocol:'capacitor:'},{platform:'android',host:'localhost'},{platform:'ios'}])
 check('default wrapper/local/foreign context stays off '+JSON.stringify(options),()=>{const c=run(web,options);assert.equal(c.enabled,false);assert.equal(c.purchases,false);assert.equal(c.channel,'off');});
check('private-progress enables iOS accounts without coin purchases',()=>{const c=run(progress,{platform:'ios',host:'localhost',protocol:'capacitor:'});assert.equal(c.enabled,true);assert.equal(c.purchases,false);assert.equal(c.channel,'private-progress');});
for(const options of [{},{platform:'android'},{host:'',protocol:'file:'}])check('private-progress stays inactive outside native iOS '+JSON.stringify(options),()=>{const c=run(progress,options);assert.equal(c.enabled,false);assert.equal(c.purchases,false);});
check('existing public release remains iOS save-only',()=>{const c=run('skyline-estates-app/cloud/ios-release.js',{platform:'ios'});assert.equal(c.enabled,true);assert.equal(c.purchases,false);assert.equal(c.channel,'ios-release');});
check('existing private purchase QA channel retains its separate behavior',()=>{const c=run('skyline-estates-app/cloud/private-testing.js',{platform:'ios'});assert.equal(c.enabled,true);assert.equal(c.purchases,true);assert.equal(c.channel,'private-testing');});
console.log(checks+' cloud-channel checks passed');
