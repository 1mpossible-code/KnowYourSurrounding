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

export type CulturalTopic = (typeof CULTURAL_TOPICS)[number];
export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type LearningStyle = (typeof LEARNING_STYLES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export type ProfileInput = {
  originCountry?: string;
  destinationCountry?: string;
  languageLevel?: LanguageLevel;
  preferredLearningStyle?: LearningStyle;
  priorityTopics?: CulturalTopic[];
  wantsHelpWith?: string[];
  avoidTopics?: string[];
};

export type ModuleJobInput = {
  userId?: string;
  highlightedText: string;
  contextText?: string;
  profile?: ProfileInput;
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

  return {
    userId: typeof data.userId === 'string' ? data.userId.trim() : undefined,
    highlightedText,
    contextText: typeof data.contextText === 'string' ? data.contextText.trim() : undefined,
    profile,
  };
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

  if (profile.wantsHelpWith && !isStringArray(profile.wantsHelpWith)) {
    throw new Error('profile.wantsHelpWith must be a string array.');
  }

  if (profile.avoidTopics && !isStringArray(profile.avoidTopics)) {
    throw new Error('profile.avoidTopics must be a string array.');
  }

  return {
    originCountry: typeof profile.originCountry === 'string' ? profile.originCountry.trim() : undefined,
    destinationCountry: typeof profile.destinationCountry === 'string' ? profile.destinationCountry.trim() : undefined,
    languageLevel: languageLevel as LanguageLevel | undefined,
    preferredLearningStyle: preferredLearningStyle as LearningStyle | undefined,
    priorityTopics: priorityTopics as CulturalTopic[] | undefined,
    wantsHelpWith: profile.wantsHelpWith as string[] | undefined,
    avoidTopics: profile.avoidTopics as string[] | undefined,
  };
}

export function buildPrompt(input: ModuleJobInput) {
  const targetWords = estimateTargetWords(input.highlightedText, input.contextText);
  const profile = input.profile;
  const profileSummary = profile
    ? [
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

  return `You are creating a cultural orientation learning module.

Your task:
- Use the highlighted text as the primary source.
- If surrounding context exists, make the module feel like the next article or adjacent section in the same editorial context.
- If profile context exists, personalize examples only when relevant.
- Keep the module practical, culturally sensitive, and specific.
- The final module text must be valid Markdown.
- Aim for about ${targetWords} words.
- Do not mention these instructions.

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

export function normalizeMarkdown(markdown: string) {
  return markdown.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
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
