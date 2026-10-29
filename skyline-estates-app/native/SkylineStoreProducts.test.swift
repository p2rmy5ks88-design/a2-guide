import Foundation

@main struct SkylineStoreProductTests {
    static func main() {
        precondition(SkylineStoreProducts.saleIDs.count == 4)
        precondition(SkylineStoreProducts.recoverableIDs.count == 8)
        precondition(!SkylineStoreProducts.saleIDs.contains(SkylineStoreProducts.prefix + "coins_500"))
        precondition(SkylineStoreProducts.recoverableIDs.contains(SkylineStoreProducts.prefix + "coins_500"))
        for value in [nil, "", "00000000-0000-0000-0000-000000000000", "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeee", "{aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee}", "user-email@example.com"] as [String?] {
            precondition(SkylineStoreProducts.accountToken(value) == nil)
        }
        precondition(SkylineStoreProducts.accountToken("aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee") != nil)
        precondition(SkylineStoreProducts.accountToken("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE") != nil)
        print("PASS StoreKit product allowlist and opaque account binding validation")
    }
}
