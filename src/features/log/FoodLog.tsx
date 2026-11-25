import { useState } from 'react';
import { useSearchParams } from 'react-router';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Segmented } from '@/components/ui/primitives';
import { useAction, useDay, useDB, useTargets, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { addDays, formatLongDate, formatShortDate, lastNDays, weekdayShort } from '@/engine/dates';
import type { MealEntry, MealType } from '@/engine/types';
import { MEALS, fmt } from '@/lib/labels';
import { sumNutrients } from '@/engine/nutrition/foodMath';
import { AddFoodSheet } from './AddFoodSheet';
import { MealSection } from './MealSection';
import { WaterCard } from './WaterCard';

export default function FoodLog() {
  const today = useToday();
  const [params, setParams] = useSearchParams();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get('date') ?? '') && params.get('date')! <= today ? params.get('date')! : today;
  const view = params.get('view') === 'week' ? 'week' : 'day';
  const setDate = (d: string) => setParams((p) => {
    const n = new URLSearchParams(p);
    if (d === today) n.delete('date');
    else n.set('date', d);
    return n;
  });
  const setView = (v: 'day' | 'week') => setParams((p) => {
    const n = new URLSearchParams(p);
    if (v === 'week') n.set('view', 'week');
    else n.delete('view');
    return n;
  });

  return (
    <div>
      <PageHeader
        eyebrow="Food log"
        title={date === today ? 'Today' : formatLongDate(date)}
        subtitle={date === today ? formatLongDate(date) : undefined}
        action={
          <Segmented
            label="Log view"
            value={view}
            onChange={setView}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week history' },
            ]}
          />
        }
      />
      {view === 'day' ? <DayLog date={date} today={today} setDate={setDate} /> : <WeekHistory today={today} onPick={(d) => { setDate(d); setView('day'); }} />}
    </div>
  );
}

