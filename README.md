# derStandard APK Comment Ranker Mod

Goal: integrate the derStandard Comment Ranker behavior directly into the Android app package `derstandard.at.istandardx`.

This project is intentionally structured as a reproducible personal-use patch workflow:

- Pull the installed APK or split APKs from your own Android device via ADB.
- Inspect whether the forum/comments view is WebView-based or native.
- If WebView-based, inject the existing comment-ranker JavaScript into the app WebView.
- If native, identify the comment list model/adapter and patch sorting there.
- Package the result through a Morphe/ReVanced-style patch bundle where feasible.

No signature, licensing, payment, server, or entitlement checks are bypassed here.

## Current package target

Google Play package for `DER STANDARD Nachrichten`:

```text
derstandard.at.istandardx
```

## Setup already done

- Android SDK platform-tools are available locally.
- Apktool `3.0.2` downloaded to `tools/`.
- jadx `1.5.5` downloaded to `tools/`.
- Morphe patches template cloned into `patch-bundle/`.

The Morphe template currently requires GitHub Packages credentials for the `app.morphe.patches` Gradle plugin. See `docs/RESEARCH.md`.

## Implemented patch path

The pulled production APK uses an internal Android `WebView` for derstandard.at pages:

- `derstandard.at.istandardx.features.webview.fragment.WebViewViewModel`
- anonymous client class `WebViewViewModel$webViewClient$1`
- hook method: `onPageFinished(WebView webView, String url)`

The current patch injects:

- `assets/extension/content.js`
- `assets/extension/rating.js`
- a small `chrome.storage.sync` compatibility shim backed by WebView `localStorage`

Injected assets are copied into:

```text
assets/dst-ranker/
```

The helper class added to the APK decode tree is:

```text
derstandard.at.istandardx.features.webview.fragment.CommentRankerInjector
```

## Current device install status

The original Play Store-signed app was removed and the debug-signed patched split install was installed successfully via:

```powershell
adb uninstall derstandard.at.istandardx
adb install-multiple `
  dist\signed\base-ranker-signed.apk `
  dist\signed\split_config.arm64_v8a-signed.apk `
  dist\signed\split_config.xxhdpi-signed.apk
```

Smoke test:

- App starts through the launcher intent.
- Logcat showed WebView activity and no immediate app crash.
- Observed CleverPush network errors are unrelated to the patch.

## Rebuild flow

```powershell
.\scripts\pull-derstandard-apk.ps1 -DeviceSerial "192.168.123.160:34525" -User 0
.\scripts\inspect-apk.ps1
.\scripts\decode-apk.ps1
.\scripts\apply-webview-injection-patch.ps1
java -jar tools\apktool_3.0.2.jar b analysis\decompiled\apktool\base -o dist\base-ranker-unsigned.apk
```

Then zipalign/sign `dist\base-ranker-unsigned.apk` plus the two split APKs with the same signing key and install with `adb install-multiple`.

## Wireless Debugging workflow

On the phone:

1. Enable Developer options.
2. Enable Wireless Debugging.
3. Open `Pair device with pairing code`.
4. Run:

```powershell
.\scripts\pair-wireless-adb.ps1 -PairHostPort "PHONE_IP:PAIR_PORT" -PairCode "123456" -ConnectHostPort "PHONE_IP:DEBUG_PORT"
```

Then pull the APK:

```powershell
.\scripts\pull-derstandard-apk.ps1
```

Then inspect:

```powershell
.\scripts\inspect-apk.ps1
.\scripts\decode-apk.ps1
```
