# Analytics Model

## Overview
This project ships with a lightweight analytics layer implemented as SQL views in PostgreSQL. The goal is to provide stable, query-friendly facts and dimensions without changing the operational schema.

In addition, a dbt project is provided under `dbt/` to build similar staging, facts and marts into the `analytics_dbt` schema.

The views are defined in `scripts/analytics_views.sql` and live under the `analytics` schema.

## Staging Views
- `analytics.stg_sales`
- `analytics.stg_product_sales`
- `analytics.stg_payments`
- `analytics.stg_delivery_sales`

These are cleaned projections from the raw tables with consistent naming.

## Dimensions
- `analytics.dim_store`
- `analytics.dim_channel`
- `analytics.dim_category`
- `analytics.dim_product`
- `analytics.dim_customer`
- `analytics.dim_customer_public` (PII-safe)
- `analytics.dim_date`

## Facts
- `analytics.fct_sales`
- `analytics.fct_product_sales`

`fct_sales` provides standardized order-level metrics and flags (`is_completed`, `is_cancelled`).

## Marts (Aggregations)
- `analytics.mart_sales_daily`
- `analytics.mart_product_daily`

These are daily aggregates designed for dashboards and fast queries, with KPI-ready columns
such as cancellation rate, discount rate, and average unit price.

## How to Apply
```bash
psql -U nextage -d nextage_db -f scripts/analytics_views.sql
```

## dbt (Optional)
```bash
cd dbt
pip install -r requirements.txt
# Copy profiles example and use local profiles dir
cp profiles.yml.example profiles.yml
dbt debug --profiles-dir .
dbt run --profiles-dir .
dbt test --profiles-dir .
```

## Example Queries
```sql
-- Daily revenue by channel
SELECT sale_date, channel_id, revenue
FROM analytics.mart_sales_daily
ORDER BY sale_date ASC;

-- Top products by revenue in a period
SELECT p.name, SUM(m.revenue) AS revenue
FROM analytics.mart_product_daily m
JOIN analytics.dim_product p ON p.product_id = m.product_id
WHERE m.sale_date BETWEEN DATE '2025-01-01' AND DATE '2025-01-31'
GROUP BY p.name
ORDER BY revenue DESC
LIMIT 10;
```

## Notes
- Views are idempotent and safe to re-run.
- If a table schema changes, re-run the view script.
- KPI definitions live in `docs/METRICS.md`.
