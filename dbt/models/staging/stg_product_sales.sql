with source as (
  select * from {{ source('nextage', 'product_sales') }}
)

select
  id as product_sale_id,
  sale_id,
  product_id,
  quantity,
  base_price,
  total_price,
  observations
from source
