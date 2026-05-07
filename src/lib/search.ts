/**
 * Fallback substring-matching search used when FlexSearch is unavailable.
 *
 * @see searchEngine.ts for the primary FlexSearch-based implementation.
 */
import type { Paper, Lang } from '../types/paper';

export function searchPapers(papers: Paper[], query: string, lang: Lang): Paper[] {
  if (!query.trim()) return papers;
  const q = query.toLowerCase();
  return papers.filter(p => {
    const title = p.title[lang].toLowerCase();
    const summary = p.summary[lang].toLowerCase();
    const points = p.core_points[lang].toLowerCase();
    const tags = p.tags.join(' ').toLowerCase();
    return (
      title.includes(q) ||
      summary.includes(q) ||
      points.includes(q) ||
      tags.includes(q)
    );
  });
}
