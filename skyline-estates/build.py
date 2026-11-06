import hashlib, json, pathlib, re, sys
here = pathlib.Path(__file__).resolve().parent
body = (here/'game.html').read_text(encoding='utf-8')
from release_hotfixes import apply as apply_release_hotfixes
body = apply_release_hotfixes(body)
# Web-only optional economy extension. Native/server game source stays unchanged.
body = body.replace("delete s.events2;", "delete s.events2;delete s.marketPulse;")
toggle = "${toggleRow('events2',EV2_RULE[0],loc(EV2_RULE[1]),setup.rules.events2)}"
assert body.count(toggle) == 1
body = body.replace(toggle, toggle + "${toggleRow('marketPulse',MP_RULE[0],MP_RULE[1],setup.rules.marketPulse)}")
mutual = "if(setup.rules[k]&&k==='events2')setup.rules.events=false;if(setup.rules[k]&&k==='events')setup.rules.events2=false;"
assert body.count(mutual) == 1
body = body.replace(mutual, "if(setup.rules[k]&&['events','events2','marketPulse'].includes(k))for(const other of ['events','events2','marketPulse'])if(other!==k)setup.rules[other]=false;")
review = "${setup.rules.events2?`<span class=\"se-chip good\">✓ ${EV2_RULE[0]}</span>`:''}"
assert body.count(review) == 1
body = body.replace(review, review + "${setup.rules.marketPulse?`<span class=\"se-chip good\">✓ ${MP_RULE[0]}</span>`:''}")
# Spotlight's explicit Standard / Strategic choice must override saved Pulse prefs.
spot = "k==='ev'?{events2:true,events:false}:{events2:false}"
assert body.count(spot) == 1
body = body.replace(spot, "k==='ev'?{events2:true,events:false,marketPulse:false}:{events2:false,marketPulse:false}")
# Append options before the wallet initializes the weekly selection. Saved lists stay intact.
weekly_tail = "{id:'online2',n:'Finish 2 online games',g:2,k:'online'}];"
assert body.count(weekly_tail) == 1
body = body.replace(weekly_tail, weekly_tail[:-2] + ",{id:'strategic2-v1',n:'Finish 2 qualifying Strategic Event matches',g:2,k:'qualifiedStrategic'},{id:'pulse2-v1',n:'Finish 2 qualifying Market Pulse matches',g:2,k:'qualifiedPulse'}];")
# Casual challenge randomness is independent of animation/sound timing. Ordinary
# matches fall back to their existing RNG; the native source remains untouched.
body = body.replace('const j=Math.floor(Math.random()*(i+1))', "const j=Math.floor((window.SkylineSocial?.random('shuffle')??Math.random())*(i+1))")
a, b = body.index('async function rollDice(){'), body.index('  if(FAST||!S3)return d;')
body = body[:a] + body[a:b].replace('Math.random()', "(window.SkylineSocial?.random('dice')??Math.random())") + body[b:]
a, b = body.index('function aiWantsBuy('), body.index('/* ================= TURN FLOW')
assert body[a:b].count('Math.random()') == 4
body = body[:a] + body[a:b].replace('Math.random()', "(window.SkylineSocial?.random('ai')??Math.random())") + body[b:]
# Preserve the latest Season if the device clock moves backwards.
body = body.replace('if(!S||S.n!==n)', 'if(!S||S.n<n)')
# Add an optional nested Showcase without resolving/reopening the results modal.
results = "btns:[{k:'home',label:'Home'},{k:'season',label:'Season'},{k:'new',label:G.online?'New game':'Play again',primary:true}]"
assert body.count(results) == 1
body = body.replace(results, "onMount:panel=>window.SkylineShowcase?.attachResults(panel)," + results)
# Install web currency after core declarations but before boot draws the first board.
# Keep game.html (the native/server source) byte-for-byte unchanged.
boot = 'try{const h=window.claude?.hot;'
assert body.count(boot) == 1
body = body.replace(boot, '</script><script src="./lib/skyline-sc-wallet.js"></script><script src="./lib/skyline-currency.js"></script><script src="./lib/skyline-earned-cash.js"></script><script src="./lib/market-pulse.js"></script><script src="./lib/city-event-advice.js"></script><script src="./lib/ai-styles.js"></script><script src="./lib/first-session.js"></script><script src="./lib/rot-media.js"></script><script src="./lib/a11y-dialogs.js"></script><script src="./lib/native-lifecycle.js"></script><script src="./lib/beta-diary.js"></script><script src="./lib/avatars.js"></script><script src="./web/challenges.js"></script><script src="./web/social.js"></script><script src="./web/verified-config.js"></script><script src="./web/verified.js"></script><script>\n' + boot)
# The native wrapper reuses these reviewed optional features without copying the
# browser wrapper, changing the pinned rules source, or replacing native accounts.
body = body.replace('<script src="./home-redesign.js"></script>', '<script src="./home-redesign.js"></script><script src="./lib/landmarks.js"></script><script src="./lib/collection-tokens.js"></script>')
body = body.replace('<script src="./web/challenges.js">', '<script src="./lib/estate-sc.js"></script><script src="./lib/portfolio-manage.js"></script><script src="./lib/results-trophies.js"></script><script src="./lib/season-rewards.js"></script><script src="./web/challenges.js">')
# Living City V2 rules (offline rule version 2) wrap the final gameplay functions, so they load last.
body = body.replace('<script src="./lib/season-rewards.js"></script>', '<script src="./lib/season-rewards.js"></script><script src="./lib/living-city.js"></script>', 1)
if '--emit-app-body' in sys.argv:
    sys.stdout.buffer.write(body.encode('utf-8'))
    sys.exit(0)
