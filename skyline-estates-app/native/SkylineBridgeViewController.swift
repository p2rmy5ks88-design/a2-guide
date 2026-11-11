import Capacitor
import Foundation
import UIKit

@objc(SkylineBridgeViewController)
class SkylineBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SkylineAwakePlugin())
        if #available(iOS 15.0, *) {
            bridge?.registerPluginInstance(SkylineStoreKitPlugin())
            bridge?.registerPluginInstance(SkylineSharePlugin())
        }
    }
}

// Local PNG sharing only. No paths, purchases, account tokens or network access.
@available(iOS 15.0, *)
@objc(SkylineSharePlugin)
public class SkylineSharePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SkylineSharePlugin"
    public let jsName = "SkylineShare"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "shareImage", returnType: CAPPluginReturnPromise)]

    @objc func shareImage(_ call: CAPPluginCall) {
        guard let encoded = call.getString("base64"), encoded.utf8.count <= 14_000_000,
              let data = Data(base64Encoded: encoded), data.count <= 10_000_000,
              data.starts(with: [137, 80, 78, 71, 13, 10, 26, 10]),
              let image = UIImage(data: data), image.size.width <= 4096, image.size.height <= 4096 else {
            call.reject("A valid Showcase PNG is required", "share/invalid-image"); return
        }
        let text = String((call.getString("text") ?? "My Skyline Â· Skyline Estates").prefix(500))
        DispatchQueue.main.async { [weak self] in
            guard let owner = self?.bridge?.viewController, owner.presentedViewController == nil else {
                call.reject("Close the current sheet before sharing", "share/busy"); return
            }
            let file = FileManager.default.temporaryDirectory.appendingPathComponent("skyline-\(UUID().uuidString).png")
            do { try data.write(to: file, options: .atomic) }
            catch { call.reject("The image could not be prepared", "share/storage"); return }
            let sheet = UIActivityViewController(activityItems: [file, text], applicationActivities: nil)
            if let popover = sheet.popoverPresentationController {
                popover.sourceView = owner.view
                popover.sourceRect = CGRect(x: owner.view.bounds.midX, y: owner.view.bounds.maxY - 1, width: 1, height: 1)
                popover.permittedArrowDirections = []
            }
            sheet.completionWithItemsHandler = { _, completed, _, error in
                try? FileManager.default.removeItem(at: file)
                if error != nil { call.reject("The image could not be shared", "share/unavailable") }
                else { call.resolve(["completed": completed]) }
            }
            owner.present(sheet, animated: true)
        }
    }
}

// Keeps the screen on while a match is in progress, so the phone does not dim and lock mid-game.
// The game turns it on when a match starts and off on the menus, at the results screen and when the app leaves.
@objc(SkylineAwakePlugin)
public class SkylineAwakePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SkylineAwakePlugin"
    public let jsName = "SkylineAwake"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)]

    @objc func set(_ call: CAPPluginCall) {
        let on = call.getBool("on") ?? false
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = on
            call.resolve(["on": on])
        }
    }
}
