# Runbook

## Quick Start
1. Prepare env files (once)
   - cp .env.example .env
   - cp project/backend/.env.example project/backend/.env
   - cp project/frontend/.env.example project/frontend/.env
2. Reset database and seed data
   - cd project/backend
   - npm install
   - npm run db:reset
3. Setup apps and start servers
   - cd ../../
   - scripts/start_all.ps1

## Recommended Flow (db reset + script)
1. Reset database (backend)
   - cd project/backend
   - npm run db:reset
2. Setup and start servers
   - cd ../../
   - scripts/start_all.ps1
3. Optional end-to-end validation
   - scripts/validate_all.ps1 -ApiBaseUrl "http://localhost:3001" -QualityTrendDays 7

## Health Checks
- API health: http://localhost:3001/health
- API ready:  http://localhost:3001/ready

## Security Notes (Local)
- Shared dashboards are rate-limited (60 req/min per IP).
- Cache is user-scoped to avoid data leaks between users.
- Explore limits: max 6 measures, `top` <= 100, id lists <= 100.
- Metrics limits: `top-products` <= 100, `export-csv` <= 5000, `customers-at-risk` <= 500.

## Data Quality Checks
Run the SQL checks against the local database:
- psql -U nextage -d nextage_db -f scripts/data_quality.sql

API summary (for dashboards):
- GET /api/metrics/data-quality
- GET /api/metrics/data-quality-trend?days=7

## Full Validation Script
Run the end-to-end validation (Postgres, SQL checks, tests, API endpoints):

```bash
scripts/validate_all.ps1 -ApiBaseUrl "http://localhost:3001" -QualityTrendDays 7
```

Notes:
- The script ensures Postgres is running and healthy.
- It runs SQL checks, backend/frontend tests, starts API/Frontend for endpoint checks, then stops them.
- `-ApiToken` is optional; when omitted, the script generates a JWT automatically.

## Data Contracts
Validate core schema expectations:
- psql -U nextage -d nextage_db -f scripts/contracts.sql

## Analytics Views
Create the analytics schema and views:
- psql -U nextage -d nextage_db -f scripts/analytics_views.sql

## Lineage Events
Emit OpenLineage JSONL events (local):
- python scripts/emit_openlineage.py --output artifacts/openlineage/events.jsonl

## dbt Models (Optional)
Build the dbt models into `analytics_dbt`:
- cd dbt
- pip install -r requirements.txt
- cp profiles.yml.example profiles.yml
- dbt clean
- dbt deps
- dbt debug --profiles-dir .
- dbt run --profiles-dir .
- dbt test --profiles-dir .
Profile: `nextage_analytics`.
Note (Windows): if you see a `syntax error at or near "﻿with"` in dbt models, remove UTF-8 BOM from `dbt/models/**/*.sql`.

### Convenience Scripts
- PowerShell: `scripts/dbt.ps1 run` / `scripts/dbt.ps1 test`
- Bash: `scripts/dbt.sh run` / `scripts/dbt.sh test`

## Makefile (Optional)
- make help
- make postgres-up
- make data-gen
- make analytics-views

## Smoke Test (API)
- python scripts/test_api.py

## Common Issues
- Database not ready:
  - Wait for docker healthcheck or rerun: docker compose up -d postgres
- Prisma client missing:
  - cd project/backend
  - npm run prisma:generate
- Auth errors (401):
  - Ensure JWT_SECRET is set in project/backend/.env

## Rollback / Reset (Local)
- Reset local database:
  - cd project/backend
  - npm run db:reset

## Logs
- API logs are written to stdout using pino.
- Use docker logs for Postgres: docker logs nextage-db

