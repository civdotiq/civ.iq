/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import sitemap from '@/app/sitemap';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';

/** Same match the /state-districts/[state]/[chamber]/[district] page does. */
async function seatedMembers(state: string, chamber: string, district: string) {
  const roster = (await getJurisdictionRoster(state)) ?? [];
  return roster.filter(p => chamberBucket(p) === chamber && p.district === district).length;
}

describe('sitemap state-district URLs', () => {
  beforeAll(() => {
    // Live API sections of the sitemap degrade to nothing; the state-district
    // section reads only the committed roster corpus.
    global.fetch = jest.fn(async () => {
      throw new Error('network disabled in test');
    }) as unknown as typeof fetch;
  });

  it('lists only districts that have a seated legislator', async () => {
    const urls = (await sitemap())
      .map(e => e.url)
      .filter(u => u.includes('/state-districts/') && u.split('/').length === 7);

    expect(urls.length).toBeGreaterThan(90);
    const empty: string[] = [];
    for (const url of urls) {
      const [state, chamber, district] = url.split('/').slice(-3);
      if (
        (await seatedMembers(state!.toUpperCase(), chamber!, decodeURIComponent(district!))) === 0
      ) {
        empty.push(url);
      }
    }
    expect(empty).toEqual([]);
    // Nebraska is unicameral: no lower-chamber URL at all.
    expect(urls.some(u => u.includes('/state-districts/ne/lower/'))).toBe(false);
  }, 60000);
});
