/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State legislator profiles must be crawl-safe (PLAN-search-growth Phase 2).
 *
 * 7,420 profiles go into the sitemap. OpenStates allows 1,000 requests a day,
 * and a profile render used to make up to five (a paged /bills sponsor query,
 * plus /people on a corpus miss), so one crawl would exhaust the quota and
 * blank the state surface for real visitors. These tests fail on ANY request
 * to openstates.org from the page's server path.
 */

import StateLegislatorPage, {
  generateMetadata,
} from '@/app/(civic)/state-legislature/[state]/legislator/[id]/page';
import LegacyStateLegislatorRoute from '@/app/(civic)/representative/state/[state]/[...legislatorId]/page';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import type { CorpusPerson } from '@/lib/data-sources/openstates-people/people-corpus';
import { buildStateLegislatorUrl } from '@/lib/helpers/url-builders';
import { encodeBase64Url } from '@/lib/url-encoding';
import { openStatesAPI } from '@/lib/openstates-api';

jest.mock('@/services/cache', () => ({
  govCache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

let fetchMock: jest.Mock;

beforeEach(() => {
  // Census and Wikipedia enrichment may call out; they get a 404. OpenStates
  // must never be asked at all.
  fetchMock = jest.fn(async (url: unknown) =>
    String(url).includes('openstates.org')
      ? {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({ results: [], pagination: { max_page: 1 } }),
          text: async () => '{"results":[]}',
        }
      : { ok: false, status: 404, json: async () => ({}), text: async () => '' }
  );
  global.fetch = fetchMock as unknown as typeof fetch;
});

function openStatesCalls(): string[] {
  return fetchMock.mock.calls
    .map(call => String(call[0]))
    .filter(u => u.includes('openstates.org'));
}

/** Next's redirect()/notFound() throw; read where they were going. */
async function thrown(fn: () => Promise<unknown>): Promise<{ digest?: string }> {
  try {
    await fn();
  } catch (error) {
    return error as { digest?: string };
  }
  throw new Error('expected a redirect or notFound');
}

let member: CorpusPerson;
let slugPath: string;

beforeAll(async () => {
  const roster = await getJurisdictionRoster('MI');
  const withOffice = roster?.find(p => p.office && p.startDate && p.phone);
  if (!withOffice) throw new Error('corpus has no Michigan member with an office');
  member = withOffice;
  slugPath = buildStateLegislatorUrl('MI', member.id, member.name);
});

describe('state legislator profile: zero OpenStates calls', () => {
  it('control: the harness does see a live OpenStates request', async () => {
    // The API client's own corpus-miss fallback goes live. If this stops
    // registering, every zero-call assertion below is vacuous.
    await openStatesAPI
      .getPersonById('ocd-person/00000000-0000-4000-8000-000000000000')
      .catch(() => null);
    expect(openStatesCalls().length).toBeGreaterThan(0);
  });

  it('resolves a sitting member from the corpus alone, with office and term start', async () => {
    const legislator = await StateLegislatureCoreService.getStateLegislatorById('MI', member.id);

    expect(openStatesCalls()).toEqual([]);
    expect(legislator?.name).toBe(member.name);
    expect(legislator?.contact?.capitolOffice?.address).toBe(member.office);
    expect(legislator?.terms?.[0]?.startYear).toBe(member.startDate.slice(0, 4));
    // Bill counts are a browser fetch now, never part of the server profile.
    expect(legislator?.legislation).toBeUndefined();
  });

  it('returns null for an id the corpus does not hold, without asking the API', async () => {
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      'MI',
      'ocd-person/00000000-0000-4000-8000-000000000000'
    );
    expect(legislator).toBeNull();
    expect(openStatesCalls()).toEqual([]);
  });

  it('renders the page and its metadata at the readable URL', async () => {
    const segment = slugPath.split('/').pop() ?? '';
    const props = { params: Promise.resolve({ state: 'mi', id: segment }) };

    const metadata = await generateMetadata(props);
    const page = await StateLegislatorPage(props);

    expect(page).toBeTruthy();
    expect(String(metadata.title)).toContain(member.name);
    expect(metadata.alternates?.canonical).toBe(`https://civdotiq.org${slugPath}`);
    expect(openStatesCalls()).toEqual([]);
  });

  it('308s the legacy base64 URL to the readable one', async () => {
    const error = await thrown(() =>
      StateLegislatorPage({
        params: Promise.resolve({ state: 'mi', id: encodeBase64Url(member.id) }),
      })
    );
    expect(error.digest).toContain(`;${slugPath};308`);
    expect(openStatesCalls()).toEqual([]);
  });

  it('404s an unknown slug without asking the API', async () => {
    const error = await thrown(() =>
      StateLegislatorPage({
        params: Promise.resolve({ state: 'mi', id: 'nobody-00000000' }),
      })
    );
    expect(error.digest).toContain('404');
    expect(openStatesCalls()).toEqual([]);
  });

  it('forwards the old /representative/state/ route with no API call', async () => {
    const error = await thrown(() =>
      LegacyStateLegislatorRoute({
        params: Promise.resolve({ state: 'MI', legislatorId: member.id.split('/') }),
      })
    );
    expect(error.digest).toContain(`;${slugPath};308`);
    expect(openStatesCalls()).toEqual([]);
  });
});
