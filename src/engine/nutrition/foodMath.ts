import type { Food, Portion } from '@/data/foods';
import type { Allergen, DietType, MealEntry, MealType, Nutrients, OilLevel } from '../types';

/** One teaspoon of oil or ghee ≈ 5 g fat ≈ 45 kcal. */
export const OIL_TSP = { kcal: 45, fat: 5 } as const;

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function roundNutrients(n: Nutrients): Nutrients {
  return { kcal: Math.round(n.kcal), protein: r1(n.protein), carbs: r1(n.carbs), fat: r1(n.fat), fiber: r1(n.fiber) };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat, fiber: a.fiber + b.fiber };
}

export function sumNutrients(list: Nutrients[]): Nutrients {
  return roundNutrients(list.reduce(addNutrients, ZERO));
}

export function defaultPortion(food: Food): Portion {
  return food.portions.find((p) => p.id === food.defaultPortionId) ?? food.portions[0];
}

/**
 * Nutrients for `quantity` × `grams` of a food. For home-cooked dishes the oil
 * level adds about one teaspoon of oil per default serving, or removes up to one.
 */
export function portionNutrients(food: Food, grams: number, quantity: number, oil: OilLevel = 'normal'): Nutrients {
  const factor = (grams * quantity) / 100;
  const n: Nutrients = {
    kcal: food.per100.kcal * factor,
    protein: food.per100.protein * factor,
    carbs: food.per100.carbs * factor,
    fat: food.per100.fat * factor,
    fiber: food.per100.fiber * factor,
  };
  if (food.oilAdjustable && oil !== 'normal') {
    const servings = (grams * quantity) / defaultPortion(food).grams;
    // "More" adds a teaspoon per serving; "less" removes up to a teaspoon but never more than half the dish's fat.
    const fat = oil === 'more' ? n.fat + servings * OIL_TSP.fat : n.fat - Math.min(servings * OIL_TSP.fat, n.fat * 0.5);
    n.kcal = Math.max(0, n.kcal + (fat - n.fat) * 9);
    n.fat = fat;
  }
  return roundNutrients(n);
}

export function vegServings(food: Food, grams: number, quantity: number): number {
  return r1((food.vegFraction * grams * quantity) / 80);
}

export function fruitServings(food: Food, grams: number, quantity: number): number {
  return r1((food.fruitFraction * grams * quantity) / 80);
}

export interface EntryDraft {
  food: Food;
  portion: Portion;
  quantity: number;
  oilLevel: OilLevel;
  mealType: MealType;
  /** When set, replaces the computed nutrients (user-edited values). */
  override?: Nutrients;
}

export function entryFromDraft(d: EntryDraft, date: string, id: string, loggedAt: string): MealEntry {
  const computed = portionNutrients(d.food, d.portion.grams, d.quantity, d.oilLevel);
  return {
    id,
    date,
    mealType: d.mealType,
    foodId: d.food.id,
    foodName: d.food.name,
    portionLabel: d.portion.label,
    quantity: d.quantity,
    grams: Math.round(d.portion.grams * d.quantity),
    nutrients: d.override ? roundNutrients(d.override) : computed,
    groups: d.food.groups,
    vegServings: vegServings(d.food, d.portion.grams, d.quantity),
    fruitServings: fruitServings(d.food, d.portion.grams, d.quantity),
    oilLevel: d.food.oilAdjustable ? d.oilLevel : undefined,
    edited: Boolean(d.override),
    loggedAt,
  };
}

// ---------------------------------------------------------------------------
// Diet & allergy filters
// ---------------------------------------------------------------------------

export function dietAllows(diet: DietType, food: Food): boolean {
  switch (diet) {
    case 'vegan':
      return food.diet === 'vegan';
    case 'vegetarian':
      return food.diet === 'vegan' || food.diet === 'veg';
    case 'jain':
      return (food.diet === 'vegan' || food.diet === 'veg') && !food.rootVeg;
    case 'eggetarian':
      return food.diet !== 'nonveg';
    case 'non_vegetarian':
      return true;
  }
}

export function allergySafe(allergies: Allergen[], food: Food): boolean {
  return !food.allergens.some((a) => allergies.includes(a));
}

export function suitableFor(p: { dietType: DietType; allergies: Allergen[] }, food: Food): boolean {
  return dietAllows(p.dietType, food) && allergySafe(p.allergies, food);
}
