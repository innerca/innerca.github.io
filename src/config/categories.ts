import type { BilingualField } from '../types/paper';

export interface CategoryGroupDef {
  key: string;
  label: BilingualField;
  codes: string[];
  prefixes: string[];
  order: number;
}

export const categoryGroups: CategoryGroupDef[] = [
  {
    key: 'ml-ai',
    label: { zh: '机器学习与 AI', en: 'Machine Learning & AI' },
    codes: ['cs.AI', 'cs.LG', 'cs.NE', 'cs.DL'],
    prefixes: [],
    order: 1,
  },
  {
    key: 'nlp',
    label: { zh: 'NLP 与语音', en: 'NLP & Speech' },
    codes: ['cs.CL', 'eess.AS'],
    prefixes: [],
    order: 2,
  },
  {
    key: 'cv',
    label: { zh: '计算机视觉', en: 'Computer Vision' },
    codes: ['cs.CV', 'eess.IV'],
    prefixes: [],
    order: 3,
  },
  {
    key: 'systems',
    label: { zh: '系统与安全', en: 'Systems & Security' },
    codes: [
      'cs.DB', 'cs.SE', 'cs.CR', 'cs.DC', 'cs.NI', 'cs.OS', 'cs.AR',
      'cs.PL', 'cs.PF', 'cs.CE', 'cs.ET', 'cs.CY', 'cs.SI', 'cs.SD',
    ],
    prefixes: [],
    order: 4,
  },
  {
    key: 'ir-hci',
    label: { zh: '信息检索与人机交互', en: 'IR, HCI & Visualization' },
    codes: ['cs.IR', 'cs.HC', 'cs.GR', 'cs.MM'],
    prefixes: [],
    order: 5,
  },
  {
    key: 'theory',
    label: { zh: '理论与形式化方法', en: 'Theory & Formal Methods' },
    codes: ['cs.CC', 'cs.CG', 'cs.DM', 'cs.DS', 'cs.LO', 'cs.FL', 'cs.IT', 'cs.MA', 'cs.MS', 'cs.GT'],
    prefixes: [],
    order: 6,
  },
  {
    key: 'robotics',
    label: { zh: '机器人与控制', en: 'Robotics & Control' },
    codes: ['cs.RO', 'eess.SY'],
    prefixes: [],
    order: 7,
  },
  {
    key: 'math-stats',
    label: { zh: '数学与统计', en: 'Math & Statistics' },
    codes: [],
    prefixes: ['math.', 'stat.'],
    order: 8,
  },
  {
    key: 'sciences',
    label: { zh: '自然科学', en: 'Sciences' },
    codes: ['gr-qc', 'quant-ph'],
    prefixes: [
      'astro-ph.', 'cond-mat.', 'hep-', 'physics.', 'nlin.',
      'q-bio.', 'eess.SP',
    ],
    order: 9,
  },
  {
    key: 'econ-fin',
    label: { zh: '经济与金融', en: 'Economics & Finance' },
    codes: [],
    prefixes: ['econ.', 'q-fin.'],
    order: 10,
  },
  {
    key: 'other',
    label: { zh: '其他', en: 'Other' },
    codes: ['cs.GL', 'cs.OH'],
    prefixes: [],
    order: 99,
  },
];

const groupMap = new Map<string, CategoryGroupDef>();
const exactLookup = new Map<string, string>();
const prefixRules: { prefix: string; groupKey: string }[] = [];

for (const g of categoryGroups) {
  groupMap.set(g.key, g);
  for (const code of g.codes) {
    exactLookup.set(code, g.key);
  }
  for (const prefix of g.prefixes) {
    prefixRules.push({ prefix, groupKey: g.key });
  }
}

/** Given a raw arXiv category code, return the group key */
export function getCategoryGroup(code: string): string {
  // Exact match first
  const exact = exactLookup.get(code);
  if (exact) return exact;

  // Prefix match
  for (const { prefix, groupKey } of prefixRules) {
    if (code.startsWith(prefix)) return groupKey;
  }

  return 'other';
}

/** Given a group key, return its bilingual label */
export function getGroupLabel(key: string): BilingualField | undefined {
  return groupMap.get(key)?.label;
}

/** Return all defined groups sorted by order */
export function getAllGroups(): CategoryGroupDef[] {
  return [...categoryGroups];
}

interface GroupFrequency {
  key: string;
  label: BilingualField;
  count: number;
}

/**
 * Given an array of per-paper category arrays, compute which groups
 * they map to, sorted by frequency descending.
 */
export function computeGroupFrequency(rawCodesPerPaper: string[][]): GroupFrequency[] {
  const counts = new Map<string, number>();
  for (const codes of rawCodesPerPaper) {
    const seen = new Set<string>();
    for (const code of codes) {
      const gk = getCategoryGroup(code);
      if (!seen.has(gk)) {
        seen.add(gk);
        counts.set(gk, (counts.get(gk) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => ({
      key,
      label: groupMap.get(key)?.label ?? { zh: key, en: key },
      count,
    }))
    .sort((a, b) => {
      const oa = groupMap.get(a.key)?.order ?? 99;
      const ob = groupMap.get(b.key)?.order ?? 99;
      return oa - ob;
    });
}
