import assert from 'node:assert/strict';
import {patchHelper} from './patch-native-apple-errors.mjs';
const fixture='    public static func createErrorCode(error: Error?) -> String? {\n        if let error = error as NSError? {\n            // Existing Firebase mapping remains here.\n        }\n    }';
const patched=patchHelper(fixture);assert.equal(patchHelper(patched),patched);assert.ok(patched.includes('SkylineAppleAuthorizationErrors.code(error)'));assert.ok(patched.includes('// Existing Firebase mapping remains here.'));assert.equal(patchHelper(fixture.replaceAll('\n','\r\n')),patched);assert.throws(()=>patchHelper('unexpected upstream implementation'));
console.log('PASS pinned Apple error patch, idempotence and upstream drift guard');
