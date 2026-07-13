/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Smoke tests for the three committee answer components used by the
 * /ask/[slug]/[entityId] question page. These tests exercise the prop
 * shapes the page produces to catch import/prop-shape bugs — e.g. a
 * typo in a field name, a missing field, or a component that throws
 * on a null/empty input.
 *
 * Critically, this covers the null-lobbying fallback path, which is
 * the most common path for committee-lobbying because MIN_FILINGS_LOBBYING
 * filters out most committees.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CommitteeMembersAnswer } from '@/components/questions/CommitteeMembersAnswer';
import {
  CommitteeActivityAnswer,
  formatSponsor,
  splitMarkupTitle,
} from '@/components/questions/CommitteeActivityAnswer';
import { CommitteeLobbyingAnswer } from '@/components/questions/CommitteeLobbyingAnswer';
import type { Committee, CommitteeMember } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';
import type {
  CommitteeActivityMeeting,
  CommitteeActivityBill,
} from '@/lib/services/committee-activity.service';

// ── Fixtures ────────────────────────────────────────────────────────

function makeRepresentative(
  overrides: Partial<EnhancedRepresentative> = {}
): EnhancedRepresentative {
  return {
    bioguideId: 'T000001',
    name: 'Test Member',
    firstName: 'Test',
    lastName: 'Member',
    party: 'Republican',
    state: 'TX',
    chamber: 'Senate',
    title: 'Senator',
    terms: [],
    ...overrides,
  } as EnhancedRepresentative;
}

function makeCommitteeMember(
  role: CommitteeMember['role'],
  rep: EnhancedRepresentative
): CommitteeMember {
  return {
    representative: rep,
    role,
    joinedDate: '2023-01-03',
    rank: 1,
    subcommittees: [],
  };
}

