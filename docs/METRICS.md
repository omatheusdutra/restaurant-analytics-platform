# Metrics Catalog

This file defines the current KPI layer derived from `analytics` views (or `analytics_dbt` for dbt). It is the single source of truth for metric names, grain, and calculation logic.

## Sales KPIs (Daily, by Store + Channel)
Source: `analytics.mart_sales_daily`

- `orders_total`: count of all orders (completed + cancelled).
- `orders`: count of completed orders only.
- `orders_cancelled`: count of cancelled orders.
- `revenue`: sum of `total_amount` for completed orders.
- `gross_revenue`: sum of `total_amount_items` for completed orders (pre-discount).
- `avg_ticket`: average `total_amount` for completed orders.
- `total_discount`: sum of `total_discount` for completed orders.
- `discount_rate`: `total_discount / total_amount_items` for completed orders.
- `cancellation_rate`: `orders_cancelled / orders_total`.
- `avg_production_seconds`: avg `production_seconds` for completed orders.
- `avg_delivery_seconds`: avg `delivery_seconds` for completed orders.

## Product KPIs (Daily, by Store + Channel + Product)
Source: `analytics.mart_product_daily`

- `units`: sum of `quantity`.
- `revenue`: sum of `total_price`.
- `avg_unit_price`: `revenue / units`.

## Dimensional Filters
- `sale_date`: primary time grain.
- `store_id`, `channel_id`, `product_id`: operational dimensions.

## Notes
- These KPIs are available in the SQL views and mirrored in the dbt marts.
- If a metric changes, update both `scripts/analytics_views.sql` and `dbt/models/marts/*`.
