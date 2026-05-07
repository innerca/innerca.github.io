#!/usr/bin/env node

/**
 * Data Tier Management
 *
 * Splits papers into hot/warm/cold tiers by age and manages archive files.
 *
 * Hot  (≤ hotDays)   → papers.json        — loaded on every page, indexed for search
 * Warm (≤ warmDays)  → papers.warm.json    — detail pages exist, not in search index
 * Cold (> warmDays)  → papers-archive/     — no detail pages, accessible via archive browser
 *
 * During daily fetch, only hot + warm are loaded for dedup.
 * Cold papers are "sealed" — new matches become new entries.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../src/data');
const HOT_FILE = path.resolve(DATA_DIR, 'papers.json');
const WARM_FILE = path.resolve(DATA_DIR, 'papers.warm.json');
const ARCHIVE_DIR = path.resolve(DATA_DIR, 'papers-archive');

// ─── Tier splitting ──────────────────────────────────────────────

/**
 * Split papers into hot/warm/cold tiers based on paper.date.
 *
 * @param {object[]} papers
 * @param {object} [opts]
 * @param {number} [opts.hotDays=90]
 * @param {number} [opts.warmDays=365]
 * @returns {{ hot: object[], warm: object[], cold: object[] }}
 */
export function splitByTier(papers, { hotDays = 90, warmDays = 365 } = {}) {
  const now = Date.now();
  const day = 86_400_000;
  const hotCutoff = new Date(now - hotDays * day).toISOString().split('T')[0];
  const warmCutoff = new Date(now - warmDays * day).toISOString().split('T')[0];

  const hot = [];
  const warm = [];
  const cold = [];

  for (const p of papers) {
    const d = p.date || '0000';
    if (d >= hotCutoff) hot.push(p);
    else if (d >= warmCutoff) warm.push(p);
    else cold.push(p);
  }

  return { hot, warm, cold };
}

// ─── Warm tier I/O ────────────────────────────────────────────────

/**
 * Read warm papers from archive file.
 * @returns {Promise<object[]>}
 */
export async function loadWarm() {
  if (!existsSync(WARM_FILE)) return [];
  try {
    return JSON.parse(await readFile(WARM_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Write warm papers to archive file.
 * @param {object[]} papers
 */
export async function writeWarm(papers) {
  if (papers.length === 0) {
    // Remove file if empty to avoid stale data
    try {
      const { rm } = await import('node:fs/promises');
      if (existsSync(WARM_FILE)) await rm(WARM_FILE);
    } catch { /* ignore */ }
    return;
  }
  await writeFile(WARM_FILE, JSON.stringify(papers, null, 2) + '\n');
  console.log(`  Wrote ${papers.length} warm papers → papers.warm.json`);
}

// ─── Cold tier I/O ────────────────────────────────────────────────

/**
 * Group papers by year-month for archive storage.
 */
function groupByYearMonth(papers) {
  const groups = new Map();
  for (const p of papers) {
    const ym = (p.date || '0000').slice(0, 7); // "2026-01"
    if (!groups.has(ym)) groups.set(ym, []);
    groups.get(ym).push(p);
  }
  return groups;
}

/**
 * Write cold papers to year-month archive files.
 * @param {object[]} papers
 */
export async function writeCold(papers) {
  if (papers.length === 0) return;

  const groups = groupByYearMonth(papers);

  for (const [ym, group] of groups) {
    const [year, month] = ym.split('-');
    const dir = path.resolve(ARCHIVE_DIR, year);
    await mkdir(dir, { recursive: true });
    const filePath = path.resolve(dir, `${month}.json`);
    await writeFile(filePath, JSON.stringify(group, null, 2) + '\n');
    console.log(`  Archived ${group.length} papers → papers-archive/${year}/${month}.json`);
  }
}

/**
 * Read all cold papers from archive (expensive — use sparingly).
 * @returns {Promise<object[]>}
 */
export async function loadAllCold() {
  if (!existsSync(ARCHIVE_DIR)) return [];
  const all = [];

  async function walk(dir) {
    const entries = await import('node:fs/promises').then((fs) => fs.readdir(dir, { withFileTypes: true }));
    for (const entry of entries) {
      const fullPath = path.resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.name.endsWith('.json')) {
        try {
          const papers = JSON.parse(await readFile(fullPath, 'utf-8'));
          all.push(...papers);
        } catch { /* skip corrupt files */ }
      }
    }
  }

  await walk(ARCHIVE_DIR);
  return all;
}
