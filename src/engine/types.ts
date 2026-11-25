/**
 * Shared domain types for the NutriTrack engine.
 * The engine is pure TypeScript (no React, no storage) so it can be unit-tested
 * and reused by any persistence layer.
 */

export type Sex = 'male' | 'female' | 'unspecified';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very' | 'extreme';

export type Goal = 'fitness' | 'maintain' | 'strength' | 'endurance' | 'habits' | 'weight';

/** Only used by adults who choose the weight-management goal. */
export type WeightDirection = 'lose' | 'gain' | 'maintain';
export type WeightPace = 'gentle' | 'steady';

export type DietType = 'vegetarian' | 'eggetarian' | 'non_vegetarian' | 'vegan' | 'jain';

export type Allergen =
  | 'dairy'
  | 'gluten'
  | 'peanut'
  | 'tree_nut'
  | 'soy'
  | 'egg'
  | 'fish'
  | 'shellfish'
  | 'sesame';

export type Cuisine = 'north_indian' | 'south_indian' | 'west_indian' | 'east_indian' | 'continental';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'beverage';

export type ActivityType =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'basketball'
  | 'football'
  | 'cricket'
  | 'badminton'
  | 'swimming'
  | 'gym'
  | 'bodyweight'
  | 'yoga'
  | 'stretching'
  | 'dance'
  | 'hiit'
  | 'skipping'
  | 'hiking'
  | 'stairs'
  | 'tennis'
  | 'table_tennis'
  | 'volleyball'
  | 'kabaddi'
  | 'aerobics'
  | 'martial_arts'
  | 'household'
  | 'other_sport';

export type Equipment = 'none' | 'dumbbells' | 'resistance_band' | 'gym_access' | 'bicycle' | 'yoga_mat' | 'skipping_rope';

export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

export type Intensity = 'light' | 'moderate' | 'vigorous';

export interface Profile {
  name?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goals: Goal[];
  weightDirection?: WeightDirection;
  weightPace?: WeightPace;
  dietType: DietType;
  allergies: Allergen[];
  cuisines: Cuisine[];
  sports: ActivityType[];
  equipment: Equipment[];
  minutesPerDay: number;
  fitnessLevel: FitnessLevel;
  limitations?: string;
  /** Pregnancy/breastfeeding switches off weight targets and adds a professional-guidance note. */
  lifeStage?: LifeStage;
}

export type LifeStage = 'none' | 'pregnant' | 'breastfeeding';

/** Age bands drive which formulas and safety rules apply. */
export type AgeGroup = 'child' | 'teen' | 'adult' | 'older_adult';

export interface Range {
  min: number;
  max: number;
}

export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export type FoodGroup =
  | 'vegetable'
  | 'fruit'
  | 'whole_grain'
  | 'refined_grain'
  | 'pulse'
  | 'dairy'
  | 'egg'
  | 'meat_fish'
  | 'soy'
  | 'nut_seed'
  | 'fried'
  | 'sweet'
  | 'sugary_drink';

/** What a logged meal entry carries (snapshot of values at time of logging). */
export interface MealEntry {
  id: string;
  date: string; // YYYY-MM-DD local
  mealType: MealType;
  foodId?: string;
  foodName: string;
  portionLabel: string;
  quantity: number;
  grams: number;
  nutrients: Nutrients;
  groups: FoodGroup[];
  vegServings: number;
  fruitServings: number;
  oilLevel?: OilLevel;
  edited?: boolean; // user manually adjusted values
  loggedAt: string; // ISO timestamp
}

export type OilLevel = 'less' | 'normal' | 'more';

export interface ExerciseLog {
  id: string;
  date: string;
  activity: ActivityType;
  minutes: number;
  intensity: Intensity;
  notes?: string;
  /** Optional, for walking, running, cycling, swimming and hiking: used to work out pace and energy. */
  distanceKm?: number;
  /** Optional, for walking: converted to distance from the user's height. */
  steps?: number;
  /** Muscle- or bone-strengthening flags let weekly guideline tracking work. */
  strength: boolean;
  boneLoading: boolean;
  loggedAt: string;
}

export interface WaterLog {
  id: string;
  date: string;
  ml: number;
  loggedAt: string;
}

export interface SleepLog {
  date: string; // the morning date the sleep ended on
  hours: number;
  quality: 1 | 2 | 3 | 4 | 5;
}

export interface CheckIn {
  date: string;
  energy: 1 | 2 | 3 | 4 | 5; // 1 very low, 5 great
  fatigue: 1 | 2 | 3 | 4 | 5; // 1 fresh, 5 exhausted / very sore
  note?: string;
}

export interface WeightLog {
  date: string;
  kg: number;
}
