import type { Food, FoodCategory } from '@/data/foods';
import type { FoodGroup, MealEntry, MealType } from '../types';
import { analyzeDay, PROTEIN_GROUPS, type DayContext } from '../analysis/daily';
import { defaultPortion, portionNutrients, suitableFor } from '../nutrition/foodMath';
import { addDays, dayOfYear, dayPace, toISODate } from '../dates';

/**
 * Food recommendation engine. Every recommendation is produced by a rule that
 * looks at the user's actual entries (today and the last few days), their
 * targets, diet, allergies and cuisine preferences. Nothing is random: the
 * same data always gives the same suggestions (rotation uses the date).
 */

export type RecKind =
  | 'protein'
  | 'vegetables'
  | 'fruit'
  | 'fibre'
  | 'hydration'
  | 'variety'
  | 'repetition'
  | 'timing'
  | 'calcium'
  | 'activity_fuel'
  | 'keep_going';

export interface FoodSuggestion {
  foodId: string;
  name: string;
  portionId: string;
  portionLabel: string;
  kcal: number;
  protein: number;
}

export interface Recommendation {
  id: string;
  kind: RecKind;
  title: string;
  message: string;
  /** Why this was suggested, in terms of the user's own data. */
  reason: string;
  mealType?: MealType;
  food?: FoodSuggestion;
  priority: number;
}

export interface RecContext extends DayContext {
  foods: Food[];
  /** Entries from the previous 7 days (not including `date`). */
  recentEntries: MealEntry[];
}

/** Natural phrasing for foods that are commonly recommended. */
export const SUGGEST_PHRASE: Record<string, string> = {
  'dal-tadka': 'a bowl of dal',
  'moong-dal': 'a bowl of moong dal',
  'masoor-dal': 'a bowl of masoor dal',
  rajma: 'a bowl of rajma',
  chole: 'a bowl of chole',
  sambar: 'a bowl of sambar',
  curd: 'a bowl of curd',
  'hung-curd': 'some hung curd',
  paneer: 'some paneer',
  'paneer-bhurji': 'paneer bhurji',
  'palak-paneer': 'palak paneer',
  'boiled-egg': 'a couple of boiled eggs',
  'egg-bhurji': 'egg bhurji',
  omelette: 'an omelette',
  'egg-curry': 'egg curry',
  'chicken-curry': 'a bowl of chicken curry',
  'chicken-breast': 'some grilled chicken',
  'fish-curry': 'a bowl of fish curry',
  'grilled-fish': 'some grilled fish',
  'roasted-chana': 'a handful of roasted chana',
  'boiled-chana': 'a bowl of boiled chana',
  'sprouts-salad': 'a bowl of sprouts salad',
  sundal: 'chana sundal',
  'soya-chunks': 'some soya chunks',
  'soya-curry': 'soya chunk curry',
  tofu: 'some tofu',
  'moong-chilla': 'a moong dal chilla',
  'besan-chilla': 'a besan chilla',
  'sattu-drink': 'a glass of sattu',
  peanuts: 'a handful of peanuts',
  'milk-toned': 'a glass of milk',
  buttermilk: 'a glass of buttermilk',
  'soy-milk': 'a glass of soy milk',
  'mixed-veg': 'a bowl of mixed veg sabzi',
  bhindi: 'bhindi sabzi',
  'palak-sabzi': 'palak sabzi',
  lauki: 'lauki sabzi',
  'cabbage-sabzi': 'cabbage sabzi',
  'beans-poriyal': 'beans poriyal',
  'baingan-bharta': 'baingan bharta',
  'green-salad': 'a plate of kachumber salad',
  cucumber: 'some cucumber slices',
  carrot: 'some carrot sticks',
  banana: 'a banana',
  guava: 'a guava',
  papaya: 'a bowl of papaya',
  orange: 'an orange',
  apple: 'an apple',
  chikoo: 'a chikoo',
  watermelon: 'a bowl of watermelon',
  'fruit-chaat': 'a fruit bowl',
  amla: 'a couple of amlas',
  'jowar-bhakri': 'a jowar bhakri',
  'bajra-roti': 'a bajra roti',
  'ragi-roti': 'a ragi roti',
  'ragi-malt': 'a glass of ragi malt',
  daliya: 'a bowl of daliya',
  'brown-rice': 'brown rice',
  'masala-oats': 'masala oats',
  'sesame-chikki': 'a piece of til chikki',
  almonds: 'a few almonds',
  makhana: 'a bowl of roasted makhana',
};

