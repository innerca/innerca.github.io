#!/usr/bin/env python3
"""
Heat Score Computation Engine

Calculates heat scores for papers in the 180-day window based on:
  - Citation velocity (field + age-bucket normalized)
  - Code availability
  - Community buzz (HF Daily Papers)
  - Venue authority
  - Freshness (age bucket)
  - Burst bonus (7-day deltas)

Usage:
    python scripts/compute_heat_scores.py
    python scripts/compute_heat_scores.py --dry-run

Dependencies:
    pip install pyyaml  # (optional, for YAML config)
"""

import json
import os
import sys
import math
import time
import argparse
from pathlib import Path
from datetime import datetime, timezone, timedelta

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "src" / "data"

PAPERS_FILE = DATA_DIR / "papers.json"
VENUE_TIERS_FILE = DATA_DIR / "venue_tiers.json"
SIGNALS_DIR = DATA_DIR / "signals" / "citations"
OUTPUT_FILE = DATA_DIR / "paper_heat_scores.json"
META_FILE = DATA_DIR / "heat_score_meta.json"

WINDOW_DAYS = 180

# Weights
W_CITE = 0.40
W_CODE = 0.20
W_BUZZ = 0.15
W_VENUE = 0.15
W_FRESH = 0.10

BURST_CAP = 15
BURST_W_CITE = 9
BURST_W_BUZZ = 4
BURST_W_CODE = 2

# Age bucket thresholds
BUCKETS = [
    (0, 30, "0_30d", 1.00),
    (31, 90, "31_90d", 0.85),
    (91, 180, "91_180d", 0.70),
]

