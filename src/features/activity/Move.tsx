import { useState } from 'react';
import clsx from 'clsx';
import { Activity, CalendarDays, Flame, Footprints, Leaf, MessageCircle, HeartHandshake, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Card, CardHeader, ProgressBar } from '@/components/ui/primitives';
import { MiniBars } from '@/components/charts/MiniBars';
import { useAction, useDB, useProfile, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { activityLabel, fmt } from '@/lib/labels';
import { calcActivity } from '@/engine/activity/engine';
import { addDays, formatShortDate, weekdayShort } from '@/engine/dates';
import type { ExerciseLog } from '@/engine/types';
import { useActivity } from './useActivity';
import { WorkoutTimer } from './WorkoutTimer';
import { LogActivitySheet, type LogActivityInitial } from './LogActivitySheet';

const INSIGHT_TONE = {
  positive: { icon: Leaf, cls: 'bg-sage-50 text-sage-800' },
  neutral: { icon: MessageCircle, cls: 'bg-cream-200/60 text-forest-700' },
  care: { icon: HeartHandshake, cls: 'bg-dew-50 text-dew-600' },
} as const;

export function ActivityLine({ log, onEdit, onDelete }: { log: ExerciseLog; onEdit?: () => void; onDelete?: () => void }) {
  const profile = useProfile();
  const today = useToday();
  const c = calcActivity(log, profile);
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{activityLabel(log.activity)}</p>
        <p className="num text-xs text-forest-500">
          {log.date === today ? 'Today' : `${weekdayShort(log.date)} ${formatShortDate(log.date)}`} · {log.minutes} min · {c.intensity}
          {c.distanceKm !== undefined ? ` · ${c.distanceKm} km` : ''}
          {log.steps ? ` · ${fmt(log.steps)} steps` : ''}
        </p>
      </div>
      {c.kcal !== undefined && <span className="num shrink-0 text-xs font-semibold text-forest-700">≈{c.kcal} kcal</span>}
      {onEdit && (
        <button className="btn-icon h-9 w-9" aria-label={`Edit ${activityLabel(log.activity)}`} onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </button>
      )}
      {onDelete && (
        <button className="btn-icon h-9 w-9" aria-label={`Delete ${activityLabel(log.activity)}`} onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

export default function Move() {
  const today = useToday();
  const db = useDB();
  const store = useStore();
  const run = useAction();
  const { toast } = useToast();
  const a = useActivity(today);
  const [sheet, setSheet] = useState<LogActivityInitial | null>(null);
  const youth = a.rules.ageGroup === 'child' || a.rules.ageGroup === 'teen';
  const history = db.exercise.filter((e) => e.date >= addDays(today, -13)).sort((x, y) => (y.date + y.loggedAt).localeCompare(x.date + x.loggedAt));

  const remove = async (e: ExerciseLog) => {
    const ok = await run(() => store.deleteExercise(e.id));
    if (ok.ok) {
      const { id: _id, loggedAt: _at, ...rest } = e;
      void _id;
      void _at;
      toast('Activity removed', 'info', { label: 'Undo', onClick: () => run(() => store.addExercise(rest)) });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Activity"
        title="What did you do today?"
        subtitle={
          youth
            ? "Log what you did and NutriTrack counts your active minutes, adjusts today's water and food guide, and tracks your week."
            : "Log your activity and NutriTrack works out the rest: energy used, your day's food and water estimates, and weekly progress."
        }
        action={
          <button className="btn-primary" onClick={() => setSheet({})}>
            <Plus className="h-4 w-4" aria-hidden /> Log activity
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card aria-label="Today's activity">
            <CardHeader icon={<Activity className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Today" title={<span className="num">{a.minutesToday} active minutes</span>} />
            {a.today.length === 0 ? (
              <div className="rounded-2xl bg-cream-200/50 p-4 text-sm text-forest-600">
                Nothing logged yet today. After a walk, a game, the gym or even housework, tap <span className="font-semibold">Log activity</span>.
              </div>
            ) : (
              <>
                <div className={clsx('grid gap-2', a.kcalToday !== undefined ? 'grid-cols-3' : 'grid-cols-2')}>
                  <Stat label="Minutes" value={String(a.minutesToday)} />
                  {a.kcalToday !== undefined && <Stat label="Energy used (est.)" value={`${fmt(a.kcalToday)} kcal`} />}
                  <Stat label="Sessions" value={String(a.today.length)} />
                </div>
                <ul className="mt-3 divide-y divide-cream-300/60">
                  {a.today.map(({ log }) => (
                    <ActivityLine key={log.id} log={log} onEdit={() => setSheet({ editing: log })} onDelete={() => remove(log)} />
                  ))}
                </ul>
                {(a.extraKcal > 0 || a.extraWaterMl > 0) && (
                  <div className="mt-3 flex gap-3 rounded-2xl bg-clay-50 p-3.5 text-sm text-clay-700">
                    <Flame className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <p>
                      {youth ? (
                        <>Active day: your body needs a little more food today{a.extraWaterMl > 0 ? ` and about ${(a.extraWaterMl / 1000).toFixed(2).replace(/0$/, '')} L more water` : ''}. Your dashboard has been updated.</>
                      ) : (
                        <>
                          Added to today's estimates: {a.extraKcal > 0 ? `+${a.extraKcal} kcal` : ''}
                          {a.extraKcal > 0 && a.extraWaterMl > 0 ? ' and ' : ''}
                          {a.extraWaterMl > 0 ? `+${(a.extraWaterMl / 1000).toFixed(2).replace(/0$/, '')} L water` : ''}, for activity beyond your usual level.
                        </>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}
            {a.kcalToday !== undefined && a.today.length > 0 && <p className="mt-3 text-xs text-forest-500">Energy estimates use MET values for each activity, your weight and, when you add distance, your pace. They are estimates, not targets.</p>}
          </Card>

          <Card aria-label="This week's activity">
            <CardHeader icon={<Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="This week" title={<span className="num">{a.week.totalMinutes} active minutes</span>} />
            <MiniBars
              data={a.week.days.map((d, i) => ({ date: d, value: a.week.minutesByDay[i] }))}
              label="Minutes per day"
              unit="min"
              reference={a.rules.activity.dailyMinutes}
              referenceLabel={`${a.rules.activity.dailyMinutes} min`}
              color="var(--chart-2)"
              highlightDate={today}
            />
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-forest-700">{youth ? 'Weekly minutes (420 = 60 a day)' : 'Guideline minutes (vigorous count double)'}</span>
                  <span className="num text-forest-500">
                    {a.week.guidelineMinutes} / {a.week.guidelineTarget}
                  </span>
                </div>
                <ProgressBar value={a.week.guidelineProgress} color="bg-clay-400" track="bg-clay-100" label="Weekly activity guideline progress" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Active days" value={`${a.week.activeDays}/7`} />
                <Stat label="Strength days" value={`${a.week.strengthDays}/${a.rules.activity.strengthDaysPerWeek}`} />
                {a.week.kcal !== undefined ? <Stat label="Energy used (est.)" value={`${fmt(a.week.kcal)}`} /> : <Stat label="Bone-building days" value={`${a.week.boneDays}/${a.rules.activity.boneDaysPerWeek}`} />}
              </div>
              {a.week.byActivity.length > 0 && (
                <ul className="space-y-1.5 pt-1" aria-label="Minutes by activity this week">
                  {a.week.byActivity.map((b) => (
                    <li key={b.activity} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate text-forest-700">{activityLabel(b.activity)}</span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200" aria-hidden>
                        <span className="block h-full rounded-full bg-clay-400" style={{ width: `${(b.minutes / Math.max(1, a.week.byActivity[0].minutes)) * 100}%` }} />
                      </span>
                      <span className="num w-16 shrink-0 text-right text-xs text-forest-500">{b.minutes} min</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-forest-500">{a.rules.activity.source}</p>
            </div>
          </Card>

          {a.insights.length > 0 && (
            <Card aria-label="Activity insights">
              <CardHeader icon={<Leaf className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="From your logs" title="Insights" />
              <ul className="space-y-2.5">
                {a.insights.map((i) => {
                  const t = INSIGHT_TONE[i.tone];
                  const Icon = t.icon;
                  return (
                    <li key={i.id} className={clsx('flex gap-3 rounded-2xl p-3.5 text-sm', t.cls)}>
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <div>
                        <p className="font-semibold">{i.title}</p>
                        <p className="opacity-90">{i.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card aria-label="Activity history">
            <CardHeader icon={<CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="History" title="Last 14 days" />
            {history.length === 0 ? (
              <p className="text-sm text-forest-500">Your logged activities will appear here.</p>
            ) : (
              <ul className="divide-y divide-cream-300/60">
                {history.map((e) => (
                  <ActivityLine key={e.id} log={e} onEdit={() => setSheet({ editing: e })} onDelete={() => remove(e)} />
                ))}
              </ul>
            )}
          </Card>
          <WorkoutTimer onLog={(minutes) => setSheet({ minutes })} />
        </div>
      </div>

      <LogActivitySheet key={sheet ? JSON.stringify(sheet) : 'closed'} open={sheet !== null} onClose={() => setSheet(null)} initial={sheet ?? {}} today={today} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-200/60 px-2 py-3 text-center">
      <p className="num font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-forest-500">{label}</p>
    </div>
  );
}
