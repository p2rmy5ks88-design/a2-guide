// Finite, replayable entropy sampled before database transactions; no unbounded retry draw.
const crypto=require('node:crypto');
class EntropyError extends Error{constructor(code){super(code);this.code=code;this.status=503}}
function entropyWords(provider=crypto.randomBytes){let bytes;try{bytes=provider(64)}catch{throw new EntropyError('entropy-unavailable')}if(!Buffer.isBuffer(bytes)||bytes.length!==64)throw new EntropyError('invalid-entropy');return Array.from({length:16},(_,i)=>bytes.readUInt32BE(i*4))}
function boundedTape(words){if(!Array.isArray(words)||words.some(n=>!Number.isInteger(n)||n<0||n>0xffffffff))throw new EntropyError('invalid-entropy');let index=0;return max=>{if(!Number.isInteger(max)||max<1||max>0x100000000)throw new EntropyError('invalid-random-bound');const cap=0x100000000-0x100000000%max;while(index<words.length){const value=words[index++];if(value<cap)return value%max}throw new EntropyError('entropy-exhausted')}}
module.exports={entropyWords,boundedTape,EntropyError};
