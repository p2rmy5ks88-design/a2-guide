# iOS keyboard warning

The previous native build entered HTML website fullscreen when starting a game. On iOS this can trigger a system anti-spoofing warning when typing. Native Capacitor builds now skip that request; their existing native window and orientation setup remain in control. Browser builds retain the fullscreen request and landscape attempt. No warning is suppressed or dismissed programmatically.

Validation: five focused regression cases passed (native skip, browser success, denied promise, unavailable API, synchronous error); ten property-rarity checks passed; generated standalone page and offline manifest are current. The local setup browser test could not navigate its localhost server (ERR_NETWORK_ACCESS_DENIED); CI browser and native build checks remain required. The older installed IPA is unchanged. Physical iOS confirmation on a new build remains required.

CI follow-up: all five runs passed at d47612c05f7850c452aa7ec93e4fb3f64bd2f3c3. Browser setup and 41 property parity checks passed with zero page errors. iOS 1.0.29 unsigned ARM64 and simulator builds passed; the physical device check is still pending. See ACCOUNTS-DELIVERY-RESULTS.md for run links.

Owner acceptance, 29 October 2026: user reported that testing iOS 1.0.29 works. The reported native fullscreen warning is accepted as resolved on the owner device. This does not establish Apple sign-in or store-purchase acceptance.
