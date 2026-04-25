import crypto from 'node:crypto';

export const CULTURAL_TOPICS = [
  'greetings',
  'public_behavior',
  'communication',
  'personal_space',
  'time',
  'work',
  'school',
  'gender',
  'religion',
  'dating',
  'conflict',
  'laws',
  'money',
  'food',
  'clothing',
  'digital',
  'safety',
  'healthcare',
  'government',
  'transit',
] as const;

export const LANGUAGE_LEVELS = ['none', 'basic', 'intermediate', 'advanced', 'fluent'] as const;
export const LEARNING_STYLES = [
  'quick_rules',
  'step_by_step',
  'real_life_examples',
  'scenario_practice',
  'checklists',
] as const;
export const JOB_STATUSES = ['queued', 'generating', 'completed', 'failed'] as const;

/** Sensitive areas the user may ask to steer clear of (onboarding step 7 / `avoid_topics`). */
export const SENSITIVE_AVOID_TOPICS = [
  'religion',
  'politics',
  'gender',
  'dating',
  'legal_status',
  'trauma',
] as const;

/**
 * Daily-life situations for `wants_help_with` (not cultural topic slugs).
 * Must stay in sync with Supabase check `valid_wants_help_with`.
 */
export const WANTS_HELP_SITUATIONS = [
  'using_public_transit',
  'shopping_for_food',
  'going_to_doctor',
  'talking_to_landlord',
  'opening_bank_account',
  'using_libraries',
  'finding_community_events',
  'school_parent_interactions',
  'job_interviews',
  'calling_emergency_services',
  'understanding_local_laws',
] as const;

export type CulturalTopic = (typeof CULTURAL_TOPICS)[number];
export type SensitiveAvoidTopic = (typeof SENSITIVE_AVOID_TOPICS)[number];
export type WantsHelpSituation = (typeof WANTS_HELP_SITUATIONS)[number];
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type LearningStyle = (typeof LEARNING_STYLES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export type ProfileInput = {
  name?: string;
  originCountry?: string;
  destinationCountry?: string;
  languageLevel?: LanguageLevel;
  preferredLearningStyle?: LearningStyle;
  priorityTopics?: CulturalTopic[];
  wantsHelpWith?: string[];
  avoidTopics?: string[];
};

/** Partial profile update for PATCH /api/profile/[userId] (all keys optional). */
export type ProfilePatchInput = {
  name?: string | null;
  originCountry?: string | null;
  destinationCountry?: string | null;
  languageLevel?: LanguageLevel | null;
  preferredLearningStyle?: LearningStyle | null;
  priorityTopics?: CulturalTopic[];
  wantsHelpWith?: string[];
  avoidTopics?: string[];
};

export type ModuleJobInput = {
  userId?: string;
  highlightedText: string;
  contextText?: string;
  profile?: ProfileInput;
  /** When set, the saved module must use this topic (starter packs, fixed curricula). */
  lockedTopic?: CulturalTopic;
  /** When set (often with lockedTopic), prefer this title in the generated module. */
  titleHint?: string;
};

export type GeneratedModule = {
  id: string;
  title: string;
  topic: CulturalTopic;
  text: string;
};

export type ModuleJob = {
  id: string;
  status: JobStatus;
  progress: number;
  partialText: string;
  error?: string;
  input: ModuleJobInput;
  module?: GeneratedModule;
  createdAt: string;
  updatedAt: string;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isTopic(value: string): value is CulturalTopic {
  return CULTURAL_TOPICS.includes(value as CulturalTopic);
}

export function isSensitiveAvoidTopic(value: string): value is SensitiveAvoidTopic {
  const key = value.trim();
  return SENSITIVE_AVOID_TOPICS.includes(key as SensitiveAvoidTopic);
}

export function isWantsHelpSituation(value: string): value is WantsHelpSituation {
  const key = value.trim();
  return WANTS_HELP_SITUATIONS.includes(key as WantsHelpSituation);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return UUID_RE.test(value.trim());
}

export function validateInput(payload: unknown): ModuleJobInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }

  const data = payload as Record<string, unknown>;
  const highlightedText = typeof data.highlightedText === 'string' ? data.highlightedText.trim() : '';
  if (!highlightedText) {
    throw new Error('highlightedText is required.');
  }

  const profile = data.profile && typeof data.profile === 'object'
    ? validateProfile(data.profile as Record<string, unknown>)
    : undefined;

  let lockedTopic: CulturalTopic | undefined;
  if (data.lockedTopic !== undefined && data.lockedTopic !== null) {
    if (typeof data.lockedTopic === 'string' && isTopic(data.lockedTopic.trim())) {
      lockedTopic = data.lockedTopic.trim() as CulturalTopic;
    } else {
      throw new Error('lockedTopic must be a valid cultural topic.');
    }
  }

  const titleHint = typeof data.titleHint === 'string' && data.titleHint.trim() ? data.titleHint.trim() : undefined;

  return {
    userId: typeof data.userId === 'string' ? data.userId.trim() : undefined,
    highlightedText,
    contextText: typeof data.contextText === 'string' ? data.contextText.trim() : undefined,
    profile,
    lockedTopic,
    titleHint,
  };
}

