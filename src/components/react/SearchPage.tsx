import { useState, useMemo, useEffect, useRef } from 'react';
import type { Lang } from '../../types/paper';
import { t } from '../../lib/i18n';
import { getSourceConfig } from '../../lib/source';
import { computeGroupFrequency, getCategoryGroup } from '../../config/categories';
import PaperCard from './PaperCard';
import { getCachedIndex, setCachedIndex } from '../../lib/idb-cache';

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

const PAGE_SIZE = 20;
const STORAGE_KEY = 'paper-radar:fulltext-enabled';
const VISIBLE_GROUPS = 6;

type SearchMode = 'quick' | 'confirming' | 'loading' | 'ready' | 'failed';

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
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // Doc 15: full-text search mode state
  const [searchMode, setSearchMode] = useState<SearchMode>('quick');
  const [rememberChoice, setRememberChoice] = useState(false);
  // Track whether we've already checked localStorage on mount
  const initialCheckDone = useRef(false);

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

  // Check localStorage on mount for remembered fulltext preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setSearchMode('loading');
        activateFulltext();
      }
    } catch {
      // localStorage unavailable — proceed in quick mode
    }
    initialCheckDone.current = true;
  }, [lang]);

  // Activate full-text: create worker, load prebuilt index via IndexedDB cache (stale-while-revalidate)
  const activateFulltext = () => {
    setSearchMode('loading');

    const w = new Worker(
      new URL('../../lib/search.worker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = w;

    const url = `/${lang}/search-prebuilt.json`;
    let posted = false;

    const loadIntoWorker = (data: unknown) => {
      w.postMessage({ type: 'load', data });
      posted = true;
    };

    // Cache-first: try IndexedDB
    getCachedIndex<unknown>(url).then((cached) => {
      if (cached) loadIntoWorker(cached);
    });

    // Network refresh: always fetch latest, update cache
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setCachedIndex(url, data);
        if (!posted) loadIntoWorker(data);
      })
      .catch(() => {
        if (!posted) setSearchMode('failed');
      });

    w.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'loaded') {
        setWorkerReady(true);
        setSearchMode('ready');
        // Re-run current query with fulltext
        if (queryRef.current.trim()) {
          w.postMessage({ type: 'search', query: queryRef.current.trim() });
        }
      } else if (e.data.type === 'results') {
        if (e.data.query === queryRef.current) {
          setFulltextIds(new Set(e.data.indices));
          pendingQueryRef.current = false;
        }
      }
    };
  };

  // When worker becomes ready in 'ready' mode, re-run current query
  useEffect(() => {
    if (searchMode === 'ready' && workerReady && query.trim()) {
      workerRef.current?.postMessage({ type: 'search', query: query.trim() });
    }
  }, [searchMode, workerReady]);

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

  // Compute grouped categories with counts
  const categoryGroups = useMemo(() => {
    if (!meta) return [];
    const allCodes = meta.map((m) => m.categories ?? []);
    return computeGroupFrequency(allCodes);
  }, [meta]);

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

  const toggleSource = (key: string) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    setSelectedSources(new Set());
    setSelectedGroups(new Set());
    setSelectedCodes(new Set());
  };

  const hasFilters = selectedSources.size > 0 || selectedGroups.size > 0 || selectedCodes.size > 0;

  // Browse empty state: top hot papers + recent papers
  const browseHotPapers = useMemo(() => {
    if (!meta) return [];
    return [...meta].sort((a, b) => b.heatScore - a.heatScore).slice(0, 4);
  }, [meta]);

  const browseRecentPapers = useMemo(() => {
    if (!meta) return [];
    return [...meta].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  }, [meta]);

  // Relevance scoring for basic search
  const scoreResult = (m: MetaItem, q: string): number => {
    const lowerQ = q.toLowerCase();
    let score = 0;
    const titleEn = (m.title.en || '').toLowerCase();
    const titleZh = (m.title.zh || '').toLowerCase();
    if (titleEn === lowerQ || titleZh === lowerQ) score += 100;
    else if (titleEn.includes(lowerQ) || titleZh.includes(lowerQ)) score += 50;
    if ((m.authors || []).some((a) => a.name.toLowerCase().includes(lowerQ))) score += 30;
    if ((m.tags || []).some((t) => t.toLowerCase().includes(lowerQ))) score += 10;
    return score;
  };

  // Compute query results
  const queryResults = useMemo(() => {
    if (!meta) return [];
    if (!query.trim() && !hasFilters) return [];

    if (searchMode === 'ready' && workerReady && fulltextIds && query.trim()) {
      // Full-text results: sort by heatScore then recency
      return fulltextIds.size === 0
        ? []
        : meta
            .filter((_, i) => fulltextIds.has(i))
            .sort((a, b) => {
              const heatDiff = b.heatScore - a.heatScore;
              if (heatDiff !== 0) return heatDiff;
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
    }

    // Basic search: title, authors, tags, with relevance scoring
    if (!query.trim()) return meta;
    const q = query.toLowerCase();
    return meta
      .map((m) => {
        const relevance = scoreResult(m, q);
        return { m, relevance };
      })
      .filter(({ relevance }) => relevance > 0)
      .sort((a, b) => {
        const relDiff = b.relevance - a.relevance;
        if (relDiff !== 0) return relDiff;
        const heatDiff = b.m.heatScore - a.m.heatScore;
        if (heatDiff !== 0) return heatDiff;
        return new Date(b.m.date).getTime() - new Date(a.m.date).getTime();
      })
      .map(({ m }) => m);
  }, [meta, query, searchMode, workerReady, fulltextIds, hasFilters]);

  // Apply filters
  const results = useMemo(
    () =>
      queryResults.filter((m) => {
        if (selectedSources.size > 0 && !selectedSources.has(m.source)) return false;
        if (selectedGroups.size > 0 || selectedCodes.size > 0) {
          const paperGroups = new Set((m.categories ?? []).map((c) => getCategoryGroup(c)));
          const groupMatch = [...selectedGroups].some((gk) => paperGroups.has(gk));
          const codeMatch = [...selectedCodes].some((c) => (m.categories ?? []).includes(c));
          return groupMatch || codeMatch;
        }
        return true;
      }),
    [queryResults, selectedSources, selectedGroups, selectedCodes],
  );

  // Reset page on query/filter change
  useEffect(() => {
    setPage(0);
  }, [query, selectedSources, selectedGroups, selectedCodes]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const paginatedResults = results.slice(
    clampedPage * PAGE_SIZE,
    (clampedPage + 1) * PAGE_SIZE,
  );

  // Determine if user has typed a query (for empty-state CTA)
  const hasQuery = query.trim().length > 0;

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
      <div className="relative mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            const val = e.target.value;
            setQuery(val);
            if (searchMode === 'ready' && workerReady && val.trim()) {
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

      {/* Search mode strip (Doc 15 / Doc 24: pre-click strip must explain quick search scope AND extra full-text cost) */}
      {!loading && meta && (
        <div className="mb-6 px-4 py-2.5 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4">
          <div className="text-xs font-mono text-text-secondary/70">
            {searchMode === 'quick' && (
              <div className="flex flex-col gap-0.5">
                <span>{t('searchModeTitle', lang)}</span>
                <span className="text-[10px] text-text-secondary/50">{t('fulltextCostNote', lang)}</span>
              </div>
            )}
            {searchMode === 'loading' && <span>{t('fulltextLoading', lang)}</span>}
            {searchMode === 'ready' && <span>{t('searchModeFulltext', lang)}</span>}
            {searchMode === 'failed' && <span>{t('fulltextFailed', lang)}</span>}
          </div>
          {searchMode === 'quick' && (
            <button
              onClick={() => setSearchMode('confirming')}
              className="shrink-0 text-xs font-mono text-neon-cyan/70 hover:text-neon-cyan px-2.5 py-1 rounded border border-neon-cyan/20 hover:border-neon-cyan/50 transition-all"
            >
              {t('enableFulltext', lang)}
            </button>
          )}
          {searchMode === 'failed' && (
            <button
              onClick={activateFulltext}
              className="shrink-0 text-xs font-mono text-accent-red/70 hover:text-accent-red px-2.5 py-1 rounded border border-accent-red/20 hover:border-accent-red/50 transition-all"
            >
              {t('enableFulltext', lang)}
            </button>
          )}
        </div>
      )}

      {/* Confirmation modal (Doc 15) */}
      {searchMode === 'confirming' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel-glass rounded-xl p-6 max-w-sm mx-4 w-full">
            <h3 className="text-lg font-bold text-neon-cyan font-mono mb-3">
              {t('fulltextModalTitle', lang)}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">
              {t('fulltextModalBody', lang)}
            </p>
            <label className="flex items-center gap-2 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="w-4 h-4 rounded border-text-secondary/30 bg-transparent accent-neon-cyan"
              />
              <span className="text-xs text-text-secondary/70 font-mono">
                {t('fulltextRemember', lang)}
              </span>
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (rememberChoice) {
                    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
                  }
                  activateFulltext();
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-mono font-bold text-neon-cyan border border-neon-cyan/50
                           hover:bg-neon-cyan/10 transition-all"
              >
                {t('fulltextEnableNow', lang)}
              </button>
              <button
                onClick={() => {
                  setSearchMode('quick');
                  if (rememberChoice) {
                    try { localStorage.setItem(STORAGE_KEY, 'false'); } catch {}
                  }
                }}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-mono text-text-secondary border border-text-secondary/20
                           hover:text-text-primary hover:border-text-secondary/40 transition-all"
              >
                {t('fulltextNotNow', lang)}
              </button>
            </div>
          </div>
        </div>
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

          {categoryGroups.length > 0 && (
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
          )}

          {/* Advanced filters: individual arXiv taxonomy codes (Doc 24) */}
          {showAdvanced && rawCategoryCounts.length > 0 && (
            <div className="flex items-start gap-3 pt-3 border-t border-white/5">
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
                    &larr; {lang === 'zh' ? '上一页' : 'Prev'}
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
                    {lang === 'zh' ? '下一页' : 'Next'} &rarr;
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
              <div className="flex items-center justify-center gap-4 mt-6">
                {searchMode === 'quick' && (
                  <button
                    onClick={() => setSearchMode('confirming')}
                    className="px-4 py-2 text-xs font-mono rounded border border-neon-cyan/30 text-neon-cyan/70
                               hover:text-neon-cyan hover:border-neon-cyan hover:bg-neon-cyan/5 transition-all"
                  >
                    {t('fulltextCTA', lang)} &rarr;
                  </button>
                )}
                <a
                  href={`/${lang}/latest`}
                  className="px-4 py-2 text-xs font-mono rounded border border-text-secondary/30 text-text-secondary/60
                             hover:text-text-secondary hover:border-text-secondary/60 transition-all"
                >
                  {t('browseLatest', lang)} &rarr;
                </a>
              </div>
            </div>
          )}
        </>
      )}

      {/* Browse empty state (Doc 23: lightweight browse when no query) */}
      {!loading && meta && !query.trim() && !hasFilters && (
        <div className="space-y-8">
          {/* Rising now */}
          <section>
            <h2 className="text-lg font-bold text-gradient-cyan tracking-wide mb-3">
              🔥 {t('risingNow', lang)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {browseHotPapers.map((m, i) => (
                <PaperCard key={m.id} paper={m as any} lang={lang} index={i} />
              ))}
            </div>
          </section>

          {/* Recently added */}
          <section>
            <h2 className="text-lg font-bold text-gradient-cyan-purple tracking-wide mb-3">
              🕐 {t('recentlyAdded', lang)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {browseRecentPapers.map((m, i) => (
                <PaperCard key={m.id} paper={m as any} lang={lang} index={i} />
              ))}
            </div>
          </section>

          {/* Browse by domain */}
          <section>
            <h2 className="text-lg font-bold text-text-primary tracking-wide mb-3">
              📂 {t('browseDomain', lang)}
            </h2>
            <div className="flex flex-wrap gap-2">
              {categoryGroups.map((g) => (
                <button
                  key={g.key}
                  onClick={() => toggleGroup(g.key)}
                  className="px-3 py-1.5 text-sm font-mono rounded-lg border border-text-secondary/20
                    text-text-secondary/70 hover:text-neon-cyan hover:border-neon-cyan/40
                    transition-all duration-200"
                >
                  {g.label[lang]}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary/40 font-mono mt-3">
              {lang === 'zh' ? '点击分类开始浏览' : 'Click a category to start browsing'}
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
