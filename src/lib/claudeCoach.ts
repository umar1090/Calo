import Anthropic from '@anthropic-ai/sdk';
import type { AssistantContext } from '@/engine/assistant/assistant';
import { analyzeDay } from '@/engine/analysis/daily';
import { recommendFoods } from '@/engine/recommendations/foodRecs';
import { generateDailyPlan } from '@/engine/activity/engine';
import type { ChatMessage } from './store/schema';

/**
 * Optional "bring your own key" mode: sends the question plus a compact,
 * de-identified summary of the user's profile and logs to Claude.
 * Safety-sensitive messages never reach this function (the caller routes them
 * to the built-in coach), and replies are checked with the same language filter.
 */

import { CLAUDE_MODEL } from './claudeModel';
export { CLAUDE_MODEL };

const SYSTEM_RULES = `You are the NutriTrack coach inside a nutrition and fitness app for people in India.

How to help:
- Base every answer on the user's profile and logs given in the context block. Refer to what they actually ate or did.
- Suggest affordable, everyday Indian household foods (dal, roti, rice, sabzi, curd, paneer, eggs, chana, sprouts, seasonal fruit). Respect their diet type and allergies strictly.
- Prefer food over supplements. Do not recommend protein powders, fat burners or other supplements.
- Keep replies short and practical: 2-6 sentences or a few bullet points. Use "- " for bullets and **bold** sparingly. No headings, no tables.

Safety rules you must always follow:
- Never diagnose medical conditions or prescribe diets for medical conditions (diabetes, PCOS, thyroid, kidney disease, pregnancy, etc.). Suggest a doctor or registered dietitian instead.
- Never encourage restriction, skipping meals, fasting to lose weight, or exercising to "burn off" or compensate for food. Never use guilt or words like fail, cheat, junk, bad food, punish.
- If the user is under 18 (age_group child or teen): never give calorie targets, deficits, "calories left", or weight-loss advice. Focus on regular balanced meals, growth, sport, sleep and enjoying food. If they raise weight worries, suggest talking to a parent and a doctor.
- Treat all numbers as estimates.`;

export function buildContext(ctx: AssistantContext): string {
  const a = analyzeDay(ctx);
  const s = a.summary;
  const rules = ctx.targets.rules;
  const youth = rules.ageGroup === 'child' || rules.ageGroup === 'teen';
  const days = new Set(ctx.recentEntries.map((e) => e.date));
  const plan = generateDailyPlan({ profile: ctx.profile, date: ctx.date, logs: ctx.exerciseHistory, checkIn: ctx.checkIn, sleep: ctx.sleep });
  const context = {
    local_time: ctx.now.toLocaleString('en-IN', { weekday: 'long', hour: 'numeric', minute: '2-digit' }),
    profile: {
      age_group: rules.ageGroup,
      age: ctx.profile.age,
      diet: ctx.profile.dietType,
      allergies: ctx.profile.allergies,
      cuisines: ctx.profile.cuisines,
      goals: ctx.profile.goals,
      activity_level: ctx.profile.activityLevel,
      sports: ctx.profile.sports,
      fitness_level: ctx.profile.fitnessLevel,
      limitations: ctx.profile.limitations ?? null,
    },
    estimates: {
      protein_g_per_day: `${ctx.targets.protein.min}-${ctx.targets.protein.max}`,
      water_l_per_day: (ctx.day.waterMl / 1000).toFixed(1),
      fibre_g_per_day: ctx.targets.fiber,
      ...(youth ? {} : { energy_kcal_per_day: ctx.day.energyTarget }),
    },
    today: {
      meals_logged: s.mealsLogged,
      foods: ctx.entries.map((e) => `${e.mealType}: ${e.foodName} (${e.quantity} x ${e.portionLabel})`),
      protein_g: Math.round(s.totals.protein),
      ...(rules.energyFraming === 'target' ? { energy_kcal: Math.round(s.totals.kcal) } : {}),
      fibre_g: Math.round(s.totals.fiber),
      vegetable_servings: s.vegServings,
      fruit_servings: s.fruitServings,
      water_l: (ctx.waterMl / 1000).toFixed(1),
      active_minutes: ctx.exercises.reduce((t, e) => t + e.minutes, 0),
      feedback: a.feedback.map((f) => f.title),
    },
    last_7_days: {
      days_logged: days.size,
      avg_protein_g: days.size ? Math.round(ctx.recentEntries.reduce((t, e) => t + e.nutrients.protein, 0) / days.size) : null,
    },
    todays_activity_plan: { title: plan.title, items: plan.items.map((i) => `${i.name}: ${i.detail}`) },
    app_suggestions: recommendFoods(ctx, 3).map((r) => r.message),
    check_in: ctx.checkIn ? { energy_1_to_5: ctx.checkIn.energy, tiredness_1_to_5: ctx.checkIn.fatigue } : null,
  };
  return JSON.stringify(context);
}

export class ClaudeCoachError extends Error {
  constructor(
    message: string,
    public kind: 'auth' | 'rate' | 'network' | 'refusal' | 'other',
  ) {
    super(message);
  }
}

export async function askClaude(opts: {
  apiKey: string;
  ctx: AssistantContext;
  history: ChatMessage[];
  message: string;
  onText: (snapshot: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true, maxRetries: 1 });
  const history: Anthropic.Beta.BetaMessageParam[] = opts.history
    .filter((m) => m.text.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.text }));
  while (history.length && history[0].role !== 'user') history.shift();

  try {
    const stream = client.beta.messages.stream(
      {
        model: CLAUDE_MODEL,
        max_tokens: 8000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [
          { type: 'text', text: SYSTEM_RULES, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: `Context (JSON):\n${buildContext(opts.ctx)}` },
        ],
        messages: [...history, { role: 'user', content: opts.message }],
      },
      { signal: opts.signal },
    );
    stream.on('text', (_delta, snapshot) => opts.onText(snapshot));
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new ClaudeCoachError('Claude declined to answer that.', 'refusal');
    return final.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
  } catch (e) {
    if (e instanceof ClaudeCoachError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new ClaudeCoachError('Your Claude API key was not accepted. Check it in Profile → AI coach.', 'auth');
    if (e instanceof Anthropic.RateLimitError) throw new ClaudeCoachError('Claude is busy right now (rate limited).', 'rate');
    if (e instanceof Anthropic.APIConnectionError) throw new ClaudeCoachError('Could not reach Claude. Check your connection.', 'network');
    if (e instanceof Anthropic.APIError) throw new ClaudeCoachError(`Claude returned an error (${e.status ?? 'unknown'}).`, 'other');
    throw new ClaudeCoachError('Something went wrong talking to Claude.', 'other');
  }
}
