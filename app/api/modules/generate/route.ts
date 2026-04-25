import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

import { createJob } from '@/lib/job-store';
import { validateInput } from '@/lib/cultural-orientation';
import { ensureModuleGenerationStarted } from '@/lib/module-generation';

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

export async function POST(request: Request) {
  try {
    const payload = validateInput(await request.json());
    const jobId = crypto.randomUUID();
    await createJob(jobId, payload);
    await ensureModuleGenerationStarted(jobId);
    return jsonResponse({ jobId, status: 'queued' }, 202);
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
