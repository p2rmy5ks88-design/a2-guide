// Bundle this original local mode for direct browser review. Retains Three.js's license header.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const out=path.resolve(process.argv[2]||path.join(root,'city-forge-offline.html'));
let three=read('lib/three.module.min.js');const at=three.lastIndexOf('export{');if(at<0)throw Error('Unexpected bundled Three.js format');
const exportedNames=three.slice(at).match(/^export\{([\s\S]*?)\};/)[1].split(',').map(e=>{const [local,remote]=e.trim().split(/\s+as\s+/);return JSON.stringify(remote||local)+':'+local}).join(',');
three='(function(){'+three.slice(0,at)+';window.CityForgeThree={'+exportedNames+'};})();';
const renderer='(function(){'+read('lib/city-forge-renderer.js').replace("import * as T from './three.module.min.js';",'const T=window.CityForgeThree;').replace('export function createRenderer','function createRenderer')+';window.CityForgeRender={createRenderer};})();';
const app='(async function(){'+read('lib/city-forge-app.js').replace("await import('./city-forge-renderer.js')",'window.CityForgeRender')+'})();';
const script=s=>'<script>'+s.replace(/<\/script/gi,'<\\/script')+'</script>';
let html=read('city-forge.html').replace('<script src="lib/board-radio.js"></script>',script(read('lib/board-radio.js'))).replace('<link rel="stylesheet" href="lib/city-forge.css">','<style>'+read('lib/city-forge.css')+'</style>');
html=html.replace('<script src="lib/city-forge-rules.js"></script><script type="module" src="lib/city-forge-app.js"></script>',()=>script(three)+script(read('lib/city-forge-rules.js'))+script(renderer)+script(app));
// Standalone review stays self-contained; Home still works in the repository's actual mode page.
html=html.replaceAll('href="index.html?return=1"','href="#"').replace('← Back to Skyline Estates','Skyline Estates · local standalone edition');
html=html.replace("location.href='index.html?return=1'","notice('City saved on this device. You can close this tab.')");
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,html);console.log('Wrote',out,Buffer.byteLength(html),'bytes');
