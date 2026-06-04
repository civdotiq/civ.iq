/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for VotingRecordAnswer — the pod renderer for the
 * /ask/voting-record/[id] page.
 *
 * These tests lock in the citizen-legibility invariants:
 * - Stats are always qualified as sample-scoped — never presented as session
 *   totals ("Missed vote rate 0%" on a 20-row sample would misrepresent a
 *   representative who has missed dozens of session votes).
 * - Duplicate bill titles are disambiguated by the vote's question so "RED
 *   Tape Act — Nay" followed by "RED Tape Act — Yea" is not confusing.
 * - Unique bill titles keep their title only (no noisy question suffix).
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VotingRecordAnswer } from '@/components/questions/VotingRecordAnswer';

type Vote = {
  voteId: string;
  bill?: { number?: string; title?: string; congress?: number; type?: string };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
};

function makeVote(overrides: Partial<Vote> = {}): Vote {
  return {
    voteId: overrides.voteId ?? 'h2026-1',
    bill: overrides.bill,
    question: overrides.question ?? 'On passage',
    result: overrides.result ?? 'Passed',
    date: overrides.date ?? '2026-03-01',
    position: overrides.position ?? 'Yea',
  };
}

describe('VotingRecordAnswer', () => {
  it('qualifies "Missed" stat label as sample-scoped, not session-total', () => {
    const votes = Array.from({ length: 20 }, (_, i) =>
      makeVote({ voteId: `h2026-${i}`, position: i === 0 ? 'Not Voting' : 'Yea' })
    );

    render(<VotingRecordAnswer votes={{ votes, totalResults: 20 }} bills={null} />);

    // The unqualified "Missed vote rate" label implies session-wide stats —
    // a 0.0% on a 20-vote sample would lie about members who missed dozens.
    expect(screen.queryByText(/^Missed vote rate$/i)).not.toBeInTheDocument();
    // Accept any label that scopes the number to the sample (e.g., "Missed in last 20").
    expect(screen.getByText(/missed.*last\s+20/i)).toBeInTheDocument();
    // Sample-scope sentence introduces the stats block.
    expect(screen.getByText(/in the last 20 recorded votes/i)).toBeInTheDocument();
  });

  it('renders no session-total "Total votes" stat derived from the sample', () => {
    const votes = Array.from({ length: 20 }, (_, i) => makeVote({ voteId: `h2026-${i}` }));

    render(<VotingRecordAnswer votes={{ votes, totalResults: 20 }} bills={null} />);

    // Unqualified "Total votes: 20" would misrepresent session activity.
    expect(screen.queryByText(/^total votes$/i)).not.toBeInTheDocument();
  });

  it('disambiguates duplicate bill titles by appending the vote question', () => {
    const votes = [
      makeVote({
        voteId: 'h2026-recommit',
        bill: { number: '101', title: 'RED Tape Act', type: 'HR', congress: 119 },
        question: 'On motion to recommit',
        position: 'Nay',
      }),
      makeVote({
        voteId: 'h2026-passage',
        bill: { number: '101', title: 'RED Tape Act', type: 'HR', congress: 119 },
        question: 'On passage',
        position: 'Yea',
      }),
    ];

    render(<VotingRecordAnswer votes={{ votes, totalResults: 2 }} bills={null} />);

    expect(screen.getByText(/RED Tape Act \(On motion to recommit\)/)).toBeInTheDocument();
    expect(screen.getByText(/RED Tape Act \(On passage\)/)).toBeInTheDocument();
  });

  it('leaves single-occurrence bill titles unchanged (no question suffix)', () => {
    const votes = [
      makeVote({
        voteId: 'h2026-unique',
        bill: { number: '42', title: 'Clean Water Act Amendments', type: 'HR', congress: 119 },
        question: 'On passage',
      }),
    ];

    render(<VotingRecordAnswer votes={{ votes, totalResults: 1 }} bills={null} />);

    // The bare title renders without the "(On passage)" suffix when unique.
    const link = screen.getByRole('link', { name: /clean water act amendments/i });
    expect(link.textContent?.trim()).toBe('Clean Water Act Amendments');
  });

  it('links recent-vote bills to the canonical slug, not the bare number (404 regression)', () => {
    const votes = [
      makeVote({
        voteId: 'h2026-8814',
        bill: { number: '8814', title: 'HUD Data Privacy Act', type: 'HR', congress: 119 },
        question: 'On passage',
      }),
    ];

    render(<VotingRecordAnswer votes={{ votes, totalResults: 1 }} bills={null} />);

    const link = screen.getByRole('link', { name: /HUD Data Privacy Act/ });
    expect(link).toHaveAttribute('href', '/bill/119-hr-8814');
  });

  it('links the "Most recent bill" to the canonical slug, not the bare id (404 regression)', () => {
    render(
      <VotingRecordAnswer
        votes={null}
        bills={{
          sponsored: [
            {
              id: '8814',
              number: '8814',
              type: 'HR',
              congress: 119,
              title: 'HUD Data Privacy Act of 2026',
            },
          ],
          cosponsored: [],
          totalSponsored: 1,
          totalCosponsored: 0,
        }}
      />
    );

    const link = screen.getByRole('link', { name: /HUD Data Privacy Act/ });
    expect(link).toHaveAttribute('href', '/bill/119-hr-8814');
  });

  it('renders cosponsored count as "N+" when the upstream fetch cap was hit', () => {
    render(
      <VotingRecordAnswer
        votes={null}
        bills={{
          sponsored: [],
          cosponsored: [],
          totalSponsored: 8,
          totalCosponsored: 500,
          cosponsoredCapped: true,
        }}
      />
    );

    // Without the "+" suffix, "500" would look like an exact cosponsorship
    // total when it's actually the page-cap of the upstream service.
    expect(screen.getByText('500+')).toBeInTheDocument();
  });

  it('renders cosponsored count as exact number when no cap was hit', () => {
    render(
      <VotingRecordAnswer
        votes={null}
        bills={{
          sponsored: [],
          cosponsored: [],
          totalSponsored: 8,
          totalCosponsored: 42,
          cosponsoredCapped: false,
        }}
      />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.queryByText('42+')).not.toBeInTheDocument();
  });
});
