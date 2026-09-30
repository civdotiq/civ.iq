/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * "Who is my state representative in [State]?" hubs (PLAN-search-growth
 * Phase 3). They must put the question, the lookup form and a link to every
 * sitting member into server HTML, and must build from committed data alone:
 * any fetch at all fails these tests, so a crawl of the 52 hubs can never
 * spend OpenStates quota.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import StateLegislatureRoute, {
  generateMetadata,
} from '@/app/(civic)/state-legislature/[state]/page';
import StateOverviewRoute from '@/app/(civic)/states/[state]/page';
import { StateHubPage } from '@/components/state-hub/StateHubPage';
import { loadStateHub } from '@/lib/state-hub/load-state-hub';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import { buildStateLegislatorUrl } from '@/lib/helpers/url-builders';

jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  usePathname: () => '/state-legislature/mi',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useParams: () => ({ state: 'mi' }),
}));

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn(async () => {
    throw new Error('hub render must not fetch');
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  expect(fetchMock).not.toHaveBeenCalled();
});

const HUB_CODES = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
  'PR',
];

async function notFoundDigest(fn: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await fn();
  } catch (error) {
    return (error as { digest?: string }).digest;
  }
  return undefined;
}

describe('state legislature hubs', () => {
  it.each(HUB_CODES)('%s renders the question, the lookup and every member', async code => {
    const data = await loadStateHub(code.toLowerCase());
    expect(data).not.toBeNull();
    if (!data) return;

    const roster = (await getJurisdictionRoster(code)) ?? [];
    expect(data.memberCount).toBe(roster.length);

    const html = renderToStaticMarkup(<StateHubPage data={data} />);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toContain(data.copy.h1.replace(/'/g, '&#x27;'));
    expect(html).toContain('name="street"');

    for (const person of roster) {
      expect(html).toContain(`href="${buildStateLegislatorUrl(code, person.id, person.name)}"`);
    }
  });

  it('titles the page with the searched question', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ state: 'mi' }),
      searchParams: Promise.resolve({}),
    });
    expect(meta.title).toBe('Who Is My Michigan State Representative?');
    expect(meta.alternates?.canonical).toBe('https://civdotiq.org/state-legislature/mi');
  });

  it('gives Nebraska and DC their own chamber wording', async () => {
    const ne = await loadStateHub('ne');
    expect(ne?.chambers).toHaveLength(1);
    expect(ne?.chambers[0]).toMatchObject({ name: 'Legislature', roleTitle: 'State Senator' });

    const dc = await loadStateHub('dc');
    expect(dc?.chambers).toHaveLength(1);
    expect(dc?.chambers[0]).toMatchObject({ name: 'Council', roleTitle: 'Councilmember' });
  });

  it('marks multi-member chambers so the copy and lookup list everyone', async () => {
    const az = await loadStateHub('az');
    expect(az?.chambers.find(c => c.key === 'lower')?.hasMultiMemberDistricts).toBe(true);
    const mi = await loadStateHub('mi');
    expect(mi?.chambers.some(c => c.hasMultiMemberDistricts)).toBe(false);
  });

  it.each(['zz', 'gu', 'michigan', 'm1'])('404s for %s', async state => {
    expect(await loadStateHub(state)).toBeNull();
    const digest = await notFoundDigest(() =>
      StateLegislatureRoute({
        params: Promise.resolve({ state }),
        searchParams: Promise.resolve({}),
      })
    );
    expect(digest).toMatch(/404|NOT_FOUND/);
  });
});

describe('/states/[state]', () => {
  it('404s for anything that is not a two-letter code', async () => {
    const digest = await notFoundDigest(() =>
      StateOverviewRoute({
        params: Promise.resolve({ state: 'zz' }),
        searchParams: Promise.resolve({}),
      })
    );
    expect(digest).toMatch(/404|NOT_FOUND/);
  });
});
