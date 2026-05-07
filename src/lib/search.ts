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

export function highlightText(text: string, query: string): string {
  if (!query.trim()) return escapeHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  return escapeHtml(text).replace(
    regex,
    '<mark class="bg-neon-cyan/20 text-neon-cyan rounded-sm px-0.5">$1</mark>',
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
