# iOS keyboard warning

The previous native build entered HTML website fullscreen when starting a game. On iOS this can trigger a system anti-spoofing warning when typing. Native Capacitor builds now skip that request; their existing native window and orientation setup remain in control. Browser builds retain the fullscreen request and landscape attempt. No warning is suppressed or dismissed programmatically.

Validation: five focused regression cases passed (native skip, browser success, denied promise, unavailable API, synchronous error); ten property-rarity checks passed; generated standalone page and offline manifest are current. The local setup browser test could not navigate its localhost server (ERR_NETWORK_ACCESS_DENIED); CI browser and native build checks remain required. The older installed IPA is unchanged. Physical iOS confirmation on a new build remains required.
