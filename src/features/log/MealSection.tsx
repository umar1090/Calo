import { Pencil, Plus, Trash2, Coffee, Sun, Moon, Cookie, CupSoda } from 'lucide-react';
import type { MealEntry, MealType } from '@/engine/types';
import { fmt, mealLabel } from '@/lib/labels';
import { sumNutrients } from '@/engine/nutrition/foodMath';

const ICONS: Record<MealType, typeof Coffee> = { breakfast: Coffee, lunch: Sun, dinner: Moon, snack: Cookie, beverage: CupSoda };

export function MealSection({
  meal,
  entries,
  onAdd,
  onEdit,
  onDelete,
  showKcal,
}: {
  meal: MealType;
  entries: MealEntry[];
  onAdd: () => void;
  onEdit: (e: MealEntry) => void;
  onDelete: (e: MealEntry) => void;
  showKcal: boolean;
}) {
  const Icon = ICONS[meal];
  const totals = sumNutrients(entries.map((e) => e.nutrients));
  return (
    <section className="card overflow-hidden" aria-labelledby={`meal-${meal}`}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-clay-50 text-clay-600">
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <div>
            <h2 id={`meal-${meal}`} className="font-display text-lg font-semibold leading-tight">
              {mealLabel(meal)}
            </h2>
            <p className="num text-xs text-forest-500">
              {entries.length ? `${showKcal ? `${fmt(totals.kcal)} kcal · ` : ''}${fmt(totals.protein, 1)} g protein` : 'Nothing logged'}
            </p>
          </div>
        </div>
        <button className="btn-secondary !min-h-[38px] !px-3.5" onClick={onAdd} aria-label={`Add food to ${mealLabel(meal)}`}>
          <Plus className="h-4 w-4" aria-hidden /> Add
        </button>
      </div>
      {entries.length > 0 && (
        <ul className="divide-y divide-cream-300/60 border-t border-cream-300/60">
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {e.foodName}
                  {e.edited && <span className="ml-1.5 text-[11px] font-normal text-forest-400">(edited)</span>}
                </p>
                <p className="num truncate text-xs text-forest-500">
                  {e.quantity !== 1 ? `${e.quantity} × ` : ''}
                  {e.portionLabel}
                  {e.oilLevel && e.oilLevel !== 'normal' ? ` · ${e.oilLevel} oil` : ''} · {new Date(e.loggedAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div className="num text-right text-xs">
                {showKcal && <p className="font-semibold text-forest-800">{fmt(e.nutrients.kcal)} kcal</p>}
                <p className="text-forest-500">{fmt(e.nutrients.protein, 1)} g protein</p>
              </div>
              <div className="flex">
                <button className="btn-icon h-9 w-9" aria-label={`Edit ${e.foodName}`} onClick={() => onEdit(e)}>
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="btn-icon h-9 w-9" aria-label={`Delete ${e.foodName}`} onClick={() => onDelete(e)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
