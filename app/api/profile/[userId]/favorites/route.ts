import { NextResponse } from 'next/server';

import { parseFavoritesMutation, normalizeUserId } from '@/lib/profile-api';
import { loadJob } from '@/lib/supabase-jobs';
import { fetchProfileByUserId, isSupabaseProfilesEnabled, setSavedJobIds } from '@/lib/supabase-profiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    const { jobId, action } = parseFavoritesMutation(await request.json());

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
