# Research Notes

## App target

The current Google Play package for `DER STANDARD Nachrichten` is:

```text
derstandard.at.istandardx
```

Google Play source found during research:

```text
https://play.google.com/store/apps/details?id=derstandard.at.istandardx
```

## Morphe

Morphe is an Android app modification tool based on prior ReVanced work. The public GitHub organization describes it as a tool that can modify Android apps, add/change features, customize UI/behavior, and remove unwanted restrictions.

Relevant sources:

- `https://github.com/MorpheApp`
- `https://github.com/MorpheApp/morphe-manager`
- `https://github.com/MorpheApp/morphe-patches-template`
- `https://morphe-patches.software/`

The Morphe patch template says custom patch repositories are added to Morphe by URL and that `buildAndroid` produces Android-usable patch bundles.

Current blocker in this environment:

```text
Plugin [id: 'app.morphe.patches', version: '1.3.2'] was not found
```

The Morphe Gradle plugin is published through GitHub Packages and requires credentials (`gpr.user`, `gpr.key`) even for the public package registry. This is documented in the plugin/template ecosystem.

## Tooling

Downloaded official tools:

- Apktool `3.0.2`
- jadx `1.5.5`

Existing Android SDK tools:

- `adb.exe`
- `aapt.exe`
- `aapt2.exe`
- `apksigner.bat`

## Candidate implementation paths

### Path A: WebView JavaScript injection

Best case. If the app renders article/forum/comment pages in Android WebView, patch the WebView setup or `WebViewClient.onPageFinished` and call:

```java
webView.evaluateJavascript(COMMENT_RANKER_SCRIPT, null);
```

This reuses the existing extension logic with minimal bytecode changes.

### Path B: Native adapter/list sorting

If comments are rendered natively, identify:

- comment DTO/model classes,
- positive/negative rating fields,
- root/reply relation fields,
- list adapter / RecyclerView adapter,
- loading path for "more comments".

Then patch sorting before adapter submit/update. This is more robust in-app but requires deeper reverse engineering.

### Path C: Runtime hook

Use LSPosed/Xposed-style runtime hooks instead of rebuilding the APK. This is less aligned with "mod the APK", but useful for proving the hook before baking it into a Morphe patch.

