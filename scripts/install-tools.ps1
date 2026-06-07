. "$PSScriptRoot\common.ps1"

$toolsDir = Join-Path $RepoRoot "tools"
New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$apktoolJar = Join-Path $toolsDir "apktool_3.0.2.jar"
$jadxZip = Join-Path $toolsDir "jadx-1.5.5.zip"
$jadxDir = Join-Path $toolsDir "jadx-1.5.5"

if (-not (Test-Path -LiteralPath $apktoolJar)) {
  Invoke-WebRequest `
    -Uri "https://github.com/iBotPeaches/Apktool/releases/download/v3.0.2/apktool_3.0.2.jar" `
    -OutFile $apktoolJar
}

if (-not (Test-Path -LiteralPath $jadxZip)) {
  Invoke-WebRequest `
    -Uri "https://github.com/skylot/jadx/releases/download/v1.5.5/jadx-1.5.5.zip" `
    -OutFile $jadxZip
}

if (-not (Test-Path -LiteralPath $jadxDir)) {
  Expand-Archive -LiteralPath $jadxZip -DestinationPath $jadxDir -Force
}

& java -jar $apktoolJar --version
& (Join-Path $jadxDir "bin\jadx.bat") --version

