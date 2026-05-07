export interface Paper {
  id: string;
  title: { zh: string; en: string };
  summary: { zh: string; en: string };
  core_points: { zh: string; en: string };
  tags: string[];
  entities: { name: string; type: string }[];
  date: string;
  citeCount: number;
  isTrending: boolean;
  source: string;
  url: string;
}

export type Lang = 'zh' | 'en';
