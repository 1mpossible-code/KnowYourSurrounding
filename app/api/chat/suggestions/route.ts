import { NextResponse } from 'next/server';

import { getChatSuggestions, validateChatSuggestionsInput } from '@/lib/chat-suggestions';

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
    const input = validateChatSuggestionsInput(await request.json());
    const suggestions = await getChatSuggestions(input);
    return jsonResponse({ suggestions });
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
