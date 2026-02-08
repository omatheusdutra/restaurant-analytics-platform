with sales as (
  select * from {{ ref('stg_sales') }}
)

select
  sale_id,
  created_at,
  sale_date,
  store_id,
  channel_id,
  sub_brand_id,
  customer_id,
  sale_status_desc,
  (sale_status_desc = 'COMPLETED') as is_completed,
  (sale_status_desc = 'CANCELLED') as is_cancelled,
  total_amount_items,
  total_discount,
  total_increase,
  delivery_fee,
  service_tax_fee,
  total_amount,
  value_paid,
  production_seconds,
  delivery_seconds,
  people_quantity,
  origin
from sales