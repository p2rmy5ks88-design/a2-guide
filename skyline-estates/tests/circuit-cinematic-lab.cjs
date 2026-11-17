/* Skyline Circuit cinematic lab — exact V1 topology contract. Run: node tests/circuit-cinematic-lab.cjs */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'circuit-cinematic-lab.html'),'utf8');
const design=JSON.parse(fs.readFileSync(path.join(root,'design/circuit-design-v1.json'),'utf8'));
const inline=html.match(/<script type="module">([\\s\\S]*?)<\\/script>/);
assert(inline,'camera lab module exists');
new vm.SourceTextModule(inline[1]);
const match=html.match(/const positions=(\{[^;]+\});const nodes=\[\]/);
assert(match,'cinematic lab must contain embedded V1 coordinates');
const positions=JSON.parse(match[1]),source=design.layout.nodes;
assert.deepEqual(positions,source,'cinematic coordinates must match validated V1 exactly');
assert.equal(Object.keys(positions).length,32);
const expected=[['O0','I0'],['O5','I3'],['O10','I6'],['O15','I9']];
for(const [a,b] of expected){const A=positions[a],B=positions[b];assert(A&&B,'missing connector endpoint '+a+'/'+b);assert(Math.hypot(A.x-B.x,A.y-B.y)>0);}
assert(html.includes("const idx=Number(n.id.slice(1))"),'district mapping must remain node-index based');
assert(html.includes('City View')&&html.includes('Strategy View'));
assert(html.includes('City View is for inspection only; strategy actions use the overhead camera.'));
assert(html.includes('id="toggle-controls"'),'landscape camera controls are collapsible');
console.log('PASS cinematic lab: 32 exact V1 nodes, 4 connector pairs, safe review-only camera controls');
