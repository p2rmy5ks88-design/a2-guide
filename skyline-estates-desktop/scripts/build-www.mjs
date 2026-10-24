// Builds www/ for the desktop app from the web game in ../skyline-estates (with lib/ and riders/),
// plus radio tracks and Firebase settings from ../eko-estates. Bundles the fonts so it works offline.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), app = path.resolve(here, '..'), src = path.resolve(app, '../skyline-estates'), shared = path.resolve(app, '../eko-estates'), www = path.join(app, 'www');
fs.rmSync(www, { recursive: true, force: true }); fs.mkdirSync(path.join(www, 'fonts'), { recursive: true });
let body = fs.readFileSync(path.join(src, 'game.html'), 'utf8');
body = body.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, '').replace(/<link rel="preconnect"[^>]*>\s*/g, '');
const faces = [];
const addFont = (pkg, file, family, weight) => { const f = path.join(app, 'node_modules', pkg, 'files', file); if (!fs.existsSync(f)) { console.warn('missing font', f); return; } fs.copyFileSync(f, path.join(www, 'fonts', file)); faces.push(`@font-face{font-family:'${family}';src:url(fonts/${file}) format('woff2');font-weight:${weight};font-display:swap}`); };
addFont('@fontsource/outfit', 'outfit-latin-700-normal.woff2', 'Outfit', 700);
for (const w of [500, 600, 700, 800]) addFont('@fontsource/manrope', `manrope-latin-${w}-normal.woff2`, 'Manrope', w);
const head = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skyline Estates</title><script src="firebase-config.js"></script><style>${faces.join('')}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>`;
fs.writeFileSync(path.join(www, 'index.html'), head + body + '</body></html>');
fs.cpSync(path.join(shared, 'audio'), path.join(www, 'audio'), { recursive: true });
fs.copyFileSync(path.join(shared, 'firebase-config.js'), path.join(www, 'firebase-config.js'));
for (const d of ['lib', 'riders', 'photos'].filter(d => fs.existsSync(path.join(src, d)))) fs.cpSync(path.join(src, d), path.join(www, d), { recursive: true });
fs.copyFileSync(path.join(src, 'icon-512.png'), path.join(www, 'icon-512.png'));
console.log('www built:', fs.readdirSync(www).join(', '), '| fonts:', faces.length);
