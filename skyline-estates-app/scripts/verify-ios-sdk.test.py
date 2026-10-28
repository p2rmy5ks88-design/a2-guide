import importlib.util
import unittest
from pathlib import Path
spec = importlib.util.spec_from_file_location('sdk', Path(__file__).with_name('verify-ios-sdk.py'))
sdk = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sdk)

class ToolchainTests(unittest.TestCase):
    def test_supported(self):
        for version in ('26.0', '26.6', '27.0'):
            self.assertTrue(sdk.verify('toolchain', 'Xcode '+version+'\nBuild version 17A100\n'+version+'\n'))
    def test_old_or_missing(self):
        for text in ('Xcode 16.4\nBuild version 16F6\n18.5', 'Xcode 26.0\n18.5', 'Xcode 16.4\n26.0', 'Xcode 26.0', ''):
            with self.assertRaises(ValueError): sdk.verify('toolchain', text)
    def test_device_and_old_minimum(self):
        self.assertTrue(sdk.verify('binary', 'cmd LC_BUILD_VERSION\n platform IOS\n minos 14.0\n sdk 26.6\n'))
    def test_reject_simulator_old_sdk_and_mixed_slices(self):
        valid = 'cmd LC_BUILD_VERSION\n platform IOS\n sdk 26.6\n'
        for invalid in ('', 'cmd LC_BUILD_VERSION\n platform IOSSIMULATOR\n sdk 26.6', 'cmd LC_BUILD_VERSION\n platform IOS\n sdk 18.5', valid+'cmd LC_BUILD_VERSION\n platform IOS\n sdk 18.5'):
            with self.assertRaises(ValueError): sdk.verify('binary', invalid)
if __name__ == '__main__': unittest.main()
