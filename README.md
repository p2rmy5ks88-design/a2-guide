# A2 Guide — iPhone app

The Archero 2 Field Guide packaged as a real iPhone app. It keeps your checklists,
saved loadouts and runes between launches, and opens web links in Safari.

**Offline and online:**
- **Offline:** the app shows the last guide it downloaded (or the copy built into the app).
- **Online:** every time you open the app, it downloads the latest guide from your GitHub
  repository. If anything changed (new heroes, events, builds), the guide reloads with the
  new content. No rebuild, no re-sideloading. Your saved data is kept.

An `.ipa` can only be compiled on a Mac. This project lets GitHub's free Mac build
servers compile it for you, so you never need a Mac yourself.

## 1. Build the .ipa on GitHub (once, about 10 minutes)

1. Create a free account at github.com and sign in.
2. Click **+ → New repository**. Name it `a2-guide`, choose **Public**, and click **Create repository**.
   It must be Public so the app can download guide updates without a password.
   Nothing private is stored in it.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `Archero2Guide-iOS.zip` on your computer, open the `Archero2Guide-iOS` folder,
   select **everything inside it** (including the `.github` folder) and drag it into the
   browser. Click **Commit changes**.
   - Can't see `.github`? On Windows, turn on View → Show → Hidden items. On a Mac, press Cmd+Shift+.
5. Open the **Actions** tab. If asked, click **I understand my workflows, go ahead and enable them**.
6. Click **Build IPA** on the left, then **Run workflow → Run workflow**.
7. Wait for the green tick (about 5 minutes). Click the run, scroll to **Artifacts**,
   and download **Archero2Guide-ipa**. Unzip it to get `Archero2Guide.ipa`.

## 2. Sideload it onto your iPhone

**Sideloadly** (Windows or Mac, free — sideloadly.io)

1. Windows only: install iTunes and iCloud from Apple's website (not the Microsoft Store versions).
2. Connect your iPhone by cable and tap **Trust** on the phone.
3. Open Sideloadly, drag in `Archero2Guide.ipa`, type your Apple ID, click **Start**.
4. On the iPhone: **Settings → General → VPN & Device Management** → tap your Apple ID → **Trust**.
5. iOS 16 or newer: **Settings → Privacy & Security → Developer Mode** → on, then restart.

**AltStore** (altstore.io) works the same way and can refresh the app over Wi‑Fi.

### Good to know

- With a free Apple ID the app stops opening after **7 days**. Run it through Sideloadly again
  (or let AltStore refresh it); your saved data stays.
- A free Apple ID can have up to 3 sideloaded apps at a time.
- A paid Apple Developer account ($99/year) signs for a full year.

## 3. Updating the guide (new heroes, events, builds)

All content lives in one file: `Resources/www/index.html`.

1. In your GitHub repository, open `Resources/www` → **Add file → Upload files**, drop in the
   new `index.html`, and click **Commit changes**.
2. Open the app with internet. It downloads the new guide and reloads by itself
   (GitHub can take up to 5 minutes to serve the new file).

That's it: no rebuild and no re-sideloading for content updates. You only rebuild the
`.ipa` if the Swift app code itself changes.

## Project layout

```
.github/workflows/build-ipa.yml   GitHub build: XcodeGen → xcodebuild → unsigned .ipa
project.yml                       Xcode project definition (XcodeGen)
Sources/App.swift                 App entry point
Sources/GuideWebView.swift        Full-screen web view; serves the guide offline
Resources/www/index.html          The guide itself
Resources/Assets.xcassets         App icon
```

Have a Mac? `brew install xcodegen && xcodegen generate`, open `Archero2Guide.xcodeproj`,
pick your Apple ID under Signing & Capabilities, and press Run with your iPhone connected.

## If the build fails

Open the failed run in the Actions tab, copy the red error lines, and send them over;
the fix is usually a one-line change.
