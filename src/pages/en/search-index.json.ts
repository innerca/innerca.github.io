import papers from '../../data/papers.json';
import type { Paper } from '../../types/paper';
import { loadHeatSignals } from '../../lib/heat';

export async function GET() {
  const signals = loadHeatSignals();
  const slim = (papers as Paper[]).map((p) => {
    const s = signals.get(p.id);
    return {
      id: p.id,
      source: p.source,
      url: p.url,
      title: p.title,
      authors: p.authors,
      categories: p.categories,
      tags: p.tags,
      date: p.date,
      addedDate: p.addedDate,
      citeCount: p.citeCount,
      heatScore: s?.heatScore ?? 0,
      sCite: s?.sCite ?? 0,
      sCode: s?.sCode ?? 0,
      sBuzz: s?.sBuzz ?? 0,
      sFresh: s?.sFresh ?? 0,
      burstBonus: s?.burstBonus ?? 0,
    };
  });
  return new Response(JSON.stringify(slim), {
    headers: { 'Content-Type': 'application/json' },
  });
}
