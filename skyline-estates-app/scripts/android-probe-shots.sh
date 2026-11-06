#!/usr/bin/env bash
# CI-only: install the validation APK, open six Living City scenes and screenshot each (landscape app).
set -uo pipefail
mkdir -p shots
APK=$(ls android/app/build/outputs/apk/debug/*.apk | head -1)
adb install -r "$APK"
adb shell getprop ro.build.version.sdk > shots/device.txt
aapt_dump=$(adb shell dumpsys package com.kenstylez.skylineestates | grep -E "targetSdk|versionName" | head -3); echo "$aapt_dump" >> shots/device.txt
for n in 1 2 3 4 5 6; do
  adb shell am start -n com.kenstylez.skylineestates/.MainActivity >/dev/null; sleep 50
  adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png "shots/android-$n.png" >/dev/null
  adb shell am force-stop com.kenstylez.skylineestates; sleep 3
done
# back gesture / lifecycle: background and resume once, then capture
adb shell am start -n com.kenstylez.skylineestates/.MainActivity >/dev/null; sleep 40
adb shell input keyevent KEYCODE_HOME; sleep 4; adb shell am start -n com.kenstylez.skylineestates/.MainActivity >/dev/null; sleep 6
adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png shots/android-resume.png >/dev/null
adb shell input keyevent KEYCODE_BACK; sleep 3; adb shell screencap -p /sdcard/s.png; adb pull /sdcard/s.png shots/android-back.png >/dev/null
adb shell pidof com.kenstylez.skylineestates >> shots/device.txt || echo "app not running after back" >> shots/device.txt
ls -la shots
