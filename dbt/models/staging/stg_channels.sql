with source as (
  select * from {{ source('nextage', 'channels') }}
)

select
  id as channel_id,
  name,
  type,
  commission_pct,
  description
from source
