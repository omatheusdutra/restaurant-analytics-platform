# Product Overview (Restaurant Analytics)

## What The Product Is Today
This repository delivers a local analytics stack for restaurant operations. It ingests operational sales data into Postgres, exposes cleaned analytics views and dbt models, and serves a web UI plus API for exploration. The current data model covers sales, products, stores, channels, customers, payments, and delivery.

## Core Users
- Owner / Operator: profitability, growth, and store comparison.
- Store Manager: daily performance, peak hours, and cancellations.
- Finance: revenue, discounts, and payment completeness.
- Marketing: channel performance and product mix.

## Business Decisions Supported
- Which channels drive the best net revenue?
- Which stores underperform and why?
- Which products are driving revenue and volume?
- When are peak hours/days and how do they trend?
- Are cancellations or discounts eroding margins?

## Where The Product Stops Today
- No explicit business metric catalog in the UI.
- No tenant segregation (multi-restaurant) policies in the model.
- No SLAs/SLOs or data freshness alerts.

## Evidence (Repo)
- Analytics views: `scripts/analytics_views.sql`
- dbt models: `dbt/models/*`
- Metadata catalog: `metadata/datasets.json`
