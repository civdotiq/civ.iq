/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import {
  billPageSources,
  districtPageSources,
  profilePageSources,
  votePageSources,
} from '../page-sources';
import type { DistrictDetails } from '@/lib/districts/district-details';
import type { Bill } from '@/types/bill';
import type { UnifiedVoteDetail } from '@/lib/services/vote.service';

const LOADED = '2026-10-20T13:12:00.000Z';

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: '119-hr-1',
    number: 'H.R. 1',
    title: 'One Big Beautiful Bill Act',
    congress: '119',
    session: '1',
    type: 'hr',
    chamber: 'House',
    status: {
      current: 'enacted',
      lastAction: { date: '2025-07-04', description: 'Became Public Law No: 119-21.' },
      timeline: [],
    },
    sponsor: { representative: {} as Bill['sponsor']['representative'], date: '2025-05-20' },
    cosponsors: [],
    committees: [],
    subjects: [],
    votes: [],
    relatedBills: [],
    introducedDate: '2025-05-20',
    url: 'https://www.congress.gov/bill/119th-congress/house-bill/1',
    lastUpdated: LOADED,
    ...overrides,
  };
}

function makeVote(overrides: Partial<UnifiedVoteDetail> = {}): UnifiedVoteDetail {
  return {
    voteId: '119-house-1-145',
    congress: '119',
    session: '1',
    rollNumber: 145,
    date: '2025-05-22',
    title: 'One Big Beautiful Bill Act',
    question: 'On Passage',
    description: '',
    result: 'Passed',
    chamber: 'House',
    yeas: 215,
    nays: 214,
    present: 1,
    absent: 3,
    totalVotes: 433,
    members: [],
    metadata: {
      source: 'congress-api',
      confidence: 'high',
      processingDate: LOADED,
      xmlUrl: 'https://clerk.house.gov/evs/2025/roll145.xml',
    },
    ...overrides,
  };
}

