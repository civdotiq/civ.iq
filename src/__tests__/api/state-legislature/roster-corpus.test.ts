/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Rosters now come from the committed corpus (PLAN-openstates-corpus-2026-08.md)
 * rather than the OpenStates `/people` endpoint. These cover the two things the
 * swap had to get right: that no roster costs an API request any more, and that
 * none of the July/August data-integrity fixes regressed in the process —
 * executives kept out of chamber counts, seat counts from NCSL rather than
 * roster length, and the unicameral bodies intact.
 */

import { GET } from '@/app/api/state-legislature/[state]/route';
import { createMockRequest } from '../../utils/test-helpers';
import { currentChamberRole } from '@/lib/data-sources/openstates-people/build-corpus';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import type { CorpusPerson } from '@/lib/data-sources/openstates-people/people-corpus';

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher()),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

jest.mock('@/lib/monitoring/telemetry', () => ({
  monitorExternalApi: jest.fn(() => ({ end: jest.fn() })),
}));

const jurisdictionResponse = {
  name: 'Michigan',
  legislative_sessions: [
    { identifier: '2025-2026', name: '2025-2026 Regular Session', start_date: '2025-01-08' },
  ],
};

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(jurisdictionResponse),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** Every OpenStates URL the route requested during a call. */
function requestedUrls(): string[] {
  return fetchMock.mock.calls.map(call => String(call[0]));
}

async function getState(state: string) {
  const request = createMockRequest(`http://localhost:3000/api/state-legislature/${state}`);
  const response = await GET(request, { params: Promise.resolve({ state }) });
  return { response, data: await response.json() };
}

describe('roster corpus', () => {
  it('serves a full roster without calling the OpenStates people endpoint', async () => {
    const { response, data } = await getState('MI');

    expect(response.status).toBe(200);
    expect(data.legislators.length).toBe(148);
    // The whole point of the corpus: New Hampshire alone used to cost 9 of
    // these against a 1,000/day cap.
    expect(requestedUrls().some(url => url.includes('/people'))).toBe(false);
  });

  it('reports NCSL seat counts and the corrected Michigan House split', async () => {
    const { data } = await getState('MI');

    // Roster length is 110 here too, but it is reported separately on purpose:
    // it drifts from the real chamber size and must never become the seat count.
    expect(data.chambers.lower.totalSeats).toBe(110);
    expect(data.chambers.lower.membersListed).toBe(110);
    expect(data.chambers.lower.democraticSeats).toBe(52);
    expect(data.chambers.lower.republicanSeats).toBe(58);
    expect(data.chambers.upper.totalSeats).toBe(38);
    expect(data.rosterComplete).toBe(true);
  });

  it('keeps statewide executives out of the chamber roster', async () => {
    const { data } = await getState('MI');

    // The Governor, Lt. Governor, Attorney General and Secretary of State
    // share the jurisdiction feed and were once counted as House Democrats,
    // publishing a D56-R58 split for a chamber that is D52-R58.
    const names = data.legislators.map((leg: { name: string }) => leg.name);
    expect(names).not.toContain('Gretchen Whitmer');
    expect(names).not.toContain('Garlin Gilchrist');
    expect(names).not.toContain('Dana Nessel');
    expect(names).not.toContain('Jocelyn Benson');
    expect(data.legislators.filter((l: { district: string }) => l.district === 'Unknown')).toEqual(
      []
    );
  });

  it('keeps Nebraska unicameral and flags its nonpartisan ballot', async () => {
    const { data } = await getState('NE');

    expect(data.isUnicameral).toBe(true);
    expect(data.legislators.length).toBe(49);
    expect(data.chambers.upper.totalSeats).toBe(49);
    expect(data.chambers.upper.membersListed).toBe(49);
    // Elected on a nonpartisan ballot, so a party split would be fabricated.
    expect(data.chambers.upper.partyDataAvailable).toBe(false);
  });

  it('reaches the DC Council and shows any vacancy rather than padding it', async () => {
    const { data } = await getState('DC');

    // Roster counts are derived from the committed corpus, never hard-coded:
    // the refresh workflow commits with [skip ci], so a literal here rots
    // silently and then fails CI on the next unrelated push. Seat totals stay
    // literal — they come from NCSL, not the corpus.
    const corpusCount = (await getJurisdictionRoster('DC'))?.length ?? -1;

    expect(data.isUnicameral).toBe(true);
    expect(data.chambers.lower.totalSeats).toBe(13);
    expect(data.legislators.length).toBe(corpusCount);
    expect(data.chambers.lower.membersListed).toBe(corpusCount);
    expect(data.chambers.lower.membersListed).toBeLessThanOrEqual(13);
  });

  it('serves New Hampshire, previously nine API requests, with its real vacancies', async () => {
    const { data } = await getState('NH');

    const roster = (await getJurisdictionRoster('NH')) ?? [];
    const lowerCount = roster.filter(person => chamberBucket(person) === 'lower').length;
    const upperCount = roster.filter(person => chamberBucket(person) === 'upper').length;

    expect(data.chambers.lower.totalSeats).toBe(400);
    expect(data.chambers.lower.membersListed).toBe(lowerCount);
    expect(data.chambers.lower.membersListed).toBeLessThanOrEqual(400);
    expect(data.chambers.upper.membersListed).toBe(upperCount);
    // NH always carries vacancies mid-session; a full 400 would mean the
    // route padded the roster to the seat count.
    expect(data.chambers.lower.membersListed).toBeLessThan(400);
    expect(requestedUrls().some(url => url.includes('/people'))).toBe(false);
  });
});

