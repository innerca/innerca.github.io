#!/usr/bin/env node
/**
 * arXiv Paper Fetcher
 *
 * Fetches recent AI/ML papers from arXiv API, merges with existing data,
 * and writes to src/data/papers.json.
 *
 * Usage: node scripts/fetch-papers.js
 * Schedule: daily via GitHub Actions (UTC 06:00)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, '../src/data/papers.json');

const ARXIV_API = 'https://export.arxiv.org/api/query';
const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'cs.MA', 'cs.IR'];
const MAX_RESULTS = 30;
const REQUEST_INTERVAL_MS = 3000; // arXiv rate limit: 1 req per 3 seconds

// ─── Helpers ───────────────────────────────────────────────────

function toArray(x) {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function stripHtml(text) {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, '').trim();
}

function extractArxivId(url) {
  const m = String(url).match(/\/abs\/(\d+\.\d+)/);
  return m ? m[1] : String(url).split('/').pop().replace(/v\d+$/, '');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Fetch ─────────────────────────────────────────────────────

async function fetchPapers() {
  const query = CATEGORIES.map(c => `cat:${c}`).join('+OR+');
  const url = `${ARXIV_API}?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=${MAX_RESULTS}`;

  console.log(`\nFetching ${MAX_RESULTS} papers from arXiv...`);
  console.log(`  Categories: ${CATEGORIES.join(', ')}`);
  console.log(`  URL: ${url}\n`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

  const xml = await res.text();
  if (!xml.includes('<entry>')) {
    throw new Error('arXiv API returned no entries');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const data = parser.parse(xml);
  const entries = toArray(data.feed?.entry);
  console.log(`  Parsed ${entries.length} entries from API response`);

  const today = new Date().toISOString().split('T')[0];

  return entries.map((entry) => {
    const rawTitle = stripHtml(entry.title || '');
    const rawSummary = stripHtml(entry.summary || '');
    const arxivId = extractArxivId(entry.id);
    const entryUrl = String(entry.id || '').replace(/^http:\/\//i, 'https://');

    return {
      id: arxivId,
      source: 'arxiv',
      sourceId: entryUrl,
      url: entryUrl,
      title: { zh: rawTitle, en: rawTitle },
      summary: { zh: rawSummary, en: rawSummary },
      core_points: { zh: '', en: '' },
      authors: toArray(entry.author).map((a) => ({
        name: typeof a === 'object' ? a.name || 'Unknown' : String(a),
      })),
      date: entry.published ? entry.published.split('T')[0] : '',
      updatedDate: entry.updated ? entry.updated.split('T')[0] : null,
      addedDate: today,
      categories: toArray(entry.category)
        .map((c) => (typeof c === 'object' ? c['@_term'] || '' : String(c)))
        .filter(Boolean),
      tags: [],
      entities: [],
      citeCount: 0,
      isTrending: false,
      status: 'discovered',
      sources: [
        {
          key: 'arxiv',
          sourceId: arxivId,
          url: entryUrl,
          lastCrawled: today,
          citeCount: 0,
        },
      ],
      curation: [
        {
          field: 'all',
          generatedBy: 'scraper',
          confidence: 0.9,
          timestamp: new Date().toISOString(),
          requiresReview: false,
        },
      ],
    };
  });
}

// ─── Merge ─────────────────────────────────────────────────────

function mergePapers(newPapers, existing) {
  const existingMap = new Map(existing.map((p) => [p.id, p]));
  const kept = [];
  const added = [];

  for (const paper of newPapers) {
    if (existingMap.has(paper.id)) {
      // Keep existing entry — it may have manual curation
      kept.push(existingMap.get(paper.id));
      existingMap.delete(paper.id);
    } else {
      added.push(paper);
    }
  }

  // Remaining existing entries (not in new feed)
  const remaining = [...existingMap.values()];
  const merged = [...added, ...remaining, ...kept];

  // Sort by date descending (newest first)
  merged.sort((a, b) => {
    const da = a.date || '0000';
    const db = b.date || '0000';
    return da < db ? 1 : da > db ? -1 : 0;
  });

  return { merged, added: added.length, kept: kept.length, total: merged.length };
}

// ─── Citation & Trending ────────────────────────────────────────

const S2_BATCH_API = 'https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds';

/**
 * Fetch citation counts from Semantic Scholar batch API for the given papers.
 * The batch endpoint accepts up to ~100 IDs per request.
 * Fails gracefully — returns empty Map on error.
 */
