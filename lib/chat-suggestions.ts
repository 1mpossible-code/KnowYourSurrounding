import crypto from 'node:crypto';

import {
  CULTURAL_TOPICS,
  CulturalTopic,
  ProfileInput,
  coerceTopic,
  isTopic,
  validateProfilePatch,
} from '@/lib/cultural-orientation';
import { getJsonFromGroq } from '@/lib/groq';

export type SuggestionPreview = {
  title: string;
  topic?: CulturalTopic;
};

export type ChatSuggestionsInput = {
  userId?: string;
  question: string;
  contextText?: string;
  feedback?: string;
  previousSuggestions?: SuggestionPreview[];
  profile?: ProfileInput;
};

export type ChatSuggestion = {
  id: string;
  title: string;
  topic: CulturalTopic;
  summary: string;
  seedText: string;
};

type RawSuggestion = {
  title?: string;
  topic?: string;
  summary?: string;
  seedText?: string;
};

/** Pull a suggestions array from common model JSON shapes (still require 3 items after extract). */
function extractSuggestionsArray(payload: unknown): RawSuggestion[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const obj = payload as Record<string, unknown>;
  const pick = (value: unknown): RawSuggestion[] | null => {
    if (!Array.isArray(value)) return null;
    if (!value.every((item) => item && typeof item === 'object' && !Array.isArray(item))) return null;
    return value as RawSuggestion[];
  };
  return (
    pick(obj.suggestions) ??
    pick(obj.suggestion) ??
    (obj.data && typeof obj.data === 'object'
      ? pick((obj.data as Record<string, unknown>).suggestions)
      : null) ??
    (obj.result && typeof obj.result === 'object'
      ? pick((obj.result as Record<string, unknown>).suggestions)
      : null)
  );
}

export function validateChatSuggestionsInput(payload: unknown): ChatSuggestionsInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  const data = payload as Record<string, unknown>;
  const question = typeof data.question === 'string' ? data.question.trim() : '';
  if (!question) {
    throw new Error('question is required.');
  }

  let profile: ProfileInput | undefined;
  if (data.profile !== undefined) {
    const patch = validateProfilePatch(data.profile);
    profile = {
      originCountry: patch.originCountry ?? undefined,
      destinationCountry: patch.destinationCountry ?? undefined,
      languageLevel: patch.languageLevel ?? undefined,
      preferredLearningStyle: patch.preferredLearningStyle ?? undefined,
      priorityTopics: patch.priorityTopics,
      wantsHelpWith: patch.wantsHelpWith,
      avoidTopics: patch.avoidTopics,
    };
  }

  return {
    userId: typeof data.userId === 'string' ? data.userId.trim() : undefined,
    question,
    contextText: typeof data.contextText === 'string' ? data.contextText.trim() : undefined,
    feedback: typeof data.feedback === 'string' ? data.feedback.trim() : undefined,
    previousSuggestions: validatePreviousSuggestions(data.previousSuggestions),
    profile,
  };
}

function validatePreviousSuggestions(value: unknown) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    throw new Error('previousSuggestions must be an array.');
  }

  return value.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`previousSuggestions[${index}] must be an object.`);
    }
    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) {
      throw new Error(`previousSuggestions[${index}].title is required.`);
    }
    const topic = typeof record.topic === 'string' && isTopic(record.topic) ? record.topic : undefined;
    return { title, topic } satisfies SuggestionPreview;
  });
}

export function buildChatSuggestionsPrompt(input: ChatSuggestionsInput) {
  const profileSummary = input.profile
    ? [
        input.profile.originCountry ? `Origin country: ${input.profile.originCountry}` : null,
        input.profile.destinationCountry ? `Destination country: ${input.profile.destinationCountry}` : null,
        input.profile.languageLevel ? `Language level: ${input.profile.languageLevel}` : null,
        input.profile.preferredLearningStyle ? `Learning style: ${input.profile.preferredLearningStyle}` : null,
        input.profile.priorityTopics?.length ? `Priority topics: ${input.profile.priorityTopics.join(', ')}` : null,
        input.profile.wantsHelpWith?.length ? `Wants help with: ${input.profile.wantsHelpWith.join(', ')}` : null,
        input.profile.avoidTopics?.length ? `Avoid topics: ${input.profile.avoidTopics.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : 'No profile supplied.';

  const previousSuggestions = input.previousSuggestions?.length
    ? input.previousSuggestions.map((item, index) => `${index + 1}. ${item.title}${item.topic ? ` (${item.topic})` : ''}`).join('\n')
    : 'None.';

  return `You are helping a user choose the best cultural orientation module to generate next.

Return exactly 3 distinct suggestions as JSON.
Each suggestion must include:
- title
- topic
- summary
- seedText

Rules:
- Use only these allowed topics: ${CULTURAL_TOPICS.join(', ')}.
- Base the suggestions primarily on the user's question.
- If context exists, use it to keep the suggestions relevant.
- If feedback exists, refine accordingly.
- If previous suggestions exist, avoid repeating them too closely.
- Keep each suggestion meaningfully different.
- The title must be production-ready and stable because, if chosen, it becomes the final module title.
- seedText should be a strong starter passage for a future cultural orientation module.
- Do not wrap the response in markdown.

Question:
${input.question}

Context:
${input.contextText || 'None provided.'}

Feedback:
${input.feedback || 'None provided.'}

Previous suggestions:
${previousSuggestions}

Profile:
${profileSummary}`;
}

export function normalizeChatSuggestionsResponse(payload: unknown): ChatSuggestion[] {
  const list = extractSuggestionsArray(payload);
  if (!list || list.length < 3) {
    throw new Error('Expected exactly 3 suggestions.');
  }
  const suggestions = list.slice(0, 3);

  return suggestions.map((suggestion, index) => {
    const title = suggestion.title?.trim();
    const summary = suggestion.summary?.trim();
    const seedText = suggestion.seedText?.trim();
    if (!title || !summary || !seedText) {
      throw new Error(`Suggestion ${index + 1} is missing required fields.`);
    }

    const topic = suggestion.topic ? coerceTopic(suggestion.topic, `${title}\n${summary}\n${seedText}`) : coerceTopic('', `${title}\n${summary}\n${seedText}`);

    return {
      id: crypto.randomUUID(),
      title,
      topic,
      summary,
      seedText,
    } satisfies ChatSuggestion;
  });
}

function buildRepairPrompt(input: ChatSuggestionsInput, badPayload: unknown) {
  const snippet =
    typeof badPayload === 'object' && badPayload !== null
      ? JSON.stringify(badPayload).slice(0, 3500)
      : String(badPayload).slice(0, 500);
  return `Your last JSON was invalid for our parser: we need exactly 3 objects in a top-level "suggestions" array.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{"suggestions":[{"title":"...","topic":"one allowed topic slug","summary":"...","seedText":"..."},{"title":"...","topic":"...","summary":"...","seedText":"..."},{"title":"...","topic":"...","summary":"...","seedText":"..."}]}

Allowed topic values: ${CULTURAL_TOPICS.join(', ')}.

User question:
${input.question}

Broken or partial output to fix:
${snippet}`;
}

export async function getChatSuggestions(input: ChatSuggestionsInput) {
  const prompt = buildChatSuggestionsPrompt(input);
  let parsed: unknown = await getJsonFromGroq(prompt);
  try {
    return normalizeChatSuggestionsResponse(parsed);
  } catch {
    parsed = await getJsonFromGroq(buildRepairPrompt(input, parsed));
    return normalizeChatSuggestionsResponse(parsed);
  }
}
