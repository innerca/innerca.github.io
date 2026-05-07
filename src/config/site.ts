export const siteConfig = {
  name: 'PAPER_RADAR',
  description: {
    zh: 'AI 学术前沿雷达',
    en: 'AI Paper Radar',
  },
  tagline: {
    zh: '每日追踪 · AI 驱动翻译 · 开放知识中枢',
    en: 'Daily Tracking · AI Translation · Open Knowledge Hub',
  },
  url: 'https://github.com/innerca',
  social: {
    github: 'https://github.com/innerca',
  },
  nav: {
    zh: [
      { label: '首页', href: '/zh' },
      { label: '搜索', href: '/zh/search' },
    ],
    en: [
      { label: 'Home', href: '/en' },
      { label: 'Search', href: '/en/search' },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
