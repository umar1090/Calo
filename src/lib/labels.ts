import type { ActivityLevel, ActivityType, Allergen, Cuisine, DietType, Equipment, FitnessLevel, Goal, Intensity, MealType, Sex } from '@/engine/types';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'unspecified', label: 'Prefer not to say' },
];

export const ACTIVITY_LEVELS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: 'sedentary', label: 'Sedentary', hint: 'Mostly sitting' },
  { value: 'light', label: 'Lightly active', hint: 'Light walking and occasional exercise' },
  { value: 'moderate', label: 'Moderately active', hint: 'Regular activity or sports' },
  { value: 'very', label: 'Very active', hint: 'Frequent exercise or sports' },
  { value: 'extreme', label: 'Extremely active', hint: 'Intensive training' },
];

export const GOALS: { value: Goal; label: string; hint: string }[] = [
  { value: 'fitness', label: 'Improve fitness', hint: 'Feel fitter and more energetic' },
  { value: 'maintain', label: 'Maintain current weight', hint: 'Keep things steady' },
  { value: 'strength', label: 'Build strength', hint: 'Get stronger, more protein' },
  { value: 'endurance', label: 'Improve endurance', hint: 'Go longer in sport and cardio' },
  { value: 'habits', label: 'Improve eating habits', hint: 'Regular, balanced meals' },
  { value: 'weight', label: 'Weight management', hint: 'Gradual and age-appropriate' },
];

export const DIETS: { value: DietType; label: string; hint: string }[] = [
  { value: 'vegetarian', label: 'Vegetarian', hint: 'Dairy, no eggs or meat' },
  { value: 'eggetarian', label: 'Eggetarian', hint: 'Vegetarian plus eggs' },
  { value: 'non_vegetarian', label: 'Non-vegetarian', hint: 'Eggs, chicken, fish, meat' },
  { value: 'vegan', label: 'Vegan', hint: 'No animal products' },
  { value: 'jain', label: 'Jain', hint: 'Vegetarian, no root vegetables' },
];

export const ALLERGENS: { value: Allergen; label: string }[] = [
  { value: 'dairy', label: 'Dairy / lactose' },
  { value: 'gluten', label: 'Gluten / wheat' },
  { value: 'peanut', label: 'Peanuts' },
  { value: 'tree_nut', label: 'Tree nuts' },
  { value: 'soy', label: 'Soy' },
  { value: 'egg', label: 'Egg' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
  { value: 'sesame', label: 'Sesame' },
];

export const CUISINES: { value: Cuisine; label: string }[] = [
  { value: 'north_indian', label: 'North Indian' },
  { value: 'south_indian', label: 'South Indian' },
  { value: 'west_indian', label: 'Gujarati / Maharashtrian' },
  { value: 'east_indian', label: 'Bengali / East Indian' },
  { value: 'continental', label: 'Continental' },
];

export const ACTIVITY_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: 'walking', label: 'Walking' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'basketball', label: 'Basketball' },
  { value: 'football', label: 'Football' },
  { value: 'cricket', label: 'Cricket' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'gym', label: 'Gym' },
  { value: 'bodyweight', label: 'Bodyweight workouts' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'stretching', label: 'Stretching' },
  { value: 'dance', label: 'Dance' },
  { value: 'other_sport', label: 'Other sports' },
];

export const EQUIPMENT: { value: Equipment; label: string }[] = [
  { value: 'none', label: 'No equipment' },
  { value: 'yoga_mat', label: 'Yoga mat' },
  { value: 'skipping_rope', label: 'Skipping rope' },
  { value: 'resistance_band', label: 'Resistance band' },
  { value: 'dumbbells', label: 'Dumbbells' },
  { value: 'gym_access', label: 'Gym access' },
  { value: 'bicycle', label: 'Bicycle' },
];

export const FITNESS_LEVELS: { value: FitnessLevel; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Beginner', hint: 'New to exercise or getting back into it' },
  { value: 'intermediate', label: 'Intermediate', hint: 'Exercise regularly' },
  { value: 'advanced', label: 'Advanced', hint: 'Train often and confidently' },
];

export const INTENSITIES: { value: Intensity; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Easy, can sing' },
  { value: 'moderate', label: 'Moderate', hint: 'Breathing faster, can talk' },
  { value: 'vigorous', label: 'Vigorous', hint: 'Hard to talk' },
];

export const MEALS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snacks' },
  { value: 'beverage', label: 'Beverages' },
];

export const mealLabel = (m: MealType) => MEALS.find((x) => x.value === m)?.label ?? m;
export const activityLabel = (a: ActivityType) => ACTIVITY_OPTIONS.find((x) => x.value === a)?.label ?? a;

export const fmt = (n: number, digits = 0) =>
  n.toLocaleString('en-IN', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
