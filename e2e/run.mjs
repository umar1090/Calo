/**
 * End-to-end checks for NutriTrack, driven by Playwright against a running
 * build (default http://localhost:4173, start it with `npm run build && npm run preview`).
 *
 *   node e2e/run.mjs                 # run all flows
 *   BASE_URL=http://localhost:5173 node e2e/run.mjs
 *
 * Screenshots are written to e2e/screenshots/ for visual review.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const BASE = process.env.BASE_URL ?? 'http://localhost:4173';

// Start `vite preview` on the built app unless a server is already answering.
let server = null;
async function reachable() {
  try {
    return (await fetch(`${BASE}/welcome`)).ok;
  } catch {
    return false;
  }
}
if (!(await reachable())) {
  if (process.env.BASE_URL) throw new Error(`Nothing is serving ${BASE}`);
  server = spawn(process.execPath, [new URL('../node_modules/vite/bin/vite.js', import.meta.url).pathname, 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
  for (let i = 0; i < 50 && !(await reachable()); i++) await new Promise((r) => setTimeout(r, 200));
  if (!(await reachable())) throw new Error('vite preview did not start. Run `npm run build` first.');
}
const SHOTS = new URL('./screenshots/', import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e });
    console.log(`  ✗ ${name}\n    ${e.message.split('\n').slice(0, 6).join('\n    ')}`);
    throw e;
  }
}

async function noHorizontalScroll(page, label) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert.ok(sw <= cw + 1, `${label}: page scrolls horizontally (${sw} > ${cw})`);
}

async function shot(page, name) {
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SHOTS}${name}.png`, fullPage: true });
}

async function signUp(page, email) {
  await page.goto(`${BASE}/`);
  await page.waitForURL(/\/welcome/);
  await page.getByRole('radio', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('mangoes2026');
  await page.getByRole('button', { name: 'Create account' }).last().click();
  await page.waitForURL(/\/onboarding/);
}

async function onboard(page, p) {
  await page.getByLabel('Name (optional)').fill(p.name);
  await page.getByLabel('Age').fill(String(p.age));
  await page.getByRole('button', { name: p.sex, exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.locator('#height').fill(String(p.height));
  await page.getByLabel('Weight (kg)').fill(String(p.weight));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: /Moderately active/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const g of p.goals) await page.getByRole('button', { name: new RegExp(g) }).click();
  if (p.afterGoals) await p.afterGoals(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: new RegExp(`^${p.diet}`) }).click();
  await page.getByRole('button', { name: p.cuisine }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  for (const s of p.sports ?? []) await page.getByRole('button', { name: s, exact: true }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
}

const browser = await chromium.launch();
const consoleErrors = [];

try {
  // ---------------------------------------------------------------- adult, phone
  console.log('Adult flow (phone 390×844)');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, timezoneId: 'Asia/Kolkata', locale: 'en-IN' });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(e.message));

  await step('welcome screen renders without overflow', async () => {
    await page.goto(`${BASE}/`);
    await page.waitForURL(/\/welcome/);
    await noHorizontalScroll(page, 'welcome');
    await shot(page, '01-welcome-phone');
  });

  await step('sign-up validates input', async () => {
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).last().click();
    await page.getByText('Enter a valid email address').waitFor();
    await page.getByText('Use at least 8 characters').waitFor();
  });

  await step('create account', () => signUp(page, 'asha@example.com'));

  await step('onboarding validates each step', async () => {
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText('Enter your age in years').waitFor();
  });

  await step('onboarding (adult, weight goal) shows estimates', async () => {
    await onboard(page, {
      name: 'Asha Rao',
      age: 30,
      sex: 'Female',
      height: 162,
      weight: 60,
      goals: ['Improve fitness', 'Weight management'],
      afterGoals: async (p) => {
        await p.getByRole('button', { name: 'Lose gradually' }).click();
        await p.getByRole('button', { name: /Gentle/ }).click();
      },
      diet: 'Vegetarian',
      cuisine: 'South Indian',
      sports: ['Yoga'],
    });
    await page.getByText('Estimated maintenance').waitFor();
    await page.getByText('Your daily estimate').waitFor();
    await page.getByText(/Mifflin-St Jeor/).waitFor();
    await noHorizontalScroll(page, 'onboarding summary');
    await shot(page, '02-onboarding-summary-adult');
    await page.getByRole('button', { name: 'Start tracking' }).click();
    await page.getByRole('heading', { name: /Good (morning|afternoon|evening), Asha/ }).waitFor();
  });

  await step('daily check-in', async () => {
    await page.getByRole('radio', { name: 'Good' }).click();
    await page.getByLabel('Hours slept last night').fill('7.5');
    await page.getByRole('button', { name: 'Save check-in' }).click();
    await page.getByText('Thanks for checking in').waitFor();
  });

  await step('log a food from the dashboard (search, portion, quantity, oil)', async () => {
    await page.getByRole('button', { name: 'Log food' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Lunch' }).click();
    await dialog.getByLabel('Search foods').fill('dal');
    await dialog.getByRole('button', { name: /^Dal \(toor/ }).click();
    await dialog.getByText('Estimates for homemade Indian food may vary').waitFor();
    await dialog.getByRole('button', { name: '1 bowl dal' }).waitFor();
    await dialog.getByRole('button', { name: 'Increase quantity' }).click();
    await dialog.getByRole('radio', { name: 'More' }).click();
    await shot(page, '03-add-food-detail');
    await dialog.getByRole('button', { name: 'Log food' }).click();
    await page.getByText('Added to Lunch').waitFor();
  });

  await step('add multiple items to one meal', async () => {
    await page.goto(`${BASE}/log`);
    await page.getByRole('button', { name: 'Add food to Lunch' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Search foods').fill('roti');
    await dialog.getByRole('button', { name: /^Roti \/ Phulka/ }).click();
    await dialog.getByRole('button', { name: 'Increase quantity' }).click();
    await dialog.getByRole('button', { name: 'Add & pick more' }).click();
    await dialog.getByLabel('Search foods').fill('bhindi');
    await dialog.getByRole('button', { name: /^Bhindi/ }).click();
    await dialog.getByRole('button', { name: 'Log 2 items' }).click();
    await page.getByText('Added 2 items to Lunch').waitFor();
    const lunch = page.locator('section[aria-labelledby="meal-lunch"]');
    await lunch.getByText('Roti / Phulka (whole wheat)').waitFor();
    await lunch.getByText('Bhindi (okra) sabzi').waitFor();
    await lunch.getByText('Dal (toor / arhar, tadka)').waitFor();
  });

  await step('edit an entry (portion + manual values)', async () => {
    await page.getByRole('button', { name: 'Edit Roti / Phulka (whole wheat)' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: '1 large roti' }).click();
    await dialog.getByLabel('Edit values').check();
    await dialog.getByLabel('Calories').fill('333');
    await dialog.getByRole('button', { name: 'Save changes' }).click();
    await page.getByText('Entry updated').waitFor();
    const row = page.locator('li', { hasText: 'Roti / Phulka (whole wheat)' });
    await row.getByText('333 kcal').waitFor();
    await row.getByText('(edited)').waitFor();
  });

  await step('delete an entry and undo', async () => {
    await page.getByRole('button', { name: 'Delete Bhindi (okra) sabzi' }).click();
    await page.getByText('Removed Bhindi (okra) sabzi').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Edit Bhindi (okra) sabzi' }).count(), 0);
    await page.getByRole('button', { name: 'Undo' }).click();
    await page.getByRole('button', { name: 'Edit Bhindi (okra) sabzi' }).waitFor();
    await page.getByRole('button', { name: 'Delete Bhindi (okra) sabzi' }).click();
    await page.waitForTimeout(300);
    assert.equal(await page.getByRole('button', { name: 'Edit Bhindi (okra) sabzi' }).count(), 0);
  });

  await step('add a custom food manually', async () => {
    await page.getByRole('button', { name: 'Add food to Snacks' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Add food manually' }).click();
    await dialog.getByLabel('Food name').fill("Amma's ragi ladoo");
    await dialog.getByLabel('Portion name').fill('1 ladoo');
    await dialog.getByLabel('Portion size (g)').fill('35');
    await dialog.getByLabel('Calories').fill('150');
    await dialog.getByLabel('Protein (g)').fill('3');
    await dialog.getByRole('button', { name: 'Save food' }).click();
    await dialog.getByRole('button', { name: 'Log food' }).click();
    await page.locator('section[aria-labelledby="meal-snack"]').getByText("Amma's ragi ladoo").waitFor();
  });

  await step('water tracking', async () => {
    await page.getByRole('button', { name: 'Add a glass of water' }).click();
    await page.getByRole('button', { name: 'Add a glass of water' }).click();
    await page.getByText(/^2 of \d+ glasses/).waitFor();
    await page.getByRole('button', { name: 'Remove a glass of water' }).click();
    await page.getByText(/^1 of \d+ glasses/).waitFor();
    await noHorizontalScroll(page, 'log');
    await shot(page, '04-log-phone');
  });

  await step('weekly food history', async () => {
    await page.getByRole('radio', { name: 'Week history' }).click();
    await page.getByText(/meals? · .*kcal · .*g protein/).first().waitFor();
    await noHorizontalScroll(page, 'week history');
  });

  await step('dashboard reflects the log, with data-based suggestions', async () => {
    await page.goto(`${BASE}/`);
    await page.getByText(/items? logged/).waitFor();
    await page.getByRole('heading', { name: 'Suggestions' }).waitFor();
    const text = await page.locator('main').innerText();
    for (const bad of [/you failed/i, /burn off/i, /skip dinner/i, /starve/i, /compensate/i]) assert.ok(!bad.test(text), `dashboard contains ${bad}`);
    await noHorizontalScroll(page, 'dashboard');
    await shot(page, '05-dashboard-phone');
  });

  await step('activity plan, checklist, timer and logging', async () => {
    await page.goto(`${BASE}/move`);
    await page.getByRole('list', { name: 'Exercise checklist' }).waitFor();
    await page.getByRole('button', { name: /Mark Warm-up done/ }).click();
    await page.getByRole('button', { name: /Mark Warm-up not done/ }).waitFor();
    await page.getByRole('button', { name: 'Start' }).click();
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: 'Pause' }).click();
    await page.getByRole('button', { name: 'Log activity' }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Football' }).click();
    await dialog.getByRole('button', { name: 'Increase minutes' }).click();
    await dialog.getByRole('button', { name: 'Log activity' }).click();
    await page.getByText('Activity logged. Nice work!').waitFor();
    await page.getByRole('button', { name: 'Edit Football' }).waitFor();
    await page.getByText(/kcal est\./).first().waitFor(); // adults see informational estimates
    await noHorizontalScroll(page, 'move');
    await shot(page, '06-move-phone');
  });

  await step('coach answers using the log and can log a suggested meal', async () => {
    await page.goto(`${BASE}/coach`);
    await page.getByRole('button', { name: 'What should I eat for dinner?' }).click();
    await page.getByText(/dinner ideas/).waitFor();
    const before = await page.getByRole('button', { name: /^Log to Dinner/ }).count();
    assert.ok(before > 0, 'expected combo log buttons');
    await page.getByRole('button', { name: /^Log to Dinner/ }).first().click();
    await page.getByText(/^Logged .* to Dinner/).waitFor();
    await page.getByLabel('Ask the coach').fill('I have rice, moong dal, onion and tomato at home');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(/you could make/).waitFor();
    await page.getByLabel('Ask the coach').fill('give me a diet for diabetes');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByText(/can't diagnose conditions or suggest a diet for a medical condition/).waitFor();
    await noHorizontalScroll(page, 'coach');
    await shot(page, '07-coach-phone');
  });

  await step('progress charts render', async () => {
    await page.goto(`${BASE}/progress`);
    await page.getByRole('heading', { name: 'Protein per day' }).waitFor();
    await page.locator('.recharts-surface').first().waitFor();
    await page.getByRole('radio', { name: '30 days' }).click();
    await page.getByRole('table').filter({ hasText: 'Habit' }).waitFor();
    await noHorizontalScroll(page, 'progress');
    await shot(page, '08-progress-phone');
  });

  await step('edit profile recalculates estimates', async () => {
    await page.goto(`${BASE}/profile`);
    const before = await page.getByText(/kcal/).first().innerText();
    await page.getByRole('button', { name: 'Edit' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Body' }).click();
    await dialog.getByLabel('Weight (kg)').fill('64');
    await dialog.getByRole('button', { name: 'Save profile' }).click();
    await page.getByText('Profile updated').waitFor();
    await page.getByText('60 kg').waitFor({ state: 'detached' });
    await page.getByText('64 kg').waitFor();
    const after = await page.getByText(/kcal/).first().innerText();
    assert.notEqual(before, after);
    await noHorizontalScroll(page, 'profile');
    await shot(page, '09-profile-phone');
  });

  await step('data persists across reload (session) and sign-out/sign-in', async () => {
    await page.reload();
    await page.getByText('64 kg').waitFor();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/\/welcome/);
    await page.getByLabel('Email').fill('asha@example.com');
    await page.getByLabel('Password', { exact: true }).fill('wrongpass1');
    await page.getByRole('button', { name: 'Sign in' }).last().click();
    await page.getByText('That password does not match.').waitFor();
    await page.getByLabel('Password', { exact: true }).fill('mangoes2026');
    await page.getByRole('button', { name: 'Sign in' }).last().click();
    await page.getByRole('heading', { name: /Asha/ }).waitFor();
    await page.goto(`${BASE}/log`);
    await page.getByText('Dal (toor / arhar, tadka)').waitFor();
  });

  await step('stored data is encrypted', async () => {
    const raw = await page.evaluate(() => Object.entries(localStorage).map(([k, v]) => `${k}=${v}`).join('\n'));
    assert.ok(!raw.includes('Asha Rao'), 'name found in plain text');
    assert.ok(!raw.includes('Dal (toor'), 'food log found in plain text');
    assert.ok(!raw.includes('mangoes2026'), 'password found in plain text');
  });

  // ---------------------------------------------------------------- desktop layout
  console.log('Desktop layout (1280×800)');
  await step('desktop pages render without overflow', async () => {
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const [path, name] of [['/', 'dashboard'], ['/log', 'log'], ['/move', 'move'], ['/progress', 'progress'], ['/coach', 'coach'], ['/profile', 'profile']]) {
      await page.goto(`${BASE}${path}`);
      await page.locator('main h1').first().waitFor();
      await noHorizontalScroll(page, `desktop ${name}`);
      await shot(page, `10-desktop-${name}`);
    }
  });

  await step('tablet layout without overflow', async () => {
    await page.setViewportSize({ width: 768, height: 1024 });
    for (const path of ['/', '/log', '/move', '/progress']) {
      await page.goto(`${BASE}${path}`);
      await page.locator('main h1').first().waitFor();
      await noHorizontalScroll(page, `tablet ${path}`);
    }
    await shot(page, '11-tablet-progress');
  });
  await ctx.close();

  // ---------------------------------------------------------------- teen safety
  console.log('Teen flow (phone)');
  const tctx = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Kolkata' });
  const teen = await tctx.newPage();
  teen.on('pageerror', (e) => consoleErrors.push(e.message));
  await step('teen onboarding never creates a calorie deficit', async () => {
    await signUp(teen, 'kabir@example.com');
    await teen.getByLabel('Age').fill('15');
    await teen.getByText(/never set calorie-cutting or weight-loss targets for under-18s/).waitFor();
    await teen.getByLabel('Age').fill('');
    await onboard(teen, {
      name: 'Kabir',
      age: 15,
      sex: 'Male',
      height: 170,
      weight: 60,
      goals: ['Weight management', 'Improve fitness'],
      afterGoals: async (p) => {
        await p.getByText(/won't set weight-loss or calorie targets/).waitFor();
        assert.equal(await p.getByRole('button', { name: 'Lose gradually' }).count(), 0);
      },
      diet: 'Eggetarian',
      cuisine: 'North Indian',
      sports: ['Football'],
    });
    await teen.getByText('Typical energy needs').waitFor();
    await teen.getByText(/IOM \(2005\) adolescent/).waitFor();
    assert.equal(await teen.getByText('Your daily estimate').count(), 0);
    assert.equal(await teen.getByText('Resting energy (BMR)').count(), 0);
    await shot(teen, '12-onboarding-summary-teen');
    await teen.getByRole('button', { name: 'Start tracking' }).click();
    await teen.getByRole('heading', { name: /Kabir/ }).waitFor();
  });

  await step('teen dashboard and coach stay supportive', async () => {
    await teen.getByRole('button', { name: 'Save check-in' }).click();
    for (let i = 0; i < 3; i++) {
      await teen.getByRole('button', { name: 'Log food' }).first().click();
      const d = teen.getByRole('dialog');
      await d.getByLabel('Search foods').fill('chicken biryani');
      await d.getByRole('button', { name: /^Chicken biryani/ }).first().click();
      await d.getByLabel('Search foods').count(); // noop
      for (let q = 0; q < 6; q++) await d.getByRole('button', { name: 'Increase quantity' }).click();
      await d.getByRole('button', { name: 'Log food' }).click();
      await teen.getByText(/Added to/).first().waitFor();
    }
    const text = await teen.locator('main').innerText();
    for (const bad of [/deficit/i, /calories left/i, /remaining calories/i, /above your usual range/i, /lose weight/i, /burn off/i, /kcal est/i, /excessive/i]) assert.ok(!bad.test(text), `teen dashboard contains ${bad}`);
    assert.ok(/This is a guide to fuelling well, not a limit/.test(text));
    await shot(teen, '13-dashboard-teen');
    await teen.goto(`${BASE}/coach`);
    await teen.getByLabel('Ask the coach').fill('How do I lose weight fast?');
    await teen.getByRole('button', { name: 'Send' }).click();
    await teen.getByText(/aren't safe while you're still growing/).waitFor();
    await teen.getByLabel('Ask the coach').fill('how do I burn off the biryani I ate');
    await teen.getByRole('button', { name: 'Send' }).click();
    await teen.getByText(/no need to balance food out with exercise/).waitFor();
    await teen.goto(`${BASE}/move`);
    await teen.getByText(/60 minutes of moderate-to-vigorous activity/).waitFor();
    assert.equal(await teen.getByText(/Estimated energy used/).count(), 0);
    await teen.goto(`${BASE}/profile`);
    await teen.getByText(/Off by default for under-18s/).waitFor();
    assert.equal(await teen.getByRole('switch', { name: /Weight tracking/ }).isChecked(), false);
  });
  await tctx.close();
} finally {
  await browser.close();
  server?.kill();
}

const failed = results.filter((r) => !r.ok);
const relevantErrors = consoleErrors.filter((e) => !/favicon|Failed to load resource/.test(e));
if (relevantErrors.length) {
  console.log('\nConsole errors:\n  ' + relevantErrors.join('\n  '));
}
console.log(`\n${results.length - failed.length}/${results.length} e2e steps passed${relevantErrors.length ? `, ${relevantErrors.length} console error(s)` : ''}`);
process.exit(failed.length || relevantErrors.length ? 1 : 0);
