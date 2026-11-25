import { describe, expect, it } from 'vitest';
import { activityInsights, calcActivity, loggedActivityKcal, weeklyActivity } from '@/engine/activity/engine';
import { ACTIVITIES, metForSpeed, stepsToKm } from '@/engine/activity/catalog';
import { getSafetyRules } from '@/engine/safety/policy';
import { findUnsafePhrases } from '@/engine/safety/language';
import { addDays } from '@/engine/dates';
import { computeTargets, dayTargets } from '@/engine/nutrition/targets';
import type { ExerciseLog } from '@/engine/types';
import { adult, child, exercise, teen } from './fixtures';

const D = '2026-11-25'; // a Wednesday
const adult70 = { ...adult, weightKg: 70, heightCm: 170 };

describe('calculations from logged activity', () => {
  it('estimates energy with MET × weight × time for adults', () => {
    // walking, moderate: 3.5 MET × 70 kg × 1 h = 245 kcal
    expect(calcActivity({ activity: 'walking', minutes: 60, intensity: 'moderate' }, adult70).kcal).toBe(245);
    // football, vigorous: 9 MET × 70 × 0.5 = 315
    expect(loggedActivityKcal(adult70, { activity: 'football', intensity: 'vigorous', minutes: 30 })).toBe(315);
  });

  it('uses pace from distance to pick MET and intensity', () => {
    // 5 km in 30 min = 10 km/h running → 9.8 MET (Compendium) → vigorous
    const run = calcActivity({ activity: 'running', minutes: 30, intensity: 'light', distanceKm: 5 }, adult70);
    expect(run.paceKmh).toBe(10);
    expect(run.paceMinPerKm).toBe(6);
    expect(run.met).toBe(9.8);
    expect(run.intensity).toBe('vigorous');
    expect(run.kcal).toBe(345); // 9.8 × 70 × 0.5 = 343 → nearest 5
    // 3 km in 60 min walking = 3 km/h → 2 MET → light
    expect(calcActivity({ activity: 'walking', minutes: 60, intensity: 'vigorous', distanceKm: 3 }, adult70).intensity).toBe('light');
    expect(metForSpeed('cycling', 20)).toBe(8);
    expect(metForSpeed('gym', 10)).toBeUndefined();
  });

  it('converts walking steps to distance from height', () => {
    expect(stepsToKm(10000, 170)).toBeCloseTo(7.06, 2);
    const walk = calcActivity({ activity: 'walking', minutes: 60, intensity: 'moderate', steps: 7000 }, adult70);
    expect(walk.distanceKm).toBeCloseTo(4.94, 2);
    expect(walk.paceKmh).toBe(4.9);
    expect(walk.met).toBe(3.5);
  });

  it('never calculates energy burned for under-18s', () => {
    for (const p of [teen, child]) {
      for (const activity of Object.keys(ACTIVITIES) as ExerciseLog['activity'][]) {
        expect(calcActivity({ activity, minutes: 60, intensity: 'vigorous', distanceKm: 8 }, p).kcal).toBeUndefined();
      }
      expect(weeklyActivity([exercise(D, 60, 'vigorous', 'football')], D, getSafetyRules(p.age), p).kcal).toBeUndefined();
    }
  });

  it('feeds logged activity into the day’s food and water estimates', () => {
    const t = computeTargets(adult70);
    const day = dayTargets(t, adult70, [exercise(D, 90, 'vigorous', 'running')]);
    expect(day.energyTarget).toBeGreaterThan(t.energyTarget);
    expect(day.waterMl).toBeGreaterThan(t.waterMl);
  });
});

describe('weekly activity tracking', () => {
  it('counts vigorous minutes double for adults but not for teens', () => {
    const logs = [exercise('2026-11-23', 30, 'vigorous', 'running'), exercise('2026-11-24', 30, 'moderate')];
    expect(weeklyActivity(logs, D, getSafetyRules(30), adult70).guidelineMinutes).toBe(90);
    expect(weeklyActivity(logs, D, getSafetyRules(15), teen).guidelineMinutes).toBe(60);
    expect(weeklyActivity(logs, D, getSafetyRules(15)).guidelineTarget).toBe(420);
    expect(weeklyActivity(logs, D, getSafetyRules(30)).guidelineTarget).toBe(150);
  });

  it('does not count light activity toward the guideline', () => {
    const logs = [exercise('2026-11-23', 60, 'light', 'household'), exercise('2026-11-23', 30, 'light', 'stretching')];
    const w = weeklyActivity(logs, D, getSafetyRules(30), adult70);
    expect(w.totalMinutes).toBe(90);
    expect(w.guidelineMinutes).toBe(0);
  });

  it('tracks strength days, totals by activity and Monday-based weeks', () => {
    const logs = [exercise('2026-11-23', 30, 'moderate', 'bodyweight', true), exercise('2026-11-24', 20, 'moderate', 'bodyweight', true), exercise('2026-11-22', 40)];
    const w = weeklyActivity(logs, D, getSafetyRules(30), adult70);
    expect(w.weekStart).toBe('2026-11-23');
    expect(w.strengthDays).toBe(2);
    expect(w.totalMinutes).toBe(50); // Sunday 22nd belongs to the previous week
    expect(w.byActivity).toEqual([{ activity: 'bodyweight', minutes: 50, sessions: 2 }]);
    expect(w.kcal).toBeGreaterThan(0);
  });
});

describe('insights from logs', () => {
  it('reports progress and missing strength work as observations', () => {
    const ins = activityInsights({ logs: [exercise('2026-11-24', 40, 'moderate', 'walking')], date: D, profile: adult70 });
    expect(ins.map((i) => i.id)).toEqual(expect.arrayContaining(['guideline_progress', 'strength_none', 'longest']));
  });

  it('celebrates a met guideline and notes long streaks', () => {
    const logs = Array.from({ length: 7 }, (_, i) => exercise(addDays(D, -i), 40, 'vigorous', 'running'));
    const ids = activityInsights({ logs, date: D, profile: adult70 }).map((i) => i.id);
    expect(ids).toContain('guideline_met');
    expect(ids).toContain('streak');
  });

  it('notices a quiet spell without pressure', () => {
    const ins = activityInsights({ logs: [exercise(addDays(D, -6), 30)], date: D, profile: adult70 });
    expect(ins.find((i) => i.id === 'quiet')?.text).toMatch(/even a walk or housework/);
  });

  it('never uses unsafe language and never prescribes a workout', () => {
    for (const p of [teen, child, adult70]) {
      for (let n = 0; n < 10; n++) {
        const logs = Array.from({ length: n }, (_, i) => exercise(addDays(D, -i), 20 + i * 10, i % 2 ? 'vigorous' : 'moderate', i % 3 ? 'football' : 'walking'));
        for (const i of activityInsights({ logs, date: D, profile: p })) {
          const text = `${i.title} ${i.text}`;
          expect(findUnsafePhrases(text, getSafetyRules(p.age).ageGroup)).toEqual([]);
          expect(text).not.toMatch(/\b(you should do|do \d+ (sets|reps)|today's plan|workout plan)\b/i);
        }
      }
    }
  });
});
