#!/usr/bin/env python3
"""
Export heat score results into frontend-consumable JSON files.

Produces:
  - src/data/paper_heat_scores.json  (full ranked list with badges)
  - src/data/field_heat_topn.json    (top N per field)
  - src/data/heat_score_meta.json    (metadata for frontend, preserves warmup state)

Usage: python scripts/export_heat_json.py
"""

import json
from pathlib import Path
from datetime import datetime, timezone

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "src" / "data"

HEAT_SCORES_FILE = DATA_DIR / "paper_heat_scores.json"
FIELD_TOPN_FILE = DATA_DIR / "field_heat_topn.json"
META_FILE = DATA_DIR / "heat_score_meta.json"

TOPN_PER_FIELD = 20


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    print("╔══════════════════════════════════════════╗")
    print("║       Heat Score JSON Export             ║")
    print("╚══════════════════════════════════════════╝")

    if not HEAT_SCORES_FILE.exists():
        print(f"  ⚠ No heat scores found — run compute_heat_scores.py first")
        return

    all_scores = load_json(HEAT_SCORES_FILE)
    papers = all_scores.get("papers", [])
    print(f"Loaded {len(papers)} scored papers")

    # ── Field Top N ──
    field_groups = {}
    for p in papers:
        f = p["primary_field"]
        if f not in field_groups:
            field_groups[f] = []
        field_groups[f].append(p)

    field_topn = {}
    for f, group in field_groups.items():
        top = sorted(group, key=lambda x: -x["heat_score"])[:TOPN_PER_FIELD]
        field_topn[f] = [
            {
                "paper_id": p["paper_id"],
                "title": p["title"],
                "heat_score": p["heat_score"],
                "field_rank": p.get("field_rank", 0),
                "badges": p.get("badges", []),
            }
            for p in top
        ]

    field_output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "window_days": all_scores.get("window_days", 180),
        "topn_per_field": TOPN_PER_FIELD,
        "fields": field_topn,
    }
    save_json(FIELD_TOPN_FILE, field_output)
    field_count = sum(len(v) for v in field_topn.values())
    print(f"  field_heat_topn.json: {field_count} entries across {len(field_topn)} fields")

    # ── Write meta ──
    meta = {
        "version": all_scores.get("version", "half_year_heat_v1"),
        "generated_at": field_output["generated_at"],
        "window_days": field_output["window_days"],
        "warmup_days": all_scores.get("warmup_days", 0),
        "warmup_mode": all_scores.get("warmup_mode", "cold"),
        "missing_signals": all_scores.get("missing_signals", {}),
        "counts": {
            "total_papers": len(papers),
            "fields": len(field_topn),
            "hot_papers": sum(1 for p in papers if "Hot" in p.get("badges", [])),
            "rising_papers": sum(1 for p in papers if "Rising" in p.get("badges", [])),
        },
    }
    save_json(META_FILE, meta)
    print(f"  heat_score_meta.json: {meta['counts']}")

    print(f"\n✓ Done")


if __name__ == "__main__":
    main()
