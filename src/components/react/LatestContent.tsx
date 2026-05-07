import { useState, useMemo, useEffect } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { t } from '../../lib/i18n';
import PaperCard from './PaperCard';

const INITIAL_SHOW = 5;
const SHOW_MORE = 10;

interface Props {
  papers: Paper[];
  lang: Lang;
}

export default function LatestContent({ papers, lang }: Props) {
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [showCounts, setShowCounts] = useState<Record<string, number>>({});

  // Extract unique categories
  const allCategories = useMemo(() => {
    const cats = new Set(papers.flatMap((p) => p.categories ?? []));
    return [...cats].sort();
  }, [papers]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setShowCounts({});
  };

  const hasFilters = selectedCategories.size > 0;

  // Reset per-day show counts when filters change
  useEffect(() => {
    setShowCounts({});
  }, [selectedCategories]);

  // Filter + group by date, newest first, max 7 days
  const dateGroups = useMemo(() => {
    const filtered = hasFilters
      ? papers.filter((p) => {
          const paperCats = new Set(p.categories ?? []);
          return [...selectedCategories].some((c) => paperCats.has(c));
        })
      : papers;

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const groups: { date: string; papers: Paper[] }[] = [];
    const seenDates = new Set<string>();
    for (const p of sorted) {
      if (!seenDates.has(p.date)) {
        if (seenDates.size >= 7) break;
        seenDates.add(p.date);
        groups.push({ date: p.date, papers: [p] });
      } else {
        groups[groups.length - 1].papers.push(p);
      }
    }
    return groups;
  }, [papers, selectedCategories, hasFilters]);

  const totalPapers = dateGroups.reduce((sum, g) => sum + g.papers.length, 0);

  return (
    <div className="pt-8">
      {/* Category filter chips */}
      {allCategories.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xs text-text-secondary font-mono mt-1 shrink-0">
              {t('filterCategory', lang)}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allCategories.map((cat) => {
                const active = selectedCategories.has(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-all
                      ${active
                        ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/50'
                        : 'bg-transparent text-text-secondary/60 border-text-secondary/20 hover:border-text-secondary/40'
                      }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="mt-2 text-xs text-text-secondary/50 hover:text-accent-red font-mono transition-colors"
            >
              ✕ {t('filterClear', lang)}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {totalPapers > 0 ? (
        <div className="space-y-10">
          {dateGroups.map((g) => {
            const visible = showCounts[g.date] ?? INITIAL_SHOW;
            const shown = g.papers.slice(0, visible);
            const remaining = g.papers.length - shown.length;
            return (
              <section key={g.date}>
                <div className="max-w-6xl mx-auto px-4 mb-2">
                  <p className="text-xs text-text-secondary font-mono">
                    {g.date} &middot; {g.papers.length}{' '}
                    {lang === 'zh' ? '篇' : `paper${g.papers.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <div className="grid gap-4 max-w-3xl mx-auto px-4">
                  {shown.map((p, i) => (
                    <PaperCard key={p.id} paper={p} lang={lang} index={i} />
                  ))}
                </div>
                {remaining > 0 && (
                  <div className="max-w-3xl mx-auto px-4 mt-2">
                    <button
                      onClick={() =>
                        setShowCounts((prev) => ({
                          ...prev,
                          [g.date]: (prev[g.date] ?? INITIAL_SHOW) + SHOW_MORE,
                        }))
                      }
                      className="w-full py-3 text-sm font-mono text-text-secondary/60
                             border border-dashed border-text-secondary/20 rounded-lg
                             hover:text-neon-cyan hover:border-neon-cyan/40
                             transition-all duration-200"
                    >
                      +{Math.min(remaining, SHOW_MORE)} {lang === 'zh' ? '更多' : 'more'}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-4 text-center py-12">
          <p className="text-sm text-text-secondary font-mono">
            {lang === 'zh' ? '没有匹配的论文' : 'No matching papers'}
          </p>
        </div>
      )}
    </div>
  );
}
