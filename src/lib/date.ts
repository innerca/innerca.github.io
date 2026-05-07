import type { Lang } from '../types/paper';

/** Format ISO date string to locale-friendly format */
export function formatDate(dateStr: string, lang: Lang): string {
  return dateStr;
}

/** Get relative time string ("3 days ago" / "3 天前") */
export function relativeDate(dateStr: string, lang: Lang): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return lang === 'zh' ? '即将发布' : 'Upcoming';
  if (diffDays === 0) return lang === 'zh' ? '今天' : 'Today';
  if (diffDays === 1) return lang === 'zh' ? '昨天' : 'Yesterday';

  if (lang === 'zh') {
    if (diffDays < 7) return `${diffDays} 天前`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`;
    return `${Math.floor(diffDays / 365)} 年前`;
  }

  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

/** Format date with relative time tooltip style */
export function formatDateWithRelative(dateStr: string, lang: Lang): string {
  return `${formatDate(dateStr, lang)} (${relativeDate(dateStr, lang)})`;
}

/** Check if a date is within N days from now */
export function isNew(dateStr: string, days = 7): boolean {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}
