import papers from '../../data/papers.json';
import type { Paper } from '../../types/paper';

export async function GET() {
  const slim = (papers as Paper[]).map((p) => ({
    id: p.id,
    source: p.source,
    url: p.url,
    title: p.title,
    summary: p.summary,
    core_points: p.core_points,
    authors: p.authors,
    categories: p.categories,
    tags: p.tags,
    date: p.date,
    addedDate: p.addedDate,
    citeCount: p.citeCount,
  }));
  return new Response(JSON.stringify(slim), {
    headers: { 'Content-Type': 'application/json' },
  });
}