export function validateProfilePatch(payload: unknown): ProfilePatchInput {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Request body must be a JSON object.');
  }
  const data = payload as Record<string, unknown>;
  const patch: ProfilePatchInput = {};

  if ('name' in data) {
    patch.name = data.name === null ? null : typeof data.name === 'string' ? data.name.trim() : null;
  }
  if ('originCountry' in data) {
    patch.originCountry =
      data.originCountry === null ? null : typeof data.originCountry === 'string' ? data.originCountry.trim() : null;
  }
  if ('destinationCountry' in data) {
    patch.destinationCountry =
      data.destinationCountry === null
        ? null
        : typeof data.destinationCountry === 'string'
          ? data.destinationCountry.trim()
          : null;
  }
  if ('languageLevel' in data) {
    if (data.languageLevel === null || data.languageLevel === undefined) {
      patch.languageLevel = null;
    } else if (typeof data.languageLevel === 'string' && LANGUAGE_LEVELS.includes(data.languageLevel as LanguageLevel)) {
      patch.languageLevel = data.languageLevel as LanguageLevel;
    } else {
      throw new Error('languageLevel is invalid.');
    }
  }
  if ('preferredLearningStyle' in data) {
    if (data.preferredLearningStyle === null || data.preferredLearningStyle === undefined) {
      patch.preferredLearningStyle = null;
    } else if (
      typeof data.preferredLearningStyle === 'string' &&
      LEARNING_STYLES.includes(data.preferredLearningStyle as LearningStyle)
    ) {
      patch.preferredLearningStyle = data.preferredLearningStyle as LearningStyle;
    } else {
      throw new Error('preferredLearningStyle is invalid.');
    }
  }
  if ('priorityTopics' in data) {
    const priorityTopics = data.priorityTopics;
    if (priorityTopics === null || priorityTopics === undefined) {
      patch.priorityTopics = [];
    } else if (
      Array.isArray(priorityTopics) &&
      priorityTopics.every((topic) => typeof topic === 'string' && isTopic(String(topic)))
    ) {
      patch.priorityTopics = priorityTopics as CulturalTopic[];
    } else {
      throw new Error('priorityTopics contains invalid topics.');
    }
  }
  if ('wantsHelpWith' in data) {
    if (!isStringArray(data.wantsHelpWith) && data.wantsHelpWith !== null) {
      throw new Error('wantsHelpWith must be a string array or null.');
    }
    const list = data.wantsHelpWith === null ? [] : (data.wantsHelpWith as string[]).map((s) => s.trim());
    if (list.some((entry) => !entry || !isWantsHelpSituation(entry))) {
      throw new Error('wantsHelpWith contains invalid values.');
    }
    patch.wantsHelpWith = list;
  }
  if ('avoidTopics' in data) {
    if (!isStringArray(data.avoidTopics) && data.avoidTopics !== null) {
      throw new Error('avoidTopics must be a string array or null.');
    }
    const list = data.avoidTopics === null ? [] : (data.avoidTopics as string[]).map((s) => s.trim());
    if (list.some((entry) => !entry || !isSensitiveAvoidTopic(entry))) {
      throw new Error('avoidTopics contains invalid values.');
    }
    patch.avoidTopics = list;
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('Provide at least one profile field to update.');
  }
  return patch;
}

