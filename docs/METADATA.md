# Metadata

## Overview
This repo includes a minimal dataset catalog in JSON to document core inputs and outputs.

- Catalog file: `metadata/datasets.json`
- Lineage events: `scripts/emit_openlineage.py` (JSONL output)
- Metrics catalog: `docs/METRICS.md`

## Update Workflow
1. Edit `metadata/datasets.json` when tables or columns change.
2. Re-run the lineage emitter to refresh events.

## Emit Lineage Events
```bash
python scripts/emit_openlineage.py --output artifacts/openlineage/events.jsonl
```

## Notes
- The metadata file is intentionally lightweight and meant as a stepping stone to a full catalog.
