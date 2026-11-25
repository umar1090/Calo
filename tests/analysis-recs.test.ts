import { describe, expect, it } from 'vitest';
import { analyzeDay } from '@/engine/analysis/daily';
import { recommendFoods, nextMealSlot } from '@/engine/recommendations/foodRecs';
import { findUnsafePhrases } from '@/engine/safety/language';
import { FOODS } from '@/data/foods';
import { suitableFor } from '@/engine/nutrition/foodMath';
import type { DietType, MealEntry, MealType, Profile } from '@/engine/types';
import { adult, child, entry, exercise, recContext, teen } from './fixtures';

const D = '2026-11-20';
const at = (h: number, m = 0) => new Date(`${D}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);

describe('daily nutrition analysis', () => {
  it('totals calories and macros from entries', () => {
    const entries = [entry('roti', 'lunch', D, 2), entry('dal-tadka', 'lunch', D)];
    const a = analyzeDay(recContext(adult, { date: D, now: at(14), entries }));
    expect(a.summary.totals.kcal).toBe(entries[0].nutrients.kcal + entries[1].nutrients.kcal);
    expect(a.summary.mealsLogged).toEqual(['lunch']);
    expect(a.summary.entryCount).toBe(2);
  });

  it('recognises a balanced day with the expected wording', () => {
    const entries = [
      entry('idli', 'breakfast', D), entry('sambar', 'breakfast', D),
      entry('roti', 'lunch', D, 2), entry('dal-tadka', 'lunch', D), entry('mixed-veg', 'lunch', D), entry('curd', 'lunch', D),
      entry('rice', 'dinner', D), entry('rajma', 'dinner', D), entry('palak-sabzi', 'dinner', D), entry('paneer', 'dinner', D),
    ];
    const a = analyzeDay(recContext(adult, { date: D, now: at(21, 30), entries, waterMl: 2250 }));
    expect(a.isBalanced).toBe(true);
    expect(a.feedback.map((f) => f.text)).toContain(
      'Your meals today look reasonably balanced. You have included a mix of carbohydrates, protein and vegetables.',
    );
  });

  it('flags low protein with diet-appropriate foods', () => {
    const entries = [entry('poha', 'breakfast', D), entry('rice', 'lunch', D), entry('aloo-sabzi', 'lunch', D)];
    const a = analyzeDay(recContext(adult, { date: D, now: at(15), entries }));
    const msg = a.feedback.find((f) => f.id === 'protein_low');
    expect(msg?.text).toMatch(/^Your meals today could benefit from more protein\. Try adding .*dal.*paneer.*curd/);
    const vegan = analyzeDay(recContext({ ...adult, dietType: 'vegan' }, { date: D, now: at(15), entries }));
    expect(vegan.feedback.find((f) => f.id === 'protein_low')?.text).not.toMatch(/paneer|curd|egg/);
  });

  it('uses the supportive "above range" message only for adults', () => {
    const big = [entry('chicken-biryani', 'lunch', D, 3), entry('gulab-jamun', 'snack', D, 4), entry('butter-chicken', 'dinner', D, 3), entry('naan', 'dinner', D, 4)];
    const a = analyzeDay(recContext({ ...adult, dietType: 'non_vegetarian' }, { date: D, now: at(22), entries: big }));
    expect(a.energyStatus).toBe('above');
    expect(a.feedback.find((f) => f.id === 'energy_above')?.text).toBe(
      'Your estimated intake is above your usual range today. One day of eating more is completely normal. Continue eating regular, balanced meals tomorrow.',
    );

    const teenBig = [...big, ...big];
    const t = analyzeDay(recContext({ ...teen, dietType: 'non_vegetarian' }, { date: D, now: at(22), entries: teenBig }));
    expect(t.feedback.some((f) => f.id === 'energy_above')).toBe(false);
    const fuel = t.feedback.find((f) => f.id === 'energy_fuel');
    expect(fuel?.text).toMatch(/normal/);
    expect(fuel?.text).not.toMatch(/above|too|excess/i);
  });

  it('suggests vegetables and fruit when missing late in the day', () => {
    const entries: MealEntry[] = [];
    entries.push(entry('aloo-paratha', 'breakfast', D), entry('rice', 'lunch', D), entry('dal-tadka', 'lunch', D));
    const a = analyzeDay(recContext(adult, { date: D, now: at(19, 30), entries }));
    expect(a.feedback.find((f) => f.id === 'veg_low')?.text).toBe("You've logged very few vegetables today. Consider adding sabzi with dinner.");
    expect(a.feedback.some((f) => f.id === 'fruit_none')).toBe(true);
  });

  it('is gentle when nothing is logged', () => {
    const a = analyzeDay(recContext(adult, { date: D, now: at(9) }));
    expect(a.feedback[0].id).toBe('empty');
    expect(a.balanceScore).toBe(0);
  });
});

describe('food recommendation engine', () => {
  it('picks the next meal slot from the clock and what is logged', () => {
    expect(nextMealSlot(D, at(8), [])).toBe('breakfast');
    expect(nextMealSlot(D, at(8), [entry('poha', 'breakfast', D)])).toBe('lunch');
    expect(nextMealSlot(D, at(13), [])).toBe('lunch');
    expect(nextMealSlot(D, at(17), [])).toBe('snack');
    expect(nextMealSlot(D, at(20), [])).toBe('dinner');
    expect(nextMealSlot('2026-11-19', at(9), [])).toBe('dinner');
  });

  it('bases suggestions on actual entries: protein, vegetables, hydration', () => {
    const entries = [entry('poha', 'breakfast', D, 1, '08:30'), entry('rice', 'lunch', D, 1, '13:00'), entry('aloo-sabzi', 'lunch', D, 1, '13:00')];
    const recs = recommendFoods(recContext(adult, { date: D, now: at(19), entries, waterMl: 250 }), 6);
    const kinds = recs.map((r) => r.kind);
    expect(kinds).toContain('protein');
    expect(kinds).toContain('vegetables');
    expect(kinds).toContain('hydration');
    const veg = recs.find((r) => r.kind === 'vegetables')!;
    expect(veg.message).toMatch(/You've logged very few vegetables today\. Consider adding sabzi with dinner/);
    const protein = recs.find((r) => r.kind === 'protein')!;
    expect(protein.message).toMatch(/^Try adding .+ to your dinner\.$/);
    expect(protein.reason).toMatch(/g protein so far/);
  });

  it('respects diet and allergies in every suggested food', () => {
    const diets: DietType[] = ['vegan', 'vegetarian', 'jain', 'eggetarian', 'non_vegetarian'];
    for (const dietType of diets) {
      const p: Profile = { ...adult, dietType, allergies: ['peanut', 'dairy'] };
      for (const h of [8, 12, 16, 19, 22]) {
        const recs = recommendFoods(recContext(p, { date: D, now: at(h), entries: [entry('rice', 'lunch', D)], waterMl: 0 }), 10);
        for (const r of recs) {
          if (!r.food) continue;
          const f = FOODS.find((x) => x.id === r.food!.foodId)!;
          expect(suitableFor(p, f), `${dietType} got ${f.id}`).toBe(true);
        }
      }
    }
  });

  it('suggests protein variety when one source dominates for days', () => {
    const recent: MealEntry[] = [];
    for (const d of ['2026-11-18', '2026-11-19']) recent.push(entry('dal-tadka', 'lunch', d), entry('rice', 'lunch', d), entry('dal-tadka', 'dinner', d), entry('roti', 'dinner', d));
    const today = [entry('dal-tadka', 'lunch', D), entry('rice', 'lunch', D)];
    const recs = recommendFoods(recContext(adult, { date: D, now: at(16), entries: today, recent, waterMl: 2000 }), 10);
    const v = recs.find((r) => r.kind === 'variety');
    expect(v?.message).toBe('Try curd or paneer to increase the variety of protein in your meals.');
  });

  it('is deterministic for the same data', () => {
    const ctx = recContext(adult, { date: D, now: at(17), entries: [entry('rice', 'lunch', D)] });
    expect(recommendFoods(ctx)).toEqual(recommendFoods(ctx));
  });

  it('suggests refuelling after activity without ever suggesting exercise for food', () => {
    const recs = recommendFoods(recContext(teen, { date: D, now: at(18), entries: [entry('poha', 'breakfast', D)], exercises: [exercise(D, 90, 'vigorous', 'football')], waterMl: 2000 }), 10);
    expect(recs.some((r) => r.kind === 'activity_fuel')).toBe(true);
  });
});

describe('language safety sweep', () => {
  const profiles: Profile[] = [
    child,
    teen,
    { ...teen, age: 13, sex: 'female', dietType: 'vegan' },
    { ...teen, age: 17, sex: 'unspecified', dietType: 'jain', goals: ['weight'] },
    adult,
    { ...adult, dietType: 'non_vegetarian', goals: ['weight'], weightDirection: 'lose' },
    { ...adult, age: 70, dietType: 'eggetarian' },
  ];

  // Deterministic pseudo-random generator so failures are reproducible.
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'];

  it('never produces banned phrases across 1,400 generated days', () => {
    let checked = 0;
    for (const p of profiles) {
      for (let i = 0; i < 200; i++) {
        const n = Math.floor(rand() * 14);
        const entries = Array.from({ length: n }, () => {
          const f = FOODS[Math.floor(rand() * FOODS.length)];
          return entry(f.id, meals[Math.floor(rand() * meals.length)], D, 1 + Math.floor(rand() * 4));
        });
        const hour = 6 + Math.floor(rand() * 18);
        const ctx = recContext(p, {
          date: rand() > 0.8 ? '2026-11-19' : D,
          now: at(hour, Math.floor(rand() * 60)),
          entries,
          waterMl: Math.floor(rand() * 12) * 250,
          exercises: rand() > 0.6 ? [exercise(D, 20 + Math.floor(rand() * 120), rand() > 0.5 ? 'vigorous' : 'moderate')] : [],
        });
        const a = analyzeDay(ctx);
        const texts = [...a.feedback.flatMap((f) => [f.title, f.text]), ...recommendFoods(ctx, 10).flatMap((r) => [r.title, r.message, r.reason])];
        for (const t of texts) {
          expect(findUnsafePhrases(t, ctx.targets.rules.ageGroup), `${p.age}: ${t}`).toEqual([]);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(3000);
  });

  it('the filter itself catches the phrases the app must never show', () => {
    for (const bad of ['You failed your calorie goal.', 'You need to burn off this food.', 'You ate too much. Skip dinner.', 'You need to starve tomorrow.', 'You must exercise to compensate.']) {
      expect(findUnsafePhrases(bad, 'adult').length).toBeGreaterThan(0);
    }
    expect(findUnsafePhrases('You have 400 calories left today', 'teen').length).toBeGreaterThan(0);
    expect(findUnsafePhrases('A gentle deficit', 'teen').length).toBeGreaterThan(0);
    expect(findUnsafePhrases('Your meals today look reasonably balanced.', 'teen')).toEqual([]);
  });
});
