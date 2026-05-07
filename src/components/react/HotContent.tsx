import { useState, useMemo, useEffect } from 'react';
import type { Lang } from '../../types/paper';
import { t } from '../../lib/i18n';
import { computeGroupFrequency, getCategoryGroup } from '../../config/categories';
import PaperCard from './PaperCard';

const VISIBLE_GROUPS = 6;
const INITIAL_SHOW = 12;
const SHOW_MORE = 12;

interface Props {
  lang: Lang;
}

interface MetaItem {
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
}

export default function HotContent({ lang }: Props) {
  const [meta, setMeta] = useState<MetaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [showCount, setShowCount] = useState(INITIAL_SHOW);

  useEffect(() => {
    fetch(`/${lang}/search-index.json`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then((data: MetaItem[]) => {
        setMeta(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [lang]);

  const categoryGroups = useMemo(() => {
    if (!meta) return [];
    const allCodes = meta.map((m) => m.categories ?? []);
    return computeGroupFrequency(allCodes);
  }, [meta]);

  const hasFilters = selectedGroups.size > 0 || selectedCodes.size > 0;

  const allSorted = useMemo(() => {
    if (!meta) return [];
    return [...meta].sort((a, b) => b.heatScore - a.heatScore);
  }, [meta]);

  const filtered = useMemo(() => {
    if (!allSorted.length) return [];
    if (!hasFilters) return allSorted;
    return allSorted.filter((m) => {
      const paperGroups = new Set((m.categories ?? []).map((c) => getCategoryGroup(c)));
      const groupMatch = [...selectedGroups].some((gk) => paperGroups.has(gk));
      const codeMatch = [...selectedCodes].some((c) => (m.categories ?? []).includes(c));
      return groupMatch || codeMatch;
    });
  }, [allSorted, selectedGroups, selectedCodes, hasFilters]);

  const visiblePapers = filtered.slice(0, showCount);
  const remaining = filtered.length - visiblePapers.length;

  // Individual arXiv code frequencies for Advanced filters
  const rawCategoryCounts = useMemo(() => {
    if (!meta) return [];
    const counts = new Map<string, number>();
    for (const m of meta) {
      for (const c of (m.categories ?? [])) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);
  }, [meta]);

  const toggleGroup = (key: string) => {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setShowCount(INITIAL_SHOW);
  };

  const toggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setShowCount(INITIAL_SHOW);
  };

  const clearFilters = () => {
    setSelectedGroups(new Set());
    setSelectedCodes(new Set());
    setShowCount(INITIAL_SHOW);
  };

  if (loading) {
    return (
      <div className="pt-8 max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <div className="h-8 w-48 bg-text-secondary/10 rounded animate-pulse mb-3" />
          <div className="h-4 w-72 bg-text-secondary/10 rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="mb-6">
            <div className="h-24 bg-text-secondary/10 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

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
    <div className="pt-8 max-w-6xl mx-auto px-4">
      {/* Header block */}
      <div className="max-w-3xl mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gradient-cyan-purple mb-2 tracking-wide">
          {t('hot', lang)}
        </h1>
        <p className="text-sm text-text-secondary/70 font-mono">
          {t('hotDesc', lang)}
        </p>
      </div>

      {/* Overview strip */}
      <div className="max-w-6xl mx-auto mb-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-text-secondary/70 px-4 py-2 bg-white/[0.02] rounded-lg border border-white/5">
          <span>
            {lang === 'zh' ? `精选：${filtered.length} 篇` : `Top picks: ${filtered.length}`}
          </span>
          <span className="text-text-secondary/30">|</span>
          <span className="text-text-secondary/40">
            {lang === 'zh' ? '新晋上升' : 'New and rising'}
          </span>
          <span className="text-text-secondary/30">|</span>
          <span>
            {lang === 'zh' ? '基于引用、讨论和收藏趋势评估' : 'Based on recency + citations + activity'}
          </span>
        </div>
      </div>

      {/* Filter row */}
      {categoryGroups.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6">
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
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-text-secondary/50 hover:text-accent-red font-mono transition-colors mt-2"
            >
              ✕ {t('filterClear', lang)}
            </button>
          )}
        </div>
      )}

      {/* Advanced filters: individual arXiv taxonomy codes (Doc 24) */}
      {showAdvanced && rawCategoryCounts.length > 0 && (
        <div className="max-w-6xl mx-auto mb-6 -mt-4">
          <div className="flex items-start gap-3 px-4">
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
        </div>
      )}

      {/* PaperCard results (Doc 24: same skeleton as Latest) */}
      {visiblePapers.length > 0 && (
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-4">
            {visiblePapers.map((m, i) => (
              <PaperCard key={m.id} paper={m as any} lang={lang} index={i} />
            ))}
          </div>

          {remaining > 0 && (
            <div className="mt-6 mb-10">
              <button
                onClick={() => setShowCount((prev) => prev + SHOW_MORE)}
                className="w-full py-3 text-sm font-mono text-text-secondary/60
                  border border-dashed border-text-secondary/20 rounded-lg
                  hover:text-neon-cyan hover:border-neon-cyan/40
                  transition-all duration-200"
              >
                {t('showMoreSignals', lang)}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cross-link to Latest */}
      <div className="max-w-3xl mx-auto mt-10 text-center">
        <a
          href={`/${lang}/latest`}
          className="text-xs font-mono text-text-secondary/50 hover:text-neon-cyan transition-colors"
        >
          {t('viewLatest', lang)} &rarr;
        </a>
      </div>
    </div>
  );
}
