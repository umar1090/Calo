import type { ActivityLevel, Sex } from '../types';

/**
 * Energy-estimation equations. Each one is a pure function with its source
 * cited, so swapping or adding a formula means editing this file and the
 * registry at the bottom.
 */

// ---------------------------------------------------------------------------
// Adults: Mifflin-St Jeor (1990) resting energy + activity multipliers
// ---------------------------------------------------------------------------

/**
 * Mifflin MD, St Jeor ST et al. "A new predictive equation for resting energy
 * expenditure in healthy individuals." Am J Clin Nutr 1990;51:241-7.
 * BMR = 10·kg + 6.25·cm − 5·age + s, where s = +5 (male) or −161 (female).
 * For 'unspecified' we use the midpoint of the two constants (−78).
 */
export function mifflinStJeorBmr(input: { weightKg: number; heightCm: number; age: number; sex: Sex }): number {
  const { weightKg, heightCm, age, sex } = input;
  const s = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
  return 10 * weightKg + 6.25 * heightCm - 5 * age + s;
}

/** Commonly used physical-activity-level multipliers applied to BMR. */
export const ADULT_ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
};

export function adultTdee(bmr: number, level: ActivityLevel): number {
  return bmr * ADULT_ACTIVITY_MULTIPLIERS[level];
}

// ---------------------------------------------------------------------------
// Children & adolescents: IOM (2005) Estimated Energy Requirement equations
// ---------------------------------------------------------------------------

/**
 * Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate,
 * Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids (2005).
 * Derived from doubly-labelled-water studies in growing children, and includes
 * an allowance for energy deposited in growing tissue.
 *
 * Boys:  EER = 88.5 − 61.9·age + PA·(26.7·kg + 903·m) + growth
 * Girls: EER = 135.3 − 30.8·age + PA·(10.0·kg + 934·m) + growth
 * growth = 20 kcal/day (ages 3–8) or 25 kcal/day (ages 9–18).
 */
export type IomPaCategory = 'sedentary' | 'low_active' | 'active' | 'very_active';

export const IOM_PA_COEFFICIENTS: Record<'male' | 'female', Record<IomPaCategory, number>> = {
  male: { sedentary: 1.0, low_active: 1.13, active: 1.26, very_active: 1.42 },
  female: { sedentary: 1.0, low_active: 1.16, active: 1.31, very_active: 1.56 },
};

/** Map the app's five activity levels onto the four IOM categories. */
export function toIomCategory(level: ActivityLevel): IomPaCategory {
  switch (level) {
    case 'sedentary':
      return 'sedentary';
    case 'light':
      return 'low_active';
    case 'moderate':
      return 'active';
    case 'very':
    case 'extreme':
      return 'very_active';
  }
}

export function growthAllowance(age: number): number {
  return age <= 8 ? 20 : 25;
}

function iomEerForSex(sex: 'male' | 'female', input: { age: number; weightKg: number; heightCm: number; level: ActivityLevel }): number {
  const pa = IOM_PA_COEFFICIENTS[sex][toIomCategory(input.level)];
  const m = input.heightCm / 100;
  const growth = growthAllowance(input.age);
  if (sex === 'male') {
    return 88.5 - 61.9 * input.age + pa * (26.7 * input.weightKg + 903 * m) + growth;
  }
  return 135.3 - 30.8 * input.age + pa * (10.0 * input.weightKg + 934 * m) + growth;
}

/** IOM EER for ages 3–18. 'unspecified' sex uses the mean of both equations. */
export function iomYouthEer(input: { age: number; weightKg: number; heightCm: number; sex: Sex; level: ActivityLevel }): number {
  if (input.sex === 'male' || input.sex === 'female') return iomEerForSex(input.sex, input);
  return (iomEerForSex('male', input) + iomEerForSex('female', input)) / 2;
}

// ---------------------------------------------------------------------------
// Exercise energy (informational for adults; never a target)
// ---------------------------------------------------------------------------

/**
 * Compendium of Physical Activities (Ainsworth et al., 2011) approximate MET
 * values for each intensity. kcal ≈ MET × kg × hours.
 */
export const INTENSITY_MET = { light: 3, moderate: 5, vigorous: 8 } as const;

export function exerciseEnergyKcal(weightKg: number, minutes: number, met: number): number {
  return met * weightKg * (minutes / 60);
}

/** Minutes of purposeful activity per day that each activity level already assumes. */
export const ASSUMED_DAILY_ACTIVE_MINUTES: Record<ActivityLevel, number> = {
  sedentary: 0,
  light: 20,
  moderate: 40,
  very: 70,
  extreme: 100,
};
