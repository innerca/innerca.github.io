import type { Lang } from '../types/paper';

export const navText: Record<Lang, Record<string, string>> = {
  zh: {
    home: '首页',
    search: '搜索',
    footer: 'AI 学术前沿雷达 · 开放知识中枢',
    statsPapers: '论文总数',
    statsNew: '本周新增',
    loadMore: '加载更多',
    trending: '趋势论文',
    latest: '最新收录',
    backToHome: '返回首页',
    noResults: '未找到相关论文',
    searchPlaceholder: '搜索论文...',
    viewOnArxiv: '查看原文',
    citeCount: '引用',
    source: '来源',
    heroTitle: 'AI 学术前沿雷达',
    heroSubtitle: '每日追踪 · AI 驱动翻译 · 开放知识中枢',
    detailCorePoints: '核心要点',
    detailAbstract: '摘要',
  },
  en: {
    home: 'Home',
    search: 'Search',
    footer: 'AI Paper Radar · Open Knowledge Hub',
    statsPapers: 'Total Papers',
    statsNew: 'New This Week',
    loadMore: 'Load More',
    trending: 'Trending Papers',
    latest: 'Latest Papers',
    backToHome: 'Back to Home',
    noResults: 'No papers found',
    searchPlaceholder: 'Search papers...',
    viewOnArxiv: 'View on arXiv',
    citeCount: 'Citations',
    source: 'Source',
    heroTitle: 'AI Paper Radar',
    heroSubtitle: 'Daily Tracking · AI Translation · Open Knowledge Hub',
    detailCorePoints: 'Key Points',
    detailAbstract: 'Abstract',
  },
};

export function t(key: string, lang: Lang): string {
  return navText[lang][key] || key;
}

export function oppositeLang(lang: Lang): Lang {
  return lang === 'zh' ? 'en' : 'zh';
}
