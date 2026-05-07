export const siteConfig = {
  name: 'Paper Radar',
  description: {
    zh: 'AI 论文雷达',
    en: 'Paper Radar',
  },
  url: 'https://github.com/innerca',
  social: {
    github: 'https://github.com/innerca',
  },
  nav: {
    zh: [
      { label: '首页', href: '/zh' },
      { label: '最新', href: '/zh/latest' },
      { label: '搜索', href: '/zh/search' },
      { label: '值得关注', href: '/zh/hot' },
    ],
    en: [
      { label: 'Home', href: '/en' },
      { label: 'Latest', href: '/en/latest' },
      { label: 'Search', href: '/en/search' },
      { label: 'Rising Signals', href: '/en/hot' },
    ],
  },
} as const;

export type SiteConfig = typeof siteConfig;
