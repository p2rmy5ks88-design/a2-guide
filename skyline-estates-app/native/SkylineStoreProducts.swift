import Foundation

// Native allowlist includes historical packs only for transaction recovery.
// Coin amounts and ownership are decided by the authenticated server, never here.
enum SkylineStoreProducts {
    static let prefix = "com.kenstylez.skylineestates."
    static let saleIDs = Set(["coins_600", "coins_1500", "coins_4000", "coins_10000"].map { prefix + $0 })
    static let recoverableIDs = saleIDs.union(["coins_500", "coins_1200", "coins_3000", "coins_7000"].map { prefix + $0 })

    static func accountToken(_ value: String?) -> UUID? {
        guard let value, value.count == 36,
              value.range(of: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", options: .regularExpression) != nil,
              let uuid = UUID(uuidString: value), uuid != UUID(uuidString: "00000000-0000-0000-0000-000000000000") else { return nil }
        return uuid
    }
}
