// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { FOODS } from '@/data/foods';
import { foodSeedSql } from '../scripts/generate-food-seed';

/**
 * Applies the Supabase migration and food seed to a real Postgres engine
 * (PGlite, Postgres compiled to WASM) with a minimal stand-in for Supabase's
 * auth schema, then checks constraints and row level security.
 */

const A = '00000000-0000-4000-8000-00000000000a';
const B = '00000000-0000-4000-8000-00000000000b';

let db: PGlite;

async function as(user: string | null, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false);`);
  if (user) await db.exec('set role authenticated;');
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role;');
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role authenticated nologin;
    create role anon nologin;
    grant usage on schema auth to authenticated;
    grant execute on function auth.uid() to authenticated;
  `);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261125000000_init.sql', import.meta.url), 'utf8'));
  await db.exec(foodSeedSql());
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}');`);
}, 60_000);

const profile = (user: string, age: number, extra = '') => `
  insert into public.profiles (user_id, age, sex, height_cm, weight_kg, activity_level, goals, diet_type${extra ? ', weight_direction, weight_pace' : ''})
  values ('${user}', ${age}, 'female', 160, 55, 'moderate', array['fitness'], 'vegetarian'${extra})`;

describe('Supabase schema', () => {
  it('seeds the full food database', async () => {
    const r = await as(A, 'select count(*)::int as n from public.foods');
    expect((r.rows[0] as { n: number }).n).toBe(FOODS.length);
  });

  it('lets users write and read only their own rows', async () => {
    await as(A, profile(A, 30));
    await as(A, `insert into public.meal_entries (user_id, log_date, meal_type, food_id, food_name, portion_label, quantity, grams, kcal, protein_g, carbs_g, fat_g)
                 values ($1, '2026-11-25', 'lunch', 'dal-tadka', 'Dal', '1 bowl dal', 1, 160, 158, 8.8, 20.8, 4.5)`, [A]);
    expect((await as(A, 'select * from public.meal_entries')).rows).toHaveLength(1);
    expect((await as(B, 'select * from public.meal_entries')).rows).toHaveLength(0);
    expect((await as(B, 'select * from public.profiles')).rows).toHaveLength(0);
    // B cannot write rows for A, or change A's rows.
    await expect(as(B, `insert into public.water_logs (user_id, log_date, ml) values ($1, '2026-11-25', 250)`, [A])).rejects.toThrow(/row-level security/);
    const upd = await as(B, `update public.meal_entries set kcal = 1 where user_id = $1`, [A]);
    expect(upd.affectedRows).toBe(0);
    // Anonymous (no role) access as authenticated without a user id sees nothing.
    await db.exec(`select set_config('request.jwt.claim.sub', '', false); set role authenticated;`);
    expect((await db.query('select * from public.meal_entries')).rows).toHaveLength(0);
    await db.exec('reset role;');
  });

  it('keeps custom foods private to their owner', async () => {
    await as(B, `insert into public.foods (id, owner_id, name, category, diet, kcal_per_100, protein_per_100, carbs_per_100, fat_per_100, fiber_per_100, portions, default_portion_id)
                 values ('custom-b1', $1, 'Mom''s ladoo', 'extras', 'veg', 400, 8, 50, 18, 3, '[{"id":"serving","label":"1 ladoo","grams":35}]', 'serving')`, [B]);
    expect((await as(B, `select id from public.foods where id = 'custom-b1'`)).rows).toHaveLength(1);
    expect((await as(A, `select id from public.foods where id = 'custom-b1'`)).rows).toHaveLength(0);
    await expect(as(A, `update public.foods set name = 'x' where id = 'roti'`).then((r) => r.affectedRows)).resolves.toBe(0);
  });

  it('enforces the minors safety rule in the database', async () => {
    await expect(as(B, profile(B, 15, `, 'lose', 'steady'`))).rejects.toThrow(/minors_have_no_weight_targets/);
    await as(B, profile(B, 15));
  });

  it('validates values and week starts', async () => {
    await expect(as(A, `insert into public.exercise_logs (user_id, log_date, activity, minutes, intensity) values ($1, '2026-11-25', 'walking', 0, 'light')`, [A])).rejects.toThrow(/check constraint/);
    await expect(as(A, `insert into public.weekly_progress (user_id, week_start) values ($1, '2026-11-25')`, [A])).rejects.toThrow(/check constraint/);
    await as(A, `insert into public.weekly_progress (user_id, week_start) values ($1, '2026-11-23')`, [A]);
    await expect(as(A, profile(A, 5).replace(`'${A}'`, `'${A}'`))).rejects.toThrow();
  });
});
