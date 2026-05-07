#!/usr/bin/env python3
"""
Tag Management Script

Periodically reviews all paper tags, merges synonyms, recommends new tags,
and keeps the tag taxonomy healthy — all driven by AI (Groq).

Usage:
    export GROQ_API_KEY="gsk_..."
    python scripts/manage_tags.py          # Review + apply changes
    python scripts/manage_tags.py --dry-run  # Preview only, no writes

Schedule: monthly (first Monday of each month via GitHub Actions)
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

from groq import Groq

# ─── Config ────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"
MAX_TAGS_PER_PAPER = 5

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "src" / "data" / "papers.json"
TAGS_FILE = PROJECT_ROOT / "src" / "data" / "tags.json"
TAG_HISTORY_FILE = PROJECT_ROOT / "src" / "data" / "tag-history.json"

# ─── I/O ───────────────────────────────────────────────────────────

def load_papers():
    if not DATA_FILE.exists():
        print(f"✗ Data file not found: {DATA_FILE}")
        sys.exit(1)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def save_papers(papers):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)
        f.write("\n")

def load_tag_history():
    if TAG_HISTORY_FILE.exists():
        with open(TAG_HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"runs": []}

def save_tag_history(history):
    with open(TAG_HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
        f.write("\n")

# ─── AI Tag Review ─────────────────────────────────────────────────

def get_tag_stats(papers):
    """Count how many papers each tag appears on."""
    counts = {}
    for p in papers:
        for t in p.get("tags", []):
            if t:
                counts[t] = counts.get(t, 0) + 1
    return counts

def review_tags(tag_counts):
    """Call Groq API to review current tags and suggest changes."""
    client = Groq(api_key=GROQ_API_KEY)

    system_prompt = f"""你是一个学术论文标签维护助手。当前所有论文的标签统计如下（标签名: 出现次数）：
{json.dumps(tag_counts, ensure_ascii=False, indent=2)}

请分析并返回严格 JSON（不要包含任何 markdown 标记，只输出 JSON 对象）：

1. merges: 找出同义词，指定合并目标（如 "LLM" → "大型语言模型"）
2. recommended: 推荐 3-5 个新标签（基于当前 CS/AI 学术界热点），中英文
3. standard_tags: 最终的标准标签列表（控制在 10-15 个），中英文

输出格式：
{{
  "merges": [{{"from": "旧标签", "to": "标准标签"}}],
  "recommended": [{{"en": "New Tag Name", "zh": "新标签名"}}],
  "standard_tags": [{{"en": "Computer Vision", "zh": "计算机视觉"}}]
}}"""

    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[{"role": "system", "content": system_prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    return json.loads(completion.choices[0].message.content)


def apply_tag_updates(papers, rules):
    """Rewrite paper tags based on AI review rules."""
    # Build merge map
    merge_map = {m["from"]: m["to"] for m in rules.get("merges", [])}
    standard_set = {t["zh"] for t in rules.get("standard_tags", [])}

    changes = 0
    for paper in papers:
        old_tags = paper.get("tags", [])
        if not old_tags:
            continue

        new_tags = []
        for t in old_tags:
            t = merge_map.get(t, t)       # merge synonym
            if t not in standard_set:
                continue                  # drop non-standard
            new_tags.append(t)

        # Deduplicate and limit
        new_tags = list(dict.fromkeys(new_tags))[:MAX_TAGS_PER_PAPER]

        if set(new_tags) != set(old_tags[:MAX_TAGS_PER_PAPER]):
            changes += 1
        paper["tags"] = new_tags

    return changes


def write_standard_tags(rules):
    """Write current standard tag list to tags.json."""
    with open(TAGS_FILE, "w", encoding="utf-8") as f:
        json.dump(rules["standard_tags"], f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"  Wrote {len(rules['standard_tags'])} standard tags → tags.json")

    # Log history
    history = load_tag_history()
    history["runs"].append({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "merges": rules.get("merges", []),
        "recommended": rules.get("recommended", []),
        "standard_tags": rules["standard_tags"],
    })
    save_tag_history(history)
    print(f"  Logged to tag-history.json")


# ─── Main ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="AI-powered tag maintenance")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    if not GROQ_API_KEY:
        print("✗ GROQ_API_KEY not set")
        sys.exit(1)

    print("╔══════════════════════════════════════════╗")
    print("║        AI Tag Maintenance                ║")
    print("╚══════════════════════════════════════════╝")

    papers = load_papers()
    print(f"Loaded {len(papers)} papers")

    tag_counts = get_tag_stats(papers)
    used_tags = [t for t, c in sorted(tag_counts.items(), key=lambda x: -x[1])]
    print(f"Current unique tags: {len(used_tags)}")
    if used_tags:
        print(f"  e.g. {used_tags[:10]}{'...' if len(used_tags) > 10 else ''}")

    # If no tags yet, nothing to manage
    if not used_tags:
        print("\nNo tags found (Groq summarizer hasn't run yet). Nothing to do.")
        return

    print(f"\nReviewing tags with {MODEL_NAME}...")
    rules = review_tags(tag_counts)
    print(f"\nAI Review Results:")
    print(f"  Merges: {len(rules.get('merges', []))}")
    for m in rules.get("merges", []):
        print(f"    {m['from']} → {m['to']}")
    print(f"  Recommended new: {[t['zh'] for t in rules.get('recommended', [])]}")
    print(f"  Standard tags: {[t['zh'] for t in rules.get('standard_tags', [])]}")

    if args.dry_run:
        print("\n✓ Dry run complete — no changes written")
        return

    # Apply
    changed = apply_tag_updates(papers, rules)
    save_papers(papers)
    write_standard_tags(rules)

    print(f"\n✓ Done: {changed} papers updated, {len(rules['standard_tags'])} standard tags")


if __name__ == "__main__":
    main()
