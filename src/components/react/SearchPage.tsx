import { useState, useMemo } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { searchPapers } from '../../lib/search';
import { t } from '../../lib/i18n';
import PaperCard from './PaperCard';
import GlitchText from './GlitchText';

interface Props {
  papers: Paper[];
  lang: Lang;
}

export default function SearchPage({ papers, lang }: Props) {
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => searchPapers(papers, query, lang),
    [papers, query, lang],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Search Input */}
      <div className="relative mb-8">
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

      {/* Results Count */}
      {query && (
        <p className="text-sm text-text-secondary font-mono mb-4">
          {results.length}{' '}
          {lang === 'zh' ? '条结果' : `result${results.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Results / Empty State */}
      {results.length > 0 ? (
        <div className="grid gap-4">
          {results.map((paper, i) => (
            <PaperCard key={paper.id} paper={paper} lang={lang} index={i} />
          ))}
        </div>
      ) : query ? (
        <GlitchText text={t('noResults', lang)} />
      ) : null}
    </div>
  );
}
