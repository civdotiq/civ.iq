/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import { civicEventToNote, wrapInCreate } from '@/lib/activitypub/outbox';
import type { CivicEvent } from '@/types/nostr';

describe('ActivityPub Outbox', () => {
  const mockEvent: CivicEvent = {
    type: 'bill-action',
    id: 'hr123-119-action-2025-02-20',
    timestamp: 1740067200,
    title: 'H.R. 123: Referred to Committee',
    summary: 'A bill to improve infrastructure — Referred to Committee on Transportation.',
    tags: ['legislation', 'house', 'hr123'],
    source: {
      url: 'https://congress.gov/bill/119th-congress/house-bill/123',
      api: 'congress.gov',
    },
    data: {
      billId: 'hr123-119',
      billType: 'hr',
      billNumber: '123',
      congress: 119,
      actionText: 'Referred to Committee on Transportation',
      actionDate: '2025-02-20',
      chamber: 'House',
    },
  };

  test('converts civic event to ActivityPub Note', () => {
    const note = civicEventToNote(mockEvent);

    expect(note.type).toBe('Note');
    expect(note.id).toContain(mockEvent.id);
    expect(note.content).toContain('H.R. 123');
    expect(note.content).toContain('Referred to Committee');
    expect(note.url).toBe(mockEvent.source.url);
    expect(note.to).toContain('https://www.w3.org/ns/activitystreams#Public');
    expect(note.tag).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'Hashtag', name: '#civictech' })])
    );
  });

  test('note has source for plain-text clients', () => {
    const note = civicEventToNote(mockEvent);

    expect(note.source).toBeDefined();
    expect(note.source?.mediaType).toBe('text/plain');
    expect(note.source?.content).toContain('H.R. 123');
  });

  test('wraps note in Create activity', () => {
    const note = civicEventToNote(mockEvent);
    const create = wrapInCreate(note);

    expect(create['@context']).toBe('https://www.w3.org/ns/activitystreams');
    expect(create.type).toBe('Create');
    expect(create.id).toContain('/activity');
    expect(create.object).toBe(note);
    expect(create.published).toBe(note.published);
    expect(create.to).toEqual(note.to);
  });

  test('escapes HTML in content', () => {
    const eventWithHtml: CivicEvent = {
      ...mockEvent,
      title: 'Bill <script>alert("xss")</script>',
      summary: 'Summary with & special <chars>',
    };

    const note = civicEventToNote(eventWithHtml);

    expect(note.content).not.toContain('<script>');
    expect(note.content).toContain('&lt;script&gt;');
    expect(note.content).toContain('&amp;');
  });

  test('generates hashtags from event tags', () => {
    const note = civicEventToNote(mockEvent);

    const tagNames = note.tag.map(t => t.name);
    expect(tagNames).toContain('#legislation');
    expect(tagNames).toContain('#house');
    expect(tagNames).toContain('#hr123');
    expect(tagNames).toContain('#civictech');
  });
});
