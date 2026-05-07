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

// ─── Fetch from arXiv API ──────────────────────────────────────

/**
 * Fetch papers from arXiv API.
 *
 * @param {object} config Source configuration
 * @param {string} config.apiUrl
 * @param {string[]} config.categories
 * @param {number} config.maxResults
 * @param {number} config.rateLimitMs
 * @returns {Promise<object[]>} Normalized Paper objects
 */
export async function fetchArxivPapers(config) {
  const query = config.categories.map((c) => `cat:${c}`).join('+OR+');
  const url = `${config.apiUrl}?search_query=${query}&sortBy=submittedDate&sortOrder=descending&max_results=${config.maxResults}`;

  console.log(`\nFetching ${config.maxResults} papers from arXiv...`);
  console.log(`  Categories: ${config.categories.join(', ')}`);
  console.log(`  URL: ${url}\n`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'PaperRadar/1.0 (arXiv crawler; https://innerca.github.io)',
    },
  });
  if (!res.ok) throw new Error(`arXiv API HTTP ${res.status}: ${res.statusText}`);

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
          papersFound: 0, // filled after enrichment
        },
      ],
    };
  });

  return papers;
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
