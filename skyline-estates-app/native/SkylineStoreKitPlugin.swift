import Foundation
import Capacitor
import StoreKit

@available(iOS 15.0, *)
@objc(SkylineStoreKitPlugin)
public class SkylineStoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SkylineStoreKitPlugin"
    public let jsName = "SkylineStoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "products", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "unfinished", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise)
    ]
    private var updates: Task<Void, Never>?
    @MainActor private var purchaseInProgress = false
    @MainActor private var transactions: [String: StoreKit.Transaction] = [:]

    override public func load() {
        updates = Task { [weak self] in
            for await result in StoreKit.Transaction.updates {
                guard let self else { return }
                await self.publish(result)
            }
        }
    }
    deinit { updates?.cancel() }

    @MainActor private func record(_ result: VerificationResult<StoreKit.Transaction>) -> [String: Any]? {
        guard case .verified(let transaction) = result,
              transaction.productType == .consumable,
              SkylineStoreProducts.recoverableIDs.contains(transaction.productID),
              let account = transaction.appAccountToken else { return nil }
        let id = String(transaction.id)
        transactions[id] = transaction
        return ["store": "apple", "id": id, "productId": transaction.productID,
                "appAccountToken": account.uuidString.lowercased(),
                "proof": ["signedTransaction": result.jwsRepresentation]]
    }
    @MainActor private func publish(_ result: VerificationResult<StoreKit.Transaction>) {
        if let value = record(result) {
            // Only a signed proof is sent to the JS delivery coordinator. No
            // local coin grant and no automatic transaction completion occur.
            notifyListeners("purchaseUpdated", data: value)
        }
    }

    @objc func products(_ call: CAPPluginCall) {
        Task { @MainActor in
            do {
                let products = try await Product.products(for: SkylineStoreProducts.saleIDs)
                let rows: [[String: Any]] = products.filter { $0.type == .consumable }.map {
                    ["id": $0.id, "title": $0.displayName, "description": $0.description, "displayPrice": $0.displayPrice]
                }
                call.resolve(["products": rows, "canMakePayments": AppStore.canMakePayments])
            } catch { call.reject("The App Store could not load products. Try again when connected.", "store/products-unavailable") }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard !purchaseInProgress else { call.reject("A purchase is already in progress.", "store/busy"); return }
            guard AppStore.canMakePayments else { call.reject("Purchases are restricted on this device.", "store/payments-restricted"); return }
            guard let id = call.getString("productId"), SkylineStoreProducts.saleIDs.contains(id),
                  let account = SkylineStoreProducts.accountToken(call.getString("appAccountToken")) else {
                call.reject("Sign in and load the verified store account before purchasing.", "store/invalid-purchase"); return
            }
            purchaseInProgress = true
            defer { purchaseInProgress = false }
            do {
                guard let product = try await Product.products(for: [id]).first, product.type == .consumable else {
                    call.reject("This product is not available in the App Store.", "store/product-unavailable"); return
                }
                switch try await product.purchase(options: [.appAccountToken(account)]) {
                case .success(let result):
                    guard let value = record(result) else {
                        call.reject("The transaction could not be verified. It has not been completed.", "store/unverified-transaction"); return
                    }
                    call.resolve(["state": "purchased", "transaction": value])
                case .pending: call.resolve(["state": "pending"])
                case .userCancelled: call.resolve(["state": "cancelled"])
                @unknown default: call.resolve(["state": "pending"])
                }
            } catch { call.reject("The App Store could not complete this request. Unfinished purchases will be checked again.", "store/purchase-unavailable") }
        }
    }

    @objc func unfinished(_ call: CAPPluginCall) {
        Task { @MainActor in
            var rows: [[String: Any]] = []
            for await result in StoreKit.Transaction.unfinished {
                if let value = record(result) { rows.append(value) }
                if rows.count == 100 { break }
            }
            call.resolve(["transactions": rows])
        }
    }

    @objc func finish(_ call: CAPPluginCall) {
        Task { @MainActor in
            guard let id = call.getString("transactionId"), id.range(of: "^[0-9]{1,30}$", options: .regularExpression) != nil,
                  call.getBool("durablyDelivered") == true else {
                call.reject("Verified wallet delivery is required before completing a purchase.", "store/delivery-required"); return
            }
            if transactions[id] == nil {
                for await result in StoreKit.Transaction.unfinished {
                    if case .verified(let value) = result, String(value.id) == id { _ = record(result); break }
                }
            }
            guard let transaction = transactions[id] else {
                call.reject("This unfinished transaction could not be found. Refresh purchases to check its status.", "store/transaction-not-found"); return
            }
            await transaction.finish()
            transactions.removeValue(forKey: id)
            call.resolve(["finished": true])
        }
    }
}
