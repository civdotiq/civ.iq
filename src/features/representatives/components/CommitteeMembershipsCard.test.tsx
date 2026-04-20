/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommitteeMembershipsCard } from './CommitteeMembershipsCard';
import { EnhancedRepresentative } from '@/types/representative';

const baseRepresentative = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  chamber: 'House',
  state: 'CA',
  district: '11',
};

const makeRepresentativeWithCommittees = (): EnhancedRepresentative =>
  ({
    ...baseRepresentative,
    committees: [
      { name: 'Appropriations', thomas_id: 'HSAP', role: 'Member' },
      { name: 'Intelligence', thomas_id: 'HLIG', role: 'Chair' },
    ],
  }) as unknown as EnhancedRepresentative;

const makeRepresentativeWithoutCommittees = (): EnhancedRepresentative =>
  ({
    ...baseRepresentative,
    committees: [],
  }) as unknown as EnhancedRepresentative;

describe('CommitteeMembershipsCard', () => {
  it('renders unavailable state when no YAML committees AND dataQuality is unavailable', () => {
    const { container } = render(
      <CommitteeMembershipsCard
        representative={makeRepresentativeWithoutCommittees()}
        dataQuality="unavailable"
      />
    );
    expect(screen.getByRole('status')).toHaveAccessibleName(
      'Committee data source temporarily unavailable'
    );
    expect(container.textContent).toContain('temporarily unavailable');
    expect(container.querySelector('[class*="border-amber"]')).toBeInTheDocument();
  });

  it('keeps showing YAML committees when dataQuality is unavailable but YAML has data', () => {
    // Regression guard: a Congress.gov outage must NOT hide committees we
    // already have from the weekly-refreshed YAML source. Swapping reliable
    // data for a "source unavailable" banner would be a silent-false-negative
    // of our own making — the opposite of Phase 2's intent.
    const { container } = render(
      <CommitteeMembershipsCard
        representative={makeRepresentativeWithCommittees()}
        dataQuality="unavailable"
      />
    );
    expect(container.textContent).not.toContain('temporarily unavailable');
    expect(container.textContent).toContain('Appropriations');
    expect(container.querySelector('[class*="border-amber"]')).not.toBeInTheDocument();
  });

  it('renders committees normally when dataQuality is complete', () => {
    const { container } = render(
      <CommitteeMembershipsCard
        representative={makeRepresentativeWithCommittees()}
        dataQuality="complete"
      />
    );
    expect(container.textContent).not.toContain('temporarily unavailable');
    expect(container.querySelector('[class*="border-amber"]')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Appropriations');
  });
});
