import { useState, useEffect } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { getPrimarySource } from '../../lib/source';
import { relativeDate } from '../../lib/date';
import SourceBadge from './SourceBadge';
import HeatBadge from './HeatBadge';

interface Props {
  paper: Paper;
  lang: Lang;
  index?: number;
  /** Optional heat score — passed from parent when available */
  heatScore?: number;
}

export default function PaperCard({ paper, lang, index = 0, heatScore }: Props) {
  const title = paper.title[lang];
  const summary = paper.summary?.[lang];
  const href = `/${lang}/paper/${paper.id}`;
  const authors = paper.authors ?? [];

  return (
    <a
      href={href}
      className="block panel-glass rounded-xl p-5 cursor-pointer group relative overflow-hidden
                 hover:-translate-y-1 hover:shadow-[0_0_15px_rgba(0,240,255,0.3)]
                 transition-all duration-300"
      style={{ animation: `fadeInUp 0.3s ease-out both`, animationDelay: `${index * 0.05}s` }}
    >
      {/* Trending badge */}
      {paper.isTrending && (
        <span className="absolute top-3 right-3 text-sm" title="Trending">
          🔥
        </span>
      )}

      {/* Title */}
      <h3 className="text-base font-bold text-text-primary group-hover:text-neon-cyan transition-colors line-clamp-1 mb-2 pr-6">
        {title}
      </h3>

      {/* Summary */}
      {summary && (
        <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed mb-2">
          {summary}
        </p>
      )}

      {/* Authors */}
      {authors.length > 0 && (
        <p className="text-xs text-text-secondary/70 mb-2 truncate">
          {authors.slice(0, 2).map((a) => a.name).join(', ')}
          {authors.length > 2 && (
            <span className="text-text-secondary/50"> et al.</span>
          )}
        </p>
      )}

      {/* Categories */}
      {paper.categories && paper.categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {paper.categories.slice(0, 3).map((cat) => (
            <span
              key={cat}
              className="px-1.5 py-0.5 text-[10px] font-mono rounded
                bg-neon-purple/10 text-neon-purple/80 border border-neon-purple/20"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Tags (if populated by AI) */}
      {paper.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {paper.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs font-mono rounded-full border border-neon-cyan/30 text-neon-cyan/80"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-xs text-text-secondary font-mono">
        <span>{relativeDate(paper.date, lang)}</span>
        {heatScore != null && <HeatBadge score={heatScore} size="sm" />}
        <SourceBadge source={getPrimarySource(paper)} />
        <span>📖 {paper.citeCount}</span>
      </div>
    </a>
  );
}