export function phraseFor(food: Food): string {
  return SUGGEST_PHRASE[food.id] ?? `some ${food.name.toLowerCase()}`;
}

const MEAL_WORD: Record<MealType, string> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'evening snack',
  beverage: 'drinks',
};

/** Which meal is coming up next, based on the clock and what is already logged. */
export function nextMealSlot(date: string, now: Date, entries: MealEntry[]): MealType {
  if (date < toISODate(now)) return 'dinner';
  const has = (m: MealType) => entries.some((e) => e.mealType === m);
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < 11) return has('breakfast') ? 'lunch' : 'breakfast';
  if (h < 15.5) return has('lunch') ? 'snack' : 'lunch';
  if (h < 18.5) return 'snack';
  if (h < 22.5) return has('dinner') ? 'snack' : 'dinner';
  return 'snack';
}

interface PickOptions {
  meal?: MealType;
  categories?: FoodCategory[];
  groups?: FoodGroup[];
  ids?: string[];
  excludeIds?: Set<string>;
  maxCost?: 1 | 2 | 3;
  score?: (f: Food) => number;
}

/** Deterministically choose the best suitable food for a rule. */
export function pickFood(ctx: RecContext, opts: PickOptions): Food | undefined {
  const { profile } = ctx;
  let pool = ctx.foods.filter((f) => !f.custom && suitableFor(profile, f));
  if (opts.ids) pool = pool.filter((f) => opts.ids!.includes(f.id));
  if (opts.categories) pool = pool.filter((f) => opts.categories!.includes(f.category));
  if (opts.groups) pool = pool.filter((f) => f.groups.some((g) => opts.groups!.includes(g)));
  if (opts.meal) {
    const forMeal = pool.filter((f) => f.meals.includes(opts.meal!));
    if (forMeal.length) pool = forMeal;
  }
  if (opts.excludeIds) {
    const fresh = pool.filter((f) => !opts.excludeIds!.has(f.id));
    if (fresh.length) pool = fresh;
  }
  if (opts.maxCost) {
    const cheap = pool.filter((f) => f.cost <= opts.maxCost!);
    if (cheap.length) pool = cheap;
  }
  const prefersCuisine = (f: Food) => (profile.cuisines.length === 0 || f.cuisines.some((c) => profile.cuisines.includes(c)) ? 1 : 0);
  const known = (f: Food) => (SUGGEST_PHRASE[f.id] ? 1 : 0);
  const ranked = [...pool].sort(
    (a, b) =>
      known(b) - known(a) ||
      prefersCuisine(b) - prefersCuisine(a) ||
      a.cost - b.cost || // everyday household staples before pricier options
      (opts.score ? opts.score(b) - opts.score(a) : 0) ||
      a.id.localeCompare(b.id),
  );
  // Rotate among the top few so suggestions vary day to day but stay stable within a day.
  const top = ranked.slice(0, Math.min(3, ranked.length));
  if (top.length === 0) return undefined;
  return top[dayOfYear(ctx.date) % top.length];
}

function suggestion(food: Food): FoodSuggestion {
  const portion = defaultPortion(food);
  const n = portionNutrients(food, portion.grams, 1);
  return { foodId: food.id, name: food.name, portionId: portion.id, portionLabel: portion.label, kcal: n.kcal, protein: n.protein };
}

const proteinDensity = (f: Food) => (f.per100.kcal > 0 ? f.per100.protein / f.per100.kcal : 0);

