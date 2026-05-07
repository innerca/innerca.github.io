#!/usr/bin/env python3
"""
Citation Signal Puller

Reads all papers from papers.json, fetches current citation counts from
Semantic Scholar batch API, and writes a daily snapshot.

Daily snapshots accumulate in src/data/signals/citations/YYYY-MM-DD.json.
After 7+ days of snapshots, B_cite (burst) becomes available.

Usage:
    python scripts/pull_citation_signals.py
    python scripts/pull_citation_signals.py --dry-run
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "src" / "data"
PAPERS_FILE = DATA_DIR / "papers.json"
SIGNALS_DIR = DATA_DIR / "signals" / "citations"

S2_API = "https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds"
SLEEP_BETWEEN_CALLS = 3  # seconds, S2 rate limit
BATCH_SIZE = 100  # max IDs per request


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def fetch_batch(ids):
    """Fetch citation counts for a batch of arXiv IDs from S2."""
    payload = json.dumps({"ids": [f"ArXiv:{i}" for i in ids]}).encode()
    req = Request(S2_API, data=payload, headers={"Content-Type": "application/json"})

    try:
        with urlopen(req, timeout=30) as resp:
            results = json.loads(resp.read())
    except HTTPError as e:
        body = e.read().decode()
        print(f"  ⚠ S2 API HTTP {e.code}: {body[:100]}")
        return {}
    except URLError as e:
        print(f"  ⚠ S2 API error: {e.reason}")
        return {}

    cite_map = {}
    for item in results:
        if item and item.get("externalIds", {}).get("ArXiv"):
            aid = item["externalIds"]["ArXiv"]
            cite_map[aid] = item.get("citationCount", 0)

    return cite_map


def main():
    parser = argparse.ArgumentParser(description="Pull citation signals for all papers")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════╗")
    print("║     Citation Signal Puller               ║")
    print("╚══════════════════════════════════════════╝")

    if not PAPERS_FILE.exists():
        print(f"✗ Papers file not found: {PAPERS_FILE}")
        sys.exit(1)

    papers = load_json(PAPERS_FILE)
    print(f"Loaded {len(papers)} papers")

    # Collect arXiv IDs
    arxiv_ids = []
    for p in papers:
        aid = None
        # Prefer id if it looks like arXiv ID
        pid = p.get("id", "")
        if pid and "." in pid and pid.split(".")[0].isdigit():
            aid = pid
        else:
            # Try sources array
            for s in p.get("sources", []):
                if s.get("key") == "arxiv" and s.get("sourceId"):
                    aid = s["sourceId"]
                    break
        if aid:
            arxiv_ids.append(aid)

    print(f"arXiv IDs to fetch: {len(arxiv_ids)}")
    if not arxiv_ids:
        print("  No arXiv IDs found — nothing to do")
        return

    # Batch into groups of BATCH_SIZE
    batches = [arxiv_ids[i : i + BATCH_SIZE] for i in range(0, len(arxiv_ids), BATCH_SIZE)]
    print(f"Batches: {len(batches)} (up to {BATCH_SIZE} IDs each)")

    if args.dry_run:
        print(f"\n✓ Dry run — would fetch citations for {len(arxiv_ids)} papers in {len(batches)} batches")
        return

    # Fetch
    all_citations = {}
    for i, batch in enumerate(batches):
        print(f"  Batch {i + 1}/{len(batches)} ({len(batch)} IDs)...")
        result = fetch_batch(batch)
        all_citations.update(result)

        if i < len(batches) - 1:
            time.sleep(SLEEP_BETWEEN_CALLS)

    fetched = len(all_citations)
    not_found = len(arxiv_ids) - fetched
    print(f"\nCitations: {fetched} fetched, {not_found} not found in S2 index")

    # Apply to papers (in memory + update citeCount)
    updated = 0
    for p in papers:
        aid = None
        pid = p.get("id", "")
        if pid and "." in pid and pid.split(".")[0].isdigit():
            aid = pid
        if aid and aid in all_citations:
            new_count = all_citations[aid]
            if p.get("citeCount", 0) != new_count:
                p["citeCount"] = new_count
                updated += 1
            # Also update the arxiv source record
            for s in p.get("sources", []):
                if s.get("key") == "arxiv":
                    s["citeCount"] = new_count
                    s["lastCrawled"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    print(f"Papers with updated citeCount: {updated}")

    # Write daily snapshot
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    snapshot = {
        "snapshot_date": today,
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "citation_source": "semantic_scholar",
        "total_ids": len(arxiv_ids),
        "fetched": fetched,
        "citations": all_citations,
    }
    snapshot_file = SIGNALS_DIR / f"{today}.json"
    save_json(snapshot_file, snapshot)
    print(f"\nSnapshot saved: {snapshot_file}")

    # Write updated papers
    save_json(PAPERS_FILE, papers)
    print(f"Papers saved: {PAPERS_FILE}")

    print(f"\n✓ Done — {fetched} citations, snapshot at {snapshot_file}")


if __name__ == "__main__":
    main()
