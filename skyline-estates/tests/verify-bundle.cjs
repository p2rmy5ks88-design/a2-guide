// Verify the real wrapper build includes the approved game and every required local asset.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),app=path.resolve(process.argv[2]||''),www=path.join(app,'www'),src=path.join(root,'skyline-estates'),shared=path.join(root,'eko-estates');
assert.ok(['skyline-estates-app','skyline-estates-desktop'].includes(path.basename(app)),'expected wrapper directory');
const native=path.basename(app)==='skyline-estates-app';
const approved=native?execFileSync(process.env.PYTHON||'python3',[path.join(src,'build.py'),'--emit-app-body'],{encoding:'utf8',maxBuffer:8*1024*1024}):fs.readFileSync(path.join(src,'game.html'),'utf8');
const html=fs.readFileSync(path.join(www,'index.html'),'utf8'),body=approved.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g,'').replace(/<link rel="preconnect"[^>]*>\s*/g,'');
assert.ok(html.includes(body),'packaged game must preserve the approved source');
if(path.basename(app)==='skyline-estates-app'){assert.ok(html.includes('lib/menu-presentation.css')&&html.includes('lib/menu-presentation.js'),'native bundle includes shared menu-only layer');assert.ok(!html.includes('web/presentation-'),'native bundle excludes browser board redesign');}
assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html),'fonts must be local');
let files=0,bytes=0;
function identical(source,target){const expected=fs.readFileSync(source),actual=fs.readFileSync(target);assert.ok(actual.equals(expected),'packaged bytes: '+target);files++;bytes+=actual.length}
// The manual private TestFlight build replaces only lib/cloud-config.js, with the reviewed file in the app's cloud/ folder.
const channel=process.env.SKYLINE_CLOUD_CHANNEL||'off';assert.ok(['off','private-testing','ios-release'].includes(channel),'unknown cloud channel');
const privateConfig=path.join(src,'lib','cloud-config.js');
function tree(source,target){assert.ok(fs.statSync(source).isDirectory());for(const e of fs.readdirSync(source,{withFileTypes:true})){const a=path.join(source,e.name),b=path.join(target,e.name);if(e.isDirectory())tree(a,b);else if(channel!=='off'&&a===privateConfig)identical(path.join(app,'cloud',channel+'.js'),b);else identical(a,b)}}
identical(path.join(src,'reference-redesign.js'),path.join(www,'reference-redesign.js'));identical(path.join(src,'home-redesign.js'),path.join(www,'home-redesign.js'));
for(const dir of ['lib','photos','art','items','avatars'])tree(path.join(src,dir),path.join(www,dir));
if(native){
 for(const f of ['skyline-showcase.js','skyline-showcase.css','challenges.js','challenges.css','social.js','social.css','verified.js','verified-config.js'])identical(path.join(src,'web',f),path.join(www,'web',f));
 for(const f of fs.readdirSync(path.join(src,'security','service')).filter(f=>f.endsWith('.mjs')))identical(path.join(src,'security','service',f),path.join(www,'security','service',f));
 assert.deepEqual(fs.readdirSync(path.join(www,'security','service')).sort(),fs.readdirSync(path.join(src,'security','service')).filter(f=>f.endsWith('.mjs')).sort(),'only public client modules are packaged');
 for(const f of ['skyline-currency','skyline-earned-cash','market-pulse'])assert(html.includes('lib/'+f+'.js'),'native feature '+f);
}
tree(path.join(shared,'audio'),path.join(www,'audio'));identical(path.join(shared,'firebase-config.js'),path.join(www,'firebase-config.js'));
for(const [pkg,file] of [['outfit','outfit-latin-700-normal.woff2'],...[500,600,700,800].map(w=>['manrope',`manrope-latin-${w}-normal.woff2`])]){identical(path.join(app,'node_modules/@fontsource',pkg,'files',file),path.join(www,'fonts',file));assert.ok(html.includes(`fonts/${file}`),'font face reference')}
if(path.basename(app)==='skyline-estates-desktop')identical(path.join(src,'icon-512.png'),path.join(www,'icon-512.png'));
console.log('PACKAGED BUNDLE',JSON.stringify({app:path.basename(app),files,bytes,fonts:5,sourcePreserved:true,cloudChannel:channel}));
