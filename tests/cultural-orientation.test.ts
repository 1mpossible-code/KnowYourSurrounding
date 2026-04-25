import { describe, expect, test } from 'bun:test';

import {
  coerceTopic,
  normalizeMarkdown,
  validateInput,
  validateProfilePatch,
} from '@/lib/cultural-orientation';

describe('module generation helpers', () => {
  test('validateInput trims and accepts valid payload', () => {
    const result = validateInput({
      userId: ' demo-user ',
      highlightedText: '  direct communication matters  ',
      contextText: '  broader context  ',
      profile: {
        originCountry: 'Ukraine',
        destinationCountry: 'Germany',
        languageLevel: 'intermediate',
        preferredLearningStyle: 'real_life_examples',
        priorityTopics: ['communication'],
      },
    });

    expect(result.userId).toBe('demo-user');
    expect(result.highlightedText).toBe('direct communication matters');
    expect(result.contextText).toBe('broader context');
    expect(result.profile?.priorityTopics).toEqual(['communication']);
  });

  test('validateInput rejects empty highlightedText', () => {
    expect(() => validateInput({ highlightedText: '   ' })).toThrow('highlightedText is required.');
  });

  test('normalizeMarkdown removes fenced wrappers', () => {
    expect(normalizeMarkdown('```markdown\n# Hello\n```')).toBe('# Hello');
    expect(normalizeMarkdown('```\n# Hello\n```')).toBe('# Hello');
  });

  test('coerceTopic infers topic from content', () => {
    expect(coerceTopic('', 'The manager gave direct feedback during a meeting at work.')).toBe('communication');
    expect(coerceTopic('communication', 'anything')).toBe('communication');
  });

  test('validateProfilePatch parses nullable and array values', () => {
    const patch = validateProfilePatch({
      name: 'Mila',
      originCountry: 'Ukraine',
      destinationCountry: null,
      priorityTopics: ['work', 'communication'],
      wantsHelpWith: ['meetings'],
      avoidTopics: null,
    });

    expect(patch.name).toBe('Mila');
    expect(patch.originCountry).toBe('Ukraine');
    expect(patch.destinationCountry).toBeNull();
    expect(patch.priorityTopics).toEqual(['work', 'communication']);
    expect(patch.wantsHelpWith).toEqual(['meetings']);
    expect(patch.avoidTopics).toEqual([]);
  });
});
