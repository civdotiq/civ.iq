/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The Senate vote freshness line: always shown when anything is known, and
 * the amber notice only when the Congressional Record lists votes we lack.
 * The missing-votes case uses test data here only, never the shared Redis.
 */

import { render, screen } from '@testing-library/react';
import { SenateVoteFreshness } from '@/components/votes/SenateVoteFreshness';
import type { SenateVoteFreshness as Freshness } from '@/features/representatives/services/senate-vote-freshness';

const current: Freshness = {
  latestVoteDate: '2026-09-30',
  checkedAt: '2026-10-27T14:17:00.000Z',
  stale: false,
  missing: null,
};

const behind: Freshness = {
  ...current,
  checkedAt: '2026-11-10T14:17:00.000Z',
  stale: true,
  missing: {
    session: 2,
    ourLatestRoll: 256,
    ourLatestDate: '2026-09-30',
    recordTotal: 258,
    recordIssueDate: '2026-11-09',
  },
};

describe('SenateVoteFreshness', () => {
  it('shows the line with no notice when nothing is missing', () => {
    render(<SenateVoteFreshness freshness={current} />);
    expect(screen.getByTestId('senate-vote-freshness')).toHaveTextContent(
      'Senate votes · Latest record: Sep 30, 2026 · Checked: Oct 27, 2026'
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('adds the amber notice only when the Record lists votes we lack', () => {
    render(<SenateVoteFreshness freshness={behind} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      "The Senate has held roll-call votes since September 30, 2026 that aren't shown here yet. " +
        'The Congressional Record for November 9, 2026 lists Senate votes through No. 258; ' +
        'this page has through No. 256.'
    );
  });

  it('a single vote shows "Vote held · Checked" and never the notice', () => {
    render(<SenateVoteFreshness freshness={behind} voteDate="2026-09-30T23:10:00.000Z" />);
    expect(screen.getByTestId('senate-vote-freshness')).toHaveTextContent(
      'Vote held: Sep 30, 2026 · Checked: Nov 10, 2026'
    );
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('renders nothing when nothing is known', () => {
    const { container } = render(<SenateVoteFreshness freshness={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
