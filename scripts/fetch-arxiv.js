#!/usr/bin/env node

/**
 * arXiv Paper Fetcher Module
 *
 * Fetches recent AI/ML papers from the arXiv API, enriches with
 * Semantic Scholar citation counts, and returns normalized Paper objects.
 *
 * Usage (standalone):  node scripts/fetch-arxiv.js
 * Usage (via fetch.js): import { fetchArxivPapers } from './fetch-arxiv.js'
 */

import { XMLParser } from 'fast-xml-parser';

const S2_BATCH_API =
  'https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds';

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
 * Fetch with exponential backoff for HTTP 429 rate limiting.
 * Base delay: 4s, max: 60s, jitter: ±20%, up to 4 retries.
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 4) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;

    const baseDelay = 4000 * Math.pow(2, attempt); // 4s, 8s, 16s, 32s
    const jitter = baseDelay * (0.8 + Math.random() * 0.4); // ±20%
    const delay = Math.min(Math.round(jitter), 60000);

    console.warn(`  ⚠ arXiv 429 (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(delay / 1000).toFixed(1)}s...`);
    await sleep(delay);
  }

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`arXiv API HTTP ${res.status}: ${res.statusText} (exhausted retries)`);
  return res;
}

// ─── Fetch from arXiv API ──────────────────────────────────────

/**
 * Parse a single arXiv API response XML into Paper objects.
 */
function parseArxivResponse(xml, addedDate) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });
  const data = parser.parse(xml);
  const entries = toArray(data.feed?.entry);

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
      addedDate,
      categories: toArray(entry.category)
        .map((c) => (typeof c === 'object' ? c['@_term'] || '' : String(c)))
        .filter(Boolean),
      tags: [],
      entities: [],
      citeCount: 0,
      isTrending: false,
      status: 'discovered',
      sources: [
        { key: 'arxiv', sourceId: arxivId, url: entryUrl, lastCrawled: addedDate, citeCount: 0 },
      ],
      curation: [{
        field: 'all', generatedBy: 'scraper', confidence: 0.9,
        timestamp: new Date().toISOString(), requiresReview: false,
      }],
      crawlHistory: [{
        source: 'arxiv', timestamp: new Date().toISOString(), status: 'success', papersFound: 0,
      }],
    };
  });
}

/**
 * Fetch papers from arXiv API.
 * Queries each category separately to avoid 429 on complex multi-category OR queries.
 */
export async function fetchArxivPapers(config) {
  const today = new Date().toISOString().split('T')[0];
  const seen = new Set();
  const allPapers = [];

  for (const cat of config.categories) {
    const url = `${config.apiUrl}?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&max_results=${config.maxResults}`;
    console.log(`\n  [${cat}] Fetching up to ${config.maxResults} papers...`);

    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': 'PaperRadar/1.0 (mingchxing@qq.com)' },
    });
    if (!res.ok) { console.warn(`  ⚠ [${cat}] HTTP ${res.status}, skipping`); continue; }

    const xml = await res.text();
    if (!xml.includes('<entry>')) { console.log(`  [${cat}] No entries`); continue; }

    const papers = parseArxivResponse(xml, today);
    let added = 0;
    for (const p of papers) {
      if (!seen.has(p.id)) { seen.add(p.id); allPapers.push(p); added++; }
    }
    console.log(`  [${cat}] ${papers.length} entries, ${added} new after dedup`);

    if (cat !== config.categories[config.categories.length - 1]) {
      await sleep(config.rateLimitMs || 3000);
    }
  }

  console.log(`\n  Total: ${allPapers.length} unique papers across ${config.categories.length} categories`);
  return allPapers;
}

// ─── Enrichment ─────────────────────────────────────────────────

/**
 * Fetch citation counts from Semantic Scholar batch API.
 * Fails gracefully — returns empty Map on error.
 *
 * @param {object[]} papers
 * @param {object} [enrichConfig]
 * @returns {Promise<Map<string, number>>}
 */
export async function fetchCitationCounts(papers, enrichConfig = {}) {
  const apiUrl = enrichConfig.apiUrl || S2_BATCH_API;
  const ids = papers.map((p) => `ArXiv:${p.id}`).filter(Boolean);

  if (ids.length === 0) return new Map();

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.warn(
        `  Semantic Scholar API returned HTTP ${res.status}${text ? `: ${text.slice(0, 100)}` : ''}`,
      );
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
    console.log(
      `  Citation counts: ${fetched} fetched${notFound > 0 ? `, ${notFound} not in index (too new?)` : ''}`,
    );
    return map;
  } catch (err) {
    console.warn(`  Failed to fetch citation counts: ${err.message}`);
    return new Map();
  }
}

/**
 * Enrich papers with citation counts.
 * Mutates papers in place and returns them.
 *
 * @param {object[]} papers
 * @param {object} [enrichConfig]
 * @returns {Promise<object[]>}
 */
export async function enrichPapers(papers, enrichConfig = {}) {
  const citeMap = await fetchCitationCounts(papers, enrichConfig);

  for (const paper of papers) {
    if (citeMap.has(paper.id)) {
      paper.citeCount = citeMap.get(paper.id);
      const arxivSource = paper.sources?.find((s) => s.key === 'arxiv');
      if (arxivSource) arxivSource.citeCount = paper.citeCount;
    }

    // Update crawlHistory papersFound
    const arxivCrawl = paper.crawlHistory?.find((c) => c.source === 'arxiv');
    if (arxivCrawl) {
      arxivCrawl.papersFound = papers.length;
    }
  }

  return papers;
}

// ─── Standalone entry point ─────────────────────────────────────

async function main() {
  const defaultConfig = {
    apiUrl: 'https://export.arxiv.org/api/query',
    categories: ['cs.AI', 'cs.LG', 'cs.CL', 'cs.CV', 'cs.NE', 'cs.MA', 'cs.IR'],
    maxResults: 30,
    rateLimitMs: 3000,
  };

  const papers = await fetchArxivPapers(defaultConfig);
  await enrichPapers(papers);

  console.log(`\n✓ Fetched ${papers.length} arXiv papers`);
  process.exit(0);
}

// Allow both import and standalone execution
const isMainModule = process.argv[1]?.endsWith('fetch-arxiv.js');
if (isMainModule) {
  await main();
}
