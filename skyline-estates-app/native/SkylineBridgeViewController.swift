import Capacitor

@objc(SkylineBridgeViewController)
class SkylineBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        if #available(iOS 15.0, *) {
            bridge?.registerPluginInstance(SkylineStoreKitPlugin())
        }
    }
}
