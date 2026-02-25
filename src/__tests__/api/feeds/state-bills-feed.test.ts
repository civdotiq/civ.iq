/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import { generateAtomFeed, createStateBillsFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';

describe('State Bills Feed', () => {
  test('generates valid Atom XML for state bills', () => {
    const config = createStateBillsFeedConfig('CA', 'California');
    const entries: AtomEntry[] = [
      {
        id: 'https://civdotiq.org/state-bills/CA/SB100',
        title: 'SB 100: Education Funding Act',
        link: 'https://openstates.org/ca/bills/2025/SB100/',
        updated: new Date('2025-02-01'),
        published: new Date('2025-01-15'),
        summary: 'Senate | Sponsor: Sen. Smith | Latest: Referred to Committee',
        categories: [{ term: 'state-legislation' }, { term: 'CA' }],
      },
    ];

    const xml = generateAtomFeed(config, entries);

    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
    expect(xml).toContain('California Legislature Bills');
    expect(xml).toContain('SB 100');
    expect(xml).toContain('OpenStates.org');
  });

  test('feed config includes correct self link', () => {
    const config = createStateBillsFeedConfig('NY', 'New York');

    expect(config.id).toContain('/state/NY/bills');
    expect(config.title).toContain('New York');
    expect(config.selfLink).toContain('/api/feed/state/NY/bills');
  });

  test('handles empty entries list', () => {
    const config = createStateBillsFeedConfig('TX', 'Texas');
    const xml = generateAtomFeed(config, []);

    expect(xml).toContain('Texas Legislature Bills');
    expect(xml).toContain('</feed>');
  });
});
