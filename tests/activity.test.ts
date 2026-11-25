import { describe, expect, it } from 'vitest';
import { generateDailyPlan, loggedActivityKcal, restAdvice, weeklyActivity } from '@/engine/activity/engine';
import { parseLimitations } from '@/engine/activity/catalog';
import { getSafetyRules } from '@/engine/safety/policy';
import { findUnsafePhrases } from '@/engine/safety/language';
import { addDays } from '@/engine/dates';
import type { Profile } from '@/engine/types';
import { adult, child, exercise, teen } from './fixtures';

const D = '2026-11-25'; // a Wednesday

describe('weekly activity tracking', () => {
  it('counts vigorous minutes double for adults but not for teens', () => {
    const logs = [exercise('2026-11-23', 30, 'vigorous', 'running'), exercise('2026-11-24', 30, 'moderate')];
    expect(weeklyActivity(logs, D, getSafetyRules(30)).guidelineMinutes).toBe(90);
    expect(weeklyActivity(logs, D, getSafetyRules(15)).guidelineMinutes).toBe(60);
    expect(weeklyActivity(logs, D, getSafetyRules(15)).guidelineTarget).toBe(420);
    expect(weeklyActivity(logs, D, getSafetyRules(30)).guidelineTarget).toBe(150);
  });

  it('tracks strength and active days per Monday-based week', () => {
    const logs = [exercise('2026-11-23', 30, 'moderate', 'bodyweight', true), exercise('2026-11-22', 40)];
    const w = weeklyActivity(logs, D, getSafetyRules(30));
    expect(w.weekStart).toBe('2026-11-23');
    expect(w.strengthDays).toBe(1);
    expect(w.totalMinutes).toBe(30); // Sunday 22nd belongs to the previous week
  });
});

describe('rest recommendations', () => {
  it('recommends rest when fatigue is very high', () => {
    expect(restAdvice({ date: D, logs: [], profile: adult, checkIn: { date: D, energy: 3, fatigue: 5 } }).level).toBe('rest');
    expect(restAdvice({ date: D, logs: [], profile: adult, checkIn: { date: D, energy: 3, fatigue: 4 } }).level).toBe('light');
  });

  it('recommends rest after six hard days in a row', () => {
    const logs = Array.from({ length: 6 }, (_, i) => exercise(addDays(D, -(i + 1)), 45, 'vigorous', 'running'));
    const a = restAdvice({ date: D, logs, profile: adult });
    expect(a.level).toBe('rest');
    expect(a.reasons[0]).toMatch(/6 days in a row/);
  });

  it('suggests an easier day after short sleep', () => {
    expect(restAdvice({ date: D, logs: [], profile: adult, sleep: { date: D, hours: 4.5, quality: 2 } }).level).toBe('light');
  });
});

describe('daily plan generation', () => {
  it('gives teens a 60-minute target that counts sports and everyday movement', () => {
    const plan = generateDailyPlan({ profile: teen, date: D, logs: [] });
    expect(plan.guidelineNote).toMatch(/60 minutes/);
    expect(plan.guidelineNote).toMatch(/Sports, PE, cycling, walking/);
    expect(plan.items.some((i) => i.kind === 'everyday')).toBe(true);
    expect(plan.estimatedKcal).toBeUndefined();
  });

  it('never attaches calorie numbers to plans or logs for under-18s', () => {
    for (const p of [teen, child]) {
      for (let i = 0; i < 14; i++) {
        expect(generateDailyPlan({ profile: p, date: addDays(D, i), logs: [] }).estimatedKcal).toBeUndefined();
      }
      expect(loggedActivityKcal(p, { activity: 'football', intensity: 'vigorous', minutes: 60 })).toBeUndefined();
    }
    expect(loggedActivityKcal(adult, { activity: 'walking', intensity: 'moderate', minutes: 60 })).toBe(210);
  });

  it('returns a rest day for an exhausted user', () => {
    const plan = generateDailyPlan({ profile: adult, date: D, logs: [], checkIn: { date: D, energy: 2, fatigue: 5 } });
    expect(plan.type).toBe('rest');
    expect(plan.totalMinutes).toBeLessThanOrEqual(20);
  });

  it('schedules strength work when the week is short of strength days', () => {
    const plans = Array.from({ length: 7 }, (_, i) => generateDailyPlan({ profile: adult, date: addDays('2026-11-23', i), logs: [] }));
    expect(plans.some((p) => p.type === 'strength')).toBe(true);
    const sat = generateDailyPlan({ profile: adult, date: '2026-11-28', logs: [] });
    expect(sat.type).toBe('strength'); // 0 of 2 done with 2 days left
  });

  it('respects knee limitations and equipment', () => {
    const p: Profile = { ...adult, limitations: 'Knee pain after running', sports: ['running', 'walking'], equipment: ['none'] };
    expect(parseLimitations(p.limitations)).toEqual(['knee']);
    for (let i = 0; i < 14; i++) {
      const plan = generateDailyPlan({ profile: p, date: addDays(D, i), logs: [] });
      const names = plan.items.map((x) => x.name.toLowerCase()).join(' ');
      expect(names).not.toMatch(/squat|lunge|jump|running|skipping|step-up/);
      expect(plan.items.some((x) => x.name.includes('Dumbbell'))).toBe(false);
    }
  });

  it('keeps durations within available time for adults and avoids excessive training', () => {
    const p: Profile = { ...adult, minutesPerDay: 20, fitnessLevel: 'advanced' };
    for (let i = 0; i < 14; i++) {
      const plan = generateDailyPlan({ profile: p, date: addDays(D, i), logs: [] });
      expect(plan.totalMinutes).toBeLessThanOrEqual(45);
    }
  });

  it('adds a doctor note for heart conditions', () => {
    const plan = generateDailyPlan({ profile: { ...adult, limitations: 'high blood pressure' }, date: D, logs: [] });
    expect(plan.notes.join(' ')).toMatch(/doctor/);
  });

  it('produces no unsafe language in any plan', () => {
    for (const p of [teen, child, adult]) {
      for (let i = 0; i < 21; i++) {
        const plan = generateDailyPlan({ profile: p, date: addDays(D, i), logs: [], checkIn: { date: addDays(D, i), energy: 3, fatigue: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5 } });
        const text = [plan.title, plan.summary, plan.guidelineNote, ...plan.reasons, ...plan.notes, ...plan.items.map((x) => `${x.name} ${x.detail}`)].join(' ');
        expect(findUnsafePhrases(text, getSafetyRules(p.age).ageGroup)).toEqual([]);
      }
    }
  });
});
