#!/usr/bin/env bash
# Landscape-only, hidden status bar, no export-compliance prompt, and version numbers for the iOS project.
set -euo pipefail
cd "$(dirname "$0")/.."
P=ios/App/App/Info.plist
PB=/usr/libexec/PlistBuddy
set_key(){ $PB -c "Delete :$1" "$P" 2>/dev/null || true; $PB -c "Add :$1 $2 $3" "$P"; }
for k in UISupportedInterfaceOrientations "UISupportedInterfaceOrientations~ipad"; do
  $PB -c "Delete :$k" "$P" 2>/dev/null || true
  $PB -c "Add :$k array" "$P"
  $PB -c "Add :$k:0 string UIInterfaceOrientationLandscapeLeft" "$P"
  $PB -c "Add :$k:1 string UIInterfaceOrientationLandscapeRight" "$P"
done
set_key UIStatusBarHidden bool true
set_key UIViewControllerBasedStatusBarAppearance bool false
set_key UIRequiresFullScreen bool true
set_key ITSAppUsesNonExemptEncryption bool false
set_key NSPhotoLibraryAddUsageDescription string "Save your Skyline Showcase image to Photos only when you choose Save Image."
# UIScene lifecycle (required when built with the iOS 27 SDK): Main.storyboard loads into the scene window.
M=UIApplicationSceneManifest; C=":$M:UISceneConfigurations:UIWindowSceneSessionRoleApplication:0"
$PB -c "Delete :$M" "$P" 2>/dev/null || true
$PB -c "Add :$M dict" -c "Add :$M:UIApplicationSupportsMultipleScenes bool false" -c "Add :$M:UISceneConfigurations dict" \
  -c "Add :$M:UISceneConfigurations:UIWindowSceneSessionRoleApplication array" -c "Add $C dict" \
  -c "Add $C:UISceneConfigurationName string Default" \
  -c "Add $C:UISceneDelegateClassName string App.SkylineSceneDelegate" \
  -c "Add $C:UISceneStoryboardFile string Main" "$P"
set_key CFBundleDisplayName string "Skyline Estates"
set_key CFBundleShortVersionString string "${VERSION_NAME:-1.0.0}"
set_key CFBundleVersion string "${VERSION_CODE:-1}"
PBX=ios/App/App.xcodeproj/project.pbxproj
if [ -f "$PBX" ]; then
  sed -i '' -E 's/(INFOPLIST_KEY_UISupportedInterfaceOrientations[^=]*= )"[^"]*"/\1"UIInterfaceOrientationLandscapeLeft UIInterfaceOrientationLandscapeRight"/' "$PBX"
fi
node scripts/native-firebase-config.mjs ios
ruby scripts/configure-apple-auth.rb
echo "iOS patched: landscape only, status bar hidden, version ${VERSION_NAME:-1.0.0} (${VERSION_CODE:-1})"
