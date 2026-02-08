with source as (
  select * from {{ source('nola', 'stores') }}
)

select
  id as store_id,
  name,
  city,
  state,
  district,
  is_active,
  is_own,
  is_holding,
  creation_date
from source