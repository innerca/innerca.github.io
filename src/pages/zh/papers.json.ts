import type { APIRoute } from 'astro';
import papers from '../../data/papers.json';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(papers, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
