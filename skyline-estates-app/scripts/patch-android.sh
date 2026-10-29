#!/usr/bin/env bash
# Landscape-only, full screen, and version numbers for the Android project made by `npx cap add android`.
set -euo pipefail
cd "$(dirname "$0")/.."
M=android/app/src/main/AndroidManifest.xml
grep -q screenOrientation "$M" || sed -i.bak 's/<activity/<activity android:screenOrientation="sensorLandscape" android:resizeableActivity="true"/' "$M"
grep -q 'screenOrientation="sensorLandscape"' "$M" || { echo "Landscape lock not applied to $M"; exit 1; }
rm -f "$M.bak"
S=android/app/src/main/res/values/styles.xml
if ! grep -q windowFullscreen "$S"; then
  sed -i.bak 's#<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">#&\n        <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>#' "$S"; rm -f "$S.bak"
fi
G=android/app/build.gradle
VC="${VERSION_CODE:-1}"; VN="${VERSION_NAME:-1.0.0}"
sed -i.bak -E "s/versionCode [0-9]+/versionCode ${VC}/; s/versionName \"[^\"]*\"/versionName \"${VN}\"/" "$G"; rm -f "$G.bak"
node scripts/native-firebase-config.mjs android
echo "Android patched: landscape, fullscreen, versionCode ${VC}, versionName ${VN}"
