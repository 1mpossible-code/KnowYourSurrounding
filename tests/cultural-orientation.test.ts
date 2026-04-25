import { describe, expect, test } from 'bun:test';

import {
  coerceTopic,
  normalizeMarkdown,
  validateInput,
  validateProfilePatch,
  WANTS_HELP_SITUATIONS,
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
      wantsHelpWith: ['going_to_doctor', 'using_public_transit'],
      avoidTopics: null,
    });

    expect(patch.name).toBe('Mila');
    expect(patch.originCountry).toBe('Ukraine');
    expect(patch.destinationCountry).toBeNull();
    expect(patch.priorityTopics).toEqual(['work', 'communication']);
    expect(patch.wantsHelpWith).toEqual(['going_to_doctor', 'using_public_transit']);
    expect(patch.avoidTopics).toEqual([]);
  });

  test('validateProfilePatch rejects wantsHelpWith cultural topic slugs', () => {
    expect(() =>
      validateProfilePatch({
        originCountry: 'Ukraine',
        wantsHelpWith: ['greetings', 'work'],
      }),
    ).toThrow('wantsHelpWith contains invalid values.');
  });

  test('validateProfilePatch rejects avoidTopics outside sensitive set', () => {
    expect(() =>
      validateProfilePatch({
        originCountry: 'Ukraine',
        avoidTopics: ['laws'],
      }),
    ).toThrow('avoidTopics contains invalid values.');
  });

  test('validateProfilePatch accepts sensitive avoid slugs', () => {
    const patch = validateProfilePatch({
      avoidTopics: ['politics', 'trauma', 'legal_status'],
    });
    expect(patch.avoidTopics).toEqual(['politics', 'trauma', 'legal_status']);
  });

  test('validateProfilePatch accepts every valid_wants_help_with DB slug', () => {
    const patch = validateProfilePatch({ wantsHelpWith: [...WANTS_HELP_SITUATIONS] });
    expect(patch.wantsHelpWith).toEqual([...WANTS_HELP_SITUATIONS]);
  });

  test('validateProfilePatch trims wantsHelpWith entries', () => {
    const patch = validateProfilePatch({
      wantsHelpWith: ['  going_to_doctor  ', 'using_public_transit'],
    });
    expect(patch.wantsHelpWith).toEqual(['going_to_doctor', 'using_public_transit']);
  });
});
