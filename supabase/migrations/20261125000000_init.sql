-- NutriTrack schema for Supabase (Postgres 15+).
-- Mirrors the app's local data model. Every user-owned table has row level
-- security so each user can read and write only their own rows.
-- "Users" are Supabase's auth.users; everything else lives in public.

-- ---------------------------------------------------------------- enums
create type public.sex as enum ('male', 'female', 'unspecified');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'very', 'extreme');
create type public.diet_type as enum ('vegetarian', 'eggetarian', 'non_vegetarian', 'vegan', 'jain');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack', 'beverage');
create type public.intensity as enum ('light', 'moderate', 'vigorous');
create type public.oil_level as enum ('less', 'normal', 'more');
create type public.food_diet as enum ('vegan', 'veg', 'egg', 'nonveg');

-- ---------------------------------------------------------------- helpers
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- user profiles
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text check (char_length(name) <= 40),
  age smallint not null check (age between 8 and 100),
  sex public.sex not null,
  height_cm numeric(5, 1) not null check (height_cm between 100 and 230),
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 250),
  activity_level public.activity_level not null,
  goals text[] not null check (cardinality(goals) >= 1 and goals <@ array['fitness', 'maintain', 'strength', 'endurance', 'habits', 'weight']),
  -- Weight direction/pace are only meaningful for adults; the check enforces it in the database too.
  weight_direction text check (weight_direction in ('lose', 'gain', 'maintain')),
  weight_pace text check (weight_pace in ('gentle', 'steady')),
  diet_type public.diet_type not null,
  allergies text[] not null default '{}',
  cuisines text[] not null default '{}',
  sports text[] not null default '{}',
  equipment text[] not null default '{none}',
  minutes_per_day smallint not null default 30 check (minutes_per_day between 10 and 180),
  fitness_level text not null default 'beginner' check (fitness_level in ('beginner', 'intermediate', 'advanced')),
  limitations text check (char_length(limitations) <= 200),
  life_stage text not null default 'none' check (life_stage in ('none', 'pregnant', 'breastfeeding')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint minors_have_no_weight_targets check (age >= 18 or (weight_direction is null and weight_pace is null))
);
create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- user preferences
create table public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  track_sleep boolean not null default true,
  track_weight boolean not null default false,
  glass_ml smallint not null default 250 check (glass_ml between 100 and 1000),
  habits jsonb not null default '[]'::jsonb,
  ai_mode text not null default 'local' check (ai_mode in ('local', 'claude')),
  updated_at timestamptz not null default now()
);
create trigger user_preferences_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- food database
-- owner_id is null for the shared Indian food database and set for a user's own foods.
create table public.foods (
  id text primary key,
  owner_id uuid references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  aliases text[] not null default '{}',
  category text not null,
  diet public.food_diet not null,
  root_veg boolean not null default false,
  allergens text[] not null default '{}',
  food_groups text[] not null default '{}',
  veg_fraction numeric(4, 2) not null default 0 check (veg_fraction between 0 and 1),
  fruit_fraction numeric(4, 2) not null default 0 check (fruit_fraction between 0 and 1),
  kcal_per_100 numeric(6, 1) not null check (kcal_per_100 >= 0),
  protein_per_100 numeric(5, 1) not null check (protein_per_100 >= 0),
  carbs_per_100 numeric(5, 1) not null check (carbs_per_100 >= 0),
  fat_per_100 numeric(5, 1) not null check (fat_per_100 >= 0),
  fiber_per_100 numeric(5, 1) not null check (fiber_per_100 >= 0),
  portions jsonb not null,
  default_portion_id text not null,
  unit text not null default 'g' check (unit in ('g', 'ml')),
  homemade boolean not null default false,
  oil_adjustable boolean not null default false,
  meals text[] not null default '{}',
  cuisines text[] not null default '{}',
  cost smallint not null default 1 check (cost between 1 and 3),
  created_at timestamptz not null default now()
);
create index foods_owner_idx on public.foods (owner_id);
create index foods_name_idx on public.foods (lower(name));
create index foods_aliases_idx on public.foods using gin (aliases);

