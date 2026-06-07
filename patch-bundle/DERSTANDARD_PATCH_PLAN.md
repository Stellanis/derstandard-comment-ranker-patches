# derStandard Patch Plan

Target package:

```text
derstandard.at.istandardx
```

This bundle is scaffolded but intentionally does not yet include an executable patch. The concrete patch must be written after analyzing the current app APK, because Morphe/ReVanced bytecode patches need stable fingerprints against real methods/classes.

## Desired behavior

Add the existing browser extension's comment ranking feature directly inside the Android app:

- Top Balance
- Low Balance
- Top Likes
- Top Dislikes
- Timeline
- Preserve thread structure
- Preserve pinned/editorial comments
- Re-sort after "more comments" loads

## Preferred patch route

1. Pull installed APK/splits with `scripts/pull-derstandard-apk.ps1`.
2. Decode/decompile with `scripts/decode-apk.ps1`.
3. Search for WebView use:
   - `WebView`
   - `evaluateJavascript`
   - `WebViewClient`
   - `addJavascriptInterface`
4. If comments are WebView-rendered, patch WebView completion to inject `assets/extension/content.js` + `assets/extension/rating.js`.
5. If comments are native, fingerprint comment loading/sorting classes and patch the data ordering before adapter submission.

## Current build note

`app.morphe.patches` is resolved through GitHub Packages. Configure a GitHub PAT before building:

```properties
gpr.user=<github-user>
gpr.key=<github-token-with-package-read>
```

Place it in:

```text
%USERPROFILE%\.gradle\gradle.properties
```

