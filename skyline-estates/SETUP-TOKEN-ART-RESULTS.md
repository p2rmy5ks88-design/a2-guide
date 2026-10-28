# Illustrated setup token buttons

The custom-game player seats inserted raw token emoji even after Collection moved to illustrated assets. The reference UI now decorates each setup seat with the exact itemPic artwork used in Collection and names the token in its accessible button label. Existing token IDs, unlock/uniqueness checks, tap-to-cycle handlers and saved slots remain unchanged. No gameplay source, economy, board artwork or 3D behavior changed.

Validation: 23 reference-dashboard browser checks passed with zero captured exceptions and WebGL disabled. The new setup case decodes all sixteen token images, checks six seats in light/dark themes at 1280x800, 844x390, 430x932 and 360x780, verifies image sizing/no page overflow and confirms tapping changes the image to the selected token without duplicating another active seat. Existing Collection/Portfolio upgrades and saved-match invariants also passed. Visual screenshot reviewed after explicitly waiting for the boot overlay to disappear. Generated offline manifest rebuilt.

The native wrapper already copies and byte-verifies reference-redesign.js, so a fresh native build includes this fix; previously downloaded IPAs cannot change retrospectively.
