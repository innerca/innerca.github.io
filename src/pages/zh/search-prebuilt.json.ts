import papers from '../../data/papers.json';
import type { Paper } from '../../types/paper';

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

export async function GET() {
  const typed = papers as Paper[];
  const idx: Record<string, number[]> = {};

  for (let i = 0; i < typed.length; i++) {
    const p = typed[i];
    const texts = [
      p.title.zh,
      p.summary.zh,
      p.core_points?.zh,
      (p.tags || []).join(' '),
      (p.authors || []).map((a) => a.name).join(' '),
      (p.categories || []).join(' '),
    ];

    const terms = new Set<string>();
    for (const text of texts) {
      for (const t of tokenize(text)) terms.add(t);
    }

    for (const term of terms) {
      (idx[term] ??= []).push(i);
    }
  }

  return new Response(JSON.stringify(idx), {
    headers: { 'Content-Type': 'application/json' },
  });
}
