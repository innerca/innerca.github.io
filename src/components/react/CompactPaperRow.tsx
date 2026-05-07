import type { Paper, Lang } from '../../types/paper';
import { relativeDate } from '../../lib/date';
import { t } from '../../lib/i18n';
import { getCategoryGroup, getGroupLabel } from '../../config/categories';

interface HeatSignalProps {
  citeCount: number;
  sCite: number;
  sCode: number;
  sBuzz: number;
  sFresh: number;
  burstBonus: number;
}

interface Props {
  paper: Paper;
  lang: Lang;
  rank: number;
  heatScore?: number;
  heatSignals?: HeatSignalProps;
  index: number;
}

/** Build compact signal labels showing WHY a paper has its heat score. */
function heatSignalLabels(s: HeatSignalProps, lang: Lang): string[] {
  const labels: string[] = [];
  if (s.citeCount > 0) labels.push(t('signalCite', lang).replace('{count}', String(s.citeCount)));
  if (s.sCode > 0.1) labels.push(t('signalCode', lang));
  if (s.sBuzz > 0.1) labels.push(t('signalBuzz', lang));
  if (s.burstBonus > 1) labels.push(t('signalRising', lang));
  if (s.sFresh > 0.5) labels.push(t('signalNew', lang));
  return labels;
}

export default function CompactPaperRow({ paper, lang, rank, heatScore, heatSignals, index }: Props) {
  const href = `/${lang}/paper/${paper.id}`;

  // Primary domain label (Doc 24: compact row shows primary domain)
  const primaryCategory = paper.categories?.[0];
  const groupKey = primaryCategory ? getCategoryGroup(primaryCategory) : null;
  const groupLabel = groupKey ? getGroupLabel(groupKey) : null;
  const domainLabel = groupLabel ? groupLabel[lang] : '';

  const signalLabels = heatSignals ? heatSignalLabels(heatSignals, lang) : [];

  return (
    <a
      href={href}
      className="flex items-start gap-3 px-4 py-3 panel-glass rounded-xl cursor-pointer group
                 hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(0,240,255,0.25)]
                 transition-all duration-300"
      style={{ animation: `fadeInUp 0.3s ease-out both`, animationDelay: `${index * 0.03}s` }}
    >
      {/* Rank badge */}
      <span className="w-7 shrink-0 text-right text-xs font-mono text-text-secondary/40">
        #{rank}
      </span>

      {/* Heat score bar (compact) */}
      {heatScore != null && (
        <div className="w-16 shrink-0">
          <div className="h-1 rounded-full bg-text-secondary/10 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.round((heatScore / 115) * 100))}%`,
                background: heatScore >= 80
                  ? 'linear-gradient(90deg, #ff6b6b, #ffd93d)'
                  : heatScore >= 60
                  ? 'linear-gradient(90deg, #ffd93d, #00f0ff)'
                  : 'linear-gradient(90deg, #4a5568, #8892b0)',
              }}
            />
          </div>
        </div>
      )}

      {/* Main content: title on top, secondary info below */}
      <span className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title — at least 2 lines for readability */}
        <span className="text-sm font-medium text-text-primary group-hover:text-neon-cyan transition-colors line-clamp-2">
          {paper.title[lang]}
        </span>
        {/* Secondary info row: domain badge, date, signal labels */}
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-mono text-text-secondary/50">
          {domainLabel && (
            <span className="text-neon-purple/60 bg-neon-purple/10 px-1.5 py-0.5 rounded leading-normal">
              {domainLabel}
            </span>
          )}
          <span className="whitespace-nowrap">{relativeDate(paper.date, lang)}</span>
          {signalLabels.map((label, i) => (
            <span key={label}>
              <span className="mx-1 text-text-secondary/20">&middot;</span>
              {label}
            </span>
          ))}
        </span>
      </span>
    </a>
  );
}
