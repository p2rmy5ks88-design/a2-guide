// Living Board V1: isolate the renderer's optional pixel-density experiment.
// This tests the exact expression in game.html, not a duplicate implementation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','game.html'),'utf8');
const start=source.indexOf('const requestedScale=(()=>{');
const end=source.indexOf('gl.viewport(0,0,w,h);',start);
assert.ok(start>0&&end>start,'expected opt-in renderer block');
const expression=source.slice(start,end);
function evaluate(search,devicePixelRatio,coarse,width=400,height=200){
 const canvas={clientWidth:width,clientHeight:height,width:0,height:0};
 const ctx={location:{search},devicePixelRatio,COARSE:coarse,cv:canvas,URLSearchParams,Number,Math,GL:{viewport(){}}};
 const output=vm.runInNewContext(expression+';({dpr,w,h})',ctx);
 return {...output};
}
for(const [search,dpr,coarse,expected] of [
 ['',3,true,1.5],['',3,false,2],
 ['?skylineRenderScale=2',3,true,2],
 ['?skylineRenderScale=2.5',3,true,2.5],
 ['?skylineRenderScale=3',3,true,3],
 ['?skylineRenderScale=3',2,true,2],
 ['?skylineRenderScale=0',3,true,1.5],
 ['?skylineRenderScale=4',3,true,1.5],
 ['?skylineRenderScale=NaN',3,true,1.5],
 ['?skylineRenderScale=garbage',3,true,1.5],
 ['?skylineRenderScale=',3,true,1.5],
 ['?skylineRenderScale=Infinity',3,true,1.5],
 ['?skylineRenderScale=-1',3,true,1.5],
 ['?skylineRenderScale=2.5',1,true,1],
 ]){
 const result=evaluate(search,dpr,coarse);
 assert.equal(result.dpr,expected,search||'default');
 assert.equal(result.w,Math.round(400*expected));
 assert.equal(result.h,Math.round(200*expected));
}
console.log('PASS Living Board opt-in render-scale QA (14 cases)');
