"""Install approved local distribution credentials for one private TestFlight step.
No credentials, raw profile contents or device identifiers are printed.
"""
import base64
import hashlib
import importlib.util
import json
import os
import plistlib
import secrets
import shlex
import subprocess
import sys
import uuid
from pathlib import Path

spec = importlib.util.spec_from_file_location('apple_signature', Path(__file__).with_name('verify-signed-apple.py'))
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

def profile_config(profile):
    certs = profile.get('DeveloperCertificates', [])
    if len(certs) != 1 or not isinstance(certs[0], bytes):
        raise ValueError('Select exactly one distribution certificate in the profile')
    ent = profile.get('Entitlements', {})
    kind = verifier.validate({'CFBundleIdentifier': verifier.BUNDLE}, ent, profile, certs[0])
    if kind != 'distribution' or 'ProvisionedDevices' in profile or profile.get('ProvisionsAllDevices'):
        raise ValueError('An App Store distribution profile is required')
    try:
        profile_uuid = profile['UUID']
        if not isinstance(profile_uuid, str) or profile_uuid.lower() != str(uuid.UUID(profile_uuid)):
            raise ValueError('Non-canonical provisioning profile UUID')
    except (KeyError, TypeError, ValueError, AttributeError):
        raise ValueError('Invalid provisioning profile UUID') from None
    name = profile.get('Name')
    if not isinstance(name, str) or not name.strip() or any(c in name for c in ('\n', '\r', '$(')):
        raise ValueError('Invalid provisioning profile name')
    return profile_uuid, hashlib.sha1(certs[0]).hexdigest().upper()

def run(stage, *args):
    result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode:
        raise ValueError('Distribution setup failed at '+stage+' (exit '+str(result.returncode)+')')
    return result.stdout

def decode_secret(name):
    try:
        value = base64.b64decode(os.environ[name], validate=True)
        if not value: raise ValueError()
        return value
    except (KeyError, ValueError):
        raise ValueError('Missing or invalid '+name) from None

def roots():
    return [Path.home()/'Library/Developer/Xcode/UserData/Provisioning Profiles', Path.home()/'Library/MobileDevice/Provisioning Profiles']

def setup(folder):
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    manifest = {'installed': [], 'keychains': []}
    manifest_path = folder/'cleanup.json'
    if manifest_path.exists(): raise ValueError('Existing signing setup preserved; cleanup before retry')
    manifest_path.write_text(json.dumps(manifest))
    p12 = folder/'distribution.p12'
    profile_file = folder/'distribution.mobileprovision'
    p12.write_bytes(decode_secret('IOS_DISTRIBUTION_P12_BASE64'))
    profile_file.write_bytes(decode_secret('IOS_DISTRIBUTION_PROFILE_BASE64'))
    p12.chmod(0o600)
    profile_file.chmod(0o600)
    password = os.environ.get('IOS_DISTRIBUTION_P12_PASSWORD', '')
    if not password: raise ValueError('Missing distribution key password')
    profile = plistlib.loads(run('profile decoding', '/usr/bin/security', 'cms', '-D', '-i', str(profile_file)))
    profile_uuid, fingerprint = profile_config(profile)
    keychain = folder/'distribution.keychain-db'
    keychain_password = secrets.token_urlsafe(48)
    original = shlex.split(run('keychain inventory', '/usr/bin/security', 'list-keychains', '-d', 'user').decode())
    manifest['keychains'] = original
    manifest_path.write_text(json.dumps(manifest))
    run('temporary keychain creation', '/usr/bin/security', 'create-keychain', '-p', keychain_password, str(keychain))
    run('temporary keychain settings', '/usr/bin/security', 'set-keychain-settings', '-lut', '3600', str(keychain))
    run('temporary keychain unlock', '/usr/bin/security', 'unlock-keychain', '-p', keychain_password, str(keychain))
    run('certificate import', '/usr/bin/security', 'import', str(p12), '-k', str(keychain), '-P', password, '-T', '/usr/bin/codesign', '-T', '/usr/bin/security')
    run('codesign access', '/usr/bin/security', 'set-key-partition-list', '-S', 'apple-tool:,apple:,codesign:', '-k', keychain_password, str(keychain))
    identities = run('identity verification', '/usr/bin/security', 'find-identity', '-v', '-p', 'codesigning', str(keychain)).decode()
    if fingerprint not in identities: raise ValueError('Imported private key does not match the profile certificate')
    run('keychain search list', '/usr/bin/security', 'list-keychains', '-d', 'user', '-s', str(keychain), *original)
    for parent in roots():
        parent.mkdir(parents=True, exist_ok=True)
        target = parent/(profile_uuid+'.mobileprovision')
        if target.exists():
            if target.read_bytes() != profile_file.read_bytes(): raise ValueError('Existing provisioning profile preserved')
        else:
            target.write_bytes(profile_file.read_bytes())
            target.chmod(0o600)
            manifest['installed'].append(profile_uuid+'|'+str(parent))
            manifest_path.write_text(json.dumps(manifest))
    options = {'method':'app-store-connect', 'destination':'upload', 'teamID':verifier.TEAM, 'signingStyle':'manual', 'signingCertificate':fingerprint, 'provisioningProfiles':{verifier.BUNDLE:profile_uuid}, 'testFlightInternalTestingOnly':True, 'manageAppVersionAndBuildNumber':False}
    (folder/'export.plist').write_bytes(plistlib.dumps(options))
    (folder/'signing-settings.json').write_text(json.dumps({'team':verifier.TEAM,'bundle':verifier.BUNDLE,'profile':profile_uuid,'profile_name':profile['Name'],'certificate':fingerprint}))
    print('PASS: dedicated distribution identity/profile installed for private TestFlight export')

def cleanup(folder):
    manifest_file = folder/'cleanup.json'
    if not manifest_file.is_file(): return
    manifest = json.loads(manifest_file.read_text())
    keychain = folder/'distribution.keychain-db'
    if keychain.exists(): subprocess.run(['/usr/bin/security','delete-keychain',str(keychain)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    original = manifest.get('keychains', [])
    if original: subprocess.run(['/usr/bin/security','list-keychains','-d','user','-s',*original], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    allowed_roots = {str(p) for p in roots()}
    for installed in manifest.get('installed', []):
        value, parent = installed.split('|', 1)
        if parent not in allowed_roots or str(uuid.UUID(value)) != value.lower(): raise ValueError('Invalid cleanup profile target')
        (Path(parent)/(value+'.mobileprovision')).unlink(missing_ok=True)
    for name in ('distribution.p12','distribution.mobileprovision','export.plist','signing-settings.json','cleanup.json'):
        (folder/name).unlink(missing_ok=True)

if __name__ == '__main__':
    try:
        if len(sys.argv) != 3 or sys.argv[1] not in ('setup','cleanup'): raise ValueError('Usage: ios-distribution.py setup|cleanup PRIVATE_TEMP_DIRECTORY')
        (setup if sys.argv[1]=='setup' else cleanup)(Path(sys.argv[2]).resolve())
    except (ValueError, OSError, plistlib.InvalidFileException) as error:
        raise SystemExit('FAIL: '+str(error))