function DayLog({ date, today, setDate }: { date: string; today: string; setDate: (d: string) => void }) {
  const day = useDay(date);
  const store = useStore();
  const run = useAction();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<{ meal: MealType; editing?: MealEntry | null } | null>(null);
  const framing = day.targets.rules.energyFraming;
  const showKcal = framing !== 'hidden';
  const totals = day.analysis.summary.totals;

  const remove = async (e: MealEntry) => {
    const ok = await run(() => store.deleteEntry(e.id));
    if (ok.ok) toast(`Removed ${e.foodName}`, 'info', { label: 'Undo', onClick: () => run(() => store.addEntries([e])) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 rounded-full bg-cream-50 p-1 shadow-card ring-1 ring-cream-300/70">
        <button className="btn-icon" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Choose date"
            className="rounded-full bg-transparent px-2 py-1 text-sm font-semibold text-forest-800 focus:outline-none"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          {date !== today && (
            <button className="rounded-full bg-sage-100 px-3 py-1 text-xs font-semibold text-sage-800" onClick={() => setDate(today)}>
              Today
            </button>
          )}
        </div>
        <button className="btn-icon" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))}>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="card grid grid-cols-2 gap-px overflow-hidden bg-cream-300/60 p-0 sm:grid-cols-4" aria-label="Daily totals">
        {[
          showKcal ? { label: 'Calories', value: `${fmt(totals.kcal)}`, sub: framing === 'target' ? `of ~${fmt(day.day.energyTarget)} kcal` : `typical ${fmt(day.day.energyRange.min)}–${fmt(day.day.energyRange.max)}` } : { label: 'Meals', value: String(day.analysis.summary.mealsLogged.length), sub: 'logged today' },
          { label: 'Protein', value: `${fmt(totals.protein, 1)} g`, sub: `aim ${day.targets.protein.min}–${day.targets.protein.max} g` },
          { label: 'Carbs', value: `${fmt(totals.carbs)} g`, sub: `${day.targets.carbs.min}–${day.targets.carbs.max} g` },
          { label: 'Fat', value: `${fmt(totals.fat)} g`, sub: `${day.targets.fat.min}–${day.targets.fat.max} g` },
        ].map((x) => (
          <div key={x.label} className="bg-cream-50 px-4 py-3.5">
            <p className="text-xs font-medium text-forest-500">{x.label}</p>
            <p className="num font-display text-xl font-semibold">{x.value}</p>
            <p className="num text-[11px] text-forest-500">{x.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {MEALS.map((m) => (
            <MealSection
              key={m.value}
              meal={m.value}
              showKcal={showKcal}
              entries={day.entries.filter((e) => e.mealType === m.value)}
              onAdd={() => setSheet({ meal: m.value })}
              onEdit={(e) => setSheet({ meal: e.mealType, editing: e })}
              onDelete={remove}
            />
          ))}
        </div>
        <div className="space-y-3">
          <WaterCard date={date} waterMl={day.waterMl} targetMl={day.day.waterMl} active={day.day.waterMl > day.targets.waterMl} />
          <p className="flex gap-2 rounded-2xl bg-cream-200/60 p-4 text-xs text-forest-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Estimates for homemade Indian food may vary with oil, ingredients and portion size. Use the oil setting or edit values when you know them.
          </p>
        </div>
      </div>

      <AddFoodSheet open={sheet !== null} onClose={() => setSheet(null)} date={date} meal={sheet?.meal ?? 'breakfast'} editing={sheet?.editing ?? null} />
    </div>
  );
}

function WeekHistory({ today, onPick }: { today: string; onPick: (d: string) => void }) {
  const db = useDB();
  const targets = useTargets();
  const [end, setEnd] = useState(today);
  const days = lastNDays(end, 7).reverse();
  const showKcal = targets.rules.energyFraming !== 'hidden';
  const rows = days.map((d) => {
    const entries = db.entries.filter((e) => e.date === d);
    const n = sumNutrients(entries.map((e) => e.nutrients));
    const meals = new Set(entries.filter((e) => e.mealType !== 'beverage').map((e) => e.mealType)).size;
    const veg = Math.round(entries.reduce((s, e) => s + e.vegServings, 0) * 10) / 10;
    const water = db.water.filter((w) => w.date === d).reduce((s, w) => s + w.ml, 0);
    return { d, n, meals, veg, water, count: entries.length };
  });
  const maxProtein = Math.max(targets.protein.max, ...rows.map((r) => r.n.protein));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="btn-secondary !min-h-[38px]" onClick={() => setEnd(addDays(end, -7))}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Earlier
        </button>
        <p className="text-sm font-semibold text-forest-700">
          {formatShortDate(days[days.length - 1])} – {formatShortDate(days[0])}
        </p>
        <button className="btn-secondary !min-h-[38px]" disabled={end >= today} onClick={() => setEnd(addDays(end, 7) > today ? today : addDays(end, 7))}>
          Later <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.d}>
            <button className="card flex w-full items-center gap-4 p-4 text-left transition hover:border-sage-300" onClick={() => onPick(r.d)}>
              <div className="w-12 shrink-0 text-center">
                <p className="text-xs font-semibold text-forest-500">{weekdayShort(r.d)}</p>
                <p className="font-display text-xl font-semibold">{Number(r.d.slice(8))}</p>
              </div>
              <div className="min-w-0 flex-1">
                {r.count === 0 ? (
                  <p className="text-sm text-forest-400">No meals logged</p>
                ) : (
                  <>
                    <p className="num text-sm font-medium">
                      {r.meals} meal{r.meals === 1 ? '' : 's'} · {showKcal ? `${fmt(r.n.kcal)} kcal · ` : ''}
                      {fmt(r.n.protein)} g protein
                    </p>
                    <p className="num text-xs text-forest-500">
                      {r.veg} veg servings · {(r.water / 1000).toFixed(1)} L water
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sage-100" aria-hidden>
                      <div className={clsx('h-full rounded-full bg-sage-500')} style={{ width: `${Math.min(100, (r.n.protein / maxProtein) * 100)}%` }} />
                    </div>
                  </>
                )}
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-forest-400" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
