import type { ExerciseLog, Intensity, Profile } from '../types';
import { getSafetyRules, type SafetyRules } from '../safety/policy';
import { addDays, startOfWeek } from '../dates';
import { ACTIVITIES, intensityForMet, metForSpeed, stepsToKm } from './catalog';
import { exerciseEnergyKcal } from '../nutrition/equations';

/**
 * Activity engine. NutriTrack does not prescribe workouts: people log what
 * they actually did, and everything here is calculated from those logs.
 */

type LogInput = Pick<ExerciseLog, 'activity' | 'minutes' | 'intensity'> & Partial<Pick<ExerciseLog, 'distanceKm' | 'steps'>>;

export interface ActivityCalc {
  met: number;
  /** Intensity implied by pace when distance is known, otherwise the logged intensity. */
  intensity: Intensity;
  distanceKm?: number;
  paceKmh?: number;
  /** Minutes per km for walking/running. */
  paceMinPerKm?: number;
  /** Estimated energy used; undefined for under-18s (never shown to them). */
  kcal?: number;
}

/** Works out MET, intensity, pace and (for adults) energy for one logged activity. */
export function calcActivity(log: LogInput, profile: Pick<Profile, 'age' | 'weightKg' | 'heightCm'>): ActivityCalc {
  const meta = ACTIVITIES[log.activity];
  let distanceKm = log.distanceKm && log.distanceKm > 0 ? log.distanceKm : undefined;
  if (!distanceKm && meta.steps && log.steps && log.steps > 0) distanceKm = stepsToKm(log.steps, profile.heightCm);
  let met = meta.met[log.intensity];
  let intensity = log.intensity;
  let paceKmh: number | undefined;
  if (distanceKm && meta.distance && log.minutes > 0) {
    paceKmh = Math.round((distanceKm / (log.minutes / 60)) * 10) / 10;
    const bySpeed = metForSpeed(log.activity, paceKmh);
    if (bySpeed !== undefined) {
      met = bySpeed;
      intensity = intensityForMet(bySpeed);
    }
  }
  const showEnergy = getSafetyRules(profile.age).showExerciseEnergy;
  return {
    met,
    intensity,
    distanceKm,
    paceKmh,
    paceMinPerKm: paceKmh && (log.activity === 'walking' || log.activity === 'running') ? Math.round((60 / paceKmh) * 10) / 10 : undefined,
    kcal: showEnergy ? Math.round(exerciseEnergyKcal(profile.weightKg, log.minutes, met) / 5) * 5 : undefined,
  };
}

/** Estimated energy for a logged activity. Informational, adults only. */
export function loggedActivityKcal(p: Pick<Profile, 'age' | 'weightKg' | 'heightCm'>, log: LogInput): number | undefined {
  return calcActivity(log, p).kcal;
}

// ---------------------------------------------------------------------------
// Weekly summary
// ---------------------------------------------------------------------------

export interface WeeklyActivity {
  weekStart: string;
  days: string[];
  minutesByDay: number[];
  totalMinutes: number;
  vigorousMinutes: number;
  /** Moderate-or-harder minutes counted toward the guideline (adults: vigorous count double). */
  guidelineMinutes: number;
  guidelineTarget: number;
  guidelineProgress: number;
  strengthDays: number;
  boneDays: number;
  activeDays: number;
  sessions: number;
  /** Adults only. */
  kcal?: number;
  byActivity: { activity: ExerciseLog['activity']; minutes: number; sessions: number }[];
}

