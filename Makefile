.PHONY: help postgres-up postgres-down data-gen backend-install backend-dev frontend-install frontend-dev test-backend test-frontend lint-frontend analytics-views data-quality contracts lineage dbt-run dbt-test

BACKEND_DIR=project/backend
FRONTEND_DIR=project/frontend

help:
	@echo "Targets:"
	@echo "  postgres-up       Start local Postgres"
	@echo "  postgres-down     Stop local Postgres (and remove volume)"
	@echo "  data-gen          Generate sample data"
	@echo "  backend-install   Install backend deps"
	@echo "  backend-dev       Run backend dev server"
	@echo "  frontend-install  Install frontend deps"
	@echo "  frontend-dev      Run frontend dev server"
	@echo "  test-backend      Run backend tests"
	@echo "  test-frontend     Run frontend tests"
	@echo "  lint-frontend     Run frontend lint"
	@echo "  analytics-views   Create analytics views"
	@echo "  data-quality      Run SQL data quality checks"
	@echo "  contracts         Run SQL schema contracts"
	@echo "  lineage           Emit OpenLineage events"
	@echo "  dbt-run           Run dbt models"
	@echo "  dbt-test          Run dbt tests"

postgres-up:
	docker compose up -d postgres

postgres-down:
	docker compose down -v

data-gen:
	docker compose --profile tools run --rm data-generator

backend-install:
	cd $(BACKEND_DIR) && npm ci

backend-dev:
	cd $(BACKEND_DIR) && npm run dev

frontend-install:
	cd $(FRONTEND_DIR) && npm ci

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev

test-backend:
	cd $(BACKEND_DIR) && npm test

test-frontend:
	cd $(FRONTEND_DIR) && npm test

lint-frontend:
	cd $(FRONTEND_DIR) && npm run lint

analytics-views:
	psql -U nextage -d nextage_db -f scripts/analytics_views.sql

data-quality:
	psql -U nextage -d nextage_db -f scripts/data_quality.sql

contracts:
	psql -U nextage -d nextage_db -f scripts/contracts.sql

lineage:
	python scripts/emit_openlineage.py --output artifacts/openlineage/events.jsonl

dbt-run:
	scripts/dbt.sh run

dbt-test:
	scripts/dbt.sh test
