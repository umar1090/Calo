import type { ActivityLevel, ActivityType, Allergen, Cuisine, DietType, Equipment, FitnessLevel, Goal, LifeStage, Profile, Sex, WeightDirection, WeightPace } from '@/engine/types';
import { profileSchema } from '@/lib/store/schema';
import { AGE_BANDS } from '@/engine/safety/policy';

export interface Draft {
  name: string;
  age: string;
  sex: Sex | '';
  heightCm: string;
  weightKg: string;
  lifeStage: LifeStage;
  activityLevel: ActivityLevel | '';
  goals: Goal[];
  weightDirection: WeightDirection;
  weightPace: WeightPace;
  dietType: DietType | '';
  allergies: Allergen[];
  cuisines: Cuisine[];
  sports: ActivityType[];
  equipment: Equipment[];
  minutesPerDay: number;
  fitnessLevel: FitnessLevel;
  limitations: string;
}

export const emptyDraft: Draft = {
  name: '',
  age: '',
  sex: '',
  heightCm: '',
  weightKg: '',
  lifeStage: 'none',
  activityLevel: '',
  goals: [],
  weightDirection: 'maintain',
  weightPace: 'gentle',
  dietType: '',
  allergies: [],
  cuisines: [],
  sports: ['walking'],
  equipment: ['none'],
  minutesPerDay: 30,
  fitnessLevel: 'beginner',
  limitations: '',
};

export function draftFromProfile(p: Profile): Draft {
  return {
    name: p.name ?? '',
    age: String(p.age),
    sex: p.sex,
    heightCm: String(p.heightCm),
    weightKg: String(p.weightKg),
    lifeStage: p.lifeStage ?? 'none',
    activityLevel: p.activityLevel,
    goals: p.goals,
    weightDirection: p.weightDirection ?? 'maintain',
    weightPace: p.weightPace ?? 'gentle',
    dietType: p.dietType,
    allergies: p.allergies,
    cuisines: p.cuisines,
    sports: p.sports,
    equipment: p.equipment,
    minutesPerDay: p.minutesPerDay,
    fitnessLevel: p.fitnessLevel,
    limitations: p.limitations ?? '',
  };
}

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s.replace(',', '.')));

export function draftToProfile(d: Draft): Profile {
  const age = toNum(d.age);
  const adult = age >= 18;
  return {
    name: d.name.trim() || undefined,
    age,
    sex: (d.sex || 'unspecified') as Sex,
    heightCm: toNum(d.heightCm),
    weightKg: toNum(d.weightKg),
    lifeStage: d.sex === 'female' && adult ? d.lifeStage : 'none',
    activityLevel: (d.activityLevel || 'light') as ActivityLevel,
    goals: d.goals,
    // Weight direction and pace only apply to adults; minors never get weight-change targets.
    weightDirection: adult && d.goals.includes('weight') ? d.weightDirection : undefined,
    weightPace: adult && d.goals.includes('weight') ? d.weightPace : undefined,
    dietType: (d.dietType || 'vegetarian') as DietType,
    allergies: d.allergies,
    cuisines: d.cuisines,
    sports: d.sports,
    equipment: d.equipment.length ? d.equipment : ['none'],
    minutesPerDay: d.minutesPerDay,
    fitnessLevel: d.fitnessLevel,
    limitations: d.limitations.trim() || undefined,
  };
}

export type StepErrors = Partial<Record<keyof Draft, string>>;

/** Validates only the fields that belong to an onboarding step. */
export function validateStep(step: number, d: Draft): StepErrors {
  const e: StepErrors = {};
  if (step === 0) {
    const age = toNum(d.age);
    if (!Number.isInteger(age)) e.age = 'Enter your age in years';
    else if (age < AGE_BANDS.minAge) e.age = `NutriTrack is designed for ages ${AGE_BANDS.minAge} and up`;
    else if (age > AGE_BANDS.maxAge) e.age = 'Please enter a valid age';
    if (!d.sex) e.sex = 'Choose an option (used only for the estimate)';
    if (d.name.length > 40) e.name = 'Name is too long';
  }
  if (step === 1) {
    const h = toNum(d.heightCm);
    const w = toNum(d.weightKg);
    if (!(h >= 100 && h <= 230)) e.heightCm = 'Enter height between 100 and 230 cm';
    if (!(w >= 20 && w <= 250)) e.weightKg = 'Enter weight between 20 and 250 kg';
    if (!e.heightCm && !e.weightKg) {
      const bmi = w / (h / 100) ** 2;
      if (bmi < 10 || bmi > 70) e.weightKg = 'Please double-check your height and weight';
    }
  }
  if (step === 2 && !d.activityLevel) e.activityLevel = 'Choose the option closest to a typical week';
  if (step === 3 && d.goals.length === 0) e.goals = 'Choose at least one goal';
  if (step === 4 && !d.dietType) e.dietType = 'Choose your diet';
  return e;
}

export function validateAll(d: Draft): { profile?: Profile; error?: string } {
  for (let s = 0; s <= 5; s++) {
    const e = validateStep(s, d);
    const first = Object.values(e)[0];
    if (first) return { error: first };
  }
  const r = profileSchema.safeParse(draftToProfile(d));
  if (!r.success) return { error: r.error.issues[0].message };
  return { profile: r.data as Profile };
}

export function cmToFeetInches(cm: number): { ft: number; inch: number } {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  return { ft, inch: Math.round(totalIn - ft * 12) };
}

export function feetInchesToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}
