import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import papers from '../../data/papers.json';
import type { Paper } from '../../types/paper';

export const GET: APIRoute = async (context) => {
  const allPapers = papers as Paper[];
  const site = context.site?.toString() ?? 'https://innerca.github.io';

  return rss({
    title: 'AI Paper Radar',
    description: 'Daily AI/ML paper tracking · Open Knowledge Hub',
    site,
    items: allPapers.map((p) => ({
      title: p.title.en,
      description: p.summary.en,
      pubDate: new Date(p.date),
      link: `${site}/en/paper/${p.id}/`,
    })),
    customData: `<language>en</language>`,
  });
};
