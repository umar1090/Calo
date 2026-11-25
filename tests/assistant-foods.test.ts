import { describe, expect, it } from 'vitest';
import { classifyIntent, respond, STARTER_PROMPTS } from '@/engine/assistant/assistant';
import { detectSafetyConcern } from '@/engine/assistant/safety';
import { findUnsafePhrases } from '@/engine/safety/language';
import { FOODS } from '@/data/foods';
import { searchFoods, findFoodMentions } from '@/data/foodSearch';
import { defaultPortion, portionNutrients, suitableFor } from '@/engine/nutrition/foodMath';
import { getSafetyRules } from '@/engine/safety/policy';
import { adult, assistantContext, child, entry, teen } from './fixtures';

const D = '2026-11-20';
const evening = new Date(`${D}T19:30:00`);

describe('assistant intents', () => {
  it('understands the starter prompts', () => {
    expect(STARTER_PROMPTS.map((p) => classifyIntent(p, FOODS))).toEqual(['meal_dinner', 'protein', 'meal_breakfast', 'workout', 'analyze', 'pantry']);
  });

  it('detects safety concerns before anything else', () => {
    expect(detectSafetyConcern('I want to starve myself until I am thin')).toBe('disordered_eating');
    expect(detectSafetyConcern('how do I burn off the samosa I ate')).toBe('compensation');
    expect(detectSafetyConcern('what diet should I follow for diabetes')).toBe('medical');
    expect(detectSafetyConcern('should I take whey protein')).toBe('supplement');
    expect(detectSafetyConcern('how to lose 10 kg in a month')).toBe('extreme_diet');
    expect(detectSafetyConcern('I want to end my life')).toBe('crisis');
    expect(detectSafetyConcern('What should I eat for dinner?')).toBeNull();
  });
});

describe('assistant replies use the profile and logs', () => {
  it('suggests dinner combos that fit the diet and the day', () => {
    const ctx = assistantContext({ ...adult, dietType: 'vegan' }, { date: D, now: evening, entries: [entry('poha', 'breakfast', D), entry('rice', 'lunch', D)] });
    const r = respond(ctx, 'What should I eat for dinner?');
    expect(r.combos?.length).toBeGreaterThan(0);
    for (const c of r.combos!) for (const it of c.items) expect(suitableFor(ctx.profile, FOODS.find((f) => f.id === it.foodId)!)).toBe(true);
    expect(r.text).toMatch(/protein/); // explains why these were chosen
    expect(r.combos![0].totals.kcal).toBeGreaterThan(0);
    expect(r.combos![0].totals.protein).toBeGreaterThan(0);
  });

  it('does not show calories on combos for teens', () => {
    const r = respond(assistantContext(teen, { date: D, now: evening }), 'What healthy Indian breakfast can I have?');
    expect(r.combos?.length).toBeGreaterThan(0);
    expect(r.text).not.toMatch(/kcal/);
  });

  it('reports protein against the user’s estimate', () => {
    const ctx = assistantContext(adult, { date: D, now: evening, entries: [entry('dal-tadka', 'lunch', D)] });
    const r = respond(ctx, 'How can I improve my protein intake?');
    expect(r.text).toContain(`${ctx.targets.protein.min}–${ctx.targets.protein.max} g`);
    expect(r.text).not.toMatch(/whey|powder/i);
  });

  it('builds recipes from ingredients at home', () => {
    const r = respond(assistantContext(adult, { date: D, now: evening }), 'I have rice, moong dal, onion and tomato at home');
    expect(r.intent).toBe('pantry');
    expect(r.text).toMatch(/Dal tadka with rice|Moong dal khichdi/);
    const eggs = respond(assistantContext(adult, { date: D, now: evening }), 'I have eggs, bread and onion');
    expect(eggs.text).not.toMatch(/\*\*[^*]*egg[^*]*\*\*/i); // vegetarian profile: no egg recipes
    expect(eggs.text).toMatch(/left out egg/);
  });

  it('analyses the day from real entries', () => {
    const ctx = assistantContext(adult, { date: D, now: evening, entries: [entry('idli', 'breakfast', D), entry('sambar', 'breakfast', D)], waterMl: 500 });
    const r = respond(ctx, 'Analyse my meals today.');
    expect(r.text).toMatch(/Meals logged: breakfast/);
    expect(r.text).toMatch(/Water: 0\.5 L/);
  });

  it('gives a workout plan', () => {
    const r = respond(assistantContext(teen, { date: D, now: evening }), 'What workout should I do today?');
    expect(r.text).toMatch(/60 minutes/);
  });

  it('answers food questions without moralising', () => {
    const r = respond(assistantContext(teen, { date: D, now: evening }), 'Is samosa healthy?');
    expect(r.intent).toBe('food_info');
    expect(r.text).toMatch(/Samosa/);
    expect(r.text).toMatch(/All foods can fit/);
  });

  it('handles weight questions safely by age', () => {
    const teenReply = respond(assistantContext(teen, { date: D, now: evening }), 'How do I lose weight?');
    expect(teenReply.text).toMatch(/does not set weight-change or calorie targets for under-18s/);
    expect(teenReply.text).toMatch(/doctor/);
    const childReply = respond(assistantContext(child, { date: D, now: evening }), 'am I fat? my weight');
    expect(childReply.safety ?? childReply.intent).toBeTruthy();
    const adultReply = respond(assistantContext({ ...adult, goals: ['weight'], weightDirection: 'lose' }, { date: D, now: evening }), 'How do I lose weight?');
    expect(adultReply.text).toMatch(/maintenance/);
  });

  it('refuses medical diets and points to professionals', () => {
    const r = respond(assistantContext(adult, { date: D, now: evening }), 'Give me a diet plan for PCOS');
    expect(r.safety).toBe('medical');
    expect(r.text).toMatch(/doctor or a registered dietitian/);
  });

  it('responds to disordered-eating signals with support and a helpline', () => {
    const r = respond(assistantContext(teen, { date: D, now: evening }), 'I want to stop eating so I get thinner');
    expect(r.safety).toBe('disordered_eating');
    expect(r.text).toMatch(/14416/);
  });

  it('never produces unsafe language for any prompt or age', () => {
    const prompts = [
      ...STARTER_PROMPTS,
      'How do I lose weight?', 'I ate too much today', 'how do I burn off the pizza', 'Is jalebi bad?', 'protein in paneer',
      'I have besan, curd and spinach', 'what snack after football', 'I feel tired', 'how much water', 'hi', 'thanks', 'random words here',
      'I want to starve', 'give me 500 calories a day plan', 'should I take creatine', 'diet for thyroid',
    ];
    for (const p of [child, teen, adult, { ...adult, age: 72 }]) {
      const ctx = assistantContext(p, { date: D, now: evening, entries: [entry('samosa', 'snack', D, 3)] });
      for (const q of prompts) {
        const r = respond(ctx, q);
        expect(findUnsafePhrases(r.text, getSafetyRules(p.age).ageGroup), `${p.age} / ${q}: ${r.text}`).toEqual([]);
      }
    }
  });
});

