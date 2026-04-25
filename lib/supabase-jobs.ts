import 'server-only';

import { CulturalTopic, ModuleJob, ModuleJobInput } from '@/lib/cultural-orientation';

const TABLE_NAME = 'cultural_orientation_generation_jobs';

type SupabaseJobRow = {
  id: string;
  user_id: string | null;
  highlighted_text: string;
  context_text: string | null;
  profile_json: ModuleJobInput['profile'] | null;
  status: ModuleJob['status'];
  progress: number;
  partial_text: string | null;
  error_message: string | null;
  module_id: string | null;
  title: string | null;
  topic: CulturalTopic | null;
  final_text: string | null;
  created_at: string;
  updated_at: string;
};

function getBaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

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

function getEndpoint(query = '') {
  const config = getBaseConfig();
  if (!config) return null;
  return `${config.url}/rest/v1/${TABLE_NAME}${query}`;
}

function toRow(job: ModuleJob): SupabaseJobRow {
  return {
    id: job.id,
    user_id: job.input.userId ?? null,
    highlighted_text: job.input.highlightedText,
    context_text: job.input.contextText ?? null,
    profile_json: job.input.profile ?? null,
    status: job.status,
    progress: job.progress,
    partial_text: job.partialText || null,
    error_message: job.error ?? null,
    module_id: job.module?.id ?? null,
    title: job.module?.title ?? null,
    topic: job.module?.topic ?? null,
    final_text: job.module?.text ?? null,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
  };
}

function toJob(row: SupabaseJobRow): ModuleJob {
  return {
    id: row.id,
    status: row.status,
    progress: row.progress,
    partialText: row.partial_text ?? '',
    error: row.error_message ?? undefined,
    input: {
      userId: row.user_id ?? undefined,
      highlightedText: row.highlighted_text,
      contextText: row.context_text ?? undefined,
      profile: row.profile_json ?? undefined,
    },
    module: row.final_text && row.title && row.topic && row.module_id
      ? {
          id: row.module_id,
          title: row.title,
          topic: row.topic,
          text: row.final_text,
        }
      : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function request<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, { ...init, cache: 'no-store' });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase job request failed (${response.status}): ${details}`);
  }
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

export function isSupabaseJobsEnabled() {
  return Boolean(getBaseConfig());
}

export async function saveJob(job: ModuleJob) {
  const endpoint = getEndpoint();
  const headers = getHeaders('resolution=merge-duplicates,return=representation');
  if (!endpoint || !headers) return null;

  const rows = await request<SupabaseJobRow[]>(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(toRow(job)),
  });
  return rows[0] ? toJob(rows[0]) : null;
}

export async function loadJob(id: string) {
  const endpoint = getEndpoint(`?id=eq.${encodeURIComponent(id)}&select=*`);
  const headers = getHeaders();
  if (!endpoint || !headers) return null;

  const rows = await request<SupabaseJobRow[]>(endpoint, { headers });
  return rows[0] ? toJob(rows[0]) : null;
}

export async function loadJobsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const endpoint = getEndpoint(`?id=in.(${ids.map((id) => `"${encodeURIComponent(id)}"`).join(',')})&select=*`);
  const headers = getHeaders();
  if (!endpoint || !headers) return [];

  const rows = await request<SupabaseJobRow[]>(endpoint, { headers });
  return rows.map(toJob);
}

export async function loadRecentJobs(limit = 12) {
  const endpoint = getEndpoint(`?select=*&order=updated_at.desc&limit=${limit}`);
  const headers = getHeaders();
  if (!endpoint || !headers) return [];

  const rows = await request<SupabaseJobRow[]>(endpoint, { headers });
  return rows.map(toJob);
}
