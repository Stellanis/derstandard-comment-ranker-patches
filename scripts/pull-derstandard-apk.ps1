param(
  [string]$PackageName = "derstandard.at.istandardx",
  [string]$OutputDir = "inputs"
)

. "$PSScriptRoot\common.ps1"

$out = Join-Path $RepoRoot $OutputDir
New-Item -ItemType Directory -Force -Path $out | Out-Null

$paths = & $Adb shell pm path $PackageName
if (-not $paths) {
  throw "Package $PackageName was not found on the connected device."
}

$manifest = @()
foreach ($line in $paths) {
  $remote = $line -replace "^package:", ""
  $name = Split-Path -Leaf $remote
  $local = Join-Path $out $name
  & $Adb pull $remote $local
  $manifest += [pscustomobject]@{
    package = $PackageName
    remote = $remote
    local = $local
  }
}

$manifest | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $out "pulled-apks.json") -Encoding UTF8
Write-Host "Pulled $($manifest.Count) APK file(s) to $out"

