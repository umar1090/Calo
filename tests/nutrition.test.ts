import { describe, expect, it } from 'vitest';
import { adultTdee, iomYouthEer, mifflinStJeorBmr } from '@/engine/nutrition/equations';
import { activeDayExtraKcal, calcBmi, computeTargets, dayTargets, indianAdultBmiCategory, waterTargetMl } from '@/engine/nutrition/targets';
import { getAgeGroup, getSafetyRules, SAFETY_RULES } from '@/engine/safety/policy';
import { adult, child, exercise, teen } from './fixtures';
import type { Profile } from '@/engine/types';

describe('Mifflin-St Jeor (adults)', () => {
  it('matches the published equation for men and women', () => {
    expect(mifflinStJeorBmr({ weightKg: 70, heightCm: 175, age: 30, sex: 'male' })).toBeCloseTo(1648.75, 2);
    expect(mifflinStJeorBmr({ weightKg: 60, heightCm: 165, age: 30, sex: 'female' })).toBeCloseTo(1320.25, 2);
  });

  it('uses the midpoint constant when sex is not specified', () => {
    const m = mifflinStJeorBmr({ weightKg: 70, heightCm: 175, age: 30, sex: 'male' });
    const f = mifflinStJeorBmr({ weightKg: 70, heightCm: 175, age: 30, sex: 'female' });
    expect(mifflinStJeorBmr({ weightKg: 70, heightCm: 175, age: 30, sex: 'unspecified' })).toBeCloseTo((m + f) / 2, 5);
  });

  it('applies activity multipliers for TDEE', () => {
    expect(adultTdee(1000, 'sedentary')).toBeCloseTo(1200);
    expect(adultTdee(1000, 'moderate')).toBeCloseTo(1550);
    expect(adultTdee(1000, 'extreme')).toBeCloseTo(1900);
  });

  it('reports estimated maintenance and macro ranges for an adult', () => {
    const p: Profile = { ...adult, sex: 'male', age: 30, weightKg: 70, heightCm: 175, goals: ['maintain'] };
    const t = computeTargets(p);
    expect(t.rules.ageGroup).toBe('adult');
    expect(t.bmr).toBe(1650);
    expect(t.maintenance).toBe(2560); // 1648.75 × 1.55 = 2555.6
    expect(t.energyTarget).toBe(t.maintenance);
    expect(t.maintenanceRange).toEqual({ min: 2300, max: 2820 });
    expect(t.protein.min).toBe(58); // 0.83 g/kg
    expect(t.carbs.min).toBe(Math.round((2560 * 0.45) / 4));
    expect(t.fat.max).toBe(Math.round((2560 * 0.35) / 9));
    expect(t.fiber).toBe(36);
    expect(t.notes.join(' ')).toMatch(/estimates/i);
  });
});

describe('IOM EER (children and adolescents)', () => {
  it('matches the IOM 2005 equations including the growth allowance', () => {
    // Boy 15y, 60 kg, 1.70 m, active (PA 1.26): 88.5 − 928.5 + 1.26 × (1602 + 1535.1) + 25
    expect(iomYouthEer({ age: 15, weightKg: 60, heightCm: 170, sex: 'male', level: 'moderate' })).toBeCloseTo(3137.75, 1);
    // Girl 15y, 52 kg, 1.60 m, active (PA 1.31): 135.3 − 462 + 1.31 × (520 + 1494.4) + 25
    expect(iomYouthEer({ age: 15, weightKg: 52, heightCm: 160, sex: 'female', level: 'moderate' })).toBeCloseTo(2337.16, 1);
    // Age 8 uses the 20 kcal growth allowance.
    const age8 = iomYouthEer({ age: 8, weightKg: 26, heightCm: 128, sex: 'male', level: 'sedentary' });
    expect(age8).toBeCloseTo(88.5 - 61.9 * 8 + 1.0 * (26.7 * 26 + 903 * 1.28) + 20, 5);
  });

  it('does not use Mifflin-St Jeor for teenagers', () => {
    const t = computeTargets(teen);
    expect(t.rules.energyMethod).toBe('iom_eer_adolescent');
    expect(t.methodLabel).toMatch(/IOM/);
    expect(t.bmr).toBeUndefined();
    expect(t.maintenance).toBe(3140);
  });
});

describe('age-specific safety rules', () => {
  it('assigns age groups', () => {
    expect(getAgeGroup(10)).toBe('child');
    expect(getAgeGroup(12)).toBe('child');
    expect(getAgeGroup(13)).toBe('teen');
    expect(getAgeGroup(17)).toBe('teen');
    expect(getAgeGroup(18)).toBe('adult');
    expect(getAgeGroup(65)).toBe('older_adult');
  });

  it('never creates a calorie deficit for teenagers, even with a weight-loss goal', () => {
    for (const age of [13, 14, 15, 16, 17]) {
      for (const pace of ['gentle', 'steady'] as const) {
        const t = computeTargets({ ...teen, age, goals: ['weight'], weightDirection: 'lose', weightPace: pace });
        expect(t.rules.allowEnergyDeficit).toBe(false);
        expect(t.energyTarget).toBe(t.maintenance);
        expect(t.adjustment).toBeNull();
        expect(t.notes.join(' ')).toMatch(/healthcare|doctor|dietitian/i);
        expect(t.bmiCategory).toBeUndefined();
      }
    }
  });

  it('never creates restrictive targets for under-13s and hides energy numbers', () => {
    const t = computeTargets({ ...child, goals: ['weight'], weightDirection: 'lose' });
    expect(t.rules.ageGroup).toBe('child');
    expect(t.rules.energyFraming).toBe('hidden');
    expect(t.energyTarget).toBe(t.maintenance);
    expect(t.adjustment).toBeNull();
    expect(t.rules.weightTracking).toBe('unavailable');
  });

  it('only adults may see intake labelled as above range or exercise energy', () => {
    expect(SAFETY_RULES.teen.mayLabelIntakeAboveRange).toBe(false);
    expect(SAFETY_RULES.child.mayLabelIntakeAboveRange).toBe(false);
    expect(SAFETY_RULES.teen.showExerciseEnergy).toBe(false);
    expect(SAFETY_RULES.adult.mayLabelIntakeAboveRange).toBe(true);
    expect(getSafetyRules(15).activity.dailyMinutes).toBe(60);
  });
});

