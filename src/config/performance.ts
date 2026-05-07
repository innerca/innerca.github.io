export const performance = {
  particleCount: 60,
  particleCountMobile: 30,
  connectDist: 100,
  fpsThreshold: 16.6,
  canvasScale: 0.5,
} as const;

export type Performance = typeof performance;

export const trending = {
  windowDays: 30,
  topN: 5,
  minCiteCount: 0,
  enabled: true,
} as const;

export type Trending = typeof trending;

/**
 * Data tier thresholds (in days).
 *
 * Hot:   papers.json — loaded on every page, indexed for search, detail pages generated
 * Warm:  papers.warm.json — detail pages exist, but not in search index
 * Cold:  papers-archive/YYYY/ — no detail pages, accessible via archive browser
 *
 * When papers.age >= warmDays, they're moved to warm on the next fetch run.
 * When papers.age >= coldDays, they're moved to cold archive.
 */
export const dataTiers = {
  hotDays: 90,
  warmDays: 365,
  coldDays: Infinity, // never auto-delete, just archive
} as const;

export type DataTiers = typeof dataTiers;
