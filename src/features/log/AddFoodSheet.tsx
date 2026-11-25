import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { ChevronLeft, Plus, Search, ShoppingBasket, Trash2, Pencil, Info } from 'lucide-react';
import { Sheet, Segmented, Stepper, Field, Pill } from '@/components/ui/primitives';
import { FOOD_CATEGORY_LABELS, type Food, type FoodCategory, type Portion } from '@/data/foods';
import { searchFoods } from '@/data/foodSearch';
import { defaultPortion, entryFromDraft, portionNutrients, suitableFor, type EntryDraft } from '@/engine/nutrition/foodMath';
import type { MealEntry, MealType, Nutrients, OilLevel } from '@/engine/types';
import { useAction, useDB, useFoods } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { MEALS, fmt, mealLabel } from '@/lib/labels';
import { randomId } from '@/lib/auth/crypto';
import { customFoodSchema } from '@/lib/store/schema';

interface Props {
  open: boolean;
  onClose: () => void;
  date: string;
  meal: MealType;
  editing?: MealEntry | null;
  preset?: { foodId: string; portionId?: string; qty?: number } | null;
}

type View = 'search' | 'detail' | 'custom';

const CATEGORY_ORDER: (FoodCategory | 'all')[] = ['all', 'breads', 'rice', 'dal', 'sabzi', 'curry', 'breakfast', 'dairy', 'eggs', 'meat', 'fish', 'indo_chinese', 'fruit', 'nuts', 'snacks', 'sweets', 'beverages', 'salad', 'extras'];

const CUSTOM_PORTION_ID = '__custom__';

function NutrientRow({ n, compact }: { n: Nutrients; compact?: boolean }) {
  const items = [
    { label: 'Calories', value: `${fmt(n.kcal)}`, unit: 'kcal' },
    { label: 'Protein', value: fmt(n.protein, 1), unit: 'g' },
    { label: 'Carbs', value: fmt(n.carbs, 1), unit: 'g' },
    { label: 'Fat', value: fmt(n.fat, 1), unit: 'g' },
  ];
  return (
    <div className={clsx('grid grid-cols-4 gap-2', compact && 'text-xs')}>
      {items.map((i) => (
        <div key={i.label} className="rounded-2xl bg-cream-200/60 px-2 py-2.5 text-center">
          <p className="num font-display text-lg font-semibold leading-none">
            {i.value}
            <span className="ml-0.5 font-sans text-[11px] font-medium text-forest-500">{i.unit}</span>
          </p>
          <p className="mt-1 text-[11px] text-forest-500">{i.label}</p>
        </div>
      ))}
    </div>
  );
}

