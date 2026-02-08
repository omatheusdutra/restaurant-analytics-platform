-- Minimal schema contract checks (read-only)
-- Run: psql -U nextage -d nextage_db -f scripts/contracts.sql

WITH expected(table_name, column_name) AS (
  VALUES
    ('sales', 'id'),
    ('sales', 'store_id'),
    ('sales', 'channel_id'),
    ('sales', 'created_at'),
    ('sales', 'sale_status_desc'),
    ('sales', 'total_amount'),
    ('sales', 'total_amount_items'),
    ('sales', 'total_discount'),
    ('sales', 'total_increase'),
    ('sales', 'delivery_fee'),
    ('sales', 'service_tax_fee'),
    ('sales', 'value_paid'),
    ('sales', 'production_seconds'),
    ('sales', 'delivery_seconds'),
    ('product_sales', 'id'),
    ('product_sales', 'sale_id'),
    ('product_sales', 'product_id'),
    ('product_sales', 'quantity'),
    ('product_sales', 'total_price'),
    ('stores', 'id'),
    ('stores', 'name'),
    ('stores', 'city'),
    ('stores', 'state'),
    ('channels', 'id'),
    ('channels', 'name'),
    ('channels', 'type'),
    ('channels', 'commission_pct'),
    ('products', 'id'),
    ('products', 'name'),
    ('products', 'cost_price'),
    ('categories', 'id'),
    ('categories', 'name'),
    ('customers', 'id'),
    ('customers', 'customer_name'),
    ('customers', 'store_id'),
    ('payments', 'id'),
    ('payments', 'sale_id'),
    ('payments', 'value'),
    ('payments', 'currency'),
    ('delivery_sales', 'id'),
    ('delivery_sales', 'sale_id'),
    ('delivery_sales', 'delivery_fee')
),
missing AS (
  SELECT e.table_name, e.column_name
  FROM expected e
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
   AND c.table_name = e.table_name
   AND c.column_name = e.column_name
  WHERE c.column_name IS NULL
)
SELECT * FROM missing ORDER BY table_name, column_name;
