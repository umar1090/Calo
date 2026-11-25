import type { ActivityType, CheckIn, ExerciseLog, Intensity, Profile, SleepLog } from '../types';
import { getSafetyRules, type SafetyRules } from '../safety/policy';
import { addDays, dayOfWeek, dayOfYear, lastNDays, startOfWeek } from '../dates';
import { ACTIVITIES, EXERCISES, LEVEL_ORDER, parseLimitations, type Exercise, type LimitationKey } from './catalog';
import { exerciseEnergyKcal } from '../nutrition/equations';

// ---------------------------------------------------------------------------
// Weekly summary
// ---------------------------------------------------------------------------

export interface WeeklyActivity {
  weekStart: string;
  days: string[];
  minutesByDay: number[];
  totalMinutes: number;
  vigorousMinutes: number;
  /** Minutes counted toward the guideline (adults: vigorous count double). */
  guidelineMinutes: number;
  guidelineTarget: number;
  guidelineProgress: number;
  strengthDays: number;
  boneDays: number;
  activeDays: number;
  sessions: number;
}

export function weeklyActivity(logs: ExerciseLog[], anyDateInWeek: string, rules: SafetyRules): WeeklyActivity {
  const weekStart = startOfWeek(anyDateInWeek);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const inWeek = logs.filter((l) => l.date >= weekStart && l.date <= days[6]);
  const minutesByDay = days.map((d) => inWeek.filter((l) => l.date === d).reduce((s, l) => s + l.minutes, 0));
  const mvpa = inWeek.filter((l) => l.intensity !== 'light' || ['walking', 'cycling', 'yoga', 'swimming'].includes(l.activity));
  const vigorousMinutes = inWeek.filter((l) => l.intensity === 'vigorous').reduce((s, l) => s + l.minutes, 0);
  const counted = mvpa.reduce((s, l) => s + l.minutes * (rules.activity.vigorousCountsDouble && l.intensity === 'vigorous' ? 2 : 1), 0);
  const strengthDays = new Set(inWeek.filter((l) => l.strength).map((l) => l.date)).size;
  const boneDays = new Set(inWeek.filter((l) => l.boneLoading).map((l) => l.date)).size;
  return {
    weekStart,
    days,
    minutesByDay,
    totalMinutes: minutesByDay.reduce((a, b) => a + b, 0),
    vigorousMinutes,
    guidelineMinutes: counted,
    guidelineTarget: rules.activity.weeklyMinutes,
    guidelineProgress: Math.min(1, counted / rules.activity.weeklyMinutes),
    strengthDays,
    boneDays,
    activeDays: minutesByDay.filter((m) => m >= 10).length,
    sessions: inWeek.length,
  };
}

// ---------------------------------------------------------------------------
// Rest & recovery
// ---------------------------------------------------------------------------

export interface RestAdvice {
  level: 'rest' | 'light' | 'normal';
  reasons: string[];
}

export function restAdvice(input: { date: string; logs: ExerciseLog[]; checkIn?: CheckIn; sleep?: SleepLog; profile: Profile }): RestAdvice {
  const reasons: string[] = [];
  let level: RestAdvice['level'] = 'normal';
  const bump = (l: RestAdvice['level']) => {
    if (l === 'rest' || (l === 'light' && level === 'normal')) level = l;
  };

  if (input.checkIn) {
    if (input.checkIn.fatigue >= 5) {
      bump('rest');
      reasons.push('You told us you feel exhausted or very sore today. Rest is when your body gets stronger.');
    } else if (input.checkIn.fatigue >= 4) {
      bump('light');
      reasons.push('You are feeling quite tired or sore, so today is a lighter day.');
    }
    if (input.checkIn.energy <= 1) {
      bump('light');
      reasons.push('Your energy is very low today. Gentle movement only, and rest if you need it.');
    }
  }
  if (input.sleep && input.sleep.hours < 5.5) {
    bump('light');
    reasons.push(`You slept about ${input.sleep.hours} hours. Short sleep makes hard training feel harder, so keep it easy.`);
  }

  const prev = lastNDays(addDays(input.date, -1), 7);
  const activeStreak = (() => {
    let n = 0;
    for (let i = prev.length - 1; i >= 0; i--) {
      if (input.logs.some((l) => l.date === prev[i] && l.minutes >= 20 && l.intensity !== 'light')) n++;
      else break;
    }
    return n;
  })();
  if (activeStreak >= 6) {
    bump('rest');
    reasons.push(`You have trained hard ${activeStreak} days in a row. A rest or easy recovery day helps you come back stronger.`);
  }

  const hardYesterday = input.logs.filter((l) => l.date === addDays(input.date, -1) && l.intensity === 'vigorous').reduce((s, l) => s + l.minutes, 0);
  const hardDayBefore = input.logs.filter((l) => l.date === addDays(input.date, -2) && l.intensity === 'vigorous').reduce((s, l) => s + l.minutes, 0);
  if (input.profile.fitnessLevel === 'beginner' && hardYesterday >= 30 && hardDayBefore >= 30) {
    bump('light');
    reasons.push('Two hard days in a row is plenty when you are starting out. Today is for easy movement.');
  }
  return { level, reasons };
}