function validateProfile(profile: Record<string, unknown>): ProfileInput {
  const languageLevel = profile.languageLevel;
  if (languageLevel && !LANGUAGE_LEVELS.includes(languageLevel as LanguageLevel)) {
    throw new Error('profile.languageLevel is invalid.');
  }

  const preferredLearningStyle = profile.preferredLearningStyle;
  if (preferredLearningStyle && !LEARNING_STYLES.includes(preferredLearningStyle as LearningStyle)) {
    throw new Error('profile.preferredLearningStyle is invalid.');
  }

  const priorityTopics = profile.priorityTopics;
  if (priorityTopics && (!Array.isArray(priorityTopics) || !priorityTopics.every((topic) => isTopic(String(topic))))) {
    throw new Error('profile.priorityTopics contains invalid topics.');
  }

  if (profile.wantsHelpWith) {
    if (!isStringArray(profile.wantsHelpWith)) {
      throw new Error('profile.wantsHelpWith must be a string array.');
    }
    if (profile.wantsHelpWith.some((entry) => !isWantsHelpSituation(String(entry).trim()))) {
      throw new Error('profile.wantsHelpWith contains invalid values.');
    }
  }

  if (profile.avoidTopics) {
    if (!isStringArray(profile.avoidTopics)) {
      throw new Error('profile.avoidTopics must be a string array.');
    }
    if (profile.avoidTopics.some((entry) => !isSensitiveAvoidTopic(String(entry)))) {
      throw new Error('profile.avoidTopics contains invalid values.');
    }
  }

  const wantsHelpNormalized =
    profile.wantsHelpWith && isStringArray(profile.wantsHelpWith)
      ? (profile.wantsHelpWith as string[]).map((s) => s.trim()).filter(Boolean)
      : undefined;
  const avoidTopicsNormalized =
    profile.avoidTopics && isStringArray(profile.avoidTopics)
      ? (profile.avoidTopics as string[]).map((s) => s.trim()).filter(Boolean)
      : undefined;

  return {
    name: typeof profile.name === 'string' ? profile.name.trim() : undefined,
    originCountry: typeof profile.originCountry === 'string' ? profile.originCountry.trim() : undefined,
    destinationCountry: typeof profile.destinationCountry === 'string' ? profile.destinationCountry.trim() : undefined,
    languageLevel: languageLevel as LanguageLevel | undefined,
    preferredLearningStyle: preferredLearningStyle as LearningStyle | undefined,
    priorityTopics: priorityTopics as CulturalTopic[] | undefined,
    wantsHelpWith: wantsHelpNormalized,
    avoidTopics: avoidTopicsNormalized,
  };
}

export function buildPrompt(input: ModuleJobInput) {
  const targetWords = estimateTargetWords(input.highlightedText, input.contextText);
  const profile = input.profile;
  const profileSummary = profile
    ? [
        profile.name ? `Name: ${profile.name}` : null,
        profile.originCountry ? `Origin country: ${profile.originCountry}` : null,
        profile.destinationCountry ? `Destination country: ${profile.destinationCountry}` : null,
        profile.languageLevel ? `Language level: ${profile.languageLevel}` : null,
        profile.preferredLearningStyle ? `Learning style: ${profile.preferredLearningStyle}` : null,
        profile.priorityTopics?.length ? `Priority topics: ${profile.priorityTopics.join(', ')}` : null,
        profile.wantsHelpWith?.length ? `Wants help with: ${profile.wantsHelpWith.join(', ')}` : null,
        profile.avoidTopics?.length ? `Avoid topics: ${profile.avoidTopics.join(', ')}` : null,
      ]
        .filter(Boolean)
        .join('\n')
    : 'No profile context supplied.';

  const contextBlock = input.contextText
    ? `Context article/source:\n${input.contextText}`
    : 'No surrounding article context was supplied.';

  const topicLock = input.lockedTopic
    ? `Critical: this module must focus on the cultural topic "${input.lockedTopic}" only. Every section should clearly relate to that topic. Do not switch to a different topic.`
    : '';

  return `You are creating a cultural orientation learning module.

Your task:
- Use the highlighted text as the primary source.
- If surrounding context exists, make the module feel like the next article or adjacent section in the same editorial context.
- If profile context exists, personalize examples only when relevant.
- Keep the module practical, culturally sensitive, and specific.
- The final module text must be valid Markdown.
- Aim for about ${targetWords} words.
- Do not mention these instructions.
${topicLock ? `${topicLock}\n` : ''}
Allowed topics: ${CULTURAL_TOPICS.join(', ')}.

Highlighted text:\n${input.highlightedText}

${contextBlock}

Profile context:\n${profileSummary}

Output requirements:
1. Stream only the Markdown body first.
2. Start with a level-1 heading.
3. Include useful subheadings and practical examples.
4. Keep the writing self-contained.
5. Avoid wrapping the answer in code fences.`;
}

