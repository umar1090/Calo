import { useMemo } from 'react';
import { activityInsights, calcActivity, weeklyActivity } from '@/engine/activity/engine';
import { dayTargets } from '@/engine/nutrition/targets';
import { getSafetyRules } from '@/engine/safety/policy';
import { useDB, useProfile, useTargets } from '@/hooks/useAppData';

/** Everything calculated from the activity the user logged for a date and its week. */
export function useActivity(date: string) {
  const db = useDB();
  const profile = useProfile();
  const targets = useTargets();
  return useMemo(() => {
    const rules = getSafetyRules(profile.age);
    const todayLogs = db.exercise.filter((e) => e.date === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    const today = todayLogs.map((log) => ({ log, calc: calcActivity(log, profile) }));
    const minutesToday = todayLogs.reduce((s, e) => s + e.minutes, 0);
    const kcalToday = rules.showExerciseEnergy ? today.reduce((s, t) => s + (t.calc.kcal ?? 0), 0) : undefined;
    const day = dayTargets(targets, profile, todayLogs);
    const week = weeklyActivity(db.exercise, date, rules, profile);
    const insights = activityInsights({ logs: db.exercise, date, profile });
    return {
      rules,
      today,
      minutesToday,
      kcalToday,
      extraKcal: day.extraKcal,
      extraWaterMl: day.waterMl - targets.waterMl,
      week,
      insights,
    };
  }, [db.exercise, profile, targets, date]);
}
