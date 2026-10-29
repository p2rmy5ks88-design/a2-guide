"""Verify the delivered Apple-signed app, never source entitlements alone.
Run on macOS before installing/distributing an Apple-auth acceptance build.
Does not print profile/device IDs, certificates, tokens or private keys.
"""
import argparse
import datetime as dt
import hashlib
import plistlib
import subprocess
import tempfile
from pathlib import Path

BUNDLE = 'com.kenstylez.skylineestates'
TEAM = 'HS85466T3Z'
APPLE = 'com.apple.developer.applesignin'

def validate(info, ent, profile, certificate, now=None):
    now = now or dt.datetime.now(dt.timezone.utc)
    def require(ok, message):
        if not ok:
            raise ValueError(message)
    require(info.get('CFBundleIdentifier') == BUNDLE, 'Wrong application bundle ID')
    require(profile.get('TeamIdentifier') == [TEAM], 'Wrong provisioning team')
    pe = profile.get('Entitlements', {})
    require(ent.get('com.apple.developer.team-identifier') == TEAM, 'Wrong signed team entitlement')
    expected = TEAM + '.' + BUNDLE
    require(pe.get('application-identifier') == expected, 'Profile must match the exact App ID')
    require(ent.get('application-identifier') == expected, 'Signed App ID mismatch')
    require(pe.get(APPLE) == ['Default'], 'Profile does not allow Sign in with Apple')
    require(ent.get(APPLE) == ['Default'], 'Final signature lacks Sign in with Apple')
    expiry = profile.get('ExpirationDate')
    require(isinstance(expiry, dt.datetime), 'Missing profile expiration')
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=dt.timezone.utc)
    require(expiry > now + dt.timedelta(days=1), 'Profile expired or expires within 24 hours')
    require(isinstance(certificate, bytes) and bool(certificate), 'Missing signing certificate')
    allowed = profile.get('DeveloperCertificates', [])
    require(any(isinstance(c, bytes) and hashlib.sha256(c).digest() == hashlib.sha256(certificate).digest() for c in allowed), 'Signing certificate is not allowed by the profile')
    devices = profile.get('ProvisionedDevices')
    development = ent.get('get-task-allow', False)
    require(isinstance(development, bool), 'Invalid signed get-task-allow')
    require(development == pe.get('get-task-allow', False), 'Debug entitlement/profile mismatch')
    if development:
        require(isinstance(devices, list) and bool(devices), 'Development profile needs registered devices')
    # Firebase native options are checked by the caller against the bundled file.
    return 'development' if development else ('ad-hoc' if devices else 'distribution')

def command(stage, *args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        # Keep raw codesign/profile diagnostics out of public CI logs.
        raise ValueError('Apple signing check failed at ' + stage + ' (exit ' + str(result.returncode) + ')')
    return result.stdout

def inspect(app):
    app = Path(app).resolve(strict=True)
    if not app.is_dir() or app.suffix != '.app':
        raise ValueError('Expected a signed .app directory')
    command('signature integrity', '/usr/bin/codesign', '--verify', '--deep', '--strict', str(app))
    ent = plistlib.loads(command('signed entitlements', '/usr/bin/codesign', '--display', '--entitlements', ':-', str(app)))
    profile_path = app / 'embedded.mobileprovision'
    if not profile_path.is_file():
        raise ValueError('No embedded provisioning profile; unsigned builds cannot pass')
    profile = plistlib.loads(command('embedded profile', '/usr/bin/security', 'cms', '-D', '-i', str(profile_path)))
    with tempfile.TemporaryDirectory(prefix='skyline-signature-') as tmp:
        prefix = str(Path(tmp) / 'cert')
        # Optional long-option arguments must use '='; a separate prefix is another input path.
        command('certificate extraction', '/usr/bin/codesign', '--display', '--extract-certificates=' + prefix, str(app))
        certificate = Path(prefix + '0').read_bytes()
    info = plistlib.loads((app / 'Info.plist').read_bytes())
    mode = validate(info, ent, profile, certificate)
    firebase = plistlib.loads((app / 'GoogleService-Info.plist').read_bytes())
    if firebase.get('BUNDLE_ID') != BUNDLE or firebase.get('GOOGLE_APP_ID') != '1:668368365590:ios:03e33bfa0fd85930a32d37' or firebase.get('PROJECT_ID') != 'eko-estates':
        raise ValueError('Bundled Firebase application/project mismatch')
    print('PASS: final Apple signature, exact App ID/team, Apple entitlement, allowed certificate, unexpired profile and Firebase options (' + mode + ')')
    print('This verifies packaging, not a live Apple authorization or Firebase login.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app')
    args = parser.parse_args()
    try:
        inspect(args.app)
    except (ValueError, OSError, plistlib.InvalidFileException) as error:
        parser.exit(1, 'FAIL: ' + str(error) + '\n')
