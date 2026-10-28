// Verify the real wrapper build includes the approved game and every required local asset.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),app=path.resolve(process.argv[2]||''),www=path.join(app,'www'),src=path.join(root,'skyline-estates'),shared=path.join(root,'eko-estates');
assert.ok(['skyline-estates-app','skyline-estates-desktop'].includes(path.basename(app)),'expected wrapper directory');
const html=fs.readFileSync(path.join(www,'index.html'),'utf8'),body=fs.readFileSync(path.join(src,'game.html'),'utf8').replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g,'').replace(/<link rel="preconnect"[^>]*>\s*/g,'');
assert.ok(html.includes(body),'packaged game must preserve the approved source');
assert.ok(!/fonts\.(googleapis|gstatic)\.com/.test(html),'fonts must be local');
let files=0,bytes=0;
function identical(source,target){const expected=fs.readFileSync(source),actual=fs.readFileSync(target);assert.ok(actual.equals(expected),'packaged bytes: '+target);files++;bytes+=actual.length}
function tree(source,target){assert.ok(fs.statSync(source).isDirectory());for(const e of fs.readdirSync(source,{withFileTypes:true})){const a=path.join(source,e.name),b=path.join(target,e.name);if(e.isDirectory())tree(a,b);else identical(a,b)}}
identical(path.join(src,'reference-redesign.js'),path.join(www,'reference-redesign.js'));
for(const dir of ['lib','riders','photos','art','items'])tree(path.join(src,dir),path.join(www,dir));
tree(path.join(shared,'audio'),path.join(www,'audio'));identical(path.join(shared,'firebase-config.js'),path.join(www,'firebase-config.js'));
for(const [pkg,file] of [['outfit','outfit-latin-700-normal.woff2'],...[500,600,700,800].map(w=>['manrope',`manrope-latin-${w}-normal.woff2`])]){identical(path.join(app,'node_modules/@fontsource',pkg,'files',file),path.join(www,'fonts',file));assert.ok(html.includes(`fonts/${file}`),'font face reference')}
if(path.basename(app)==='skyline-estates-desktop')identical(path.join(src,'icon-512.png'),path.join(www,'icon-512.png'));
console.log('PACKAGED BUNDLE',JSON.stringify({app:path.basename(app),files,bytes,fonts:5,sourcePreserved:true}));