function makeCommittee(overrides: Partial<Committee> = {}): Committee {
  const chair = makeCommitteeMember(
    'Chair',
    makeRepresentative({ bioguideId: 'C000001', name: 'Jane Chair', party: 'Republican' })
  );
  const rankingMember = makeCommitteeMember(
    'Ranking Member',
    makeRepresentative({
      bioguideId: 'R000001',
      name: 'John Ranking',
      party: 'Democratic',
      state: 'CA',
    })
  );

  return {
    id: 'SSFI',
    thomas_id: 'SSFI',
    name: 'Senate Committee on Finance',
    chamber: 'Senate',
    jurisdiction: 'Taxation, Social Security, Medicare, international trade, and health programs.',
    type: 'Standing',
    leadership: {
      chair,
      rankingMember,
    },
    members: [chair, rankingMember],
    subcommittees: [
      {
        id: 'SSFI01',
        name: 'Subcommittee on Taxation and IRS Oversight',
        focus: 'Tax policy and IRS administration',
        members: [],
      },
    ],
    lastUpdated: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeMeetings(): CommitteeActivityMeeting[] {
  return [
    {
      eventId: '118000',
      date: '2026-03-15T14:00:00Z',
      title: 'Hearing on International Trade Agreements',
      type: 'Hearing',
      chamber: 'senate',
    },
    {
      eventId: '118001',
      date: '2026-03-20T10:00:00Z',
      title: 'Markup of the Tax Fairness Act',
      type: 'Markup',
      chamber: 'senate',
    },
  ];
}

function makeBills(): CommitteeActivityBill[] {
  return [
    {
      billId: '119-s-106',
      billNumber: 'S 106',
      title: 'Chiropractic Medicare Coverage Modernization Act of 2025',
      sponsor: 'Sen. Cramer, Kevin [R-ND]',
      introducedDate: '2025-01-16',
      status: 'In Committee',
    },
    {
      billId: '119-s-136',
      billNumber: 'S 136',
      title: 'Small Business Expansion Act of 2025',
      sponsor: 'Sen. Smith, Jane [D-CA]',
      introducedDate: '2025-01-20',
      status: 'In Committee',
    },
  ];
}

function makeLobbyingInsight(): LobbyingPipelineInsight {
  return {
    committeeCode: 'SSFI',
    committeeName: 'Senate Committee on Finance',
    chamber: 'Senate',
    totalSpending: 12500000,
    organizationCount: 22,
    matchedBillCount: 4,
    topOrganizations: [
      {
        name: 'Acme Industries Inc',
        totalSpending: 2500000,
        filingCount: 6,
        issueCodes: ['TAX', 'TRD'],
      },
      {
        name: 'Beta Corporation',
        totalSpending: 1200000,
        filingCount: 4,
        issueCodes: ['TAX'],
      },
    ],
    issueAlignments: [
      {
        issueCode: 'TAX',
        issueLabel: 'Taxation',
        lobbyingSpending: 4500000,
        organizationCount: 12,
        matchedBills: [
          {
            id: '119-s-106',
            type: 'S',
            number: '106',
            title: 'Chiropractic Medicare Coverage Modernization Act of 2025',
            policyArea: 'Health',
            introducedDate: '2025-01-16',
          },
        ],
      },
    ],
    peerComparison: {
      value: 12500000,
      peerAverage: 8000000,
      peerCount: 8,
      peerGroupLabel: 'Senate standing committees',
      percentileRank: 70,
    },
    narrative: 'Lobbying activity on taxation and trade shows concentration among industry groups.',
    confidence: 0.75,
    confidenceMethod: 'computed',
    dataAsOf: '2026-03-01T00:00:00Z',
    methodology: 'Test methodology',
    disclaimer: 'Correlation does not indicate causation.',
    signal: 'informational',
    sources: [],
    lastAnalyzedAt: '2026-03-15T00:00:00Z',
    source: 'statistical-fallback',
  };
}

// ── CommitteeMembersAnswer ──────────────────────────────────────────

describe('CommitteeMembersAnswer', () => {
  it('renders leadership, members, and subcommittees without throwing', () => {
    const committee = makeCommittee();
    render(<CommitteeMembersAnswer committee={committee} />);

    // Leadership pod — names appear here and in the Members list
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Chair').length).toBeGreaterThan(0);
    expect(screen.getAllByText('John Ranking').length).toBeGreaterThan(0);

    // Members pod
    expect(screen.getByText(/Members \(2\)/)).toBeInTheDocument();

    // Subcommittees pod
    expect(screen.getByText(/Subcommittees \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Subcommittee on Taxation and IRS Oversight')).toBeInTheDocument();
  });

  it('handles empty members and subcommittees with empty states', () => {
    const committee = makeCommittee({
      leadership: {},
      members: [],
      subcommittees: [],
    });
    render(<CommitteeMembersAnswer committee={committee} />);

    expect(screen.getByText('Leadership data is not yet available.')).toBeInTheDocument();
    expect(
      screen.getByText('Member data is not yet available for this committee.')
    ).toBeInTheDocument();
    expect(screen.getByText('No subcommittees listed.')).toBeInTheDocument();
  });
});

// ── CommitteeActivityAnswer ─────────────────────────────────────────

describe('CommitteeActivityAnswer', () => {
  it('renders meetings, bills, and jurisdiction without throwing', () => {
    render(
      <CommitteeActivityAnswer
        meetings={makeMeetings()}
        bills={makeBills()}
        jurisdiction="Taxation and trade policy."
      />
    );

    // Recent hearings pod
    expect(screen.getByText('Recent hearings')).toBeInTheDocument();
    expect(screen.getByText('Hearing on International Trade Agreements')).toBeInTheDocument();
    expect(screen.getByText('Markup of the Tax Fairness Act')).toBeInTheDocument();

    // Bills pod
    expect(screen.getByText('Bills in committee')).toBeInTheDocument();
    expect(
      screen.getByText(/Chiropractic Medicare Coverage Modernization Act of 2025/)
    ).toBeInTheDocument();

    // Jurisdiction pod
    expect(screen.getByText('Jurisdiction')).toBeInTheDocument();
    expect(screen.getByText('Taxation and trade policy.')).toBeInTheDocument();
  });

  it('renders empty states when meetings and bills are empty', () => {
    render(<CommitteeActivityAnswer meetings={[]} bills={[]} jurisdiction="" />);

    expect(screen.getByText(/No recent hearings or meetings found/)).toBeInTheDocument();
    expect(screen.getByText(/No bills currently available/)).toBeInTheDocument();
    expect(screen.getByText('Jurisdiction information is not available.')).toBeInTheDocument();
  });

  it('splits a multi-bill markup title into a bulleted list', () => {
    const meetings: CommitteeActivityMeeting[] = [
      {
        eventId: '118999',
        date: '2026-03-01T15:00:00Z',
        title:
          'H.R. 8352, the Criminal History Access Act; H.R. 8065, the Monitor Accountability Act of 2026; and Ratification of Subcommittee Assignments',
        type: 'Markup',
        chamber: 'house',
      },
    ];
    render(<CommitteeActivityAnswer meetings={meetings} bills={[]} jurisdiction="" />);

    // Each concatenated bill should surface as its own list item, not as
    // one unbreakable string.
    expect(screen.getByText(/H\.R\. 8352, the Criminal History Access Act/)).toBeInTheDocument();
    expect(
      screen.getByText(/H\.R\. 8065, the Monitor Accountability Act of 2026/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Ratification of Subcommittee Assignments/)).toBeInTheDocument();
  });

  it('reformats raw Congress.gov sponsor strings into citizen-readable names', () => {
    const bills: CommitteeActivityBill[] = [
      {
        billId: '119-hr-6398',
        billNumber: 'HR 6398',
        title: 'RED Tape Act',
        sponsor: "Rep. Carter, Earl L. 'Buddy' [R-GA-1]",
        introducedDate: '2025-12-03',
        status: 'Passed House, in Senate',
      },
    ];
    render(<CommitteeActivityAnswer meetings={[]} bills={bills} jurisdiction="" />);

    expect(screen.getByText(/Buddy Carter \(R-GA-1\)/)).toBeInTheDocument();
    expect(screen.queryByText(/Rep\. Carter, Earl/)).not.toBeInTheDocument();
  });

  it('renders the citizen-language status and keeps the raw latestAction in a tooltip', () => {
    const bills: CommitteeActivityBill[] = [
      {
        billId: '119-hr-6398',
        billNumber: 'HR 6398',
        title: 'RED Tape Act',
        sponsor: 'Sen. Smith, Jane [D-CA]',
        introducedDate: '2025-12-03',
        status: 'Passed House, in Senate',
        latestActionText:
          'Received in the Senate and Read twice and referred to the Committee on Environment and Public Works.',
      },
    ];
    render(<CommitteeActivityAnswer meetings={[]} bills={bills} jurisdiction="" />);

    const status = screen.getByText('Passed House, in Senate');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute(
      'title',
      'Received in the Senate and Read twice and referred to the Committee on Environment and Public Works.'
    );
  });

  it('surfaces an "As of {date}" caveat when fetchedAt is provided', () => {
    render(
      <CommitteeActivityAnswer
        meetings={makeMeetings()}
        bills={[]}
        jurisdiction=""
        fetchedAt="2026-04-20T12:00:00Z"
      />
    );
    expect(screen.getByText(/As of Apr 20, 2026/)).toBeInTheDocument();
  });
});

describe('splitMarkupTitle', () => {
  it('splits on semicolons and the trailing " and "', () => {
    const parts = splitMarkupTitle(
      'H.R. 1, the Alpha Act; H.R. 2, the Beta Act; and H.R. 3, the Gamma Act'
    );
    expect(parts).toEqual([
      'H.R. 1, the Alpha Act',
      'H.R. 2, the Beta Act',
      'H.R. 3, the Gamma Act',
    ]);
  });

  it('returns a single-entry array for titles without a separator', () => {
    expect(splitMarkupTitle('Full Committee Markup')).toEqual(['Full Committee Markup']);
  });

  it('drops empty fragments', () => {
    expect(splitMarkupTitle('; A; ; B; ').length).toBe(2);
  });
});

describe('formatSponsor', () => {
  it('prefers the nickname and drops middle initials', () => {
    expect(formatSponsor("Rep. Carter, Earl L. 'Buddy' [R-GA-1]")).toBe('Buddy Carter (R-GA-1)');
  });

  it('falls back to first name when there is no nickname', () => {
    expect(formatSponsor('Sen. Cramer, Kevin [R-ND]')).toBe('Kevin Cramer (R-ND)');
  });

  it('handles senator entries (no district)', () => {
    expect(formatSponsor('Sen. Smith, Jane [D-CA]')).toBe('Jane Smith (D-CA)');
  });

  it('returns the raw string unchanged when it does not match the known pattern', () => {
    expect(formatSponsor('Unknown')).toBe('Unknown');
    expect(formatSponsor('')).toBe('Unknown');
  });
});

// ── CommitteeLobbyingAnswer ─────────────────────────────────────────

describe('CommitteeLobbyingAnswer', () => {
  it('renders full insight with organizations, issues, and bills', () => {
    render(
      <CommitteeLobbyingAnswer
        lobbying={makeLobbyingInsight()}
        committeeId="SSFI"
        committeeName="Senate Committee on Finance"
        chamber="Senate"
        jurisdiction="Taxation and trade policy."
      />
    );

    expect(screen.getByText('Top lobbying organizations')).toBeInTheDocument();
    expect(screen.getByText('Acme Industries Inc')).toBeInTheDocument();
    expect(screen.getByText('Beta Corporation')).toBeInTheDocument();
    expect(screen.getByText('Activity by issue')).toBeInTheDocument();
    expect(screen.getByText('Related bills')).toBeInTheDocument();
    // Sample-based dollar totals must not render (PLAN-lobbying-corpus-2026-07.md Phase 0b)
    expect(screen.queryByText(/\$12\.5M/)).not.toBeInTheDocument();
    expect(
      screen.queryByText('Total lobbying spending mentioning this committee')
    ).not.toBeInTheDocument();
  });

  it('renders a rich fallback when lobbying insight is null (common path)', () => {
    render(
      <CommitteeLobbyingAnswer
        lobbying={null}
        committeeId="SSFI"
        committeeName="Senate Committee on Finance"
        chamber="Senate"
        jurisdiction="Taxation and trade policy."
      />
    );

    // Unavailable pod explains why
    expect(screen.getByText('Lobbying analysis unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No statistically meaningful lobbying pattern/)).toBeInTheDocument();
    expect(screen.getByText('Why?')).toBeInTheDocument();

    // Jurisdiction surfaced in fallback when available
    expect(screen.getByText('Committee jurisdiction')).toBeInTheDocument();
    expect(screen.getByText('Taxation and trade policy.')).toBeInTheDocument();

    // Explore related pod provides navigation to other committee questions
    expect(screen.getByText('Explore this committee')).toBeInTheDocument();
    const memberLink = screen.getByRole('link', { name: /Who sits on this committee/ });
    expect(memberLink).toHaveAttribute('href', '/ask/committee-members/SSFI');
    const activityLink = screen.getByRole('link', { name: /What is this committee working on/ });
    expect(activityLink).toHaveAttribute('href', '/ask/committee-activity/SSFI');

    // Fallback sources pod explains the no-synthetic-data policy
    expect(
      screen.getByText(/This analysis uses real lobbying disclosure data/)
    ).toBeInTheDocument();
  });

  it('omits jurisdiction section when not provided in fallback', () => {
    render(
      <CommitteeLobbyingAnswer
        lobbying={null}
        committeeId="HSAG"
        committeeName="House Committee on Agriculture"
        chamber="House"
      />
    );

    expect(screen.getByText('Lobbying analysis unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Committee jurisdiction')).not.toBeInTheDocument();
  });
});
