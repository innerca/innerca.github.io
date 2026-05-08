#!/usr/bin/env node

/**
 * arXiv Paper Fetcher Module
 *
 * Fetches recent AI/ML papers from arXiv RSS feeds (one per category),
 * enriches with Semantic Scholar citation counts, and returns normalized
 * Paper objects.
 *
 * Switched from export.arxiv.org API to RSS because the API aggressively
 * rate-limits (429) on multi-category queries and even single-category
 * queries from shared IP pools like GitHub Actions. RSS returns 200 with
 * hundreds of entries per category and no rate limiting.
 *
 * Usage (standalone):  node scripts/fetch-arxiv.js
 * Usage (via fetch.js): import { fetchArxivPapers } from './fetch-arxiv.js'
 */

const S2_BATCH_API =
  'https://api.semanticscholar.org/graph/v1/paper/batch?fields=citationCount,externalIds';

// ─── Helpers ───────────────────────────────────────────────────

function stripHtml(text) {
  if (!text) return '';
  return text.replace(/<\/?[^>]+(>|$)/g, '').trim();
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

    const baseDelay = 4000 * Math.pow(2, attempt);
    const jitter = baseDelay * (0.8 + Math.random() * 0.4);
    const delay = Math.min(Math.round(jitter), 60000);

    console.warn(`  ⚠ 429 (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${(delay / 1000).toFixed(1)}s...`);
    await sleep(delay);
  }

  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText} (exhausted retries)`);
  return res;
}

function parseRssDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

/**
 * Parse RSS description field: "arXiv:XXXX.XXXXXvN Announce Type: XXX\nAbstract: ..."
 */
function parseRssDescription(desc) {
  const result = { arxivId: '', abstract: '' };
  if (!desc) return result;
  const idMatch = desc.match(/arXiv:(\d+\.\d+)/);
  if (idMatch) result.arxivId = idMatch[1];
  const absMatch = desc.match(/Abstract:\s*([\s\S]*)/);
  if (absMatch) result.abstract = stripHtml(absMatch[1].trim());
  return result;
}

// ─── Fetch from arXiv RSS ──────────────────────────────────────

/**
 * Fetch papers from arXiv RSS feeds (one request per category).
 * RSS is not rate-limited like export.arxiv.org, making it suitable
 * for CI/CD runners and shared IP environments.
 *
 * @param {object} config
 * @param {string[]} config.categories
 * @param {number} config.maxResults  Max papers to keep per category
 * @param {number} config.rateLimitMs  Delay between categories (for politeness)
 * @returns {Promise<object[]>} Normalized Paper objects
 */
export async function fetchArxivPapers(config) {
  const today = new Date().toISOString().split('T')[0];
  const seen = new Set();
  const allPapers = [];

  for (const cat of config.categories) {
    const rssUrl = `https://rss.arxiv.org/rss/${cat}`;
    console.log(`\n  [${cat}] Fetching from RSS...`);

    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'PaperRadar/1.0 (mingchxing@qq.com)' },
    });
    if (!res.ok) { console.warn(`  ⚠ [${cat}] HTTP ${res.status}, skipping`); continue; }

    const xml = await res.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    let added = 0;

    for (const itemXml of items.slice(0, config.maxResults)) {
      const title = stripHtml((itemXml.match(/<title>(.*?)<\/title>/) || [])[1] || '');
      const link = (itemXml.match(/<link>(.*?)<\/link>/) || [])[1] || '';
      const desc = (itemXml.match(/<description>([\s\S]*?)<\/description>/) || [])[1] || '';
      const pubDate = (itemXml.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      const creatorRaw = (itemXml.match(/<dc:creator>(.*?)<\/dc:creator>/) || [])[1] || '';
      const categories = [...itemXml.matchAll(/<category>(.*?)<\/category>/g)].map(m => m[1]);

      const { arxivId, abstract } = parseRssDescription(desc);
      if (!arxivId || seen.has(arxivId)) continue;
      seen.add(arxivId);

      allPapers.push({
        id: arxivId,
        source: 'arxiv',
        sourceId: link,
        url: link,
        title: { zh: title, en: title },
        summary: { zh: abstract, en: abstract },
        core_points: { zh: '', en: '' },
        authors: creatorRaw.split(', ').filter(Boolean).map((n) => ({ name: n.trim() })),
        date: parseRssDate(pubDate),
        updatedDate: null,
        addedDate: today,
        categories,
        tags: [],
        entities: [],
        citeCount: 0,
        isTrending: false,
        status: 'discovered',
        sources: [{ key: 'arxiv', sourceId: arxivId, url: link, lastCrawled: today, citeCount: 0 }],
        curation: [{ field: 'all', generatedBy: 'scraper', confidence: 0.9, timestamp: new Date().toISOString(), requiresReview: false }],
        crawlHistory: [{ source: 'arxiv', timestamp: new Date().toISOString(), status: 'success', papersFound: 0 }],
      });
      added++;
    }
    console.log(`  ${items.length} entries in feed, ${added} new after dedup`);

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
      console.warn(`  Semantic Scholar API returned HTTP ${res.status}`);
      return new Map();
    }

    const results = await res.json();
    const map = new Map();
    for (const item of results) {
      if (item && item.externalIds?.ArXiv != null) {
        map.set(item.externalIds.ArXiv, item.citationCount ?? 0);
      }
    }
    console.log(`  Citation counts: ${map.size} fetched${ids.length - map.size > 0 ? `, ${ids.length - map.size} not found` : ''}`);
    return map;
  } catch (err) {
    console.warn(`  Failed to fetch citation counts: ${err.message}`);
    return new Map();
  }
}

/**
 * Enrich papers with citation counts. Mutates papers in place.
 */
export async function enrichPapers(papers, enrichConfig = {}) {
  const citeMap = await fetchCitationCounts(papers, enrichConfig);

  for (const paper of papers) {
    if (citeMap.has(paper.id)) {
      paper.citeCount = citeMap.get(paper.id);
      const arxivSource = paper.sources?.find((s) => s.key === 'arxiv');
      if (arxivSource) arxivSource.citeCount = paper.citeCount;
    }
    const arxivCrawl = paper.crawlHistory?.find((c) => c.source === 'arxiv');
    if (arxivCrawl) arxivCrawl.papersFound = papers.length;
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

const isMainModule = process.argv[1]?.endsWith('fetch-arxiv.js');
if (isMainModule) {
  await main();
}
