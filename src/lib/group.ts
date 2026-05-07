import type { Paper } from '../types/paper';
import { computeGroupFrequency, getCategoryGroup, getGroupLabel } from '../config/categories';
import type { BilingualField } from '../types/paper';

/**
 * Group papers by their primary (first) category and return top papers
 * for the most common categories.
 */
export function getCategoryGroups(
  papers: Paper[],
  heatMap: Map<string, number>,
  topCategories = 4,
  papersPerCategory = 3,
): { name: string; papers: Paper[] }[] {
  // Count papers per category
  const catCount = new Map<string, number>();
  const catPapers = new Map<string, Paper[]>();

  for (const p of papers) {
    const primary = p.categories?.[0];
    if (!primary) continue;
    catCount.set(primary, (catCount.get(primary) ?? 0) + 1);
    if (!catPapers.has(primary)) catPapers.set(primary, []);
    catPapers.get(primary)!.push(p);
  }

  const topCats = [...catCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topCategories)
    .map(([name]) => name);

  return topCats.map((name) => {
    const catPapersList = catPapers.get(name)!;
    const sorted = [...catPapersList].sort((a, b) => {
      const aScore = heatMap.get(a.id) ?? 0;
      const bScore = heatMap.get(b.id) ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return { name, papers: sorted.slice(0, papersPerCategory) };
  });
}

/**
 * Group papers by curated category groups (from categories.ts) instead of raw arXiv codes.
 * Uses human-readable group labels, with diversity caps to prevent AI-overweighting.
 */
export function getCuratedCategoryGroups(
  papers: Paper[],
  heatMap: Map<string, number>,
  maxGroups = 3,
  papersPerGroup = 2,
  lang: 'zh' | 'en' | string = 'en',
): { name: string; papers: Paper[] }[] {
  const allCodes = papers.map((p) => p.categories ?? []);
  const freq = computeGroupFrequency(allCodes);

  // Pick top groups, then ensure at least one non-core-AI group is included
  const coreAI = new Set(['ml-ai', 'nlp', 'cv']);
  const topNonAI = freq.filter((g) => !coreAI.has(g.key));
  const topAI = freq.filter((g) => coreAI.has(g.key));

  const selected: typeof freq = [];
  for (const g of topNonAI.slice(0, Math.max(1, maxGroups - 1))) {
    selected.push(g);
  }
  const remainingSlots = maxGroups - selected.length;
  for (const g of topAI.slice(0, remainingSlots)) {
    selected.push(g);
  }

  // For each selected group, find matching papers and pick top by heat
  return selected.map((g) => {
    const label = getGroupLabel(g.key);
    const name = label ? (label as BilingualField)[lang as keyof BilingualField] || (label as BilingualField).en : g.key;
    const matching = papers.filter((p) =>
      (p.categories ?? []).some((c) => getCategoryGroup(c) === g.key),
    );
    const sorted = [...matching].sort((a, b) => {
      const aScore = heatMap.get(a.id) ?? 0;
      const bScore = heatMap.get(b.id) ?? 0;
      if (aScore !== bScore) return bScore - aScore;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
    return { name, papers: sorted.slice(0, papersPerGroup) };
  }).filter((g) => g.papers.length > 0);
}

type WeekStart = number; // ms epoch

function getWeekStart(d: Date): WeekStart {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.getTime();
}

/**
 * Group papers by date periods: This Week, Last Week, Earlier This Month, Older.
 */
export function getDateGroups(
  papers: Paper[],
  papersPerPeriod = 5,
): { labelKey: string; papers: Paper[] }[] {
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const lastWeekStart = thisWeekStart - 7 * 24 * 60 * 60 * 1000;
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const buckets: { labelKey: string; papers: Paper[] }[] = [
    { labelKey: 'thisWeek', papers: [] },
    { labelKey: 'lastWeek', papers: [] },
    { labelKey: 'earlierThisMonth', papers: [] },
  ];

  // Sort papers by date descending first
  const sorted = [...papers].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  for (const p of sorted) {
    const t = new Date(p.date).getTime();
    if (t >= thisWeekStart) {
      if (buckets[0].papers.length < papersPerPeriod) buckets[0].papers.push(p);
    } else if (t >= lastWeekStart) {
      if (buckets[1].papers.length < papersPerPeriod) buckets[1].papers.push(p);
    } else if (t >= thisMonthStart) {
      if (buckets[2].papers.length < papersPerPeriod) buckets[2].papers.push(p);
    } else {
      // Older — stop processing once we've filled all recent buckets
      break;
    }
  }

  return buckets;
}
