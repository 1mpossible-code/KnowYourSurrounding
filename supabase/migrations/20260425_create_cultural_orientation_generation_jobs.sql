create extension if not exists pgcrypto;

create table if not exists public.cultural_orientation_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  highlighted_text text not null,
  context_text text,
  profile_json jsonb,
  status text not null default 'queued' check (status in ('queued', 'generating', 'completed', 'failed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  partial_text text,
  error_message text,
  module_id uuid,
  title text,
  topic text check (
    topic is null or topic in (
      'greetings', 'public_behavior', 'communication', 'personal_space', 'time', 'work', 'school',
      'gender', 'religion', 'dating', 'conflict', 'laws', 'money', 'food', 'clothing', 'digital',
      'safety', 'healthcare', 'government', 'transit'
    )
  ),
  final_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists cultural_orientation_generation_jobs_user_id_idx
  on public.cultural_orientation_generation_jobs (user_id);

create index if not exists cultural_orientation_generation_jobs_updated_at_idx
  on public.cultural_orientation_generation_jobs (updated_at desc);

create or replace function public.set_cultural_orientation_generation_jobs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cultural_orientation_generation_jobs_updated_at
  on public.cultural_orientation_generation_jobs;

create trigger set_cultural_orientation_generation_jobs_updated_at
before update on public.cultural_orientation_generation_jobs
for each row
execute function public.set_cultural_orientation_generation_jobs_updated_at();

alter table public.cultural_orientation_generation_jobs enable row level security;

drop policy if exists "demo read generation jobs" on public.cultural_orientation_generation_jobs;
create policy "demo read generation jobs"
  on public.cultural_orientation_generation_jobs
  for select
  using (true);

drop policy if exists "demo insert generation jobs" on public.cultural_orientation_generation_jobs;
create policy "demo insert generation jobs"
  on public.cultural_orientation_generation_jobs
  for insert
  with check (true);

drop policy if exists "demo update generation jobs" on public.cultural_orientation_generation_jobs;
create policy "demo update generation jobs"
  on public.cultural_orientation_generation_jobs
  for update
  using (true)
  with check (true);
