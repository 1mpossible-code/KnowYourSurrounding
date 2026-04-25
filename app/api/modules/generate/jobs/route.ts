import { NextResponse } from 'next/server';

import { listJobs } from '@/lib/job-store';

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
  const limit = Number(url.searchParams.get('limit') || 12);
  const jobs = await listJobs(Number.isInteger(limit) && limit > 0 ? Math.min(limit, 50) : 12);

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
