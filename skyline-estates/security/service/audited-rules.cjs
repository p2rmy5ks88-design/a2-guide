const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const source=fs.readFileSync(path.resolve(__dirname,'../../game.html'),'utf8').replace(/\r\n/g,'\n');
const expectedSourceHash='4761720e666738ac6f8f4d65fad66c9f6edf8ce2eb5af82dcb404e9990f7d782';
const sourceHash=crypto.createHash('sha256').update(source).digest('hex');
if(sourceHash!==expectedSourceHash)throw Error('Game source changed: audit property hooks and rerun browser parity before updating the pinned hash');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<=a)throw Error('Missing audited game section');return source.slice(a,b)}
function line(prefix){const rows=source.split('\n').filter(s=>s.startsWith(prefix));if(rows.length!==1)throw Error('Missing or ambiguous game hook: '+prefix);return rows[0]}
const cityRaw=JSON.parse(line('const CITY_RAW=').slice('const CITY_RAW='.length).replace(/;\s*$/,''));
function validIdentities(players){if(!Array.isArray(players))return false;const ids=[];for(const p of players){if(p.uid===null){if(!p.ai)return false;continue}if(typeof p.uid!=='string'||!/^[A-Za-z0-9_-]{1,128}$/.test(p.uid)||['__proto__','constructor','prototype'].includes(p.uid))return false;ids.push(p.uid)}return ids.length>0&&new Set(ids).size===ids.length}
module.exports={source,sourceHash,section,line,cityRaw,validIdentities};
