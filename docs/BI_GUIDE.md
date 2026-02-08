# BI Guide (Dashboards)

## Primary Dashboards
1. Executive Overview
   - Revenue, gross revenue, orders, avg ticket
   - Discount rate and cancellation rate
   - Filter by store, channel, and date range
2. Product Performance
   - Top products by revenue and units
   - Price vs volume comparison
3. Operations
   - Production time and delivery time trends
   - Cancellation rate by channel

## Suggested Queries
- Daily revenue by store/channel: `analytics.mart_sales_daily`
- Top products (date range): `analytics.mart_product_daily`
- Channel mix: group by channel_id on `analytics.mart_sales_daily`
- Discount rate trend: use `discount_rate` in `analytics.mart_sales_daily`
- Cancellation rate trend: use `cancellation_rate` in `analytics.mart_sales_daily`

## UX Notes
- Default to last 30 days.
- Provide drill-down to product-level when possible.
- Show deltas vs previous period.
- Prefer % metrics in smaller cards or secondary axes.
