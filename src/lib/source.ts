import type { Paper, PaperSource } from '../types/paper';
import { sourceRegistry, type SourceConfig } from '../config/sources';

/** Get the full source config for a given key (case-insensitive) */
export function getSourceConfig(key: string): SourceConfig | undefined {
  const k = key.toLowerCase();
  return sourceRegistry.find((s) => s.key === k);
}

/** Get the primary source config for a paper (from paper.source) */
export function getPrimarySource(paper: Paper): SourceConfig {
  return getSourceConfig(paper.source) ?? getSourceConfig('other')!;
}

/** Get all known source configs for a paper (primary + multi-source) */
export function getPaperSources(paper: Paper): { config: SourceConfig; data: PaperSource }[] {
  const sources: { config: SourceConfig; data: PaperSource }[] = [];

  if (paper.sources) {
    for (const ps of paper.sources) {
      const config = getSourceConfig(ps.key);
      if (config) {
        sources.push({ config, data: ps });
      }
    }
  }

  // Ensure primary source is included if not already in multi-source list
  const hasPrimary = sources.some((s) => s.config.key === paper.source);
  if (!hasPrimary) {
    const config = getPrimarySource(paper);
    sources.unshift({
      config,
      data: {
        key: config.key,
        sourceId: paper.id,
        url: paper.url,
      },
    });
  }

  return sources;
}

/** Get the best external URL for a paper */
export function getExternalUrl(paper: Paper, sourceKey?: string): string {
  if (sourceKey && paper.sources) {
    const s = paper.sources.find((ps) => ps.key === sourceKey);
    if (s?.url) return s.url;
  }
  return paper.url;
}
