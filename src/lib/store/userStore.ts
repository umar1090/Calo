import type { Food } from '@/data/foods';
import type { CheckIn, ExerciseLog, MealEntry, Profile, SleepLog, WeightLog } from '@/engine/types';
import { ACTIVITIES } from '@/engine/activity/catalog';
import { lastNDays, startOfWeek, addDays } from '@/engine/dates';
import { randomId } from '../auth/crypto';
import {
  backupSchema,
  checkInSchema,
  customFoodSchema,
  emptyDB,
  exerciseSchema,
  mealEntrySchema,
  profileSchema,
  sleepSchema,
  waterSchema,
  weightSchema,
  type ChatMessage,
  type CustomFoodInput,
  type Preferences,
  type RecState,
  type UserDB,
  type WeeklyProgress,
} from './schema';
import { z } from 'zod';

export interface Persistence {
  save(db: UserDB): Promise<void>;
}

export class ValidationError extends Error {
  constructor(public issues: { path: string; message: string }[]) {
    super(issues[0]?.message ?? 'Invalid data');
    this.name = 'ValidationError';
  }
}

function check<T>(schema: z.ZodType<T>, value: unknown): T {
  const r = schema.safeParse(value);
  if (!r.success) {
    throw new ValidationError(r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  }
  return r.data;
}

type Listener = () => void;

/**
 * The user's data repository. Holds the decrypted database in memory, applies
 * validated, immutable updates and writes every change through the
 * persistence layer (encrypted localStorage in the app, memory in tests).
 */
export class UserStore {
  private db: UserDB;
  private listeners = new Set<Listener>();
  private saving: Promise<void> = Promise.resolve();
  public lastError: Error | null = null;

  constructor(
    initial: UserDB,
    private persistence: Persistence,
    private clock: () => Date = () => new Date(),
  ) {
    this.db = migrate(initial);
  }

  // ------------------------------------------------------------ subscription
  getSnapshot = (): UserDB => this.db;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Resolves once every pending write has reached storage. */
  flush(): Promise<void> {
    return this.saving;
  }

  private commit(next: UserDB) {
    this.db = { ...next, updatedAt: this.clock().toISOString() };
    this.listeners.forEach((l) => l());
    const snapshot = this.db;
    // A failed save must not block later saves, so the chain recovers before each write.
    this.saving = this.saving
      .catch(() => undefined)
      .then(() => this.persistence.save(snapshot))
      .then(
        () => {
          this.lastError = null;
        },
        (e: Error) => {
          this.lastError = e;
          throw e;
        },
      );
    return this.saving;
  }

  private nowIso() {
    return this.clock().toISOString();
  }

  // ---------------------------------------------------------------- profile
  saveProfile(input: Profile) {
    const profile = check(profileSchema, input) as Profile;
    let prefs = this.db.preferences;
    // Weight tracking defaults depend on age (see safety policy).
    if (!this.db.profile && profile.age < 18) prefs = { ...prefs, trackWeight: false };
    return this.commit({ ...this.db, profile, preferences: prefs });
  }

  savePreferences(patch: Partial<Preferences>) {
    return this.commit({ ...this.db, preferences: { ...this.db.preferences, ...patch } });
  }

  // ---------------------------------------------------------------- meals
  addEntries(entries: MealEntry[]) {
    const valid = entries.map((e) => check(mealEntrySchema, e) as MealEntry);
    return this.commit({ ...this.db, entries: [...this.db.entries, ...valid] });
  }

  updateEntry(id: string, patch: Partial<Omit<MealEntry, 'id'>>) {
    const current = this.db.entries.find((e) => e.id === id);
    if (!current) throw new Error('Entry not found');
    const updated = check(mealEntrySchema, { ...current, ...patch, id }) as MealEntry;
    return this.commit({ ...this.db, entries: this.db.entries.map((e) => (e.id === id ? updated : e)) });
  }

  deleteEntry(id: string) {
    if (!this.db.entries.some((e) => e.id === id)) throw new Error('Entry not found');
    return this.commit({ ...this.db, entries: this.db.entries.filter((e) => e.id !== id) });
  }

  // ---------------------------------------------------------------- activity
  addExercise(input: Omit<ExerciseLog, 'id' | 'loggedAt' | 'strength' | 'boneLoading'> & Partial<Pick<ExerciseLog, 'strength' | 'boneLoading'>>) {
    const meta = ACTIVITIES[input.activity];
    const log = check(exerciseSchema, {
      ...input,
      id: randomId(),
      strength: input.strength ?? meta?.strength ?? false,
      boneLoading: input.boneLoading ?? meta?.boneLoading ?? false,
      loggedAt: this.nowIso(),
    }) as ExerciseLog;
    return this.commit({ ...this.db, exercise: [...this.db.exercise, log] }).then(() => log);
  }

  updateExercise(id: string, patch: Partial<Omit<ExerciseLog, 'id'>>) {
    const current = this.db.exercise.find((e) => e.id === id);
    if (!current) throw new Error('Activity not found');
    const updated = check(exerciseSchema, { ...current, ...patch, id }) as ExerciseLog;
    return this.commit({ ...this.db, exercise: this.db.exercise.map((e) => (e.id === id ? updated : e)) });
  }

  deleteExercise(id: string) {
    return this.commit({ ...this.db, exercise: this.db.exercise.filter((e) => e.id !== id) });
  }

  // ---------------------------------------------------------------- water
  addWater(date: string, ml: number) {
    const log = check(waterSchema, { id: randomId(), date, ml, loggedAt: this.nowIso() });
    return this.commit({ ...this.db, water: [...this.db.water, log] });
  }

  removeLastWater(date: string) {
    const logs = this.db.water.filter((w) => w.date === date);
    if (!logs.length) return Promise.resolve();
    const last = logs.reduce((a, b) => (a.loggedAt > b.loggedAt ? a : b));
    return this.commit({ ...this.db, water: this.db.water.filter((w) => w.id !== last.id) });
  }

  // ---------------------------------------------------------------- wellbeing
  setSleep(input: SleepLog) {
    const s = check(sleepSchema, input) as SleepLog;
    return this.commit({ ...this.db, sleep: [...this.db.sleep.filter((x) => x.date !== s.date), s] });
  }

  setCheckIn(input: CheckIn) {
    const c = check(checkInSchema, input) as CheckIn;
    return this.commit({ ...this.db, checkIns: [...this.db.checkIns.filter((x) => x.date !== c.date), c] });
  }

  toggleHabit(date: string, habitId: string) {
    const exists = this.db.habitLogs.some((h) => h.date === date && h.habitId === habitId);
    return this.commit({
      ...this.db,
      habitLogs: exists ? this.db.habitLogs.filter((h) => !(h.date === date && h.habitId === habitId)) : [...this.db.habitLogs, { date, habitId }],
    });
  }

  addWeight(input: WeightLog) {
    const w = check(weightSchema, input) as WeightLog;
    return this.commit({ ...this.db, weights: [...this.db.weights.filter((x) => x.date !== w.date), w].sort((a, b) => a.date.localeCompare(b.date)) });
  }

  deleteWeight(date: string) {
    return this.commit({ ...this.db, weights: this.db.weights.filter((w) => w.date !== date) });
  }

  // ---------------------------------------------------------------- foods
  addCustomFood(input: CustomFoodInput): Promise<Food> {
    const c = check(customFoodSchema, input);
    const per = (v: number) => Math.round((v / c.grams) * 1000) / 10;
    const food: Food = {
      id: `custom-${randomId()}`,
      name: c.name,
      aliases: [],
      category: 'extras',
      diet: 'nonveg',
      rootVeg: false,
      allergens: [],
      groups: [],
      vegFraction: 0,
      fruitFraction: 0,
      per100: { kcal: per(c.kcal), protein: per(c.protein), carbs: per(c.carbs), fat: per(c.fat), fiber: per(c.fiber) },
      portions: [{ id: 'serving', label: c.portionLabel, grams: c.grams }],
      defaultPortionId: 'serving',
      unit: 'g',
      homemade: true,
      oilAdjustable: false,
      meals: ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'],
      cuisines: [],
      cost: 1,
      custom: true,
    };
    return this.commit({ ...this.db, customFoods: [...this.db.customFoods, food] }).then(() => food);
  }

  deleteCustomFood(id: string) {
    return this.commit({ ...this.db, customFoods: this.db.customFoods.filter((f) => f.id !== id) });
  }

  // ---------------------------------------------------------------- recs, plan, chat
  setRecState(state: RecState) {
    return this.commit({ ...this.db, recStates: [...this.db.recStates.filter((r) => !(r.date === state.date && r.recId === state.recId)), state] });
  }

  togglePlanCheck(date: string, itemId: string) {
    const current = this.db.planChecks[date] ?? [];
    const next = current.includes(itemId) ? current.filter((i) => i !== itemId) : [...current, itemId];
    return this.commit({ ...this.db, planChecks: { ...this.db.planChecks, [date]: next } });
  }

  appendChat(messages: Omit<ChatMessage, 'id' | 'at'>[]) {
    const stamped = messages.map((m) => ({ ...m, id: randomId(), at: this.nowIso() }));
    // Keep the last 200 messages.
    return this.commit({ ...this.db, chat: [...this.db.chat, ...stamped].slice(-200) });
  }

  clearChat() {
    return this.commit({ ...this.db, chat: [] });
  }

  // ---------------------------------------------------------------- weekly progress
  /** Recomputes and stores weekly summaries for the last `weeks` weeks. */
  refreshWeeklyProgress(today: string, weeks = 8) {
    const out: WeeklyProgress[] = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(startOfWeek(today), -7 * w);
      const days = lastNDays(addDays(weekStart, 6), 7).filter((d) => d <= today);
      const entries = this.db.entries.filter((e) => days.includes(e.date));
      const daysLogged = new Set(entries.map((e) => e.date)).size;
      const water = this.db.water.filter((x) => days.includes(x.date));
      const ex = this.db.exercise.filter((x) => days.includes(x.date));
      const meals = days.map((d) => new Set(entries.filter((e) => e.date === d && e.mealType !== 'beverage').map((e) => e.mealType)).size);
      const r1 = (n: number) => Math.round(n * 10) / 10;
      out.push({
        weekStart,
        daysLogged,
        avgMealsPerDay: daysLogged ? r1(meals.reduce((a, b) => a + b, 0) / daysLogged) : 0,
        avgProtein: daysLogged ? Math.round(entries.reduce((s, e) => s + e.nutrients.protein, 0) / daysLogged) : 0,
        avgVegServings: daysLogged ? r1(entries.reduce((s, e) => s + e.vegServings, 0) / daysLogged) : 0,
        activeMinutes: ex.reduce((s, e) => s + e.minutes, 0),
        workouts: ex.length,
        avgWaterMl: days.length ? Math.round(water.reduce((s, x) => s + x.ml, 0) / days.length) : 0,
        updatedAt: this.nowIso(),
      });
    }
    const keep = this.db.weeklyProgress.filter((p) => !out.some((o) => o.weekStart === p.weekStart));
    const next = [...keep, ...out].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    if (JSON.stringify(stripTimes(next)) === JSON.stringify(stripTimes(this.db.weeklyProgress))) return Promise.resolve();
    return this.commit({ ...this.db, weeklyProgress: next });
  }

  // ---------------------------------------------------------------- backup
  exportBackup(): string {
    const { preferences, ...rest } = this.db;
    const { claudeApiKey: _omit, ...safePrefs } = preferences;
    void _omit;
    return JSON.stringify({ app: 'nutritrack', exportedAt: this.nowIso(), data: { ...rest, preferences: safePrefs } }, null, 2);
  }

  importBackup(json: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new ValidationError([{ path: '', message: 'That file is not valid JSON.' }]);
    }
    const backup = check(backupSchema, parsed);
    const d = backup.data as unknown as UserDB;
    const base = emptyDB(this.clock());
    const next: UserDB = {
      ...base,
      profile: d.profile ? (check(profileSchema, d.profile) as Profile) : null,
      preferences: { ...base.preferences, ...(typeof d.preferences === 'object' && d.preferences ? d.preferences : {}), claudeApiKey: this.db.preferences.claudeApiKey },
      entries: d.entries.map((e) => check(mealEntrySchema, e) as MealEntry),
      exercise: d.exercise.map((e) => check(exerciseSchema, e) as ExerciseLog),
      water: d.water.map((e) => check(waterSchema, e)),
      sleep: d.sleep.map((e) => check(sleepSchema, e) as SleepLog),
      checkIns: d.checkIns.map((e) => check(checkInSchema, e) as CheckIn),
      habitLogs: d.habitLogs.filter((h) => h && typeof h.date === 'string' && typeof h.habitId === 'string'),
      weights: d.weights.map((e) => check(weightSchema, e) as WeightLog),
      customFoods: (d.customFoods as Food[]).filter((f) => f && typeof f.id === 'string' && f.custom === true && f.per100 && Array.isArray(f.portions)),
      recStates: Array.isArray(d.recStates) ? d.recStates : [],
      planChecks: d.planChecks && typeof d.planChecks === 'object' ? d.planChecks : {},
      weeklyProgress: Array.isArray(d.weeklyProgress) ? d.weeklyProgress : [],
      chat: [],
    };
    return this.commit(next);
  }
}

function stripTimes(list: WeeklyProgress[]) {
  return list.map(({ updatedAt: _u, ...rest }) => {
    void _u;
    return rest;
  });
}

/** Forward-compatible migration hook for stored databases. */
export function migrate(db: UserDB): UserDB {
  const base = emptyDB();
  return {
    ...base,
    ...db,
    preferences: { ...base.preferences, ...db.preferences },
    planChecks: db.planChecks ?? {},
    weeklyProgress: db.weeklyProgress ?? [],
  };
}

export class MemoryPersistence implements Persistence {
  public saved: UserDB | null = null;
  public saves = 0;
  async save(db: UserDB) {
    this.saved = db;
    this.saves++;
  }
}
