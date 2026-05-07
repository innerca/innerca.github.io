import fs from 'node:fs';
import path from 'node:path';

interface SiteStats {
  totalPapers: number;
  generatedAt: string;
  latestPaperDate: string;
}

let cached: SiteStats | null = null;

function loadStatsSafe(): SiteStats | null {
  const statsPath = path.resolve('src/data/stats.json');
  try {
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf-8')) as SiteStats;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Read pre-computed site stats from stats.json cache.
 * Falls back to null if unavailable (e.g. during first build).
 */
export function getSiteStats(): SiteStats | null {
  if (!cached) cached = loadStatsSafe();
  return cached;
}

/**
 * Read total papers count from cache.
 * Returns null when cache is unavailable.
 */
export function getTotalPapers(): number | null {
  return getSiteStats()?.totalPapers ?? null;
}
