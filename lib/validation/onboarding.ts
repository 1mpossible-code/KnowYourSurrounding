import { z } from 'zod';

import {
  AVOID_TOPICS,
  CULTURAL_TOPICS,
  DAILY_LIFE_NEEDS,
  LANGUAGE_LEVELS,
  PREFERRED_LEARNING_STYLES,
} from '@/lib/types/onboarding';

const nonEmptyString = (field: string) =>
  z.string().trim().min(1, `${field} is required`);

const topicSchema = z.enum(CULTURAL_TOPICS);
const dailyLifeNeedSchema = z.enum(DAILY_LIFE_NEEDS);
const avoidTopicSchema = z.enum(AVOID_TOPICS);

export const userIdSchema = nonEmptyString('user_id');

export const userIdQuerySchema = z.object({
  user_id: userIdSchema,
});

export const createOnboardingProfileSchema = z
  .object({
    user_id: userIdSchema,
    origin_country: nonEmptyString('origin_country'),
    destination_country: nonEmptyString('destination_country'),
    language_level: z.enum(LANGUAGE_LEVELS),
    priority_topics: z.array(topicSchema).min(1, 'priority_topics must contain at least 1 item'),
    preferred_learning_style: z.enum(PREFERRED_LEARNING_STYLES),
    wants_help_with: z
      .array(dailyLifeNeedSchema)
      .min(1, 'wants_help_with must contain at least 1 item'),
    avoid_topics: z.array(avoidTopicSchema).default([]),
  })
  .strict();

export const patchOnboardingProfileSchema = z
  .object({
    user_id: userIdSchema,
    origin_country: nonEmptyString('origin_country').optional(),
    destination_country: nonEmptyString('destination_country').optional(),
    language_level: z.enum(LANGUAGE_LEVELS).optional(),
    priority_topics: z
      .array(topicSchema)
      .min(1, 'priority_topics must contain at least 1 item')
      .optional(),
    preferred_learning_style: z.enum(PREFERRED_LEARNING_STYLES).optional(),
    wants_help_with: z
      .array(dailyLifeNeedSchema)
      .min(1, 'wants_help_with must contain at least 1 item')
      .optional(),
    avoid_topics: z.array(avoidTopicSchema).optional(),
  })
  .strict();