describe('adult weight management guard-rails', () => {
  const base: Profile = { ...adult, sex: 'male', age: 30, weightKg: 70, heightCm: 175, goals: ['weight'], weightDirection: 'lose' };

  it('applies a gradual deficit capped at 20% of maintenance', () => {
    const t = computeTargets({ ...base, weightPace: 'steady' });
    expect(t.adjustment?.kcal).toBe(-500);
    expect(t.energyTarget).toBe(2060);
    const gentle = computeTargets({ ...base, weightPace: 'gentle' });
    expect(gentle.energyTarget).toBe(2310);
  });

  it('never goes below the sex-specific floor or BMR', () => {
    const small: Profile = { ...adult, age: 25, weightKg: 50, heightCm: 155, activityLevel: 'sedentary', goals: ['weight'], weightDirection: 'lose', weightPace: 'steady' };
    const t = computeTargets(small);
    expect(t.energyTarget).toBeGreaterThanOrEqual(1200);
    expect(t.energyTarget).toBeGreaterThanOrEqual(t.bmr!);
    expect(t.maintenance - t.energyTarget).toBeLessThanOrEqual(t.maintenance * 0.2 + 10);
  });

  it('refuses a deficit when BMI is under 18.5', () => {
    const t = computeTargets({ ...base, weightKg: 52 }); // BMI 17
    expect(t.adjustment).toBeNull();
    expect(t.energyTarget).toBe(t.maintenance);
    expect(t.notes.join(' ')).toMatch(/18\.5/);
  });

  it('keeps adults 65+ at the gentle pace', () => {
    const t = computeTargets({ ...base, age: 70, weightPace: 'steady' });
    expect(t.rules.ageGroup).toBe('older_adult');
    expect(-(t.adjustment?.kcal ?? 0)).toBeLessThanOrEqual(250);
    expect(t.proteinPerKg.min).toBeGreaterThanOrEqual(1.0);
  });

  it('disables weight-loss targets in pregnancy and breastfeeding', () => {
    for (const lifeStage of ['pregnant', 'breastfeeding'] as const) {
      const t = computeTargets({ ...adult, goals: ['weight'], weightDirection: 'lose', lifeStage });
      expect(t.adjustment).toBeNull();
      expect(t.energyTarget).toBe(t.maintenance);
    }
  });

  it('supports gradual gain', () => {
    expect(computeTargets({ ...base, weightDirection: 'gain', weightPace: 'gentle' }).adjustment?.kcal).toBe(250);
  });
});

describe('protein, water and BMI', () => {
  it('raises protein for strength goals', () => {
    const t = computeTargets({ ...adult, weightKg: 70, heightCm: 175, goals: ['strength'] });
    expect(t.protein).toEqual({ min: 84, max: 112 });
  });

  it('uses IOM g/kg for teens', () => {
    const t = computeTargets({ ...teen, goals: ['habits'], activityLevel: 'light' });
    expect(t.protein.min).toBe(51); // 0.85 × 60
  });

  it('gives IOM beverage water targets', () => {
    expect(waterTargetMl({ ...adult, sex: 'female' })).toBe(2250);
    expect(waterTargetMl({ ...adult, sex: 'male' })).toBe(3000);
    expect(waterTargetMl({ ...teen })).toBe(3250);
  });

  it('uses Asian-Indian BMI cut-offs for adults', () => {
    expect(calcBmi(60, 162)).toBeCloseTo(22.9, 1);
    expect(indianAdultBmiCategory(22.9)).toBe('healthy');
    expect(indianAdultBmiCategory(23.5)).toBe('overweight');
    expect(indianAdultBmiCategory(25)).toBe('obese');
  });
});

describe('daily exercise adjustment', () => {
  it('adds fuel only for activity beyond what the activity level assumes', () => {
    const p: Profile = { ...adult, weightKg: 70, activityLevel: 'moderate' };
    expect(activeDayExtraKcal(p, [exercise('2026-11-20', 30)])).toBe(0);
    // 90 min vigorous, 40 assumed → 50 min × (8 − 1) MET × 70 kg / 60 ≈ 408
    expect(activeDayExtraKcal(p, [exercise('2026-11-20', 90, 'vigorous')])).toBe(410);
  });

  it('never lowers the estimate and raises water on active days', () => {
    const t = computeTargets(teen);
    const d = dayTargets(t, teen, [exercise('2026-11-20', 120, 'vigorous', 'football')]);
    expect(d.energyTarget).toBeGreaterThan(t.energyTarget);
    expect(d.waterMl).toBe(t.waterMl + 1000);
    const rest = dayTargets(t, teen, []);
    expect(rest.energyTarget).toBe(t.energyTarget);
  });
});
