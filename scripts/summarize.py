#!/usr/bin/env python3
"""
Groq AI Paper Summarizer

Reads papers.json, sends unsummarized papers (empty core_points) to Groq API,
generates zh translations and core_points, updates status, and writes back.

Usage:
    export GROQ_API_KEY="gsk_..."
    python scripts/summarize.py

    # Dry run (no writes):
    python scripts/summarize.py --dry-run

Dependencies:
    pip install groq
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path

from groq import Groq, RateLimitError

# ─── Config ────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = "llama-3.3-70b-versatile"
MAX_RETRIES = 5
INITIAL_BACKOFF = 5  # seconds
RATE_LIMIT_PER_SEC = 2  # seconds between requests (30 RPM free tier)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "src" / "data" / "papers.json"

SYSTEM_PROMPT = """你是一个学术内容处理助手。收到一篇英文学术论文的标题和摘要后，请完成以下任务，并严格按格式输出JSON。

1. 将标题和摘要翻译为**简体中文**。
2. 生成一段中文**核心要点**（不超过3句话，抓住贡献、方法、结果），同时提供英文版本。
3. 判断论文的最相关**标签**（从下列预定义集合中选1-3个）：
   [大型语言模型, 计算机视觉, 强化学习, 图神经网络, 扩散模型, 自然语言处理,
    机器人, 科学计算, 其他]

输出JSON格式，必须包含以下字段：
{
  "title": {"en": "...原英文标题...", "zh": "...中文翻译..."},
  "summary": {"en": "...原英文摘要...", "zh": "...中文翻译..."},
  "core_points": {"en": "...1-3 sentences summarizing contribution, method, results...", "zh": "...贡献、方法、结果的中文核心要点..."},
  "tags": ["标签1", "标签2"]
}

注意：title.en 和 summary.en 请保留原文内容，不要修改。"""

# ─── Helpers ────────────────────────────────────────────────────────

def load_papers():
    """Load papers from data file."""
    if not DATA_FILE.exists():
        print(f"✗ Data file not found: {DATA_FILE}")
        sys.exit(1)
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_papers(papers):
    """Write papers back to data file."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)
        f.write("\n")


def needs_summarization(paper):
    """Check if a paper needs AI summarization."""
    # Skip if already analyzed
    if paper.get("status") == "analyzed":
        return False
    # Skip if core_points already populated
    if paper.get("core_points", {}).get("en", "").strip():
        return False
    # Must have a non-empty abstract
    summary = paper.get("summary", {}).get("en", "").strip()
    if not summary:
        return False
    return True


# ─── Groq API ───────────────────────────────────────────────────────

def summarize_paper(client, paper):
    """Call Groq API to summarize a single paper."""
    title = paper.get("title", {}).get("en", "")
    summary = paper.get("summary", {}).get("en", "")
    user_message = f"标题: {title}\n摘要: {summary}"

    for attempt in range(MAX_RETRIES):
        try:
            completion = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.2,
                response_format={"type": "json_object"},
            )
            return json.loads(completion.choices[0].message.content)

        except RateLimitError:
            if attempt == MAX_RETRIES - 1:
                raise
            wait_time = INITIAL_BACKOFF * (2**attempt)
            print(f"  ⏳ Rate limited, waiting {wait_time}s...")
            time.sleep(wait_time)

        except json.JSONDecodeError as e:
            print(f"  ✗ JSON parse error: {e}")
            if attempt == MAX_RETRIES - 1:
                return None
            time.sleep(INITIAL_BACKOFF)

        except Exception as e:
            print(f"  ✗ API error: {e}")
            if attempt == MAX_RETRIES - 1:
                return None
            time.sleep(INITIAL_BACKOFF)

    return None


def apply_result(paper, result, paper_id):
    """Apply Groq API result to paper object, preserving originals on failure."""
    if not result:
        print(f"  ✗ Failed to summarize paper {paper_id}, skipping")
        return False

    try:
        # Preserve original title/summary if Groq returns empty
        if result.get("title", {}).get("en", "").strip():
            paper["title"] = {
                "en": result["title"].get("en", paper["title"].get("en", "")),
                "zh": result["title"].get("zh", paper["title"].get("zh", "")),
            }

        if result.get("summary", {}).get("en", "").strip():
            paper["summary"] = {
                "en": result["summary"].get("en", paper["summary"].get("en", "")),
                "zh": result["summary"].get("zh", paper["summary"].get("zh", "")),
            }

        # core_points is the primary deliverable
        core = result.get("core_points", {})
        paper["core_points"] = {
            "en": core.get("en", ""),
            "zh": core.get("zh", ""),
        }

        # Tags
        if result.get("tags"):
            paper["tags"] = list(set(paper.get("tags", []) + result["tags"]))

        # Update status
        paper["status"] = "analyzed"

        # Add curation record
        curation = paper.setdefault("curation", [])
        curation.append({
            "field": "all",
            "generatedBy": "llm",
            "model": MODEL_NAME,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        })

        return True

    except Exception as e:
        print(f"  ✗ Failed to apply result for {paper_id}: {e}")
        return False


# ─── Main ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Summarize papers with Groq AI")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be processed without writing")
    args = parser.parse_args()

    if not GROQ_API_KEY:
        print("✗ GROQ_API_KEY environment variable not set")
        print("  export GROQ_API_KEY='gsk_...'")
        sys.exit(1)

    print("╔══════════════════════════════════════════╗")
    print("║       Groq Paper Summarizer              ║")
    print("╚══════════════════════════════════════════╝")
    print(f"  Model: {MODEL_NAME}")
    print(f"  Data:  {DATA_FILE}")
    if args.dry_run:
        print("  Mode:  DRY RUN (no writes)\n")
    else:
        print()

    # Load papers
    papers = load_papers()
    print(f"Loaded {len(papers)} papers")

    # Find unsummarized papers
    to_process = [p for p in papers if needs_summarization(p)]
    print(f"Found {len(to_process)} papers needing summarization\n")

    if not to_process:
        print("✓ All papers already summarized, nothing to do")
        return

    if args.dry_run:
        print("Would process:")
        for p in to_process:
            pid = p.get("id", "???")
            title = p.get("title", {}).get("en", "?")[:60]
            print(f"  [{pid}] {title}...")
        return

    # Initialize Groq client
    client = Groq(api_key=GROQ_API_KEY)
    success = 0
    failed = 0

    for i, paper in enumerate(to_process):
        paper_id = paper.get("id", "???")
        title_preview = paper.get("title", {}).get("en", "")[:50]
        print(f"[{i+1}/{len(to_process)}] {paper_id} — {title_preview}...")

        result = summarize_paper(client, paper)
        if apply_result(result, paper, paper_id):
            success += 1
            print(f"  ✓ Summarized")
        else:
            failed += 1

        # Rate limiting: delay between requests
        if i < len(to_process) - 1:
            time.sleep(RATE_LIMIT_PER_SEC)

    # Save updated papers
    save_papers(papers)
    print(f"\n✓ Done: {success} summarized, {failed} failed, {len(papers)} total")


if __name__ == "__main__":
    main()
