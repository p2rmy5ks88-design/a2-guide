"""Guard the build-only event paths and explicit publication boundaries (stdlib only)."""
from pathlib import Path
from fnmatch import fnmatchcase
import re
ROOT = Path(__file__).resolve().parents[2]
GATE = "github.event_name == 'workflow_dispatch' && inputs.publish"
checks = 0

def check(name, value):
    global checks
    assert value, name
    checks += 1
    print('PASS', name)

def block(text, name, indent):
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line == ' ' * indent + name + ':')
    end = next((i for i in range(start + 1, len(lines)) if lines[i].strip() and len(lines[i]) - len(lines[i].lstrip()) <= indent), len(lines))
    return '\n'.join(lines[start + 1:end])

for platform in ('android', 'ios', 'desktop'):
    filename = f'skyline-{platform}.yml'
    text = (ROOT / '.github/workflows' / filename).read_text(encoding='utf-8-sig')
    folder = 'skyline-estates-desktop' if platform == 'desktop' else 'skyline-estates-app'
    examples = ['skyline-estates/game.html', 'skyline-estates/reference-redesign.js', 'skyline-estates/art/new.webp', 'skyline-estates/items/new.webp', 'skyline-estates/photos/new.webp', 'skyline-estates/lib/new.js', 'skyline-estates/riders/new.glb', 'skyline-estates/icon-512.png', folder + '/package.json', folder + '/scripts/build-new.mjs', 'eko-estates/audio/new.mp3', 'eko-estates/firebase-config.js', '.github/workflows/' + filename, 'skyline-estates/tests/build-pipelines.py']
    if platform != 'desktop':
        examples += [folder + '/capacitor.config.json', folder + '/resources/icon.png']
    for event in ('pull_request', 'push'):
        trigger = block(block(text, 'on', 0), event, 2)
        patterns = re.findall(r'^      - "([^"]+)"$', trigger, re.M)
        check(f'{platform}: {event} covers game, assets, wrapper, shared inputs and workflow', all(any(fnmatchcase(p, pattern) for pattern in patterns) for p in examples))
        check(f'{platform}: {event} skips unrelated guide edits', not any(fnmatchcase('Resources/www/index.html', pattern) for pattern in patterns))
    dispatch = block(block(text, 'on', 0), 'workflow_dispatch', 2)
    check(f'{platform}: publishing defaults off', 'type: boolean' in dispatch and 'default: false' in dispatch)
    check(f'{platform}: default token is read only', block(text, 'permissions', 0).strip() == 'contents: read')
    check(f'{platform}: build has timeout and pipe failures propagate', 'timeout-minutes: 20' in text and 'shell: bash' in text)
    check(f'{platform}: checkout does not persist credentials', 'persist-credentials: false' in text)
    if platform != 'ios':
        publish = block(block(text, 'jobs', 0), 'publish', 2)
        check(f'{platform}: publication job requires explicit manual choice', '    if: ' + GATE in publish and '      contents: write' in publish)
        build = block(block(text, 'jobs', 0), 'appimage' if platform == 'desktop' else 'android', 2)
        check(f'{platform}: build job cannot publish releases', 'gh release' not in build and 'contents: write' not in build)
    if platform in ('android', 'ios'):
        secret = 'ANDROID_KEYSTORE_BASE64' if platform == 'android' else 'APP_STORE_CONNECT_KEY_BASE64'
        if platform == 'ios':
            signed_step = text.split('      - name: Archive and upload to TestFlight', 1)[1].split('      - name:', 1)[0]
            before_signing = text.split('      - name: Archive and upload to TestFlight', 1)[0]
            check('ios: signing credentials only reach explicit publication step', '        if: ' + GATE in signed_step and 'secrets.APP_STORE_CONNECT_KEY_BASE64' in signed_step and 'secrets.' not in before_signing and 'Required Apple signing configuration is missing' in signed_step and 'trap ' in signed_step)
        else:
            check(f'{platform}: signing material only on explicit publication', GATE + ' && secrets.' + secret in text and '        if: ' + GATE + ' && env.' in text)
    if platform == 'ios':
        check('ios: validates unsigned simulator product and retains log', 'CODE_SIGNING_ALLOWED=NO build' in text and 'test -d "$RUNNER_TEMP/skyline-ios/Build/Products/Release-iphonesimulator/App.app"' in text and 'if: always()' in text)
    if platform == 'ios':
        check('ios: device IPA is unsigned, ARM64 and includes latest UI', 'CODE_SIGNING_REQUIRED=NO' in text and 'lipo "$PRODUCT/App" -verify_arch arm64' in text and 'skyline-estates-ios-sideloadly-unsigned' in text and 'public/reference-redesign.js' in text and 'platform +IOS$' in text)
    check(f'{platform}: checks the complete packaged web bundle', 'verify-bundle.cjs' in text)
ios = (ROOT / '.github/workflows/skyline-ios.yml').read_text()
check('ios: requires macOS 26 runner and verifies toolchain before install', 'runs-on: macos-26' in ios and ios.index('verify-ios-sdk.py toolchain') < ios.index('- name: Install'))
check('ios: verifies the linked device SDK and retains toolchain evidence', 'verify-ios-sdk.py" binary' in ios and 'skyline-ios-toolchain.txt' in ios)
check('ios: signed Apple validation runs before any export or upload', 'verify-signed-apple.test.py' in ios and ios.index('verify-signed-apple.py"') < ios.index('xcodebuild -exportArchive'))
web_cfg = (ROOT / 'skyline-estates/lib/cloud-config.js').read_text()
bw = (ROOT / 'skyline-estates-app/scripts/build-web.mjs').read_text()
check('cloud: the shipped web config keeps accounts and purchases off', 'enabled:false' in web_cfg and 'purchases:false' in web_cfg and "channel:'off'" in web_cfg)
check('cloud: only a manual iOS run can select private testing', "SKYLINE_CLOUD_CHANNEL: ${{ github.event_name == 'workflow_dispatch' && inputs.cloud_channel || 'off' }}" in ios and "default: 'off'" in ios)
pt=(ROOT/'skyline-estates-app'/'cloud'/'private-testing.js').read_text()
rel=(ROOT/'skyline-estates-app'/'cloud'/'ios-release.js').read_text()
check('cloud: private-testing and ios-release configs are limited to the native iOS app; release has no purchases', "'off','private-testing','ios-release'" in bw and "cloud',channel+'.js'" in bw and all("getPlatform()==='ios'" in c for c in (pt,rel)) and "enabled:ios,purchases:ios" in pt and "enabled:ios,purchases:false" in rel and "channel:'ios-release'" in rel)
vb=(ROOT/'skyline-estates'/'tests'/'verify-bundle.cjs').read_text()
check('cloud: bundle check accepts only the reviewed channel config', "channel!=='off'&&a===privateConfig" in vb and "'cloud',channel+'.js'" in vb)
print(f'{checks} build pipeline checks passed')
