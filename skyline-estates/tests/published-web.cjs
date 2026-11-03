'use strict';
// Read-only public asset checks. Optional browser QA uses a fresh isolated
// profile and blocks Firebase/other origins; it cannot touch the owner's save.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),base='https://p2rmy5ks88-design.github.io/a2-guide/skyline-estates/';
const hash=s=>crypto.createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
(async()=>{const files=[];async function read(name){const r=await fetch(base+name,{redirect:'error',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{'Cache-Control':'no-cache'}});return {status:r.status,text:await r.text()}}
 const phase3=await read('web/challenges.js');if(phase3.status!==200||hash(phase3.text)!==hash(fs.readFileSync(path.join(root,'web/challenges.js'),'utf8')))throw Error('Published Phase 3 challenges differ from the verified source');files.push({name:'web/challenges.js',sha256:hash(phase3.text)});
 const social=await read('web/social.js');let phase4=false;
 if(social.status===200&&hash(social.text)===hash(fs.readFileSync(path.join(root,'web/social.js'),'utf8'))){phase4=true;for(const name of ['web/social.js','web/social.css','web/verified.js','web/verified-config.js','web/skyline-showcase.js','offline-assets.js','sw.js','index.html']){const r=name==='web/social.js'?social:await read(name);if(r.status!==200||hash(r.text)!==hash(fs.readFileSync(path.join(root,name),'utf8')))throw Error('Published candidate mismatch: '+name);files.push({name,sha256:hash(r.text)})}
  const run=spawnSync(process.execPath,[path.join(__dirname,'social-browser.cjs')],{env:{...process.env,SHOWCASE_FILE:'',SHOWCASE_LIVE_URL:base},stdio:'inherit',timeout:180000});if(run.status!==0)throw Error('Isolated public-game social checks failed');
 }
 const report={base,at:new Date().toISOString(),phase3:true,phase4,files,physicalIPhone:false};const out=process.env.RUNNER_TEMP||path.join(root,'test-results');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'skyline-published-web.json'),JSON.stringify(report,null,2));console.log('PUBLISHED WEB',files.length,'matching public assets; Phase4 live:',phase4);
})().catch(e=>{console.error(e);process.exitCode=1});
