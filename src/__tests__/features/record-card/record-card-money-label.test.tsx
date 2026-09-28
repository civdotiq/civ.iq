/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The money section's wording per state: "no filings" only when the FEC
 * answered with nothing; an unreachable FEC says so and never shows $0.
 */

import { render, screen } from '@testing-library/react';
import { RecordCardLabel } from '@/features/record-card/components/RecordCardLabel';
import { renderRecordEmbed } from '@/features/record-card/embed';
import type { RecordCardData, MoneyStatus } from '@/features/record-card/record-card-data';

function card(moneyStatus: MoneyStatus): RecordCardData {
  return {
    member: {
      bioguideId: 'C000127',
      name: 'Test Senator',
      party: 'Democratic',
      state: 'WA',
      chamber: 'Senate',
      inOfficeSince: '2001',
      termNumber: 5,
      nextElectionYear: 2030,
      onNextBallot: false,
      electionDayLabel: null,
      committees: [],
      subcommitteeCount: 0,
      currentCongress: 119,
    },
    legislation: null,
    voting: null,
    money:
      moneyStatus === 'ok'
        ? {
            cycle: 2026,
            totalRaised: 789_841,
            smallDonorPct: 20,
            pacPct: 15,
            largeIndividualPct: 50,
            inStatePct: 60,
            outOfStatePct: 40,
            topSectors: [],
            fecCandidateId: 'S8WA00194',
            dataAsOf: '2026-09-23T00:00:00.000Z',
          }
        : null,
    moneyStatus,
    districtMoney: null,
    keyVotes: [],
    ptr: null,
    generatedAt: '2026-09-23T00:00:00.000Z',
  };
}

describe('Record Card money wording', () => {
  test('provenance names the FEC report period when known, else the fetch date', () => {
    const withPeriod = card('ok');
    if (withPeriod.money) withPeriod.money.coverageEnd = '2026-06-30';
    const { container, unmount } = render(<RecordCardLabel data={withPeriod} />);
    expect(container.innerHTML).toContain('Filings through Jun 30, 2026');
    unmount();

    const { container: legacy } = render(<RecordCardLabel data={card('ok')} />);
    expect(legacy.innerHTML).toContain('Filings as of Sep');
  });

  test('ok shows the total', () => {
    render(<RecordCardLabel data={card('ok')} />);
    expect(screen.getByText('$789,841')).toBeTruthy();
    expect(screen.queryByText(/No campaign finance filings/)).toBeNull();
  });

  test('none shows the no-filings empty state', () => {
    render(<RecordCardLabel data={card('none')} />);
    expect(screen.getByText('No campaign finance filings found for this cycle')).toBeTruthy();
    expect(screen.queryByText(/temporarily unavailable/)).toBeNull();
  });

  test('unavailable says the FEC could not be reached, not "no filings"', () => {
    render(<RecordCardLabel data={card('unavailable')} />);
    expect(screen.getByText(/temporarily unavailable from the FEC/)).toBeTruthy();
    expect(screen.queryByText(/No campaign finance filings/)).toBeNull();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });

  test('embed wording follows the same split', () => {
    expect(renderRecordEmbed(card('none'))).toContain('No FEC filings found this cycle');
    const unavailable = renderRecordEmbed(card('unavailable'));
    expect(unavailable).toContain('FEC data temporarily unavailable');
    expect(unavailable).not.toContain('No FEC filings');
  });
});
