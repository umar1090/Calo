import { FOODS, type Food } from '@/data/foods';
import type { ExerciseLog, MealEntry, MealType, Profile } from '@/engine/types';
import { computeTargets, dayTargets } from '@/engine/nutrition/targets';
import { defaultPortion, entryFromDraft } from '@/engine/nutrition/foodMath';
import type { RecContext } from '@/engine/recommendations/foodRecs';
import type { AssistantContext } from '@/engine/assistant/assistant';

export const adult: Profile = {
  name: 'Asha Rao',
  age: 30,
  sex: 'female',
  heightCm: 162,
  weightKg: 60,
  activityLevel: 'moderate',
  goals: ['fitness'],
  dietType: 'vegetarian',
  allergies: [],
  cuisines: ['south_indian'],
  sports: ['walking', 'yoga'],
  equipment: ['none', 'yoga_mat'],
  minutesPerDay: 40,
  fitnessLevel: 'intermediate',
};

export const teen: Profile = {
  name: 'Kabir',
  age: 15,
  sex: 'male',
  heightCm: 170,
  weightKg: 60,
  activityLevel: 'moderate',
  goals: ['weight', 'fitness'],
  weightDirection: 'lose',
  weightPace: 'steady',
  dietType: 'eggetarian',
  allergies: [],
  cuisines: ['north_indian'],
  sports: ['football', 'cycling'],
  equipment: ['none'],
  minutesPerDay: 60,
  fitnessLevel: 'intermediate',
};

export const child: Profile = { ...teen, name: 'Mira', age: 10, sex: 'female', heightCm: 138, weightKg: 32, goals: ['habits'], weightDirection: undefined };

export const food = (id: string): Food => {
  const f = FOODS.find((x) => x.id === id);
  if (!f) throw new Error(`no food ${id}`);
  return f;
};

let counter = 0;
export function entry(foodId: string, mealType: MealType, date: string, qty = 1, time = '09:00'): MealEntry {
  const f = food(foodId);
  return entryFromDraft({ food: f, portion: defaultPortion(f), quantity: qty, oilLevel: 'normal', mealType }, date, `e${++counter}`, new Date(`${date}T${time}:00`).toISOString());
}

export function exercise(date: string, minutes: number, intensity: ExerciseLog['intensity'] = 'moderate', activity: ExerciseLog['activity'] = 'walking', strength = false): ExerciseLog {
  return { id: `x${++counter}`, date, activity, minutes, intensity, strength, boneLoading: false, loggedAt: new Date(`${date}T07:00:00`).toISOString() };
}

export function recContext(profile: Profile, opts: { date: string; now: Date; entries?: MealEntry[]; recent?: MealEntry[]; waterMl?: number; exercises?: ExerciseLog[] }): RecContext {
  const targets = computeTargets(profile);
  const exercises = opts.exercises ?? [];
  return {
    profile,
    targets,
    day: dayTargets(targets, profile, exercises),
    date: opts.date,
    now: opts.now,
    entries: opts.entries ?? [],
    waterMl: opts.waterMl ?? 0,
    exercises,
    foods: FOODS,
    recentEntries: opts.recent ?? [],
  };
}

export function assistantContext(profile: Profile, opts: Parameters<typeof recContext>[1] & { history?: ExerciseLog[] }): AssistantContext {
  return { ...recContext(profile, opts), exerciseHistory: opts.history ?? [] };
}
