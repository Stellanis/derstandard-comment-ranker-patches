param(
  [Parameter(Mandatory = $true)]
  [string]$PairHostPort,

  [Parameter(Mandatory = $true)]
  [string]$PairCode,

  [Parameter(Mandatory = $true)]
  [string]$ConnectHostPort
)

. "$PSScriptRoot\common.ps1"

& $Adb pair $PairHostPort $PairCode
& $Adb connect $ConnectHostPort
& $Adb devices -l

