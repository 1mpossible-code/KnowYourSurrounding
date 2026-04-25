import { NextResponse } from 'next/server';

import { isUuid } from '@/lib/cultural-orientation';
import { loadJob } from '@/lib/supabase-jobs';
import { fetchProfileByUserId, isSupabaseProfilesEnabled, setSavedJobIds } from '@/lib/supabase-profiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_USER_ID_LEN = 256;

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function normalizeUserId(raw: string) {
  const userId = decodeURIComponent(raw).trim();
  if (!userId || userId.length > MAX_USER_ID_LEN) {
    return null;
  }
  return userId;
}

type FavoritesBody = {
  jobId?: unknown;
  action?: unknown;
};

function parseFavoritesBody(payload: unknown): { jobId: string; action: 'add' | 'remove' } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }
  const data = payload as FavoritesBody;
  if (typeof data.jobId !== 'string' || !isUuid(data.jobId)) {
    throw new Error('jobId must be a valid UUID.');
  }
  if (data.action !== 'add' && data.action !== 'remove') {
    throw new Error('action must be "add" or "remove".');
  }
  return { jobId: data.jobId.trim(), action: data.action };
}

export async function POST(request: Request, context: { params: Promise<{ userId: string }> }) {
  if (!isSupabaseProfilesEnabled()) {
    return jsonResponse({ error: 'Supabase is not configured.' }, 503);
  }
  const { userId: raw } = await context.params;
  const userId = normalizeUserId(raw);
  if (!userId) {
    return jsonResponse({ error: 'Invalid userId.' }, 400);
  }

  try {
    const { jobId, action } = parseFavoritesBody(await request.json());

    if (action === 'add') {
      const job = await loadJob(jobId);
      if (!job) {
        return jsonResponse({ error: 'Job not found.' }, 404);
      }
      if (job.status !== 'completed' || !job.module) {
        return jsonResponse({ error: 'Only completed jobs can be added to favorites.' }, 400);
      }
    }

    const current = await fetchProfileByUserId(userId);
    if (!current) {
      return jsonResponse({ error: 'Failed to load profile.' }, 500);
    }

    const ids = new Set(current.savedJobIds);
    if (action === 'add') {
      ids.add(jobId);
    } else {
      ids.delete(jobId);
    }

    const profile = await setSavedJobIds(userId, [...ids]);
    if (!profile) {
      return jsonResponse({ error: 'Failed to update favorites.' }, 500);
    }

    return jsonResponse({ profile, jobId, action });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request.';
    return jsonResponse({ error: message }, 400);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
