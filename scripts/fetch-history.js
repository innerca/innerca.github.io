#!/usr/bin/env node

/**
 * Historical Paper Backfill
 *
 * Fetches papers from arXiv for a date range in monthly chunks,
 * enriches with Semantic Scholar citations, and merges into
 * the existing paper database using the cross-source dedup engine.
 *
 * Usage:
 *   node scripts/fetch-history.js                     # last 6 months
 *   node scripts/fetch-history.js --months 12         # last 12 months
 *   node scripts/fetch-history.js --start 2026-01-01 --end 2026-03-01
 *
 * Time estimate:
 *   ~12 seconds per month (API) + ~30-50s total (S2 enrichment)
 *   6 months ≈ 2 min    12 months ≈ 3.5 min
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

import { enrichPapers } from './fetch-arxiv.js';
import { mergeNewPapers } from './lib/dedup.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.resolve(__dirname, './scraper-config.json');
const DATA_FILE = path.resolve(__dirname, '../src/data/papers.json');

const ARXIV_API = 'https://export.arxiv.org/api/query';
const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'cs.MA', 'cs.IR'];
const MAX_PER_PAGE = 2000;
const RATE_LIMIT_MS = 3000;

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
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse date string to YYYYMMDDHHMMSS format for arXiv API.
 */
function toArxivDate(date) {
  const d = new Date(date);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}0000`;
}

/**
 * Generate monthly time chunks from start to end.
 */
function* monthlyChunks(startDate, endDate) {
  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current < end) {
    const chunkStart = new Date(current);
    const chunkEnd = new Date(current);
    chunkEnd.setUTCMonth(chunkEnd.getUTCMonth() + 1);
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    yield {
      start: new Date(chunkStart),
      end: new Date(chunkEnd),
      label: chunkStart.toISOString().slice(0, 7),
    };

    current = chunkEnd;
  }
}

// ─── Fetch single page ─────────────────────────────────────────

/**
 * Fetch one page of papers from arXiv API for a given date range.
 */
async function fetchPage(dateStart, dateEnd, start = 0) {
  const query = CATEGORIES.map((c) => `cat:${c}`).join('+OR+');
  const dateFilter = `submittedDate:[${toArxivDate(dateStart)}+TO+${toArxivDate(dateEnd)}]`;
  const url = `${ARXIV_API}?search_query=(${query})+AND+${dateFilter}&start=${start}&max_results=${MAX_PER_PAGE}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`arXiv HTTP ${res.status}: ${res.statusText}`);

  const xml = await res.text();
  if (!xml.includes('<entry>')) return { papers: [], total: 0 };

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const data = parser.parse(xml);
  const entries = toArray(data.feed?.entry);
  const total = parseInt(data.feed?.['opensearch:totalResults']?.['#text'] || entries.length, 10);

  const today = new Date().toISOString().split('T')[0];

  const papers = entries.map((entry) => {
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
      crawlHistory: [
        {
          source: 'arxiv',
          timestamp: new Date().toISOString(),
          status: 'success',
          papersFound: entries.length,
        },
      ],
    };
  });

  return { papers, total };
}

/**
 * Fetch ALL papers in a date range (auto-paginates).
 */
async function fetchMonth(dateStart, dateEnd) {
  const allPapers = [];
  let start = 0;
  let total = 0;

  do {
    const { papers, total: t } = await fetchPage(dateStart, dateEnd, start);
    allPapers.push(...papers);
    total = t;

    const fetched = allPapers.length;
    const pct = total > 0 ? Math.min(100, Math.round((fetched / total) * 100)) : 100;
    process.stdout.write(`\r    Progress: ${fetched}/${total} papers (${pct}%)`);

    start += MAX_PER_PAGE;

    if (start < total) {
      await sleep(RATE_LIMIT_MS);
    }
  } while (start < total);

  process.stdout.write('\n');
  return allPapers;
}

// ─── CLI ────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  let months = 6;
  let startDate = null;
  let endDate = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--months' && i + 1 < args.length) {
      months = parseInt(args[++i], 10);
    } else if (args[i] === '--start' && i + 1 < args.length) {
      startDate = args[++i];
    } else if (args[i] === '--end' && i + 1 < args.length) {
      endDate = args[++i];
    }
  }

  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate ? new Date(startDate) : new Date(end);
  if (!startDate) start.setUTCMonth(start.getUTCMonth() - months);

  return { start, end };
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  const { start, end } = parseArgs();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║      Historical Paper Backfill           ║');
  console.log('╚══════════════════════════════════════════╝\n');

  console.log(`Range: ${start.toISOString().slice(0, 10)} → ${end.toISOString().slice(0, 10)}`);
  console.log(`Categories: ${CATEGORIES.join(', ')}`);
  console.log(`Rate limit: ${RATE_LIMIT_MS}ms between requests\n`);

  // 1. Load existing papers
  let existing = [];
  if (existsSync(DATA_FILE)) {
    existing = JSON.parse(await readFile(DATA_FILE, 'utf-8'));
    console.log(`Loaded ${existing.length} existing papers\n`);
  }

  // 2. Fetch by monthly chunks
  const chunks = [...monthlyChunks(start, end)];
  console.log(`Split into ${chunks.length} monthly chunks\n`);

  const allNewPapers = [];

  for (const chunk of chunks) {
    const label = chunk.start.toISOString().slice(0, 7);
    const startStr = chunk.start.toISOString().slice(0, 10);
    const endStr = chunk.end.toISOString().slice(0, 10);

    console.log(`[${label}] Fetching ${startStr} → ${endStr}...`);
    const papers = await fetchMonth(chunk.start, chunk.end);

    if (papers.length > 0) {
      const idSample = papers.slice(0, 3).map((p) => p.id).join(', ');
      console.log(`  Got ${papers.length} papers (e.g. ${idSample}${papers.length > 3 ? ', ...' : ''})`);
    } else {
      console.log(`  No papers found`);
    }

    allNewPapers.push(...papers);

    // Rate limit between months
    if (chunks.length > 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  console.log(`\nTotal fetched across all chunks: ${allNewPapers.length}`);

  if (allNewPapers.length === 0) {
    console.log('No papers fetched. Nothing to do.');
    return;
  }

  // 3. Enrich with S2 citation counts
  console.log('\nEnriching with Semantic Scholar citation counts...');
  const enriched = await enrichPapers(allNewPapers);
  const withCitations = enriched.filter((p) => p.citeCount > 0).length;
  console.log(`  ${withCitations}/${allNewPapers.length} papers have citation data`);

  // 4. Dedup merge
  console.log('\nMerging with existing database...');
  const { merged, stats } = mergeNewPapers(allNewPapers, existing);

  console.log(`  Added: ${stats.added}`);
  console.log(`  Merged (dedup): ${stats.kept}`);
  console.log(`  Total: ${stats.total}`);

  // 5. Write
  await writeFile(DATA_FILE, JSON.stringify(merged, null, 2) + '\n');

  // 6. Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n╔══════════════════════════════════════════╗');
  console.log(`║  Done in ${elapsed}s                          ║`);
  console.log(`║  Fetched: ${allNewPapers.length} papers               ║`);
  console.log(`║  New to DB: ${stats.added}                          ║`);
  console.log('╚══════════════════════════════════════════╝');
}

await main();
