/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommitteeMembershipsCard } from './CommitteeMembershipsCard';
import { EnhancedRepresentative } from '@/types/representative';

const makeRepresentative = (): EnhancedRepresentative =>
  ({
    bioguideId: 'P000197',
    name: 'Nancy Pelosi',
    party: 'Democrat',
    chamber: 'House',
    state: 'CA',
    district: '11',
    committees: [
      { name: 'Appropriations', thomas_id: 'HSAP', role: 'Member' },
      { name: 'Intelligence', thomas_id: 'HLIG', role: 'Chair' },
    ],
  }) as unknown as EnhancedRepresentative;

describe('CommitteeMembershipsCard', () => {
  it('renders unavailable state with amber border when dataQuality is unavailable', () => {
    const { container } = render(
      <CommitteeMembershipsCard representative={makeRepresentative()} dataQuality="unavailable" />
    );
    expect(screen.getByRole('status')).toHaveAccessibleName(
      'Committee data source temporarily unavailable'
    );
    expect(container.textContent).toContain('temporarily unavailable');
    expect(container.querySelector('[class*="border-amber"]')).toBeInTheDocument();
    // Committee list must not render while source is unavailable
    expect(container.textContent).not.toContain('Appropriations');
  });

  it('renders committees normally when dataQuality is complete', () => {
    const { container } = render(
      <CommitteeMembershipsCard representative={makeRepresentative()} dataQuality="complete" />
    );
    expect(container.textContent).not.toContain('temporarily unavailable');
    expect(container.querySelector('[class*="border-amber"]')).not.toBeInTheDocument();
    expect(container.textContent).toContain('Appropriations');
  });
});
