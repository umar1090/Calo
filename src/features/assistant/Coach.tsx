import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { Bot, Send, Sparkles, Trash2, Plus, UtensilsCrossed } from 'lucide-react';
import { PageHeader } from '@/components/AppShell';
import { Pill } from '@/components/ui/primitives';
import { useAction, useDay, useDB, useToday } from '@/hooks/useAppData';
import { useStore } from '@/lib/auth/AuthContext';
import { respond, STARTER_PROMPTS, type AssistantContext, type AssistantReply, type ComboSuggestion } from '@/engine/assistant/assistant';
import { detectSafetyConcern } from '@/engine/assistant/safety';
import { findUnsafePhrases } from '@/engine/safety/language';
import { entryFromDraft } from '@/engine/nutrition/foodMath';
import type { FoodSuggestion } from '@/engine/recommendations/foodRecs';
import type { MealType } from '@/engine/types';
import { fmt, mealLabel } from '@/lib/labels';
import { randomId } from '@/lib/auth/crypto';
import { AddFoodSheet } from '@/features/log/AddFoodSheet';
import type { ChatMessage } from '@/lib/store/schema';

/** Renders the assistant's light markdown: **bold**, "- " bullets and "1. " steps. */
function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const inline = (s: string, k: string) =>
    s.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={`${k}-${i}`}>{part.slice(2, -2)}</strong> : <span key={`${k}-${i}`}>{part}</span>));
  const flush = () => {
    if (!list) return;
    const L = list;
    const Tag = L.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={`l${blocks.length}`} className={clsx('my-1.5 space-y-1 pl-5', L.ordered ? 'list-decimal' : 'list-disc')}>
        {L.items.map((it, i) => (
          <li key={i}>{inline(it, `li${blocks.length}-${i}`)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  text.split('\n').forEach((line, i) => {
    const bullet = line.match(/^\s*[-•]\s+(.*)$/);
    const num = line.match(/^\s*\d+\.\s+(.*)$/);
    if (bullet || num) {
      const ordered = Boolean(num);
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? num)![1]);
      return;
    }
    flush();
    if (line.trim()) blocks.push(<p key={`p${i}`} className="my-1">{inline(line, `p${i}`)}</p>);
  });
  flush();
  return <div className="text-sm leading-relaxed">{blocks}</div>;
}

export default function Coach() {
  const today = useToday();
  const db = useDB();
  const store = useStore();
  const run = useAction();
  const day = useDay(today);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ meal: MealType; preset: { foodId: string; portionId?: string } } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const ctx: AssistantContext = useMemo(
    () => ({
      ...day.recCtx,
      exerciseHistory: db.exercise,
      checkIn: day.checkIn,
      sleep: day.sleep,
    }),
    [day, db.exercise],
  );

  const claudeOn = db.preferences.aiMode === 'claude' && Boolean(db.preferences.claudeApiKey);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [db.chat.length, streaming]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setBusy(true);
    const local = respond(ctx, q);
    const history = db.chat;
    await run(() => store.appendChat([{ role: 'user', text: q }]));

    // Safety-sensitive questions are always answered by the built-in coach.
    if (claudeOn && !detectSafetyConcern(q)) {
      try {
        const { askClaude } = await import('@/lib/claudeCoach');
        abortRef.current = new AbortController();
        setStreaming('');
        const answer = await askClaude({ apiKey: db.preferences.claudeApiKey!, ctx, history, message: q, onText: setStreaming, signal: abortRef.current.signal });
        setStreaming(null);
        if (answer && findUnsafePhrases(answer, ctx.targets.rules.ageGroup).length === 0) {
          await run(() => store.appendChat([{ role: 'assistant', text: answer, source: 'claude', payload: { combos: local.combos, foods: local.foods } }]));
          setBusy(false);
          return;
        }
      } catch (e) {
        setStreaming(null);
        const msg = e instanceof Error ? e.message : 'Claude is unavailable.';
        await run(() => store.appendChat([{ role: 'assistant', text: `${msg} Here's the built-in coach's answer instead:\n\n${local.text}`, source: 'local', payload: local }]));
        setBusy(false);
        return;
      }
    }
    await run(() => store.appendChat([{ role: 'assistant', text: local.text, source: 'local', payload: local }]));
    setBusy(false);
  }

  const logCombo = async (c: ComboSuggestion) => {
    const entries = c.items.flatMap((it) => {
      const food = ctx.foods.find((f) => f.id === it.foodId);
      const portion = food?.portions.find((p) => p.id === it.portionId);
      if (!food || !portion) return [];
      return [entryFromDraft({ food, portion, quantity: it.qty, oilLevel: 'normal', mealType: c.mealType }, today, randomId(), new Date().toISOString())];
    });
    await run(() => store.addEntries(entries), `Logged ${c.name} to ${mealLabel(c.mealType)}`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const youth = ctx.targets.rules.ageGroup === 'child' || ctx.targets.rules.ageGroup === 'teen';

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col lg:min-h-[calc(100dvh-6rem)]">
      <PageHeader
        eyebrow="Coach"
        title="Ask your coach"
        subtitle={claudeOn ? 'Powered by Claude with your profile and logs. Safety questions use the built-in coach.' : 'Answers use your profile and today’s logs. Everything stays on your device.'}
        action={
          db.chat.length > 0 && (
            <button className="btn-ghost !min-h-[38px] text-xs" onClick={() => run(() => store.clearChat(), 'Conversation cleared')}>
              <Trash2 className="h-4 w-4" aria-hidden /> Clear
            </button>
          )
        }
      />

      <div className="flex-1 space-y-4" aria-live="polite">
        {db.chat.length === 0 && (
          <div className="card card-pad text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-100 text-sage-700">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-3 font-display text-lg font-semibold">How can I help today?</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-forest-500">
              I suggest affordable Indian home foods and workouts based on what you've logged. I don't give medical advice or diets for medical conditions.
            </p>
          </div>
        )}
        {db.chat.map((m) => (
          <Message key={m.id} m={m} youth={youth} onLogCombo={logCombo} onLogFood={(f: FoodSuggestion, meal: MealType) => setSheet({ meal, preset: { foodId: f.foodId, portionId: f.portionId } })} />
        ))}
        {streaming !== null && (
          <div className="flex gap-3">
            <BotAvatar />
            <div className="card max-w-[85%] rounded-tl-md px-4 py-3">{streaming ? <RichText text={streaming} /> : <TypingDots />}</div>
          </div>
        )}
        {busy && streaming === null && (
          <div className="flex gap-3">
            <BotAvatar />
            <div className="card rounded-tl-md px-4 py-3">
              <TypingDots />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ bottom: 'calc(70px + max(0.75rem, var(--sab)))' }} className="sticky z-10 mt-4 space-y-3 bg-gradient-to-t from-cream-100 via-cream-100 to-cream-100/0 pt-4 lg:!bottom-4">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Suggested questions">
          {STARTER_PROMPTS.map((p) => (
            <button key={p} className="chip shrink-0 !min-h-[36px] bg-cream-50 text-xs" onClick={() => ask(p)} disabled={busy}>
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={submit} className="flex items-center gap-2 rounded-full border border-cream-300 bg-white p-1.5 pl-5 shadow-card focus-within:ring-2 focus-within:ring-sage-200">
          <label htmlFor="coach-input" className="sr-only">
            Ask the coach
          </label>
          <input
            id="coach-input"
            className="min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-forest-400 focus:outline-none"
            placeholder="Ask about meals, protein, workouts…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={500}
            autoComplete="off"
          />
          <button type="submit" className="flex h-10 w-10 items-center justify-center rounded-full bg-sage-600 text-cream-50 transition hover:bg-sage-700 disabled:opacity-40" disabled={!input.trim() || busy} aria-label="Send">
            <Send className="h-4 w-4" aria-hidden />
          </button>
        </form>
      </div>

      <AddFoodSheet open={sheet !== null} onClose={() => setSheet(null)} date={today} meal={sheet?.meal ?? 'snack'} preset={sheet?.preset ?? null} />
    </div>
  );
}

function BotAvatar() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-sage-600 text-cream-50" aria-hidden>
      <Bot className="h-5 w-5" strokeWidth={1.75} />
    </span>
  );
}

function TypingDots() {
  return (
    <span className="flex gap-1 py-1" aria-label="Coach is typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-sage-400" style={{ animationDelay: `${i * 150}ms` }} />
      ))}
    </span>
  );
}

