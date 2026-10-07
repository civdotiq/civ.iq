/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * The co-sponsorship network matched sponsors to the roster by name, but
 * OpenStates often names a sponsor by bare surname ("Rogers"), so every bill
 * read as uninvolved and production reported 0 sponsored / 0 cosponsored for
 * members with 50+ bills (CA, MN, WI on 2026-10-07). Sponsors now match on the
 * linked person id. A stalled OpenStates must end in a 503, not a 504.
 */

import type { NextRequest } from 'next/server';
import { GET } from '@/app/api/state-legislature/[state]/legislator/[id]/network/route';
import { openStatesAPI, OpenStatesTimeoutError } from '@/lib/openstates-api';
import type { OpenStatesBill } from '@/lib/openstates-api';

// The global jest.setup mock of next/server drops headers; these tests read
// status, headers, and body.
jest.mock('next/server', () => {
  const respond = (body: string, init?: { status?: number; headers?: HeadersInit }) => ({
    status: init?.status ?? 200,
    headers: new Headers(init?.headers),
    json: async () => JSON.parse(body),
  });
  return {
    NextResponse: {
      json: (data: unknown, init?: { status?: number; headers?: HeadersInit }) =>
        respond(JSON.stringify(data), init),
    },
  };
});

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const ROGERS = 'ocd-person/84a80bdb-37d5-4f52-8f55-e116fb97ca58';
const HURTADO = 'ocd-person/ee9910a2-0b27-46e0-be87-43c800596b41';
const DAHLE = 'ocd-person/dahle-test';

const ctx = {
  params: Promise.resolve({ state: 'CA', id: Buffer.from(ROGERS).toString('base64url') }),
};
const request = {} as NextRequest;

/** [name, linked person id (undefined = unlinked), party, primary] */
type Sponsor = [string, string | undefined, string | undefined, boolean];

function bill(id: string, sponsors: Sponsor[]): OpenStatesBill {
  return {
    id,
    identifier: id,
    title: `Bill ${id}`,
    sponsorships: sponsors.map(([name, personId, party, primary]) => ({
      name,
      personId,
      party,
      primary,
      entity_type: 'person',
      classification: primary ? 'author' : 'coauthor',
    })),
  } as OpenStatesBill;
}

describe('GET /api/state-legislature/[state]/legislator/[id]/network', () => {
  beforeEach(() => {
    jest.spyOn(openStatesAPI, 'getPersonById').mockResolvedValue({
      id: ROGERS,
      name: 'Chris Rogers',
      party: 'Democratic',
      chamber: 'lower',
    } as Awaited<ReturnType<typeof openStatesAPI.getPersonById>>);
    // The roster carries full names; the sponsorships below carry surnames.
    jest.spyOn(openStatesAPI, 'getLegislators').mockResolvedValue([
      { id: ROGERS, name: 'Chris Rogers', party: 'Democratic' },
      { id: HURTADO, name: 'Melissa Hurtado', party: 'Democratic' },
      { id: DAHLE, name: 'Megan Dahle', party: 'Republican' },
    ] as Awaited<ReturnType<typeof openStatesAPI.getLegislators>>);
  });
  afterEach(() => jest.restoreAllMocks());

  it('counts bills whose sponsors are named by surname alone', async () => {
    jest.spyOn(openStatesAPI, 'getBillsBySponsor').mockResolvedValue([
      bill('AB 1', [
        ['Rogers', ROGERS, 'Democratic', true],
        ['Dahle', DAHLE, 'Republican', false],
      ]),
      bill('AB 2', [
        ['Hurtado', HURTADO, 'Democratic', true],
        ['Rogers', ROGERS, 'Democratic', false],
      ]),
    ]);

    const response = await GET(request, ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.network.summary).toMatchObject({
      totalBillsSponsored: 1,
      totalBillsCosponsored: 1,
      uniqueCollaborators: 2,
      bipartisanCollaborations: 1,
    });
  });

  it('never merges unresolvable sponsors into one invented collaborator', async () => {
    // OpenStates leaves some sponsorships unlinked, and a bare surname shared
    // by two members (MN has two Xiongs) cannot be resolved by name either.
    jest.spyOn(openStatesAPI, 'getBillsBySponsor').mockResolvedValue([
      bill('AB 3', [
        ['Rogers', ROGERS, 'Democratic', true],
        ['Hurtado', HURTADO, 'Democratic', false],
        ['Xiong', undefined, undefined, false],
        ['Nelson', undefined, undefined, false],
      ]),
    ]);

    const response = await GET(request, ctx);
    const body = await response.json();

    expect(body.network.summary.uniqueCollaborators).toBe(1);
    expect(
      body.network.frequentCollaborators.map((c: { legislatorId: string }) => c.legislatorId)
    ).toEqual([HURTADO]);
  });

  it('answers an uncached 503 when OpenStates times out', async () => {
    jest
      .spyOn(openStatesAPI, 'getBillsBySponsor')
      .mockRejectedValue(new OpenStatesTimeoutError('/bills'));

    const response = await GET(request, ctx);

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it('gives the bills read a budget measured from the route start', async () => {
    const spy = jest.spyOn(openStatesAPI, 'getBillsBySponsor').mockResolvedValue([]);

    await GET(request, ctx);

    const budget = spy.mock.calls[0]?.[4];
    expect(budget).toBeGreaterThan(20_000);
    expect(budget).toBeLessThanOrEqual(25_000);
  });
});
