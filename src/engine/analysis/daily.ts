import type { Allergen, DietType, ExerciseLog, FoodGroup, MealEntry, MealType, Nutrients, Profile } from '../types';
import type { DayTargets, NutritionTargets } from '../nutrition/targets';
import { sumNutrients } from '../nutrition/foodMath';
import { dayPace } from '../dates';

export interface DayContext {
  profile: Profile;
  targets: NutritionTargets;
  day: DayTargets;
  date: string;
  now: Date;
  entries: MealEntry[];
  waterMl: number;
  exercises: ExerciseLog[];
}

export const PROTEIN_GROUPS: FoodGroup[] = ['pulse', 'dairy', 'egg', 'meat_fish', 'soy', 'nut_seed'];
export const MAIN_MEALS: MealType[] = ['breakfast', 'lunch', 'dinner'];

export interface DaySummary {
  totals: Nutrients;
  entryCount: number;
  mealsLogged: MealType[];
  vegServings: number;
  fruitServings: number;
  groups: FoodGroup[];
  proteinSources: FoodGroup[];
  treatCount: number; // fried, sweets and sugary drinks
  waterMl: number;
  macroPct: { protein: number; carbs: number; fat: number };
}

export function summarizeDay(entries: MealEntry[], waterMl: number): DaySummary {
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  const groups = new Set<FoodGroup>();
  entries.forEach((e) => e.groups.forEach((g) => groups.add(g)));
  const meals = new Set<MealType>(entries.map((e) => e.mealType));
  const kcalFromMacros = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9 || 1;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  return {
    totals,
    entryCount: entries.length,
    mealsLogged: (['breakfast', 'lunch', 'dinner', 'snack', 'beverage'] as MealType[]).filter((m) => meals.has(m)),
    vegServings: r1(entries.reduce((s, e) => s + e.vegServings, 0)),
    fruitServings: r1(entries.reduce((s, e) => s + e.fruitServings, 0)),
    groups: [...groups],
    proteinSources: PROTEIN_GROUPS.filter((g) => groups.has(g)),
    treatCount: entries.filter((e) => e.groups.some((g) => g === 'fried' || g === 'sweet' || g === 'sugary_drink')).length,
    waterMl,
    macroPct: {
      protein: Math.round(((totals.protein * 4) / kcalFromMacros) * 100),
      carbs: Math.round(((totals.carbs * 4) / kcalFromMacros) * 100),
      fat: Math.round(((totals.fat * 9) / kcalFromMacros) * 100),
    },
  };
}

// ---------------------------------------------------------------------------
// Diet-aware food words used in feedback copy
// ---------------------------------------------------------------------------

const PROTEIN_WORDS: { word: string; diets: DietType[]; allergen?: Allergen }[] = [
  { word: 'dal', diets: ['vegan', 'vegetarian', 'jain', 'eggetarian', 'non_vegetarian'] },
  { word: 'paneer', diets: ['vegetarian', 'jain', 'eggetarian'], allergen: 'dairy' },
  { word: 'curd', diets: ['vegetarian', 'jain', 'eggetarian', 'non_vegetarian'], allergen: 'dairy' },
  { word: 'eggs', diets: ['eggetarian', 'non_vegetarian'], allergen: 'egg' },
  { word: 'chicken', diets: ['non_vegetarian'] },
  { word: 'fish', diets: ['non_vegetarian'], allergen: 'fish' },
  { word: 'tofu', diets: ['vegan'], allergen: 'soy' },
  { word: 'soya chunks', diets: ['vegan', 'vegetarian'], allergen: 'soy' },
  { word: 'chana', diets: ['vegan', 'vegetarian', 'jain', 'eggetarian', 'non_vegetarian'] },
  { word: 'rajma', diets: ['vegan'] },
  { word: 'sprouts', diets: ['vegan', 'vegetarian'] },
];

export function proteinFoodWords(p: { dietType: DietType; allergies: Allergen[] }, max = 5): string[] {
  return PROTEIN_WORDS.filter((w) => w.diets.includes(p.dietType) && !(w.allergen && p.allergies.includes(w.allergen)))
    .slice(0, max)
    .map((w) => w.word);
}

