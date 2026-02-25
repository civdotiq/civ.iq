/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import { generateAtomFeed, createStateLegislatorFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';

describe('State Legislator Feed', () => {
  test('generates valid Atom XML for legislator activity', () => {
    const config = createStateLegislatorFeedConfig('CA', 'test-id', 'Sen. Smith');
    const entries: AtomEntry[] = [
      {
        id: 'https://civdotiq.org/state-bills/CA/AB200',
        title: 'AB 200: Climate Action Plan',
        link: 'https://openstates.org/ca/bills/2025/AB200/',
        updated: new Date('2025-02-10'),
        author: { name: 'Sen. Smith' },
        summary: 'Passed Assembly',
        categories: [{ term: 'state-legislation' }, { term: 'CA' }],
      },
    ];

    const xml = generateAtomFeed(config, entries);

    expect(xml).toContain('Sen. Smith');
    expect(xml).toContain('AB 200');
    expect(xml).toContain('Climate Action Plan');
    expect(xml).toContain('OpenStates.org');
  });

  test('feed config includes legislator name in title', () => {
    const config = createStateLegislatorFeedConfig('NY', 'abc123', 'Asm. Jones');

    expect(config.title).toContain('Asm. Jones');
    expect(config.title).toContain('NY');
    expect(config.selfLink).toContain('/api/feed/state/NY/legislator/abc123');
  });

  test('handles empty sponsored bills', () => {
    const config = createStateLegislatorFeedConfig('TX', 'test-id', 'Rep. Garcia');
    const xml = generateAtomFeed(config, []);

    expect(xml).toContain('Rep. Garcia');
    expect(xml).toContain('</feed>');
  });
});