# Preserve the approved standalone wrapper.
head = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover"><link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-180.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Skyline Estates"><meta name="theme-color" content="#10223f"><script src="../eko-estates/firebase-config.js"></script><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>'
head = head.replace('</head>', '<link rel="stylesheet" href="./lib/menu-presentation.css"><link rel="stylesheet" href="./lib/market-pulse.css"><link rel="stylesheet" href="./web/skyline-showcase.css"><link rel="stylesheet" href="./web/challenges.css"><link rel="stylesheet" href="./web/social.css"></head>')
# Shared menu-only layer; original game.html retains all board/camera behavior.
index = head + body + '<script src="./lib/menu-presentation.js"></script><script src="./web/skyline-showcase.js"></script></body></html>'
core = ['index.html', 'web-play.html', 'web-correction.html', 'web-follow.html', 'web-board.html', 'web-menus.html', 'reference-redesign.js', 'home-redesign.js', 'manifest.webmanifest', 'privacy.html', 'icon-180.png', 'icon-192.png', 'icon-512.png']
assets = sorted(p.relative_to(here).as_posix() for folder in ['art','items','photos','lib','web','avatars','living'] for p in (here/folder).rglob('*') if p.is_file())
files = core + assets
texts = {'.html','.js','.mjs','.cjs','.json','.webmanifest','.txt','.css','.svg'}
def canonical(p, data):
    return data.replace(b'\r\n', b'\n') if p.suffix in texts else data
hash = hashlib.sha256()
# Stamp the top-level worker too: older embedded browsers can miss an update
# when only an imported manifest changes. Normalize generated identity first
# so rebuilding does not hash its own previous build stamp.
worker = (here/'sw.js').read_text(encoding='utf-8')
if worker.startswith('// Skyline offline build: '):
    worker = worker.split('\n', 1)[1]
worker = re.sub(r"importScripts\('\./offline-assets\.js(?:\?build=[0-9a-f]{24})?'\);", "importScripts('./offline-assets.js');", worker, count=1)
for name in files + ['sw.js']:
    p = here/name
    data = index.encode('utf-8') if name in ('index.html','web-play.html','web-correction.html','web-follow.html','web-board.html','web-menus.html') else worker.encode('utf-8') if name == 'sw.js' else p.read_bytes()
    hash.update(name.encode('utf-8') + b'\0' + canonical(p, data) + b'\0')
manifest = '// Generated by build.py. Do not edit.\nself.SKYLINE_OFFLINE = ' + json.dumps({'version':hash.hexdigest()[:24], 'files':['./'+name for name in files]}, indent=2) + ';\n'
products = {'index.html': index, 'web-play.html': index, 'web-correction.html': index, 'web-follow.html': index, 'web-board.html': index, 'web-menus.html': index, 'offline-assets.js': manifest}
version = hash.hexdigest()[:24]
products['sw.js'] = '// Skyline offline build: ' + version + '\n' + worker.replace("importScripts('./offline-assets.js');", "importScripts('./offline-assets.js?build=" + version + "');", 1)
if '--check' in sys.argv:
    stale = [name for name, content in products.items() if not (here/name).exists() or (here/name).read_text(encoding='utf-8') != content]
    if stale:
        print('Generated files are stale: '+', '.join(stale)); sys.exit(1)
    print('Standalone page and offline manifest are current')
else:
    for name, content in products.items():
        (here/name).write_text(content, encoding='utf-8', newline='\n')
    total = sum(len(index.encode('utf-8')) if name in ('index.html','web-play.html','web-correction.html','web-follow.html','web-board.html','web-menus.html') else (here/name).stat().st_size for name in files)
    print(f'Wrote standalone page and offline manifest: {len(files)} files, {total/1024/1024:.1f} MiB')