function Message({ m, youth, onLogCombo, onLogFood }: { m: ChatMessage; youth: boolean; onLogCombo: (c: ComboSuggestion) => void; onLogFood: (f: FoodSuggestion, meal: MealType) => void }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-3xl rounded-tr-md bg-sage-600 px-4 py-3 text-sm text-cream-50">{m.text}</div>
      </div>
    );
  }
  const payload = (m.payload ?? {}) as Partial<AssistantReply>;
  return (
    <div className="flex gap-3">
      <BotAvatar />
      <div className="min-w-0 max-w-[90%] space-y-2">
        <div className="card rounded-tl-md px-4 py-3">
          <RichText text={m.text} />
          {m.source === 'claude' && (
            <p className="mt-2">
              <Pill tone="cream">Claude</Pill>
            </p>
          )}
        </div>
        {payload.combos && payload.combos.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {payload.combos.map((c) => (
              <div key={c.id} className="rounded-2xl border border-cream-300 bg-white/70 p-3">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <UtensilsCrossed className="h-4 w-4 text-clay-500" aria-hidden />
                  {c.name}
                </p>
                <p className="num mt-1 text-xs text-forest-500">
                  {c.items.map((i) => `${i.qty !== 1 ? `${i.qty} × ` : ''}${i.portionLabel}`).join(' · ')}
                </p>
                <p className="num mt-1 text-xs text-forest-600">
                  {youth ? '' : `~${fmt(c.totals.kcal)} kcal · `}
                  {fmt(c.totals.protein)} g protein
                </p>
                <button className="btn-secondary mt-2 !min-h-[34px] !px-3 text-xs" onClick={() => onLogCombo(c)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden /> Log to {mealLabel(c.mealType)}
                </button>
              </div>
            ))}
          </div>
        )}
        {payload.foods && payload.foods.length > 0 && !payload.combos?.length && (
          <div className="flex flex-wrap gap-2">
            {payload.foods.map((f) => (
              <button key={f.foodId} className="chip !min-h-[34px] text-xs" onClick={() => onLogFood(f, 'snack')}>
                <Plus className="h-3.5 w-3.5" aria-hidden /> Log {f.name.split(' (')[0]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
