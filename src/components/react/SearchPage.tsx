import { useState, useMemo, useEffect } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { searchPapers } from '../../lib/searchEngine';
import { t } from '../../lib/i18n';
import { getSourceConfig } from '../../lib/source';
import PaperCard from './PaperCard';
import GlitchText from './GlitchText';

interface Props {
  lang: Lang;
}

const PAGE_SIZE = 20;

function LoadingSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="panel-glass rounded-xl p-5 animate-pulse"
        >
          <div className="h-5 bg-white/5 rounded w-3/4 mb-3" />
          <div className="h-4 bg-white/5 rounded w-full mb-2" />
          <div className="h-4 bg-white/5 rounded w-2/3 mb-3" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
        </div>
      ))}
    </div>
  );
}

export default function SearchPage({ lang }: Props) {
  const [papers, setPapers] = useState<Paper[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Fetch slim search data on mount
  useEffect(() => {
    setLoading(true);
    fetch(`/${lang}/search-index.json`)
      .then((res) => res.json())
      .then((data: Paper[]) => {
        setPapers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  // Extract unique sources and categories from data
  const allSources = useMemo(() => {
    if (!papers) return [];
    const keys = new Set(papers.map((p) => p.source).filter(Boolean));
    return [...keys].sort();
  }, [papers]);

  const allCategories = useMemo(() => {
    if (!papers) return [];
    const cats = new Set(papers.flatMap((p) => p.categories ?? []));
    return [...cats].sort();
  }, [papers]);

  // Toggle helpers
  const toggleSource = (key: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedSources(new Set());
    setSelectedCategories(new Set());
  };

  const hasFilters = selectedSources.size > 0 || selectedCategories.size > 0;

  // Text search (only when papers are loaded)
  const textResults = useMemo(
    () => papers ? searchPapers(papers, query, lang) : [],
    [papers, query, lang],
  );

  // Apply filters on top of text search
  const results = useMemo(() => {
    return textResults.filter((p) => {
      if (selectedSources.size > 0 && !selectedSources.has(p.source)) return false;
      if (selectedCategories.size > 0) {
        const paperCats = new Set(p.categories ?? []);
        const hasMatch = [...selectedCategories].some((c) => paperCats.has(c));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [textResults, selectedSources, selectedCategories]);

  // Reset to first page when query or filters change
  useEffect(() => {
    setPage(0);
  }, [query, selectedSources, selectedCategories]);

  // Paginate
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const paginatedResults = results.slice(clampedPage * PAGE_SIZE, (clampedPage + 1) * PAGE_SIZE);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gradient-cyan-purple mb-1 leading-tight">
          {t('searchTitle', lang)}
        </h1>
        <p className="text-sm text-text-secondary/70 font-mono">
          {t('searchHint', lang)}
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder', lang)}
          className="w-full px-6 py-4 text-lg bg-panel border border-neon-cyan/30 rounded-xl
                     text-text-primary placeholder-text-secondary font-mono
                     focus:outline-none focus:border-neon-cyan focus:shadow-[0_0_20px_rgba(0,240,255,0.15)]
                     transition-all duration-300"
          autoFocus
        />
        <svg
          className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Filters (only shown when data loaded) */}
      {!loading && papers && (
        <div className="mb-6 space-y-3">
          {/* Source filter */}
          {allSources.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-text-secondary font-mono mt-1 shrink-0">
                {t('filterSource', lang)}:
              </span>
              <div className="flex flex-wrap gap-2">
                {allSources.map((key) => {
                  const cfg = getSourceConfig(key);
                  const active = selectedSources.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleSource(key)}
                      className={`px-2.5 py-1 text-xs font-mono rounded-full border transition-all
                        ${active
                          ? 'border-neon-cyan text-neon-cyan bg-neon-cyan/10 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                          : 'border-text-secondary/30 text-text-secondary/70 hover:border-text-secondary/60'
                        }`}
                    >
                      {cfg?.icon ?? '🔗'} {cfg?.label.en ?? key}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category filter */}
          {allCategories.length > 0 && (
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
          )}

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-text-secondary/50 hover:text-accent-red font-mono transition-colors"
            >
              ✕ {t('filterClear', lang)}
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && <LoadingSkeleton />}

      {/* Results / Empty State */}
      {!loading && papers && (
        <>
          {(query || hasFilters) && (
            <p className="text-sm text-text-secondary font-mono mb-4">
              {results.length}{' '}
              {lang === 'zh' ? '条结果' : `result${results.length !== 1 ? 's' : ''}`}
            </p>
          )}

          {results.length > 0 ? (
            <>
              <div className="grid gap-4">
                {paginatedResults.map((paper, i) => (
                  <PaperCard key={paper.id} paper={paper} lang={lang} index={i} />
                ))}
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8 font-mono text-sm">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={clampedPage === 0}
                    className="px-4 py-2 rounded border border-neon-cyan/30 text-neon-cyan
                               disabled:opacity-30 disabled:cursor-not-allowed
                               hover:bg-neon-cyan/10 transition-all"
                  >
                    ← {lang === 'zh' ? '上一页' : 'Prev'}
                  </button>
                  <span className="text-text-secondary">
                    {clampedPage + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={clampedPage >= totalPages - 1}
                    className="px-4 py-2 rounded border border-neon-cyan/30 text-neon-cyan
                               disabled:opacity-30 disabled:cursor-not-allowed
                               hover:bg-neon-cyan/10 transition-all"
                  >
                    {lang === 'zh' ? '下一页' : 'Next'} →
                  </button>
                </div>
              )}
            </>
          ) : (query || hasFilters) ? (
            <div className="text-center py-8">
              <GlitchText text={t('noResults', lang)} />
              <p className="mt-4 text-sm text-text-secondary/60 font-mono">
                {t('searchNoResultsHint', lang)}
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
