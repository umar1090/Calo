import { useMemo } from 'react';
import { generateDailyPlan, weeklyActivity } from '@/engine/activity/engine';
import { getSafetyRules } from '@/engine/safety/policy';
import { useDB, useProfile } from '@/hooks/useAppData';

export function usePlan(date: string) {
  const db = useDB();
  const profile = useProfile();
  return useMemo(() => {
    const checkIn = db.checkIns.find((c) => c.date === date);
    const sleep = db.sleep.find((s) => s.date === date);
    const plan = generateDailyPlan({ profile, date, logs: db.exercise, checkIn, sleep });
    const rules = getSafetyRules(profile.age);
    const week = weeklyActivity(db.exercise, date, rules);
    const checks = db.planChecks[date] ?? [];
    const minutesToday = db.exercise.filter((e) => e.date === date).reduce((s, e) => s + e.minutes, 0);
    return { plan, week, rules, checks, minutesToday, checkIn };
  }, [db.exercise, db.checkIns, db.sleep, db.planChecks, profile, date]);
}
