import { CulturalTopic, LanguageLevel, LearningStyle, isUuid } from '@/lib/cultural-orientation';

const MAX_USER_ID_LEN = 256;

export function normalizeUserId(raw: string) {
  const userId = decodeURIComponent(raw).trim();
  if (!userId || userId.length > MAX_USER_ID_LEN) {
    return null;
  }
  return userId;
}

export type ProfileResponse = {
  exists: boolean;
  id?: string;
  userId: string;
  name: string | null;
  originCountry: string | null;
  destinationCountry: string | null;
  languageLevel: LanguageLevel | null;
  priorityTopics: CulturalTopic[];
  preferredLearningStyle: LearningStyle | null;
  wantsHelpWith: string[];
  avoidTopics: string[];
  savedJobIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export function emptyProfileResponse(userId: string): ProfileResponse {
  return {
    exists: false,
    userId,
    name: null,
    originCountry: null,
    destinationCountry: null,
    languageLevel: null,
    priorityTopics: [],
    preferredLearningStyle: null,
    wantsHelpWith: [],
    avoidTopics: [],
    savedJobIds: [],
  };
}

export function parseFavoritesMutation(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }
  const data = payload as Record<string, unknown>;
  const jobId = typeof data.jobId === 'string' ? data.jobId.trim() : '';
  if (!isUuid(jobId)) {
    throw new Error('jobId must be a valid UUID.');
  }
  if (data.action !== 'add' && data.action !== 'remove') {
    throw new Error('action must be "add" or "remove".');
  }
  return { jobId, action: data.action } as const;
}
