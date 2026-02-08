with source as (
  select * from {{ source('nextage', 'categories') }}
)

select
  id as category_id,
  name,
  type,
  deleted_at
from source
