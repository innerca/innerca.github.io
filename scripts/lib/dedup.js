#!/usr/bin/env node

/**
 * Cross-source deduplication engine.
 *
 * Given new papers from any source and the existing paper database,
 * matches them by multiple strategies and merges matching entries.
 * Unmatched papers are added as new entries.
 *
 * Strategies (in order of priority):
 *   1. DOI match
 *   2. arXiv ID match (via sources array)
 *   3. Normalized title exact match
 */

/**
 * Normalize a title string for comparison.
 * Lowercase, strip non-alphanumeric chars, collapse whitespace.
 */
function normalizeTitle(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract arXiv ID from a paper's sources array or direct id field.
 */
function getArxivId(paper) {
  if (paper.sources) {
    const arxivSource = paper.sources.find((s) => s.key === 'arxiv');
    if (arxivSource?.sourceId) return arxivSource.sourceId;
  }
  // Fallback: check if id looks like an arXiv ID (e.g. "2605.05207")
  if (paper.id && /^\d{4}\.\d{4,5}$/.test(paper.id)) {
    return paper.id;
  }
  return null;
}

/**
 * Try to match a new paper against existing papers.
 *
 * Returns the matched existing paper's id, or null.
 */
function findMatch(newPaper, existingMap) {
  // Strategy 1: DOI match
  const newDoi = newPaper.doi;
  if (newDoi) {
    const doi = String(newDoi).toLowerCase().trim();
    for (const [id, existing] of existingMap) {
      if (existing.doi && String(existing.doi).toLowerCase().trim() === doi) {
        return id;
      }
    }
  }

  // Strategy 2: arXiv ID match
  const newArxivId = getArxivId(newPaper);
  if (newArxivId) {
    for (const [id, existing] of existingMap) {
      if (getArxivId(existing) === newArxivId) {
        return id;
      }
    }
  }

  // Strategy 3: Normalized title exact match
  const newTitle = normalizeTitle(newPaper.title?.en || newPaper.title?.zh || '');
  if (newTitle) {
    for (const [id, existing] of existingMap) {
      const existingTitle = normalizeTitle(
        existing.title?.en || existing.title?.zh || '',
      );
      if (existingTitle && existingTitle === newTitle) {
        return id;
      }
    }
  }

  return null;
}

/**
 * Merge a new paper into an existing paper entry.
 *
 * Preserves existing curated content (title, summary, core_points).
 * Only updates sources, citation counts, tags, and crawl history.
 */
function mergePaper(existing, newPaper) {
  // Merge sources array: add new sources, update existing ones
  if (newPaper.sources?.length) {
    for (const newSource of newPaper.sources) {
      const existingIdx =
        existing.sources?.findIndex((s) => s.key === newSource.key) ?? -1;

      if (existingIdx >= 0 && existing.sources) {
        // Update existing source entry with newer crawl data
        existing.sources[existingIdx] = {
          ...existing.sources[existingIdx],
          citeCount: newSource.citeCount ?? existing.sources[existingIdx].citeCount,
          lastCrawled: newSource.lastCrawled ?? existing.sources[existingIdx].lastCrawled,
          crawlStatus: newSource.crawlStatus ?? existing.sources[existingIdx].crawlStatus,
        };
      } else {
        // Add new source
        existing.sources = existing.sources || [];
        existing.sources.push({ ...newSource });
      }
    }
  }

  // Update citeCount to max across all sources
  if (existing.sources?.length) {
    existing.citeCount = Math.max(
      existing.citeCount || 0,
      ...existing.sources.map((s) => s.citeCount || 0),
    );
  }

  // Merge tags (deduplicated)
  if (newPaper.tags?.length) {
    const existingTags = new Set(existing.tags || []);
    for (const tag of newPaper.tags) {
      existingTags.add(tag);
    }
    existing.tags = [...existingTags];
  }

  // Append non-duplicate crawl history entries
  if (newPaper.crawlHistory?.length) {
    existing.crawlHistory = existing.crawlHistory || [];
    for (const entry of newPaper.crawlHistory) {
      const isDuplicate = existing.crawlHistory.some(
        (e) => e.source === entry.source && e.timestamp === entry.timestamp,
      );
      if (!isDuplicate) {
        existing.crawlHistory.push(entry);
      }
    }
  }

  return existing;
}

/**
 * Main entry point: merge new papers into existing paper list.
 *
 * @param {object[]} newPapers       Papers from source scrapers
 * @param {object[]} existingPapers  Papers already in the database
 * @returns {{ merged: object[], stats: { added: number, merged: number, total: number } }}
 */
export function mergeNewPapers(newPapers, existingPapers) {
  const existingMap = new Map(existingPapers.map((p) => [p.id, p]));
  const added = [];
  const kept = [];

  for (const newPaper of newPapers) {
    const matchId = findMatch(newPaper, existingMap);

    if (matchId) {
      const existing = existingMap.get(matchId);
      mergePaper(existing, newPaper);
      kept.push(existing);
      existingMap.delete(matchId);
    } else {
      added.push(newPaper);
    }
  }

  // Remaining existing entries (not in new crawl — stale)
  const remaining = [...existingMap.values()];

  const result = [...added, ...kept, ...remaining];

  // Sort by date descending (newest first)
  result.sort((a, b) => {
    const da = a.date || '0000';
    const db = b.date || '0000';
    return da < db ? 1 : da > db ? -1 : 0;
  });

  return {
    merged: result,
    stats: {
      added: added.length,
      kept: kept.length,
      total: result.length,
    },
  };
}
