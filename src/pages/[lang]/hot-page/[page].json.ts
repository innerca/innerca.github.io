import papers from '../../../data/papers.json';
import type { Paper } from '../../../types/paper';
import { loadHeatSignals } from '../../../lib/heat';

const PAGE_SIZE = 12;
const MAX_TOTAL = 50;

interface HotItem {
  id: string;
  title: { en: string; zh: string };
  source: string;
  url: string;
  authors: { name: string }[];
  categories: string[];
  tags: string[];
  date: string;
  addedDate?: string;
  citeCount: number;
  heatScore: number;
  sCite: number;
  sCode: number;
  sBuzz: number;
  sFresh: number;
  burstBonus: number;
}

interface ResponseData {
  papers: HotItem[];
  page: number;
  hasMore: boolean;
  total: number;
}

export function getStaticPaths() {
  const all = papers as Paper[];
  const signals = loadHeatSignals();
  const totalItems = Math.min(MAX_TOTAL, all.length);
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const paths: { params: { lang: string; page: string } }[] = [];
  for (const lang of ['en', 'zh']) {
    for (let i = 0; i < totalPages; i++) {
      paths.push({ params: { lang, page: String(i) } });
    }
  }
  return paths;
}

export async function GET({ params }: any) {
  const all = papers as Paper[];
  const signals = loadHeatSignals();

  const scored = all
    .map((p) => {
      const s = signals.get(p.id);
      return {
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
        heatScore: s?.heatScore ?? 0,
        sCite: s?.sCite ?? 0,
        sCode: s?.sCode ?? 0,
        sBuzz: s?.sBuzz ?? 0,
        sFresh: s?.sFresh ?? 0,
        burstBonus: s?.burstBonus ?? 0,
      };
    })
    .sort((a, b) => b.heatScore - a.heatScore)
    .slice(0, MAX_TOTAL);

  const page = parseInt(params.page ?? '0', 10);
  const start = page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, scored.length);
  const pagePapers = scored.slice(start, end);

  const data: ResponseData = {
    papers: pagePapers,
    page,
    hasMore: end < scored.length,
    total: scored.length,
  };

  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
