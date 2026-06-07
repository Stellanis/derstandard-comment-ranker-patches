param(
  [string]$DecodedDir = "analysis\decompiled\apktool\base",
  [string]$ExtensionAssetDir = "assets\extension"
)

. "$PSScriptRoot\common.ps1"

$decodedPath = Join-Path $RepoRoot $DecodedDir
$extensionPath = Join-Path $RepoRoot $ExtensionAssetDir
if (-not (Test-Path -LiteralPath $decodedPath)) {
  throw "Decoded APK not found at $decodedPath. Run decode-apk.ps1 first."
}
if (-not (Test-Path -LiteralPath $extensionPath)) {
  throw "Extension assets not found at $extensionPath."
}

$assetOut = Join-Path $decodedPath "assets\dst-ranker"
New-Item -ItemType Directory -Force -Path $assetOut | Out-Null
Copy-Item -LiteralPath (Join-Path $extensionPath "content.js") -Destination (Join-Path $assetOut "content.js") -Force
Copy-Item -LiteralPath (Join-Path $extensionPath "rating.js") -Destination (Join-Path $assetOut "rating.js") -Force

$bootstrap = @'
(function () {
  if (!window.chrome) window.chrome = {};
  if (!window.chrome.storage) window.chrome.storage = {};
  if (!window.chrome.storage.sync) {
    window.chrome.storage.sync = {
      get: function (keys, callback) {
        var result = {};
        var read = function (key) {
          var raw = window.localStorage.getItem("dstRanker:" + key);
          if (raw !== null) {
            try { result[key] = JSON.parse(raw); } catch (_) { result[key] = raw; }
          }
        };
        if (Array.isArray(keys)) {
          keys.forEach(read);
        } else if (typeof keys === "string") {
          read(keys);
        } else if (keys && typeof keys === "object") {
          Object.keys(keys).forEach(function (key) {
            read(key);
            if (result[key] === undefined) result[key] = keys[key];
          });
        }
        if (typeof callback === "function") callback(result);
      },
      set: function (items, callback) {
        Object.keys(items || {}).forEach(function (key) {
          window.localStorage.setItem("dstRanker:" + key, JSON.stringify(items[key]));
        });
        if (typeof callback === "function") callback();
      }
    };
  }
  if (!window.chrome.runtime) {
    window.chrome.runtime = { onMessage: { addListener: function () {} } };
  }
  window.__dstRankerInjected = window.__dstRankerInjected || false;
})();
'@
Set-Content -LiteralPath (Join-Path $assetOut "bootstrap.js") -Value $bootstrap -Encoding UTF8

$helperDir = Join-Path $decodedPath "smali_classes4\derstandard\at\istandardx\features\webview\fragment"
$helperPath = Join-Path $helperDir "CommentRankerInjector.smali"
$helper = @'
.class public final Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;
.super Ljava/lang/Object;
.source "CommentRankerInjector.java"


# direct methods
.method public constructor <init>()V
    .locals 0

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method

.method public static inject(Landroid/webkit/WebView;Ljava/lang/String;)V
    .locals 4

    if-eqz p0, :return
    if-eqz p1, :return

    const-string v0, "derstandard.at"
    invoke-virtual {p1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v0
    if-nez v0, :allowed

    const-string v0, "derstandard.de"
    invoke-virtual {p1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v0
    if-eqz v0, :return

    :allowed
    :try_start
    invoke-virtual {p0}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v0

    const-string v1, "dst-ranker/bootstrap.js"
    invoke-static {v0, v1}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    const/4 v2, 0x0
    invoke-virtual {p0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    const-string v1, "dst-ranker/content.js"
    invoke-static {v0, v1}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->readWrappedAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    invoke-virtual {p0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    const-string v1, "dst-ranker/rating.js"
    invoke-static {v0, v1}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->readWrappedAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {p0, v0, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V
    :try_end
    .catch Ljava/lang/Throwable; {:try_start .. :try_end} :catch_all

    goto :return

    :catch_all
    move-exception v0
    invoke-virtual {v0}, Ljava/lang/Throwable;->printStackTrace()V

    :return
    return-void
.end method

.method private static readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .locals 5

    invoke-virtual {p0}, Landroid/content/Context;->getAssets()Landroid/content/res/AssetManager;
    move-result-object p0
    invoke-virtual {p0, p1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;
    move-result-object p0

    new-instance p1, Ljava/io/BufferedReader;
    new-instance v0, Ljava/io/InputStreamReader;
    const-string v1, "UTF-8"
    invoke-direct {v0, p0, v1}, Ljava/io/InputStreamReader;-><init>(Ljava/io/InputStream;Ljava/lang/String;)V
    invoke-direct {p1, v0}, Ljava/io/BufferedReader;-><init>(Ljava/io/Reader;)V

    new-instance v0, Ljava/lang/StringBuilder;
    invoke-direct {v0}, Ljava/lang/StringBuilder;-><init>()V

    :loop
    invoke-virtual {p1}, Ljava/io/BufferedReader;->readLine()Ljava/lang/String;
    move-result-object v1
    if-eqz v1, :done
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v1, "\n"
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :loop

    :done
    invoke-virtual {p1}, Ljava/io/BufferedReader;->close()V
    invoke-virtual {p0}, Ljava/io/InputStream;->close()V
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object p0
    return-object p0
.end method

.method private static readWrappedAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    .locals 2

    invoke-static {p0, p1}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->readAsset(Landroid/content/Context;Ljava/lang/String;)Ljava/lang/String;
    move-result-object p0

    new-instance p1, Ljava/lang/StringBuilder;
    const-string v0, "(function(){\n"
    invoke-direct {p1, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {p1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string p0, "\n})();"
    invoke-virtual {p1, p0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object p0
    return-object p0
.end method
'@
Set-Content -LiteralPath $helperPath -Value $helper -Encoding ASCII

$clientPath = Join-Path $helperDir 'WebViewViewModel$webViewClient$1.smali'
$client = Get-Content -LiteralPath $clientPath -Raw
$needle = @'
.method public onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V
    .locals 2

    .line 164
'@
$replacement = @'
.method public onPageFinished(Landroid/webkit/WebView;Ljava/lang/String;)V
    .locals 3

    move-object v2, p2

    .line 164
'@
if ($client -notlike "*CommentRankerInjector;->inject*") {
  $client = $client.Replace($needle, $replacement)
  $client = $client.Replace(
@'
    invoke-static {p2}, Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;->access$loadOpenType(Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;)V

    .line 168
'@,
@'
    invoke-static {p2}, Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;->access$loadOpenType(Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;)V

    invoke-static {p1, v2}, Lderstandard/at/istandardx/features/webview/fragment/CommentRankerInjector;->inject(Landroid/webkit/WebView;Ljava/lang/String;)V

    .line 168
'@
  )
  Set-Content -LiteralPath $clientPath -Value $client -Encoding ASCII
}

Write-Host "Applied WebView JavaScript injection patch."
