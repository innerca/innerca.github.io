import type { SourceConfig } from '../../config/sources';

interface Props {
  source: SourceConfig;
  size?: 'sm' | 'md';
}

export default function SourceBadge({ source, size = 'sm' }: Props) {
  const isSmall = size === 'sm';
  return (
    <span
      className="inline-flex items-center gap-1 font-mono font-medium"
      style={{ color: source.color }}
      title={source.label.en}
    >
      <span className={isSmall ? 'text-xs' : 'text-sm'}>{source.icon}</span>
      <span className={isSmall ? 'text-[11px]' : 'text-xs'}>
        {source.label.en}
      </span>
    </span>
  );
}
