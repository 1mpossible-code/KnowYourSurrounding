import type { WantsHelpSituation, CulturalTopic } from '@/lib/cultural-orientation';
import type { ProfileResponse } from '@/lib/profile-api';

/** Persisted in localStorage after onboarding starts the starter guide jobs. */
export const STARTER_JOB_IDS_KEY = 'amparo-starter-guide-jobs';

export type StarterGuideSpec = {
  id: string;
  order: number;
  titleHint: string;
  topic: CulturalTopic;
  tagline: string;
  buildHighlightedText: () => string;
};

export type StoredStarterGuideJob = {
  specId: string;
  jobId: string;
};

function transitSeed() {
  return `Title: Getting Around (Transit Basics)
Topic: transit

Why this matters:
If someone cannot move around confidently, everything else becomes harder.

Cover:
• how to use buses, metro, and trains
• how to pay using card, app, or cash when relevant
• how to read directions like inbound, outbound, uptown, and downtown
• what to do if you get lost

Outcome:
The reader can physically navigate the city with more confidence.`;
}

function communicationSeed() {
  return `Title: How to Communicate
Topic: communication

Why this matters:
Language fear is one of the biggest practical and social blockers.

Cover:
• essential phrases for asking for help, paying, and getting directions
• what to say when you do not understand
• how tone shifts between formal and casual situations
• how locals typically communicate in everyday settings

Outcome:
The reader can interact without freezing or panicking.`;
}

function publicBehaviorSeed() {
  return `Title: What’s Normal Here (Public Behavior)
Topic: public_behavior

Why this matters:
Many people worry about doing something wrong in public.

Cover:
• personal space
• eye contact
• volume in public
• lines and queues
• what is rude versus normal

Outcome:
The reader avoids awkward or stressful social mistakes.`;
}

export const STARTER_GUIDE_SPECS: readonly StarterGuideSpec[] = [
  {
    id: 'transit_basics',
    order: 1,
    titleHint: 'Getting Around (Transit Basics)',
    topic: 'transit',
    tagline: 'Move through the city with confidence.',
    buildHighlightedText: transitSeed,
  },
  {
    id: 'how_to_communicate',
    order: 2,
    titleHint: 'How to Communicate',
    topic: 'communication',
    tagline: 'Speak and ask for help without freezing.',
    buildHighlightedText: communicationSeed,
  },
  {
    id: 'public_behavior_norms',
    order: 3,
    titleHint: 'What’s Normal Here (Public Behavior)',
    topic: 'public_behavior',
    tagline: 'Understand the small public norms that reduce stress.',
    buildHighlightedText: publicBehaviorSeed,
  },
];

const GUIDE_BY_ID = Object.fromEntries(STARTER_GUIDE_SPECS.map((spec) => [spec.id, spec])) as Record<string, StarterGuideSpec>;

const SITUATION_TO_GUIDE_ID: Record<WantsHelpSituation, StarterGuideSpec['id']> = {
  using_public_transit: 'transit_basics',
  shopping_for_food: 'public_behavior_norms',
  going_to_doctor: 'how_to_communicate',
  talking_to_landlord: 'how_to_communicate',
  opening_bank_account: 'how_to_communicate',
  using_libraries: 'public_behavior_norms',
  finding_community_events: 'public_behavior_norms',
  school_parent_interactions: 'how_to_communicate',
  job_interviews: 'how_to_communicate',
  calling_emergency_services: 'how_to_communicate',
  understanding_local_laws: 'public_behavior_norms',
};

export function selectStarterGuides(wantsHelpWith: string[]) {
  const selected = new Set<StarterGuideSpec['id']>();
  for (const value of wantsHelpWith) {
    const guideId = SITUATION_TO_GUIDE_ID[value as WantsHelpSituation];
    if (guideId) selected.add(guideId);
  }

  return STARTER_GUIDE_SPECS.filter((spec) => selected.has(spec.id)).sort((left, right) => left.order - right.order);
}

export function getStarterGuideById(specId: string) {
  return GUIDE_BY_ID[specId];
}

/** Builds the JSON body for POST /api/modules/generate for one starter guide. */
export function buildStarterModulePayload(
  profile: ProfileResponse,
  userId: string,
  spec: StarterGuideSpec,
) {
  const profileForJob = {
    name: profile.name ?? undefined,
    originCountry: profile.originCountry ?? undefined,
    destinationCountry: profile.destinationCountry ?? undefined,
    languageLevel: profile.languageLevel ?? undefined,
    preferredLearningStyle: profile.preferredLearningStyle ?? undefined,
    priorityTopics: profile.priorityTopics,
    wantsHelpWith: profile.wantsHelpWith,
    avoidTopics: profile.avoidTopics,
  };

  return {
    userId,
    highlightedText: spec.buildHighlightedText(),
    profile: profileForJob,
    lockedTopic: spec.topic,
    titleHint: spec.titleHint,
  };
}

export function readStoredStarterGuideJobs(): StoredStarterGuideJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STARTER_JOB_IDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is StoredStarterGuideJob =>
        Boolean(entry) && typeof entry === 'object' && typeof (entry as StoredStarterGuideJob).specId === 'string' && typeof (entry as StoredStarterGuideJob).jobId === 'string',
    );
  } catch {
    return [];
  }
}

export function writeStoredStarterGuideJobs(entries: StoredStarterGuideJob[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STARTER_JOB_IDS_KEY, JSON.stringify(entries));
}

export function clearStoredStarterGuideJobs() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STARTER_JOB_IDS_KEY);
}
