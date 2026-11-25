import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { CalendarCheck, Droplets, Footprints, Moon, Salad, Scale, Smile, Sparkles, Check } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Card, CardHeader, Field, Segmented } from '@/components/ui/primitives';
import { TrendChart } from '@/components/charts/TrendChart';
import { useAction, useDB, useProfile, useTargets, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { addDays, formatShortDate, lastNDays, weekdayShort } from '@/engine/dates';
import { getSafetyRules } from '@/engine/safety/policy';
import type { HabitDef } from '@/lib/store/schema';
import type { UserDB } from '@/lib/store/schema';
import type { NutritionTargets } from '@/engine/nutrition/targets';

const r1 = (n: number) => Math.round(n * 10) / 10;

export default function Progress() {
  const today = useToday();
  const db = useDB();
  const store = useStore();
  const profile = useProfile();
  const targets = useTargets();
  const rules = getSafetyRules(profile.age);
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const [range, setRange] = useState<'7' | '30'>('7');
  const days = useMemo(() => lastNDays(today, Number(range)), [today, range]);

  useEffect(() => {
    store.refreshWeeklyProgress(today).catch(() => undefined);
  }, [store, today, db.entries.length, db.exercise.length, db.water.length]);

  const rows = useMemo(
    () =>
      days.map((d) => {
        const entries = db.entries.filter((e) => e.date === d);
        const meals = new Set(entries.filter((e) => e.mealType !== 'beverage').map((e) => e.mealType)).size;
        return {
          date: d,
          kcal: Math.round(entries.reduce((s, e) => s + e.nutrients.kcal, 0)),
          protein: r1(entries.reduce((s, e) => s + e.nutrients.protein, 0)),
          veg: r1(entries.reduce((s, e) => s + e.vegServings, 0)),
          fruit: r1(entries.reduce((s, e) => s + e.fruitServings, 0)),
          meals,
          active: db.exercise.filter((e) => e.date === d).reduce((s, e) => s + e.minutes, 0),
          water: r1(db.water.filter((w) => w.date === d).reduce((s, w) => s + w.ml, 0) / 1000),
          sleep: db.sleep.find((s) => s.date === d)?.hours ?? null,
          energy: db.checkIns.find((c) => c.date === d)?.energy ?? null,
        };
      }),
    [days, db],
  );

  const loggedDays = rows.filter((r) => r.meals > 0).length;
  const consistentDays = rows.filter((r) => r.meals >= 2).length;
  const streak = (() => {
    let n = 0;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].meals > 0) n++;
      else if (i === rows.length - 1) continue; // today may not be logged yet
      else break;
    }
    return n;
  })();
  const avg = (k: 'protein' | 'veg' | 'active' | 'water' | 'kcal') => (loggedDays || k === 'active' || k === 'water' ? r1(rows.reduce((s, r) => s + (r[k] as number), 0) / (k === 'active' || k === 'water' ? rows.length : Math.max(loggedDays, 1))) : 0);
  const weeks = db.weeklyProgress.slice(-8);

  return (
    <div>
      <PageHeader
        eyebrow="Progress"
        title="Your habits & trends"
        subtitle="Consistency matters more than any single day."
        action={<Segmented label="Time range" value={range} onChange={setRange} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={<CalendarCheck className="h-4 w-4" />} label="Days with 2+ meals logged" value={`${consistentDays}/${rows.length}`} />
        <Tile icon={<Sparkles className="h-4 w-4" />} label="Logging streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <Tile icon={<Salad className="h-4 w-4" />} label="Avg protein (logged days)" value={`${avg('protein')} g`} />
        <Tile icon={<Footprints className="h-4 w-4" />} label="Avg active minutes" value={`${avg('active')} min`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card aria-label="Meal consistency" className="lg:col-span-2">
          <CardHeader icon={<CalendarCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Consistency" title="Meal consistency" />
          <div className={clsx('grid gap-1.5', range === '7' && 'grid-cols-7')} style={range === '30' ? { gridTemplateColumns: 'repeat(auto-fill, minmax(34px, 1fr))' } : undefined}>
            {rows.map((r) => (
              <div key={r.date} className="text-center">
                <div
                  className={clsx(
                    'mx-auto flex aspect-square w-full max-w-[44px] items-center justify-center rounded-xl text-xs font-semibold num',
                    r.meals >= 3 ? 'bg-sage-600 text-cream-50' : r.meals === 2 ? 'bg-sage-300 text-forest-900' : r.meals === 1 ? 'bg-sage-100 text-forest-700' : 'bg-cream-200 text-forest-400',
                  )}
                  title={`${formatShortDate(r.date)}: ${r.meals} meals`}
                >
                  {r.meals || ''}
                </div>
                <p className="mt-1 text-[10px] text-forest-500">{range === '7' ? weekdayShort(r.date) : Number(r.date.slice(8))}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-forest-500">Number of meals (breakfast, lunch, dinner, snacks) logged each day. Darker means more regular eating.</p>
        </Card>

        <Card aria-label="Protein trend">
          <CardHeader icon={<Salad className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Nutrition" title="Protein per day" />
          <TrendChart title="Protein per day" data={rows} series={[{ key: 'protein', label: 'Protein', color: 'var(--chart-1)' }]} unit="g" reference={targets.protein.min} referenceLabel={`aim ${targets.protein.min} g`} />
        </Card>

        <Card aria-label="Vegetables and fruit trend">
          <CardHeader icon={<Salad className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Nutrition" title="Vegetables & fruit" />
          <TrendChart
            title="Vegetable and fruit servings per day"
            data={rows}
            series={[
              { key: 'veg', label: 'Vegetables', color: 'var(--chart-1)' },
              { key: 'fruit', label: 'Fruit', color: 'var(--chart-2)' },
            ]}
            unit="servings"
          />
        </Card>

        {rules.energyFraming === 'target' && (
          <Card aria-label="Energy trend">
            <CardHeader icon={<Smile className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Nutrition" title="Estimated energy intake" />
            <TrendChart title="Estimated energy intake per day" data={rows} series={[{ key: 'kcal', label: 'Energy', color: 'var(--chart-single)' }]} unit="kcal" reference={targets.energyTarget} referenceLabel="estimate" />
            <p className="mt-2 text-xs text-forest-500">Day-to-day variation is normal. Weekly patterns are more useful than single days.</p>
          </Card>
        )}

        <Card aria-label="Activity trend">
          <CardHeader icon={<Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Activity" title="Active minutes" />
          <TrendChart title="Active minutes per day" data={rows} series={[{ key: 'active', label: 'Active', color: 'var(--chart-2)' }]} unit="min" reference={rules.activity.dailyMinutes} referenceLabel={`${rules.activity.dailyMinutes} min`} />
        </Card>

        <Card aria-label="Workout frequency">
          <CardHeader icon={<Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Activity" title="Workouts per week" />
          <TrendChart
            title="Workouts per week"
            data={weeks.map((w) => ({ date: w.weekStart, workouts: w.workouts }))}
            series={[{ key: 'workouts', label: 'Workouts', color: 'var(--chart-3)' }]}
            unit="sessions"
          />
          <p className="mt-2 text-xs text-forest-500">Bars are labelled by the week's start date (Monday).</p>
        </Card>

        <Card aria-label="Water trend">
          <CardHeader icon={<Droplets className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Hydration" title="Water per day" />
          <TrendChart title="Water per day" data={rows} series={[{ key: 'water', label: 'Water', color: 'var(--chart-3)' }]} unit="L" reference={targets.waterMl / 1000} referenceLabel={`${(targets.waterMl / 1000).toFixed(1)} L`} />
        </Card>

        <Card aria-label="Energy level trend">
          <CardHeader icon={<Smile className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Wellbeing" title="How you've felt" />
          <TrendChart title="Energy level from daily check-ins (1 to 5)" kind="line" data={rows} series={[{ key: 'energy', label: 'Energy (1–5)', color: 'var(--chart-1)' }]} unit="/ 5" yDomain={[0, 5]} />
          <p className="mt-2 text-xs text-forest-500">From your daily check-ins. Sleep, meals and rest all shape how you feel.</p>
        </Card>

        {db.preferences.trackSleep && (
          <Card aria-label="Sleep trend">
            <CardHeader icon={<Moon className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Sleep" title="Hours of sleep" />
            <TrendChart
              title="Hours of sleep per night"
              kind="line"
              data={rows}
              series={[{ key: 'sleep', label: 'Sleep', color: 'var(--chart-3)' }]}
              unit="h"
              reference={youth ? 8 : 7}
              referenceLabel={youth ? '8 h' : '7 h'}
              yDomain={[0, 12]}
            />
          </Card>
        )}

        <HabitTracker today={today} db={db} targets={targets} className="lg:col-span-2" />

        {db.preferences.trackWeight && rules.weightTracking !== 'unavailable' && <WeightCard today={today} youth={youth} />}
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4">
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-100 text-sage-700" aria-hidden>
        {icon}
      </span>
      <p className="num mt-3 font-display text-xl font-semibold">{value}</p>
      <p className="text-xs text-forest-500">{label}</p>
    </div>
  );
}

function autoHabitDone(h: HabitDef, date: string, db: UserDB, targets: NutritionTargets): boolean {
  const entries = db.entries.filter((e) => e.date === date);
  switch (h.auto) {
    case 'breakfast':
      return entries.some((e) => e.mealType === 'breakfast');
    case 'veg3':
      return entries.reduce((s, e) => s + e.vegServings, 0) >= 3;
    case 'protein': {
      const meals = (['breakfast', 'lunch', 'dinner'] as const).filter((m) => entries.some((e) => e.mealType === m && e.groups.some((g) => ['pulse', 'dairy', 'egg', 'meat_fish', 'soy'].includes(g))));
      return meals.length >= 2;
    }
    case 'water':
      return db.water.filter((w) => w.date === date).reduce((s, w) => s + w.ml, 0) >= targets.waterMl;
    case 'active':
      return db.exercise.filter((e) => e.date === date).reduce((s, e) => s + e.minutes, 0) >= targets.rules.activity.dailyMinutes;
    case 'sleep':
      return (db.sleep.find((s) => s.date === date)?.hours ?? 0) >= 7;
    default:
      return db.habitLogs.some((l) => l.date === date && l.habitId === h.id);
  }
}

function HabitTracker({ today, db, targets, className }: { today: string; db: UserDB; targets: NutritionTargets; className?: string }) {
  const store = useStore();
  const run = useAction();
  const days = lastNDays(today, 7);
  const habits = db.preferences.habits.map((h) => (h.auto === 'active' ? { ...h, label: `Active for ${targets.rules.activity.dailyMinutes}+ minutes` } : h));
  return (
    <Card aria-label="Habit tracker" className={className}>
      <CardHeader icon={<Check className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Habits" title="Habit tracker" />
      <div className="-mx-2 overflow-x-auto px-2">
        <table className="w-full min-w-[340px] text-sm">
          <thead>
            <tr>
              <th scope="col" className="pb-2 text-left text-xs font-semibold text-forest-500">
                Habit
              </th>
              {days.map((d) => (
                <th key={d} scope="col" className="pb-2 text-center text-xs font-semibold text-forest-500">
                  {weekdayShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => (
              <tr key={h.id} className="border-t border-cream-300/60">
                <th scope="row" className="py-2 pr-2 text-left text-xs font-medium sm:text-sm">
                  {h.label}
                  {h.auto && <span className="ml-1 text-[10px] font-normal text-forest-400">auto</span>}
                </th>
                {days.map((d) => {
                  const done = autoHabitDone(h, d, db, targets);
                  const manual = !h.auto;
                  return (
                    <td key={d} className="py-1.5 text-center">
                      <button
                        disabled={!manual}
                        onClick={() => run(() => store.toggleHabit(d, h.id))}
                        aria-pressed={done}
                        aria-label={`${h.label} on ${formatShortDate(d)}: ${done ? 'done' : 'not done'}`}
                        className={clsx(
                          'mx-auto flex h-7 w-7 items-center justify-center rounded-full transition sm:h-8 sm:w-8',
                          done ? 'bg-sage-500 text-cream-50' : 'bg-cream-200 text-transparent',
                          manual ? 'hover:ring-2 hover:ring-sage-300' : 'cursor-default',
                        )}
                      >
                        <Check className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-forest-500">Auto habits tick themselves from your logs. Tap the others when you've done them.</p>
    </Card>
  );
}

function WeightCard({ today, youth }: { today: string; youth: boolean }) {
  const db = useDB();
  const store = useStore();
  const run = useAction();
  const [kg, setKg] = useState('');
  const recent = db.weights.filter((w) => w.date >= addDays(today, -90));
  return (
    <Card aria-label="Weight (optional)">
      <CardHeader icon={<Scale className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Optional" title="Weight" />
      {youth && <p className="mb-3 rounded-2xl bg-dew-50 p-3 text-xs text-dew-600">Weight naturally changes as you grow. This is just a record; NutriTrack doesn't set weight goals for under-18s.</p>}
      {recent.length >= 2 ? (
        <TrendChart title="Weight over the last 90 days" kind="line" height={140} data={recent.map((w) => ({ date: w.date, kg: w.kg }))} series={[{ key: 'kg', label: 'Weight', color: 'var(--chart-single)' }]} unit="kg" yDomain={[Math.floor(Math.min(...recent.map((w) => w.kg)) - 2), Math.ceil(Math.max(...recent.map((w) => w.kg)) + 2)]} />
      ) : (
        <p className="text-sm text-forest-500">Add a couple of entries to see a trend. Weekly is plenty.</p>
      )}
      <div className="mt-3 flex items-end gap-2">
        <Field label="Today's weight (kg)" htmlFor="weight-today">
          <input id="weight-today" className="input max-w-[8rem]" type="number" inputMode="decimal" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} />
        </Field>
        <button
          className="btn-secondary"
          onClick={async () => {
            const ok = await run(() => store.addWeight({ date: today, kg: Number(kg) }), 'Saved');
            if (ok.ok) setKg('');
          }}
          disabled={!kg}
        >
          Save
        </button>
      </div>
    </Card>
  );
}
