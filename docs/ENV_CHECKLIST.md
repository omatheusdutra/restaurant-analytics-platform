# Environment Checklist

Last verified: 2026-02-04

## Services
- Postgres: running (container `nextage-db`)
- Backend API: running on http://localhost:3001
- Frontend: running on http://localhost:3000

## Data
- Generated data present (sales, product_sales, customers, stores)
- Analytics views applied (schema `analytics`)

## Checks
- Data quality SQL: OK (scripts/data_quality.sql)
- Schema contracts SQL: OK (scripts/contracts.sql)
- API smoke test: OK (scripts/test_api.py)
- Backend tests (Jest): OK (100% coverage)
- Frontend tests (Vitest): OK

## Security (Local)
- Cache is user-scoped (avoids data leaks across users).
- Shared dashboards are rate-limited (60 req/min per IP).
- Explore limits: max 6 measures, `top` <= 100, id lists <= 100.
- Metrics limits: `top-products` <= 100, `export-csv` <= 5000, `customers-at-risk` <= 500.

## dbt
- Profiles: dbt/profiles.yml
- dbt run: OK
- dbt test: OK

## Lineage
- OpenLineage JSONL: artifacts/openlineage/events.jsonl