export function weeklyActivity(logs: ExerciseLog[], anyDateInWeek: string, rules: SafetyRules, profile?: Pick<Profile, 'age' | 'weightKg' | 'heightCm'>): WeeklyActivity {
  const weekStart = startOfWeek(anyDateInWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const inWeek = logs.filter((l) => l.date >= weekStart && l.date <= days[6]);
  const minutesByDay = days.map((d) => inWeek.filter((l) => l.date === d).reduce((s, l) => s + l.minutes, 0));
  const calc = (l: ExerciseLog) => (profile ? calcActivity(l, profile) : { met: ACTIVITIES[l.activity].met[l.intensity], intensity: l.intensity, kcal: undefined });
  let guideline = 0;
  let vigorous = 0;
  let kcal = 0;
  const by = new Map<ExerciseLog['activity'], { minutes: number; sessions: number }>();
  for (const l of inWeek) {
    const c = calc(l);
    if (c.met >= 3) guideline += l.minutes * (rules.activity.vigorousCountsDouble && c.met >= 6 ? 2 : 1);
    if (c.met >= 6) vigorous += l.minutes;
    kcal += c.kcal ?? 0;
    const b = by.get(l.activity) ?? { minutes: 0, sessions: 0 };
    by.set(l.activity, { minutes: b.minutes + l.minutes, sessions: b.sessions + 1 });
  }
  return {
    weekStart,
    days,
    minutesByDay,
    totalMinutes: minutesByDay.reduce((x, y) => x + y, 0),
    vigorousMinutes: vigorous,
    guidelineMinutes: guideline,
    guidelineTarget: rules.activity.weeklyMinutes,
    guidelineProgress: Math.min(1, guideline / rules.activity.weeklyMinutes),
    strengthDays: new Set(inWeek.filter((l) => l.strength).map((l) => l.date)).size,
    boneDays: new Set(inWeek.filter((l) => l.boneLoading).map((l) => l.date)).size,
    activeDays: minutesByDay.filter((m) => m >= 10).length,
    sessions: inWeek.length,
    kcal: rules.showExerciseEnergy && profile ? kcal : undefined,
    byActivity: [...by.entries()].map(([activity, v]) => ({ activity, ...v })).sort((x, y) => y.minutes - x.minutes),
  };
}

// ---------------------------------------------------------------------------
// Insights from what was logged (observations, never a workout plan)
// ---------------------------------------------------------------------------

export interface ActivityInsight {
  id: string;
  tone: 'positive' | 'neutral' | 'care';
  title: string;
  text: string;
}

export function activityInsights(input: { logs: ExerciseLog[]; date: string; profile: Profile }): ActivityInsight[] {
  const { logs, date, profile } = input;
  const rules = getSafetyRules(profile.age);
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const week = weeklyActivity(logs.filter((l) => l.date <= date), date, rules, profile);
  const out: ActivityInsight[] = [];

  if (week.guidelineMinutes >= week.guidelineTarget) {
    out.push({
      id: 'guideline_met',
      tone: 'positive',
      title: 'Weekly activity goal reached',
      text: youth
        ? `${week.guidelineMinutes} active minutes this week, which averages 60 a day or more. Brilliant.`
        : `${week.guidelineMinutes} guideline minutes this week, past the ${week.guidelineTarget}-minute mark. Great going.`,
    });
  } else if (week.sessions > 0) {
    out.push({
      id: 'guideline_progress',
      tone: 'neutral',
      title: 'This week so far',
      text: youth
        ? `${week.guidelineMinutes} of about ${week.guidelineTarget} active minutes. Sport, PE, cycling and walking all count.`
        : `${week.guidelineMinutes} of ${week.guidelineTarget} guideline minutes (vigorous minutes count double). Walks and chores that get you breathing faster count too.`,
    });
  }

  if (week.sessions > 0 && week.strengthDays === 0) {
    out.push({
      id: 'strength_none',
      tone: 'neutral',
      title: 'No strength activity yet this week',
      text: `The guideline includes muscle-strengthening on ${rules.activity.strengthDaysPerWeek}+ days a week. Gym, bodyweight, HIIT and yoga sessions count when you log them.`,
    });
  } else if (week.strengthDays >= rules.activity.strengthDaysPerWeek) {
    out.push({ id: 'strength_done', tone: 'positive', title: 'Strength days covered', text: `${week.strengthDays} strength days logged this week.` });
  }

  let streak = 0;
  for (let i = 0; i < 14; i++) {
    const d = addDays(date, -i);
    if (logs.some((l) => l.date === d && l.minutes >= 20)) streak++;
    else if (i === 0) continue;
    else break;
  }
  if (streak >= 6) {
    out.push({
      id: 'streak',
      tone: 'care',
      title: `${streak} active days in a row`,
      text: 'Lovely consistency. Rest and easy days are part of getting fitter, so listen to your body.',
    });
  }

  const recent = logs.filter((l) => l.date <= date && l.date > addDays(date, -3));
  if (recent.length === 0 && logs.some((l) => l.date <= date)) {
    out.push({ id: 'quiet', tone: 'neutral', title: 'Nothing logged for a few days', text: 'Log anything that got you moving, even a walk or housework, and it will count toward your week.' });
  }

  const longest = logs.filter((l) => l.date >= week.weekStart && l.date <= date).sort((x, y) => y.minutes - x.minutes)[0];
  if (longest && longest.minutes >= 30) {
    out.push({ id: 'longest', tone: 'positive', title: 'Longest session this week', text: `${longest.minutes} minutes of ${ACTIVITIES[longest.activity].label.toLowerCase()}.` });
  }
  return out;
}
