#!/usr/bin/env python3
"""Emit minimal OpenLineage events based on local metadata.

Outputs JSONL with START and COMPLETE events.
"""

from __future__ import annotations

import argparse
import json
import os
import uuid
from datetime import datetime, timezone

DEFAULT_NAMESPACE = "postgres://localhost:5432/nextage_db"
DEFAULT_JOB_NAMESPACE = "nextage.analytics"
DEFAULT_JOB_NAME = "dbt_build_marts"
SCHEMA_URL = "https://openlineage.io/spec/1-0-0/OpenLineage.json"
PRODUCER = "https://openlineage.io"

INPUT_DATASETS = [
    "public.sales",
    "public.product_sales",
    "public.products",
    "public.channels",
    "public.stores",
    "public.categories",
]

OUTPUT_DATASETS = [
    "analytics.mart_sales_daily",
    "analytics.mart_product_daily",
    "analytics_dbt.fct_sales",
    "analytics_dbt.fct_product_sales",
    "analytics_dbt.mart_sales_daily",
    "analytics_dbt.mart_product_daily",
]


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _load_metadata(path: str) -> dict[str, dict]:
    with open(path, "r", encoding="utf-8") as f:
        payload = json.load(f)
    datasets = payload.get("datasets", [])
    return {d.get("name"): d for d in datasets if d.get("name")}


def _dataset(name: str, namespace: str, meta_map: dict[str, dict]) -> dict:
    ds = {"namespace": namespace, "name": name}
    meta = meta_map.get(name)
    columns = (meta or {}).get("columns", [])
    if columns:
        ds["facets"] = {
            "schema": {
                "fields": [
                    {
                        "name": c.get("name"),
                        "type": c.get("type", ""),
                        "description": c.get("description", ""),
                    }
                    for c in columns
                    if c.get("name")
                ]
            }
        }
    return ds


def emit_events(output: str, metadata: str, namespace: str, job_namespace: str, job_name: str) -> None:
    meta_map = _load_metadata(metadata)
    inputs = [_dataset(name, namespace, meta_map) for name in INPUT_DATASETS]
    outputs = [_dataset(name, namespace, meta_map) for name in OUTPUT_DATASETS]

    run_id = str(uuid.uuid4())
    job = {"namespace": job_namespace, "name": job_name}

    events = []
    for event_type in ("START", "COMPLETE"):
        events.append(
            {
                "eventType": event_type,
                "eventTime": _iso_now(),
                "run": {"runId": run_id},
                "job": job,
                "inputs": inputs,
                "outputs": outputs,
                "producer": PRODUCER,
                "schemaURL": SCHEMA_URL,
            }
        )

    os.makedirs(os.path.dirname(output), exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        for event in events:
            f.write(json.dumps(event))
            f.write("\n")


def main() -> None:
    parser = argparse.ArgumentParser(description="Emit minimal OpenLineage events to JSONL.")
    parser.add_argument("--output", default="artifacts/openlineage/events.jsonl")
    parser.add_argument("--metadata", default="metadata/datasets.json")
    parser.add_argument("--namespace", default=DEFAULT_NAMESPACE)
    parser.add_argument("--job-namespace", default=DEFAULT_JOB_NAMESPACE)
    parser.add_argument("--job-name", default=DEFAULT_JOB_NAME)
    args = parser.parse_args()

    emit_events(
        output=args.output,
        metadata=args.metadata,
        namespace=args.namespace,
        job_namespace=args.job_namespace,
        job_name=args.job_name,
    )


if __name__ == "__main__":
    main()
