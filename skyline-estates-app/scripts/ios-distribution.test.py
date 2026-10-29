import datetime as dt
import importlib.util
import unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('distribution',Path(__file__).with_name('ios-distribution.py'))
d=importlib.util.module_from_spec(spec)
spec.loader.exec_module(d)
class DistributionProfileTests(unittest.TestCase):
    def setUp(self):
        self.p={'TeamIdentifier':[d.verifier.TEAM], 'Entitlements':{'application-identifier':d.verifier.TEAM+'.'+d.verifier.BUNDLE,'com.apple.developer.team-identifier':d.verifier.TEAM,d.verifier.APPLE:['Default'],'get-task-allow':False},'ExpirationDate':dt.datetime.now(dt.timezone.utc)+dt.timedelta(days=30),'DeveloperCertificates':[b'fixture certificate'],'UUID':'12345678-1234-1234-1234-123456789ABC'}
    def test_store_profile_selects_exact_certificate_and_uuid(self):
        value,fingerprint=d.profile_config(self.p)
        self.assertEqual(value,self.p['UUID'])
        self.assertEqual(len(fingerprint),40)
    def test_development_and_adhoc_profiles_rejected(self):
        for dev in (False,True):
            with self.subTest(development=dev):
                self.p['Entitlements']['get-task-allow']=dev
                self.p['ProvisionedDevices']=['synthetic-device']
                with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_empty_device_allowlist_is_not_store_profile(self):
        self.p['ProvisionedDevices']=[]
        with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_enterprise_profile_rejected(self):
        self.p['ProvisionsAllDevices']=True
        with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_uuid_cannot_be_used_as_path_traversal(self):
        for value in ('../../another-file',None,'not-a-uuid'):
            self.p['UUID']=value
            with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_multiple_or_missing_certificates_rejected(self):
        for certs in ([],[b'a',b'b'],['not-DER-bytes']):
            self.p['DeveloperCertificates']=certs
            with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_apple_permission_missing_rejected(self):
        del self.p['Entitlements'][d.verifier.APPLE]
        with self.assertRaises(ValueError): d.profile_config(self.p)
    def test_wrong_app_profile_rejected(self):
        self.p['Entitlements']['application-identifier'] += '.other'
        with self.assertRaises(ValueError): d.profile_config(self.p)
if __name__=='__main__': unittest.main()
