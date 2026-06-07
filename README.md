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

## Next step: connect phone with Wireless Debugging

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