// ---------------------------------------------------------------------------
// Daily plan
// ---------------------------------------------------------------------------

export interface PlanItem {
  id: string;
  kind: 'warmup' | 'main' | 'exercise' | 'cooldown' | 'everyday';
  name: string;
  detail: string;
  minutes: number;
  activity?: ActivityType;
  intensity?: Intensity;
  cue?: string;
}

export interface DailyPlan {
  date: string;
  type: 'rest' | 'recovery' | 'strength' | 'cardio' | 'sport' | 'mixed';
  title: string;
  summary: string;
  items: PlanItem[];
  totalMinutes: number;
  guidelineNote: string;
  reasons: string[];
  notes: string[];
  /** Adults only and informational; undefined for under-18s. */
  estimatedKcal?: number;
}

export interface PlanInput {
  profile: Profile;
  date: string;
  logs: ExerciseLog[];
  checkIn?: CheckIn;
  sleep?: SleepLog;
}

function availableExercises(p: Profile, limits: LimitationKey[], youth: boolean): Exercise[] {
  const equipment = new Set(p.equipment);
  return EXERCISES.filter(
    (e) =>
      (e.equipment.length === 0 || e.equipment.some((q) => equipment.has(q))) &&
      LEVEL_ORDER[e.minLevel] <= LEVEL_ORDER[p.fitnessLevel] &&
      !e.avoidFor.some((l) => limits.includes(l)) &&
      !(youth && e.adultsOnly),
  );
}

function pickExercises(pool: Exercise[], foci: Exercise['focus'][], seed: number): Exercise[] {
  const chosen: Exercise[] = [];
  foci.forEach((focus, i) => {
    const options = pool.filter((e) => e.focus === focus && !chosen.includes(e));
    if (options.length) chosen.push(options[(seed + i) % options.length]);
  });
  return chosen;
}

function exerciseItem(e: Exercise, level: Profile['fitnessLevel']): PlanItem {
  return { id: `ex-${e.id}`, kind: 'exercise', name: e.name, detail: e.dose[level], minutes: e.minutes, cue: e.cue };
}

const WARMUP: PlanItem = { id: 'warmup', kind: 'warmup', name: 'Warm-up', detail: 'Easy marching, arm circles and gentle mobility', minutes: 5 };
const COOLDOWN: PlanItem = { id: 'cooldown', kind: 'cooldown', name: 'Cool-down stretch', detail: 'Slow breathing and stretches for the muscles you used', minutes: 5 };

function choosePreferredActivity(p: Profile, limits: LimitationKey[], seed: number, preferSport: boolean): ActivityType {
  const ok = (a: ActivityType) => {
    const meta = ACTIVITIES[a];
    if (meta.loads.some((l) => limits.includes(l))) return false;
    if (meta.requires && !meta.requires.some((r) => p.equipment.includes(r))) return false;
    return true;
  };
  const prefs = p.sports.filter((s) => !['stretching', 'gym', 'bodyweight'].includes(s)).filter(ok);
  const sports = prefs.filter((s) => ACTIVITIES[s].sport);
  const list = preferSport && sports.length ? sports : prefs;
  if (list.length) return list[seed % list.length];
  if (limits.includes('knee') || limits.includes('ankle')) return p.equipment.includes('bicycle') ? 'cycling' : 'swimming';
  return 'walking';
}