describe('billPageSources', () => {
  it("dates the Congress.gov row from the record's own update time", () => {
    const [congress] = billPageSources(makeBill({ sourceUpdatedAt: '2026-09-19T23:26:15Z' }));
    expect(congress?.name).toBe('Congress.gov');
    expect(congress?.asOf).toBe('Record updated Sep 19, 2026');
    expect(congress?.fetchedAt).toBe(LOADED);
    expect(congress?.href).toBe('https://www.congress.gov/bill/119th-congress/house-bill/1');
  });

  it('falls back to the latest action, keeping its calendar day', () => {
    const [congress] = billPageSources(makeBill());
    expect(congress?.asOf).toBe('Latest action Jul 4, 2025');
  });

  it('lists CRS, roll calls and CBO only when the bill has them', () => {
    const bare = billPageSources(makeBill()).map(s => s.name);
    expect(bare).not.toContain('CRS bill summary');
    expect(bare).not.toContain('House roll-call votes');
    expect(bare).not.toContain('CBO cost estimates');

    const full = billPageSources(
      makeBill({
        summary: { text: '<p>x</p>', date: '2025-05-22', version: 'Passed House' },
        votes: [
          { voteId: 'a', chamber: 'House', date: '2025-05-22', question: 'q', result: 'Passed' },
          { voteId: 'b', chamber: 'House', date: '2025-07-03', question: 'q', result: 'Passed' },
          { voteId: 'c', chamber: 'Senate', date: '2025-07-01', question: 'q', result: 'Passed' },
        ],
        cboCostEstimates: [
          {
            title: 'a',
            description: 'd',
            url: 'https://www.cbo.gov/publication/1',
            pubDate: '2025-05-20',
          },
          {
            title: 'b',
            description: 'd',
            url: 'https://www.cbo.gov/publication/2',
            pubDate: '2025-06-04',
          },
        ],
      })
    );
    const byName = new Map(full.map(s => [s.name, s]));
    expect(byName.get('CRS bill summary')?.asOf).toBe(
      'Summary of the “Passed House” version, May 22, 2025'
    );
    expect(byName.get('House roll-call votes')?.asOf).toBe('Latest roll call Jul 3, 2025');
    expect(byName.get('Senate roll-call votes')?.asOf).toBe('Latest roll call Jul 1, 2025');
    expect(byName.get('CBO cost estimates')?.asOf).toBe('Latest estimate Jun 4, 2025');
    expect(byName.get('CBO cost estimates')?.href).toBe('https://www.cbo.gov/publication/2');
  });

  it('gives browser-loaded sections no dates', () => {
    const sources = billPageSources(makeBill());
    for (const name of ['USAspending.gov', 'FEC filings', 'Lobbying disclosures (LDA)']) {
      const source = sources.find(s => s.name === name);
      expect(source).toBeDefined();
      expect(source?.asOf).toBeUndefined();
      expect(source?.fetchedAt).toBeUndefined();
    }
  });

  it('gives every source a publisher, license and method link', () => {
    for (const source of billPageSources(makeBill())) {
      expect(source.publisher).toBeTruthy();
      expect(source.license).toBeTruthy();
      expect(source.methodHref).toMatch(/^\/methodology#/);
    }
  });
});

describe('votePageSources', () => {
  it('credits Congress.gov and the Clerk on a House vote, with load times', () => {
    const sources = votePageSources(
      makeVote({ members: [{} as UnifiedVoteDetail['members'][number]] })
    );
    expect(sources.map(s => s.name)).toEqual([
      'Congress.gov',
      'House roll-call votes',
      'congress-legislators',
    ]);
    expect(sources[0]?.asOf).toBe('Vote held May 22, 2025');
    expect(sources[0]?.fetchedAt).toBe(LOADED);
    expect(sources[1]?.href).toBe('https://clerk.house.gov/Votes/2025145');
    expect(sources[2]?.license).toMatch(/CC0/);
  });

  it('shows the mirror sync time, not a load time, for mirrored Senate votes', () => {
    const [senate] = votePageSources(
      makeVote({
        chamber: 'Senate',
        metadata: {
          source: 'senate-corpus-mirror',
          confidence: 'high',
          processingDate: LOADED,
          mirrorSyncedAt: '2026-10-20T08:16:02.000Z',
        },
      })
    );
    expect(senate?.name).toBe('Senate roll-call votes');
    expect(senate?.asOf).toBe('Vote held May 22, 2025 · Mirror last synced Oct 20, 2026');
    expect(senate?.fetchedAt).toBeUndefined();
  });

  it('credits Congress.gov on a Senate vote only when it supplied the summary', () => {
    const senate = { chamber: 'Senate' as const };
    const titleOnly = votePageSources(
      makeVote({ ...senate, bill: { number: 'H.R. 1', title: 't', type: 'hr' } })
    );
    expect(titleOnly.map(s => s.name)).not.toContain('Congress.gov');

    const withSummary = votePageSources(
      makeVote({
        ...senate,
        bill: {
          number: 'H.R. 1',
          title: 't',
          type: 'hr',
          summary: 's',
          url: 'https://api.congress.gov/v3/bill/119/hr/1?format=json',
        },
      })
    );
    const congress = withSummary.find(s => s.name === 'Congress.gov');
    expect(congress?.covers).toBe('Bill summary');
    // An API URL is not a page for readers; fall back to the site.
    expect(congress?.href).toBe('https://www.congress.gov');
  });
});

describe('profilePageSources', () => {
  it('gives a House member one Congress.gov row with the newest vote and bill dates', () => {
    const sources = profilePageSources({
      chamber: 'House',
      voteDates: ['2026-09-16T19:05:00-04:00', '2026-09-10T12:00:00-04:00'],
      billIntroducedDates: ['2026-03-02', '2026-09-16'],
      finance: { lastUpdated: LOADED, coverageEndDate: '2026-09-30' },
    });
    expect(sources.map(s => s.name)).toEqual([
      'congress-legislators',
      'Congress.gov',
      'FEC filings',
      'Lobbying disclosures (LDA)',
      'News headlines',
    ]);
    const congress = sources[1];
    expect(congress?.asOf).toBe(
      'Latest roll call Sep 16, 2026 · Newest bill introduced Sep 16, 2026'
    );
    // Bills and votes come from separate caches: no single load time to claim.
    expect(congress?.fetchedAt).toBeUndefined();
    expect(sources[2]?.asOf).toBe('Filings through Sep 30, 2026');
    expect(sources[2]?.fetchedAt).toBe(LOADED);
  });

  it('credits the Senate for a senator’s votes', () => {
    const names = profilePageSources({ chamber: 'Senate' }).map(s => s.name);
    expect(names).toContain('Senate roll-call votes');
    expect(names).toContain('Congress.gov');
  });

  it('shows no dates while the sections are still loading', () => {
    for (const source of profilePageSources({ chamber: 'House', finance: null })) {
      expect(source.asOf).toBeUndefined();
      expect(source.fetchedAt).toBeUndefined();
    }
  });
});

describe('districtPageSources', () => {
  function makeDistrict(overrides: Partial<DistrictDetails> = {}): DistrictDetails {
    return {
      id: 'mi-12',
      state: 'MI',
      number: '12',
      name: 'MI District 12',
      representative: { name: 'Rashida Tlaib', party: 'Democrat', bioguideId: 'T000481' },
      demographics: {
        population: 770000,
        medianIncome: 50000,
        medianAge: 37,
        diversityIndex: 0,
        urbanPercentage: 0,
        white_percent: 40,
        black_percent: 45,
        hispanic_percent: 7,
        asian_percent: 3,
        poverty_rate: 25,
        bachelor_degree_percent: 25,
      },
      political: {
        cookPVI: 'Data unavailable',
        lastElection: { winner: 'Democrat', margin: 40, turnout: 300000 },
        registeredVoters: 0,
      },
      geography: { area: 200, counties: ['Wayne'], majorCities: ['Detroit'] },
      wikidata: { established: '1913' },
      fetchedAt: LOADED,
      ...overrides,
    };
  }

  it('dates the Census ACS vintage and the live-fetched record', () => {
    const sources = districtPageSources(makeDistrict());
    const acs = sources.find(s => s.name === 'American Community Survey');
    expect(acs?.asOf).toBe('ACS 2018–2022 5-year estimates');
    expect(acs?.fetchedAt).toBe(LOADED);
    expect(sources.find(s => s.name === 'Wikidata')?.fetchedAt).toBe(LOADED);
    // Shipped with the site: a vintage, no load time.
    const medsl = sources.find(s => s.name === 'MEDSL 2024 House returns');
    expect(medsl?.asOf).toBe('2024 general election');
    expect(medsl?.fetchedAt).toBeUndefined();
    expect(medsl?.license).toMatch(/CC0/);
  });

  it('omits sources the page does not show', () => {
    const names = districtPageSources(
      makeDistrict({
        demographics: undefined,
        wikidata: null,
        political: {
          cookPVI: 'Data unavailable',
          lastElection: { winner: 'Data unavailable', margin: 0, turnout: 0 },
          registeredVoters: 0,
        },
      })
    ).map(s => s.name);
    expect(names).not.toContain('American Community Survey');
    expect(names).not.toContain('Wikidata');
    expect(names).not.toContain('MEDSL 2024 House returns');
    expect(names).toContain('USAspending.gov');
  });

  it('claims no load time for a record cached before fetchedAt existed', () => {
    for (const source of districtPageSources(makeDistrict({ fetchedAt: undefined }))) {
      expect(source.fetchedAt).toBeUndefined();
    }
  });
});