export function joinOr(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} or ${words[words.length - 1]}`;
}

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export type FeedbackTone = 'positive' | 'neutral' | 'suggestion' | 'care';

export interface Feedback {
  id: string;
  tone: FeedbackTone;
  title: string;
  text: string;
}

export interface DayAnalysis {
  summary: DaySummary;
  pace: number;
  /** 0–100, used for a gentle "balance" indicator. */
  balanceScore: number;
  balanceLabel: string;
  isBalanced: boolean;
  proteinStatus: 'low' | 'on_track' | 'good';
  energyStatus: 'below' | 'within' | 'above' | 'not_assessed';
  feedback: Feedback[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export function analyzeDay(ctx: DayContext): DayAnalysis {
  const { profile, targets, day } = ctx;
  const rules = targets.rules;
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const s = summarizeDay(ctx.entries, ctx.waterMl);
  const pace = dayPace(ctx.date, ctx.now);
  const feedback: Feedback[] = [];
  const words = proteinFoodWords(profile);

  const hasCarb = s.groups.includes('whole_grain') || s.groups.includes('refined_grain');
  const hasProtein = s.proteinSources.some((g) => g !== 'nut_seed');
  const hasVeg = s.vegServings >= 0.8;
  const expectedProtein = targets.protein.min * Math.max(pace, 0.15);
  const proteinRatio = expectedProtein > 0 ? s.totals.protein / expectedProtein : 1;
  const proteinStatus: DayAnalysis['proteinStatus'] = proteinRatio < 0.75 ? 'low' : proteinRatio < 1 ? 'on_track' : 'good';
  const isBalanced = hasCarb && hasProtein && hasVeg && proteinRatio >= 0.75;

  // Balance score: protein 30, vegetables 25, fruit 15, fibre 15, variety 15.
  const paceAdj = Math.max(pace, 0.15);
  const score =
    30 * clamp01(proteinRatio) +
    25 * clamp01(s.vegServings / (3 * paceAdj)) +
    15 * clamp01(s.fruitServings / (2 * paceAdj)) +
    15 * clamp01(s.totals.fiber / (targets.fiber * paceAdj)) +
    15 * clamp01(new Set(s.groups.filter((g) => !['fried', 'sweet', 'sugary_drink'].includes(g))).size / 5);
  const balanceScore = s.entryCount === 0 ? 0 : Math.round(score);
  const balanceLabel =
    s.entryCount === 0 ? 'Nothing logged yet' : balanceScore >= 75 ? 'Well balanced' : balanceScore >= 50 ? 'Good start' : 'Building up';

  // Energy status is only assessed late in the day (or for past days).
  let energyStatus: DayAnalysis['energyStatus'] = 'not_assessed';
  if (s.entryCount > 0 && rules.energyFraming !== 'hidden') {
    if (s.totals.kcal > day.energyRange.max) energyStatus = 'above';
    else if (pace >= 0.8 && s.totals.kcal < day.energyRange.min) energyStatus = 'below';
    else if (pace >= 0.8) energyStatus = 'within';
  }

  if (s.entryCount === 0) {
    feedback.push({
      id: 'empty',
      tone: 'neutral',
      title: pace >= 1 ? 'No meals logged for this day' : 'Nothing logged yet today',
      text:
        pace >= 1
          ? 'That is okay. Logging is most useful when it is easy, so add what you remember or simply pick up again tomorrow.'
          : 'When you eat, add it here and NutriTrack will show how your day is shaping up.',
    });
    return { summary: s, pace, balanceScore, balanceLabel, isBalanced: false, proteinStatus, energyStatus, feedback };
  }

  if (isBalanced) {
    feedback.push({
      id: 'balanced',
      tone: 'positive',
      title: 'Nicely balanced',
      text: 'Your meals today look reasonably balanced. You have included a mix of carbohydrates, protein and vegetables.',
    });
  }

  if (proteinStatus === 'low' && (pace >= 0.3 || s.entryCount >= 2)) {
    feedback.push({
      id: 'protein_low',
      tone: 'suggestion',
      title: 'Room for more protein',
      text: `Your meals today could benefit from more protein. Try adding ${joinOr(words)}.`,
    });
  } else if (s.proteinSources.length >= 3) {
    feedback.push({
      id: 'protein_variety',
      tone: 'positive',
      title: 'Great protein variety',
      text: 'You have had protein from several different foods today. Variety like this gives your body a good mix of nutrients.',
    });
  }

  if (energyStatus === 'above') {
    feedback.push(
      rules.mayLabelIntakeAboveRange
        ? {
            id: 'energy_above',
            tone: 'neutral',
            title: 'A bigger eating day',
            text: 'Your estimated intake is above your usual range today. One day of eating more is completely normal. Continue eating regular, balanced meals tomorrow.',
          }
        : {
            id: 'energy_fuel',
            tone: 'neutral',
            title: 'Well fuelled',
            text: 'Growing, active bodies need different amounts of food on different days, and that is normal. Keep enjoying regular meals and listen to your hunger.',
          },
    );
  } else if (energyStatus === 'below' && s.totals.kcal < day.energyRange.min * 0.7) {
    feedback.push({
      id: 'energy_low',
      tone: 'care',
      title: youth ? 'Keep your energy up' : 'A lighter day',
      text: youth
        ? `Growing bodies need regular meals for school, sport and growth. If you are still hungry, a filling snack with ${joinOr(words.slice(0, 3))} is a great idea.`
        : 'Your logged intake is on the lower side today. If you forgot to log something, no problem. Otherwise, a nourishing meal or snack can help you feel your best.',
    });
  }

  if (s.vegServings < 1 && pace >= 0.55) {
    feedback.push({
      id: 'veg_low',
      tone: 'suggestion',
      title: 'Add some vegetables',
      text: "You've logged very few vegetables today. Consider adding sabzi with dinner.",
    });
  } else if (s.vegServings >= 3) {
    feedback.push({ id: 'veg_good', tone: 'positive', title: 'Plenty of vegetables', text: `About ${Math.round(s.vegServings)} servings of vegetables so far. Lovely.` });
  }

  if (s.fruitServings < 0.5 && pace >= 0.55) {
    feedback.push({
      id: 'fruit_none',
      tone: 'suggestion',
      title: 'Fruit would fit well',
      text: 'You could include fruit with your evening snack. A banana, guava or a bowl of papaya are easy options.',
    });
  }

  if (s.totals.fiber < targets.fiber * pace * 0.6 && pace >= 0.55) {
    feedback.push({
      id: 'fibre_low',
      tone: 'suggestion',
      title: 'A little more fibre',
      text: 'Whole grains, dal, chana, vegetables and fruit add fibre. A jowar or bajra roti, or a bowl of chana, are simple ways to add more.',
    });
  }

  if (ctx.waterMl < day.waterMl * pace * 0.6 && pace >= 0.3) {
    feedback.push({
      id: 'water_low',
      tone: 'suggestion',
      title: 'Time for some water',
      text: `You have logged ${(ctx.waterMl / 1000).toFixed(1)} L of water so far. Keep a bottle nearby and sip through the day.`,
    });
  }

  if (s.treatCount >= 3) {
    feedback.push({
      id: 'treats',
      tone: 'neutral',
      title: 'Enjoying some treats',
      text: 'Snacks and sweets are part of life and can fit into balanced eating. For your next meal, a simple plate with dal, sabzi and roti or rice will round things out nicely.',
    });
  }

  if (youth && pace >= 0.55 && !s.mealsLogged.includes('breakfast') && !s.mealsLogged.includes('lunch')) {
    feedback.push({
      id: 'regular_meals',
      tone: 'care',
      title: 'Regular meals help',
      text: 'Eating at regular times keeps your energy steady for classes and sport. If you have eaten and not logged it yet, that is fine too.',
    });
  }

  return { summary: s, pace, balanceScore, balanceLabel, isBalanced, proteinStatus, energyStatus, feedback };
}
