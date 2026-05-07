import { useState, useMemo, useEffect, useRef } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { t } from '../../lib/i18n';
import { computeGroupFrequency, getCategoryGroup } from '../../config/categories';
import PaperCard from './PaperCard';
import { relativeDate } from '../../lib/date';

const SHOW_MORE = 10;
const VISIBLE_GROUPS = 6;

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateStr === yesterday.toISOString().slice(0, 10);
}

function getDefaultShow(dateStr: string): number {
  if (isToday(dateStr)) return 8;
  if (isYesterday(dateStr)) return 4;
  return 2;
}

interface Props {
  lang: Lang;
}

export default function LatestContent({ lang }: Props) {
  const [loadedDates, setLoadedDates] = useState<Record<string, Paper[]>>({});
  const [dateOrder, setDateOrder] = useState<string[]>([]);
  const [hasMoreDates, setHasMoreDates] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showCounts, setShowCounts] = useState<Record<string, number>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    setInitialLoading(true);
    fetch(`/${lang}/latest-day/0.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data: { date: string; papers: Paper[]; hasMore: boolean }) => {
        if (data.date) {
          setLoadedDates({ [data.date]: data.papers });
          setDateOrder([data.date]);
          setHasMoreDates(data.hasMore);
        }
        setInitialLoading(false);
      })
      .catch(() => {
        setError(true);
        setInitialLoading(false);
      });
  }, [lang]);

  // All loaded papers flattened
  const allLoadedPapers = useMemo(() => {
    return dateOrder.flatMap((date) => loadedDates[date] || []);
  }, [dateOrder, loadedDates]);

  // Compute grouped categories with counts (scoped to loaded dates)
  const categoryGroups = useMemo(() => {
    if (allLoadedPapers.length === 0) return [];
    const allCodes = allLoadedPapers.map((p) => p.categories ?? []);
    return computeGroupFrequency(allCodes);
  }, [allLoadedPapers]);

  // Batch overview — uses the actual loaded date, not calendar "today"
  const overview = useMemo(() => {
    if (allLoadedPapers.length === 0 || dateOrder.length === 0) return null;
    const latestDate = dateOrder[0];
    const latestCount = loadedDates[latestDate]?.length ?? 0;
    const topFields = categoryGroups.slice(0, 3).map((g) => g.label[lang]);
    return { latestDate, latestCount, total: allLoadedPapers.length, topFields };
  }, [allLoadedPapers, dateOrder, loadedDates, categoryGroups, lang]);

  // Individual arXiv code frequencies for Advanced filters
  const rawCategoryCounts = useMemo(() => {
    if (allLoadedPapers.length === 0) return [];
    const counts = new Map<string, number>();
    for (const p of allLoadedPapers) {
      for (const c of (p.categories ?? [])) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [allLoadedPapers]);

  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedGroups(new Set());
    setSelectedCodes(new Set());
    setShowCounts({});
  };

  const loadingRef = useRef(false);

  const loadNextDate = () => {
    if (loadingRef.current || !hasMoreDates) return;
    loadingRef.current = true;
    setIsLoadingMore(true);
    const nextIndex = dateOrder.length;
    fetch(`/${lang}/latest-day/${nextIndex}.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data: { date: string; papers: Paper[]; hasMore: boolean }) => {
        if (data.date) {
          setLoadedDates((prev) => ({ ...prev, [data.date]: data.papers }));
          setDateOrder((prev) => [...prev, data.date]);
          setHasMoreDates(data.hasMore);
        }
        setIsLoadingMore(false);
        loadingRef.current = false;
      })
      .catch(() => {
        setIsLoadingMore(false);
        loadingRef.current = false;
      });
  };

  const hasFilters = selectedGroups.size > 0 || selectedCodes.size > 0;

  // Reset per-day show counts when filters change
  useEffect(() => {
    setShowCounts({});
  }, [selectedGroups, selectedCodes]);

  // Group loaded dates into sections, applying filters per-date
  const dateGroups = useMemo(() => {
    const groups: { date: string; papers: Paper[] }[] = [];
    for (const date of dateOrder) {
      const datePapers = loadedDates[date];
      if (!datePapers || datePapers.length === 0) continue;
      let filtered = datePapers;
      if (hasFilters) {
        filtered = datePapers.filter((p) => {
          const paperGroups = new Set((p.categories ?? []).map((c) => getCategoryGroup(c)));
          const groupMatch = [...selectedGroups].some((gk) => paperGroups.has(gk));
          const codeMatch = [...selectedCodes].some((c) => (p.categories ?? []).includes(c));
          return groupMatch || codeMatch;
        });
      }
      if (filtered.length > 0) {
        groups.push({ date, papers: filtered });
      }
    }
    return groups;
  }, [dateOrder, loadedDates, selectedGroups, selectedCodes, hasFilters]);

  const totalPapers = dateGroups.reduce((sum, g) => sum + g.papers.length, 0);

  // Loading skeleton
  if (initialLoading) {
    return (
      <div className="pt-8 max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-48 bg-text-secondary/10 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-text-secondary/10 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-6">
            <div className="h-4 w-32 bg-text-secondary/10 rounded animate-pulse mb-3" />
            <div className="h-24 bg-text-secondary/10 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="pt-8 max-w-3xl mx-auto px-4 text-center py-12">
        <p className="text-sm text-accent-red font-mono">
          {lang === 'zh' ? '加载失败，请刷新重试' : 'Failed to load. Please refresh.'}
        </p>
      </div>
    );
  }

  return (
    <div className="pt-8">
      {/* Page header */}
      <div className="max-w-3xl mx-auto px-4 mb-4">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient-cyan-purple mb-2 leading-tight">
          {t('latestTitle', lang)}
        </h1>
        <p className="text-sm text-text-secondary/70 font-mono">
          {t('latestDesc', lang)}
        </p>
      </div>

      {/* Daily overview band */}
      {overview && (
        <div className="max-w-3xl mx-auto px-4 mb-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-text-secondary/70 px-4 py-2 bg-white/[0.02] rounded-lg border border-white/5">
            <span>
              {lang === 'zh' ? `最新批次 ${overview.latestDate} · ${overview.latestCount} 篇` : `Latest batch: ${overview.latestDate} · ${overview.latestCount} papers`}
            </span>
            <span className="text-text-secondary/30">|</span>
            <span>
              {lang === 'zh' ? '热门领域：' : 'Top fields: '}
              {overview.topFields.join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Grouped category filter chips */}
      {categoryGroups.length > 0 && (
        <div className="max-w-3xl mx-auto px-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-xs text-text-secondary font-mono mt-1 shrink-0">
              {t('filterCategory', lang)}:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {categoryGroups.slice(0, VISIBLE_GROUPS).map((g) => {
                const active = selectedGroups.has(g.key);
                return (
                  <button
                    key={g.key}
                    onClick={() => toggleGroup(g.key)}
                    className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-all duration-200
                      ${active
                        ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/50'
                        : 'bg-transparent text-text-secondary/40 border-text-secondary/10 hover:border-text-secondary/30 hover:text-text-secondary/60'
                      }`}
                  >
                    {g.label[lang]} ({g.count})
                  </button>
                );
              })}

              {/* Advanced filters toggle (Doc 24: level-2 taxonomy) */}
              <button
                onClick={() => setShowAdvanced((prev) => !prev)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition-all duration-200
                  ${showAdvanced
                    ? 'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/40'
                    : 'border-dashed border-text-secondary/20 text-text-secondary/40 hover:border-text-secondary/40 hover:text-text-secondary/60'
                  }`}
              >
                {showAdvanced ? '↑ ' : ''}{t('advancedFilters', lang)}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-2">
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-text-secondary/50 hover:text-accent-red font-mono transition-colors"
              >
                ✕ {t('filterClear', lang)}
              </button>
            )}
            <a
              href={`/${lang}/search`}
              className="text-xs text-neon-cyan/60 hover:text-neon-cyan font-mono transition-colors"
            >
              {t('searchAllPapers', lang)} &rarr;
            </a>
          </div>
          {/* Advanced filters: individual arXiv taxonomy codes (Doc 24) */}
          {showAdvanced && rawCategoryCounts.length > 0 && (
            <div className="flex items-start gap-3 mt-3 pt-3 border-t border-white/5">
              <span className="text-[10px] text-text-secondary/40 font-mono mt-1 shrink-0">
                {lang === 'zh' ? '分类代码' : 'Taxonomy codes'}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {rawCategoryCounts.slice(0, 30).map(({ code, count }) => {
                  const active = selectedCodes.has(code);
                  return (
                    <button
                      key={code}
                      onClick={() => toggleCode(code)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-all duration-200
                        ${active
                          ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40'
                          : 'bg-transparent text-text-secondary/30 border-text-secondary/10 hover:border-text-secondary/30 hover:text-text-secondary/50'
                        }`}
                    >
                      {code} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {totalPapers > 0 ? (
        <div className="space-y-10">
          {dateGroups.map((g) => {
            const defaultShow = getDefaultShow(g.date);
            const visible = showCounts[g.date] ?? defaultShow;
            const hasVisible = visible > 0;
            const shown = g.papers.slice(0, visible);
            const remaining = g.papers.length - shown.length;
            return (
              <section key={g.date}>
                <div className="max-w-3xl mx-auto px-4 mb-3">
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="text-sm font-bold text-text-primary font-mono tracking-wide">
                      {relativeDate(g.date, lang)}
                    </h3>
                    <span className="text-xs text-text-secondary/40 font-mono">
                      {g.papers.length} {lang === 'zh' ? '篇' : `paper${g.papers.length !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-text-secondary/20 to-transparent" />
                </div>
                {hasVisible && (
                  <div className="grid gap-4 max-w-3xl mx-auto px-4">
                    {shown.map((p, i) => (
                      <PaperCard key={p.id} paper={p} lang={lang} index={i} />
                    ))}
                  </div>
                )}
                {remaining > 0 && (
                  <div className="max-w-3xl mx-auto px-4 mt-2">
                    <button
                      onClick={() =>
                        setShowCounts((prev) => ({
                          ...prev,
                          [g.date]: (prev[g.date] ?? defaultShow) + SHOW_MORE,
                        }))
                      }
                      className="w-full py-3 text-sm font-mono text-text-secondary/60
                             border border-dashed border-text-secondary/20 rounded-lg
                             hover:text-neon-cyan hover:border-neon-cyan/40
                             transition-all duration-200"
                    >
                      {hasVisible
                        ? isToday(g.date)
                          ? t('showMoreToday', lang)
                          : isYesterday(g.date)
                            ? t('showMoreFromYesterday', lang)
                            : `+${Math.min(remaining, SHOW_MORE)} ${lang === 'zh' ? '更多' : 'more'}`
                        : t('loadOlderPapers', lang)}
                    </button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="max-w-3xl mx-auto px-4 text-center py-12">
          <p className="text-sm text-text-secondary font-mono">
            {lang === 'zh' ? '没有匹配的论文' : 'No matching papers'}
          </p>
        </div>
      )}

      {/* Load older papers */}
      {hasMoreDates && (
        <div className="max-w-3xl mx-auto px-4 mt-8 mb-10">
          <button
            onClick={loadNextDate}
            disabled={isLoadingMore}
            className="w-full py-3 text-sm font-mono text-text-secondary/60
              border border-dashed border-text-secondary/20 rounded-lg
              hover:text-neon-cyan hover:border-neon-cyan/40
              transition-all duration-200"
          >
            {isLoadingMore
              ? (lang === 'zh' ? '加载中…' : 'Loading…')
              : t('loadOlderPapers', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
