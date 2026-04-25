import { describe, expect, test } from 'bun:test';

import { emptyProfileResponse, parseFavoritesMutation, normalizeUserId } from '@/lib/profile-api';

describe('profile and favorites helpers', () => {
  test('normalizeUserId trims and decodes values', () => {
    expect(normalizeUserId(' demo-user ')).toBe('demo-user');
    expect(normalizeUserId('demo%20user')).toBe('demo user');
  });

  test('normalizeUserId rejects empty values', () => {
    expect(normalizeUserId('   ')).toBeNull();
  });

  test('parseFavoritesMutation validates add/remove body', () => {
    const jobId = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseFavoritesMutation({ jobId, action: 'add' })).toEqual({ jobId, action: 'add' });
    expect(parseFavoritesMutation({ jobId, action: 'remove' })).toEqual({ jobId, action: 'remove' });
  });

  test('parseFavoritesMutation rejects invalid UUID', () => {
    expect(() => parseFavoritesMutation({ jobId: 'nope', action: 'add' })).toThrow('jobId must be a valid UUID.');
  });

  test('emptyProfileResponse uses saved job ids and defaults', () => {
    expect(emptyProfileResponse('demo-user')).toEqual({
      exists: false,
      userId: 'demo-user',
      originCountry: null,
      destinationCountry: null,
      languageLevel: null,
      priorityTopics: [],
      preferredLearningStyle: null,
      wantsHelpWith: [],
      avoidTopics: [],
      savedJobIds: [],
    });
  });
});
