import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import {
  getOnboardingProfileByUserId,
  patchOnboardingProfile,
  upsertOnboardingProfile,
} from '@/lib/services/onboarding-service';
import {
  createOnboardingProfileSchema,
  patchOnboardingProfileSchema,
  userIdQuerySchema,
} from '@/lib/validation/onboarding';

function successResponse(data: unknown, status = 200) {
  return NextResponse.json(
    {
      data,
      error: null,
    },
    { status }
  );
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    {
      data: null,
      error: {
        code,
        message,
        details: details ?? {},
      },
    },
    { status }
  );
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse('VALIDATION_ERROR', 'Invalid request', 400, error.flatten());
  }

  if (error instanceof SyntaxError) {
    return errorResponse('VALIDATION_ERROR', 'Invalid request', 400, {
      body: ['Request body must be valid JSON'],
    });
  }

  console.error('Onboarding profile API error:', error);
  return errorResponse('INTERNAL_SERVER_ERROR', 'Internal server error', 500);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = userIdQuerySchema.parse({
      user_id: searchParams.get('user_id'),
    });

    const profile = await getOnboardingProfileByUserId(query.user_id);

    if (!profile) {
      return errorResponse('NOT_FOUND', 'Profile not found', 404);
    }

    return successResponse(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = createOnboardingProfileSchema.parse(body);
    const result = await upsertOnboardingProfile(payload);

    return successResponse(result.profile, result.created ? 201 : 200);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const payload = patchOnboardingProfileSchema.parse(body);
    const profile = await patchOnboardingProfile(payload);

    if (!profile) {
      return errorResponse('NOT_FOUND', 'Profile not found', 404);
    }

    return successResponse(profile);
  } catch (error) {
    return handleRouteError(error);
  }
}
