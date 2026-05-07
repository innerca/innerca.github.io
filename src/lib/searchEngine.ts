import FlexSearch from 'flexsearch';
import type { Paper, Lang } from '../types/paper';
import { searchPapers as fallbackSearch } from './search';

/**
 * Build a FlexSearch Document index for bilingual full-text search.
 *
 * Indexes title (zh/en), summary (zh/en), core_points (zh/en), and tags.
 * Falls back to substring matching if FlexSearch is unavailable or fails.
 */

type IndexDoc = Pick<Paper, 'id'> & {
  'title.zh': string;
  'title.en': string;
  'summary.zh': string;
  'summary.en': string;
  'core_points.zh': string;
  'core_points.en': string;
  tags: string;
};

let documentIndex: FlexSearch.Document<IndexDoc, string[]> | null = null;

function buildIndex(papers: Paper[]): FlexSearch.Document<IndexDoc, string[]> {
  const index = new FlexSearch.Document<IndexDoc, string[]>({
    tokenize: 'forward',
    cache: true,
    document: {
      id: 'id',
      index: [
        { field: 'title.zh', tokenize: 'forward' },
        { field: 'title.en', tokenize: 'forward' },
        { field: 'summary.zh', tokenize: 'forward' },
        { field: 'summary.en', tokenize: 'forward' },
        { field: 'core_points.zh', tokenize: 'forward' },
        { field: 'core_points.en', tokenize: 'forward' },
        { field: 'tags', tokenize: 'forward' },
      ],
      store: false,
    },
  });

  for (const paper of papers) {
    index.add({
      id: paper.id,
      'title.zh': paper.title.zh,
      'title.en': paper.title.en,
      'summary.zh': paper.summary.zh,
      'summary.en': paper.summary.en,
      'core_points.zh': paper.core_points.zh,
      'core_points.en': paper.core_points.en,
      tags: (paper.tags || []).join(' '),
    } satisfies IndexDoc);
  }

  return index;
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids)];
}

/**
 * Search papers using FlexSearch, with fallback to substring matching.
 * Matches cross-language — a query in any language searches all bilingual fields.
 */
export function searchPapers(papers: Paper[], query: string, _lang: Lang): Paper[] {
  if (!query.trim()) return papers;

  try {
    if (!documentIndex) {
      documentIndex = buildIndex(papers);
    }

    const raw = documentIndex.search(query, { limit: 50 }) as
      | { field: string; result: string[] }[]
      | null;

    if (!raw || raw.length === 0) {
      // FlexSearch returned no results — try fallback
      return fallbackSearch(papers, query, _lang);
    }

    // Collect all matched IDs across all fields, deduplicated
    const matchedIds = dedupe(raw.flatMap((r) => r.result || []));
    const idSet = new Set(matchedIds);

    // Preserve original order from papers array (more stable)
    return papers.filter((p) => idSet.has(p.id));
  } catch {
    // FlexSearch error — fall back to substring matching
    return fallbackSearch(papers, query, _lang);
  }
}

/**
 * Reset the search index (useful when papers data changes dynamically).
 */
export function resetIndex(): void {
  documentIndex = null;
}
