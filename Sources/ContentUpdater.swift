import Foundation

/// Keeps the guide up to date without reinstalling the app.
///
/// - Offline: the app shows the last downloaded guide, or the copy bundled in the app.
/// - Online: on every launch it downloads the latest `index.html` from your GitHub
///   repository (the URL is filled in automatically by the GitHub build). If the file
///   changed, it is saved and the guide reloads. Saved checklists and loadouts are kept.
enum ContentUpdater {
    /// Set at build time from the A2_CONTENT_URL build setting (see project.yml / workflow).
    static var remoteURL: URL? {
        guard let raw = Bundle.main.object(forInfoDictionaryKey: "A2ContentURL") as? String,
              raw.hasPrefix("https://") else { return nil }
        return URL(string: raw)
    }

    /// Folder for downloaded content: Application Support/www
    static var cacheDir: URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        let dir = base.appendingPathComponent("www", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    static var bundledDir: URL? {
        Bundle.main.resourceURL?.appendingPathComponent("www", isDirectory: true)
    }

    /// After installing a new .ipa, drop the old download so the newer bundled guide shows even offline.
    static func clearCacheIfAppChanged() {
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        let size = (bundledDir.flatMap { try? Data(contentsOf: $0.appendingPathComponent("index.html")) }?.count) ?? 0
        let stamp = "\(build)-\(size)"
        let key = "A2BundledStamp"
        if UserDefaults.standard.string(forKey: key) != stamp {
            if let cache = cacheDir { try? FileManager.default.removeItem(at: cache.appendingPathComponent("index.html")) }
            UserDefaults.standard.set(stamp, forKey: key)
        }
    }

    /// Downloaded copy first, bundled copy as fallback.
    static func data(forRelativePath path: String) -> Data? {
        if let cache = cacheDir, let d = try? Data(contentsOf: cache.appendingPathComponent(path)) { return d }
        if let bundled = bundledDir, let d = try? Data(contentsOf: bundled.appendingPathComponent(path)) { return d }
        return nil
    }

    /// Downloads the latest guide. Calls `onUpdated` on the main thread only when the content changed.
    static func checkForUpdate(onUpdated: @escaping () -> Void) {
        guard let url = remoteURL, let cache = cacheDir else { return }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 15)
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")

        URLSession.shared.dataTask(with: request) { body, response, _ in
            guard let body = body,
                  let http = response as? HTTPURLResponse, http.statusCode == 200,
                  let html = String(data: body, encoding: .utf8),
                  html.contains("Archero 2 Field Guide"),          // sanity check: it's really the guide
                  html.contains("</html>") else { return }           // and it downloaded completely

            let target = cache.appendingPathComponent("index.html")
            if let current = ContentUpdater.data(forRelativePath: "index.html"), current == body { return }
            do {
                try body.write(to: target, options: .atomic)
                DispatchQueue.main.async { onUpdated() }
            } catch { }
        }.resume()
    }
}
