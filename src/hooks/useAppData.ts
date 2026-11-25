import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useStore } from '@/lib/auth/AuthContext';
import type { UserDB } from '@/lib/store/schema';
import { FOODS, type Food } from '@/data/foods';
import { computeTargets, dayTargets } from '@/engine/nutrition/targets';
import { analyzeDay, type DayContext } from '@/engine/analysis/daily';
import { recommendFoods, type RecContext } from '@/engine/recommendations/foodRecs';
import { addDays, toISODate } from '@/engine/dates';
import type { Profile } from '@/engine/types';
import { useToast } from '@/components/ui/Toast';
import { ValidationError } from '@/lib/store/userStore';
import { AuthError } from '@/lib/auth/localAuth';

export function useDB(): UserDB {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

export function useProfile(): Profile {
  const db = useDB();
  if (!db.profile) throw new Error('Profile missing');
  return db.profile;
}

/** Current time, refreshed every minute and whenever the tab becomes visible. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  return now;
}

export function useToday(): string {
  return toISODate(useNow());
}

export function useFoods(): Food[] {
  const db = useDB();
  return useMemo(() => [...db.customFoods, ...FOODS], [db.customFoods]);
}

export function useTargets() {
  const profile = useProfile();
  return useMemo(() => computeTargets(profile), [profile]);
}

/** Everything the dashboard, log and coach need for one date. */
export function useDay(date: string) {
  const db = useDB();
  const profile = useProfile();
  const targets = useTargets();
  const now = useNow();
  const foods = useFoods();

  return useMemo(() => {
    const entries = db.entries.filter((e) => e.date === date).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
    const water = db.water.filter((w) => w.date === date);
    const waterMl = water.reduce((s, w) => s + w.ml, 0);
    const exercises = db.exercise.filter((e) => e.date === date);
    const day = dayTargets(targets, profile, exercises);
    const ctx: DayContext = { profile, targets, day, date, now, entries, waterMl, exercises };
    const recentEntries = db.entries.filter((e) => e.date < date && e.date >= addDays(date, -7));
    const recCtx: RecContext = { ...ctx, foods, recentEntries };
    const analysis = analyzeDay(ctx);
    const recStates = db.recStates.filter((r) => r.date === date);
    const recommendations = recommendFoods(recCtx, 6).filter((r) => !recStates.some((s) => s.recId === r.id));
    return {
      date,
      entries,
      waterMl,
      exercises,
      day,
      targets,
      analysis,
      recommendations,
      recCtx,
      checkIn: db.checkIns.find((c) => c.date === date),
      sleep: db.sleep.find((s) => s.date === date),
    };
  }, [db, profile, targets, now, foods, date]);
}

export type ActionResult<T> = { ok: true; value: T } | { ok: false };

/** Runs a store action and reports validation/storage errors as a toast. */
export function useAction() {
  const { toast } = useToast();
  return useCallback(
    async <T,>(fn: () => Promise<T> | T, success?: string): Promise<ActionResult<T>> => {
      try {
        const value = await fn();
        if (success) toast(success);
        return { ok: true, value };
      } catch (e) {
        const msg =
          e instanceof ValidationError || e instanceof AuthError
            ? e.message
            : e instanceof Error && /quota|storage/i.test(e.message + e.name)
              ? 'Storage is full, so this change could not be saved. Export a backup and clear old data.'
              : 'Something went wrong while saving. Please try again.';
        toast(msg, 'error');
        return { ok: false };
      }
    },
    [toast],
  );
}
