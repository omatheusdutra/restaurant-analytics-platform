with sales as (
  select * from {{ ref('fct_sales') }}
)

select
  sale_date,
  store_id,
  channel_id,
  count(*) as orders_total,
  count(*) filter (where is_completed) as orders,
  count(*) filter (where is_cancelled) as orders_cancelled,
  sum(total_amount) filter (where is_completed) as revenue,
  sum(total_amount_items) filter (where is_completed) as gross_revenue,
  avg(total_amount) filter (where is_completed) as avg_ticket,
  sum(total_discount) filter (where is_completed) as total_discount,
  case
    when nullif(sum(total_amount_items) filter (where is_completed), 0) is null then null
    else sum(total_discount) filter (where is_completed)
      / nullif(sum(total_amount_items) filter (where is_completed), 0)
  end as discount_rate,
  case
    when nullif(count(*), 0) is null then null
    else (count(*) filter (where is_cancelled))::numeric / nullif(count(*), 0)
  end as cancellation_rate,
  avg(production_seconds) filter (where is_completed) as avg_production_seconds,
  avg(delivery_seconds) filter (where is_completed) as avg_delivery_seconds
from sales
group by sale_date, store_id, channel_id
