import type { BilingualField } from '../types/paper';

export interface SourceConfig {
  /** Unique key matching paper.source / PaperSource.key */
  key: string;
  /** Display name */
  label: BilingualField;
  /** Emoji icon (can be replaced with SVG later) */
  icon: string;
  /** Badge color (hex or Tailwind) */
  color: string;
  /** Base URL for source pages */
  baseUrl: string;
  /** Whether this source supports automated crawling */
  crawlable: boolean;
  /** Display priority (lower = higher) */
  priority: number;
}

export const sourceRegistry: SourceConfig[] = [
  {
    key: 'arxiv',
    label: { zh: 'arXiv', en: 'arXiv' },
    icon: '📄',
    color: '#B31B1B',
    baseUrl: 'https://arxiv.org',
    crawlable: true,
    priority: 1,
  },
  {
    key: 'openreview',
    label: { zh: 'OpenReview', en: 'OpenReview' },
    icon: '🔍',
    color: '#8B5CF6',
    baseUrl: 'https://openreview.net',
    crawlable: true,
    priority: 2,
  },
  {
    key: 'semanticscholar',
    label: { zh: 'Semantic Scholar', en: 'Semantic Scholar' },
    icon: '🎓',
    color: '#1857B6',
    baseUrl: 'https://api.semanticscholar.org',
    crawlable: false,
    priority: 3,
  },
  {
    key: 'dblp',
    label: { zh: 'DBLP', en: 'DBLP' },
    icon: '📚',
    color: '#004D40',
    baseUrl: 'https://dblp.org',
    crawlable: true,
    priority: 4,
  },
  {
    key: 'twitter',
    label: { zh: 'X/Twitter', en: 'X/Twitter' },
    icon: '🐦',
    color: '#1DA1F2',
    baseUrl: 'https://x.com',
    crawlable: false,
    priority: 5,
  },
  {
    key: 'other',
    label: { zh: '其他', en: 'Other' },
    icon: '🔗',
    color: '#6B7280',
    baseUrl: '',
    crawlable: false,
    priority: 99,
  },
];

export type SourceKey = (typeof sourceRegistry)[number]['key'];
