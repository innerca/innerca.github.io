import papers from '../../../data/papers.json';
import type { Paper } from '../../../types/paper';

/** Papers for a single date within the 7-day window. */
export function getStaticPaths() {
  const all = papers as Paper[];
  const uniqueDates = [...new Set(all.map((p) => p.date))].sort().reverse();
  const maxDates = Math.min(7, uniqueDates.length);
  const paths: { params: { lang: string; index: string } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (let i = 0; i < maxDates; i++) {
      paths.push({ params: { lang, index: String(i) } });
    }
  }
  return paths;
}

export async function GET({ params }: any) {
  const all = papers as Paper[];
  const uniqueDates = [...new Set(all.map((p) => p.date))].sort().reverse();
  const maxDates = Math.min(7, uniqueDates.length);
  const idx = parseInt(params.index ?? '0', 10);
  const date = uniqueDates[idx];

  if (!date || idx >= maxDates) {
    return new Response(JSON.stringify({ date: null, papers: [], hasMore: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const datePapers = all
    .filter((p) => p.date === date)
    .map((p) => ({
      id: p.id,
      source: p.source,
      url: p.url,
      title: p.title,
      authors: (p.authors ?? []).map((a) => ({ name: a.name })),
      categories: p.categories ?? [],
      tags: p.tags,
      date: p.date,
      addedDate: p.addedDate,
      citeCount: p.citeCount,
    }));

  return new Response(
    JSON.stringify({ date, papers: datePapers, hasMore: idx + 1 < maxDates }),
    { headers: { 'Content-Type': 'application/json' } },
  );
}
