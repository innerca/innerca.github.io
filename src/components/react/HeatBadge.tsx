interface Props {
  score: number;
  size?: 'sm' | 'md';
}

function heatColor(score: number): string {
  if (score >= 60) return '#ff6b6b';
  if (score >= 30) return '#ffd93d';
  return '#4a5568';
}

function heatLabel(score: number): string {
  if (score >= 80) return '🔥';
  if (score >= 60) return 'Hot';
  if (score >= 30) return 'Warm';
  return '';
}

export default function HeatBadge({ score, size = 'sm' }: Props) {
  const color = heatColor(score);
  const label = heatLabel(score);
  const barWidth = Math.min(100, Math.round((score / 115) * 100));

  if (size === 'sm') {
    return (
      <span
        className="inline-block h-1 rounded-full"
        style={{
          width: `${barWidth}px`,
          backgroundColor: color,
          boxShadow: score >= 60 ? `0 0 4px ${color}` : 'none',
        }}
        title={`Heat: ${score.toFixed(1)}`}
      />
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5" title={`Heat: ${score.toFixed(1)}`}>
      <span
        className="h-1.5 rounded-full"
        style={{
          width: `${barWidth}px`,
          backgroundColor: color,
          boxShadow: score >= 60 ? `0 0 4px ${color}` : 'none',
        }}
      />
      {label && (
        <span className="text-[10px] font-mono" style={{ color }}>
          {label}
        </span>
      )}
    </span>
  );
}
