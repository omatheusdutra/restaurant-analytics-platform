-- Data quality checks (read-only)
-- Run: psql -U nextage -d nextage_db -f scripts/data_quality.sql

-- Row counts
SELECT 'brands' AS table, COUNT(*) AS rows FROM brands
UNION ALL SELECT 'stores', COUNT(*) FROM stores
UNION ALL SELECT 'channels', COUNT(*) FROM channels
UNION ALL SELECT 'products', COUNT(*) FROM products
UNION ALL SELECT 'customers', COUNT(*) FROM customers
UNION ALL SELECT 'sales', COUNT(*) FROM sales
UNION ALL SELECT 'product_sales', COUNT(*) FROM product_sales
UNION ALL SELECT 'payments', COUNT(*) FROM payments
UNION ALL SELECT 'delivery_sales', COUNT(*) FROM delivery_sales
UNION ALL SELECT 'delivery_addresses', COUNT(*) FROM delivery_addresses;

-- Freshness (max sale date)
SELECT MAX(created_at) AS latest_sale_at, MIN(created_at) AS earliest_sale_at FROM sales;

-- Null checks for key fields
SELECT COUNT(*) AS sales_missing_store FROM sales WHERE store_id IS NULL;
SELECT COUNT(*) AS sales_missing_channel FROM sales WHERE channel_id IS NULL;
SELECT COUNT(*) AS sales_missing_created_at FROM sales WHERE created_at IS NULL;

-- Negative or inconsistent amounts
SELECT COUNT(*) AS negative_total_amount FROM sales WHERE total_amount < 0;
SELECT COUNT(*) AS negative_total_items FROM sales WHERE total_amount_items < 0;
SELECT COUNT(*) AS negative_discounts FROM sales WHERE total_discount < 0;
SELECT COUNT(*) AS negative_value_paid FROM sales WHERE value_paid < 0;
SELECT COUNT(*) AS negative_production_seconds FROM sales WHERE production_seconds < 0;
SELECT COUNT(*) AS negative_delivery_seconds FROM sales WHERE delivery_seconds < 0;
SELECT COUNT(*) AS negative_people_quantity FROM sales WHERE people_quantity < 0;

-- Amount consistency (informational)
SELECT COUNT(*) AS amount_mismatch
FROM sales
WHERE ABS(
  total_amount
  - (COALESCE(total_amount_items, 0)
     - COALESCE(total_discount, 0)
     + COALESCE(total_increase, 0)
     + COALESCE(delivery_fee, 0)
     + COALESCE(service_tax_fee, 0))
) > 0.01;

-- Product sales sanity
SELECT COUNT(*) AS non_positive_item_qty FROM product_sales WHERE quantity <= 0;
SELECT COUNT(*) AS negative_item_price FROM product_sales WHERE total_price < 0;

-- Payment sanity
SELECT COUNT(*) AS negative_payment_value FROM payments WHERE value < 0;

-- Delivery sanity
SELECT COUNT(*) AS negative_delivery_fee FROM delivery_sales WHERE delivery_fee < 0;

-- PII sanity (customers)
SELECT COUNT(*) AS customers_missing_email
FROM customers
WHERE email IS NULL OR email = '';

SELECT COUNT(*) AS customers_invalid_email
FROM customers
WHERE email IS NOT NULL AND email <> '' AND POSITION('@' IN email) = 0;

SELECT COUNT(*) AS customers_missing_phone
FROM customers
WHERE phone_number IS NULL OR phone_number = '';

SELECT COUNT(*) AS customers_short_phone
FROM customers
WHERE phone_number IS NOT NULL
  AND LENGTH(REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g')) < 8;

-- Orphan checks (should be zero)
SELECT COUNT(*) AS orphan_product_sales
FROM product_sales ps
LEFT JOIN sales s ON s.id = ps.sale_id
WHERE s.id IS NULL;

SELECT COUNT(*) AS orphan_payments
FROM payments p
LEFT JOIN sales s ON s.id = p.sale_id
WHERE s.id IS NULL;

SELECT COUNT(*) AS orphan_delivery_sales
FROM delivery_sales ds
LEFT JOIN sales s ON s.id = ds.sale_id
WHERE s.id IS NULL;

-- Basic status distribution
SELECT sale_status_desc, COUNT(*) AS total
FROM sales
GROUP BY sale_status_desc
ORDER BY total DESC;