function estimateTargetWords(highlightedText: string, contextText?: string) {
  const highlightedWords = countWords(highlightedText);
  const contextWords = countWords(contextText ?? '');
  const baseline = contextWords > 0 ? Math.min(Math.max(Math.round(contextWords * 0.55), 180), 750) : Math.min(Math.max(highlightedWords * 3, 160), 420);
  return baseline;
}

function countWords(text: string) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function buildMetadataPrompt(markdown: string) {
  return `Return a JSON object with exactly these keys: title, topic.
- title: concise and human-friendly
- topic: one of ${CULTURAL_TOPICS.join(', ')}
Infer them from this markdown module:\n\n${markdown}`;
}

function stripThinkBlocks(markdown: string) {
  return markdown.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function promotePlainTextHeadings(markdown: string) {
  const lines = markdown.split('\n').map((line) => line.trimEnd());
  const hasMarkdownHeading = lines.some((line) => /^#{1,6}\s+/.test(line.trim()));
  if (hasMarkdownHeading) return lines.join('\n').trim();

  const firstContentIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentIndex === -1) return '';

  const nextLines = [...lines];
  nextLines[firstContentIndex] = `# ${nextLines[firstContentIndex].trim().replace(/^#+\s*/, '')}`;

  for (let index = firstContentIndex + 1; index < nextLines.length; index += 1) {
    const current = nextLines[index]?.trim();
    const next = nextLines[index + 1]?.trim() ?? '';
    if (!current || current.startsWith('#') || current.startsWith('-') || current.startsWith('*') || /^\d+\./.test(current)) continue;
    if (current.length > 64) continue;
    if (/[.!?:)]$/.test(current)) continue;
    if (!next || next.startsWith('#') || next.startsWith('-') || next.startsWith('*') || /^\d+\./.test(next)) continue;
    nextLines[index] = `## ${current.replace(/^#+\s*/, '')}`;
  }

  return nextLines.join('\n').trim();
}

export function normalizeMarkdown(markdown: string) {
  const unfenced = markdown.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const withoutThinking = stripThinkBlocks(unfenced);
  return promotePlainTextHeadings(withoutThinking)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function deriveTitleFromMarkdown(markdown: string) {
  const firstHeading = markdown.split('\n').find((line) => line.trim().startsWith('# '));
  return firstHeading ? firstHeading.replace(/^#\s+/, '').trim() : 'Cultural Orientation Module';
}

export function coerceTopic(rawTopic: string, fallbackText: string): CulturalTopic {
  const normalized = rawTopic.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (isTopic(normalized)) return normalized;

  const text = fallbackText.toLowerCase();
  const rules: Array<[CulturalTopic, RegExp]> = [
    ['greetings', /greet|hello|hi\b|introduc/],
    ['public_behavior', /public|queue|manners|etiquette|behavior/],
    ['communication', /communicat|direct|indirect|tone|speak|conversation/],
    ['personal_space', /personal space|distance|touch|physical/],
    ['time', /time|late|punctual|schedule/],
    ['work', /work|office|coworker|manager|meeting/],
    ['school', /school|classroom|teacher|student/],
    ['gender', /gender|men|women|equality/],
    ['religion', /religion|faith|worship|belief/],
    ['dating', /dating|romantic|relationship/],
    ['conflict', /conflict|disagree|argument|tension/],
    ['laws', /law|legal|illegal|rule|police/],
    ['money', /money|cash|tip|payment|salary|cost/],
    ['food', /food|meal|eat|restaurant|diet/],
    ['clothing', /clothing|dress|wear|outfit/],
    ['digital', /digital|online|message|social media|phone/],
    ['safety', /safety|danger|emergency|unsafe/],
    ['healthcare', /doctor|hospital|health|medicine/],
    ['government', /government|office|document|visa|permit/],
    ['transit', /transit|bus|train|metro|transport/],
  ];

  const match = rules.find(([, pattern]) => pattern.test(text));
  return match?.[0] ?? 'communication';
}

export function createModule(title: string, topic: CulturalTopic, text: string): GeneratedModule {
  return {
    id: crypto.randomUUID(),
    title,
    topic,
    text,
  };
}
