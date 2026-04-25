import { NextResponse } from 'next/server';
import crypto from 'crypto';

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  const id = crypto.randomUUID();
  return jsonResponse({ id });
}

export async function POST(request: Request) {
  // Accept optional JSON body { count: number } to generate multiple UUIDs
  try {
    const body = await request.json().catch(() => ({}));
    const count = Number(body?.count || 1);
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      return jsonResponse({ error: 'count must be an integer between 1 and 1000' }, 400);
    }

    if (count === 1) {
      return jsonResponse({ id: crypto.randomUUID() });
    }

    const ids: string[] = [];
    for (let i = 0; i < count; i++) ids.push(crypto.randomUUID());
    return jsonResponse({ ids });
  } catch {
    return jsonResponse({ error: 'Invalid request' }, 400);
  }
}

// Respond to CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