export function generateDailyPlan(input: PlanInput): DailyPlan {
  const { profile: p, date } = input;
  const rules = getSafetyRules(p.age);
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const limits = parseLimitations(p.limitations);
  const level = p.fitnessLevel;
  const seed = dayOfYear(date);
  const advice = restAdvice({ date, logs: input.logs, checkIn: input.checkIn, sleep: input.sleep, profile: p });
  // Decisions use the days before today; the progress note includes today's logs too.
  const week = weeklyActivity(input.logs.filter((l) => l.date < date), date, rules);
  const weekSoFar = weeklyActivity(input.logs.filter((l) => l.date <= date), date, rules);
  const notes: string[] = [];
  const reasons = [...advice.reasons];
  const available = Math.max(10, p.minutesPerDay);
  const pool = availableExercises(p, limits, youth);

  if (limits.includes('heart')) {
    notes.push('You mentioned a heart or blood-pressure condition. Please check with your doctor about which activities and intensities are right for you, and stop if you feel chest pain, dizziness or unusual breathlessness.');
  }
  if (limits.some((l) => l !== 'heart')) {
    notes.push(`Plan adjusted for your ${limits.filter((l) => l !== 'heart').join(', ')} limitation${limits.length > 1 ? 's' : ''}. Stop any movement that causes pain, and consider seeing a physiotherapist if it persists.`);
  }
  if (youth && (p.equipment.includes('gym_access') || p.sports.includes('gym'))) {
    notes.push('Strength training is great for teens. If you use weights, learn the technique with a qualified coach and choose weights you can lift with good form; there is no need to lift maximal loads.');
  }

  const guidelineNote = youth
    ? `Goal: an average of 60 minutes of moderate-to-vigorous activity a day across the week. Sports, PE, cycling, walking to school and active play all count. This week so far: ${weekSoFar.totalMinutes} min.`
    : `Goal: ${rules.activity.weeklyMinutes}–${rules.activity.weeklyMinutesUpper} minutes of moderate activity a week (vigorous minutes count double) and strength work on ${rules.activity.strengthDaysPerWeek}+ days. This week so far: ${weekSoFar.guidelineMinutes} min, ${weekSoFar.strengthDays} strength day${weekSoFar.strengthDays === 1 ? '' : 's'}.`;

  const finish = (plan: Omit<DailyPlan, 'totalMinutes' | 'guidelineNote' | 'reasons' | 'notes' | 'date' | 'estimatedKcal'>): DailyPlan => {
    const totalMinutes = plan.items.filter((i) => i.kind !== 'everyday').reduce((s, i) => s + i.minutes, 0);
    let estimatedKcal: number | undefined;
    if (rules.showExerciseEnergy) {
      estimatedKcal = Math.round(
        plan.items
          .filter((i) => i.kind !== 'everyday')
          .reduce((s, i) => {
            const met = i.activity ? ACTIVITIES[i.activity].met[i.intensity ?? ACTIVITIES[i.activity].defaultIntensity] : i.kind === 'exercise' ? 5 : 2.5;
            return s + exerciseEnergyKcal(p.weightKg, i.minutes, met);
          }, 0) / 10,
      ) * 10;
    }
    return { ...plan, date, totalMinutes, guidelineNote, reasons, notes, estimatedKcal };
  };

  // Rest day
  if (advice.level === 'rest') {
    return finish({
      type: 'rest',
      title: 'Rest & recover',
      summary: 'Today is a rest day. Gentle movement is optional; sleep, water and regular meals matter most.',
      items: [
        { id: 'walk-easy', kind: 'main', name: 'Easy walk (optional)', detail: 'Relaxed pace, as long as it feels good', minutes: 10, activity: 'walking', intensity: 'light' },
        { id: 'ex-cat-cow', kind: 'cooldown', name: 'Gentle stretching', detail: 'Cat–cow, child’s pose, hamstring stretch', minutes: 8, activity: 'stretching', intensity: 'light' },
      ],
    });
  }

  // Light / recovery day
  if (advice.level === 'light') {
    const stretches = pickExercises(pool, ['mobility', 'mobility', 'mobility'], seed);
    return finish({
      type: 'recovery',
      title: 'Easy recovery day',
      summary: 'Keep moving gently today. Easy activity helps you recover without adding strain.',
      items: [
        { id: 'walk', kind: 'main', name: p.sports.includes('yoga') ? 'Gentle yoga flow' : 'Easy walk', detail: 'Comfortable pace, you should be able to chat', minutes: Math.min(20, available), activity: p.sports.includes('yoga') ? 'yoga' : 'walking', intensity: 'light' },
        ...stretches.map((e) => ({ ...exerciseItem(e, level), kind: 'cooldown' as const })),
      ],
    });
  }

  // Normal day: decide strength vs cardio/sport.
  const strengthTarget = rules.activity.strengthDaysPerWeek;
  const daysLeft = 7 - dayOfWeek(date);
  const strengthYesterday = input.logs.some((l) => l.date === addDays(date, -1) && l.strength);
  const strengthNeeded = week.strengthDays < strengthTarget && !strengthYesterday && (strengthTarget - week.strengthDays >= daysLeft / 2 || seed % 2 === 0);
  const boneNeeded = youth && week.boneDays < rules.activity.boneDaysPerWeek;

  const baseMinutes = youth ? 60 : { beginner: 25, intermediate: 35, advanced: 45 }[level];
  let sessionMinutes = Math.min(available, baseMinutes);
  if (input.checkIn?.fatigue === 3) {
    sessionMinutes = Math.round(sessionMinutes * 0.85);
    reasons.push('You feel a bit tired, so the session is slightly shorter.');
  }

  if (strengthNeeded) {
    const foci: Exercise['focus'][] = ['legs', 'push', 'pull', 'core'];
    if (boneNeeded) foci.push('bone');
    if (rules.ageGroup === 'older_adult') foci.push('balance');
    if (level !== 'beginner' && !youth) foci.push('legs');
    const exercises = pickExercises(pool, foci, seed);
    const items: PlanItem[] = [WARMUP, ...exercises.map((e) => exerciseItem(e, level)), COOLDOWN];
    const total = items.reduce((s, i) => s + i.minutes, 0);
    if (youth && total < sessionMinutes) {
      const act = choosePreferredActivity(p, limits, seed, true);
      items.splice(items.length - 1, 0, {
        id: `main-${act}`,
        kind: 'main',
        name: ACTIVITIES[act].label,
        detail: 'Any pace that gets you a little out of breath',
        minutes: Math.max(10, Math.min(sessionMinutes - total, 40)),
        activity: act,
        intensity: ACTIVITIES[act].defaultIntensity,
      });
    }
    reasons.push(
      `Strength day: ${week.strengthDays} of ${strengthTarget} strength sessions done this week${boneNeeded ? ', and some jumping/impact work helps build strong bones' : ''}.`,
    );
    if (youth) addEverydayItem(items, sessionMinutes);
    return finish({
      type: youth ? 'mixed' : 'strength',
      title: youth ? 'Strength & play' : 'Strength session',
      summary: 'Muscle-strengthening work for the whole body. Move with control and rest 45–90 seconds between sets.',
      items,
    });
  }

  // Cardio / sport day
  const act = choosePreferredActivity(p, limits, seed, youth || seed % 3 === 0);
  const meta = ACTIVITIES[act];
  const intensity: Intensity = level === 'beginner' && meta.defaultIntensity === 'vigorous' ? 'moderate' : meta.defaultIntensity;
  const mainMinutes = Math.max(10, sessionMinutes - 10);
  const items: PlanItem[] = [
    WARMUP,
    {
      id: `main-${act}`,
      kind: 'main',
      name: meta.label,
      detail:
        intensity === 'vigorous'
          ? 'Hard enough that talking is difficult; take breaks as needed'
          : intensity === 'moderate'
            ? 'Breathing faster but you can still talk'
            : 'Relaxed and comfortable',
      minutes: mainMinutes,
      activity: act,
      intensity,
    },
  ];
  if (boneNeeded && !meta.boneLoading) {
    const bone = pickExercises(pool, ['bone'], seed)[0];
    if (bone) items.push(exerciseItem(bone, level));
  }
  items.push(COOLDOWN);
  reasons.push(
    p.sports.includes(act)
      ? `${meta.label} is one of your favourite activities.`
      : `${meta.label} suits your equipment${limits.length ? ' and limitations' : ''}.`,
  );
  if (youth) addEverydayItem(items, sessionMinutes);
  return finish({
    type: meta.sport ? 'sport' : 'cardio',
    title: meta.sport ? `${meta.label} day` : `${meta.label} session`,
    summary: meta.sport ? 'Play your sport, practise skills or join a game. It all counts.' : 'Steady aerobic activity for heart, lungs and energy.',
    items,
  });
}

function addEverydayItem(items: PlanItem[], sessionMinutes: number) {
  const planned = items.reduce((s, i) => s + i.minutes, 0);
  const gap = Math.max(0, 60 - planned);
  items.push({
    id: 'everyday',
    kind: 'everyday',
    name: 'Everyday movement',
    detail:
      gap > 0
        ? `Walk or cycle to school or tuition, take the stairs, play outside. About ${gap} more minutes gets you to 60 today.`
        : 'Walking, cycling and active play during the day all add up.',
    minutes: Math.max(gap, sessionMinutes >= 60 ? 0 : 10),
    activity: 'walking',
    intensity: 'moderate',
  });
}

/** Estimated energy for a logged activity. Informational for adults only. */
export function loggedActivityKcal(p: Profile, log: Pick<ExerciseLog, 'activity' | 'intensity' | 'minutes'>): number | undefined {
  if (!getSafetyRules(p.age).showExerciseEnergy) return undefined;
  return Math.round(exerciseEnergyKcal(p.weightKg, log.minutes, ACTIVITIES[log.activity].met[log.intensity]) / 5) * 5;
}
