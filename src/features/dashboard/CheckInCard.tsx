import { useState } from 'react';
import clsx from 'clsx';
import { Sunrise } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/primitives';
import { useAction, useDB } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import type { CheckIn } from '@/engine/types';

const ENERGY = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
const FATIGUE = ['Fresh', 'A little tired', 'Tired', 'Very tired / sore', 'Exhausted'];

type Scale = 1 | 2 | 3 | 4 | 5;

export function CheckInCard({ date, existing, onDone }: { date: string; existing?: CheckIn; onDone?: () => void }) {
  const store = useStore();
  const db = useDB();
  const run = useAction();
  const [energy, setEnergy] = useState<Scale>(existing?.energy ?? 3);
  const [fatigue, setFatigue] = useState<Scale>(existing?.fatigue ?? 2);
  const sleepLog = db.sleep.find((s) => s.date === date);
  const [sleep, setSleep] = useState(String(sleepLog?.hours ?? ''));

  const save = async () => {
    await run(async () => {
      await store.setCheckIn({ date, energy, fatigue });
      const h = Number(sleep);
      if (db.preferences.trackSleep && sleep !== '' && Number.isFinite(h)) await store.setSleep({ date, hours: h, quality: energy });
    }, 'Thanks for checking in');
    onDone?.();
  };

  const scale = (label: string, labels: string[], value: Scale, set: (v: Scale) => void) => (
    <div>
      <p className="label">{label}</p>
      <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={label}>
        {labels.map((l, i) => (
          <button
            key={l}
            role="radio"
            aria-checked={value === i + 1}
            onClick={() => set((i + 1) as Scale)}
            className={clsx(
              'min-h-[52px] rounded-2xl border px-1 text-[11px] font-semibold leading-tight transition',
              value === i + 1 ? 'border-sage-600 bg-sage-600 text-cream-50' : 'border-cream-300 bg-cream-50 text-forest-600 hover:border-sage-300',
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card aria-label="Daily check-in">
      <CardHeader icon={<Sunrise className="h-[18px] w-[18px]" strokeWidth={1.75} />} eyebrow="Check-in" title="How are you feeling today?" />
      <div className="space-y-4">
        {scale('Energy', ENERGY, energy, setEnergy)}
        {scale('Tiredness or soreness', FATIGUE, fatigue, setFatigue)}
        {db.preferences.trackSleep && (
          <div className="flex items-center gap-3">
            <label className="label mb-0" htmlFor="sleep-hours">
              Hours slept last night
            </label>
            <input id="sleep-hours" type="number" inputMode="decimal" step="0.5" min={0} max={16} className="input max-w-[6rem]" value={sleep} onChange={(e) => setSleep(e.target.value)} />
          </div>
        )}
        <p className="text-xs text-forest-500">Your activity plan adapts to how you feel. Rest is part of getting fitter.</p>
        <button className="btn-primary w-full sm:w-auto" onClick={save}>
          Save check-in
        </button>
      </div>
    </Card>
  );
}
