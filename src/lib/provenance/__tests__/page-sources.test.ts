/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { billPageSources, votePageSources } from '../page-sources';
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