describe('food database', () => {
  it('has unique ids and valid default portions', () => {
    const ids = new Set(FOODS.map((f) => f.id));
    expect(ids.size).toBe(FOODS.length);
    for (const f of FOODS) expect(f.portions.some((p) => p.id === f.defaultPortionId), f.id).toBe(true);
    expect(FOODS.length).toBeGreaterThanOrEqual(150);
  });

  it('keeps calories roughly consistent with macronutrients', () => {
    for (const f of FOODS) {
      const fromMacros = f.per100.protein * 4 + (f.per100.carbs - f.per100.fiber * 0.5) * 4 + f.per100.fat * 9;
      expect(Math.abs(fromMacros - f.per100.kcal), `${f.id}: ${f.per100.kcal} vs ${fromMacros.toFixed(0)}`).toBeLessThan(Math.max(35, f.per100.kcal * 0.2));
    }
  });

  it('covers the Indian foods and portions the app promises', () => {
    const required = ['roti', 'chapati', 'paratha', 'rice', 'dal', 'rajma', 'chole', 'paneer', 'sabzi', 'dhokla', 'poha', 'upma', 'idli', 'dosa', 'khichdi', 'curd', 'milk', 'buttermilk', 'egg', 'chicken', 'fish', 'banana', 'almonds', 'samosa', 'ladoo'];
    for (const q of required) expect(searchFoods(FOODS, q).length, q).toBeGreaterThan(0);
    const labels = FOODS.flatMap((f) => f.portions.map((p) => p.label));
    for (const l of ['1 medium roti', '1 bowl dal', '1 cup cooked', '100 g', '1 glass (250 ml)']) expect(labels).toContain(l);
  });

  it('search ranks names, aliases and tolerates small typos', () => {
    expect(searchFoods(FOODS, 'roti')[0].id).toBe('roti');
    expect(searchFoods(FOODS, 'chapathi')[0].id).toBe('chapati-ghee');
    expect(searchFoods(FOODS, 'panner')[0].id).toBe('paneer');
    expect(searchFoods(FOODS, 'golgappa')[0].id).toBe('pani-puri');
    expect(findFoodMentions(FOODS, 'how much protein in paneer?')[0].id).toBe('paneer');
  });

  it('adjusts homemade dishes for oil level', () => {
    const dal = FOODS.find((f) => f.id === 'dal-tadka')!;
    const p = defaultPortion(dal);
    const normal = portionNutrients(dal, p.grams, 1, 'normal');
    expect(portionNutrients(dal, p.grams, 1, 'more').kcal).toBe(normal.kcal + 45);
    const less = portionNutrients(dal, p.grams, 1, 'less');
    expect(less.kcal).toBeLessThan(normal.kcal);
    expect(less.fat).toBeCloseTo(normal.fat / 2, 1); // never removes more than half the fat
    expect(portionNutrients(dal, p.grams, 2, 'more').fat).toBeCloseTo(normal.fat * 2 + 10, 1);
  });
});
