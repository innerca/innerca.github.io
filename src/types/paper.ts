export interface Paper {
  // === Base (filled by scraper) ===
  id: string;
  /** Primary source key (backward-compatible, e.g. "arxiv") */
  source: string;
  /** Primary source URL */
  url: string;
  title: BilingualField;
  summary: BilingualField;
  core_points: BilingualField;
  date: string;

  // === Enrichment (from API / LLM) ===
  authors?: Author[];
  updatedDate?: string | null;
  addedDate?: string;
  categories?: string[];
  sourceId?: string;
  citeCount: number;
  isTrending: boolean;

  // === Multi-source (for papers tracked across multiple venues) ===
  /** All known sources for this paper */
  sources?: PaperSource[];

  // === Curation (filled by LLM) ===
  tags: string[];
  entities: { name: string; type: string }[];
  domains?: string[];
  relatedPapers?: RelatedPaper[];
  status?: PaperStatus;
  curation?: CurationEntry[];

  // === Crawl history (filled by scraper) ===
  /** History of crawl attempts per source */
  crawlHistory?: CrawlEntry[];
}

// ===================== Supporting Types =====================

export type Lang = 'zh' | 'en';

export interface BilingualField {
  zh: string;
  en: string;
}

export interface Author {
  name: string;
  affiliation?: string;
}

export type EntityType = 'model' | 'dataset' | 'method' | 'task' | 'benchmark' | 'framework' | 'tool';

export type RelationType =
  | 'cites'
  | 'extends'
  | 'compares'
  | 'related'
  | 'contradicts'
  | 'benchmarked_on'
  | 'uses';

export type PaperStatus = 'discovered' | 'analyzed' | 'curated';

export type Curator = 'scraper' | 'llm' | 'human';

export interface RelatedPaper {
  id: string;
  type: RelationType;
  description?: BilingualField;
  confidence?: number;
}

export interface CurationEntry {
  field: string;
  generatedBy: Curator;
  model?: string;
  confidence?: number;
  timestamp: string;
  requiresReview?: boolean;
}

// ===================== Multi-Source Types =====================

export interface PaperSource {
  /** Source key matching sourceRegistry (e.g. "arxiv", "openreview") */
  key: string;
  /** ID within that source */
  sourceId: string;
  /** URL to the source page */
  url: string;
  /** Citation count from this source */
  citeCount?: number;
  /** When this source was last crawled */
  lastCrawled?: string;
  /** Status of the last crawl attempt */
  crawlStatus?: CrawlStatus;
}

export type CrawlStatus = 'pending' | 'success' | 'failed' | 'unchanged';

export interface CrawlEntry {
  /** Source key (e.g. "arxiv") */
  source: string;
  /** When the crawl ran */
  timestamp: string;
  /** Outcome */
  status: 'success' | 'failed' | 'skipped';
  /** Error message on failure */
  error?: string;
  /** How many new papers were found */
  papersFound: number;
}
