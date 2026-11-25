import { z } from 'zod';
import type { Food } from '@/data/foods';
import type { CheckIn, ExerciseLog, MealEntry, Profile, SleepLog, WaterLog, WeightLog } from '@/engine/types';
import { AGE_BANDS } from '@/engine/safety/policy';

/**
 * Validation schemas for everything that is written to storage. Inputs from
 * forms and from imported backups are checked here before they are saved.
 */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date');
const isoTime = z.string().min(10);
const num = (min: number, max: number, label: string) =>
  z.number({ error: `${label} must be a number` }).min(min, `${label} must be at least ${min}`).max(max, `${label} must be at most ${max}`);

export const sexSchema = z.enum(['male', 'female', 'unspecified']);
export const activityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'very', 'extreme']);
export const goalSchema = z.enum(['fitness', 'maintain', 'strength', 'endurance', 'habits', 'weight']);
export const dietSchema = z.enum(['vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'jain']);
export const allergenSchema = z.enum(['dairy', 'gluten', 'peanut', 'tree_nut', 'soy', 'egg', 'fish', 'shellfish', 'sesame']);
export const cuisineSchema = z.enum(['north_indian', 'south_indian', 'west_indian', 'east_indian', 'continental']);
export const mealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'beverage']);
export const activityTypeSchema = z.enum([
  'walking', 'running', 'cycling', 'basketball', 'football', 'cricket', 'badminton', 'swimming', 'gym', 'bodyweight', 'yoga', 'stretching', 'dance',
  'hiit', 'skipping', 'hiking', 'stairs', 'tennis', 'table_tennis', 'volleyball', 'kabaddi', 'aerobics', 'martial_arts', 'household', 'other_sport',
]);
export const equipmentSchema = z.enum(['none', 'dumbbells', 'resistance_band', 'gym_access', 'bicycle', 'yoga_mat', 'skipping_rope']);
export const intensitySchema = z.enum(['light', 'moderate', 'vigorous']);
const groupSchema = z.enum(['vegetable', 'fruit', 'whole_grain', 'refined_grain', 'pulse', 'dairy', 'egg', 'meat_fish', 'soy', 'nut_seed', 'fried', 'sweet', 'sugary_drink']);

export const profileSchema = z
  .object({
    name: z.string().trim().max(40, 'Name is too long').optional(),
    age: z.number({ error: 'Age is required' }).int('Age must be a whole number').min(AGE_BANDS.minAge, `NutriTrack is for ages ${AGE_BANDS.minAge} and up`).max(AGE_BANDS.maxAge, 'Please enter a valid age'),
    sex: sexSchema,
    heightCm: num(100, 230, 'Height'),
    weightKg: num(20, 250, 'Weight'),
    activityLevel: activityLevelSchema,
    goals: z.array(goalSchema).min(1, 'Choose at least one goal'),
    weightDirection: z.enum(['lose', 'gain', 'maintain']).optional(),
    weightPace: z.enum(['gentle', 'steady']).optional(),
    dietType: dietSchema,
    allergies: z.array(allergenSchema),
    cuisines: z.array(cuisineSchema),
    sports: z.array(activityTypeSchema),
    equipment: z.array(equipmentSchema),
    minutesPerDay: num(10, 180, 'Available time'),
    fitnessLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    limitations: z.string().max(200).optional(),
    lifeStage: z.enum(['none', 'pregnant', 'breastfeeding']).optional(),
  })
  .superRefine((p, ctx) => {
    const bmi = p.weightKg / (p.heightCm / 100) ** 2;
    if (bmi < 10 || bmi > 70) ctx.addIssue({ code: 'custom', path: ['weightKg'], message: 'Please double-check your height and weight' });
  }) satisfies z.ZodType<Profile>;

const nutrientsSchema = z.object({
  kcal: num(0, 10000, 'Calories'),
  protein: num(0, 500, 'Protein'),
  carbs: num(0, 1500, 'Carbohydrates'),
  fat: num(0, 500, 'Fat'),
  fiber: num(0, 200, 'Fibre'),
});

export const mealEntrySchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  mealType: mealTypeSchema,
  foodId: z.string().optional(),
  foodName: z.string().trim().min(1, 'Food name is required').max(80),
  portionLabel: z.string().trim().min(1).max(60),
  quantity: num(0.1, 50, 'Quantity'),
  grams: num(0, 10000, 'Grams'),
  nutrients: nutrientsSchema,
  groups: z.array(groupSchema),
  vegServings: num(0, 50, 'Vegetable servings'),
  fruitServings: num(0, 50, 'Fruit servings'),
  oilLevel: z.enum(['less', 'normal', 'more']).optional(),
  edited: z.boolean().optional(),
  loggedAt: isoTime,
}) satisfies z.ZodType<MealEntry>;

