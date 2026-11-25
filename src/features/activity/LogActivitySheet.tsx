import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { Field, Sheet, Stepper } from '@/components/ui/primitives';
import { useAction, useProfile } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { ACTIVITY_OPTIONS, INTENSITIES } from '@/lib/labels';
import { ACTIVITIES } from '@/engine/activity/catalog';
import { calcActivity } from '@/engine/activity/engine';
import { getSafetyRules } from '@/engine/safety/policy';
import type { ActivityType, ExerciseLog, Intensity } from '@/engine/types';

export interface LogActivityInitial {
  editing?: ExerciseLog;
  minutes?: number;
  activity?: ActivityType;
}

const num = (s: string) => (s.trim() === '' ? undefined : Number(s.replace(',', '.')));

export function LogActivitySheet({ open, onClose, initial, today }: { open: boolean; onClose: () => void; initial: LogActivityInitial; today: string }) {
  const store = useStore();
  const profile = useProfile();
  const run = useAction();
  const e = initial.editing;
  const [activity, setActivity] = useState<ActivityType>(e?.activity ?? initial.activity ?? profile.sports[0] ?? 'walking');
  const [minutes, setMinutes] = useState(e?.minutes ?? initial.minutes ?? 30);
  const [intensity, setIntensity] = useState<Intensity>(e?.intensity ?? ACTIVITIES[activity].defaultIntensity);
  const [distance, setDistance] = useState(e?.distanceKm ? String(e.distanceKm) : '');
  const [steps, setSteps] = useState(e?.steps ? String(e.steps) : '');
  const [date, setDate] = useState(e?.date ?? today);
  const [notes, setNotes] = useState(e?.notes ?? '');
  const [error, setError] = useState('');
  const meta = ACTIVITIES[activity];
  const rules = getSafetyRules(profile.age);
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';

  const favourites = profile.sports.filter((s) => ACTIVITIES[s]);
  const options = [...favourites.map((f) => ACTIVITY_OPTIONS.find((o) => o.value === f)!), ...ACTIVITY_OPTIONS.filter((o) => !favourites.includes(o.value))];

  const distanceKm = meta.distance ? num(distance) : undefined;
  const stepCount = meta.steps ? num(steps) : undefined;
  const calc = useMemo(
    () => calcActivity({ activity, minutes, intensity, distanceKm: distanceKm && distanceKm > 0 ? distanceKm : undefined, steps: stepCount && stepCount > 0 ? Math.round(stepCount) : undefined }, profile),
    [activity, minutes, intensity, distanceKm, stepCount, profile],
  );
  const paceSetsIntensity = calc.paceKmh !== undefined;

  const save = async () => {
    if (distanceKm !== undefined && !(distanceKm > 0 && distanceKm <= 300)) return setError('Enter a distance between 0.01 and 300 km.');
    if (stepCount !== undefined && !(Number.isInteger(stepCount) && stepCount > 0 && stepCount <= 100000)) return setError('Enter steps as a whole number up to 100,000.');
    setError('');
    const payload = {
      date,
      activity,
      minutes,
      // When pace is known it decides the intensity, so the weekly guideline counts the session correctly.
      intensity: calc.intensity,
      notes: notes.trim() || undefined,
      distanceKm: distanceKm && distanceKm > 0 ? distanceKm : undefined,
      steps: stepCount && stepCount > 0 ? Math.round(stepCount) : undefined,
      strength: meta.strength,
      boneLoading: meta.boneLoading,
    };
    const ok = e ? await run(() => store.updateExercise(e.id, payload), 'Activity updated') : await run(() => store.addExercise(payload), 'Activity logged');
    if (ok.ok) onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={e ? 'Edit activity' : 'Log activity'}
      wide
      footer={
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream-200/60 px-4 py-2.5 text-sm" aria-live="polite">
            <span className="text-forest-600">
              {minutes} min · {calc.intensity}
              {calc.paceKmh !== undefined && ` · ${calc.paceKmh} km/h`}
              {calc.paceMinPerKm !== undefined && ` (${Math.floor(calc.paceMinPerKm)}:${String(Math.round((calc.paceMinPerKm % 1) * 60)).padStart(2, '0')} min/km)`}
            </span>
            {calc.kcal !== undefined ? (
              <span className="num font-semibold text-forest-900">≈ {calc.kcal} kcal used</span>
            ) : (
              <span className="text-xs text-forest-500">{youth ? 'Counts toward your 60 minutes' : ''}</span>
            )}
          </div>
          {error && (
            <p className="text-sm font-medium text-berry-600" role="alert">
              {error}
            </p>
          )}
          <button className="btn-primary w-full" onClick={save}>
            {e ? 'Save changes' : 'Log activity'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="label">What did you do?</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Activity">
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={activity === o.value}
                className={clsx('chip !min-h-[38px]', activity === o.value && 'chip-on')}
                onClick={() => {
                  setActivity(o.value);
                  setIntensity(ACTIVITIES[o.value].defaultIntensity);
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
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
        {(meta.distance || meta.steps) && (
          <div className="grid grid-cols-2 gap-3">
            {meta.distance && (
              <Field label="Distance (km, optional)" htmlFor="act-distance">
                <input id="act-distance" className="input" type="number" inputMode="decimal" step="0.1" min={0} value={distance} onChange={(ev) => setDistance(ev.target.value)} placeholder="e.g. 5" />
              </Field>
            )}
            {meta.steps && (
              <Field label="Steps (optional)" htmlFor="act-steps">
                <input id="act-steps" className="input" type="number" inputMode="numeric" min={0} value={steps} onChange={(ev) => setSteps(ev.target.value)} placeholder="e.g. 6000" />
              </Field>
            )}
          </div>
        )}
        <div>
          <p className="label">How hard was it?</p>
          {paceSetsIntensity ? (
            <p className="rounded-2xl bg-sage-50 px-4 py-3 text-sm text-sage-800">
              Worked out from your pace: <span className="font-semibold">{calc.intensity}</span>
              {calc.distanceKm !== undefined && !distance && stepCount ? ` (${calc.distanceKm} km from your steps)` : ''}.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Intensity">
              {INTENSITIES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={intensity === o.value}
                  onClick={() => setIntensity(o.value)}
                  className={clsx(
                    'rounded-2xl border px-4 py-3 text-left transition',
                    intensity === o.value ? 'border-sage-600 bg-sage-50 ring-1 ring-sage-600' : 'border-cream-300 bg-cream-50 hover:border-sage-300',
                  )}
                >
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="block text-xs text-forest-500">{o.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Field label="Notes (optional)" htmlFor="act-notes">
          <input id="act-notes" className="input" maxLength={200} value={notes} onChange={(ev) => setNotes(ev.target.value)} placeholder="e.g. evening football with friends" />
        </Field>
      </div>
    </Sheet>
  );
}
