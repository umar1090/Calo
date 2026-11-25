import type { AgeGroup } from '../types';

/**
 * Language guard-rails for every message the app generates (feedback,
 * recommendations, activity advice, assistant replies, LLM output).
 *
 * The engines are written to never produce these phrases. Tests run thousands
 * of generated messages through `findUnsafePhrases` to prove it, and the
 * assistant uses it to reject any LLM reply that slips through.
 */

/** Never acceptable for anyone. */
export const BANNED_FOR_ALL: RegExp[] = [
  /\bfail(ed|ure|ing)?\b/i,
  /\bburn(ing)?\s+(it|this|that|those|them|these|the\s+\w+)?\s*(off|away)\b/i,
  /\bburn\s+off\b/i,
  /\bwork\s+(it|this|that|them)\s+off\b/i,
  /\bskip(ping)?\s+(a\s+|your\s+|the\s+|next\s+)?(meal|meals|breakfast|lunch|dinner)\b/i,
  /\bstarv(e|ing|ation)\b/i,
  /\bcompensat(e|ing|ion|ory)\b/i,
  /\b(ate|eaten|eating)\s+too\s+much\b/i,
  /\btoo\s+much\s+food\b/i,
  /\bover\s?ate\b/i,
  /\bcheat\s+(meal|day)s?\b/i,
  /\bguilt(y)?\b/i,
  /\bpunish/i,
  /\bbad\s+foods?\b/i,
  /\bjunk\b/i,
  /\bearn\s+(your|the|a)\s+(meal|food|treat|dinner|snack)\b/i,
  /\bmake\s+up\s+for\s+(eating|what\s+you\s+ate)\b/i,
  /\bpurge\b/i,
];

/** Additional phrases that must never be shown to under-18s. */
export const BANNED_FOR_MINORS: RegExp[] = [
  /\bdeficit\b/i,
  /\bcalories?\s+(left|remaining)\b/i,
  /\bremaining\s+calories\b/i,
  /\bcut(ting)?\s+(back|down)\b/i,
  /\beat\s+less\b/i,
  /\blose\s+weight\b/i,
  /\bweight[-\s]loss\b/i,
  /\bexcessive\b/i,
  /\bover\s+(your\s+)?(limit|target|goal)\b/i,
  /\bcalorie\s+(goal|limit|budget)\b/i,
  /\bburn\s+\d+\s*(k?cal|calories)\b/i,
];

export function findUnsafePhrases(text: string, ageGroup: AgeGroup): string[] {
  const patterns = ageGroup === 'child' || ageGroup === 'teen' ? [...BANNED_FOR_ALL, ...BANNED_FOR_MINORS] : BANNED_FOR_ALL;
  const hits: string[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) hits.push(m[0]);
  }
  return hits;
}

export function isSafeCopy(text: string, ageGroup: AgeGroup): boolean {
  return findUnsafePhrases(text, ageGroup).length === 0;
}
