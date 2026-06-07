$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$AndroidSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$Adb = Join-Path $AndroidSdk "platform-tools\adb.exe"
$Aapt = Join-Path $AndroidSdk "build-tools\37.0.0\aapt.exe"
$ApkSigner = Join-Path $AndroidSdk "build-tools\37.0.0\apksigner.bat"
$ApkToolJar = Join-Path $RepoRoot "tools\apktool_3.0.2.jar"
$Jadx = Join-Path $RepoRoot "tools\jadx-1.5.5\bin\jadx.bat"

function Require-File($Path, $Name) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "$Name not found at $Path"
  }
}

Require-File $Adb "adb"

