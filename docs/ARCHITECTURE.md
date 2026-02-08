# Architecture

## Purpose
This repository delivers a Restaurant Analytics platform with a local PostgreSQL dataset, a Node/Express API, and a React dashboard. The current architecture is intentionally simple for local development and challenge evaluation.

## Components
- PostgreSQL: single source of truth and storage for operational + analytical queries.
- Data generator: Python script to populate realistic data (6 months of sales).
- API (Node/Express + Prisma): serves metrics, exploration queries, dashboards and exports.
- Web app (React + Vite): dashboards, filters, charts, and CSV export.

## Data Flow
1. Data generator inserts operational data into PostgreSQL.
2. API queries PostgreSQL directly for metrics and exploration.
3. Web app calls the API and renders dashboards and charts.

Text diagram:
Data generator -> PostgreSQL -> API -> Web app / CSV export

## Current Boundaries
- There is no separate analytics warehouse or lakehouse layer.
- There is no batch orchestration layer (Airflow/Dagster/etc.).
- All metrics are computed on demand at query time.

## Analytics Layer (Lightweight)
For local analytics, the repo includes an optional SQL view layer under the `analytics` schema.
This creates staging, dimensions, facts and daily marts without changing the raw tables.

An optional dbt project lives in `dbt/` and can materialize similar models into `analytics_dbt`.

## Metadata and Lineage
- Metadata catalog: `metadata/datasets.json`
- Lineage events: `scripts/emit_openlineage.py`

## Operational Endpoints
- Health check: GET /health
- Readiness check: GET /ready

## Notes
This document describes the current architecture. Improvements and a phased evolution plan are tracked separately in the audit output.
