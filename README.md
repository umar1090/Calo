# NutriTrack

A mobile-first personal nutrition and fitness companion built around Indian home food. It estimates your nutritional needs, tracks meals, water and activity, explains your day in plain language, suggests affordable Indian foods and workouts, and adapts every rule to your age group.

> All numbers are estimates for general wellness. NutriTrack is not a medical device and does not replace a doctor or registered dietitian.

## Features

| Area | What works |
|---|---|
| **Onboarding** | 7-step flow: name, age, gender, height (cm or ft/in), weight, life stage, activity level, goals, diet, cuisines, allergies, sports, equipment, time, fitness level, limitations. Detects under-13 and 13–17 and adapts immediately. |
| **Calculation engine** | Adults: Mifflin-St Jeor BMR × activity multiplier, gradual weight management with guard-rails. Under-18s: IOM (2005) EER equations with growth allowance, no deficits. Protein, carbs, fat, fibre and water ranges. Extra fuel and water on active days. |
| **Food log** | 275 Indian foods (including 69 chicken, mutton, fish, seafood, beef, pork and egg dishes, Indo-Chinese, rolls and momos, and regional favourites) with realistic portions (1 medium roti, 1 bowl dal, 1 cup cooked rice, 100 g paneer, 1 glass milk…), search with aliases and typo tolerance, quantity, custom grams, oil/ghee level, manual value override, several items per meal, custom foods, edit, delete with undo, day navigation and weekly history. |
| **Analysis** | Totals, meals logged, macro split, vegetable/fruit servings, protein sources, fibre, water, a gentle balance indicator and supportive feedback. |
| **Recommendations** | Rule-based, deterministic suggestions from your real entries: protein, vegetables, fruit, fibre, hydration, protein variety, repeated dishes, meal timing, calcium, refuelling after activity. Respects diet, allergies, cuisine and cost. One tap to log a suggestion. |
| **Activity** | No prescribed workouts: you log what you did (25 activity types, duration, intensity, optional distance or steps). The app works out pace, MET-based energy used (adults only), extra food and water for the day, weekly guideline minutes, strength days and insights from your logs. Session stopwatch/timer. |
| **Dashboard** | Nutrition overview, suggestions, protein, water, today's logged activity, recent meals, weekly trends, daily check-in. |
| **Progress** | Meal consistency, protein, vegetables & fruit, energy (adults only), active minutes, workouts per week, water, energy level, sleep, habit tracker, optional weight. 7 or 30 days. |
| **Coach** | Built-in assistant that answers meal, protein, breakfast, workout, analysis, pantry ("I have rice, dal and onion"), hydration, sleep, weight and food-info questions using your profile and logs. Optional Claude mode with your own API key. |
| **Account & data** | Local accounts with encrypted storage, change password, export/import backup, delete account. |

## Age-specific safety rules

All rules live in one table, [`src/engine/safety/policy.ts`](src/engine/safety/policy.ts), read by every engine.

| | Under 13 | 13–17 | 18–64 | 65+ |
|---|---|---|---|---|
| Energy method | IOM child EER | IOM adolescent EER | Mifflin-St Jeor | Mifflin-St Jeor |
| Calorie deficit | Never | Never | Gradual, capped | Gentle pace only |
| Energy shown as | Hidden (food groups) | Typical-needs range, "not a limit" | Estimate with progress | Estimate with progress |
| "Above your usual range" message | Never | Never (neutral "well fuelled") | Yes, supportive wording | Yes |
| Exercise calorie estimates | Never | Never | Informational only | Informational only |
| Weight tracking | Unavailable | Optional, off by default | Optional | Optional |
| Activity guideline | 60 min/day avg, strength + bone 3 days | same | 150–300 min/week, strength 2 days | + balance 3 days |

Adult weight-management guard-rails: −250 or −500 kcal/day, never more than 20% of maintenance, never below 1,200 (female) / 1,500 (male) kcal or BMR, no deficit when BMI < 18.5 or during pregnancy/breastfeeding.

Language guard-rails: [`src/engine/safety/language.ts`](src/engine/safety/language.ts) lists phrases the app must never show ("failed", "burn off", "skip dinner", "starve", "compensate", and for minors "deficit", "calories left", "lose weight" and more). Tests push thousands of generated days, activity insights and coach replies through it.

The coach routes crisis, disordered-eating, compensation, extreme-diet, medical and supplement questions to fixed supportive replies (with Tele-MANAS 14416 where relevant) and never sends them to an LLM.

## Tech stack

