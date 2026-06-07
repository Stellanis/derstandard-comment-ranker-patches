param(
  [string]$InputDir = "inputs",
  [string]$AnalysisDir = "analysis"
)

. "$PSScriptRoot\common.ps1"

Require-File $Aapt "aapt"

$inputPath = Join-Path $RepoRoot $InputDir
$analysisPath = Join-Path $RepoRoot $AnalysisDir
New-Item -ItemType Directory -Force -Path $analysisPath | Out-Null

$apks = Get-ChildItem -LiteralPath $inputPath -Filter "*.apk" -File
if (-not $apks) {
  throw "No APK files found in $inputPath. Run pull-derstandard-apk.ps1 first."
}

$report = Join-Path $analysisPath "apk-inspection.txt"
Set-Content -LiteralPath $report -Value "derStandard APK inspection`n==========================`n" -Encoding UTF8

foreach ($apk in $apks) {
  Add-Content -LiteralPath $report -Value "`n## $($apk.Name)`n"
  Add-Content -LiteralPath $report -Value "### badging"
  (& $Aapt dump badging $apk.FullName) | Add-Content -LiteralPath $report
  Add-Content -LiteralPath $report -Value "`n### permissions"
  (& $Aapt dump permissions $apk.FullName) | Add-Content -LiteralPath $report
}

Write-Host "Wrote $report"

