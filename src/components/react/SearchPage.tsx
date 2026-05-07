import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lang } from '../../types/paper';
import { t } from '../../lib/i18n';
import { getSourceConfig } from '../../lib/source';
import PaperCard from './PaperCard';

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
}

const PAGE_SIZE = 20;

function LoadingSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="panel-glass rounded-xl p-5 animate-pulse">
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
  const [meta, setMeta] = useState<MetaItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [workerReady, setWorkerReady] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const queryRef = useRef('');
  const pendingQueryRef = useRef(false);
  const [fulltextIds, setFulltextIds] = useState<Set<number> | null>(null);
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Load meta on mount
  useEffect(() => {
    fetch(`/${lang}/search-index.json`)
      .then((res) => res.json())
      .then((data: MetaItem[]) => {
        setMeta(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [lang]);

  // Create worker and load prebuilt index
  useEffect(() => {
    const w = new Worker(
      new URL('../../lib/search.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = w;

    fetch(`/${lang}/search-prebuilt.json`)
      .then((res) => res.json())
      .then((data) => {
        w.postMessage({ type: 'load', data });
      });

    w.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'loaded') {
        setWorkerReady(true);
      } else if (e.data.type === 'results') {
        if (e.data.query === queryRef.current) {
          setFulltextIds(new Set(e.data.indices));
          pendingQueryRef.current = false;
        }
      }
    };

    return () => w.terminate();
  }, [lang]);

  // When worker becomes ready, re-run current query
  useEffect(() => {
    if (workerReady && query.trim()) {
      workerRef.current?.postMessage({ type: 'search', query: query.trim() });
    }
  }, [workerReady]);

  const sendToWorker = (q: string) => {
    queryRef.current = q;
    pendingQueryRef.current = true;
    setFulltextIds(null);
    workerRef.current?.postMessage({ type: 'search', query: q });
  };

  // Extract filters
  const allSources = useMemo(() => {
    if (!meta) return [];
    const keys = new Set(meta.map((m) => m.source).filter(Boolean));
    return [...keys].sort();
  }, [meta]);

  const allCategories = useMemo(() => {
    if (!meta) return [];
    const cats = new Set(meta.flatMap((m) => m.categories ?? []));
    return [...cats].sort();
  }, [meta]);

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

  // Compute query results
  const queryResults = useMemo(() => {
    if (!meta) return [];
    if (!query.trim() && !hasFilters) return [];

    if (workerReady && fulltextIds && query.trim()) {
      return fulltextIds.size === 0
        ? []
        : meta.filter((_, i) => fulltextIds.has(i));
    }

    // Basic search: title, authors, tags
    if (!query.trim()) return meta;
    const q = query.toLowerCase();
    return meta.filter((m) => {
      if ((m.title.en || '').toLowerCase().includes(q)) return true;
      if ((m.title.zh || '').includes(q)) return true;
      if ((m.authors || []).some((a) => a.name.toLowerCase().includes(q))) return true;
      if ((m.tags || []).some((t) => t.toLowerCase().includes(q))) return true;
      return false;
    });
  }, [meta, query, workerReady, fulltextIds, hasFilters]);

  // Apply filters
  const results = useMemo(
    () =>
      queryResults.filter((m) => {
        if (selectedSources.size > 0 && !selectedSources.has(m.source)) return false;
        if (selectedCategories.size > 0) {
          const catSet = new Set(m.categories ?? []);
          return [...selectedCategories].some((c) => catSet.has(c));
        }
        return true;
      }),
    [queryResults, selectedSources, selectedCategories],
  );

  // Reset page on query/filter change
  useEffect(() => {
    setPage(0);
  }, [query, selectedSources, selectedCategories]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const paginatedResults = results.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

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
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (workerReady && val.trim()) {
              sendToWorker(val.trim());
            }
          }}
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Worker status (subtle) */}
      {!loading && meta && !workerReady && query.trim() && (
        <p className="text-xs text-text-secondary/40 font-mono mb-2">
          {lang === 'zh' ? '全文索引加载中，基础搜索可用...' : 'Loading full-text index, basic search active...'}
        </p>
      )}

      {/* Filters */}
      {!loading && meta && (
        <div className="mb-6 space-y-3">
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

      {/* Loading */}
      {loading && <LoadingSkeleton />}

      {/* Results */}
      {!loading && meta && (query || hasFilters) && (
        <>
          <p className="text-sm text-text-secondary font-mono mb-4">
            {results.length}{' '}
            {lang === 'zh' ? '条结果' : `result${results.length !== 1 ? 's' : ''}`}
          </p>

          {results.length > 0 ? (
            <>
              <div className="grid gap-4">
                {paginatedResults.map((m, i) => (
                  <PaperCard
                    key={m.id}
                    paper={m as any}
                    lang={lang}
                    index={i}
                  />
                ))}
              </div>
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
          ) : (
            <div className="text-center py-8">
              <p className="text-xl font-mono text-neon-cyan/60">{t('noResults', lang)}</p>
              <p className="mt-4 text-sm text-text-secondary/60 font-mono">
                {t('searchNoResultsHint', lang)}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
