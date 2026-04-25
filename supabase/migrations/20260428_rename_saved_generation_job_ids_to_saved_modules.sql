-- Align with deployments that created the older column name from an earlier migration.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cultural_orientation_profiles'
      and column_name = 'saved_generation_job_ids'
  ) then
    alter table public.cultural_orientation_profiles
      rename column saved_generation_job_ids to saved_modules;
  end if;
end $$;
