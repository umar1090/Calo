import type { Food } from '@/data/foods';
import { MEAL_COMBOS, INGREDIENT_WORDS, PANTRY_RECIPES, type MealCombo } from '@/data/meals';
import { findFoodMentions } from '@/data/foodSearch';
import type { CheckIn, ExerciseLog, MealType, Nutrients, SleepLog } from '../types';
import { analyzeDay, joinOr, proteinFoodWords } from '../analysis/daily';
import { defaultPortion, portionNutrients, suitableFor, sumNutrients } from '../nutrition/foodMath';
import { recommendFoods, nextMealSlot, type FoodSuggestion, type RecContext } from '../recommendations/foodRecs';
import { calcActivity, weeklyActivity } from '../activity/engine';
import { ACTIVITIES } from '../activity/catalog';
import { addDays, dayOfYear, toISODate } from '../dates';
import { detectSafetyConcern, HELPLINES, type SafetyConcern } from './safety';
import { findUnsafePhrases } from '../safety/language';

export type Intent =
  | 'meal_breakfast'
  | 'meal_lunch'
  | 'meal_dinner'
  | 'meal_snack'
  | 'protein'
  | 'workout'
  | 'analyze'
  | 'pantry'
  | 'hydration'
  | 'sleep'
  | 'weight'
  | 'food_info'
  | 'greeting'
  | 'thanks'
  | 'help'
  | 'safety'
  | 'unknown';

export interface AssistantContext extends RecContext {
  exerciseHistory: ExerciseLog[];
  checkIn?: CheckIn;
  sleep?: SleepLog;
}

export interface ComboSuggestion {
  id: string;
  name: string;
  mealType: MealType;
  items: { foodId: string; name: string; portionId: string; portionLabel: string; qty: number }[];
  totals: Nutrients;
  vegServings: number;
  note?: string;
}

export interface AssistantReply {
  intent: Intent;
  text: string;
  suggestions: string[];
  foods?: FoodSuggestion[];
  combos?: ComboSuggestion[];
  safety?: SafetyConcern;
}

export const STARTER_PROMPTS = [
  'What should I eat for dinner?',
  'How can I improve my protein intake?',
  'What healthy Indian breakfast can I have?',
  'How active was I this week?',
  'Analyse my meals today.',
  'Suggest a healthy meal using what I have at home.',
];

// ---------------------------------------------------------------------------
// Intent detection
// ---------------------------------------------------------------------------

const has = (t: string, re: RegExp) => re.test(t);

export function detectPantryIngredients(text: string): string[] {
  const t = ` ${text.toLowerCase().replace(/[^a-z ]+/g, ' ')} `;
  return Object.entries(INGREDIENT_WORDS)
    .filter(([, words]) => words.some((w) => t.includes(` ${w} `)))
    .map(([k]) => k);
}

