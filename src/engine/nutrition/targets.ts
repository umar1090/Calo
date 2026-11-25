import type { ExerciseLog, Profile, Range } from '../types';
import { ADULT_WEIGHT_RULES, getSafetyRules, type SafetyRules } from '../safety/policy';
import {
  ASSUMED_DAILY_ACTIVE_MINUTES,
  INTENSITY_MET,
  adultTdee,
  iomYouthEer,
  mifflinStJeorBmr,
} from './equations';

export interface EnergyAdjustment {
  kcal: number; // negative = below maintenance
  label: string;
}

export interface NutritionTargets {
  rules: SafetyRules;
  methodLabel: string;
  /** Adults only: estimated resting energy. */
  bmr?: number;
  /** Estimated energy needed to maintain current weight (or support growth), kcal/day. */
  maintenance: number;
  maintenanceRange: Range;
  /** The value daily intake is compared with. Equals maintenance unless an adult chose a weight goal. */
  energyTarget: number;
  energyRange: Range;
  adjustment: EnergyAdjustment | null;
  protein: Range;
  proteinPerKg: Range;
  carbs: Range;
  fat: Range;
  fiber: number;
  waterMl: number;
  bmi: number;
  /** Adults only, using the Asian-Indian cut-offs. Not shown for under-18s (needs BMI-for-age charts). */
  bmiCategory?: 'underweight' | 'healthy' | 'overweight' | 'obese';
  /** Informational notes shown under the estimate (safety, method, guidance). */
  notes: string[];
}

export const round10 = (n: number) => Math.round(n / 10) * 10;
const round = (n: number) => Math.round(n);

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return Math.round((weightKg / (m * m)) * 10) / 10;
}

/**
 * Consensus statement for Asian Indians (Misra et al., JAPI 2009):
 * healthy 18.5–22.9, overweight 23–24.9, obese ≥25.
 */
export function indianAdultBmiCategory(bmi: number): NonNullable<NutritionTargets['bmiCategory']> {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 23) return 'healthy';
  if (bmi < 25) return 'overweight';
  return 'obese';
}

/** For protein, use an adjusted reference weight when BMI is high so g/kg rules stay sensible. */
function proteinReferenceWeight(p: Profile): number {
  const m = p.heightCm / 100;
  const bmi = p.weightKg / (m * m);
  if (bmi <= 30) return p.weightKg;
  const weightAt25 = 25 * m * m;
  return weightAt25 + 0.25 * (p.weightKg - weightAt25);
}

function proteinPerKg(p: Profile, rules: SafetyRules): Range {
  const active = p.activityLevel === 'very' || p.activityLevel === 'extreme';
  if (rules.ageGroup === 'child') return { min: 0.95, max: active ? 1.3 : 1.2 };
  if (rules.ageGroup === 'teen') {
    const min = p.age <= 13 ? 0.95 : 0.85; // IOM RDA by age
    const sporty = active || p.goals.includes('strength') || p.goals.includes('endurance');
    return { min, max: sporty ? 1.4 : 1.1 };
  }
  // Adults: ICMR-NIN 2020 RDA 0.83 g/kg; older adults 1.0 g/kg (PROT-AGE).
  let range: Range = rules.ageGroup === 'older_adult' ? { min: 1.0, max: 1.2 } : { min: 0.83, max: 1.0 };
  const raise = (r: Range) => {
    range = { min: Math.max(range.min, r.min), max: Math.max(range.max, r.max) };
  };
  if (p.goals.includes('strength')) raise({ min: 1.2, max: 1.6 });
  if (p.goals.includes('endurance')) raise({ min: 1.2, max: 1.4 });
  if (p.goals.includes('fitness')) raise({ min: 1.0, max: 1.2 });
  if (p.goals.includes('weight') && p.weightDirection === 'lose') raise({ min: 1.0, max: 1.2 });
  if (active) raise({ min: 1.1, max: 1.4 });
  return range;
}

