import clsx from 'clsx';
import { Check, Leaf, Lightbulb, HeartHandshake, MessageCircle, Plus, X } from 'lucide-react';
import type { Feedback } from '@/engine/analysis/daily';
import type { Recommendation } from '@/engine/recommendations/foodRecs';
import { useAction } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';

const TONE = {
  positive: { icon: Leaf, cls: 'bg-sage-50 text-sage-800', iconCls: 'bg-sage-100 text-sage-700' },
  suggestion: { icon: Lightbulb, cls: 'bg-clay-50 text-clay-700', iconCls: 'bg-clay-100 text-clay-600' },
  care: { icon: HeartHandshake, cls: 'bg-dew-50 text-dew-600', iconCls: 'bg-dew-100 text-dew-600' },
  neutral: { icon: MessageCircle, cls: 'bg-cream-200/60 text-forest-700', iconCls: 'bg-cream-300/70 text-forest-600' },
} as const;

export function FeedbackList({ items, limit = 3 }: { items: Feedback[]; limit?: number }) {
  return (
    <ul className="space-y-2.5">
      {items.slice(0, limit).map((f) => {
        const t = TONE[f.tone];
        const Icon = t.icon;
        return (
          <li key={f.id} className={clsx('flex gap-3 rounded-2xl p-3.5', t.cls)}>
            <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', t.iconCls)}>
              <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
            </span>
            <div className="text-sm">
              <p className="font-semibold">{f.title}</p>
              <p className="mt-0.5 opacity-90">{f.text}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RecommendationList({ items, date, onAdd, limit = 4 }: { items: Recommendation[]; date: string; onAdd: (r: Recommendation) => void; limit?: number }) {
  const store = useStore();
  const run = useAction();
  if (!items.length) return <p className="text-sm text-forest-500">No suggestions right now. Log a meal and they'll appear here.</p>;
  return (
    <ul className="space-y-3">
      {items.slice(0, limit).map((r) => (
        <li key={r.id} className="rounded-2xl border border-cream-300/80 bg-white/60 p-4">
          <p className="text-sm font-semibold text-forest-900">{r.title}</p>
          <p className="mt-1 text-sm text-forest-700">{r.message}</p>
          <p className="mt-1.5 text-xs text-forest-500">{r.reason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {r.food && (
              <button className="btn-secondary !min-h-[36px] !px-3 text-xs" onClick={() => onAdd(r)}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Log {r.food.name.split(' (')[0].toLowerCase()}
              </button>
            )}
            <button className="btn-ghost !min-h-[36px] !px-3 text-xs" onClick={() => run(() => store.setRecState({ date, recId: r.id, status: 'done' }), 'Nice one!')}>
              <Check className="h-3.5 w-3.5" aria-hidden /> Done
            </button>
            <button className="btn-ghost !min-h-[36px] !px-3 text-xs text-forest-500" onClick={() => run(() => store.setRecState({ date, recId: r.id, status: 'dismissed' }))} aria-label={`Hide suggestion: ${r.title}`}>
              <X className="h-3.5 w-3.5" aria-hidden /> Hide
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
