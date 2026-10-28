// In-memory fixture only. Emulator tests separately exercise actual Firebase retries.
const clone=x=>x==null?null:structuredClone(x);
function memoryStore(){let state={};const lookup=path=>path.split('/').filter(Boolean).reduce((v,k)=>v?.[k],state);function write(path,value){const keys=path.split('/').filter(Boolean);let at=state;for(const k of keys.slice(0,-1))at=at[k]||={};if(value===null)delete at[keys.at(-1)];else at[keys.at(-1)]=clone(value)}
 function ref(path){let order=null,end=Infinity,limit=Infinity;const self={async transaction(fn){const before=clone(lookup(path)),next=fn(before);if(next===undefined)return{committed:false,snapshot:{val:()=>before}};write(path,next);return{committed:true,snapshot:{val:()=>clone(next)}}},async get(){let value=clone(lookup(path));if(order&&value)value=Object.fromEntries(Object.entries(value).filter(([,v])=>v[order]<=end).sort((a,b)=>a[1][order]-b[1][order]).slice(0,limit));return{val:()=>value}},orderByChild(k){order=k;return self},endAt(n){end=n;return self},limitToFirst(n){limit=n;return self}};return self}
 return{ref,read:path=>clone(lookup(path)),seed:write};
}
module.exports={memoryStore};
