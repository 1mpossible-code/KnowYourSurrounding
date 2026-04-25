import { describe, expect, test } from 'bun:test';

import { buildStarterModulePayload, selectStarterGuides, STARTER_GUIDE_SPECS } from '@/lib/starter-modules';
import { emptyProfileResponse } from '@/lib/profile-api';

describe('starter module payloads', () => {
  test('buildStarterModulePayload sets lockedTopic without extra context text', () => {
    const profile = {
      ...emptyProfileResponse('user-1'),
      exists: true,
      name: 'Alex',
      originCountry: 'Ukraine',
      destinationCountry: 'Germany',
      languageLevel: 'intermediate' as const,
    };
    const transit = STARTER_GUIDE_SPECS[0]!;
    const body = buildStarterModulePayload(profile, 'user-1', transit);
    expect(body.lockedTopic).toBe('transit');
    expect(body.titleHint).toBe('Getting Around (Transit Basics)');
    expect(body.userId).toBe('user-1');
    expect(body.highlightedText).toContain('Topic: transit');
    expect(body).not.toHaveProperty('contextText');
  });

  test('starter spec order and topics are fixed curriculum', () => {
    expect(STARTER_GUIDE_SPECS).toHaveLength(3);
    expect(STARTER_GUIDE_SPECS[0]!.topic).toBe('transit');
    expect(STARTER_GUIDE_SPECS[1]!.topic).toBe('communication');
    expect(STARTER_GUIDE_SPECS[2]!.topic).toBe('public_behavior');
  });

  test('selectStarterGuides chooses unique guides from wantsHelpWith situations', () => {
    const guides = selectStarterGuides([
      'using_public_transit',
      'going_to_doctor',
      'shopping_for_food',
      'job_interviews',
    ]);

    expect(guides.map((guide) => guide.topic)).toEqual(['transit', 'communication', 'public_behavior']);
  });

  test('selectStarterGuides can return fewer than three guides', () => {
    const guides = selectStarterGuides(['using_public_transit']);
    expect(guides.map((guide) => guide.topic)).toEqual(['transit']);
  });
});
