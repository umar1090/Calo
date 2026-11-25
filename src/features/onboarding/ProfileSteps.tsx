import { useState } from 'react';
import { Info, HeartHandshake } from 'lucide-react';
import { ChipGroup, Field, Segmented } from '@/components/ui/primitives';
import { ACTIVITY_LEVELS, ACTIVITY_OPTIONS, ALLERGENS, CUISINES, DIETS, EQUIPMENT, FITNESS_LEVELS, GOALS, SEX_OPTIONS, fmt } from '@/lib/labels';
import { computeTargets } from '@/engine/nutrition/targets';
import { getAgeGroup, getSafetyRules } from '@/engine/safety/policy';
import type { Profile } from '@/engine/types';
import { cmToFeetInches, feetInchesToCm, type Draft, type StepErrors } from './profileDraft';

interface StepProps {
  d: Draft;
  set: (patch: Partial<Draft>) => void;
  errors: StepErrors;
}

function Note({ children, tone = 'sage' }: { children: React.ReactNode; tone?: 'sage' | 'clay' }) {
  return (
    <div className={`flex gap-3 rounded-2xl p-4 text-sm ${tone === 'sage' ? 'bg-sage-50 text-sage-800' : 'bg-clay-50 text-clay-700'}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function AboutStep({ d, set, errors }: StepProps) {
  const age = Number(d.age);
  const group = Number.isFinite(age) && age > 0 ? getAgeGroup(age) : null;
  return (
    <div className="space-y-5">
      <Field label="Name (optional)" htmlFor="name" error={errors.name}>
        <input id="name" className="input" autoComplete="given-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="What should we call you?" />
      </Field>
      <Field label="Age" htmlFor="age" error={errors.age}>
        <input id="age" className="input max-w-[10rem]" inputMode="numeric" type="number" min={8} max={100} value={d.age} onChange={(e) => set({ age: e.target.value })} placeholder="Years" />
      </Field>
      <div>
        <p className="label">Gender</p>
        <ChipGroup label="Gender" options={SEX_OPTIONS} value={d.sex as never} onChange={(v) => set({ sex: v as Draft['sex'] })} />
        <p className={errors.sex ? 'mt-1 text-xs font-medium text-berry-600' : 'mt-1 text-xs text-forest-500'}>
          {errors.sex ?? 'Used only to choose the right estimation equation.'}
        </p>
      </div>
      {group === 'teen' && (
        <Note>
          NutriTrack adapts for teens: we focus on fuelling growth, sport, sleep and healthy habits. We never set calorie-cutting or weight-loss targets for under-18s.
        </Note>
      )}
      {group === 'child' && (
        <Note tone="clay">
          Hi! NutriTrack works best with a parent or guardian. For children we focus on regular meals, food variety and active play, and we don't show calorie targets.
        </Note>
      )}
    </div>
  );
}

export function BodyStep({ d, set, errors }: StepProps) {
  const [unit, setUnit] = useState<'cm' | 'ft'>('cm');
  const cm = Number(d.heightCm);
  const fi = cm > 0 ? cmToFeetInches(cm) : { ft: 0, inch: 0 };
  const age = Number(d.age);
  return (
    <div className="space-y-5">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="label mb-0" htmlFor={unit === 'cm' ? 'height' : 'height-ft'}>
            Height
          </label>
          <Segmented size="sm" label="Height unit" value={unit} onChange={setUnit} options={[{ value: 'cm', label: 'cm' }, { value: 'ft', label: 'ft / in' }]} />
        </div>
        {unit === 'cm' ? (
          <input id="height" className="input max-w-[10rem]" type="number" inputMode="decimal" value={d.heightCm} onChange={(e) => set({ heightCm: e.target.value })} placeholder="cm" />
        ) : (
          <div className="flex gap-2">
            <input id="height-ft" aria-label="Feet" className="input max-w-[6rem]" type="number" inputMode="numeric" value={fi.ft || ''} onChange={(e) => set({ heightCm: String(feetInchesToCm(Number(e.target.value), fi.inch)) })} placeholder="ft" />
            <input aria-label="Inches" className="input max-w-[6rem]" type="number" inputMode="numeric" value={cm > 0 ? fi.inch : ''} onChange={(e) => set({ heightCm: String(feetInchesToCm(fi.ft, Number(e.target.value))) })} placeholder="in" />
            {cm > 0 && <span className="self-center text-sm text-forest-500">= {cm} cm</span>}
          </div>
        )}
        {errors.heightCm && <p className="mt-1 text-xs font-medium text-berry-600">{errors.heightCm}</p>}
      </div>
      <Field label="Weight (kg)" htmlFor="weight" error={errors.weightKg}>
        <input id="weight" className="input max-w-[10rem]" type="number" inputMode="decimal" step="0.1" value={d.weightKg} onChange={(e) => set({ weightKg: e.target.value })} placeholder="kg" />
      </Field>
      {d.sex === 'female' && age >= 18 && (
        <div>
          <p className="label">Are you currently…</p>
          <ChipGroup
            label="Life stage"
            options={[
              { value: 'none', label: 'Neither' },
              { value: 'pregnant', label: 'Pregnant' },
              { value: 'breastfeeding', label: 'Breastfeeding' },
            ]}
            value={d.lifeStage}
            onChange={(v) => set({ lifeStage: v as Draft['lifeStage'] })}
          />
          <p className="mt-1 text-xs text-forest-500">If so, NutriTrack won't suggest weight-loss targets and will remind you to follow your doctor's advice.</p>
        </div>
      )}
      <p className="text-xs text-forest-500">Your body details stay on this device and are only used for the estimates.</p>
    </div>
  );
}

export function ActivityStep({ d, set, errors }: StepProps) {
  return (
    <div className="space-y-3">
      <ChipGroup columns label="Activity level" options={ACTIVITY_LEVELS} value={d.activityLevel as never} onChange={(v) => set({ activityLevel: v as Draft['activityLevel'] })} />
      {errors.activityLevel && <p className="text-xs font-medium text-berry-600">{errors.activityLevel}</p>}
    </div>
  );
}

export function GoalsStep({ d, set, errors }: StepProps) {
  const age = Number(d.age);
  const minor = age < 18;
  return (
    <div className="space-y-5">
      <ChipGroup columns multiple label="Fitness goals" options={GOALS} value={d.goals} onChange={(v) => set({ goals: v as Draft['goals'] })} />
      {errors.goals && <p className="text-xs font-medium text-berry-600">{errors.goals}</p>}
      {d.goals.includes('weight') && minor && (
        <div className="flex gap-3 rounded-2xl bg-clay-50 p-4 text-sm text-clay-700">
          <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p>
            While you're growing, NutriTrack won't set weight-loss or calorie targets. Instead we'll help with balanced meals, activity you enjoy and good sleep. If you have
            concerns about your weight, a doctor or registered dietitian is the best person to talk to.
          </p>
        </div>
      )}
      {d.goals.includes('weight') && !minor && (
        <div className="space-y-4 rounded-2xl border border-cream-300 bg-cream-50 p-4">
          <div>
            <p className="label">Direction</p>
            <ChipGroup
              label="Weight direction"
              options={[
                { value: 'lose', label: 'Lose gradually' },
                { value: 'maintain', label: 'Maintain' },
                { value: 'gain', label: 'Gain gradually' },
              ]}
              value={d.weightDirection}
              onChange={(v) => set({ weightDirection: v as Draft['weightDirection'] })}
            />
          </div>
          {d.weightDirection !== 'maintain' && (
            <div>
              <p className="label">Pace</p>
              <ChipGroup
                label="Pace"
                options={[
                  { value: 'gentle', label: 'Gentle (~0.25 kg/week)' },
                  { value: 'steady', label: 'Steady (~0.5 kg/week)' },
                ]}
                value={d.weightPace}
                onChange={(v) => set({ weightPace: v as Draft['weightPace'] })}
              />
              <p className="mt-2 text-xs text-forest-500">NutriTrack caps any change at 20% of your estimated needs and never goes below a safe minimum.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FoodStep({ d, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="label">Dietary preference</p>
        <ChipGroup columns label="Dietary preference" options={DIETS} value={d.dietType as never} onChange={(v) => set({ dietType: v as Draft['dietType'] })} />
        {errors.dietType && <p className="mt-1 text-xs font-medium text-berry-600">{errors.dietType}</p>}
      </div>
      <div>
        <p className="label">Preferred food type</p>
        <ChipGroup multiple label="Preferred cuisines" options={CUISINES} value={d.cuisines} onChange={(v) => set({ cuisines: v as Draft['cuisines'] })} />
        <p className="mt-1 text-xs text-forest-500">We'll favour these in suggestions. Choose as many as you like.</p>
      </div>
      <div>
        <p className="label">Allergies or intolerances</p>
        <ChipGroup multiple label="Allergies" options={ALLERGENS} value={d.allergies} onChange={(v) => set({ allergies: v as Draft['allergies'] })} />
        <p className="mt-1 text-xs text-forest-500">Suggestions will avoid these. Always check labels and recipes yourself.</p>
      </div>
    </div>
  );
}

export function MovementStep({ d, set, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <p className="label">Activities you enjoy</p>
        <ChipGroup multiple label="Activities" options={ACTIVITY_OPTIONS} value={d.sports} onChange={(v) => set({ sports: v as Draft['sports'] })} />
      </div>
      <div>
        <p className="label">Equipment you have</p>
        <ChipGroup multiple label="Equipment" options={EQUIPMENT} value={d.equipment} onChange={(v) => set({ equipment: v as Draft['equipment'] })} />
      </div>
      <div>
        <label className="label" htmlFor="minutes">
          Time you can usually spare: <span className="num font-semibold text-forest-900">{d.minutesPerDay} min/day</span>
        </label>
        <input id="minutes" type="range" min={10} max={120} step={5} value={d.minutesPerDay} onChange={(e) => set({ minutesPerDay: Number(e.target.value) })} className="w-full accent-sage-600" />
        {errors.minutesPerDay && <p className="text-xs font-medium text-berry-600">{errors.minutesPerDay}</p>}
      </div>
      <div>
        <p className="label">Fitness level</p>
        <ChipGroup columns label="Fitness level" options={FITNESS_LEVELS} value={d.fitnessLevel} onChange={(v) => set({ fitnessLevel: v as Draft['fitnessLevel'] })} />
      </div>
      <Field label="Injuries or physical limitations (optional)" htmlFor="limits" hint="E.g. knee pain, asthma, lower back. Plans will avoid movements that load these areas.">
        <input id="limits" className="input" maxLength={200} value={d.limitations} onChange={(e) => set({ limitations: e.target.value })} />
      </Field>
    </div>
  );
}

export function EstimateSummary({ profile, compact }: { profile: Profile; compact?: boolean }) {
  const t = computeTargets(profile);
  const rules = getSafetyRules(profile.age);
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const tiles: { label: string; value: string; hint?: string }[] = [];
  if (rules.energyFraming === 'target') {
    tiles.push({ label: 'Estimated maintenance', value: `${fmt(t.maintenance)} kcal`, hint: `${fmt(t.maintenanceRange.min)}–${fmt(t.maintenanceRange.max)} kcal/day` });
    if (t.adjustment) tiles.push({ label: 'Your daily estimate', value: `${fmt(t.energyTarget)} kcal`, hint: t.adjustment.kcal < 0 ? 'Gradual change' : 'Gradual gain' });
    if (t.bmr) tiles.push({ label: 'Resting energy (BMR)', value: `${fmt(t.bmr)} kcal` });
  } else if (rules.energyFraming === 'reference') {
    tiles.push({ label: 'Typical energy needs', value: `${fmt(t.maintenanceRange.min)}–${fmt(t.maintenanceRange.max)}`, hint: 'kcal/day · more on active days' });
  }
  tiles.push({ label: 'Protein', value: `${t.protein.min}–${t.protein.max} g`, hint: 'per day' });
  tiles.push({ label: 'Water from drinks', value: `${(t.waterMl / 1000).toFixed(1)} L`, hint: `about ${Math.round(t.waterMl / 250)} glasses` });
  tiles.push({ label: 'Fibre', value: `~${t.fiber} g`, hint: 'per day' });
  tiles.push({ label: 'Movement', value: youth ? '60 min/day' : '150+ min/week', hint: youth ? 'average, sports & play count' : 'plus 2 strength days' });

  return (
    <div className="space-y-4">
      <div className={compact ? 'grid grid-cols-2 gap-2 sm:grid-cols-3' : 'grid grid-cols-2 gap-3 sm:grid-cols-3'}>
        {tiles.map((x) => (
          <div key={x.label} className="rounded-2xl bg-cream-200/60 p-4">
            <p className="text-xs font-medium text-forest-500">{x.label}</p>
            <p className="num mt-1 font-display text-xl font-semibold">{x.value}</p>
            {x.hint && <p className="mt-0.5 text-xs text-forest-500">{x.hint}</p>}
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm text-forest-600">
        <p>
          <span className="font-semibold text-forest-800">Method: </span>
          {t.methodLabel}.
        </p>
        {t.notes.map((n) => (
          <p key={n}>{n}</p>
        ))}
      </div>
    </div>
  );
}
