/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  billFallbackCard,
  clip,
  districtCard,
  districtSeatName,
  sponsorLabel,
  stateHubCard,
  voteCard,
  voteFallbackCard,
} from '../page-card-data';
import type { StateHubData } from '@/lib/state-hub/load-state-hub';
import type { EnhancedRepresentative } from '@/types/representative';

describe('clip', () => {
  it('keeps short text and cuts long text at a word', () => {
    expect(clip('Short title', 40)).toBe('Short title');
    expect(clip('An act to provide for reconciliation pursuant to title II', 30)).toBe(
      'An act to provide for…'
    );
  });
});

describe('fallback cards say only what the URL proves', () => {
  it('bill: number and Congress from the slug, no status', () => {
    const card = billFallbackCard('119-hconres-14');
    expect(card.title).toBe('H.Con.Res. 14');
    expect(card.kicker).toBe('Resolution · 119th Congress');
    expect(card.facts).toEqual([]);
  });

  it('vote: chamber, roll number and session from the id', () => {
    const card = voteFallbackCard({
      chamber: 'House',
      congress: '119',
      session: '1',
      rollNumber: '00100',
    });
    expect(card.title).toBe('Roll call 100');
    expect(card.subtitle).toBe('119th Congress, session 1');
    expect(card.sources).toEqual(['House Clerk']);
  });
});

describe('voteCard', () => {
  it('shows the tally and result, with the measure under the question', () => {
    const card = voteCard({
      chamber: 'House',
      congress: '119',
      rollNumber: 100,
      date: '2025-04-10',
      question: 'On Motion to Concur in the Senate Amendment',
      result: 'Passed',
      yeas: 216,
      nays: 214,
      bill: { number: '14', type: 'HCONRES', title: 'Establishing the congressional budget' },
    });
    expect(card.kicker).toBe('House roll call 100 · Apr 10, 2025');
    expect(card.title).toBe('On Motion to Concur in the Senate Amendment');
    expect(card.subtitle).toBe('H.Con.Res. 14 — Establishing the congressional budget');
    expect(card.facts.map(f => f.value)).toEqual(['216', '214', 'Passed']);
  });
});

describe('stateHubCard', () => {
  it('lists seats and party split per chamber, then the next election', () => {
    const hub = {
      legislatureName: 'Michigan Legislature',
      unicameral: false,
      nextElectionYear: 2026,
      chambers: [
        {
          name: 'Senate',
          seats: 38,
          members: [],
          partyCounts: [
            { party: 'Democratic', count: 19 },
            { party: 'Republican', count: 18 },
          ],
        },
      ],
    } as unknown as StateHubData;
    expect(stateHubCard(hub).facts).toEqual([
      { value: '38', label: 'Senate seats', detail: '19 D · 18 R' },
      { value: '2026', label: 'Next election' },
    ]);
  });
});

describe('district cards', () => {
  it('names the seat like the page h1', () => {
    expect(districtSeatName('MI', '12')).toBe('Michigan District 12');
    expect(districtSeatName('AK', 'AL')).toBe('Alaska At-Large');
  });

  it('names the member with a party letter, never a party band', () => {
    const member = {
      name: 'Rashida Tlaib',
      party: 'Democrat',
      currentTerm: { phone: '202-225-5126' },
    } as unknown as EnhancedRepresentative;
    const card = districtCard('MI', '12', { kind: 'member', member });
    expect(card.subtitle).toBe('Represented by Rashida Tlaib (D)');
    expect(card.party).toBeUndefined();
    expect(card.line).toEqual({ label: 'DC office', value: '202-225-5126' });
  });

  it('says a seat is vacant, or unlisted, rather than leaving it blank', () => {
    expect(districtCard('TX', '23', { kind: 'vacant', since: '2026-03-01' }).subtitle).toBe(
      'Vacant since Mar 1, 2026'
    );
    expect(districtCard('TX', '23', { kind: 'unlisted' }).subtitle).toBe(
      'No current member on the congress-legislators roster'
    );
    expect(districtCard('TX', '23', { kind: 'unknown' }).subtitle).toBeUndefined();
  });
});

describe('sponsorLabel', () => {
  it("rewrites Congress.gov's bracketed sponsor name", () => {
    expect(sponsorLabel('Rep. Arrington, Jodey C. [R-TX-19]', 'Republican', 'TX')).toBe(
      'Jodey C. Arrington (R-TX)'
    );
    expect(sponsorLabel('Sen. Sanders, Bernard [I-VT]')).toBe('Bernard Sanders (I-VT)');
  });

  it('tags a plain roster name with party and state', () => {
    expect(sponsorLabel('Jodey Arrington', 'Republican', 'TX')).toBe('Jodey Arrington (R-TX)');
  });
});
