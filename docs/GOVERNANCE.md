# Governance & Security (Minimal)

## Data Classification (Local)
- PII fields: `customers.email`, `customers.phone_number`, `customers.birth_date`.
- Sensitive operational fields: payments and delivery details.

## Current State
- Single-tenant local database.
- No explicit role-based access control for analytics tables.
- No masking at query time.

## Recommended Baseline (Next Step)
- Separate schemas for raw vs analytics and grant read-only access to analytics.
- Mask or exclude PII columns in analytics views for BI users.
- Use `analytics.dim_customer_public` for BI queries (no email/phone/birth_date).
- Define data owner for each core table (sales, product_sales, customers).

## Evidence
- Source tables in `public` schema.
- Analytics layer in `analytics` schema (`scripts/analytics_views.sql`).
