#!/usr/bin/env node

/**
 * Paper Scraper Coordinator
 *
 * Orchestrates multi-source paper fetching, deduplication, and trending.
 *
 * Usage: node scripts/fetch.js
 * Schedule: daily via GitHub Actions (UTC 06:00)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchArxivPapers, enrichPapers } from './fetch-arxiv.js';
import { mergeNewPapers } from './lib/dedup.js';
import { splitByTier, loadWarm, writeWarm, writeCold } from './lib/tiers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.resolve(__dirname, './scraper-config.json');
const DATA_FILE = path.resolve(__dirname, '../src/data/papers.json');

// ─── Trending ────────────────────────────────────────────────────

/**
 * Determine trending papers based on recency + citation count.
 * Falls back to date-based sorting when citation data is unavailable.
 */
function computeTrending(papers, { windowDays = 30, topN = 5, minCiteCount = 0 } = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const candidates = papers
    .filter((p) => p.date && p.date >= cutoffStr && (p.citeCount || 0) >= minCiteCount)
    .sort((a, b) => {
      const citeDiff = (b.citeCount || 0) - (a.citeCount || 0);
      if (citeDiff !== 0) return citeDiff;
      return (b.date || '').localeCompare(a.date || '');
    });

  const trendingIds = new Set(candidates.slice(0, topN).map((p) => p.id));

  for (const paper of papers) {
    if (paper.status === 'curated') continue;
    paper.isTrending = trendingIds.has(paper.id);
  }

  const trendCount = papers.filter((p) => p.isTrending).length;
  console.log(`  Trending: ${trendCount} papers (window: ${windowDays}d, top ${topN})`);

  return papers;
}

// ─── Source dispatcher ────────────────────────────────────────────

/**
 * Run all enabled source scrapers and return collected papers.
 *
 * When new sources are added, add a new case here.
 *
 * @param {object[]} sourceConfigs
 * @returns {Promise<object[]>}
 */
async function runScrapers(sourceConfigs) {
  const allPapers = [];

  for (const cfg of sourceConfigs) {
    if (!cfg.enabled) {
      console.log(`\nSkipping disabled source: ${cfg.key}`);
      continue;
    }

    switch (cfg.key) {
      case 'arxiv': {
        const papers = await fetchArxivPapers(cfg);
        const enriched = await enrichPapers(papers, cfg.enrichment?.semanticScholar);
        allPapers.push(...enriched);
        break;
      }
      // Future sources:
      // case 'openreview': { const p = await fetchOpenReviewPapers(cfg); allPapers.push(...p); break; }
      // case 'dblp':       { const p = await fetchDblpPapers(cfg); allPapers.push(...p); break; }
      default:
        console.log(`\nUnknown source: ${cfg.key} — no scraper registered`);
    }
  }

  return allPapers;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  try {
    // 1. Load config
    const config = JSON.parse(await readFile(CONFIG_FILE, 'utf-8'));
    const sources = config.sources || [];

    // 2. Load existing papers (hot + warm for dedup; cold is sealed)
    let hot = [];
    if (existsSync(DATA_FILE)) {
      hot = JSON.parse(await readFile(DATA_FILE, 'utf-8'));
    }
    const warm = await loadWarm();
    const allExisting = [...hot, ...warm];
    console.log(`Loaded ${hot.length} hot + ${warm.length} warm papers`);

    // 3. Run all enabled scrapers
    const newPapers = await runScrapers(sources);
    console.log(`\nTotal new papers fetched: ${newPapers.length}`);

    if (newPapers.length === 0) {
      console.log('No new papers to merge. Nothing changed.');
      return;
    }

    // 4. Cross-source dedup merge
    const { merged, stats } = mergeNewPapers(newPapers, allExisting);
    console.log(`\nMerge results:`);
    console.log(`  Added: ${stats.added}`);
    console.log(`  Kept/updated: ${stats.kept}`);
    console.log(`  Total after merge: ${stats.total}`);

    // 5. Compute trending
    computeTrending(merged);

    // 6. Split into tiers and write
    const { hot: newHot, warm: newWarm, cold: newCold } = splitByTier(merged);

    await writeFile(DATA_FILE, JSON.stringify(newHot, null, 2) + '\n');
    await writeWarm(newWarm);
    await writeCold(newCold);

    console.log(`  Hot: ${newHot.length} | Warm: ${newWarm.length} | Cold: ${newCold.length}`);
    console.log(`\n✓ Done`);
  } catch (err) {
    console.error(`\n✗ Error: ${err.message}`);
    process.exit(1);
  }
}

await main();
