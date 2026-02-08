param(
  [Parameter(Mandatory = $false)]
  [string]$Command = "run"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$dbtDir = Join-Path $repoRoot "dbt"

Write-Host "Running dbt $Command with profiles-dir=$dbtDir"

Push-Location $dbtDir
try {
  & dbt $Command --profiles-dir .
} finally {
  Pop-Location
}