import { useCallback, useState } from 'react';
import type { Paper, Lang } from '../../types/paper';
import { getPrimarySource } from '../../lib/source';
import { t } from '../../lib/i18n';

interface Props {
  paper: Paper;
  lang: Lang;
}

function buildMailTo(paper: Paper, lang: Lang): string {
  const title = paper.title.en;
  const url = `${window.location.origin}/${lang}/paper/${paper.id}`;
  const source = getPrimarySource(paper);
  const summary = paper.summary.en.slice(0, 300);

  const subject = encodeURIComponent(`[Paper Radar] ${title}`);
  const body = encodeURIComponent(
    [
      title,
      '',
      `Published: ${paper.date} | Source: ${source.label.en}`,
      `Citations: ${paper.citeCount}`,
      '',
      summary + (paper.summary.en.length > 300 ? '...' : ''),
      '',
      `Read more: ${url}`,
    ].join('\n'),
  );

  return `mailto:?subject=${subject}&body=${body}`;
}

export default function ShareButton({ paper, lang }: Props) {
  const [copied, setCopied] = useState(false);

  const handleShare = useCallback(() => {
    const title = paper.title[lang];
    const url = `${window.location.origin}/${lang}/paper/${paper.id}`;

    if (navigator.share) {
      navigator.share({
        title: `[Paper Radar] ${title}`,
        text: paper.summary[lang].slice(0, 200),
        url,
      }).catch(() => {
        // User cancelled — do nothing
      });
    } else {
      window.open(buildMailTo(paper, lang), '_blank');
    }
  }, [paper, lang]);

  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/${lang}/paper/${paper.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [paper, lang]);

  return (
    <div className="flex items-center gap-3 mt-4">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-cyan/30 text-neon-cyan/80
               font-mono text-sm transition-all duration-300
               hover:bg-neon-cyan/10 hover:border-neon-cyan hover:text-neon-cyan
               focus:outline-none focus:ring-2 focus:ring-neon-cyan/50"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {t('share', lang)}
      </button>
      <button
        onClick={handleCopyLink}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-neon-purple/30 text-neon-purple/80
               font-mono text-sm transition-all duration-300
               hover:bg-neon-purple/10 hover:border-neon-purple hover:text-neon-purple
               focus:outline-none focus:ring-2 focus:ring-neon-purple/50"
      >
        {copied ? (
          <span className="text-neon-cyan">{lang === 'zh' ? '已复制' : 'Copied!'}</span>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {t('copyLink', lang)}
          </>
        )}
      </button>
    </div>
  );
}
