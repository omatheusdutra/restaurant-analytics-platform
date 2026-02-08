# 🍽️📊 Restaurant Analytics

[![Node.js](https://img.shields.io/badge/node-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/frontend-React%2018-61DAFB?logo=react&logoColor=111827)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2015-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Jest](https://img.shields.io/badge/tests-Jest-C21325?logo=jest&logoColor=white)](project/backend/package.json)
[![Vitest](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)](project/frontend/package.json)
[![Pytest](https://img.shields.io/badge/smoke-Pytest-0A9EDC?logo=pytest&logoColor=white)](scripts/test_api.py)
[![dbt](https://img.shields.io/badge/data-dbt-FF694B?logo=dbt&logoColor=white)](dbt/)
[![Docker](https://img.shields.io/badge/runtime-Docker-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![CI](https://img.shields.io/badge/ci-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](.github/workflows/ci.yml)
[![Gitleaks](https://img.shields.io/badge/security-Gitleaks-8B5CF6?logo=git&logoColor=white)](.github/workflows/gitleaks.yml)
[![Dependabot](https://img.shields.io/badge/dependencies-Dependabot-025E8C?logo=dependabot&logoColor=white)](.github/dependabot.yml)

🍕 Plataforma de analytics para restaurantes
📈 Visualize métricas, explore dados e tome decisões orientadas por fatos.

---

## 🧭 Sumário

- [Visão Geral](#visão-geral)
- [Resumo em Inglês](#english-summary)
- [Capturas de Tela](#screenshots)
- [Pilha Tecnológica](#stack)
- [Arquitetura](#arquitetura)
- [O que foi alterado recentemente](#o-que-foi-alterado-recentemente)
- [Guia Rápido Completo](#quickstart-completo)
- [Scripts Principais](#scripts-principais)
- [Testes](#testes)
- [dbt (Opcional)](#dbt-opcional)
- [Validação Completa](#validação-completa)
- [Healthcheck Rápido](#healthcheck-rápido)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Endpoints da API](#api-endpoints)
- [Segurança e Qualidade](#segurança-e-qualidade)
- [Documentação](#documentação)
- [Solução de Problemas](#troubleshooting)

---

## 📌 Visão Geral

Este monorepo entrega:

- API backend em Node.js/Express com Prisma/PostgreSQL e JWT 🔐.
- Frontend React com dashboard, insights e exploração ad-hoc 🧭.
- Camada analítica SQL com views e checks de qualidade/contratos ✅.
- Scripts de automação para setup, reset de dados e validação end-to-end 🤖.

Objetivo do produto:

- Consolidar indicadores operacionais e financeiros de restaurantes 💰.
- Apoiar tomada de decisão com métricas confiáveis e exploração flexível 🎯.

---

## 🌎 English Summary

`Restaurant Analytics` is a restaurant analytics platform built as a full-stack TypeScript monorepo.
It includes:

- Express + Prisma + PostgreSQL backend
- React + Vite frontend with dashboards and ad-hoc explore
- SQL analytics views and data quality checks
- End-to-end validation scripts for local production-like workflows

Main local flow:

1. `npm run db:reset` in `project/backend`
2. `scripts/start_all.ps1`
3. Optional: `scripts/validate_all.ps1`

---

## 🖼️ Screenshots

> Substitua os caminhos abaixo pelos arquivos finais de imagem do projeto.

| Dashboard | Explore |
| --- | --- |
| ![Dashboard](docs/assets/dashboard.png) | ![Explore](docs/assets/explore.png) |

| Data Quality | Insights |
| --- | --- |
| ![Data Quality](docs/assets/data-quality.png) | ![Insights](docs/assets/insights.png) |

## 🧰 Stack

### Backend

- Node.js + TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Pino + pino-http (logs estruturados)
- Helmet, CORS, rate limit

### Frontend

- React + TypeScript
- Vite
- TanStack Query
- TailwindCSS
- Recharts
- Zustand

### Data / Plataforma

- Docker Compose (Postgres + data generator + pgAdmin profile)
- SQL analytics em `scripts/analytics_views.sql`
- Checks em `scripts/data_quality.sql` e `scripts/contracts.sql`
- dbt opcional em `dbt/`

---

## 🏗️ Arquitetura

```text
[Frontend React]
      |
      v
[Backend API Express]
      |
      v
[PostgreSQL]
  |       \
  |        -> [Views analytics.*]
  |
  -> [Data generator via docker compose profile tools]
```

Estrutura principal:

```text
project/
  backend/      # API + Prisma + testes Jest
  frontend/     # App React + testes Vitest
scripts/        # SQL, validação e automação
docs/           # guias de produto, métricas e operação
dbt/            # projeto dbt opcional
```

---

## 🆕 O que foi alterado recentemente

- Banco padronizado para:
  - DB: `nextage_db`
  - User: `nextage`
  - Password: `alan_zoka`
- Containers renomeados:
  - Postgres: `nextage-db`
  - PgAdmin: `nextage-pgadmin`
  - Data generator: `nextage-god-level-analytics-data-generator-run`
- `start_all.ps1`:
  - prepara backend/frontend
  - não sobe Postgres automaticamente
  - fluxo esperado: rodar `npm run db:reset` antes
- `validate_all.ps1`:
  - sobe Postgres automaticamente na validação
  - fallback para `docker compose exec` quando `psql` não existe
  - gera JWT automaticamente para checks de API quando `-ApiToken` não e informado
  - sobe API/Frontend em background, valida endpoints e finaliza processos
- Frontend:
  - menu `Insights` com deep-link para seção correta no dashboard
  - Explore com paginação (API + UI)
  - conversao de moeda (BRL/USD/EUR) com cotacao em runtime
  - modal "Central de Ajuda" com fechamento por botão e clique fora
- Backend Explore:
  - correcao de query SQL dinâmica
  - normalizacao de `BigInt`/`Decimal` para evitar erro 500 em serialização

---

## ⚡ Quickstart Completo

Pré-requisitos:

- Node.js 18+ 🟢
- Docker Desktop 🐳
- PowerShell (Windows) 🪟

### 1) Clonar e entrar na raiz 📂

```powershell
git clone <repo-url>
cd nextage-god-level-analytics
```

### 2) Criar arquivos `.env` 🔐

```powershell
Copy-Item .env.example .env
Copy-Item project/backend/.env.example project/backend/.env
Copy-Item project/frontend/.env.example project/frontend/.env
```

### 3) Reset completo do banco + seed 🗄️

```powershell
cd project/backend
npm install
npm run db:reset
cd ../..
```

`db:reset` executa:

- `docker compose down -v`
- `docker compose up -d postgres`
- aguarda `pg_isready`
- `prisma generate`
- `prisma db push --accept-data-loss`
- `docker compose run --rm data-generator`

### 4) Subir aplicacao ▶️

```powershell
.\scripts\start_all.ps1
```

Por padrao, o script abre dois processos:

- backend (`npm run dev`) em `project/backend`
- frontend (`npm run dev`) em `project/frontend`

---

## 🧩 Scripts Principais

| Script | Objetivo |
| --- | --- |
| `project/backend/npm run db:reset` | Reset DB, aplicar schema Prisma e gerar dados |
| `scripts/start_all.ps1` | Setup backend/frontend e start dos 2 servidores |
| `scripts/validate_all.ps1` | Validacao E2E (SQL + testes + API checks) |
| `scripts/healthcheck.ps1` | Check rapido de Docker/Postgres/API/Frontend (com status PASS/FAIL) |
| `scripts/test_api.py` | Smoke test simples de API |
| `scripts/dbt.ps1` / `scripts/dbt.sh` | Comandos dbt (opcional) |

Opcoes uteis de `start_all.ps1`:

```powershell
# sem subir backend/frontend
.\scripts\start_all.ps1 -NoStartServers

# sobe e aplica views/checks
.\scripts\start_all.ps1 -ApplyAnalyticsViews

# sobe e roda smoke de API
.\scripts\start_all.ps1 -RunApiTest
```

---

## 🧪 Testes

Comandos principais:

```powershell
# Backend (Jest)
cd project/backend
npm test

# Frontend (Vitest)
cd ../frontend
npm test

# Smoke de API (Python)
cd ../..
python scripts/test_api.py
```

Cobertura:

```powershell
# Backend
cd project/backend
npm test

# Frontend
cd ../frontend
npm run test:coverage
```

Validação completa (recomendado):

```powershell
cd ../..
.\scripts\validate_all.ps1 -ApiBaseUrl "http://localhost:3001" -QualityTrendDays 7
```

---

## 🔶 dbt (Opcional)

Comandos recomendados (na pasta `dbt`):

```powershell
cd dbt
pip install -r requirements.txt
Copy-Item profiles.yml.example profiles.yml

# limpeza e dependências
dbt clean
dbt deps

# validação e execução
dbt debug --profiles-dir .
dbt run --profiles-dir .
dbt test --profiles-dir .
```

Observação:
- O profile do projeto é `nextage_analytics`.

---
## 🧪 Validação Completa

Rodar da raiz:

```powershell
.\scripts\validate_all.ps1 -ApiBaseUrl "http://localhost:3001" -QualityTrendDays 7
```

Com token explícito:

```powershell
.\scripts\validate_all.ps1 -ApiToken "<SEU_JWT>" -ApiBaseUrl "http://localhost:3001" -QualityTrendDays 7
```

O script executa:

1. Sobe Postgres e aguarda `healthy`.
2. Aplica `analytics_views.sql`.
3. Roda `data_quality.sql` e `contracts.sql`.
4. Roda testes backend (com integração se DB disponivel).
5. Roda testes frontend.
6. Sobe API/Frontend para checks opcionais.
7. Gera JWT automatico (se necessário) e valida endpoints de qualidade.
8. Encerra processos iniciados pelo script.

---

## 🩺 Healthcheck Rápido

Use para validar rapidamente se o ambiente está operacional:

```powershell
.\scripts\healthcheck.ps1
```

Opções comuns:

```powershell
# ignorar check do frontend
.\scripts\healthcheck.ps1 -CheckFrontend:$false

# incluir testes backend/frontend
.\scripts\healthcheck.ps1 -RunBackendTests -RunFrontendTests
```

Comportamento esperado:

- Saída em tabela com `PASS` / `FAIL` por verificação.
- `exit code 0` quando tudo passar.
- `exit code 1` quando houver falha (ex.: Docker daemon sem permissão).

---
## ⚙️ Variáveis de Ambiente

### Raiz (`.env`)

```env
POSTGRES_DB=nextage_db
POSTGRES_USER=nextage
POSTGRES_PASSWORD=alan_zoka
PGADMIN_DEFAULT_EMAIL=admin@godlevel.com
PGADMIN_DEFAULT_PASSWORD=admin
GEN_DB_URL=postgresql://nextage:alan_zoka@postgres:5432/nextage_db
```

### Backend (`project/backend/.env`)

```env
DATABASE_URL="postgresql://nextage:alan_zoka@localhost:5432/nextage_db"
JWT_SECRET="change-me-super-long-and-random"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
LOG_LEVEL=info
```

### Frontend (`project/frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_QUALITY_WARN_AT=1
VITE_QUALITY_TREND_DAYS=7
```

Importante:

- Fora de `test`, backend exige `DATABASE_URL`, `JWT_SECRET` e `CORS_ORIGIN` 🚨.
- Sem isso, a API falha no startup por seguranca 🛡️.

---

## 🔌 API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`
- `PUT /api/auth/profile`
- `POST /api/auth/change-password`

### Metrics

- `GET /api/metrics/overview`
- `GET /api/metrics/top-products`
- `GET /api/metrics/sales-by-channel`
- `GET /api/metrics/sales-by-store`
- `GET /api/metrics/heatmap`
- `GET /api/metrics/time-series`
- `GET /api/metrics/categories`
- `GET /api/metrics/filters` (público)
- `GET /api/metrics/export-csv`
- `GET /api/metrics/insights`
- `GET /api/metrics/customers-at-risk`
- `GET /api/metrics/data-quality`
- `GET /api/metrics/data-quality-trend`

### Explore

- `POST /api/explore/query`
- `GET /api/explore/query`
- suporte a `format=csv`
- paginação: `page`, `pageSize`, `total`, `totalPages`

### Dashboards

- `POST /api/dashboards`
- `GET /api/dashboards`
- `GET /api/dashboards/:id`
- `PUT /api/dashboards/:id`
- `DELETE /api/dashboards/:id`
- `GET /api/dashboards/shared/:shareToken` (público, rate-limited)

---

## 🔒 Segurança e Qualidade

- `helmet`, `compression`, `cors` configurado
- rate limit em `/api/auth` e `/api`
- logs estruturados com redação de `Authorization`
- cache por usuário em endpoints protegidos
- SQL quality checks + contracts checks
- backend tests e frontend tests no fluxo de validação

---

## 📚 Documentação

- `docs/PRODUCT.md`
- `docs/METRICS.md`
- `docs/BI_GUIDE.md`
- `docs/ARCHITECTURE.md`
- `docs/ANALYTICS_MODEL.md`
- `docs/DATA_CONTRACTS.md`
- `docs/RUNBOOK.md`
- `docs/ENV_CHECKLIST.md`

---

## 🛠️ Troubleshooting

### 1) `DATABASE_URL not found`

Confirme `project/backend/.env` com `DATABASE_URL` válido.

### 2) `psql` não encontrado

Use os scripts da raiz (`validate_all.ps1`) que ja fazem fallback para `docker compose exec`.

### 3) Frontend sem dados

- verifique API em `http://localhost:3001/health`
- confira token/login
- rode novamente `npm run db:reset`

### 4) Home sem recarregar dados

Botao `Inicio` invalida cache de dashboard. Se necessário, force refresh (`Ctrl+F5`) apos atualizar o frontend.

---

## 📄 License

MIT