# ─── Helpers ────────────────────────────────────────────────────────

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def days_since(date_str):
    """Calculate full days since a date string."""
    if not date_str:
        return WINDOW_DAYS + 1
    try:
        pub = datetime.strptime(date_str[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        return max(0, (now - pub).days)
    except ValueError:
        return WINDOW_DAYS + 1


def get_age_bucket(days):
    for lo, hi, label, fresh_score in BUCKETS:
        if lo <= days <= hi:
            return label, fresh_score
    return "180d+", 0.0


def clamp(value, lo=0.0, hi=1.0):
    return max(lo, min(hi, value))


def log1p(x):
    return math.log1p(max(0, x))


def match_venue_tier(venue_raw, tier_data):
    """Match a venue string to its tier. Returns 0.2 if unknown."""
    if not venue_raw:
        return 0.2

    venue_lower = venue_raw.lower()

    for tier_str, tier_info in sorted(tier_data["tiers"].items(), key=lambda x: -float(x[0])):
        tier_float = float(tier_str)
        for known in tier_info["venues"]:
            if known.lower() in venue_lower:
                return tier_float

    return 0.2


def compute_field_stats(papers):
    """Compute global citation statistics per field + age bucket."""
    # Group papers by field + age bucket
    buckets = {}
    for p in papers:
        field = p.get("primary_field", "unknown")
        days = days_since(p.get("date", ""))
        bucket_label, _ = get_age_bucket(days)
        key = (field, bucket_label)
        if key not in buckets:
            buckets[key] = []
        buckets[key].append(p.get("citeCount", 0))

    stats = {}
    for (field, bucket), citations in buckets.items():
        sorted_c = sorted(citations)
        n = len(sorted_c)
        p95_idx = max(0, int(n * 0.95) - 1)
        stats[(field, bucket)] = {
            "paper_count": n,
            "p95_citation": sorted_c[p95_idx] if n > 0 else 0,
            "p50_citation": sorted_c[n // 2] if n > 0 else 0,
        }

    return stats


# ─── Cold Start Detection ──────────────────────────────────────────

def detect_warmup_state():
    """
    Check how many days of citation snapshots exist.
    Returns (warmup_days, mode) where mode is one of:
      - "cold":   no snapshots (burst_bonus = 0)
      - "warmup": 1-6 snapshots (weak burst only)
      - "ready":  7+ snapshots (full burst enabled)
    """
    if not SIGNALS_DIR.exists():
        return 0, "cold"

    snapshots = sorted(SIGNALS_DIR.glob("*.json"))
    n = len(snapshots)

    if n == 0:
        return 0, "cold"
    elif n < 7:
        return n, "warmup"
    else:
        return n, "ready"


def load_citation_history():
    """Load all citation snapshots and compute per-paper deltas."""
    if not SIGNALS_DIR.exists():
        return {}, 0

    snapshots = sorted(SIGNALS_DIR.glob("*.json"))
    if len(snapshots) < 2:
        return {}, len(snapshots)

    # Get the latest two snapshots for 7-day delta
    # (7+ days apart would be ideal, but daily snapshots is good enough)
    latest = json.loads(open(snapshots[-1]).read())
    oldest_available = json.loads(open(snapshots[0]).read())

    deltas = {}
    for paper_id, current_count in latest.get("citations", {}).items():
        old_count = oldest_available.get("citations", {}).get(paper_id, 0)
        delta = max(0, current_count - old_count)
        if delta > 0:
            deltas[paper_id] = delta

    return deltas, len(snapshots)


# ─── Scoring ────────────────────────────────────────────────────────

def score_paper(paper, field_stats, venue_tiers, warmup_mode, citation_deltas, field_p95_delta):
    """Compute all heat score components for a single paper."""
    days = days_since(paper.get("date", ""))
    bucket_label, fresh_score = get_age_bucket(days)

    if days > WINDOW_DAYS:
        return None  # Outside window

    primary_field = paper.get("primary_field") or (paper.get("categories") or ["unknown"])[0]
    cite_count = paper.get("citeCount", 0)

    # ── S_cite: log1p normalized by field + age bucket ──
    bucket_key = (primary_field, bucket_label)
    bs = field_stats.get(bucket_key)
    if bs and bs["p95_citation"] > 0:
        s_cite = clamp(log1p(cite_count) / log1p(bs["p95_citation"]))
    else:
        s_cite = 0.0

    # ── S_code: no data source yet ──
    s_code = 0.0

    # ── S_buzz: no data source yet ──
    s_buzz = 0.0

    # ── S_venue ──
    venue_raw = paper.get("venue", "")
    s_venue = match_venue_tier(venue_raw, venue_tiers)

    # ── S_fresh ──
    s_fresh = fresh_score

    # ── Base score ──
    base_score = 100 * (W_CITE * s_cite + W_CODE * s_code + W_BUZZ * s_buzz + W_VENUE * s_venue + W_FRESH * s_fresh)

    # ── Burst bonus ──
    b_cite = 0.0
    b_buzz = 0.0
    b_code = 0.0

    if warmup_mode == "ready":
        # Full burst: citation delta + HF + code
        paper_id_arxiv = paper.get("id", "")
        delta = citation_deltas.get(paper_id_arxiv, 0)
        b_cite = clamp(delta / field_p95_delta) if field_p95_delta > 0 else 0.0

    elif warmup_mode == "warmup":
        # Weak burst: only HF/code (no citation history yet)
        pass  # b_cite stays 0, b_buzz/code handled below

    # b_buzz and b_code are always 0 until HF/PwC are integrated
    burst_bonus = min(BURST_CAP, BURST_W_CITE * b_cite + BURST_W_BUZZ * b_buzz + BURST_W_CODE * b_code)

    heat_score = base_score + burst_bonus

    return {
        "paper_id": paper.get("id", ""),
        "title": paper.get("title", {}).get("en", ""),
        "primary_field": primary_field,
        "published_at": paper.get("date", ""),
        "age_days": days,
        "age_bucket": bucket_label,
        "cite_count": cite_count,
        "s_cite": round(s_cite, 4),
        "s_code": round(s_code, 4),
        "s_buzz": round(s_buzz, 4),
        "s_venue": round(s_venue, 4),
        "s_fresh": round(s_fresh, 4),
        "base_score": round(base_score, 2),
        "burst_bonus": round(burst_bonus, 2),
        "heat_score": round(heat_score, 2),
        "b_cite": round(b_cite, 4),
        "b_buzz": round(b_buzz, 4),
        "b_code": round(b_code, 4),
    }


def compute_rankings(scored_papers):
    """Compute field-level and global rankings."""
    # Field-level ranking
    field_groups = {}
    for sp in scored_papers:
        f = sp["primary_field"]
        if f not in field_groups:
            field_groups[f] = []
        field_groups[f].append(sp)

    for f, group in field_groups.items():
        group.sort(key=lambda x: (-x["heat_score"], -x.get("cite_count", 0)))
        for rank, sp in enumerate(group, 1):
            sp["field_rank"] = rank
            sp["field_total"] = len(group)

    # Field percentile
    for sp in scored_papers:
        total = sp.get("field_total", 1)
        rank = sp.get("field_rank", 1)
        sp["field_percentile"] = clamp((total - rank) / max(total - 1, 1), 0, 1)

    # Global ranking
    sorted_global = sorted(scored_papers, key=lambda x: -x["heat_score"])
    for rank, sp in enumerate(sorted_global, 1):
        sp["global_rank"] = rank

    # Global score (blend of field_percentile + normalized field size)
    max_field_size = max((len(g) for g in field_groups.values()), default=1)
    for sp in scored_papers:
        field_size = len(field_groups.get(sp["primary_field"], []))
        normalized_field_size = field_size / max_field_size
        sp["global_score"] = round(0.8 * sp["field_percentile"] + 0.2 * normalized_field_size, 4)

    return scored_papers


def assign_badges(scored_papers):
    """Assign trend badges based on score thresholds."""
    for sp in scored_papers:
        badges = []
        if sp["field_percentile"] >= 0.90:
            badges.append("Hot")
        if sp["burst_bonus"] >= 8:
            badges.append("Rising")
        sp["badges"] = badges
    return scored_papers


# ─── Main ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Compute heat scores for papers")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no writes")
    args = parser.parse_args()

    print("╔══════════════════════════════════════════╗")
    print("║      Heat Score Computation Engine       ║")
    print("╚══════════════════════════════════════════╝")

    if not PAPERS_FILE.exists():
        print(f"✗ Papers file not found: {PAPERS_FILE}")
        sys.exit(1)

    papers = load_json(PAPERS_FILE)
    print(f"Loaded {len(papers)} papers")

    venue_tiers = load_json(VENUE_TIERS_FILE) if VENUE_TIERS_FILE.exists() else {"tiers": {}}
    print(f"Loaded venue tiers ({sum(len(v['venues']) for v in venue_tiers['tiers'].values())} entries)")

    # Filter to window
    window_papers = [p for p in papers if days_since(p.get("date", "")) <= WINDOW_DAYS]
    print(f"Papers in {WINDOW_DAYS}-day window: {len(window_papers)}")

    # Detect warmup state
    warmup_days, warmup_mode = detect_warmup_state()
    citation_deltas, snapshots_count = load_citation_history()
    mode_label = {"cold": "❄️ Cold start (burst=0)", "warmup": f"🌤️ Warmup day {warmup_days}/7", "ready": "🔥 Full burst enabled"}
    print(f"Warmup: {mode_label.get(warmup_mode, warmup_mode)} ({snapshots_count} snapshots)")

    # Compute field stats
    field_stats = compute_field_stats(window_papers)
    print(f"Field + age-bucket groups: {len(field_stats)}")

    # Compute field p95 delta for burst normalization
    all_deltas = list(citation_deltas.values())
    field_p95_delta = sorted(all_deltas)[max(0, int(len(all_deltas) * 0.95) - 1)] if len(all_deltas) > 0 else 0

    # Score each paper
    scored = []
    for p in window_papers:
        result = score_paper(p, field_stats, venue_tiers, warmup_mode, citation_deltas, field_p95_delta)
        if result:
            scored.append(result)

    print(f"Scored: {len(scored)} papers")

    # Rank and badge
    scored = compute_rankings(scored)
    scored = assign_badges(scored)

    # Stats
    with_signals = sum(1 for s in scored if s["s_cite"] > 0 or s["s_venue"] > 0.2)
    hot_count = sum(1 for s in scored if "Hot" in s["badges"])
    rising_count = sum(1 for s in scored if "Rising" in s["badges"])
    fields = len(set(s["primary_field"] for s in scored))

    print(f"\nResults:")
    print(f"  Fields: {fields}")
    print(f"  Mode: {warmup_mode}")
    print(f"  With signals: {with_signals}")
    print(f"  Hot: {hot_count} | Rising: {rising_count}")
    print(f"  Heat score range: {min(s['heat_score'] for s in scored):.1f} ~ {max(s['heat_score'] for s in scored):.1f}")

    if args.dry_run:
        print("\n✓ Dry run — no files written")
        return

    # Build missing signals info based on warmup state
    missing = {}
    if warmup_mode != "ready":
        missing["b_cite"] = f"Citation history: {snapshots_count}/7 days needed for burst"
    if True:  # Always missing until integrated
        missing["s_code"] = "Papers with Code not yet integrated"
        missing["s_buzz"] = "Hugging Face Daily Papers not yet integrated"

    # Save
    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "warmup_days": snapshots_count,
        "warmup_mode": warmup_mode,
        "window_days": WINDOW_DAYS,
        "missing_signals": missing,
        "papers": scored,
    }
    save_json(OUTPUT_FILE, output)

    meta = {
        "version": "half_year_heat_v1",
        "generated_at": output["generated_at"],
        "warmup_days": snapshots_count,
        "warmup_mode": warmup_mode,
        "window_days": WINDOW_DAYS,
        "counts": {
            "total_papers": len(papers),
            "ranked_papers": len(scored),
            "fields": fields,
            "hot": hot_count,
            "rising": rising_count,
        },
    }
    save_json(META_FILE, meta)

    print(f"\n✓ Done: {OUTPUT_FILE.name}, {META_FILE.name}")


if __name__ == "__main__":
    main()
