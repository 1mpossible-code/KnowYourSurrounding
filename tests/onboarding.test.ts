import { describe, expect, test } from 'bun:test';

import { buildProfilePatchFromOnboarding, createInitialOnboardingForm, LOCAL_USER_ID_KEY } from '@/lib/onboarding';

describe('onboarding helpers', () => {
  test('createInitialOnboardingForm selects all default topic-based options', () => {
    const form = createInitialOnboardingForm();
    expect(form.priorityTopics.length).toBeGreaterThan(0);
    expect(form.wantsHelpWith.length).toBe(form.priorityTopics.length);
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
      wantsHelpWith: ['work', 'communication'],
      avoidTopics: ['dating'],
    });

    expect(patch).toEqual({
      name: 'Mila',
      originCountry: 'Ukraine',
      destinationCountry: 'Germany',
      languageLevel: 'intermediate',
      priorityTopics: ['work', 'communication'],
      preferredLearningStyle: 'real_life_examples',
      wantsHelpWith: ['work', 'communication'],
      avoidTopics: ['dating'],
    });
  });

  test('local storage key is stable', () => {
    expect(LOCAL_USER_ID_KEY).toBe('kys-demo-user-id');
  });
});
