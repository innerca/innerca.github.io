import fs from 'node:fs';
import path from 'node:path';
import type { Paper } from '../types/paper';

interface HeatScoreEntry {
  paper_id: string;
  heat_score: number;
  [key: string]: unknown;
}

interface HeatScoreData {
  papers: HeatScoreEntry[];
  [key: string]: unknown;
}

/**
 * Breakdown of the sub-signals that compose a paper's heat score.
 * Used to show "why this paper is hot" in compact rows.
 */
export interface HeatSignalBreakdown {
  heatScore: number;
  citeCount: number;
  sCite: number;
  sCode: number;
  sBuzz: number;
  sFresh: number;
  burstBonus: number;
}

/**
 * Load heat scores from paper_heat_scores.json into a Map<paper_id, score>.
 * Returns an empty Map if the file doesn't exist or is unparseable.
 */
export function loadHeatScores(): Map<string, number> {
  const heatMap = new Map<string, number>();
  const heatPath = path.resolve('src/data/paper_heat_scores.json');
  try {
    if (fs.existsSync(heatPath)) {
      const raw = JSON.parse(fs.readFileSync(heatPath, 'utf-8')) as HeatScoreData;
      for (const p of raw.papers ?? []) {
        if (p.heat_score != null) heatMap.set(p.paper_id, p.heat_score);
      }
    }
  } catch {
    // Silently fall back to empty map
  }
  return heatMap;
}

/**
 * Load full heat signal breakdowns from paper_heat_scores.json.
 * Returns a Map<paper_id, HeatSignalBreakdown>.
 */
export function loadHeatSignals(): Map<string, HeatSignalBreakdown> {
  const map = new Map<string, HeatSignalBreakdown>();
  const heatPath = path.resolve('src/data/paper_heat_scores.json');
  try {
    if (fs.existsSync(heatPath)) {
      const raw = JSON.parse(fs.readFileSync(heatPath, 'utf-8')) as HeatScoreData;
      for (const p of raw.papers ?? []) {
        map.set(p.paper_id, {
          heatScore: (p as any).heat_score ?? 0,
          citeCount: (p as any).cite_count ?? 0,
          sCite: (p as any).s_cite ?? 0,
          sCode: (p as any).s_code ?? 0,
          sBuzz: (p as any).s_buzz ?? 0,
          sFresh: (p as any).s_fresh ?? 0,
          burstBonus: (p as any).burst_bonus ?? 0,
        });
      }
    }
  } catch {
    // Silently fall back to empty map
  }
  return map;
}

/**
 * Score papers by heat and return the top N.
 * Falls back to `isTrending` flag when no heat scores are available.
 */
export function getTrendingPapers(papers: Paper[], topN = 5): Paper[] {
  const heatMap = loadHeatScores();
  if (heatMap.size > 0) {
    return papers
      .map((p) => ({ paper: p, score: heatMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
      .map(({ paper }) => paper);
  }
  return papers.filter((p) => p.isTrending);
}

/**
 * Score all papers by heat and return them sorted descending.
 * Falls back to `isTrending` flag when no heat scores are available.
 */
export function getHotPapers(papers: Paper[]): Paper[] {
  const heatMap = loadHeatScores();
  if (heatMap.size > 0) {
    return [...papers]
      .map((p) => ({ paper: p, score: heatMap.get(p.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(({ paper }) => paper);
  }
  return [...papers].filter((p) => p.isTrending);
}
