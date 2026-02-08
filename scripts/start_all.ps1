param(
  [switch]$ApplyAnalyticsViews,
  [switch]$RunApiTest,
  [switch]$StartServers,
  [switch]$NoStartServers
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Repo root: $repoRoot"


# Backend setup
Write-Host "== Backend setup =="
Push-Location (Join-Path $repoRoot "project/backend")
try {
  if (-Not (Test-Path ".env")) { Copy-Item .env.example .env }
  npm install
  npx prisma generate
  npx prisma db push
} finally {
  Pop-Location
}

# Frontend setup
Write-Host "== Frontend setup =="
Push-Location (Join-Path $repoRoot "project/frontend")
try {
  if (-Not (Test-Path ".env")) { Copy-Item .env.example .env }
  npm install
} finally {
  Pop-Location
}

if ($ApplyAnalyticsViews) {
  Write-Host "== Apply analytics views and checks =="
  Push-Location $repoRoot
  try {
    Get-Content scripts/analytics_views.sql | docker compose exec -T postgres psql -U nextage -d nextage_db
    Get-Content scripts/data_quality.sql   | docker compose exec -T postgres psql -U nextage -d nextage_db
    Get-Content scripts/contracts.sql      | docker compose exec -T postgres psql -U nextage -d nextage_db
  } finally {
    Pop-Location
  }
}

if ($RunApiTest) {
  Write-Host "== API smoke test =="
  Push-Location $repoRoot
  try {
    python scripts/test_api.py
  } finally {
    Pop-Location
  }
}

if ($StartServers -or -Not $NoStartServers) {
  Write-Host "== Starting servers =="
  $backendDir = Join-Path $repoRoot "project/backend"
  $frontendDir = Join-Path $repoRoot "project/frontend"

  Start-Process powershell -WorkingDirectory $backendDir -ArgumentList "-NoExit", "-Command", "npm run dev"
  Start-Process powershell -WorkingDirectory $frontendDir -ArgumentList "-NoExit", "-Command", "npm run dev"

  Write-Host "Backend:  http://localhost:3001"
  Write-Host "Frontend: http://localhost:3000"
} else {
  Write-Host "== Next steps =="
  Write-Host "Backend:  cd $repoRoot\project\backend; npm run dev"
  Write-Host "Frontend: cd $repoRoot\project\frontend; npm run dev"
}


