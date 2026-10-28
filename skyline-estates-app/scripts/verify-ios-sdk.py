"""Fail builds using old toolchains or a binary linked against an old device SDK."""
import re
import sys
from pathlib import Path

def verify(kind, text):
    if kind == 'toolchain':
        xcode = re.search(r'^Xcode (\d+)(?:\.\d+)*\s*$', text, re.M)
        sdk = re.search(r'^(\d+)(?:\.\d+)+\s*$', text, re.M)
        if not xcode or not sdk or min(int(xcode[1]), int(sdk[1])) < 26:
            raise ValueError('Xcode 26+ and iPhoneOS SDK 26+ are required')
    elif kind == 'binary':
        # vtool output must describe an iOS device LC_BUILD_VERSION, not a simulator.
        blocks = re.split(r'\bcmd LC_BUILD_VERSION\b', text)[1:]
        if not blocks or any(not re.search(r'^\s*platform IOS\s*$', b, re.M)
                             or not (m := re.search(r'^\s*sdk (\d+)(?:\.\d+)*\s*$', b, re.M))
                             or int(m[1]) < 26 for b in blocks):
            raise ValueError('Every binary slice must use the iOS device SDK 26+')
    else:
        raise ValueError('Unknown verification mode')
    return True

if __name__ == '__main__':
    try:
        verify(sys.argv[1], Path(sys.argv[2]).read_text())
    except (ValueError, IndexError) as error:
        sys.exit(str(error))
    print('PASS iOS 26 build requirement:', sys.argv[1])
