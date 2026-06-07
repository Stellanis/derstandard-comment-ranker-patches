param(
  [string]$InputDir = "inputs",
  [string]$AnalysisDir = "analysis"
)

. "$PSScriptRoot\common.ps1"

Require-File $ApkToolJar "apktool"
Require-File $Jadx "jadx"

$inputPath = Join-Path $RepoRoot $InputDir
$analysisPath = Join-Path $RepoRoot $AnalysisDir
$decodedPath = Join-Path $analysisPath "decompiled\apktool"
$jadxPath = Join-Path $analysisPath "jadx"
New-Item -ItemType Directory -Force -Path $decodedPath | Out-Null
New-Item -ItemType Directory -Force -Path $jadxPath | Out-Null

$base = Get-ChildItem -LiteralPath $inputPath -Filter "base.apk" -File | Select-Object -First 1
if (-not $base) {
  $base = Get-ChildItem -LiteralPath $inputPath -Filter "*.apk" -File | Select-Object -First 1
}
if (-not $base) {
  throw "No APK files found in $inputPath. Run pull-derstandard-apk.ps1 first."
}

& java -jar $ApkToolJar d $base.FullName -f -o (Join-Path $decodedPath $base.BaseName)
& $Jadx -d (Join-Path $jadxPath $base.BaseName) $base.FullName

$searchReport = Join-Path $analysisPath "code-search-hints.txt"
Set-Content -LiteralPath $searchReport -Value "Search hints for patch planning`n===============================`n" -Encoding UTF8

$patterns = @(
  "WebView",
  "evaluateJavascript",
  "WebViewClient",
  "addJavascriptInterface",
  "forum",
  "posting",
  "comment",
  "positive",
  "negative",
  "rating",
  "derstandard"
)

foreach ($pattern in $patterns) {
  Add-Content -LiteralPath $searchReport -Value "`n## $pattern"
  rg -n $pattern (Join-Path $jadxPath $base.BaseName) | Select-Object -First 80 | Add-Content -LiteralPath $searchReport
}

Write-Host "Decoded $($base.Name). Wrote $searchReport"

