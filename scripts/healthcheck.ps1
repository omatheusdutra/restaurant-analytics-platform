param(
  [string]$ApiBaseUrl = "http://localhost:3001",
  [string]$FrontendUrl = "http://localhost:3000",
  [string]$DbService = "postgres",
  [string]$DbContainer = "nextage-db",
  [string]$DbUser = "nextage",
  [string]$DbName = "nextage_db",
  [switch]$AutoStartPostgres = $true,
  [switch]$CheckApi = $true,
  [switch]$CheckFrontend = $true,
  [switch]$RunBackendTests,
  [switch]$RunFrontendTests
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$script:Checks = @()

function Add-Result {
  param(
    [string]$Name,
    [bool]$Ok,
    [string]$Detail
  )

  $script:Checks += [pscustomobject]@{
    Check  = $Name
    Status = $(if ($Ok) { "PASS" } else { "FAIL" })
    Detail = $Detail
  }
}

function Test-Http {
  param([string]$Url)

  try {
    $resp = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 10 -UseBasicParsing
    $ok = ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400)
    return @{ Ok = $ok; Detail = "HTTP $($resp.StatusCode)" }
  }
  catch {
    $msg = $_.Exception.Message
    return @{ Ok = $false; Detail = $msg }
  }
}

function Test-DockerDaemon {
  try {
    $null = docker info 2>$null
    if ($LASTEXITCODE -ne 0) {
      return @{ Ok = $false; Detail = "docker daemon unavailable or access denied" }
    }

    return @{ Ok = $true; Detail = "daemon reachable" }
  }
  catch {
    return @{ Ok = $false; Detail = $_.Exception.Message }
  }
}

function Wait-PostgresReady {
  param(
    [int]$MaxAttempts = 20,
    [int]$DelaySeconds = 2
  )

  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      docker compose exec -T $DbService pg_isready -U $DbUser -d $DbName *> $null
      if ($LASTEXITCODE -eq 0) {
        return $true
      }
    }
    catch {
      # retry
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  return $false
}

Write-Host "== Healthcheck: prerequisites =="

$dockerCmd = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerCmd) {
  Add-Result -Name "docker command" -Ok $false -Detail "docker not found in PATH"
  Write-Host ""
  Write-Host "== Summary =="
  $script:Checks | Format-Table -AutoSize
  exit 1
}
Add-Result -Name "docker command" -Ok $true -Detail "found"

$dockerDaemon = Test-DockerDaemon
Add-Result -Name "docker daemon" -Ok $dockerDaemon.Ok -Detail $dockerDaemon.Detail
if (-not $dockerDaemon.Ok) {
  Write-Host ""
  Write-Host "== Summary =="
  $script:Checks | Format-Table -AutoSize
  exit 1
}

Push-Location $RepoRoot
try {
  if ($AutoStartPostgres) {
    Write-Host "== Starting postgres service (if needed) =="
    $composeOutput = (& cmd /c "docker compose up -d $DbService 2>&1" | Out-String).Trim()
    if ($LASTEXITCODE -eq 0) {
      $detail = "ok"
      if ($composeOutput -match "Running") {
        $detail = "already running"
      }
      elseif ($composeOutput -match "Started|Created") {
        $detail = "started"
      }
      Add-Result -Name "docker compose up $DbService" -Ok $true -Detail $detail
    }
    else {
      if ([string]::IsNullOrWhiteSpace($composeOutput)) {
        $composeOutput = "docker compose up failed (exit $LASTEXITCODE)"
      }
      Add-Result -Name "docker compose up $DbService" -Ok $false -Detail $composeOutput
    }
  }

  $pgId = (docker compose ps -q $DbService | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($pgId)) {
    Add-Result -Name "postgres container" -Ok $false -Detail "service '$DbService' is not running"
  }
  else {
    Add-Result -Name "postgres container" -Ok $true -Detail $pgId

    $healthy = $false
    try {
      $healthState = (docker inspect -f "{{.State.Health.Status}}" $DbContainer 2>$null | Out-String).Trim()
      if ($healthState -eq "healthy") {
        $healthy = $true
        Add-Result -Name "postgres health" -Ok $true -Detail "container health=healthy"
      }
    }
    catch {
      # fallback below
    }

    if (-not $healthy) {
      $ready = Wait-PostgresReady
      Add-Result -Name "postgres pg_isready" -Ok $ready -Detail $(if ($ready) { "accepting connections" } else { "not ready" })
    }
  }

  if ($CheckApi) {
    Write-Host "== Checking API =="
    $apiRes = Test-Http -Url "$ApiBaseUrl/health"
    Add-Result -Name "api health" -Ok $apiRes.Ok -Detail $apiRes.Detail
  }

  if ($CheckFrontend) {
    Write-Host "== Checking frontend =="
    $feRes = Test-Http -Url $FrontendUrl
    Add-Result -Name "frontend url" -Ok $feRes.Ok -Detail $feRes.Detail
  }

  if ($RunBackendTests) {
    Write-Host "== Running backend tests =="
    Push-Location (Join-Path $RepoRoot "project/backend")
    try {
      npm test
      $ok = ($LASTEXITCODE -eq 0)
      Add-Result -Name "backend tests" -Ok $ok -Detail $(if ($ok) { "pass" } else { "failed" })
    }
    catch {
      Add-Result -Name "backend tests" -Ok $false -Detail $_.Exception.Message
    }
    finally {
      Pop-Location
    }
  }

  if ($RunFrontendTests) {
    Write-Host "== Running frontend tests =="
    Push-Location (Join-Path $RepoRoot "project/frontend")
    try {
      npm test
      $ok = ($LASTEXITCODE -eq 0)
      Add-Result -Name "frontend tests" -Ok $ok -Detail $(if ($ok) { "pass" } else { "failed" })
    }
    catch {
      Add-Result -Name "frontend tests" -Ok $false -Detail $_.Exception.Message
    }
    finally {
      Pop-Location
    }
  }
}
finally {
  Pop-Location
}

Write-Host ""
Write-Host "== Summary =="
$script:Checks | Format-Table -AutoSize

$failed = @($script:Checks | Where-Object { $_.Status -eq "FAIL" }).Count
if ($failed -gt 0) {
  Write-Host ""
  Write-Host "Healthcheck result: FAIL ($failed check(s) failed)"
  exit 1
}

Write-Host ""
Write-Host "Healthcheck result: PASS"
exit 0


