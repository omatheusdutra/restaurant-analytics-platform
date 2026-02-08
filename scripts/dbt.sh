#!/usr/bin/env bash
set -euo pipefail

COMMAND=${1:-run}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DBT_DIR="$ROOT_DIR/dbt"

echo "Running dbt $COMMAND with profiles-dir=$DBT_DIR"
(
  cd "$DBT_DIR"
  dbt "$COMMAND" --profiles-dir .
)