import SwiftUI
import UIKit
import WebKit

/// Shows the bundled guide (Resources/www/index.html) full screen.
/// The page is served from a custom "a2guide://" scheme so it gets a stable
/// origin and its saved data (checklists, loadouts, runes) persists between launches.
struct GuideWebView: UIViewRepresentable {
    static let scheme = "a2guide"
    static let startURL = URL(string: "a2guide://app/index.html")!

    /// Matches the page background: dark #13161D, light #F3F0E8.
    static let backgroundColor = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 0x13 / 255, green: 0x16 / 255, blue: 0x1D / 255, alpha: 1)
            : UIColor(red: 0xF3 / 255, green: 0xF0 / 255, blue: 0xE8 / 255, alpha: 1)
    }

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        config.setURLSchemeHandler(LocalFileSchemeHandler(), forURLScheme: Self.scheme)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = Self.backgroundColor
        webView.scrollView.backgroundColor = Self.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.allowsBackForwardNavigationGestures = false
        ContentUpdater.clearCacheIfAppChanged()
        webView.load(URLRequest(url: Self.startURL))

        // Online: fetch the latest guide; reload only if it changed. Offline: nothing happens.
        ContentUpdater.checkForUpdate { [weak webView] in
            webView?.reload()
        }
        // Check again whenever the app comes back to the foreground.
        context.coordinator.foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak webView] _ in
            ContentUpdater.checkForUpdate { webView?.reload() }
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var foregroundObserver: NSObjectProtocol?
        deinit { if let o = foregroundObserver { NotificationCenter.default.removeObserver(o) } }

        /// Keep the guide inside the app; open web links in Safari.
        func webView(_ webView: WKWebView,
                     decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.allow); return }
            let scheme = url.scheme?.lowercased() ?? ""
            if scheme == GuideWebView.scheme || scheme == "about" || scheme == "blob" || scheme == "data" {
                decisionHandler(.allow)
                return
            }
            if navigationAction.targetFrame?.isMainFrame ?? true {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            decisionHandler(.allow)
        }

        /// Links with target="_blank" land here.
        func webView(_ webView: WKWebView,
                     createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction,
                     windowFeatures: WKWindowFeatures) -> WKWebView? {
            if let url = navigationAction.request.url {
                UIApplication.shared.open(url)
            }
            return nil
        }
    }
}

/// Serves a2guide:// URLs: the downloaded guide if there is one, otherwise the copy bundled in the app.
final class LocalFileSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        var path = url.path
        if path.isEmpty || path == "/" { path = "/index.html" }
        let relative = String(path.dropFirst())
        let fileURL = URL(fileURLWithPath: relative)

        guard !relative.contains(".."),
              let data = ContentUpdater.data(forRelativePath: relative) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }

        let mimeTypes = ["html": "text/html", "css": "text/css", "js": "text/javascript",
                         "json": "application/json", "png": "image/png", "svg": "image/svg+xml"]
        let mime = mimeTypes[fileURL.pathExtension.lowercased()] ?? "application/octet-stream"
        let headers = ["Content-Type": mime.hasPrefix("text") ? "\(mime); charset=utf-8" : mime,
                       "Content-Length": String(data.count)]
        if let response = HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: headers) {
            urlSchemeTask.didReceive(response)
        }
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}
