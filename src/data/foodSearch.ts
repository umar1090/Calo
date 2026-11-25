import type { Food, FoodCategory } from './foods';

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Edit distance ≤ 1 check (insert, delete or substitute one letter). */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function scoreText(text: string, query: string, tokens: string[]): number {
  if (!text) return 0;
  if (text === query) return 100;
  if (text.startsWith(query)) return 80;
  const words = text.split(' ');
  let score = 0;
  for (const t of tokens) {
    let best = 0;
    words.forEach((w, i) => {
      const lead = i === 0 ? 4 : 0; // matches on the first word rank higher ("paneer" before "matar paneer")
      if (w === t) best = Math.max(best, 30 + lead);
      else if (w.startsWith(t)) best = Math.max(best, 22 + lead);
      else if (t.length >= 4 && withinOneEdit(w, t)) best = Math.max(best, 14 + lead);
      else if (t.length >= 3 && w.includes(t)) best = Math.max(best, 10 + lead);
    });
    if (best === 0) return 0; // every token must match something
    score += best;
  }
  return score;
}

export function searchFoods(foods: Food[], rawQuery: string, opts: { category?: FoodCategory | 'all'; limit?: number } = {}): Food[] {
  const query = normalize(rawQuery);
  const pool = opts.category && opts.category !== 'all' ? foods.filter((f) => f.category === opts.category) : foods;
  if (!query) return pool.slice(0, opts.limit ?? pool.length);
  const tokens = query.split(' ').filter(Boolean);
  const scored: { food: Food; score: number }[] = [];
  for (const food of pool) {
    let best = scoreText(normalize(food.name), query, tokens) * 1.2;
    for (const alias of food.aliases) best = Math.max(best, scoreText(normalize(alias), query, tokens));
    if (best > 0) scored.push({ food, score: best + (food.custom ? 5 : 0) });
  }
  scored.sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name));
  return scored.slice(0, opts.limit ?? 50).map((s) => s.food);
}

const GENERIC_PARTS = new Set([
  'home style', 'whole wheat', 'plain', 'boiled', 'with ghee', 'toned', 'full cream', 'prepared', 'raw', 'unsweetened',
  'vanilla', 'tawa', 'with sugar', 'no sugar', 'milk sugar', 'with pav', '2 eggs', 'tadka', 'spinach', 'potato', 'okra',
  'sapota', 'kishmish', 'khajur', 'alsi', 'gur', 'sabzi', 'masala', 'curry', 'milk', 'tea', 'fish', 'chicken', 'egg',
]);

function mentionCandidates(food: Food): string[] {
  const out = new Set<string>();
  for (const raw of [food.name, ...food.aliases]) {
    out.add(normalize(raw));
    for (const part of raw.split(/[/(),]/)) {
      const n = normalize(part);
      if (n.length >= 3 && !GENERIC_PARTS.has(n)) out.add(n);
    }
  }
  return [...out].filter((n) => n.length >= 3);
}

/** Find foods mentioned anywhere inside free text (used by the assistant). Longest match first. */
export function findFoodMentions(foods: Food[], text: string): Food[] {
  const t = ` ${normalize(text)} `;
  const hits: { food: Food; len: number }[] = [];
  for (const food of foods) {
    let len = 0;
    for (const candidate of mentionCandidates(food)) {
      if (t.includes(` ${candidate} `) || t.includes(` ${candidate}s `)) len = Math.max(len, candidate.length);
    }
    if (len > 0) hits.push({ food, len });
  }
  hits.sort((a, b) => b.len - a.len);
  return hits.map((h) => h.food);
}
