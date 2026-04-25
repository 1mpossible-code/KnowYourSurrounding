export const LANGUAGE_LEVELS = [
  'none',
  'basic',
  'intermediate',
  'advanced',
  'fluent',
] as const;

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

export const PREFERRED_LEARNING_STYLES = [
  'quick_rules',
  'step_by_step',
  'real_life_examples',
  'scenario_practice',
  'checklists',
] as const;

export const DAILY_LIFE_NEEDS = [
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

export const AVOID_TOPICS = [
  'religion',
  'politics',
  'gender',
  'dating',
  'legal_status',
  'trauma',
] as const;

export type LanguageLevel = (typeof LANGUAGE_LEVELS)[number];
export type CulturalTopic = (typeof CULTURAL_TOPICS)[number];
export type PreferredLearningStyle = (typeof PREFERRED_LEARNING_STYLES)[number];
export type DailyLifeNeed = (typeof DAILY_LIFE_NEEDS)[number];
export type AvoidTopic = (typeof AVOID_TOPICS)[number];

export type OnboardingProfile = {
  id: string;
  user_id: string;
  origin_country: string;
  destination_country: string;
  language_level: LanguageLevel;
  priority_topics: CulturalTopic[];
  preferred_learning_style: PreferredLearningStyle;
  wants_help_with: DailyLifeNeed[];
  avoid_topics: AvoidTopic[];
  saved_modules: string[];
  created_at: string;
  updated_at: string;
};

export type CreateOnboardingProfileInput = Omit<
  OnboardingProfile,
  'id' | 'saved_modules' | 'created_at' | 'updated_at'
>;

export type PatchOnboardingProfileInput = {
  user_id: string;
} & Partial<Omit<CreateOnboardingProfileInput, 'user_id'>>;
