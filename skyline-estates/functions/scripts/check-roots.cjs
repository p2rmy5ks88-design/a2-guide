// Refuses to deploy without Apple's public root certificates in apple-roots/.
const fs=require('node:fs'),path=require('node:path'),dir=path.join(__dirname,'..','apple-roots');
const roots=fs.readdirSync(dir).filter(f=>f.endsWith('.cer'));
if(!roots.length){console.error('Add AppleRootCA-G3.cer (and G2) to functions/apple-roots before deploying. See apple-roots/README.md.');process.exit(1)}
console.log('Apple roots present: '+roots.join(', '));
