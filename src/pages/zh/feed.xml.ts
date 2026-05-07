import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import papers from '../../data/papers.json';
import type { Paper } from '../../types/paper';

export const GET: APIRoute = async (context) => {
  const allPapers = papers as Paper[];
  const site = context.site?.toString() ?? 'https://innerca.github.io';

  return rss({
    title: 'AI 学术前沿雷达',
    description: '每日追踪 AI 领域最新学术论文 · 开放知识中枢',
    site,
    items: allPapers.map((p) => ({
      title: p.title.zh || p.title.en,
      description: p.summary.zh || p.summary.en,
      pubDate: new Date(p.date),
      link: `${site}/zh/paper/${p.id}/`,
    })),
    customData: `<language>zh-cn</language>`,
  });
};
