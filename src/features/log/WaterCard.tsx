import { GlassWater, Minus, Plus } from 'lucide-react';
import clsx from 'clsx';
import { Card, CardHeader } from '@/components/ui/primitives';
import { useAction, useDB } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';

export function WaterCard({ date, waterMl, targetMl, active }: { date: string; waterMl: number; targetMl: number; active?: boolean }) {
  const store = useStore();
  const db = useDB();
  const run = useAction();
  const glass = db.preferences.glassMl;
  const goalGlasses = Math.max(1, Math.round(targetMl / glass));
  const had = Math.round(waterMl / glass);
  const shown = Math.max(goalGlasses, had);

  return (
    <Card aria-labelledby="water-title">
      <CardHeader
        icon={<GlassWater className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        eyebrow="Water"
        title={
          <span id="water-title" className="num">
            {(waterMl / 1000).toFixed(2).replace(/0$/, '')} L <span className="text-sm font-normal text-forest-500">of {(targetMl / 1000).toFixed(1)} L</span>
          </span>
        }
      />
      <div className="flex flex-wrap gap-1.5" aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={clsx('h-8 w-6 rounded-b-lg rounded-t-sm border-2 transition', i < had ? 'border-dew-500 bg-dew-400' : 'border-dew-200 bg-dew-50')} />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs text-forest-500">
          {had} of {goalGlasses} glasses ({glass} ml){active ? ' · a little extra on active days' : ''}
        </p>
        <div className="flex gap-2">
          <button className="btn-icon border border-cream-300 bg-white" aria-label="Remove a glass of water" disabled={waterMl <= 0} onClick={() => run(() => store.removeLastWater(date))}>
            <Minus className="h-4 w-4" />
          </button>
          <button className="btn h-10 bg-dew-500 px-4 text-white hover:bg-dew-600" onClick={() => run(() => store.addWater(date, glass))} aria-label="Add a glass of water">
            <Plus className="h-4 w-4" aria-hidden /> Glass
          </button>
        </div>
      </div>
    </Card>
  );
}
