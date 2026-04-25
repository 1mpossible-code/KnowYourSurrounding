import { NextResponse } from 'next/server';

import { listJobs, listJobsByIds } from '@/lib/job-store';
import { ensureModuleGenerationStarted } from '@/lib/module-generation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids');
  const limit = Number(url.searchParams.get('limit') || 12);
  const requestedIds = idsParam
    ? idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 20)
    : [];

  if (requestedIds.length > 0) {
    await Promise.all(requestedIds.map((id) => ensureModuleGenerationStarted(id)));
  }

  const jobs = requestedIds.length > 0
    ? await listJobsByIds(requestedIds)
    : await listJobs(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 12);

  return jsonResponse({ jobs: jobs.map((job) => ({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    partialText: job.partialText,
    module: job.module,
    error: job.error,
    userId: job.input.userId,
    highlightedText: job.input.highlightedText,
    contextText: job.input.contextText,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  })) });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
