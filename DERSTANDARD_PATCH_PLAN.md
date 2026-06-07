# derStandard Patch Plan

Target package:

```text
derstandard.at.istandardx
```

This bundle is scaffolded but intentionally does not yet include a complete Morphe bytecode patch. The concrete patch has been proven manually against the pulled APK and can now be ported to a Morphe patch.

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

Manual proof patch:

1. Copy `content.js`, `rating.js`, and `bootstrap.js` into `assets/dst-ranker/`.
2. Add `CommentRankerInjector.smali` under:
   `smali_classes4/derstandard/at/istandardx/features/webview/fragment/`.
3. In `WebViewViewModel$webViewClient$1.smali`, patch:
   `onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V`
4. Preserve the original `url` parameter in `v2`.
5. Call:

```smali
invoke-static {p1, v2}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->inject(Landroid/webkit/WebView;Ljava/lang/String;)V
```

The Morphe implementation should fingerprint this anonymous WebViewClient by:

- class extends `Landroid/webkit/WebViewClient;`
- method name `onPageFinished`
- invokes `WebViewViewModel;->access$loadOpenType(...)V`
- invokes `WebView;->sendAccessibilityEvent(I)V`
- class path contains `features/webview/fragment/WebViewViewModel$webViewClient$1`

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
