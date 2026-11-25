/** Local-date helpers. Dates are stored as YYYY-MM-DD in the user's local time zone. */

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0); // midday avoids DST edge cases
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISODate(a).getTime() - parseISODate(b).getTime()) / 86_400_000);
}

/** Monday-based week start. */
export function startOfWeek(iso: string): string {
  const d = parseISODate(iso);
  const dow = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(iso, -dow);
}

export function dayOfWeek(iso: string): number {
  return (parseISODate(iso).getDay() + 6) % 7;
}

export function lastNDays(endIso: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(endIso, i - (n - 1)));
}

export function dayOfYear(iso: string): number {
  const d = parseISODate(iso);
  const start = new Date(d.getFullYear(), 0, 1, 12);
  return Math.round((d.getTime() - start.getTime()) / 86_400_000);
}

/**
 * Roughly how much of a typical Indian eating day has passed, used so that
 * "low so far" messages are fair at 10 am. Past days count as complete.
 */
export function dayPace(date: string, now: Date): number {
  const today = toISODate(now);
  if (date < today) return 1;
  if (date > today) return 0;
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 10) return 0.15;
  if (h < 13) return 0.3;
  if (h < 16) return 0.55;
  if (h < 19) return 0.65;
  if (h < 21) return 0.8;
  return 1;
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const weekdayShort = (iso: string) => WEEKDAY_SHORT[dayOfWeek(iso)];

export function formatLongDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
