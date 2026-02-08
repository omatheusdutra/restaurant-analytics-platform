with source as (
  select * from {{ source('nola', 'sales') }}
)

select
  id as sale_id,
  created_at,
  created_at::date as sale_date,
  store_id,
  channel_id,
  sub_brand_id,
  customer_id,
  sale_status_desc,
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
  discount_reason,
  increase_reason,
  origin
from source