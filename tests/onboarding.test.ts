import { describe, expect, test } from 'bun:test';

import { WANTS_HELP_SITUATIONS } from '@/lib/cultural-orientation';
import { buildProfilePatchFromOnboarding, createInitialOnboardingForm, LOCAL_USER_ID_KEY } from '@/lib/onboarding';

describe('onboarding helpers', () => {
  test('createInitialOnboardingForm selects all topics and all daily-life help areas', () => {
    const form = createInitialOnboardingForm();
    expect(form.priorityTopics.length).toBeGreaterThan(0);
    expect(form.wantsHelpWith).toEqual([...WANTS_HELP_SITUATIONS]);
    expect(form.avoidTopics).toEqual([]);
    expect(form.name).toBe('');
  });

  test('buildProfilePatchFromOnboarding creates a full profile patch', () => {
    const patch = buildProfilePatchFromOnboarding({
      name: 'Mila',
      originCountry: 'Ukraine',
      destinationCountry: 'Germany',
      languageLevel: 'intermediate',
      priorityTopics: ['work', 'communication'],
      preferredLearningStyle: 'real_life_examples',
      wantsHelpWith: ['going_to_doctor', 'using_public_transit'],
      avoidTopics: ['dating', 'politics'],
    });

    expect(patch).toEqual({
      name: 'Mila',
      originCountry: 'Ukraine',
      destinationCountry: 'Germany',
      languageLevel: 'intermediate',
      priorityTopics: ['work', 'communication'],
      preferredLearningStyle: 'real_life_examples',
      wantsHelpWith: ['going_to_doctor', 'using_public_transit'],
      avoidTopics: ['dating', 'politics'],
    });
  });

  test('local storage key is stable', () => {
    expect(LOCAL_USER_ID_KEY).toBe('kys-demo-user-id');
  });
});