export const exerciseSchema = z.object({
  id: z.string().min(1),
  date: isoDate,
  activity: activityTypeSchema,
  minutes: num(1, 600, 'Duration'),
  intensity: intensitySchema,
  notes: z.string().max(200).optional(),
  distanceKm: num(0.01, 300, 'Distance').optional(),
  steps: z.number().int('Steps must be a whole number').min(1, 'Steps must be at least 1').max(100000, 'Steps must be at most 100,000').optional(),
  strength: z.boolean(),
  boneLoading: z.boolean(),
  loggedAt: isoTime,
}) satisfies z.ZodType<ExerciseLog>;

export const waterSchema = z.object({ id: z.string(), date: isoDate, ml: num(1, 5000, 'Water'), loggedAt: isoTime }) satisfies z.ZodType<WaterLog>;
export const sleepSchema = z.object({ date: isoDate, hours: num(0, 16, 'Sleep'), quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]) }) satisfies z.ZodType<SleepLog>;
const scale = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]);
export const checkInSchema = z.object({ date: isoDate, energy: scale, fatigue: scale, note: z.string().max(200).optional() }) satisfies z.ZodType<CheckIn>;
export const weightSchema = z.object({ date: isoDate, kg: num(20, 250, 'Weight') }) satisfies z.ZodType<WeightLog>;

export const customFoodSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  portionLabel: z.string().trim().min(1, 'Describe the portion').max(40),
  grams: num(1, 2000, 'Portion size'),
  kcal: num(0, 3000, 'Calories'),
  protein: num(0, 300, 'Protein'),
  carbs: num(0, 500, 'Carbohydrates'),
  fat: num(0, 300, 'Fat'),
  fiber: num(0, 100, 'Fibre'),
});
export type CustomFoodInput = z.infer<typeof customFoodSchema>;

export interface HabitDef {
  id: string;
  label: string;
  /** Auto habits are computed from logs; manual ones are ticked by the user. */
  auto?: 'breakfast' | 'veg3' | 'water' | 'active' | 'sleep' | 'protein';
}

export interface HabitLog {
  date: string;
  habitId: string;
}

export interface RecState {
  date: string;
  recId: string;
  status: 'done' | 'dismissed';
}

export interface WeeklyProgress {
  weekStart: string;
  daysLogged: number;
  avgMealsPerDay: number;
  avgProtein: number;
  avgVegServings: number;
  activeMinutes: number;
  workouts: number;
  avgWaterMl: number;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  source?: 'local' | 'claude';
  payload?: unknown;
}

export interface Preferences {
  trackSleep: boolean;
  trackWeight: boolean;
  glassMl: number;
  habits: HabitDef[];
  aiMode: 'local' | 'claude';
  claudeApiKey?: string;
}

export const DEFAULT_HABITS: HabitDef[] = [
  { id: 'breakfast', label: 'Ate breakfast', auto: 'breakfast' },
  { id: 'veg3', label: '3+ servings of vegetables', auto: 'veg3' },
  { id: 'protein', label: 'Protein at most meals', auto: 'protein' },
  { id: 'water', label: 'Reached water goal', auto: 'water' },
  { id: 'active', label: 'Active for 30+ minutes', auto: 'active' },
  { id: 'screen', label: 'Screen-free hour before bed' },
  { id: 'stretch', label: 'Stretched or did yoga' },
];

export interface UserDB {
  version: 1;
  profile: Profile | null;
  preferences: Preferences;
  entries: MealEntry[];
  exercise: ExerciseLog[];
  water: WaterLog[];
  sleep: SleepLog[];
  checkIns: CheckIn[];
  habitLogs: HabitLog[];
  weights: WeightLog[];
  customFoods: Food[];
  recStates: RecState[];
  planChecks: Record<string, string[]>;
  weeklyProgress: WeeklyProgress[];
  chat: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export function emptyDB(now = new Date()): UserDB {
  return {
    version: 1,
    profile: null,
    preferences: { trackSleep: true, trackWeight: false, glassMl: 250, habits: DEFAULT_HABITS, aiMode: 'local' },
    entries: [],
    exercise: [],
    water: [],
    sleep: [],
    checkIns: [],
    habitLogs: [],
    weights: [],
    customFoods: [],
    recStates: [],
    planChecks: {},
    weeklyProgress: [],
    chat: [],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

/** Loose structural check for imported backups (deep validation of entries happens per item). */
export const backupSchema = z.object({
  app: z.literal('nutritrack'),
  exportedAt: z.string(),
  data: z.looseObject({
    version: z.literal(1),
    profile: z.unknown(),
    preferences: z.unknown(),
    entries: z.array(z.unknown()).max(50000),
    exercise: z.array(z.unknown()).max(20000),
    water: z.array(z.unknown()).max(50000),
    sleep: z.array(z.unknown()).max(5000),
    checkIns: z.array(z.unknown()).max(5000),
    habitLogs: z.array(z.unknown()).max(50000),
    weights: z.array(z.unknown()).max(5000),
    customFoods: z.array(z.unknown()).max(2000),
  }),
});