-- ---------------------------------------------------------------- daily food logs
-- One row per user per day: the day-level record that meal entries belong to.
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  energy smallint check (energy between 1 and 5),
  fatigue smallint check (fatigue between 1 and 5),
  sleep_hours numeric(3, 1) check (sleep_hours between 0 and 16),
  sleep_quality smallint check (sleep_quality between 1 and 5),
  plan_checks text[] not null default '{}',
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);
create trigger daily_logs_updated_at before update on public.daily_logs for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- meal entries
create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  daily_log_id uuid references public.daily_logs (id) on delete set null,
  log_date date not null,
  meal_type public.meal_type not null,
  food_id text references public.foods (id) on delete set null,
  food_name text not null check (char_length(food_name) between 1 and 80),
  portion_label text not null,
  quantity numeric(5, 2) not null check (quantity > 0 and quantity <= 50),
  grams numeric(7, 1) not null check (grams >= 0),
  kcal numeric(7, 1) not null check (kcal between 0 and 10000),
  protein_g numeric(6, 1) not null check (protein_g between 0 and 500),
  carbs_g numeric(6, 1) not null check (carbs_g between 0 and 1500),
  fat_g numeric(6, 1) not null check (fat_g between 0 and 500),
  fiber_g numeric(6, 1) not null default 0 check (fiber_g between 0 and 200),
  food_groups text[] not null default '{}',
  veg_servings numeric(4, 1) not null default 0,
  fruit_servings numeric(4, 1) not null default 0,
  oil_level public.oil_level,
  edited boolean not null default false,
  logged_at timestamptz not null default now()
);
create index meal_entries_user_date_idx on public.meal_entries (user_id, log_date);

-- ---------------------------------------------------------------- exercise logs
create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  activity text not null,
  minutes smallint not null check (minutes between 1 and 600),
  intensity public.intensity not null,
  strength boolean not null default false,
  bone_loading boolean not null default false,
  notes text check (char_length(notes) <= 200),
  logged_at timestamptz not null default now()
);
create index exercise_logs_user_date_idx on public.exercise_logs (user_id, log_date);

-- ---------------------------------------------------------------- water logs
create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  ml smallint not null check (ml between 1 and 5000),
  logged_at timestamptz not null default now()
);
create index water_logs_user_date_idx on public.water_logs (user_id, log_date);

-- ---------------------------------------------------------------- optional tracking
create table public.habit_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  habit_id text not null,
  primary key (user_id, log_date, habit_id)
);

create table public.weight_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  weight_kg numeric(5, 1) not null check (weight_kg between 20 and 250),
  primary key (user_id, log_date)
);

-- ---------------------------------------------------------------- daily recommendations
create table public.daily_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rec_date date not null,
  rec_key text not null,
  kind text not null,
  title text not null,
  message text not null,
  reason text,
  suggested_food_id text references public.foods (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'done', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (user_id, rec_date, rec_key)
);

-- ---------------------------------------------------------------- weekly progress
create table public.weekly_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  days_logged smallint not null default 0,
  avg_meals_per_day numeric(3, 1) not null default 0,
  avg_protein_g numeric(5, 1) not null default 0,
  avg_veg_servings numeric(4, 1) not null default 0,
  active_minutes integer not null default 0,
  workouts smallint not null default 0,
  avg_water_ml integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.foods enable row level security;
alter table public.daily_logs enable row level security;
alter table public.meal_entries enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.water_logs enable row level security;
alter table public.habit_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.daily_recommendations enable row level security;
alter table public.weekly_progress enable row level security;

-- Owner-only policies for every user table. (select auth.uid()) is evaluated once per statement.
do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'user_preferences', 'daily_logs', 'meal_entries', 'exercise_logs', 'water_logs', 'habit_logs', 'weight_logs', 'daily_recommendations', 'weekly_progress']
  loop
    execute format('create policy "%1$s_select_own" on public.%1$I for select to authenticated using ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_insert_own" on public.%1$I for insert to authenticated with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_update_own" on public.%1$I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('create policy "%1$s_delete_own" on public.%1$I for delete to authenticated using ((select auth.uid()) = user_id)', t);
  end loop;
end;
$$;

-- Shared foods are readable by every signed-in user; custom foods only by their owner.
create policy foods_select on public.foods for select to authenticated using (owner_id is null or owner_id = (select auth.uid()));
create policy foods_insert_own on public.foods for insert to authenticated with check (owner_id = (select auth.uid()));
create policy foods_update_own on public.foods for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy foods_delete_own on public.foods for delete to authenticated using (owner_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