React 18 · TypeScript · Tailwind CSS · React Router 7 · Recharts · Zod · Web Crypto · Vite · Vitest · Playwright · PGlite (schema tests). Fonts: Fraunces and Plus Jakarta Sans (self-hosted).

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # type-check and production build into dist/
npm run preview      # serve the build on http://localhost:4173
```

Testing:

```bash
npm test             # 90 unit/integration tests (engines, safety, auth, storage, Supabase schema)
npm run test:e2e     # builds, starts preview, runs 24 Playwright steps on phone, tablet and desktop
```

The e2e run signs up an adult and a teen, completes onboarding, logs/edits/deletes food, uses the multi-item tray, custom foods, water, check-in, activity logging with distance/steps and pace-based calculations, asks the coach, checks charts, edits the profile, verifies persistence, checks localStorage holds no plain-text data, and asserts there is no horizontal scrolling at 390 px, 768 px and 1280 px. Screenshots go to `e2e/screenshots/` (git-ignored).

## Android app (APK)

The Android app wraps the same web build with [Capacitor](https://capacitorjs.com) 8. Requirements: JDK 21 and the Android SDK (platform 36, build-tools 36.0.0) with `ANDROID_HOME` set or `android/local.properties` pointing at it.

```bash
npm run android:apk   # builds the web app, syncs it into android/, runs Gradle
# → android/app/build/outputs/apk/debug/app-debug.apk
npm run android:assets  # regenerate launcher icons and splash from the logo
```

In the app, data is stored on the phone (same encryption as the web app), backups are shared through Android's share sheet, and the layout clears the status and gesture bars. The debug APK is signed with a local debug key, so a later build from a different machine installs only after uninstalling the old one; export a backup first.

## Project structure

```
src/
  engine/            pure, framework-free logic (fully unit tested)
    nutrition/       equations.ts (formulas), targets.ts (needs + guard-rails), foodMath.ts
    safety/          policy.ts (age rules), language.ts (banned phrases)
    analysis/        daily nutrition analysis and feedback
    recommendations/ food recommendation engine
    activity/        activity types and MET values, pace/steps calculations, weekly tracking, insights
    assistant/       intent detection, safety routing, replies
  data/              Indian food database, search, meal combos, pantry recipes
  lib/auth/          PBKDF2 + AES-GCM local accounts, React auth context
  lib/store/         Zod schemas and the UserStore repository
  lib/claudeCoach.ts optional Claude integration (lazy-loaded)
  features/          onboarding, dashboard, log, activity, progress, assistant, profile
  components/        app shell, UI primitives, charts
supabase/            migration + generated food seed for a future Supabase backend
tests/               Vitest suites
e2e/                 Playwright end-to-end runner
```

To change a formula, edit `src/engine/nutrition/equations.ts`; to change a safety rule, edit `src/engine/safety/policy.ts`. The tests will tell you if a change breaks an age rule.

## Data, accounts and privacy

Data is stored in the browser, per account, encrypted:

- Passwords are never stored. PBKDF2-SHA256 (310,000 iterations, random salt) derives 512 bits: half verifies the password, half is the AES-256-GCM key for that user's data.
- Each user's data is encrypted separately, so people sharing a device cannot read each other's logs.
- Five wrong passwords lock sign-in for 30 seconds.
- The session key lives in `sessionStorage` (cleared when the tab closes). "Keep me signed in" stores it in `localStorage`, which is convenient but means anyone with that device profile can open the account.
- A forgotten password cannot be recovered, because the password is the encryption key. Use **Profile → Export backup** regularly (backups are plain JSON; the Claude API key is never included).
- Data does not sync between devices.

## AI coach

- **Built-in (default):** runs entirely on the device, deterministic, uses your profile, today's log, the last 7 days and the activity you logged.
- **Claude (optional):** in **Profile → AI coach**, choose Claude and paste your own Anthropic API key. Questions are answered by `claude-opus-5-5` (streamed, with server-side refusal fallback) using a compact summary of your profile and logs (no name or email). The key is stored encrypted with your data. Safety-sensitive questions always use the built-in coach, and Claude replies are checked by the same language filter; anything that fails falls back to the built-in answer.

## Supabase (prepared, not connected)

Persistence is local because the Supabase organisation is at the free plan's two-project limit. The backend is ready for when a project is available:

- [`supabase/migrations/20261125000000_init.sql`](supabase/migrations/20261125000000_init.sql): profiles, user preferences, foods (shared + per-user custom), daily logs, meal entries, exercise logs, water logs, habit and weight logs, daily recommendations and weekly progress, all with owner-only row level security. A database constraint also blocks weight targets for under-18 profiles.
- [`supabase/seed.sql`](supabase/seed.sql): the food database, generated with `npm run seed:sql`.
- `tests/schema.test.ts` applies both to Postgres (PGlite) and checks constraints and cross-user isolation.

Connecting it means adding a Supabase persistence adapter that maps `UserStore` writes to these tables and swapping local accounts for Supabase Auth. That adapter is not written yet.

## Sources

- Mifflin MD, St Jeor ST et al. *Am J Clin Nutr* 1990;51:241–7.
- Institute of Medicine. *Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids* (2005): EER equations, AMDRs, fibre and water AIs.
- ICMR-NIN. *Nutrient Requirements for Indians* (2020) and *Dietary Guidelines for Indians* (2024): protein 0.83 g/kg, food-group guidance.
- WHO. *Guidelines on physical activity and sedentary behaviour* (2020).
- Misra A et al. Consensus statement for Asian Indians, *JAPI* 2009 (BMI cut-offs).
- Ainsworth BE et al. *Compendium of Physical Activities* (2011).
- Food values compiled from IFCT 2017 (NIN), USDA FoodData Central and common home-recipe analyses; homemade dishes vary.