describe('currentChamberRole', () => {
  const asOf = '2026-08-06';

  it('takes the open role and ignores ended ones', () => {
    const role = currentChamberRole(
      {
        roles: [
          { type: 'lower', district: '1', start_date: '2015-01-20', end_date: '2023-01-16' },
          { type: 'upper', district: '7', start_date: '2023-01-17' },
        ],
      },
      asOf
    );
    expect(role?.type).toBe('upper');
  });

  it('does not let a role with no start date outrank a real one', () => {
    // Sorting by start_date was the obvious rule and the wrong one: upstream
    // routinely omits it, and a missing date must not win.
    const role = currentChamberRole(
      {
        roles: [
          { type: 'lower', district: '3', start_date: '2025-01-21' },
          { type: 'upper', district: '9', end_date: '2023-01-17' },
        ],
      },
      asOf
    );
    expect(role?.type).toBe('lower');
  });

  it('falls back to a future-dated role when none is open', () => {
    const role = currentChamberRole(
      { roles: [{ type: 'upper', district: '2', end_date: '2027-01-01' }] },
      asOf
    );
    expect(role?.type).toBe('upper');
  });

  it('reports no role once every seat has ended', () => {
    expect(
      currentChamberRole({ roles: [{ type: 'lower', end_date: '2026-07-01' }] }, asOf)
    ).toBeNull();
  });

  it('ignores non-chamber roles a legislator may also hold', () => {
    // Three sitting California members carry a former mayoral role.
    expect(currentChamberRole({ roles: [{ type: 'mayor' }] }, asOf)).toBeNull();
    expect(
      currentChamberRole({ roles: [{ type: 'mayor' }, { type: 'lower', district: '4' }] }, asOf)
        ?.type
    ).toBe('lower');
  });
});

describe('chamberBucket', () => {
  const person = (chamber: CorpusPerson['chamber'], jurisdiction: string): CorpusPerson =>
    ({ chamber, jurisdiction }) as CorpusPerson;

  it('sorts unicameral members by the title their members hold', () => {
    // Nebraska's 49 are senators; DC's councilmembers are not.
    expect(chamberBucket(person('legislature', 'NE'))).toBe('upper');
    expect(chamberBucket(person('legislature', 'DC'))).toBe('lower');
  });

  it('passes bicameral members through unchanged', () => {
    expect(chamberBucket(person('upper', 'MI'))).toBe('upper');
    expect(chamberBucket(person('lower', 'MI'))).toBe('lower');
  });
});