export function AddFoodSheet({ open, onClose, date, meal, editing, preset }: Props) {
  const db = useDB();
  const store = useStore();
  const foods = useFoods();
  const run = useAction();
  const profile = db.profile!;

  const [view, setView] = useState<View>('search');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FoodCategory | 'all'>('all');
  const [mealType, setMealType] = useState<MealType>(meal);
  const [food, setFood] = useState<Food | null>(null);
  const [portionId, setPortionId] = useState('');
  const [customGrams, setCustomGrams] = useState('100');
  const [qty, setQty] = useState(1);
  const [oil, setOil] = useState<OilLevel>('normal');
  const [overrideOn, setOverrideOn] = useState(false);
  const [override, setOverride] = useState<Record<keyof Nutrients, string>>({ kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [tray, setTray] = useState<EntryDraft[]>([]);
  const [error, setError] = useState('');

  // Reset whenever the sheet opens.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCategory('all');
    setMealType(editing?.mealType ?? meal);
    setTray([]);
    setError('');
    setOverrideOn(false);
    const startFood = editing?.foodId ? foods.find((f) => f.id === editing.foodId) : preset ? foods.find((f) => f.id === preset.foodId) : undefined;
    if (startFood) {
      openDetail(startFood);
      if (editing) {
        const p = startFood.portions.find((x) => x.label === editing.portionLabel);
        if (p) setPortionId(p.id);
        else {
          setPortionId(CUSTOM_PORTION_ID);
          setCustomGrams(String(Math.round(editing.grams / editing.quantity)));
        }
        setQty(editing.quantity);
        setOil(editing.oilLevel ?? 'normal');
        if (editing.edited) {
          setOverrideOn(true);
          setOverride({
            kcal: String(editing.nutrients.kcal),
            protein: String(editing.nutrients.protein),
            carbs: String(editing.nutrients.carbs),
            fat: String(editing.nutrients.fat),
            fiber: String(editing.nutrients.fiber),
          });
        }
      } else if (preset) {
        if (preset.portionId && startFood.portions.some((p) => p.id === preset.portionId)) setPortionId(preset.portionId);
        if (preset.qty) setQty(preset.qty);
      }
    } else {
      setView('search');
      setFood(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, preset, meal]);

  function openDetail(f: Food) {
    setFood(f);
    setPortionId(f.defaultPortionId);
    setCustomGrams(String(defaultPortion(f).grams));
    setQty(1);
    setOil('normal');
    setOverrideOn(false);
    setOverride({ kcal: '', protein: '', carbs: '', fat: '', fiber: '' });
    setError('');
    setView('detail');
  }

  const results = useMemo(() => {
    const list = searchFoods(foods, query, { category, limit: 60 });
    // Show foods that fit the user's diet first, but keep everything searchable.
    return [...list].sort((a, b) => Number(suitableFor(profile, b)) - Number(suitableFor(profile, a)));
  }, [foods, query, category, profile]);

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (const e of [...db.entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
      if (!e.foodId || seen.has(e.foodId)) continue;
      const f = foods.find((x) => x.id === e.foodId);
      if (f) {
        seen.add(e.foodId);
        out.push(f);
      }
      if (out.length >= 8) break;
    }
    return out;
  }, [db.entries, foods]);

  const portion: Portion | null = food
    ? portionId === CUSTOM_PORTION_ID
      ? { id: CUSTOM_PORTION_ID, label: `${Number(customGrams) || 0} ${food.unit}`, grams: Number(customGrams) || 0 }
      : food.portions.find((p) => p.id === portionId) ?? defaultPortion(food)
    : null;

  const computed = food && portion ? portionNutrients(food, portion.grams, qty, oil) : null;

  function buildDraft(): EntryDraft | null {
    if (!food || !portion) return null;
    if (portion.grams <= 0 || portion.grams > 3000) {
      setError(`Enter a portion between 1 and 3000 ${food.unit}.`);
      return null;
    }
    let ov: Nutrients | undefined;
    if (overrideOn) {
      const n = Object.fromEntries(Object.entries(override).map(([k, v]) => [k, v.trim() === '' ? NaN : Number(v)])) as unknown as Nutrients;
      const filled: Nutrients = {
        kcal: Number.isFinite(n.kcal) ? n.kcal : computed!.kcal,
        protein: Number.isFinite(n.protein) ? n.protein : computed!.protein,
        carbs: Number.isFinite(n.carbs) ? n.carbs : computed!.carbs,
        fat: Number.isFinite(n.fat) ? n.fat : computed!.fat,
        fiber: Number.isFinite(n.fiber) ? n.fiber : computed!.fiber,
      };
      if (Object.values(filled).some((v) => v < 0 || v > 10000)) {
        setError('Values must be between 0 and 10,000.');
        return null;
      }
      ov = filled;
    }
    setError('');
    return { food, portion, quantity: qty, oilLevel: oil, mealType, override: ov };
  }

  const toEntry = (d: EntryDraft) => entryFromDraft(d, date, randomId(), new Date().toISOString());

  async function logNow() {
    const d = buildDraft();
    if (!d) return;
    if (editing) {
      const e = entryFromDraft(d, editing.date, editing.id, editing.loggedAt);
      const ok = await run(() => store.updateEntry(editing.id, e), 'Entry updated');
      if (ok.ok) onClose();
      return;
    }
    const all = [...tray, d].map((x) => ({ ...x, mealType }));
    const ok = await run(() => store.addEntries(all.map(toEntry)), all.length > 1 ? `Added ${all.length} items to ${mealLabel(mealType)}` : `Added to ${mealLabel(mealType)}`);
    if (ok.ok) onClose();
  }

  function addToTray() {
    const d = buildDraft();
    if (!d) return;
    setTray((t) => [...t, d]);
    setView('search');
    setQuery('');
  }

  async function logTray() {
    const all = tray.map((x) => ({ ...x, mealType }));
    const ok = await run(() => store.addEntries(all.map(toEntry)), `Added ${all.length} item${all.length > 1 ? 's' : ''} to ${mealLabel(mealType)}`);
    if (ok.ok) onClose();
  }

  const title = editing ? 'Edit entry' : view === 'custom' ? 'Add your own food' : view === 'detail' ? 'Add food' : `Add to ${mealLabel(mealType)}`;

  const footer =
    view === 'detail' ? (
      <div className="flex gap-2">
        {!editing && (
          <button className="btn-secondary flex-1" onClick={addToTray}>
            <ShoppingBasket className="h-4 w-4" aria-hidden /> Add & pick more
          </button>
        )}
        <button className="btn-primary flex-1" onClick={logNow}>
          {editing ? 'Save changes' : tray.length ? `Log ${tray.length + 1} items` : 'Log food'}
        </button>
      </div>
    ) : view === 'search' && tray.length ? (
      <button className="btn-primary w-full" onClick={logTray}>
        Log {tray.length} item{tray.length > 1 ? 's' : ''} to {mealLabel(mealType)}
      </button>
    ) : undefined;

  return (
    <Sheet open={open} onClose={onClose} title={title} footer={footer} wide>
      {view !== 'custom' && (
        <div className="mb-4 overflow-x-auto">
          <Segmented label="Meal" size="sm" value={mealType} onChange={setMealType} options={MEALS} />
        </div>
      )}

      {view === 'search' && (
        <div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-400" aria-hidden />
            <input
              data-autofocus
              type="search"
              className="input pl-10"
              placeholder="Search roti, dal, idli, paneer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search foods"
            />
          </div>
          <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Food categories">
            {CATEGORY_ORDER.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={clsx('chip shrink-0 !min-h-[34px] !px-3 text-xs', category === c && 'chip-on')}>
                {c === 'all' ? 'All' : FOOD_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {tray.length > 0 && (
            <div className="mt-4 rounded-2xl border border-sage-200 bg-sage-50 p-3">
              <p className="mb-2 text-xs font-semibold text-sage-800">In this meal ({tray.length})</p>
              <ul className="space-y-1.5">
                {tray.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">
                      {t.food.name} · {t.quantity} × {t.portion.label}
                    </span>
                    <button className="btn-icon h-8 w-8" aria-label={`Remove ${t.food.name}`} onClick={() => setTray((x) => x.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!query && category === 'all' && recent.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-2">Recent</p>
              <div className="flex flex-wrap gap-2">
                {recent.map((f) => (
                  <button key={f.id} className="chip !min-h-[34px] text-xs" onClick={() => openDetail(f)}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <ul className="mt-4 divide-y divide-cream-300/70" aria-label="Search results">
            {results.map((f) => {
              const p = defaultPortion(f);
              const n = portionNutrients(f, p.grams, 1);
              const fits = suitableFor(profile, f);
              return (
                <li key={f.id}>
                  <button className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:bg-cream-200/40" onClick={() => openDetail(f)}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {f.name} {f.custom && <Pill tone="clay">Yours</Pill>}
                      </span>
                      <span className="block truncate text-xs text-forest-500">
                        {p.label} · {n.kcal} kcal · {n.protein} g protein{!fits && ' · not in your diet settings'}
                      </span>
                    </span>
                    <Plus className="h-5 w-5 shrink-0 text-sage-600" aria-hidden />
                  </button>
                </li>
              );
            })}
          </ul>
          {results.length === 0 && <p className="py-6 text-center text-sm text-forest-500">No matches for "{query}". Try another spelling, or add it yourself.</p>}
          <button className="btn-secondary mt-4 w-full" onClick={() => setView('custom')}>
            <Pencil className="h-4 w-4" aria-hidden /> Add food manually
          </button>
        </div>
      )}

      {view === 'detail' && food && portion && computed && (
        <div className="space-y-5">
          {!editing && (
            <button className="btn-ghost -ml-3 !min-h-[36px] text-xs" onClick={() => setView('search')}>
              <ChevronLeft className="h-4 w-4" aria-hidden /> Back to search
            </button>
          )}
          <div>
            <h3 className="font-display text-xl font-semibold">{food.name}</h3>
            {food.homemade && (
              <p className="mt-2 flex gap-2 rounded-2xl bg-clay-50 p-3 text-xs text-clay-700">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                Estimates for homemade Indian food may vary with oil, ghee, ingredients and portion size. Adjust the oil level or edit the values if you know them.
              </p>
            )}
          </div>

          <div>
            <p className="label">Portion</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Portion size">
              {food.portions.map((p) => (
                <button key={p.id} type="button" aria-pressed={portionId === p.id} className={clsx('chip !min-h-[38px]', portionId === p.id && 'chip-on')} onClick={() => setPortionId(p.id)}>
                  {p.label}
                </button>
              ))}
              <button type="button" aria-pressed={portionId === CUSTOM_PORTION_ID} className={clsx('chip !min-h-[38px]', portionId === CUSTOM_PORTION_ID && 'chip-on')} onClick={() => setPortionId(CUSTOM_PORTION_ID)}>
                Custom ({food.unit})
              </button>
            </div>
            {portionId === CUSTOM_PORTION_ID && (
              <div className="mt-3 flex items-center gap-2">
                <input aria-label={`Portion in ${food.unit}`} className="input max-w-[8rem]" type="number" inputMode="decimal" value={customGrams} onChange={(e) => setCustomGrams(e.target.value)} />
                <span className="text-sm text-forest-500">{food.unit}</span>
              </div>
            )}
            {portionId !== CUSTOM_PORTION_ID && <p className="mt-1.5 text-xs text-forest-500">≈ {portion.grams} {food.unit} per portion</p>}
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="label">Quantity</p>
              <Stepper label="quantity" value={qty} onChange={setQty} min={0.5} max={20} step={0.5} />
            </div>
            {food.oilAdjustable && (
              <div>
                <p className="label">Oil / ghee</p>
                <Segmented
                  label="Oil level"
                  size="sm"
                  value={oil}
                  onChange={setOil}
                  options={[
                    { value: 'less', label: 'Less' },
                    { value: 'normal', label: 'Normal' },
                    { value: 'more', label: 'More' },
                  ]}
                />
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="label mb-0">Estimated nutrition</p>
              <label className="flex items-center gap-2 text-xs font-medium text-forest-600">
                <input type="checkbox" className="h-4 w-4 accent-sage-600" checked={overrideOn} onChange={(e) => setOverrideOn(e.target.checked)} />
                Edit values
              </label>
            </div>
            {overrideOn ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {(['kcal', 'protein', 'carbs', 'fat', 'fiber'] as const).map((k) => (
                  <Field key={k} label={k === 'kcal' ? 'Calories' : k === 'fiber' ? 'Fibre (g)' : `${k[0].toUpperCase()}${k.slice(1)} (g)`} htmlFor={`ov-${k}`}>
                    <input id={`ov-${k}`} className="input" type="number" inputMode="decimal" min={0} placeholder={String(computed[k])} value={override[k]} onChange={(e) => setOverride((o) => ({ ...o, [k]: e.target.value }))} />
                  </Field>
                ))}
              </div>
            ) : (
              <NutrientRow n={computed} />
            )}
          </div>
          {error && (
            <p className="text-sm font-medium text-berry-600" role="alert">
              {error}
            </p>
          )}
        </div>
      )}

      {view === 'custom' && <CustomFoodForm onBack={() => setView('search')} onCreated={(f) => openDetail(f)} />}
    </Sheet>
  );
}

function CustomFoodForm({ onBack, onCreated }: { onBack: () => void; onCreated: (f: Food) => void }) {
  const store = useStore();
  const run = useAction();
  const [v, setV] = useState({ name: '', portionLabel: '1 serving', grams: '100', kcal: '', protein: '', carbs: '', fat: '', fiber: '0' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function save() {
    const parsed = customFoodSchema.safeParse({
      name: v.name,
      portionLabel: v.portionLabel,
      grams: Number(v.grams),
      kcal: v.kcal === '' ? NaN : Number(v.kcal),
      protein: Number(v.protein || 0),
      carbs: Number(v.carbs || 0),
      fat: Number(v.fat || 0),
      fiber: Number(v.fiber || 0),
    });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (e[String(i.path[0])] ??= i.path[0] === 'kcal' && v.kcal === '' ? 'Enter calories' : i.message));
      setErrors(e);
      return;
    }
    const r = await run(() => store.addCustomFood(parsed.data), 'Food saved to your list');
    if (r.ok) onCreated(r.value);
  }

  const input = (key: keyof typeof v, label: string, type: 'text' | 'number' = 'number') => (
    <Field label={label} htmlFor={`cf-${key}`} error={errors[key]}>
      <input id={`cf-${key}`} className="input" type={type} inputMode={type === 'number' ? 'decimal' : undefined} value={v[key]} onChange={(e) => setV((x) => ({ ...x, [key]: e.target.value }))} />
    </Field>
  );

  return (
    <div className="space-y-4">
      <button className="btn-ghost -ml-3 !min-h-[36px] text-xs" onClick={onBack}>
        <ChevronLeft className="h-4 w-4" aria-hidden /> Back to search
      </button>
      <p className="text-sm text-forest-500">Add a family recipe or packaged food. Values are for one portion; you can find them on the label or a recipe calculator.</p>
      {input('name', 'Food name', 'text')}
      <div className="grid grid-cols-2 gap-3">
        {input('portionLabel', 'Portion name', 'text')}
        {input('grams', 'Portion size (g)')}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {input('kcal', 'Calories')}
        {input('protein', 'Protein (g)')}
        {input('carbs', 'Carbs (g)')}
        {input('fat', 'Fat (g)')}
        {input('fiber', 'Fibre (g)')}
      </div>
      <button className="btn-primary w-full" onClick={save}>
        Save food
      </button>
    </div>
  );
}
