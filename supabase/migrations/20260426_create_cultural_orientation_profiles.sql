create extension if not exists pgcrypto;

create table if not exists public.cultural_orientation_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  origin_country text,
  destination_country text,
  language_level text check (
    language_level is null or language_level in ('none', 'basic', 'intermediate', 'advanced', 'fluent')
  ),
  priority_topics text[],
  preferred_learning_style text check (
    preferred_learning_style is null or preferred_learning_style in (
      'quick_rules', 'step_by_step', 'real_life_examples', 'scenario_practice', 'checklists'
    )
  ),
  wants_help_with text[],
  avoid_topics text[],
  saved_generation_job_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cultural_orientation_profiles_user_id_idx
  on public.cultural_orientation_profiles (user_id);

create or replace function public.set_cultural_orientation_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cultural_orientation_profiles_updated_at
  on public.cultural_orientation_profiles;

create trigger set_cultural_orientation_profiles_updated_at
before update on public.cultural_orientation_profiles
for each row
execute function public.set_cultural_orientation_profiles_updated_at();

alter table public.cultural_orientation_profiles enable row level security;

drop policy if exists "demo read profiles" on public.cultural_orientation_profiles;
create policy "demo read profiles"
  on public.cultural_orientation_profiles
  for select
  using (true);

drop policy if exists "demo insert profiles" on public.cultural_orientation_profiles;
create policy "demo insert profiles"
  on public.cultural_orientation_profiles
  for insert
  with check (true);

drop policy if exists "demo update profiles" on public.cultural_orientation_profiles;
create policy "demo update profiles"
  on public.cultural_orientation_profiles
  for update
  using (true)
  with check (true);
