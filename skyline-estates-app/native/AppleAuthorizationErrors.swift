import Foundation
import AuthenticationServices

// Return only a fixed code, never Apple's localized message, userInfo or credentials.
enum SkylineAppleAuthorizationErrors {
    static func code(_ error: NSError) -> String? {
        guard error.domain == ASAuthorizationError.errorDomain else { return nil }
        switch error.code {
        case 1000...1006: return "apple/\(error.code)"
        default: return "apple/unknown"
        }
    }
}
