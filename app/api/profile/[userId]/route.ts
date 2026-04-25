import { NextResponse } from 'next/server';

import { validateProfilePatch } from '@/lib/cultural-orientation';
import { fetchProfileByUserId, isSupabaseProfilesEnabled, upsertProfileByUserId } from '@/lib/supabase-profiles';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_USER_ID_LEN = 256;

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

export async function GET(_request: Request, context: { params: Promise<{ userId: string }> }) {
  if (!isSupabaseProfilesEnabled()) {
    return jsonResponse({ error: 'Supabase is not configured.' }, 503);
  }
  const { userId: raw } = await context.params;
  const userId = normalizeUserId(raw);
  if (!userId) {
    return jsonResponse({ error: 'Invalid userId.' }, 400);
  }

  try {
    const profile = await fetchProfileByUserId(userId);
    if (!profile) {
      return jsonResponse({ error: 'Failed to load profile.' }, 500);
    }
    return jsonResponse({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load profile.';
    return jsonResponse({ error: message }, 500);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ userId: string }> }) {
  if (!isSupabaseProfilesEnabled()) {
    return jsonResponse({ error: 'Supabase is not configured.' }, 503);
  }
  const { userId: raw } = await context.params;
  const userId = normalizeUserId(raw);
  if (!userId) {
    return jsonResponse({ error: 'Invalid userId.' }, 400);
  }

  try {
    const patch = validateProfilePatch(await request.json());
    const profile = await upsertProfileByUserId(userId, patch);
    if (!profile) {
      return jsonResponse({ error: 'Failed to save profile.' }, 500);
    }
    return jsonResponse({ profile });
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
      'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
