import Foundation
import AuthenticationServices

@main
struct AppleAuthorizationErrorTests {
    static func main() {
        for code in 1000...1006 {
            let error = NSError(domain: ASAuthorizationError.errorDomain, code: code,
                                userInfo: [NSLocalizedDescriptionKey: "PRIVATE-FIXTURE", "token": "SECRET-FIXTURE"])
            precondition(SkylineAppleAuthorizationErrors.code(error) == "apple/\(code)")
        }
        precondition(SkylineAppleAuthorizationErrors.code(NSError(domain: ASAuthorizationError.errorDomain, code: 99999)) == "apple/unknown")
        precondition(SkylineAppleAuthorizationErrors.code(NSError(domain: "FIRAuthErrorDomain", code: 1000)) == nil)
        precondition(SkylineAppleAuthorizationErrors.code(NSError(domain: "UNTRUSTED-PRIVATE-FIXTURE", code: 1001)) == nil)
        print("PASS 10 native Apple error-domain and code privacy cases")
    }
}
