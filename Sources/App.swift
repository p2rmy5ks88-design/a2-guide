import SwiftUI

@main
struct Archero2GuideApp: App {
    var body: some Scene {
        WindowGroup {
            GuideWebView()
                .ignoresSafeArea()
                .background(Color(uiColor: GuideWebView.backgroundColor).ignoresSafeArea())
        }
    }
}