export function classifyIntent(text: string, foods: Food[]): Intent {
  const t = text.toLowerCase();
  if (detectSafetyConcern(t)) return 'safety';
  const pantryPhrase = has(t, /\b(i have|i've got|we have|at home|in (my|the) (fridge|kitchen)|what i have|leftover|ingredients|using|with only|make with|cook with)\b/);
  if (pantryPhrase && (detectPantryIngredients(t).length > 0 || has(t, /what i have|at home|ingredients/))) return 'pantry';
  if (has(t, /\b(how many|calories in|protein in|carbs? in|fat in|nutrition (of|in|for)|is [a-z ]+ (healthy|good|ok|okay))\b/) && findFoodMentions(foods, t).length) return 'food_info';
  if (has(t, /\b(analy[sz]e|analysis|review|how (did|am|was) i|how was my|how('?s| is) my (day|diet|eating)|my meals today|today'?s meals|summary|rate my|check my (day|meals|food))\b/)) return 'analyze';
  if (has(t, /\bprotein\b/)) return 'protein';
  if (has(t, /\b(work ?out|workouts|exercise|exercised|training|train|gym|active|activity|activities|yoga|sport|run|running|ran|walk|walked|cycling|fitness|stretch|steps)\b/)) return 'workout';
  if (has(t, /\b(breakfast|nashta|morning meal)\b/)) return 'meal_breakfast';
  if (has(t, /\blunch\b/)) return 'meal_lunch';
  if (has(t, /\b(dinner|supper|tonight|night meal)\b/)) return 'meal_dinner';
  if (has(t, /\b(snack|hungry|evening|tiffin|munch)\b/)) return 'meal_snack';
  if (has(t, /\b(water|hydrat\w*|thirst\w*|drink more)\b/)) return 'hydration';
  if (has(t, /\b(sleep|slept|insomnia|bedtime|tired|fatigue|rest day|recover\w*)\b/)) return 'sleep';
  if (has(t, /\b(weight|lose|gain|slim|bmi|belly)\b/)) return 'weight';
  if (has(t, /\b(what should i eat|meal idea|what to eat|what can i eat|suggest (a )?meal|healthy meal)\b/)) return 'meal_dinner';
  if (has(t, /^\s*(hi|hello|hey|namaste|hola|good (morning|afternoon|evening))\b/)) return 'greeting';
  if (has(t, /\b(thank|thanks|thx|great|awesome|cool)\b/)) return 'thanks';
  if (has(t, /\b(help|what can you|how do you work)\b/)) return 'help';
  if (findFoodMentions(foods, t).length) return 'food_info';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isYouth(ctx: AssistantContext) {
  const g = ctx.targets.rules.ageGroup;
  return g === 'child' || g === 'teen';
}

function nutrientLine(ctx: AssistantContext, n: Nutrients, veg?: number): string {
  const parts: string[] = [];
  if (!isYouth(ctx)) parts.push(`~${Math.round(n.kcal)} kcal`);
  parts.push(`${Math.round(n.protein)} g protein`);
  if (veg !== undefined && veg >= 0.5) parts.push(`${Math.round(veg * 10) / 10} veg servings`);
  return parts.join(' · ');
}

function foodById(ctx: AssistantContext, id: string) {
  return ctx.foods.find((f) => f.id === id);
}

export function buildCombo(ctx: AssistantContext, combo: MealCombo, mealType: MealType): ComboSuggestion | null {
  const items: ComboSuggestion['items'] = [];
  const nutrients: Nutrients[] = [];
  let veg = 0;
  for (const it of combo.items) {
    const food = foodById(ctx, it.foodId);
    if (!food || !suitableFor(ctx.profile, food)) return null;
    const portion = food.portions.find((p) => p.id === it.portionId) ?? defaultPortion(food);
    items.push({ foodId: food.id, name: food.name, portionId: portion.id, portionLabel: portion.label, qty: it.qty });
    nutrients.push(portionNutrients(food, portion.grams, it.qty));
    veg += (food.vegFraction * portion.grams * it.qty) / 80;
  }
  return { id: combo.id, name: combo.name, mealType, items, totals: sumNutrients(nutrients), vegServings: Math.round(veg * 10) / 10, note: combo.note };
}

export function suggestCombos(ctx: AssistantContext, meal: MealType, count = 3): ComboSuggestion[] {
  const analysis = analyzeDay(ctx);
  const proteinGap = analysis.proteinStatus === 'low';
  const vegGap = analysis.summary.vegServings < 2;
  const recentIds = new Set([...ctx.entries, ...ctx.recentEntries.filter((e) => e.date >= addDays(ctx.date, -1))].map((e) => e.foodId));
  const mealKey: MealType = meal === 'beverage' ? 'snack' : meal;
  const built = MEAL_COMBOS.filter((c) => c.meal.includes(mealKey))
    .map((c) => buildCombo(ctx, c, mealKey))
    .filter((c): c is ComboSuggestion => c !== null);
  const cuisineMatch = (c: ComboSuggestion) =>
    c.items.some((i) => {
      const f = foodById(ctx, i.foodId);
      return f && ctx.profile.cuisines.length > 0 && f.cuisines.some((x) => ctx.profile.cuisines.includes(x)) && !f.cuisines.includes('continental');
    })
      ? 1
      : 0;
  const scored = built.map((c, i) => {
    let score = 0;
    score += proteinGap ? c.totals.protein * 1.5 : c.totals.protein * 0.5;
    score += vegGap ? c.vegServings * 8 : c.vegServings * 3;
    score += cuisineMatch(c) * 6;
    score -= c.items.filter((it) => recentIds.has(it.foodId)).length * 6;
    score += ((dayOfYear(ctx.date) + i) % 5) * 0.8; // gentle daily rotation
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map((s) => s.c);
}

const MEAL_LABEL: Record<MealType, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snack: 'snack', beverage: 'drink' };

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

function safetyReply(kind: SafetyConcern, ctx: AssistantContext): AssistantReply {
  const youth = isYouth(ctx);
  switch (kind) {
    case 'crisis':
      return {
        intent: 'safety',
        safety: kind,
        text: `I'm really sorry you're feeling this way. You deserve support from a real person right now.\n\n- ${HELPLINES.teleManas}\n- ${HELPLINES.emergency}\n\n${youth ? 'Please also tell a parent, teacher or another adult you trust.' : 'If you can, reach out to someone you trust and let them know how you are feeling.'} I'm here for food and activity questions whenever you want to come back.`,
        suggestions: [],
      };
    case 'disordered_eating':
      return {
        intent: 'safety',
        safety: kind,
        text: `Thank you for sharing that. It sounds like food or your body might be feeling hard right now, and that matters.\n\nYour body needs regular, enough food every day${youth ? ', especially while you are growing' : ''}. Going long periods without eating, or trying to get rid of food, can harm your health.\n\nTalking to someone can really help:\n- ${youth ? 'A parent, school counsellor or doctor you trust' : 'A doctor, registered dietitian or counsellor'}\n- ${HELPLINES.teleManas}\n\nIf you'd like, I can suggest simple, comforting meal ideas for today.`,
        suggestions: ['Suggest a simple, comforting meal', 'What is a good snack?'],
      };
    case 'compensation':
      return {
        intent: 'safety',
        safety: kind,
        text: `There's no need to balance food out with exercise. Food is fuel and enjoyment, and one meal or treat doesn't undo anything.\n\nMovement is best for how it makes you feel: stronger, more energetic, better sleep. Your next meal can simply be a regular, balanced one.`,
        suggestions: ['What should I eat for dinner?', 'How active was I this week?'],
      };
    case 'extreme_diet':
      return {
        intent: 'safety',
        safety: kind,
        text: youth
          ? `Fast or extreme diets aren't safe while you're still growing, and NutriTrack doesn't set weight-change targets for under-18s. What helps most: regular balanced meals, activity you enjoy, and good sleep.\n\nIf you're worried about your weight or body, please talk to a parent or doctor. They can give advice that fits you.`
          : `Very fast weight change usually means losing muscle and water, and it rarely lasts. A gradual pace of about 0.25–0.5 kg a week is safer and easier to keep.\n\nNutriTrack can set a gentle estimate if you choose "Weight management" in your profile. For bigger goals, a registered dietitian can build a plan around your health.`,
        suggestions: ['How can I improve my protein intake?', 'How active was I this week?'],
      };
    case 'medical':
      return {
        intent: 'safety',
        safety: kind,
        text: `I can't diagnose conditions or suggest a diet for a medical condition. That needs your doctor or a registered dietitian, who knows your health history and test results.\n\nWhat I can do is help with everyday balanced eating: regular meals with dal or other protein, vegetables, whole grains and fruit, and tracking what you eat so you can share it with your doctor.`,
        suggestions: ['Analyse my meals today.', 'What healthy Indian breakfast can I have?'],
      };
    case 'supplement':
      return {
        intent: 'safety',
        safety: kind,
        text: youth
          ? `Most teens get all the protein they need from food, and supplements like protein powders or creatine aren't recommended under 18 unless a doctor advises them. Everyday foods work brilliantly: ${joinOr(proteinFoodWords(ctx.profile, 4))}.`
          : `Most people can meet their protein needs from everyday food, which is cheaper and comes with fibre, vitamins and minerals. Supplements aren't necessary for most people; if you're considering one, check with a doctor or registered dietitian. Food-first options: ${joinOr(proteinFoodWords(ctx.profile, 5))}.`,
        suggestions: ['How can I improve my protein intake?'],
      };
  }
}

function mealReply(ctx: AssistantContext, meal: MealType): AssistantReply {
  const combos = suggestCombos(ctx, meal);
  const analysis = analyzeDay(ctx);
  const youth = isYouth(ctx);
  const lines: string[] = [];
  const isToday = ctx.date === toISODate(ctx.now);
  if (analysis.summary.entryCount > 0 && isToday) {
    const notes: string[] = [];
    if (analysis.proteinStatus === 'low') notes.push(`protein is at about ${Math.round(analysis.summary.totals.protein)} g so far, so I've picked protein-rich options`);
    if (analysis.summary.vegServings < 2) notes.push('vegetables have been light today, so these include sabzi or salad');
    if (notes.length) lines.push(`Based on today: ${notes.join(', and ')}.`);
  }
  if (!combos.length) {
    return {
      intent: `meal_${meal === 'beverage' ? 'snack' : meal}` as Intent,
      text: "I couldn't find a combination that fits your diet and allergy settings. Try telling me what you have at home and I'll suggest something.",
      suggestions: ['Suggest a healthy meal using what I have at home.'],
    };
  }
  const intro = meal === 'breakfast' ? 'Here are some healthy Indian breakfast ideas' : `Here are a few ${MEAL_LABEL[meal]} ideas`;
  lines.unshift(`${intro}${ctx.profile.name ? `, ${ctx.profile.name.split(' ')[0]}` : ''}:`);
  const notes = combos.map((c) => c.note).filter(Boolean);
  if (notes.length) lines.push(`Tip: ${notes[0]}`);
  lines.push(youth ? 'Choose what you feel like; portions can grow with your appetite.' : 'Adjust portions to your hunger. You can log any of these with one tap.');
  return {
    intent: `meal_${meal === 'beverage' ? 'snack' : meal}` as Intent,
    text: lines.join('\n'),
    combos,
    suggestions: meal === 'dinner' ? ['How can I improve my protein intake?', 'Analyse my meals today.'] : ['What should I eat for dinner?', 'Analyse my meals today.'],
  };
}

function proteinReply(ctx: AssistantContext): AssistantReply {
  const a = analyzeDay(ctx);
  const t = ctx.targets;
  const week = [...ctx.recentEntries];
  const days = new Set(week.map((e) => e.date));
  const avg = days.size ? week.reduce((s, e) => s + e.nutrients.protein, 0) / days.size : 0;
  const top = ctx.foods
    .filter((f) => !f.custom && suitableFor(ctx.profile, f) && f.cost <= 2 && ['dal', 'curry', 'dairy', 'eggs', 'meat', 'fish', 'snacks', 'salad', 'breakfast'].includes(f.category))
    .map((f) => {
      const p = defaultPortion(f);
      return { f, p, n: portionNutrients(f, p.grams, 1) };
    })
    .filter((x) => x.n.protein >= 6)
    .sort((a1, b1) => b1.n.protein / Math.max(b1.n.kcal, 1) - a1.n.protein / Math.max(a1.n.kcal, 1))
    .slice(0, 6);
  const lines = [
    `Your estimated protein need is about **${t.protein.min}–${t.protein.max} g a day**. Today you've logged **${Math.round(a.summary.totals.protein)} g**${days.size ? `, and over the last ${days.size} day${days.size > 1 ? 's' : ''} you averaged about ${Math.round(avg)} g` : ''}.`,
    '',
    'Easy ways to add more, using everyday foods:',
    `- Have a bowl of dal, rajma or chole at both lunch and dinner`,
    ...(ctx.profile.allergies.includes('dairy') || ctx.profile.dietType === 'vegan' ? ['- Add tofu, soya chunks or soy milk a few times a week'] : ['- Add a bowl of curd or a glass of milk or buttermilk to meals']),
    ...(['eggetarian', 'non_vegetarian'].includes(ctx.profile.dietType) && !ctx.profile.allergies.includes('egg') ? ['- Eggs at breakfast: boiled, bhurji or an omelette'] : []),
    '- Snack on roasted chana, sprouts or peanuts instead of biscuits',
    '- Make chillas with moong dal or besan for breakfast',
    '',
    'Good protein sources for you (per usual portion):',
    ...top.map((x) => `- ${x.f.name} (${x.p.label}): ${x.n.protein} g`),
    '',
    'Spreading protein across meals works better than having it all at once.',
  ];
  return { intent: 'protein', text: lines.join('\n'), foods: top.slice(0, 3).map((x) => ({ foodId: x.f.id, name: x.f.name, portionId: x.p.id, portionLabel: x.p.label, kcal: x.n.kcal, protein: x.n.protein })), suggestions: ['What should I eat for dinner?', 'Suggest a high-protein snack'] };
}

function activityReply(ctx: AssistantContext): AssistantReply {
  const rules = ctx.targets.rules;
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const week = weeklyActivity(ctx.exerciseHistory.filter((l) => l.date <= ctx.date), ctx.date, rules, ctx.profile);
  const today = ctx.exerciseHistory.filter((l) => l.date === ctx.date);
  const lines: string[] = [];
  if (today.length) {
    lines.push('**Today**');
    for (const l of today) {
      const c = calcActivity(l, ctx.profile);
      lines.push(`- ${ACTIVITIES[l.activity].label}: ${l.minutes} min, ${c.intensity}${c.distanceKm ? `, ${c.distanceKm} km` : ''}${c.kcal !== undefined ? `, about ${c.kcal} kcal` : ''}`);
    }
    if (ctx.day.extraKcal > 0 || ctx.day.waterMl > ctx.targets.waterMl) {
      lines.push(
        youth
          ? 'Because you were active, your body needs a little more food and water today.'
          : `Because of this, today's estimates went up${ctx.day.extraKcal > 0 ? ` by about ${ctx.day.extraKcal} kcal` : ''}${ctx.day.waterMl > ctx.targets.waterMl ? ` and ${((ctx.day.waterMl - ctx.targets.waterMl) / 1000).toFixed(2).replace(/0$/, '')} L of water` : ''}.`,
      );
    }
  } else {
    lines.push("You haven't logged any activity today. When you do something active, log it in the Move tab and I'll factor it into your food and water estimates.");
  }
  lines.push('', '**This week**');
  lines.push(
    youth
      ? `- ${week.totalMinutes} active minutes (about 420 a week averages 60 a day)`
      : `- ${week.guidelineMinutes} of ${week.guidelineTarget} guideline minutes (vigorous count double)`,
  );
  lines.push(`- ${week.activeDays} active day${week.activeDays === 1 ? '' : 's'}, ${week.strengthDays} with strength activity`);
  if (week.kcal) lines.push(`- About ${week.kcal} kcal used through logged activity (estimate)`);
  if (week.byActivity.length) lines.push(`- Most time on ${ACTIVITIES[week.byActivity[0].activity].label.toLowerCase()} (${week.byActivity[0].minutes} min)`);
  return { intent: 'workout', text: lines.join('\n'), suggestions: ['What should I eat after being active?', 'How much water should I drink?'] };
}

function analyzeReply(ctx: AssistantContext): AssistantReply {
  const a = analyzeDay(ctx);
  const s = a.summary;
  const youth = isYouth(ctx);
  if (s.entryCount === 0) {
    return {
      intent: 'analyze',
      text: "You haven't logged any food for today yet. Add your meals in the Log tab and ask me again. I'll look at protein, vegetables, fruit, fibre and water.",
      suggestions: ['What healthy Indian breakfast can I have?', 'What should I eat for dinner?'],
    };
  }
  const lines: string[] = ['Here is how today looks so far:'];
  lines.push(`- Meals logged: ${s.mealsLogged.map((m) => MEAL_LABEL[m]).join(', ')} (${s.entryCount} item${s.entryCount > 1 ? 's' : ''})`);
  if (ctx.targets.rules.energyFraming === 'target') lines.push(`- Energy: ~${Math.round(s.totals.kcal)} kcal of an estimated ${ctx.day.energyTarget} kcal`);
  else if (ctx.targets.rules.energyFraming === 'reference') lines.push(`- Energy: ~${Math.round(s.totals.kcal)} kcal (typical needs for your age: ${ctx.day.energyRange.min}–${ctx.day.energyRange.max} kcal)`);
  lines.push(`- Protein: ${Math.round(s.totals.protein)} g (aim ${ctx.targets.protein.min}–${ctx.targets.protein.max} g)`);
  lines.push(`- Carbs ${Math.round(s.totals.carbs)} g · Fat ${Math.round(s.totals.fat)} g · Fibre ${Math.round(s.totals.fiber)} g`);
  lines.push(`- Vegetables: ${s.vegServings} servings · Fruit: ${s.fruitServings} servings`);
  lines.push(`- Water: ${(s.waterMl / 1000).toFixed(1)} L of ~${(ctx.day.waterMl / 1000).toFixed(1)} L`);
  lines.push('');
  a.feedback.slice(0, 4).forEach((f) => lines.push(`**${f.title}.** ${f.text}`));
  const recs = recommendFoods(ctx, 2).filter((r) => !a.feedback.some((f) => f.text === r.message));
  if (recs.length) {
    lines.push('', 'Next steps:');
    recs.forEach((r) => lines.push(`- ${r.message}`));
  }
  if (youth) lines.push('', 'Remember: there is no perfect day of eating. Regular, varied meals are what count.');
  return { intent: 'analyze', text: lines.join('\n'), foods: recs.map((r) => r.food).filter((f): f is FoodSuggestion => Boolean(f)), suggestions: ['What should I eat for dinner?', 'How can I improve my protein intake?'] };
}

function pantryReply(ctx: AssistantContext, text: string): AssistantReply {
  const have = detectPantryIngredients(text);
  if (!have.length) {
    return {
      intent: 'pantry',
      text: 'Tell me what you have and I will suggest something. For example: "I have rice, moong dal, onion and curd" or "eggs, bread and tomatoes".',
      suggestions: ['I have rice, dal, onion and tomato', 'I have eggs, bread and onion', 'I have besan, curd and spinach'],
    };
  }
  const usable = have.filter((h) => ingredientFitsDiet(h, ctx));
  const haveSet = new Set(usable);
  const slot = nextMealSlot(ctx.date, ctx.now, ctx.entries);
  const options = PANTRY_RECIPES.map((r) => {
    const food = foodById(ctx, r.foodId);
    const ok = food && suitableFor(ctx.profile, food);
    const missing = r.needs.filter((n) => !haveSet.has(n));
    const extra = r.optional.filter((o) => haveSet.has(o)).length;
    return { r, food, ok, missing, score: (missing.length === 0 ? 10 : 0) + extra * 2 + r.needs.filter((n) => haveSet.has(n)).length * 3 + (r.meal.includes(slot) ? 2 : 0) };
  })
    .filter((x) => x.ok && x.missing.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  if (!options.length) {
    return {
      intent: 'pantry',
      text: `With ${joinAnd(usable.length ? usable : have)}, I couldn't match a full recipe that fits your diet and allergies. A simple idea: combine a grain (rice, roti, poha) with a protein (${joinOr(proteinFoodWords(ctx.profile, 4))}) and any vegetable you have. Tell me a few more ingredients and I'll try again.`,
      suggestions: ['I have rice, dal, onion and tomato'],
    };
  }
  const lines = [`With ${joinAnd(usable)}, you could make:`];
  const offDiet = have.filter((h) => !ingredientFitsDiet(h, ctx));
  if (offDiet.length) lines.unshift(`I've left out ${joinAnd(offDiet)} because ${offDiet.length > 1 ? "they're" : "it's"} not in your diet settings.`);
  for (const o of options) {
    const p = defaultPortion(o.food!);
    const n = portionNutrients(o.food!, p.grams, 1);
    lines.push('', `**${o.r.name}** (${o.r.minutes} min, ${nutrientLine(ctx, n)} per ${p.label})`);
    o.r.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  if (!have.some((h) => ['dal', 'egg', 'paneer', 'curd', 'chana', 'rajma', 'chicken', 'fish', 'soya', 'tofu', 'sprouts', 'milk', 'besan'].includes(h))) {
    lines.push('', 'Tip: none of these ingredients is a strong protein source. If you have curd, dal or eggs, add them to make the meal more filling.');
  }
  return {
    intent: 'pantry',
    text: lines.join('\n'),
    foods: options.map((o) => {
      const p = defaultPortion(o.food!);
      const n = portionNutrients(o.food!, p.grams, 1);
      return { foodId: o.food!.id, name: o.food!.name, portionId: p.id, portionLabel: p.label, kcal: n.kcal, protein: n.protein };
    }),
    suggestions: ['What should I eat for dinner?'],
  };
}

function joinAnd(words: string[]): string {
  return joinOr(words).replace(/ or ([^,]+)$/, ' and $1');
}

const INGREDIENT_DIET: Record<string, { diets: string[]; allergen?: string }> = {
  egg: { diets: ['eggetarian', 'non_vegetarian'], allergen: 'egg' },
  chicken: { diets: ['non_vegetarian'] },
  fish: { diets: ['non_vegetarian'], allergen: 'fish' },
  paneer: { diets: ['vegetarian', 'eggetarian', 'non_vegetarian', 'jain'], allergen: 'dairy' },
  curd: { diets: ['vegetarian', 'eggetarian', 'non_vegetarian', 'jain'], allergen: 'dairy' },
  milk: { diets: ['vegetarian', 'eggetarian', 'non_vegetarian', 'jain'], allergen: 'dairy' },
  peanuts: { diets: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian', 'jain'], allergen: 'peanut' },
  potato: { diets: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'] },
  onion: { diets: ['vegan', 'vegetarian', 'eggetarian', 'non_vegetarian'] },
};

function ingredientFitsDiet(ingredient: string, ctx: AssistantContext): boolean {
  const rule = INGREDIENT_DIET[ingredient];
  if (!rule) return true;
  if (!rule.diets.includes(ctx.profile.dietType)) return false;
  return !(rule.allergen && ctx.profile.allergies.includes(rule.allergen as never));
}

function hydrationReply(ctx: AssistantContext): AssistantReply {
  const glasses = Math.round(ctx.waterMl / 250);
  const goal = Math.round(ctx.day.waterMl / 250);
  return {
    intent: 'hydration',
    text: [
      `A good everyday aim for you is about **${(ctx.day.waterMl / 1000).toFixed(1)} L** from drinks (around ${goal} glasses)${ctx.day.waterMl > ctx.targets.waterMl ? ', a little more today because you were active' : ''}. You've logged ${glasses} glass${glasses === 1 ? '' : 'es'} today.`,
      '',
      '- Keep a filled bottle where you can see it',
      '- Have a glass with every meal',
      '- Buttermilk, coconut water and nimbu pani (with little sugar) count too',
      '- Drink more on hot days and when you sweat during sport',
      '',
      'Thirst and pale-yellow urine are good guides.',
    ].join('\n'),
    suggestions: ['Analyse my meals today.'],
  };
}

function sleepReply(ctx: AssistantContext): AssistantReply {
  const g = ctx.targets.rules.ageGroup;
  const range = g === 'child' ? '9–12 hours' : g === 'teen' ? '8–10 hours' : '7–9 hours';
  const lines = [
    `Sleep is when your body recovers and${g === 'teen' || g === 'child' ? ' grows' : ' repairs'}. The general recommendation for your age is **${range}** a night.`,
  ];
  if (ctx.sleep) lines.push(`You logged ${ctx.sleep.hours} hours last night.`);
  lines.push('', '- Keep a regular bedtime, even on weekends', '- Put screens away 30–60 minutes before bed', '- Avoid tea or coffee late in the day', '- A short walk outdoors in daylight helps your body clock');
  if (ctx.checkIn && ctx.checkIn.fatigue >= 4) lines.push('', 'You said you feel quite tired today. Rest and easy days are part of getting fitter.');
  return { intent: 'sleep', text: lines.join('\n'), suggestions: ['How active was I this week?'] };
}

function weightReply(ctx: AssistantContext): AssistantReply {
  const rules = ctx.targets.rules;
  if (rules.ageGroup === 'child') {
    return {
      intent: 'weight',
      text: 'Growing bodies come in all shapes and sizes, and they change a lot as you grow. NutriTrack does not set weight goals for children. Regular meals, active play and good sleep are what matter. If you have questions about your growth, talk to a parent and your doctor.',
      suggestions: ['What is a good snack?', 'How active was I this week?'],
    };
  }
  if (rules.ageGroup === 'teen') {
    return {
      intent: 'weight',
      text: 'During your teens your body is still growing, so weight naturally changes. NutriTrack does not set weight-change or calorie targets for under-18s. What helps most:\n\n- Regular meals with protein, vegetables and whole grains\n- About 60 minutes of activity you enjoy most days\n- 8–10 hours of sleep\n\nIf you are worried about your weight or how your body is changing, a doctor or registered dietitian can give advice that fits you.',
      suggestions: ['How can I improve my protein intake?', 'How active was I this week?'],
    };
  }
  const t = ctx.targets;
  const lines = [`Your estimated maintenance is about **${t.maintenance} kcal/day** (${t.maintenanceRange.min}–${t.maintenanceRange.max}).`];
  if (t.adjustment) lines.push(`Based on your goal, your daily estimate is **${t.energyTarget} kcal**: ${t.adjustment.label}`);
  else lines.push('Your profile is set to maintain. You can choose "Weight management" in your profile for a gentle, gradual estimate.');
  lines.push(
    '',
    'What tends to work long term:',
    '- Plenty of protein and vegetables at each meal, which keep you full',
    '- Mostly home-cooked food with moderate oil',
    '- Strength training 2+ days a week to keep muscle',
    '- Consistency over perfection; weekly trends matter more than single days',
  );
  return { intent: 'weight', text: lines.concat(t.notes.length ? ['', t.notes[0]] : []).join('\n'), suggestions: ['How can I improve my protein intake?', 'How active was I this week?'] };
}

function foodInfoReply(ctx: AssistantContext, text: string): AssistantReply {
  const food = findFoodMentions(ctx.foods, text)[0];
  if (!food) return helpReply();
  const p = defaultPortion(food);
  const n = portionNutrients(food, p.grams, 1);
  const youth = isYouth(ctx);
  const lines = [`**${food.name}** (${p.label}, about ${p.grams} ${food.unit}):`, `- ${n.kcal} kcal · ${n.protein} g protein · ${n.carbs} g carbs · ${n.fat} g fat · ${n.fiber} g fibre`];
  if (food.portions.length > 1) lines.push(`- Other portions: ${food.portions.filter((x) => x.id !== p.id).map((x) => x.label).join(', ')}`);
  if (food.homemade) lines.push('', 'Home recipes vary with oil, ghee and portion size, so treat this as an estimate. You can adjust oil level when logging.');
  const asksHealthy = /\b(healthy|good|ok|okay|bad)\b/i.test(text);
  if (asksHealthy) {
    const treat = food.groups.some((g) => g === 'fried' || g === 'sweet' || g === 'sugary_drink');
    const nourishing = food.groups.some((g) => ['vegetable', 'fruit', 'pulse', 'whole_grain', 'dairy', 'egg', 'meat_fish', 'soy', 'nut_seed'].includes(g));
    lines.push(
      '',
      treat
        ? `All foods can fit into balanced eating. ${food.name} is something many people enjoy now and then alongside regular meals with dal, vegetables and whole grains.`
        : nourishing
          ? `${food.name} is a nourishing everyday choice${youth ? ' for growing bodies' : ''}, especially as part of a meal with protein and vegetables.`
          : `${food.name} can be part of a balanced plate. Pair it with protein and vegetables.`,
    );
  }
  return {
    intent: 'food_info',
    text: lines.join('\n'),
    foods: [{ foodId: food.id, name: food.name, portionId: p.id, portionLabel: p.label, kcal: n.kcal, protein: n.protein }],
    suggestions: ['How can I improve my protein intake?'],
  };
}

function helpReply(): AssistantReply {
  return {
    intent: 'help',
    text: "I'm your NutriTrack coach. I use your profile and food log to help with:\n\n- Meal ideas for breakfast, lunch, dinner and snacks\n- Getting enough protein with everyday Indian foods\n- A summary of the activity you've logged\n- A quick analysis of what you've eaten\n- Recipes from what you have at home\n- Nutrition for a specific food (\"How much protein in paneer?\")\n\nI don't give medical advice or diets for medical conditions.",
    suggestions: STARTER_PROMPTS.slice(0, 4),
  };
}

/** Runs the reply through the shared language filter; if anything slips through, fall back to a safe message. */
function guard(reply: AssistantReply, ctx: AssistantContext): AssistantReply {
  const hits = findUnsafePhrases(reply.text, ctx.targets.rules.ageGroup);
  if (hits.length === 0) return reply;
  return { ...helpReply(), intent: reply.intent };
}

export function respond(ctx: AssistantContext, text: string): AssistantReply {
  const concern = detectSafetyConcern(text);
  if (concern) return guard(safetyReply(concern, ctx), ctx);
  const intent = classifyIntent(text, ctx.foods);
  let reply: AssistantReply;
  switch (intent) {
    case 'meal_breakfast':
      reply = mealReply(ctx, 'breakfast');
      break;
    case 'meal_lunch':
      reply = mealReply(ctx, 'lunch');
      break;
    case 'meal_dinner':
      reply = mealReply(ctx, /\b(dinner|supper|tonight)\b/i.test(text) ? 'dinner' : nextMealSlot(ctx.date, ctx.now, ctx.entries));
      break;
    case 'meal_snack':
      reply = mealReply(ctx, 'snack');
      break;
    case 'protein':
      reply = /\bsnack\b/i.test(text) ? mealReply(ctx, 'snack') : proteinReply(ctx);
      break;
    case 'workout':
      reply = /\b(eat|food|meal)\b/i.test(text) ? mealReply(ctx, 'snack') : activityReply(ctx);
      break;
    case 'analyze':
      reply = analyzeReply(ctx);
      break;
    case 'pantry':
      reply = pantryReply(ctx, text);
      break;
    case 'hydration':
      reply = hydrationReply(ctx);
      break;
    case 'sleep':
      reply = sleepReply(ctx);
      break;
    case 'weight':
      reply = weightReply(ctx);
      break;
    case 'food_info':
      reply = foodInfoReply(ctx, text);
      break;
    case 'greeting':
      reply = {
        intent,
        text: `Namaste${ctx.profile.name ? ` ${ctx.profile.name.split(' ')[0]}` : ''}! What can I help with today? I can suggest meals, check your protein, summarise your activity or look over what you've eaten.`,
        suggestions: STARTER_PROMPTS.slice(0, 4),
      };
      break;
    case 'thanks':
      reply = { intent, text: "You're welcome! Small, steady habits add up. Ask me anything else whenever you like.", suggestions: STARTER_PROMPTS.slice(0, 3) };
      break;
    default:
      reply = { ...helpReply(), intent: intent === 'help' ? 'help' : 'unknown' };
  }
  return guard(reply, ctx);
}

export { capitalize };
