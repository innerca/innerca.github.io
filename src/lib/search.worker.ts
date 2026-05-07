/// <reference lib="webworker" />

let invertedIndex: Record<string, number[]> | null = null;

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by',
  'from','is','are','was','were','be','been','has','have','had','do','does',
  'did','will','would','could','should','may','might','can','shall','this',
  'that','these','those','it','its','we','they','he','she','not','no','nor',
  'as','if','than','so','such','just','about','into','over','after','before',
  'between','under','above','more','most','some','any','each','every','all',
  'both','few','many','much','own','same','other','another','very','too',
]);

function tokenize(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const tokens = new Set<string>();
  const parts = lower.split(/[^a-z0-9一-鿿㐀-䶿︰-ﾠ]+/).filter(Boolean);

  for (const part of parts) {
    if (/[一-鿿㐀-䶿︰-ﾠ]/.test(part)) {
      for (let i = 0; i < part.length; i++) {
        tokens.add(part[i]);
        if (i < part.length - 1) tokens.add(part[i] + part[i + 1]);
      }
      tokens.add(part);
    } else if (part.length >= 2 && !STOP_WORDS.has(part)) {
      tokens.add(part);
    }
  }
  return [...tokens];
}

self.onmessage = (e: MessageEvent) => {
  const { type, data, query, max = 50 } = e.data;

  if (type === 'load') {
    invertedIndex = data;
    self.postMessage({ type: 'loaded' });
    return;
  }

  if (type === 'search') {
    if (!invertedIndex || !query?.trim()) {
      self.postMessage({ type: 'results', indices: [], query });
      return;
    }

    const terms = tokenize(query);
    if (terms.length === 0) {
      self.postMessage({ type: 'results', indices: [], query });
      return;
    }

    const scores = new Map<number, number>();

    for (const term of terms) {
      const matches = invertedIndex[term];
      if (!matches) continue;
      for (const idx of matches) {
        scores.set(idx, (scores.get(idx) || 0) + 1);
      }
    }

    const sorted = [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, max)
      .map(([idx]) => idx);

    self.postMessage({ type: 'results', indices: sorted, query });
  }
};
