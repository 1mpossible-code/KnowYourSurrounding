import 'server-only';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import type {
  CreateOnboardingProfileInput,
  OnboardingProfile,
  PatchOnboardingProfileInput,
} from '@/lib/types/onboarding';

const TABLE_NAME = 'cultural_orientation_profiles';

export async function getOnboardingProfileByUserId(userId: string) {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as OnboardingProfile | null;
}

export async function upsertOnboardingProfile(input: CreateOnboardingProfileInput) {
  const supabase = getSupabaseServerClient();
  const existingProfile = await getOnboardingProfileByUserId(input.user_id);

  const payload = {
    ...input,
    avoid_topics: input.avoid_topics ?? [],
    saved_modules: [],
  };

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return {
    profile: data as OnboardingProfile,
    created: !existingProfile,
  };
}

export async function patchOnboardingProfile(input: PatchOnboardingProfileInput) {
  const supabase = getSupabaseServerClient();
  const { user_id, ...updates } = input;

  const currentProfile = await getOnboardingProfileByUserId(user_id);

  if (!currentProfile) {
    return null;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(updates)
    .eq('user_id', user_id)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as OnboardingProfile;
}
