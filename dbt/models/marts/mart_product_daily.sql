with product_sales as (
  select * from {{ ref('fct_product_sales') }}
)

select
  sale_date,
  store_id,
  channel_id,
  product_id,
  sum(quantity) as units,
  sum(total_price) as revenue,
  case
    when nullif(sum(quantity), 0) is null then null
    else sum(total_price) / nullif(sum(quantity), 0)
  end as avg_unit_price
from product_sales
group by sale_date, store_id, channel_id, product_id
