import type { AgeGroup } from '../types';

/**
 * Age-specific safety rules.
 *
 * Everything that changes behaviour by age lives in this one table so the rules
 * can be reviewed and changed in one place. The calculation, analysis,
 * recommendation, activity and assistant engines all read from here.
 */

export const AGE_BANDS = {
  /** Youngest age the app accepts during onboarding. */
  minAge: 8,
  maxAge: 100,
  /** 8–12 */
  childMax: 12,
  /** 13–17 */
  teenMax: 17,
  /** 18–64 */
  adultMax: 64,
} as const;

export type EnergyMethod = 'mifflin_st_jeor' | 'iom_eer_child' | 'iom_eer_adolescent';

export interface ActivityGuideline {
  /** Average minutes per day of moderate-to-vigorous activity that the guideline describes. */
  dailyMinutes: number;
  /** Weekly moderate-equivalent minutes (lower bound). */
  weeklyMinutes: number;
  /** Upper end of the adult range; beyond this extra benefit is smaller. */
  weeklyMinutesUpper: number;
  /** Adults may count vigorous minutes double. Young people count all MVPA minutes equally. */
  vigorousCountsDouble: boolean;
  strengthDaysPerWeek: number;
  boneDaysPerWeek: number;
  balanceDaysPerWeek: number;
  source: string;
}

export interface SafetyRules {
  ageGroup: AgeGroup;
  energyMethod: EnergyMethod;
  /** May the engine produce an intake target below estimated maintenance? */
  allowEnergyDeficit: boolean;
  /** May the weight-management goal change energy targets at all? */
  allowWeightTargets: boolean;
  /**
   * How estimated energy is presented:
   * - 'target': adults see an estimate and progress toward it.
   * - 'reference': a typical-needs range, framed as fuel, never as a limit.
   * - 'hidden': no energy number on the dashboard (food groups instead).
   */
  energyFraming: 'target' | 'reference' | 'hidden';
  /** May feedback say intake was above the estimated range? */
  mayLabelIntakeAboveRange: boolean;
  /** May the UI show estimated calories burned during exercise (informational only)? */
  showExerciseEnergy: boolean;
  weightTracking: 'available' | 'off_by_default' | 'unavailable';
  /** Weight concerns are redirected to a healthcare professional. */
  referWeightConcernsToProfessional: boolean;
  activity: ActivityGuideline;
}

const YOUTH_ACTIVITY: ActivityGuideline = {
  dailyMinutes: 60,
  weeklyMinutes: 420,
  weeklyMinutesUpper: 420,
  vigorousCountsDouble: false,
  strengthDaysPerWeek: 3,
  boneDaysPerWeek: 3,
  balanceDaysPerWeek: 0,
  source:
    'WHO 2020 guidelines for ages 5–17: an average of at least 60 minutes per day of moderate-to-vigorous activity across the week, with muscle- and bone-strengthening activity on at least 3 days.',
};

const ADULT_ACTIVITY: ActivityGuideline = {
  dailyMinutes: 30,
  weeklyMinutes: 150,
  weeklyMinutesUpper: 300,
  vigorousCountsDouble: true,
  strengthDaysPerWeek: 2,
  boneDaysPerWeek: 0,
  balanceDaysPerWeek: 0,
  source:
    'WHO 2020 guidelines for adults: 150–300 minutes of moderate activity (or 75–150 minutes vigorous) per week, plus muscle-strengthening on 2 or more days.',
};

export const SAFETY_RULES: Record<AgeGroup, SafetyRules> = {
  child: {
    ageGroup: 'child',
    energyMethod: 'iom_eer_child',
    allowEnergyDeficit: false,
    allowWeightTargets: false,
    energyFraming: 'hidden',
    mayLabelIntakeAboveRange: false,
    showExerciseEnergy: false,
    weightTracking: 'unavailable',
    referWeightConcernsToProfessional: true,
    activity: YOUTH_ACTIVITY,
  },
  teen: {
    ageGroup: 'teen',
    energyMethod: 'iom_eer_adolescent',
    allowEnergyDeficit: false,
    allowWeightTargets: false,
    energyFraming: 'reference',
    mayLabelIntakeAboveRange: false,
    showExerciseEnergy: false,
    weightTracking: 'off_by_default',
    referWeightConcernsToProfessional: true,
    activity: YOUTH_ACTIVITY,
  },
  adult: {
    ageGroup: 'adult',
    energyMethod: 'mifflin_st_jeor',
    allowEnergyDeficit: true,
    allowWeightTargets: true,
    energyFraming: 'target',
    mayLabelIntakeAboveRange: true,
    showExerciseEnergy: true,
    weightTracking: 'available',
    referWeightConcernsToProfessional: false,
    activity: ADULT_ACTIVITY,
  },
  older_adult: {
    ageGroup: 'older_adult',
    energyMethod: 'mifflin_st_jeor',
    allowEnergyDeficit: true,
    allowWeightTargets: true,
    energyFraming: 'target',
    mayLabelIntakeAboveRange: true,
    showExerciseEnergy: true,
    weightTracking: 'available',
    referWeightConcernsToProfessional: false,
    activity: { ...ADULT_ACTIVITY, balanceDaysPerWeek: 3, source: ADULT_ACTIVITY.source + ' Adults 65+ should also include balance and functional training on 3 or more days.' },
  },
};

export function getAgeGroup(age: number): AgeGroup {
  if (age <= AGE_BANDS.childMax) return 'child';
  if (age <= AGE_BANDS.teenMax) return 'teen';
  if (age <= AGE_BANDS.adultMax) return 'adult';
  return 'older_adult';
}

export function getSafetyRules(age: number): SafetyRules {
  return SAFETY_RULES[getAgeGroup(age)];
}

export function isMinor(age: number): boolean {
  return age <= AGE_BANDS.teenMax;
}

/**
 * Adult deficit guard-rails. Kept here (not in the formula files) because
 * they are safety rules rather than estimation maths.
 */
export const ADULT_WEIGHT_RULES = {
  /** kcal/day change from maintenance for each pace. ~0.25 kg/week and ~0.5 kg/week. */
  deficitByPace: { gentle: 250, steady: 500 },
  surplusByPace: { gentle: 250, steady: 400 },
  /** Never more than this share of estimated maintenance. */
  maxDeficitFraction: 0.2,
  /** Absolute floors commonly used to avoid very-low-energy diets without supervision. */
  minIntake: { male: 1500, female: 1200, unspecified: 1350 },
  /** No deficit below this BMI. */
  minBmiForDeficit: 18.5,
  /** Adults 65+ only get the gentle pace to protect muscle and bone. */
  olderAdultMaxPace: 'gentle' as const,
} as const;
