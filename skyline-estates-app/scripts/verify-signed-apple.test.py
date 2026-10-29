import copy
import datetime as dt
import importlib.util
import unittest
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

if __name__ == '__main__': unittest.main()
