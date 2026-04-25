-- Daily-life situation slugs for wants_help_with (not cultural topic slugs).
-- Replaces any prior valid_wants_help_with definition so app + DB stay aligned.
-- Equivalent to: wants_help_with <@ ARRAY['using_public_transit'::text, ...] (eleven slugs).

alter table public.cultural_orientation_profiles
  drop constraint if exists valid_wants_help_with;

alter table public.cultural_orientation_profiles
  add constraint valid_wants_help_with check (
    wants_help_with is null
    or not exists (
      select 1
      from unnest(coalesce(wants_help_with, '{}')) as t(v)
      where v not in (
        'using_public_transit',
        'shopping_for_food',
        'going_to_doctor',
        'talking_to_landlord',
        'opening_bank_account',
        'using_libraries',
        'finding_community_events',
        'school_parent_interactions',
        'job_interviews',
        'calling_emergency_services',
        'understanding_local_laws'
      )
    )
  );
