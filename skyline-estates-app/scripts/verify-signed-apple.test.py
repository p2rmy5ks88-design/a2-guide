import copy
import datetime as dt
import importlib.util
import unittest
import unittest.mock as mock
import tempfile
import subprocess
import plistlib
import io
import contextlib
from pathlib import Path
spec = importlib.util.spec_from_file_location('signed', Path(__file__).with_name('verify-signed-apple.py'))
signed = importlib.util.module_from_spec(spec)
spec.loader.exec_module(signed)

class SigningTests(unittest.TestCase):
    def setUp(self):
        self.now = dt.datetime(2026, 10, 29, tzinfo=dt.timezone.utc)
        self.info = {'CFBundleIdentifier': signed.BUNDLE}
        self.ent = {'application-identifier': signed.TEAM+'.'+signed.BUNDLE, 'com.apple.developer.team-identifier': signed.TEAM, signed.APPLE: ['Default'], 'get-task-allow': True}
        self.profile = {'TeamIdentifier': [signed.TEAM], 'Entitlements': copy.deepcopy(self.ent), 'ExpirationDate': self.now+dt.timedelta(days=30), 'DeveloperCertificates': [b'test certificate'], 'ProvisionedDevices': ['synthetic-test-device']}
    def verify(self):
        return signed.validate(self.info, self.ent, self.profile, b'test certificate', self.now)
    def test_development(self):
        self.assertEqual(self.verify(), 'development')
    def test_distribution(self):
        self.ent['get-task-allow'] = False
        self.profile['Entitlements']['get-task-allow'] = False
        del self.profile['ProvisionedDevices']
        self.assertEqual(self.verify(), 'distribution')
    def test_source_entitlement_is_insufficient(self):
        del self.ent[signed.APPLE]
        with self.assertRaisesRegex(ValueError, 'Final signature'): self.verify()
    def test_profile_entitlement_required(self):
        del self.profile['Entitlements'][signed.APPLE]
        with self.assertRaisesRegex(ValueError, 'Profile does not allow'): self.verify()
    def test_wrong_bundle(self):
        self.info['CFBundleIdentifier'] += '.resigned'
        with self.assertRaises(ValueError): self.verify()
    def test_wrong_signed_id(self):
        self.ent['application-identifier'] += '.resigned'
        with self.assertRaises(ValueError): self.verify()
    def test_wildcard_profile_rejected(self):
        self.profile['Entitlements']['application-identifier'] = signed.TEAM+'.*'
        with self.assertRaises(ValueError): self.verify()
    def test_wrong_profile_team(self):
        self.profile['TeamIdentifier'] = ['OTHERTEAM']
        with self.assertRaises(ValueError): self.verify()
    def test_wrong_signed_team(self):
        self.ent['com.apple.developer.team-identifier'] = 'OTHERTEAM'
        with self.assertRaises(ValueError): self.verify()
    def test_expired_profile(self):
        self.profile['ExpirationDate'] = self.now-dt.timedelta(days=1)
        with self.assertRaises(ValueError): self.verify()
    def test_near_expiry(self):
        self.profile['ExpirationDate'] = self.now+dt.timedelta(hours=23)
        with self.assertRaises(ValueError): self.verify()
    def test_naive_plist_date(self):
        self.profile['ExpirationDate'] = self.profile['ExpirationDate'].replace(tzinfo=None)
        self.assertEqual(self.verify(), 'development')
    def test_certificate_mismatch(self):
        self.profile['DeveloperCertificates'] = [b'other certificate']
        with self.assertRaises(ValueError): self.verify()
    def test_no_certificate(self):
        with self.assertRaises(ValueError): signed.validate(self.info, self.ent, self.profile, b'', self.now)
    def test_development_needs_device(self):
        self.profile['ProvisionedDevices'] = []
        with self.assertRaises(ValueError): self.verify()
    def test_debug_profile_mismatch(self):
        self.profile['Entitlements']['get-task-allow'] = False
        with self.assertRaises(ValueError): self.verify()
    def test_malformed_apple_entitlement(self):
        self.ent[signed.APPLE] = 'Default'
        with self.assertRaises(ValueError): self.verify()


class InspectCommandTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.app = Path(self.temp.name) / 'App.app'
        self.app.mkdir()
        fixture = SigningTests()
        fixture.setUp()
        self.ent = fixture.ent
        self.profile = fixture.profile
        self.profile['ExpirationDate'] = dt.datetime.now(dt.timezone.utc).replace(tzinfo=None) + dt.timedelta(days=30)
        (self.app / 'Info.plist').write_bytes(plistlib.dumps(fixture.info))
        (self.app / 'GoogleService-Info.plist').write_bytes(plistlib.dumps({'BUNDLE_ID': signed.BUNDLE, 'GOOGLE_APP_ID': '1:668368365590:ios:03e33bfa0fd85930a32d37', 'PROJECT_ID': 'eko-estates'}))
        (self.app / 'embedded.mobileprovision').write_bytes(b'synthetic CMS input')
        self.calls = []
    def run_tool(self, args, **kwargs):
        self.calls.append(args)
        output = b''
        if '--entitlements' in args:
            output = plistlib.dumps(self.ent)
        elif 'cms' in args:
            output = plistlib.dumps(self.profile)
        elif any(a.startswith('--extract-certificates') for a in args):
            # Model getopt_long's optional argument: a separate prefix is an input path.
            option = next(a for a in args if a.startswith('--extract-certificates'))
            if '=' not in option:
                return subprocess.CompletedProcess(args, 1, b'', b'path treated as app input')
            Path(option.split('=', 1)[1] + '0').write_bytes(b'test certificate')
        return subprocess.CompletedProcess(args, 0, output, b'private native diagnostic')
    def test_full_inspection_exports_certificate_with_single_optional_argument(self):
        with mock.patch.object(signed.subprocess, 'run', side_effect=self.run_tool), contextlib.redirect_stdout(io.StringIO()) as output:
            signed.inspect(self.app)
        self.assertIn('PASS: final Apple signature', output.getvalue())
        self.assertEqual(len(self.calls), 4)
        extract = self.calls[-1]
        self.assertEqual(len(extract), 4)
        self.assertTrue(extract[2].startswith('--extract-certificates='))
    def test_unsigned_command_failure_stops_before_profile_decode(self):
        with mock.patch.object(signed.subprocess, 'run', return_value=subprocess.CompletedProcess([], 1, b'', b'secret identity diagnostic')) as run:
            with self.assertRaisesRegex(ValueError, 'signature integrity') as caught:
                signed.inspect(self.app)
        self.assertEqual(run.call_count, 1)
        self.assertNotIn('secret', str(caught.exception))
    def test_certificate_extraction_failure_identifies_stage_without_raw_details(self):
        def fail_extract(args, **kwargs):
            if any(a.startswith('--extract-certificates') for a in args):
                return subprocess.CompletedProcess(args, 2, b'', b'private identity diagnostic')
            return self.run_tool(args, **kwargs)
        with mock.patch.object(signed.subprocess, 'run', side_effect=fail_extract):
            with self.assertRaisesRegex(ValueError, 'certificate extraction.*exit 2') as caught:
                signed.inspect(self.app)
        self.assertNotIn('private', str(caught.exception))
    def test_real_profile_apple_permission_still_required_after_extraction(self):
        del self.profile['Entitlements'][signed.APPLE]
        with mock.patch.object(signed.subprocess, 'run', side_effect=self.run_tool):
            with self.assertRaisesRegex(ValueError, 'Profile does not allow'):
                signed.inspect(self.app)
    def test_bundled_firebase_project_mismatch_still_rejected(self):
        (self.app / 'GoogleService-Info.plist').write_bytes(plistlib.dumps({'BUNDLE_ID': signed.BUNDLE, 'PROJECT_ID': 'different-project'}))
        with mock.patch.object(signed.subprocess, 'run', side_effect=self.run_tool):
            with self.assertRaisesRegex(ValueError, 'Firebase application/project mismatch'):
                signed.inspect(self.app)

if __name__ == '__main__': unittest.main()
