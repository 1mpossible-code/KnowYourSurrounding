import 'server-only';

import {
  CulturalTopic,
  LanguageLevel,
  LearningStyle,
  isTopic,
  ProfilePatchInput,
} from '@/lib/cultural-orientation';
import { emptyProfileResponse, ProfileResponse } from '@/lib/profile-api';

const TABLE = 'cultural_orientation_profiles';

export type ProfileRow = {
  id: string;
  user_id: string;
  name: string | null;
  origin_country: string | null;
  destination_country: string | null;
  language_level: LanguageLevel | null;
  priority_topics: string[] | null;
  preferred_learning_style: LearningStyle | null;
  wants_help_with: string[] | null;
  avoid_topics: string[] | null;
  saved_generation_job_ids: string[];
  created_at: string;
  updated_at: string;
};


function getBaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

function getHeaders(prefer?: string) {
  const config = getBaseConfig();
  if (!config) return null;
  return {
    apikey: config.key,
    Authorization: `Bearer ${config.key}`,
    'Content-Type': 'application/json',
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

function endpoint(query = '') {
  const config = getBaseConfig();
  if (!config) return null;
  return `${config.url}/rest/v1/${TABLE}${query}`;
}

async function request<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, { ...init, cache: 'no-store' });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase profile request failed (${response.status}): ${details}`);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

function rowToResponse(row: ProfileRow): ProfileResponse {
  const topics = (row.priority_topics ?? []).filter((t): t is CulturalTopic => isTopic(String(t)));
  return {
    exists: true,
    id: row.id,
    userId: row.user_id,
    name: row.name,
    originCountry: row.origin_country,
    destinationCountry: row.destination_country,
    languageLevel: row.language_level,
    priorityTopics: topics,
    preferredLearningStyle: row.preferred_learning_style,
    wantsHelpWith: row.wants_help_with ?? [],
    avoidTopics: row.avoid_topics ?? [],
    savedJobIds: row.saved_generation_job_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isSupabaseProfilesEnabled() {
  return Boolean(getBaseConfig());
}

export async function fetchProfileByUserId(userId: string) {
  const url = endpoint(`?user_id=eq.${encodeURIComponent(userId)}&select=*`);
  const headers = getHeaders();
  if (!url || !headers) return null;

  const rows = await request<ProfileRow[]>(url, { headers });
  const row = rows[0];
  return row ? rowToResponse(row) : emptyProfileResponse(userId);
}

function toInsertBody(userId: string, profile: ProfileResponse) {
  return {
    user_id: userId,
    name: profile.name,
    origin_country: profile.originCountry,
    destination_country: profile.destinationCountry,
    language_level: profile.languageLevel,
    priority_topics: profile.priorityTopics.length ? profile.priorityTopics : null,
    preferred_learning_style: profile.preferredLearningStyle,
    wants_help_with: profile.wantsHelpWith.length ? profile.wantsHelpWith : null,
    avoid_topics: profile.avoidTopics.length ? profile.avoidTopics : null,
    saved_generation_job_ids: profile.savedJobIds,
  };
}

/** Writes full profile row (preserves favorites when updating demographics). */
export async function upsertFullProfile(profile: ProfileResponse) {
  const url = endpoint('?on_conflict=user_id');
  const headers = getHeaders('resolution=merge-duplicates,return=representation');
  if (!url || !headers) return null;

  const rows = await request<ProfileRow[]>(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(toInsertBody(profile.userId, profile)),
  });
  return rows[0] ? rowToResponse(rows[0]) : null;
}

export async function setSavedJobIds(userId: string, jobIds: string[]) {
  const current = await fetchProfileByUserId(userId);
  if (!current) return null;
  const base = current.exists ? current : emptyProfileResponse(userId);
  return upsertFullProfile({ ...base, savedJobIds: jobIds, exists: true });
}

export async function upsertProfileByUserId(userId: string, patch: ProfilePatchInput) {
  const current = await fetchProfileByUserId(userId);
  if (!current) return null;
  const base: ProfileResponse = current.exists
    ? current
    : emptyProfileResponse(userId);
  const merged: ProfileResponse = {
    exists: true,
    id: base.id,
    userId,
    name: patch.name !== undefined ? patch.name ?? null : base.name,
    originCountry: patch.originCountry !== undefined ? patch.originCountry ?? null : base.originCountry,
    destinationCountry:
      patch.destinationCountry !== undefined ? patch.destinationCountry ?? null : base.destinationCountry,
    languageLevel: patch.languageLevel !== undefined ? patch.languageLevel ?? null : base.languageLevel,
    priorityTopics: patch.priorityTopics !== undefined ? patch.priorityTopics : base.priorityTopics,
    preferredLearningStyle:
      patch.preferredLearningStyle !== undefined ? patch.preferredLearningStyle ?? null : base.preferredLearningStyle,
    wantsHelpWith: patch.wantsHelpWith !== undefined ? patch.wantsHelpWith : base.wantsHelpWith,
    avoidTopics: patch.avoidTopics !== undefined ? patch.avoidTopics : base.avoidTopics,
    savedJobIds: base.savedJobIds,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
  return upsertFullProfile(merged);
}