async function fetchCitationCounts(papers) {
  const ids = papers
    .map((p) => `ArXiv:${p.id}`)
    .filter(Boolean);

  if (ids.length === 0) return new Map();

  try {
    const res = await fetch(S2_BATCH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(`  Semantic Scholar API returned HTTP ${res.status}${text ? `: ${text.slice(0, 100)}` : ''}`);
      return new Map();
    }

    const results = await res.json();
    const map = new Map();
    for (const item of results) {
      if (item && item.externalIds?.ArXiv != null) {
        map.set(item.externalIds.ArXiv, item.citationCount ?? 0);
      }
    }

    const fetched = map.size;
    const notFound = ids.length - fetched;
    console.log(`  Citation counts: ${fetched} fetched${notFound > 0 ? `, ${notFound} not in index (too new?)` : ''}`);
    return map;
  } catch (err) {
    console.warn(`  Failed to fetch citation counts: ${err.message}`);
    return new Map();
  }
}

/**
 * Determine trending papers based on recency + citation count.
 * Falls back to date-based sorting when citation data is unavailable (new papers).
 *
 * Configuration values should be kept in sync with src/config/performance.ts.
 */
function computeTrending(papers, { windowDays = 30, topN = 5, minCiteCount = 0 } = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  // Papers within window, meeting the minimum cite count
  // Sorted by citeCount desc, then by date desc (stable — ensures deterministic results
  // even when citation data isn't available for very recent papers)
  const candidates = papers
    .filter((p) => p.date && p.date >= cutoffStr && (p.citeCount || 0) >= minCiteCount)
    .sort((a, b) => {
      const citeDiff = (b.citeCount || 0) - (a.citeCount || 0);
      if (citeDiff !== 0) return citeDiff;
      return (b.date || '').localeCompare(a.date || '');
    });

  const trendingIds = new Set(candidates.slice(0, topN).map((p) => p.id));

  for (const paper of papers) {
    // Preserve manually curated trending status
    if (paper.status === 'curated') continue;
    paper.isTrending = trendingIds.has(paper.id);
  }

  const trendCount = papers.filter((p) => p.isTrending).length;
  console.log(`  Trending: ${trendCount} papers (window: ${windowDays}d, top ${topN})`);

  return papers;
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
  try {
    const newPapers = await fetchPapers();

    // Enrich: fetch citation counts from Semantic Scholar
    const citeMap = await fetchCitationCounts(newPapers);
    for (const paper of newPapers) {
      if (citeMap.has(paper.id)) {
        paper.citeCount = citeMap.get(paper.id);
        // Also update the arxiv source record
        if (paper.sources) {
          const arxivSource = paper.sources.find((s) => s.key === 'arxiv');
          if (arxivSource) arxivSource.citeCount = paper.citeCount;
        }
      }
    }

    let existing = [];
    if (existsSync(DATA_FILE)) {
      existing = JSON.parse(await readFile(DATA_FILE, 'utf-8'));
    }

    const { merged, added, kept, total } = mergePapers(newPapers, existing);

    // Compute trending after merge (considers all papers)
    computeTrending(merged);

    await writeFile(DATA_FILE, JSON.stringify(merged, null, 2) + '\n');

    console.log(`\n✓ Done`);
    console.log(`  Added: ${added}`);
    console.log(`  Kept existing: ${kept}`);
    console.log(`  Total: ${total}`);
  } catch (err) {
    console.error(`\n✗ Error: ${err.message}`);
    process.exit(1);
  }
}

await main();
