with source as (
  select * from {{ source('nola', 'products') }}
)

select
  id as product_id,
  name,
  category_id,
  cost_price,
  deleted_at
from source