import { useState } from 'react';
import clsx from 'clsx';
import { BedDouble, CheckCircle2, ChevronDown, Circle, Dumbbell, Footprints, Pencil, Plus, Timer, Trash2, Info } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Card, CardHeader, ChipGroup, Field, Pill, ProgressBar, Sheet, Stepper } from '@/components/ui/primitives';
import { MiniBars } from '@/components/charts/MiniBars';
import { useAction, useDB, useProfile, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { ACTIVITY_OPTIONS, INTENSITIES, activityLabel } from '@/lib/labels';
import { ACTIVITIES } from '@/engine/activity/catalog';
import { loggedActivityKcal } from '@/engine/activity/engine';
import { formatShortDate, weekdayShort } from '@/engine/dates';
import type { ActivityType, ExerciseLog, Intensity } from '@/engine/types';
import { usePlan } from './usePlan';
import { WorkoutTimer } from './WorkoutTimer';

export default function Move() {
  const today = useToday();
  const profile = useProfile();
  const db = useDB();
  const store = useStore();
  const run = useAction();
  const { toast } = useToast();
  const { plan, week, rules, checks, minutesToday } = usePlan(today);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logSheet, setLogSheet] = useState<{ editing?: ExerciseLog; minutes?: number; activity?: ActivityType; intensity?: Intensity } | null>(null);
  const [timerPreset, setTimerPreset] = useState<{ minutes: number; key: number } | undefined>();
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const weekLogs = db.exercise.filter((e) => e.date >= week.weekStart).sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
  const allChecked = plan.items.filter((i) => i.kind !== 'everyday').every((i) => checks.includes(i.id));
  const mainActivity = plan.items.find((i) => i.kind === 'main')?.activity;

  const remove = async (e: ExerciseLog) => {
    const ok = await run(() => store.deleteExercise(e.id));
    if (ok.ok) toast('Activity removed', 'info', { label: 'Undo', onClick: () => run(() => store.addExercise({ date: e.date, activity: e.activity, minutes: e.minutes, intensity: e.intensity, notes: e.notes, strength: e.strength, boneLoading: e.boneLoading })) });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Move"
        title="Today's activity"
        subtitle={youth ? 'Aim for an average of 60 active minutes a day. Sport, PE, cycling and play all count.' : 'Movement for energy, strength and a healthy heart.'}
        action={
          <button className="btn-primary" onClick={() => setLogSheet({})}>
            <Plus className="h-4 w-4" aria-hidden /> Log activity
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          <Card aria-label="Daily activity plan">
            <CardHeader
              icon={plan.type === 'rest' || plan.type === 'recovery' ? <BedDouble className="h-[18px] w-[18px]" strokeWidth={1.75} /> : plan.type === 'strength' || plan.type === 'mixed' ? <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} /> : <Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />}
              eyebrow="Daily plan"
              title={plan.title}
              action={<Pill tone={plan.type === 'rest' || plan.type === 'recovery' ? 'dew' : 'clay'}>~{plan.totalMinutes} min</Pill>}
            />
            <p className="text-sm text-forest-600">{plan.summary}</p>
            <p className="mt-2 text-xs text-forest-500">{plan.guidelineNote}</p>
            {plan.reasons.length > 0 && (
              <div className="mt-3 rounded-2xl bg-dew-50 p-3 text-sm text-dew-600">
                {plan.reasons.map((r) => (
                  <p key={r}>{r}</p>
                ))}
              </div>
            )}
            <ul className="mt-4 divide-y divide-cream-300/60" aria-label="Exercise checklist">
              {plan.items.map((item) => {
                const done = checks.includes(item.id);
                const open = expanded === item.id;
                return (
                  <li key={item.id} className="py-3">
                    <div className="flex items-start gap-3">
                      <button className="mt-0.5" onClick={() => run(() => store.togglePlanCheck(today, item.id))} aria-pressed={done} aria-label={`Mark ${item.name} ${done ? 'not done' : 'done'}`}>
                        {done ? <CheckCircle2 className="h-6 w-6 text-sage-600" aria-hidden /> : <Circle className="h-6 w-6 text-forest-400" aria-hidden />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={clsx('font-semibold', done && 'text-forest-400 line-through')}>{item.name}</p>
                          {item.kind !== 'everyday' && <span className="num shrink-0 text-xs text-forest-500">{item.minutes} min</span>}
                        </div>
                        <p className="text-sm text-forest-600">{item.detail}</p>
                        {open && item.cue && <p className="mt-2 rounded-xl bg-cream-200/60 p-2.5 text-xs text-forest-700">{item.cue}</p>}
                        <div className="mt-1.5 flex gap-3">
                          {item.cue && (
                            <button className="inline-flex items-center gap-1 text-xs font-semibold text-sage-700" onClick={() => setExpanded(open ? null : item.id)} aria-expanded={open}>
                              How to <ChevronDown className={clsx('h-3.5 w-3.5 transition', open && 'rotate-180')} aria-hidden />
                            </button>
                          )}
                          {item.kind !== 'everyday' && item.minutes > 0 && (
                            <button className="inline-flex items-center gap-1 text-xs font-semibold text-clay-600" onClick={() => setTimerPreset({ minutes: item.minutes, key: Date.now() })}>
                              <Timer className="h-3.5 w-3.5" aria-hidden /> Time it
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {allChecked && plan.type !== 'rest' && (
              <button
                className="btn-secondary mt-3 w-full"
                onClick={() => setLogSheet({ minutes: plan.totalMinutes, activity: mainActivity ?? (plan.type === 'strength' ? 'bodyweight' : 'walking'), intensity: 'moderate' })}
              >
                Plan done. Log {plan.totalMinutes} minutes
              </button>
            )}
            {plan.notes.length > 0 && (
              <div className="mt-4 space-y-2">
                {plan.notes.map((n) => (
                  <p key={n} className="flex gap-2 rounded-2xl bg-clay-50 p-3 text-xs text-clay-700">
                    <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {n}
                  </p>
                ))}
              </div>
            )}
            {plan.estimatedKcal !== undefined && plan.type !== 'rest' && (
              <p className="mt-3 text-xs text-forest-500">Estimated energy used: about {plan.estimatedKcal} kcal. This is information only, not a target.</p>
            )}
          </Card>

          <Card aria-label="This week's activity">
            <CardHeader icon={<Footprints className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="This week" title={<span className="num">{week.totalMinutes} active minutes</span>} />
            <MiniBars
              data={week.days.map((d, i) => ({ date: d, value: week.minutesByDay[i] }))}
              label="Minutes per day"
              unit="min"
              reference={rules.activity.dailyMinutes}
              referenceLabel={`${rules.activity.dailyMinutes} min`}
              color="var(--chart-2)"
              highlightDate={today}
            />
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-semibold text-forest-700">{youth ? 'Weekly minutes (420 = 60/day)' : 'Guideline minutes (vigorous count double)'}</span>
                  <span className="num text-forest-500">
                    {week.guidelineMinutes} / {week.guidelineTarget}
                  </span>
                </div>
                <ProgressBar value={week.guidelineProgress} color="bg-clay-400" track="bg-clay-100" label="Weekly activity guideline progress" />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Active days" value={`${week.activeDays}/7`} />
                <Stat label="Strength days" value={`${week.strengthDays}/${rules.activity.strengthDaysPerWeek}`} />
                {youth ? <Stat label="Bone-building days" value={`${week.boneDays}/${rules.activity.boneDaysPerWeek}`} /> : <Stat label="Sessions" value={String(week.sessions)} />}
              </div>
              <p className="text-xs text-forest-500">{rules.activity.source}</p>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <WorkoutTimer presetMinutes={timerPreset} onLog={(minutes) => setLogSheet({ minutes, activity: mainActivity, intensity: 'moderate' })} />

          <Card aria-label="Activity log">
            <CardHeader icon={<Pencil className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Activity log" title={`${minutesToday} min today`} />
            {weekLogs.length === 0 ? (
              <p className="text-sm text-forest-500">No activity logged this week yet. Walks, games and chores that get you moving all count.</p>
            ) : (
              <ul className="divide-y divide-cream-300/60">
                {weekLogs.map((e) => {
                  const kcal = loggedActivityKcal(profile, e);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activityLabel(e.activity)}</p>
                        <p className="num text-xs text-forest-500">
                          {e.date === today ? 'Today' : `${weekdayShort(e.date)} ${formatShortDate(e.date)}`} · {e.minutes} min · {e.intensity}
                          {kcal !== undefined ? ` · ≈${kcal} kcal est.` : ''}
                        </p>
                      </div>
                      <button className="btn-icon h-9 w-9" aria-label={`Edit ${activityLabel(e.activity)}`} onClick={() => setLogSheet({ editing: e })}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="btn-icon h-9 w-9" aria-label={`Delete ${activityLabel(e.activity)}`} onClick={() => remove(e)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <LogActivitySheet key={logSheet ? JSON.stringify(logSheet) : 'closed'} open={logSheet !== null} onClose={() => setLogSheet(null)} initial={logSheet ?? {}} today={today} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-cream-200/60 px-2 py-3">
      <p className="num font-display text-lg font-semibold">{value}</p>
      <p className="text-[11px] text-forest-500">{label}</p>
    </div>
  );
}

function LogActivitySheet({ open, onClose, initial, today }: { open: boolean; onClose: () => void; initial: { editing?: ExerciseLog; minutes?: number; activity?: ActivityType; intensity?: Intensity }; today: string }) {
  const store = useStore();
  const run = useAction();
  const e = initial.editing;
  const [activity, setActivity] = useState<ActivityType>(e?.activity ?? initial.activity ?? 'walking');
  const [minutes, setMinutes] = useState(e?.minutes ?? initial.minutes ?? 30);
  const [intensity, setIntensity] = useState<Intensity>(e?.intensity ?? initial.intensity ?? ACTIVITIES[initial.activity ?? 'walking'].defaultIntensity);
  const [date, setDate] = useState(e?.date ?? today);
  const [notes, setNotes] = useState(e?.notes ?? '');

  const save = async () => {
    const meta = ACTIVITIES[activity];
    const payload = { date, activity, minutes, intensity, notes: notes.trim() || undefined, strength: meta.strength, boneLoading: meta.boneLoading };
    const ok = e ? await run(() => store.updateExercise(e.id, payload), 'Activity updated') : await run(() => store.addExercise(payload), 'Activity logged. Nice work!');
    if (ok.ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={e ? 'Edit activity' : 'Log activity'}
      footer={
        <button className="btn-primary w-full" onClick={save}>
          {e ? 'Save changes' : 'Log activity'}
        </button>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="label">Activity</p>
          <ChipGroup
            label="Activity"
            options={ACTIVITY_OPTIONS}
            value={activity}
            onChange={(v) => {
              setActivity(v as ActivityType);
              setIntensity(ACTIVITIES[v as ActivityType].defaultIntensity);
            }}
          />
        </div>
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <p className="label">Duration</p>
            <Stepper label="minutes" value={minutes} onChange={setMinutes} min={1} max={600} step={5} format={(n) => `${n} min`} />
          </div>
          <Field label="Date" htmlFor="act-date">
            <input id="act-date" type="date" className="input" value={date} max={today} onChange={(ev) => ev.target.value && setDate(ev.target.value)} />
          </Field>
        </div>
        <div>
          <p className="label">Intensity</p>
          <ChipGroup columns label="Intensity" options={INTENSITIES} value={intensity} onChange={(v) => setIntensity(v as Intensity)} />
        </div>
        <Field label="Notes (optional)" htmlFor="act-notes">
          <input id="act-notes" className="input" maxLength={200} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="e.g. evening football with friends" />
        </Field>
      </div>
    </Sheet>
  );
}
