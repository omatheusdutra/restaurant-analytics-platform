param(
  [int]$QualityTrendDays = 7,
  [string]$DbUser = "nextage",
  [string]$DbName = "nextage_db",
  [string]$DbPassword = "alan_zoka",
  [string]$ApiBaseUrl = "http://localhost:3001",
  [string]$ApiToken = "",
  [int]$WarnCustomersMissingEmail = 1,
  [switch]$StartServers = $true
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$serversStarted = $false
$apiUp = $false

function Ensure-PostgresHealthy {
  Write-Host "== Step 0: Ensure Postgres is running =="
  try {
    docker compose up -d postgres | Out-Host
  } catch {
    Write-Host "Failed to start postgres via docker compose."
    return $false
  }

  $maxAttempts = 20
  for ($i = 1; $i -le $maxAttempts; $i++) {
    try {
      $status = docker inspect -f "{{.State.Health.Status}}" nextage-db 2>$null
      if ($status -eq "healthy") {
        Write-Host "Postgres is healthy."
        return $true
      }
    } catch {
      # ignore and retry
    }
    Start-Sleep -Seconds 2
  }

  Write-Host "Postgres did not become healthy."
  return $false
}

function Invoke-PsqlFile {
  param(
    [string]$FilePath
  )
  $resolvedPath = $FilePath
  if (-not (Test-Path $resolvedPath)) {
    $resolvedPath = Join-Path $RepoRoot $FilePath
  }
  $psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
  if ($psqlCmd) {
    & $psqlCmd -U $DbUser -d $DbName -f $resolvedPath
    return
  }

  Write-Host "psql not found. Falling back to docker compose exec postgres."
  $content = Get-Content $resolvedPath
  $content | docker compose exec -T postgres psql -U $DbUser -d $DbName
}

function Get-DbAvailable {
  try {
    $res = docker compose exec -T postgres pg_isready -U $DbUser -d $DbName 2>$null
    return $true
  } catch {
    return $false
  }
}

function Run-BackendTests {
  Push-Location (Join-Path $RepoRoot "project/backend")
  try {
    if (Get-DbAvailable) {
      Write-Host "DB available: running full backend test suite."
      $oldRun = $env:RUN_INTEGRATION
      $oldDb = $env:DATABASE_URL
      $env:RUN_INTEGRATION = "1"
      if (-not $env:DATABASE_URL) {
        $env:DATABASE_URL = "postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}"
      }
      try {
        npm test
      } finally {
        if ($null -eq $oldRun) { Remove-Item Env:RUN_INTEGRATION -ErrorAction SilentlyContinue } else { $env:RUN_INTEGRATION = $oldRun }
        if ($null -eq $oldDb) { Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue } else { $env:DATABASE_URL = $oldDb }
      }
    } else {
      Write-Host "DB not available: running unit-only backend tests."
      npm test -- --testPathIgnorePatterns=metrics.test.ts --testPathIgnorePatterns=auth.test.ts
    }
  } finally {
    Pop-Location
  }
}

function Run-FrontendTests {
  Push-Location (Join-Path $RepoRoot "project/frontend")
  try {
    npm test
  } finally {
    Pop-Location
  }
}

function Run-DbChecks {
  Write-Host "== Step 1: Apply analytics views =="
  Invoke-PsqlFile "scripts/analytics_views.sql"

  Write-Host "== Step 2: Data quality checks =="
  Invoke-PsqlFile "scripts/data_quality.sql"

  Write-Host "== Step 3: Contract checks =="
  Invoke-PsqlFile "scripts/contracts.sql"
}

function Run-ApiChecks {
  Write-Host "== Step 7: Optional API checks =="
  $token = $ApiToken
  if (-not $token) {
    $token = Get-AutoJwt -BaseUrl $ApiBaseUrl
  }
  if ($token) {
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "Checking $ApiBaseUrl/api/metrics/data-quality"
    try {
      $summary = Invoke-RestMethod -Headers $headers -Uri "$ApiBaseUrl/api/metrics/data-quality"
      $summary | Out-Host
      if ($summary.customersMissingEmail -ge $WarnCustomersMissingEmail) {
        Write-Host ("WARN: customersMissingEmail={0} (threshold={1})" -f $summary.customersMissingEmail, $WarnCustomersMissingEmail)
      }
    } catch {
      Write-Host "API check failed: data-quality (server down or token invalid)."
    }

    Write-Host "Checking $ApiBaseUrl/api/metrics/data-quality-trend?days=$QualityTrendDays"
    try {
      $trend = Invoke-RestMethod -Headers $headers -Uri "$ApiBaseUrl/api/metrics/data-quality-trend?days=$QualityTrendDays"
      $trend | Out-Host
      $warnDays = @($trend | Where-Object { $_.customersMissingEmail -ge $WarnCustomersMissingEmail })
      if ($warnDays.Count -gt 0) {
        $max = ($warnDays | Measure-Object -Property customersMissingEmail -Maximum).Maximum
        Write-Host ("WARN: customersMissingEmail above threshold on {0} day(s), max={1}" -f $warnDays.Count, $max)
      }
    } catch {
      Write-Host "API check failed: data-quality-trend (server down or token invalid)."
    }
  } else {
    Write-Host "API token not available; skipping endpoint checks."
    Write-Host "Provide -ApiToken <JWT> or allow auto-generation."
  }
}

function Stop-ProcessTree {
  param(
    [System.Diagnostics.Process]$Proc
  )
  if (-not $Proc) { return }
  try {
    taskkill /PID $Proc.Id /T /F | Out-Null
  } catch {
    try {
      if (-not $Proc.HasExited) { Stop-Process -Id $Proc.Id -Force }
    } catch {}
  }
}

function Wait-For-Url {
  param(
    [string]$Url,
    [int]$MaxAttempts = 40,
    [int]$SleepSeconds = 2
  )
  for ($i = 1; $i -le $MaxAttempts; $i++) {
    try {
      Invoke-RestMethod -Uri $Url -TimeoutSec 2 | Out-Null
      return $true
    } catch {
      Start-Sleep -Seconds $SleepSeconds
    }
  }
  return $false
}

function Get-AutoJwt {
  param(
    [string]$BaseUrl
  )
  try {
    $email = "validate-$([Guid]::NewGuid().ToString('N'))@example.com"
    $body = @{
      email = $email
      password = "Test123!@#"
      name = "Validate User"
    } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/auth/register" -ContentType "application/json" -Body $body -TimeoutSec 10
    if ($resp -and $resp.token) {
      Write-Host "Generated JWT for API checks."
      return $resp.token
    }
  } catch {
    Write-Host "Auto JWT generation failed. Provide -ApiToken to enable API checks."
  }
  return ""
}

if (Ensure-PostgresHealthy) {
  Run-DbChecks
} else {
  Write-Host "Skipping DB checks due to unavailable Postgres."
}

Write-Host "== Step 4: Backend tests =="
Run-BackendTests

Write-Host "== Step 5: Frontend tests =="
Run-FrontendTests

if ($StartServers) {
  Write-Host "== Step 6: Start API and Frontend =="
  $backendPath = Join-Path $RepoRoot "project/backend"
  $frontendPath = Join-Path $RepoRoot "project/frontend"
  $logDir = Join-Path $RepoRoot "artifacts/validate"
  if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
  $backendLog = Join-Path $logDir "backend.log"
  $frontendLog = Join-Path $logDir "frontend.log"
  $backendCmd = @"
`$env:DATABASE_URL='postgresql://${DbUser}:${DbPassword}@localhost:5432/${DbName}';
`$env:JWT_SECRET='test-secret';
`$env:CORS_ORIGIN='http://localhost:3000';
Set-Location -LiteralPath '$backendPath';
npx tsx watch src/index.ts
"@
  $frontendCmd = @"
`$env:VITE_API_URL='http://localhost:3001';
Set-Location -LiteralPath '$frontendPath';
npm run dev
"@
  $backendErr = Join-Path $logDir "backend.err.log"
  $frontendErr = Join-Path $logDir "frontend.err.log"
  $backendProc = Start-Process powershell -WindowStyle Hidden -PassThru -RedirectStandardOutput $backendLog -RedirectStandardError $backendErr -ArgumentList @("-NoProfile", "-Command", $backendCmd)
  $frontendProc = Start-Process powershell -WindowStyle Hidden -PassThru -RedirectStandardOutput $frontendLog -RedirectStandardError $frontendErr -ArgumentList @("-NoProfile", "-Command", $frontendCmd)
  $serversStarted = $true
  Write-Host "Waiting for servers to start..."
  $apiUp = Wait-For-Url "$ApiBaseUrl/health"
  if (-not $apiUp) {
    Write-Host "API did not become ready in time. Skipping API checks."
    if ($backendProc -and $backendProc.HasExited) {
      Write-Host "Backend process exited early. Last log lines:"
      Get-Content $backendLog -Tail 20 | Out-Host
    }
  }
}

if ($apiUp) {
  Run-ApiChecks
} else {
  Write-Host "API checks skipped (server not ready)."
}

if ($serversStarted) {
  Write-Host "== Step 8: Stop API and Frontend =="
  Stop-ProcessTree -Proc $backendProc
  Stop-ProcessTree -Proc $frontendProc
}

Write-Host "Done."
