with product_sales as (
  select * from {{ ref('stg_product_sales') }}
),
sales as (
  select sale_id, sale_date, store_id, channel_id
  from {{ ref('stg_sales') }}
)

select
  ps.product_sale_id,
  ps.sale_id,
  s.sale_date,
  s.store_id,
  s.channel_id,
  ps.product_id,
  ps.quantity,
  ps.base_price,
  ps.total_price
from product_sales ps
join sales s on s.sale_id = ps.sale_id