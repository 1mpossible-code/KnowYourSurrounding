import { describe, expect, test } from 'bun:test';

import {
  buildChatSuggestionsPrompt,
  normalizeChatSuggestionsResponse,
  validateChatSuggestionsInput,
} from '@/lib/chat-suggestions';

describe('chat suggestions helpers', () => {
  test('validateChatSuggestionsInput accepts question with context and feedback', () => {
    const input = validateChatSuggestionsInput({
      question: 'I think I sounded rude to my manager.',
      contextText: 'This happened during a team meeting in Germany.',
      feedback: 'Make it more about work.',
      previousSuggestions: [{ title: 'Understanding direct feedback', topic: 'work' }],
      profile: {
        destinationCountry: 'Germany',
        languageLevel: 'intermediate',
      },
    });

    expect(input.question).toBe('I think I sounded rude to my manager.');
    expect(input.previousSuggestions?.[0]?.topic).toBe('work');
    expect(input.profile?.destinationCountry).toBe('Germany');
  });

  test('buildChatSuggestionsPrompt includes feedback and previous suggestions', () => {
    const prompt = buildChatSuggestionsPrompt({
      question: 'How do I disagree politely?',
      feedback: 'Less generic.',
      previousSuggestions: [{ title: 'General communication advice', topic: 'communication' }],
    });

    expect(prompt).toContain('Less generic.');
    expect(prompt).toContain('General communication advice');
    expect(prompt).toContain('Return exactly 3 distinct suggestions as JSON.');
  });

  test('normalizeChatSuggestionsResponse enforces exactly three suggestions', () => {
    const suggestions = normalizeChatSuggestionsResponse({
      suggestions: [
        { title: 'Workplace tone', topic: 'work', summary: 'A', seedText: 'A seed' },
        { title: 'Direct feedback', topic: 'communication', summary: 'B', seedText: 'B seed' },
        { title: 'Conflict with managers', topic: 'conflict', summary: 'C', seedText: 'C seed' },
      ],
    });

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]?.id).toBeString();
    expect(suggestions[1]?.topic).toBe('communication');
  });

  test('normalizeChatSuggestionsResponse rejects incomplete payloads', () => {
    expect(() => normalizeChatSuggestionsResponse({ suggestions: [{ title: 'Only one' }] })).toThrow(
      'Expected exactly 3 suggestions.',
    );
  });
});