export function recommendFoods(ctx: RecContext, limit = 4): Recommendation[] {
  const analysis = analyzeDay(ctx);
  const s = analysis.summary;
  const { targets, day } = ctx;
  const pace = dayPace(ctx.date, ctx.now);
  const slot = nextMealSlot(ctx.date, ctx.now, ctx.entries);
  const slotWord = MEAL_WORD[slot];
  const eatenToday = new Set(ctx.entries.map((e) => e.foodId).filter(Boolean) as string[]);
  const eatenRecently = new Set([...eatenToday, ...ctx.recentEntries.filter((e) => e.date >= addDays(ctx.date, -1)).map((e) => e.foodId ?? '')]);
  const youth = targets.rules.ageGroup === 'child' || targets.rules.ageGroup === 'teen';
  const isToday = ctx.date === toISODate(ctx.now);
  const recs: Recommendation[] = [];
  const mealPhrase = slot === 'snack' ? 'your evening snack' : `your ${slotWord}`;

  // 1. Protein
  if (analysis.proteinStatus === 'low' && (pace >= 0.25 || s.entryCount >= 1)) {
    const categoriesBySlot: Record<MealType, FoodCategory[]> = {
      breakfast: ['breakfast', 'eggs', 'dairy', 'dal'],
      lunch: ['dal', 'curry', 'eggs', 'meat', 'fish', 'dairy'],
      dinner: ['dal', 'curry', 'eggs', 'meat', 'fish', 'dairy'],
      snack: ['snacks', 'dairy', 'eggs', 'salad', 'dal', 'beverages', 'nuts'],
      beverage: ['beverages'],
    };
    const food = pickFood(ctx, {
      meal: slot,
      categories: categoriesBySlot[slot],
      groups: ['pulse', 'dairy', 'egg', 'meat_fish', 'soy'],
      excludeIds: eatenToday,
      maxCost: 2,
      score: proteinDensity,
    });
    if (food) {
      const sug = suggestion(food);
      recs.push({
        id: 'protein',
        kind: 'protein',
        title: 'Add some protein',
        message: `Try adding ${phraseFor(food)} to ${mealPhrase}.`,
        reason: `You've had about ${Math.round(s.totals.protein)} g protein so far; ${youth ? 'growing bodies do well with' : 'your estimate is'} around ${targets.protein.min}–${targets.protein.max} g a day. ${phraseFor(food).replace(/^\w/, (c) => c.toUpperCase())} adds about ${Math.round(sug.protein)} g.`,
        mealType: slot,
        food: sug,
        priority: 90,
      });
    }
  }

  // 2. Vegetables
  if (s.vegServings < Math.max(1, 3 * pace - 0.5) && pace >= 0.5 && s.entryCount > 0) {
    const vegSlot: MealType = slot === 'snack' && isToday && ctx.now.getHours() < 18 ? 'snack' : slot === 'breakfast' ? 'lunch' : slot === 'snack' ? 'dinner' : slot;
    const food =
      (vegSlot !== 'snack' && pickFood(ctx, { categories: ['sabzi'], groups: ['vegetable'], excludeIds: eatenToday, score: (f) => f.vegFraction })) ||
      pickFood(ctx, { meal: vegSlot === 'snack' ? 'snack' : undefined, categories: ['salad'], groups: ['vegetable'], excludeIds: eatenToday, score: (f) => f.vegFraction });
    if (food) {
      recs.push({
        id: 'vegetables',
        kind: 'vegetables',
        title: s.vegServings < 1 ? 'Very few vegetables so far' : 'A few more vegetables',
        message:
          s.vegServings < 1
            ? `You've logged very few vegetables today. Consider adding sabzi with ${vegSlot === 'snack' ? 'dinner' : MEAL_WORD[vegSlot]}, like ${phraseFor(food)}.`
            : `Consider adding ${phraseFor(food)} with ${vegSlot === 'snack' ? 'dinner' : MEAL_WORD[vegSlot]}.`,
        reason: `About ${s.vegServings} vegetable servings logged today. Around 3 or more a day (roughly 80 g each) is a good aim.`,
        mealType: vegSlot === 'snack' ? 'dinner' : vegSlot,
        food: suggestion(food),
        priority: s.vegServings < 1 ? 85 : 60,
      });
    }
  }

  // 3. Fruit
  if (s.fruitServings < 0.5 && pace >= 0.4) {
    const food = pickFood(ctx, { categories: ['fruit'], groups: ['fruit'], maxCost: 1, excludeIds: eatenRecently, score: (f) => f.per100.fiber });
    if (food) {
      const evening = isToday && ctx.now.getHours() < 19;
      recs.push({
        id: 'fruit',
        kind: 'fruit',
        title: 'Fruit fits in nicely',
        message: evening ? `You could include fruit with your evening snack, such as ${phraseFor(food)}.` : `Try ${phraseFor(food)} with breakfast or as a snack tomorrow.`,
        reason: 'No fruit logged today. One or two servings a day add fibre, vitamins and natural sweetness.',
        mealType: 'snack',
        food: suggestion(food),
        priority: 55,
      });
    }
  }

  // 4. Fibre: whole grains and pulses
  if (s.totals.fiber < targets.fiber * pace * 0.6 && pace >= 0.5 && s.entryCount > 0) {
    const refinedHeavy = ctx.entries.filter((e) => e.groups.includes('refined_grain')).length > ctx.entries.filter((e) => e.groups.includes('whole_grain')).length;
    const food = pickFood(ctx, {
      categories: refinedHeavy ? ['breads', 'breakfast', 'rice'] : ['dal', 'salad', 'snacks', 'breads'],
      groups: refinedHeavy ? ['whole_grain'] : ['pulse', 'whole_grain'],
      excludeIds: eatenToday,
      score: (f) => f.per100.fiber,
    });
    if (food) {
      recs.push({
        id: 'fibre',
        kind: 'fibre',
        title: 'More fibre, easily',
        message: refinedHeavy
          ? `Most of today's grains were refined. Swapping in ${phraseFor(food)} adds fibre and keeps you full longer.`
          : `Adding ${phraseFor(food)} is an easy way to get more fibre.`,
        reason: `About ${Math.round(s.totals.fiber)} g fibre logged so far, against an estimated ${targets.fiber} g for the day.`,
        mealType: slot === 'snack' ? 'dinner' : slot,
        food: suggestion(food),
        priority: 45,
      });
    }
  }

  // 5. Hydration
  if (ctx.waterMl < day.waterMl * Math.max(pace, 0.2) * 0.7) {
    const glasses = Math.round(ctx.waterMl / 250);
    const goal = Math.round(day.waterMl / 250);
    recs.push({
      id: 'hydration',
      kind: 'hydration',
      title: 'Have a glass of water',
      message: isToday ? 'Have a glass of water now and keep a bottle within reach.' : 'Water intake was on the low side this day. A bottle within reach makes it easier.',
      reason: `${glasses} of about ${goal} glasses logged${day.waterMl > targets.waterMl ? ' (more on active days)' : ''}. Buttermilk, coconut water and nimbu pani count too.`,
      priority: 70 - Math.round((ctx.waterMl / Math.max(day.waterMl, 1)) * 20),
    });
  }

  // 6. Protein variety across the last 3 days
  const last3 = [...ctx.entries, ...ctx.recentEntries.filter((e) => e.date >= addDays(ctx.date, -2))];
  const sources = new Set<FoodGroup>();
  last3.forEach((e) => e.groups.forEach((g) => PROTEIN_GROUPS.includes(g) && g !== 'nut_seed' && sources.add(g)));
  if (last3.length >= 4 && sources.size <= 1) {
    const missing: FoodGroup[] = (['dairy', 'pulse', 'egg', 'soy', 'meat_fish'] as FoodGroup[]).filter((g) => !sources.has(g));
    const food = pickFood(ctx, { groups: missing, categories: ['dairy', 'dal', 'curry', 'eggs', 'fish', 'meat', 'salad'], maxCost: 2, score: proteinDensity });
    if (food) {
      recs.push({
        id: 'variety',
        kind: 'variety',
        title: 'Mix up your protein',
        message: food.groups.includes('dairy')
          ? 'Try curd or paneer to increase the variety of protein in your meals.'
          : `Try ${phraseFor(food)} to increase the variety of protein in your meals.`,
        reason: `Over the last 3 days most of your protein came from ${sources.size ? [...sources][0].replace('_', ' / ') : 'just a few foods'}. Different sources give different nutrients.`,
        food: suggestion(food),
        mealType: slot,
        priority: 50,
      });
    }
  }

  // 7. Repetition of the same main dish
  const counts = new Map<string, { name: string; days: Set<string>; category?: string }>();
  for (const e of [...ctx.entries, ...ctx.recentEntries.filter((x) => x.date >= addDays(ctx.date, -2))]) {
    if (!e.foodId || e.mealType === 'beverage') continue;
    const food = ctx.foods.find((f) => f.id === e.foodId);
    if (!food || ['extras', 'beverages', 'breads', 'rice'].includes(food.category)) continue;
    const c = counts.get(e.foodId) ?? { name: e.foodName, days: new Set(), category: food.category };
    c.days.add(e.date);
    counts.set(e.foodId, c);
  }
  const repeated = [...counts.entries()].find(([, c]) => c.days.size >= 3);
  if (repeated) {
    const [foodId, info] = repeated;
    const base = ctx.foods.find((f) => f.id === foodId)!;
    const alt = pickFood(ctx, { categories: [base.category], excludeIds: new Set([foodId, ...eatenToday]), meal: base.meals[0] });
    if (alt) {
      recs.push({
        id: 'repetition',
        kind: 'repetition',
        title: 'Something different?',
        message: `You've had ${info.name.toLowerCase()} on 3 days running. For variety, try ${phraseFor(alt)} next time.`,
        reason: 'Rotating dishes gives you a wider range of nutrients and keeps meals interesting.',
        food: suggestion(alt),
        mealType: base.meals[0],
        priority: 35,
      });
    }
  }

  // 8. Meal timing and regularity (today only)
  if (isToday) {
    const h = ctx.now.getHours();
    if (s.entryCount === 0 && h >= 11) {
      const food = pickFood(ctx, { ids: ['idli', 'poha', 'upma', 'moong-chilla', 'besan-chilla', 'boiled-egg', 'daliya', 'thepla'], meal: h < 15 ? 'breakfast' : 'snack' });
      recs.push({
        id: 'timing',
        kind: 'timing',
        title: youth ? 'Fuel up for the day' : 'Keep your energy steady',
        message: youth
          ? `Regular meals help you concentrate in class and play your best. ${food ? `Something quick like ${phraseFor(food)} works well.` : ''}`.trim()
          : `Nothing is logged yet today. If you have not eaten, a simple meal like ${food ? phraseFor(food) : 'dal-rice'} will help keep your energy steady.`,
        reason: 'No meals logged so far today.',
        food: food ? suggestion(food) : undefined,
        mealType: h < 15 ? 'lunch' : 'snack',
        priority: 95,
      });
    } else if (s.entryCount > 0 && h >= 10 && h <= 21) {
      const last = [...ctx.entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))[0];
      const hoursSince = (ctx.now.getTime() - new Date(last.loggedAt).getTime()) / 3_600_000;
      if (hoursSince >= 5) {
        const food = pickFood(ctx, { categories: ['snacks', 'fruit', 'dairy', 'nuts', 'salad'], meal: 'snack', maxCost: 2, excludeIds: eatenToday, score: proteinDensity });
        recs.push({
          id: 'gap',
          kind: 'timing',
          title: 'It has been a while',
          message: `It has been about ${Math.floor(hoursSince)} hours since you last logged food. ${food ? `A snack like ${phraseFor(food)} can keep your energy up.` : ''}`.trim(),
          reason: 'Long gaps between meals can leave you low on energy.',
          food: food ? suggestion(food) : undefined,
          mealType: 'snack',
          priority: 65,
        });
      }
    }
  }

  // 9. Calcium for growing bones (and adults 65+)
  const calciumFocus = youth || targets.rules.ageGroup === 'older_adult';
  const calciumFoods = ['curd', 'milk-toned', 'paneer', 'buttermilk', 'ragi-malt', 'ragi-roti', 'tofu', 'sesame-chikki', 'soy-milk', 'raita'];
  if (calciumFocus && pace >= 0.5 && s.entryCount > 0 && !ctx.entries.some((e) => e.groups.includes('dairy') || calciumFoods.includes(e.foodId ?? ''))) {
    const food = pickFood(ctx, { ids: calciumFoods, maxCost: 2 });
    if (food) {
      recs.push({
        id: 'calcium',
        kind: 'calcium',
        title: youth ? 'Calcium for growing bones' : 'Calcium for strong bones',
        message: `Add ${phraseFor(food)} today. Calcium-rich foods like curd, milk and ragi help build ${youth ? 'strong bones while you are growing' : 'and protect bones'}.`,
        reason: 'No dairy or other calcium-rich foods logged today.',
        food: suggestion(food),
        mealType: slot,
        priority: 58,
      });
    }
  }

  // 10. Fuel for activity (supportive, never compensatory)
  const activeMinutes = ctx.exercises.reduce((sum, e) => sum + e.minutes, 0);
  if (activeMinutes >= 45 && s.totals.kcal < day.energyRange.min * Math.max(pace, 0.3)) {
    const food = pickFood(ctx, { ids: ['banana', 'curd', 'sattu-drink', 'boiled-egg', 'roasted-chana', 'poha', 'milk-toned', 'peanuts', 'banana-shake', 'idli'], maxCost: 2, excludeIds: eatenToday, score: proteinDensity });
    if (food) {
      recs.push({
        id: 'activity_fuel',
        kind: 'activity_fuel',
        title: 'Refuel after being active',
        message: `You've been active for ${activeMinutes} minutes today. ${phraseFor(food).replace(/^\w/, (c) => c.toUpperCase())} helps your body recover.`,
        reason: 'Active days need more fuel, especially carbohydrate and protein after exercise.',
        food: suggestion(food),
        mealType: 'snack',
        priority: 75,
      });
    }
  }

  if (recs.length === 0 && s.entryCount > 0) {
    recs.push({
      id: 'keep_going',
      kind: 'keep_going',
      title: 'You are on a good track',
      message: analysis.isBalanced
        ? `Your day looks balanced so far. Keep it going with a similar mix at ${MEAL_WORD[slot]}.`
        : `Keep going. A plate with a grain, a protein and a vegetable at ${MEAL_WORD[slot]} keeps things balanced.`,
      reason: 'Based on everything you have logged today.',
      priority: 10,
    });
  }

  return recs.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
