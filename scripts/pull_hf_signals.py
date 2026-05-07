#!/usr/bin/env python3
"""
Hugging Face Daily Papers Signal Puller

Fetches HF Daily Papers API and writes daily snapshots.
Matches papers by arXiv ID and feeds into heat score S_buzz computation.

Usage:
    python scripts/pull_hf_signals.py
    python scripts/pull_hf_signals.py --days 7    # backfill last 7 days
    python scripts/pull_hf_signals.py --date 2026-05-01
"""

import json
import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta
from urllib.request import urlopen

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SIGNALS_DIR = PROJECT_ROOT / "src" / "data" / "signals" / "hf"
PAPERS_FILE = PROJECT_ROOT / "src" / "data" / "papers.json"

HF_API = "https://huggingface.co/api/daily_papers"


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def fetch_hf_papers(date_str=None):
    """Fetch HF Daily Papers for a given date (or today)."""
    url = HF_API
    if date_str:
        url += f"?date={date_str}"

    try:
        with urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        print(f"  ⚠ HF API error: {e}")
        return []

    # Extract arXiv IDs from the response
    papers = []
    for entry in data:
        paper = entry.get("paper", {})
        arxiv_id = paper.get("id", "")
        if arxiv_id and "." in arxiv_id:
            papers.append({
                "arxiv_id": arxiv_id,
                "title": paper.get("title", ""),
                "upvotes": paper.get("upvotes", 0),
                "published_at": paper.get("publishedAt", ""),
            })

    return papers


def match_and_tag(papers_json, hf_ids):
    """Tag papers in papers.json that match HF featured papers."""
    matched = 0
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    # Build a lookup set of arXiv IDs that have dots (are valid)
    hf_set = set()
    for pid in hf_ids:
        # Normalize: remove version suffix if present
        base = pid.split("v")[0] if "v" in pid else pid
        hf_set.add(base)

    for p in papers_json:
        pid = p.get("id", "")
        if pid in hf_set:
            p["hf_featured"] = True
            p["hf_last_seen"] = today
            matched += 1

    return matched


def main():
    parser = argparse.ArgumentParser(description="Pull HF Daily Papers signals")
    parser.add_argument("--date", help="Fetch a specific date (YYYY-MM-DD)")
    parser.add_argument("--days", type=int, help="Backfill last N days")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════╗")
    print("║    HF Daily Papers Signal Puller         ║")
    print("╚══════════════════════════════════════════╝")

    papers = load_json(PAPERS_FILE) if PAPERS_FILE.exists() else []
    print(f"Loaded {len(papers)} papers")

    dates_to_fetch = []
    if args.date:
        dates_to_fetch.append(args.date)
    elif args.days:
        base = datetime.now(timezone.utc)
        for i in range(args.days):
            d = (base - timedelta(days=i)).strftime("%Y-%m-%d")
            dates_to_fetch.append(d)
    else:
        dates_to_fetch.append(datetime.now(timezone.utc).strftime("%Y-%m-%d"))

    total_hf_ids = set()
    for date_str in dates_to_fetch:
        print(f"\nFetching HF Daily Papers for {date_str}...")
        hf_papers = fetch_hf_papers(date_str)
        print(f"  Got {len(hf_papers)} papers")

        if not hf_papers:
            continue

        hf_ids = [p["arxiv_id"] for p in hf_papers]
        total_hf_ids.update(hf_ids)

        if not args.dry_run:
            snapshot = {
                "snapshot_date": date_str,
                "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                "paper_count": len(hf_papers),
                "papers": hf_papers,
            }
            snapshot_file = SIGNALS_DIR / f"{date_str}.json"
            save_json(snapshot_file, snapshot)
            print(f"  Snapshot saved: {snapshot_file}")

    if not total_hf_ids:
        print("\nNo HF papers found.")
        return

    # Tag matching papers in papers.json
    matched = match_and_tag(papers, list(total_hf_ids))
    print(f"\nMatched {matched} papers in papers.json")

    # Show which papers matched
    if matched > 0 and not args.dry_run:
        for p in papers:
            if p.get("hf_featured"):
                print(f"  ✔ {p['id']}: {p.get('title', {}).get('en', '')[:60]}")

    if args.dry_run:
        print(f"\n✓ Dry run — {len(total_hf_ids)} unique HF papers, {matched} would be tagged")
        return

    save_json(PAPERS_FILE, papers)
    print(f"\n✓ Done — {matched} papers tagged as HF-featured")


if __name__ == "__main__":
    main()