/** IOM adequate intake for water from beverages (drinking water + other drinks). */
export function waterTargetMl(p: Profile): number {
  const pick = (male: number, female: number) =>
    p.sex === 'male' ? male : p.sex === 'female' ? female : (male + female) / 2;
  let ml: number;
  if (p.age <= 8) ml = 1200;
  else if (p.age <= 13) ml = pick(2400, 2100);
  else if (p.age <= 18) ml = pick(3300, 2300);
  else ml = pick(3000, 2200);
  if (p.lifeStage === 'pregnant') ml = Math.max(ml, 2300);
  if (p.lifeStage === 'breastfeeding') ml = Math.max(ml, 3100);
  return Math.round(ml / 250) * 250;
}

function percentRange(energy: number, minPct: number, maxPct: number, kcalPerGram: number): Range {
  return { min: round((energy * minPct) / kcalPerGram), max: round((energy * maxPct) / kcalPerGram) };
}

const pm = (n: number, pct: number): Range => ({ min: round10(n * (1 - pct)), max: round10(n * (1 + pct)) });

export function computeTargets(p: Profile): NutritionTargets {
  const rules = getSafetyRules(p.age);
  const notes: string[] = [];
  const bmi = calcBmi(p.weightKg, p.heightCm);
  const special = p.lifeStage === 'pregnant' || p.lifeStage === 'breastfeeding';

  let maintenance: number;
  let bmr: number | undefined;
  let methodLabel: string;

  if (rules.energyMethod === 'mifflin_st_jeor') {
    bmr = mifflinStJeorBmr(p);
    maintenance = adultTdee(bmr, p.activityLevel);
    methodLabel = 'Mifflin-St Jeor resting energy × activity multiplier';
  } else {
    maintenance = iomYouthEer({ ...p, level: p.activityLevel });
    methodLabel =
      rules.ageGroup === 'teen'
        ? 'IOM (2005) adolescent Estimated Energy Requirement, including energy for growth'
        : 'IOM (2005) child Estimated Energy Requirement, including energy for growth';
  }
  maintenance = round10(maintenance);

  let energyTarget = maintenance;
  let adjustment: EnergyAdjustment | null = null;
  const wantsWeight = p.goals.includes('weight');

  if (wantsWeight && !rules.allowWeightTargets) {
    notes.push(
      rules.ageGroup === 'teen'
        ? 'For under-18s NutriTrack does not set weight-change or calorie-cutting targets. Your body is still growing, so the focus is on regular balanced meals, activity you enjoy, and good sleep. If you have concerns about your weight, a doctor or registered dietitian can give advice that fits you.'
        : 'NutriTrack does not set weight targets for children. Growing bodies need regular meals and plenty of active play. A parent and doctor are the right people to talk to about growth.',
    );
  } else if (wantsWeight && special) {
    notes.push(
      'During pregnancy or breastfeeding, energy needs change and weight-loss targets are not appropriate. Please follow your doctor’s guidance; NutriTrack shows your estimated maintenance only.',
    );
  } else if (wantsWeight && p.weightDirection === 'lose') {
    if (bmi < ADULT_WEIGHT_RULES.minBmiForDeficit) {
      notes.push(
        'Your BMI is below 18.5, so NutriTrack will not suggest eating below your estimated maintenance. A doctor or dietitian can help if you have weight concerns.',
      );
    } else {
      const pace = rules.ageGroup === 'older_adult' ? ADULT_WEIGHT_RULES.olderAdultMaxPace : (p.weightPace ?? 'gentle');
      const wanted = Math.min(ADULT_WEIGHT_RULES.deficitByPace[pace], maintenance * ADULT_WEIGHT_RULES.maxDeficitFraction);
      const floor = Math.max(ADULT_WEIGHT_RULES.minIntake[p.sex], bmr ? round10(bmr) : 0);
      const target = round10(Math.max(maintenance - wanted, floor));
      const deficit = maintenance - target;
      if (deficit >= 50) {
        energyTarget = target;
        adjustment = {
          kcal: -deficit,
          label: `A gradual change of about ${deficit} kcal/day below estimated maintenance (roughly ${deficit >= 400 ? '0.4–0.5' : '0.2–0.3'} kg per week).`,
        };
        notes.push('Gradual change is easier to sustain. Bodies vary, so treat this as a starting point and adjust based on how you feel.');
        if (rules.ageGroup === 'older_adult') notes.push('For adults 65+, NutriTrack keeps changes gentle and raises protein to help protect muscle.');
      } else {
        notes.push('Your estimated needs are already close to the lowest intake we suggest without professional support, so NutriTrack keeps your estimate at maintenance and focuses on habits.');
      }
    }
  } else if (wantsWeight && p.weightDirection === 'gain') {
    const pace = p.weightPace ?? 'gentle';
    const surplus = ADULT_WEIGHT_RULES.surplusByPace[pace];
    energyTarget = maintenance + surplus;
    adjustment = { kcal: surplus, label: `About ${surplus} kcal/day above estimated maintenance for gradual, steady gain.` };
  }

  const perKg = proteinPerKg(p, rules);
  const refWeight = proteinReferenceWeight(p);
  let protein: Range = { min: round(perKg.min * refWeight), max: round(perKg.max * refWeight) };
  if (special) {
    protein = { min: protein.min + 15, max: protein.max + 15 };
    notes.push('Protein needs rise during pregnancy and breastfeeding; your doctor can confirm what is right for you.');
  }

  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const carbs = percentRange(energyTarget, 0.45, 0.65, 4);
  const fat = percentRange(energyTarget, youth ? 0.25 : 0.2, 0.35, 9);
  const fiber = round((energyTarget / 1000) * 14);

  if (rules.energyFraming !== 'target') {
    notes.push(
      'This is an estimate of typical needs for someone your age and size, not a limit. Active days and growth spurts need more. Eat regular meals and listen to your hunger.',
    );
  }
  notes.push('All numbers are estimates based on population equations. They are not medical advice.');

  return {
    rules,
    methodLabel,
    bmr: bmr !== undefined ? round10(bmr) : undefined,
    maintenance,
    maintenanceRange: pm(maintenance, 0.1),
    energyTarget,
    energyRange: pm(energyTarget, 0.1),
    adjustment,
    protein,
    proteinPerKg: perKg,
    carbs,
    fat,
    fiber,
    waterMl: waterTargetMl(p),
    bmi,
    bmiCategory: youth ? undefined : indianAdultBmiCategory(bmi),
    notes,
  };
}

