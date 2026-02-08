# Data Contracts

## Goal
Provide a minimal, versioned set of schema expectations for core tables. This is a pragmatic first step before adopting full contract tooling.

## Current Contract Checks
The contract checks live in `scripts/contracts.sql` and validate that critical columns exist in core tables.

Run:
```bash
psql -U nextage -d nextage_db -f scripts/contracts.sql
```

If the query returns rows, the schema is missing required columns.

## Covered Tables
- sales
- product_sales
- stores
- channels
- products
- categories

## Next Steps
- Add data type checks (e.g., numeric vs text)
- Add NOT NULL expectations for critical keys
- Automate in CI once database fixtures are available