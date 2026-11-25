import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { Activity, Beef, ChevronRight, Footprints, Plus, Salad, Sparkles, TrendingUp, UtensilsCrossed, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardHeader, ProgressBar, ProgressRing, Pill } from '@/components/ui/primitives';
import { MiniBars } from '@/components/charts/MiniBars';
import { useAction, useDay, useDB, useNow, useProfile, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { formatLongDate, lastNDays } from '@/engine/dates';
import type { MealType } from '@/engine/types';
import type { Recommendation } from '@/engine/recommendations/foodRecs';
import { fmt, mealLabel } from '@/lib/labels';
import { AddFoodSheet } from '@/features/log/AddFoodSheet';
import { WaterCard } from '@/features/log/WaterCard';
import { usePlan } from '@/features/activity/usePlan';
import { CheckInCard } from './CheckInCard';
import { FeedbackList, RecommendationList } from './Insights';

function greeting(h: number) {
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Dashboard() {
  const today = useToday();
  const now = useNow();
  const profile = useProfile();
  const day = useDay(today);
  const db = useDB();
  const { plan, week, rules, checks, minutesToday } = usePlan(today);
  const store = useStore();
  const run = useAction();
  const [sheet, setSheet] = useState<{ meal: MealType; preset?: { foodId: string; portionId?: string } } | null>(null);
  const [editCheckIn, setEditCheckIn] = useState(false);

  const s = day.analysis.summary;
  const framing = day.targets.rules.energyFraming;
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const firstName = profile.name?.split(' ')[0];

  const trend = useMemo(() => {
    const days = lastNDays(today, 7);
    return {
      protein: days.map((d) => ({ date: d, value: db.entries.filter((e) => e.date === d).reduce((a, e) => a + e.nutrients.protein, 0) })),
      active: days.map((d) => ({ date: d, value: db.exercise.filter((e) => e.date === d).reduce((a, e) => a + e.minutes, 0) })),
      veg: days.map((d) => ({ date: d, value: db.entries.filter((e) => e.date === d).reduce((a, e) => a + e.vegServings, 0) })),
    };
  }, [db.entries, db.exercise, today]);

  const onAddRec = (r: Recommendation) => setSheet({ meal: r.mealType ?? 'snack', preset: r.food ? { foodId: r.food.foodId, portionId: r.food.portionId } : undefined });

  const energyValue = framing === 'target' ? s.totals.kcal / day.day.energyTarget : s.totals.kcal / day.day.energyRange.max;
  const proteinPct = s.totals.protein / day.targets.protein.min;
  const recent = [...day.entries].reverse().slice(0, 5);
  const dailyGoal = rules.activity.dailyMinutes;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{formatLongDate(today)}</p>
          <h1 className="mt-1 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[34px]">
            {greeting(now.getHours())}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-forest-500">{youth ? 'Fuel up, move in ways you enjoy, and rest well.' : 'Small, steady habits add up. Here is your day.'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => setSheet({ meal: suggestMeal(now.getHours()) })}>
            <Plus className="h-4 w-4" aria-hidden /> Log food
          </button>
        </div>
      </header>

      {(!day.checkIn || editCheckIn) && <CheckInCard date={today} existing={day.checkIn} onDone={() => setEditCheckIn(false)} />}

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Nutrition overview */}
        <Card aria-label="Nutrition overview">
          <CardHeader
            icon={<UtensilsCrossed className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            eyebrow="Nutrition"
            title={day.analysis.balanceLabel}
            action={<Pill tone={day.analysis.balanceScore >= 75 ? 'sage' : day.analysis.balanceScore >= 50 ? 'dew' : 'cream'}>Balance {day.analysis.balanceScore}</Pill>}
          />
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            {framing !== 'hidden' ? (
              <ProgressRing value={energyValue} label={`Energy ${Math.round(s.totals.kcal)} kilocalories`} color="#6F8F67">
                <span className="num font-display text-2xl font-semibold leading-none">{fmt(s.totals.kcal)}</span>
                <span className="mt-1 text-[11px] text-forest-500">{framing === 'target' ? `of ~${fmt(day.day.energyTarget)} kcal` : 'kcal so far'}</span>
              </ProgressRing>
            ) : (
              <FoodGroupPlate veg={s.vegServings} fruit={s.fruitServings} groups={s.groups} />
            )}
            <div className="w-full flex-1 space-y-3">
              <Macro label="Protein" value={s.totals.protein} range={day.targets.protein} color="bg-[var(--chart-1)]" />
              <Macro label="Carbs" value={s.totals.carbs} range={day.targets.carbs} color="bg-[var(--chart-2)]" />
              <Macro label="Fat" value={s.totals.fat} range={day.targets.fat} color="bg-[var(--chart-3)]" />
              <p className="num text-xs text-forest-500">
                Fibre {fmt(s.totals.fiber)} g · Veg {s.vegServings} · Fruit {s.fruitServings} servings
              </p>
            </div>
          </div>
          {framing === 'reference' && (
            <p className="mt-4 text-xs text-forest-500">
              Typical needs for you: {fmt(day.day.energyRange.min)}–{fmt(day.day.energyRange.max)} kcal{day.day.extraKcal ? ' (more today because you were active)' : ''}. This is a guide to fuelling well, not a limit.
            </p>
          )}
          {framing === 'target' && day.day.extraKcal > 0 && <p className="mt-4 text-xs text-forest-500">Includes about {day.day.extraKcal} kcal extra for today's activity.</p>}
          <div className="mt-5 border-t border-cream-300/70 pt-4">
            <FeedbackList items={day.analysis.feedback.filter((f) => !day.recommendations.some((r) => FEEDBACK_COVERED_BY[f.id] === r.kind))} limit={3} />
          </div>
        </Card>

        {/* Recommendations */}
        <Card aria-label="Suggestions for today">
          <CardHeader icon={<Sparkles className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="For you today" title="Suggestions" action={<Link to="/coach" className="text-xs font-semibold text-sage-700 hover:underline">Ask coach</Link>} />
          <RecommendationList items={day.recommendations} date={today} onAdd={onAddRec} limit={3} />
        </Card>

        {/* Protein */}
        <Card aria-label="Protein overview">
          <CardHeader icon={<Beef className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Protein" title={<span className="num">{fmt(s.totals.protein, 1)} g <span className="text-sm font-normal text-forest-500">aim {day.targets.protein.min}–{day.targets.protein.max} g</span></span>} />
          <ProgressBar value={proteinPct} color="bg-[var(--chart-1)]" track="bg-sage-100" label="Protein progress" />
          <div className="mt-4 flex flex-wrap gap-2">
            {s.proteinSources.length ? (
              s.proteinSources.map((g) => (
                <Pill key={g} tone="sage">
                  {PROTEIN_LABEL[g]}
                </Pill>
              ))
            ) : (
              <p className="text-sm text-forest-500">No protein sources logged yet today.</p>
            )}
          </div>
          <p className="mt-3 text-xs text-forest-500">Spreading protein across meals (dal, curd, paneer, eggs, chana) works better than one big serving.</p>
        </Card>

        <WaterCard date={today} waterMl={day.waterMl} targetMl={day.day.waterMl} active={day.day.waterMl > day.targets.waterMl} />

        {/* Movement */}
        <Card aria-label="Daily movement">
          <CardHeader
            icon={<Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            eyebrow="Movement"
            title={<span className="num">{minutesToday} min <span className="text-sm font-normal text-forest-500">{youth ? 'of 60 min today' : `· week ${week.guidelineMinutes}/${week.guidelineTarget} min`}</span></span>}
            action={
              <Link to="/move" className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:underline">
                Open plan <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <ProgressBar value={youth ? minutesToday / dailyGoal : week.guidelineProgress} color="bg-clay-400" track="bg-clay-100" label="Activity progress" />
          <div className="mt-4 rounded-2xl bg-cream-200/50 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{plan.title}</p>
              <Pill tone={plan.type === 'rest' || plan.type === 'recovery' ? 'dew' : 'clay'}>~{plan.totalMinutes} min</Pill>
            </div>
            <ul className="mt-3 space-y-2">
              {plan.items.filter((i) => i.kind !== 'everyday').slice(0, 4).map((i) => {
                const done = checks.includes(i.id);
                return (
                  <li key={i.id}>
                    <button className="flex w-full items-center gap-3 text-left text-sm" onClick={() => run(() => store.togglePlanCheck(today, i.id))} aria-pressed={done}>
                      {done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-sage-600" aria-hidden /> : <Circle className="h-5 w-5 shrink-0 text-forest-400" aria-hidden />}
                      <span className={clsx('flex-1', done && 'text-forest-400 line-through')}>{i.name}</span>
                      <span className="num text-xs text-forest-500">{i.minutes} min</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          {day.checkIn && (
            <button className="mt-3 text-xs font-semibold text-sage-700 hover:underline" onClick={() => setEditCheckIn(true)}>
              Update today's check-in
            </button>
          )}
        </Card>

        {/* Recent meals */}
        <Card aria-label="Today's food log">
          <CardHeader
            icon={<Salad className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            eyebrow="Today's food"
            title={s.entryCount ? `${s.entryCount} item${s.entryCount > 1 ? 's' : ''} logged` : 'No meals yet'}
            action={
              <Link to="/log" className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:underline">
                Full log <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          {recent.length ? (
            <ul className="divide-y divide-cream-300/60">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.foodName}</span>
                    <span className="text-xs text-forest-500">
                      {mealLabel(e.mealType)} · {e.quantity !== 1 ? `${e.quantity} × ` : ''}
                      {e.portionLabel}
                    </span>
                  </span>
                  <span className="num shrink-0 text-xs text-forest-600">{framing !== 'hidden' ? `${fmt(e.nutrients.kcal)} kcal` : `${fmt(e.nutrients.protein, 1)} g protein`}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-forest-500">Add your first meal of the day. Tap a meal below to start.</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
              <button key={m} className="chip !min-h-[36px] text-xs" onClick={() => setSheet({ meal: m })}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> {mealLabel(m)}
              </button>
            ))}
          </div>
        </Card>

        {/* Weekly trends */}
        <Card aria-label="Weekly trends" className="lg:col-span-2">
          <CardHeader
            icon={<TrendingUp className="h-[18px] w-[18px]" strokeWidth={1.75} />}
            eyebrow="Last 7 days"
            title="Weekly trends"
            action={
              <Link to="/progress" className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700 hover:underline">
                Progress <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="grid gap-6 sm:grid-cols-3">
            <MiniBars data={trend.protein} label="Protein" unit="g" reference={day.targets.protein.min} referenceLabel="aim" color="var(--chart-1)" />
            <MiniBars data={trend.veg} label="Vegetable servings" unit="" reference={3} referenceLabel="3/day" color="var(--chart-single)" format={(n) => n.toFixed(1)} />
            <MiniBars data={trend.active} label="Active minutes" unit="min" reference={dailyGoal} referenceLabel={`${dailyGoal} min`} color="var(--chart-2)" />
          </div>
        </Card>
      </div>

      <p className="flex items-start gap-2 text-xs text-forest-500">
        <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        All numbers are estimates for guidance, not medical advice. Talk to a doctor or registered dietitian about health conditions.
      </p>

      <AddFoodSheet open={sheet !== null} onClose={() => setSheet(null)} date={today} meal={sheet?.meal ?? 'snack'} preset={sheet?.preset ?? null} />
    </div>
  );
}

/** Feedback ids whose advice is already shown as an actionable suggestion. */
const FEEDBACK_COVERED_BY: Record<string, string> = { protein_low: 'protein', veg_low: 'vegetables', fruit_none: 'fruit', fibre_low: 'fibre', water_low: 'hydration' };

const PROTEIN_LABEL: Record<string, string> = { pulse: 'Dal & pulses', dairy: 'Dairy', egg: 'Eggs', meat_fish: 'Meat & fish', soy: 'Soy', nut_seed: 'Nuts & seeds' };

function suggestMeal(h: number): MealType {
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
}

function Macro({ label, value, range, color }: { label: string; value: number; range: { min: number; max: number }; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold text-forest-700">{label}</span>
        <span className="num text-forest-500">
          {fmt(value)} g · aim {range.min}–{range.max}
        </span>
      </div>
      <ProgressBar value={value / range.min} color={color} track="bg-cream-200" label={`${label} progress`} />
    </div>
  );
}

function FoodGroupPlate({ veg, fruit, groups }: { veg: number; fruit: number; groups: string[] }) {
  const items = [
    { label: 'Vegetables', done: veg >= 1 },
    { label: 'Fruit', done: fruit >= 0.5 },
    { label: 'Grains', done: groups.includes('whole_grain') || groups.includes('refined_grain') },
    { label: 'Protein foods', done: ['pulse', 'egg', 'meat_fish', 'soy'].some((g) => groups.includes(g)) },
    { label: 'Milk & curd', done: groups.includes('dairy') },
  ];
  return (
    <ul className="grid w-full max-w-[200px] gap-1.5" aria-label="Food groups today">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          {i.done ? <CheckCircle2 className="h-5 w-5 text-sage-600" aria-hidden /> : <Circle className="h-5 w-5 text-forest-400" aria-hidden />}
          <span className={i.done ? 'font-semibold' : 'text-forest-500'}>{i.label}</span>
        </li>
      ))}
    </ul>
  );
}
