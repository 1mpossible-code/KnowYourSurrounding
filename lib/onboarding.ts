import { CULTURAL_TOPICS, LANGUAGE_LEVELS, LEARNING_STYLES, CulturalTopic, LanguageLevel, LearningStyle, ProfilePatchInput } from '@/lib/cultural-orientation';

export const LOCAL_USER_ID_KEY = 'kys-demo-user-id';

export const COUNTRY_OPTIONS = [
  'Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Bulgaria', 'Canada', 'Chile', 'China', 'Colombia',
  'Croatia', 'Czech Republic', 'Denmark', 'Egypt', 'Estonia', 'Finland', 'France', 'Germany', 'Greece', 'Hungary',
  'India', 'Indonesia', 'Ireland', 'Israel', 'Italy', 'Japan', 'Kenya', 'Latvia', 'Lithuania', 'Luxembourg',
  'Malaysia', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru',
  'Philippines', 'Poland', 'Portugal', 'Romania', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia', 'Slovenia',
  'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland', 'Thailand', 'Turkey', 'Ukraine',
  'United Arab Emirates', 'United Kingdom', 'United States', 'Vietnam',
] as const;

export const LANGUAGE_LEVEL_LABELS: Record<LanguageLevel, string> = {
  none: 'Not yet',
  basic: 'Basic everyday phrases',
  intermediate: 'Comfortable in many situations',
  advanced: 'Strong and confident',
  fluent: 'Fluent',
};

export const LEARNING_STYLE_LABELS: Record<LearningStyle, string> = {
  quick_rules: 'Quick rules I can remember fast',
  step_by_step: 'Step-by-step guidance',
  real_life_examples: 'Real-life examples',
  scenario_practice: 'Practice through scenarios',
  checklists: 'Checklists I can return to',
};

export const TOPIC_LABELS: Record<CulturalTopic, string> = {
  greetings: 'Greetings and first impressions',
  public_behavior: 'Public behavior',
  communication: 'Communication style',
  personal_space: 'Personal space',
  time: 'Time and punctuality',
  work: 'Workplace culture',
  school: 'School and study life',
  gender: 'Gender expectations',
  religion: 'Religion and beliefs',
  dating: 'Dating and relationships',
  conflict: 'Conflict and disagreement',
  laws: 'Rules and laws',
  money: 'Money and payment habits',
  food: 'Food culture',
  clothing: 'Clothing and appearance',
  digital: 'Digital etiquette',
  safety: 'Safety and emergencies',
  healthcare: 'Healthcare and medical visits',
  government: 'Government and paperwork',
  transit: 'Transit and getting around',
};

export type OnboardingFormData = {
  name: string;
  originCountry: string;
  destinationCountry: string;
  languageLevel: LanguageLevel | '';
  priorityTopics: CulturalTopic[];
  preferredLearningStyle: LearningStyle | '';
  wantsHelpWith: string[];
  avoidTopics: string[];
};

export const ALL_TOPIC_VALUES = [...CULTURAL_TOPICS];

export const LANGUAGE_LEVEL_OPTIONS = LANGUAGE_LEVELS.map((value) => ({ value, label: LANGUAGE_LEVEL_LABELS[value] }));
export const LEARNING_STYLE_OPTIONS = LEARNING_STYLES.map((value) => ({ value, label: LEARNING_STYLE_LABELS[value] }));
export const TOPIC_OPTIONS = CULTURAL_TOPICS.map((value) => ({ value, label: TOPIC_LABELS[value] }));
export const HELP_OPTIONS = TOPIC_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label,
}));

export function createInitialOnboardingForm(): OnboardingFormData {
  return {
    name: '',
    originCountry: '',
    destinationCountry: '',
    languageLevel: '',
    priorityTopics: [...ALL_TOPIC_VALUES],
    preferredLearningStyle: '',
    wantsHelpWith: [...ALL_TOPIC_VALUES],
    avoidTopics: [],
  };
}

export function buildProfilePatchFromOnboarding(form: OnboardingFormData): ProfilePatchInput {
  return {
    name: form.name.trim(),
    originCountry: form.originCountry,
    destinationCountry: form.destinationCountry,
    languageLevel: form.languageLevel || null,
    priorityTopics: [...form.priorityTopics],
    preferredLearningStyle: form.preferredLearningStyle || null,
    wantsHelpWith: [...form.wantsHelpWith],
    avoidTopics: [...form.avoidTopics],
  };
}

export function getSelectedLabels(values: string[]) {
  return values.map((value) => TOPIC_LABELS[value as CulturalTopic] ?? value);
}