/**
 * Extra fuel for days with more activity than the chosen activity level
 * already assumes. This only ever raises the estimate. It is never used to
 * suggest exercise "to burn off" food.
 */
export function activeDayExtraKcal(p: Profile, exercises: ExerciseLog[]): number {
  const minutes = exercises.reduce((s, e) => s + e.minutes, 0);
  const extraMinutes = Math.max(0, minutes - ASSUMED_DAILY_ACTIVE_MINUTES[p.activityLevel]);
  if (extraMinutes < 15 || minutes === 0) return 0;
  const avgNetMet = exercises.reduce((s, e) => s + (INTENSITY_MET[e.intensity] - 1) * e.minutes, 0) / minutes;
  return Math.min(1000, round10(avgNetMet * p.weightKg * (extraMinutes / 60)));
}

/** Extra water on active days: roughly 500 ml per hour of exercise. */
export function activeDayExtraWaterMl(exercises: ExerciseLog[]): number {
  const minutes = exercises.reduce((s, e) => s + e.minutes, 0);
  return Math.round(((minutes / 60) * 500) / 250) * 250;
}

export interface DayTargets {
  energyTarget: number;
  energyRange: Range;
  extraKcal: number;
  waterMl: number;
}

export function dayTargets(base: NutritionTargets, p: Profile, exercisesToday: ExerciseLog[]): DayTargets {
  const extraKcal = activeDayExtraKcal(p, exercisesToday);
  const energyTarget = base.energyTarget + extraKcal;
  return {
    energyTarget,
    energyRange: pm(energyTarget, 0.1),
    extraKcal,
    waterMl: base.waterMl + activeDayExtraWaterMl(exercisesToday),
  };
}
