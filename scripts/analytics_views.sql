-- Analytics views (idempotent)
-- Run: psql -U nextage -d nextage_db -f scripts/analytics_views.sql

CREATE SCHEMA IF NOT EXISTS analytics;

-- Staging views (raw -> cleaned projections)
CREATE OR REPLACE VIEW analytics.stg_sales AS
SELECT
  s.id AS sale_id,
  s.created_at,
  s.created_at::date AS sale_date,
  s.store_id,
  s.channel_id,
  s.sub_brand_id,
  s.customer_id,
  s.sale_status_desc,
  s.total_amount_items,
  s.total_discount,
  s.total_increase,
  s.delivery_fee,
  s.service_tax_fee,
  s.total_amount,
  s.value_paid,
  s.production_seconds,
  s.delivery_seconds,
  s.people_quantity,
  s.discount_reason,
  s.increase_reason,
  s.origin
FROM sales s;

CREATE OR REPLACE VIEW analytics.stg_product_sales AS
SELECT
  ps.id AS product_sale_id,
  ps.sale_id,
  ps.product_id,
  ps.quantity,
  ps.base_price,
  ps.total_price,
  ps.observations
FROM product_sales ps;

CREATE OR REPLACE VIEW analytics.stg_payments AS
SELECT
  p.id AS payment_id,
  p.sale_id,
  p.payment_type_id,
  p.value,
  p.is_online,
  p.description,
  p.currency
FROM payments p;

CREATE OR REPLACE VIEW analytics.stg_delivery_sales AS
SELECT
  ds.id AS delivery_sale_id,
  ds.sale_id,
  ds.courier_type,
  ds.delivery_type,
  ds.status,
  ds.delivery_fee,
  ds.courier_fee
FROM delivery_sales ds;

-- Dimensions
CREATE OR REPLACE VIEW analytics.dim_store AS
SELECT
  s.id AS store_id,
  s.name,
  s.city,
  s.state,
  s.district,
  s.is_active,
  s.is_own,
  s.is_holding,
  s.creation_date
FROM stores s;

CREATE OR REPLACE VIEW analytics.dim_channel AS
SELECT
  c.id AS channel_id,
  c.name,
  c.type,
  c.commission_pct,
  c.description
FROM channels c;

CREATE OR REPLACE VIEW analytics.dim_category AS
SELECT
  cat.id AS category_id,
  cat.name,
  cat.type,
  cat.deleted_at
FROM categories cat;

CREATE OR REPLACE VIEW analytics.dim_product AS
SELECT
  p.id AS product_id,
  p.name,
  p.category_id,
  p.cost_price,
  p.deleted_at
FROM products p;

CREATE OR REPLACE VIEW analytics.dim_customer AS
SELECT
  c.id AS customer_id,
  c.customer_name,
  c.email,
  c.phone_number,
  c.birth_date,
  c.gender,
  c.store_id
FROM customers c;

-- PII-safe customer dimension for BI use
CREATE OR REPLACE VIEW analytics.dim_customer_public AS
SELECT
  c.id AS customer_id,
  c.customer_name,
  c.gender,
  c.store_id
FROM customers c;

CREATE OR REPLACE VIEW analytics.dim_date AS
SELECT
  d::date AS date,
  EXTRACT(year FROM d)::int AS year,
  EXTRACT(month FROM d)::int AS month,
  EXTRACT(day FROM d)::int AS day,
  EXTRACT(quarter FROM d)::int AS quarter,
  EXTRACT(dow FROM d)::int AS day_of_week,
  TO_CHAR(d, 'YYYY-MM') AS year_month
FROM generate_series(
  COALESCE((SELECT MIN(created_at)::date FROM sales), CURRENT_DATE),
  COALESCE((SELECT MAX(created_at)::date FROM sales), CURRENT_DATE),
  interval '1 day'
) d;

-- Facts
CREATE OR REPLACE VIEW analytics.fct_sales AS
SELECT
  s.sale_id,
  s.created_at,
  s.sale_date,
  s.store_id,
  s.channel_id,
  s.sub_brand_id,
  s.customer_id,
  s.sale_status_desc,
  (s.sale_status_desc = 'COMPLETED') AS is_completed,
  (s.sale_status_desc = 'CANCELLED') AS is_cancelled,
  s.total_amount_items,
  s.total_discount,
  s.total_increase,
  s.delivery_fee,
  s.service_tax_fee,
  s.total_amount,
  s.value_paid,
  s.production_seconds,
  s.delivery_seconds,
  s.people_quantity,
  s.origin
FROM analytics.stg_sales s;

CREATE OR REPLACE VIEW analytics.fct_product_sales AS
SELECT
  ps.product_sale_id,
  ps.sale_id,
  s.sale_date,
  s.store_id,
  s.channel_id,
  ps.product_id,
  ps.quantity,
  ps.base_price,
  ps.total_price
FROM analytics.stg_product_sales ps
JOIN analytics.stg_sales s ON s.sale_id = ps.sale_id;

-- Marts
DROP VIEW IF EXISTS analytics.mart_sales_daily;
CREATE OR REPLACE VIEW analytics.mart_sales_daily AS
SELECT
  s.sale_date,
  s.store_id,
  s.channel_id,
  COUNT(*) AS orders_total,
  COUNT(*) FILTER (WHERE s.is_completed) AS orders,
  COUNT(*) FILTER (WHERE s.is_cancelled) AS orders_cancelled,
  SUM(s.total_amount) FILTER (WHERE s.is_completed) AS revenue,
  SUM(s.total_amount_items) FILTER (WHERE s.is_completed) AS gross_revenue,
  AVG(s.total_amount) FILTER (WHERE s.is_completed) AS avg_ticket,
  SUM(s.total_discount) FILTER (WHERE s.is_completed) AS total_discount,
  CASE
    WHEN NULLIF(SUM(s.total_amount_items) FILTER (WHERE s.is_completed), 0) IS NULL THEN NULL
    ELSE SUM(s.total_discount) FILTER (WHERE s.is_completed)
      / NULLIF(SUM(s.total_amount_items) FILTER (WHERE s.is_completed), 0)
  END AS discount_rate,
  CASE
    WHEN NULLIF(COUNT(*), 0) IS NULL THEN NULL
    ELSE (COUNT(*) FILTER (WHERE s.is_cancelled))::numeric / NULLIF(COUNT(*), 0)
  END AS cancellation_rate,
  AVG(s.production_seconds) FILTER (WHERE s.is_completed) AS avg_production_seconds,
  AVG(s.delivery_seconds) FILTER (WHERE s.is_completed) AS avg_delivery_seconds
FROM analytics.fct_sales s
GROUP BY s.sale_date, s.store_id, s.channel_id;

CREATE OR REPLACE VIEW analytics.mart_product_daily AS
SELECT
  ps.sale_date,
  ps.store_id,
  ps.channel_id,
  ps.product_id,
  SUM(ps.quantity) AS units,
  SUM(ps.total_price) AS revenue,
  CASE
    WHEN NULLIF(SUM(ps.quantity), 0) IS NULL THEN NULL
    ELSE SUM(ps.total_price) / NULLIF(SUM(ps.quantity), 0)
  END AS avg_unit_price
FROM analytics.fct_product_sales ps
GROUP BY ps.sale_date, ps.store_id, ps.channel_id, ps.product_id;
