/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Redesigned bill page: every count and entity must drill into its data —
 * no "and N more" the reader can't open, no names that don't link.
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BillDetail } from './BillDetail';
import type { Bill, BillVote } from '@/types/bill';
import type { EnhancedRepresentative } from '@/types/representative';

function rep(i: number, party = 'D'): EnhancedRepresentative {
  return {
    bioguideId: `M${String(i).padStart(6, '0')}`,
    name: `Rep. Member ${i}`,
    party,
    state: 'CA',
    district: String(i),
  } as unknown as EnhancedRepresentative;
}

const senateVote: BillVote = {
  voteId: '119-hconres-89-244',
  chamber: 'Senate',
  date: '2026-09-24',
  question: 'On Passage',
  result: 'Failed',
  rollNumber: 244,
  session: 2,
  votes: { yea: 49, nay: 50, present: 0, notVoting: 1 },
};
const houseVote: BillVote = {
  voteId: '119-hconres-89-282',
  chamber: 'House',
  date: '2026-07-23',
  question: 'On Passage',
  result: 'Passed',
  rollNumber: 282,
  session: 2,
  votes: { yea: 214, nay: 208, present: 0, notVoting: 9 },
};

const subjects = Array.from({ length: 14 }, (_, i) => `Subject ${i + 1}`);

const bill: Bill = {
  id: '119-hconres-89',
  number: 'H.Con.Res. 89',
  title: 'Directing the President to remove United States Armed Forces from hostilities',
  congress: '119',
  session: '2',
  type: 'hconres',
  chamber: 'House',
  status: {
    current: 'failed',
    lastAction: { date: '2026-09-24', description: 'Failed of passage in Senate' },
    timeline: [],
  },
  sponsor: { representative: rep(0), date: '2026-04-23' },
  cosponsors: Array.from({ length: 16 }, (_, i) => ({
    representative: rep(i + 1, i === 9 ? 'R' : 'D'),
    date: '2026-07-22',
  })),
  committees: [
    { committeeId: 'hsfa00', name: 'Foreign Affairs Committee', chamber: 'House', activities: [] },
  ],
  subjects,
  policyArea: 'International Affairs',
  amendments: { count: 3 },
  votes: [senateVote, houseVote],
  relatedBills: [
    {
      id: '118-sconres-12',
      number: 'S.Con.Res. 12',
      title: 'Earlier identical',
      relationship: 'identical',
    },
    // Cached before ids existed — the formatted number must still resolve.
    { number: 'H.Con.Res. 87', title: 'Related resolution', relationship: 'related' },
  ],
  introducedDate: '2026-04-22',
  url: 'https://www.congress.gov/bill/119th-congress/house-concurrent-resolution/89',
  lastUpdated: '2026-09-29',
};

function hrefsOf(name: RegExp): Array<string | null> {
  return screen.getAllByRole('link', { name }).map(a => a.getAttribute('href'));
}

describe('BillDetail drill-down', () => {
  it('lists every cosponsor behind a working toggle, each linked to their profile', () => {
    render(<BillDetail bill={bill} />);
    const panel = document.getElementById('cosponsors');
    expect(panel).not.toBeNull();
    const scope = within(panel as HTMLElement);

    expect(scope.getAllByRole('link', { name: /Rep\. Member/ })).toHaveLength(10);
    fireEvent.click(scope.getByRole('button', { name: 'Show all 16 co-sponsors' }));
    const links = scope.getAllByRole('link', { name: /Rep\. Member/ });
    expect(links).toHaveLength(16);
    expect(links[15]).toHaveAttribute('href', '/representative/M000016');
    expect(scope.getByRole('button', { name: 'Show fewer co-sponsors' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('links the sponsor wherever the name appears', () => {
    render(<BillDetail bill={bill} />);
    expect(hrefsOf(/^Rep\. Member 0$/)).toEqual([
      '/representative/M000000',
      '/representative/M000000',
    ]);
  });

  it('links every roll call to its own chamber, and the final vote stat to its page', () => {
    render(<BillDetail bill={bill} />);
    expect(hrefsOf(/roll call \d+/)).toEqual(['/vote/senate-119-2-244', '/vote/house-119-2-282']);
    expect(screen.getByRole('link', { name: /Final vote/ })).toHaveAttribute(
      'href',
      '/vote/senate-119-2-244'
    );
    expect(screen.getByRole('link', { name: /Every member's vote/ })).toHaveAttribute(
      'href',
      '/vote/senate-119-2-244'
    );
  });

  it('shows every subject behind a toggle — no dead "+N more" chip', () => {
    render(<BillDetail bill={bill} />);
    expect(screen.queryByText('Subject 13')).not.toBeInTheDocument();
    expect(screen.queryByText(/^\+\d+ more$/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all 14 subjects' }));
    expect(screen.getByText('Subject 14')).toBeInTheDocument();
  });

  it('links policy area, committees, and amendments to where their data lives', () => {
    render(<BillDetail bill={bill} />);
    expect(screen.getByRole('link', { name: 'International Affairs' })).toHaveAttribute(
      'href',
      '/ask/topic-bills/international-affairs'
    );
    expect(screen.getByRole('link', { name: 'Foreign Affairs Committee' })).toHaveAttribute(
      'href',
      '/committee/hsfa00'
    );
    expect(screen.getByRole('link', { name: /Amendments/ })).toHaveAttribute(
      'href',
      `${bill.url}/amendments`
    );
    expect(screen.getByRole('link', { name: 'S.Con.Res. 12 (118th)' })).toHaveAttribute(
      'href',
      '/bill/118-sconres-12'
    );
    expect(screen.getByRole('link', { name: 'H.Con.Res. 87' })).toHaveAttribute(
      'href',
      '/bill/119-hconres-87'
    );
    expect(screen.getByRole('link', { name: '← Legislation' })).toHaveAttribute(
      'href',
      '/legislation'
    );
  });
});
