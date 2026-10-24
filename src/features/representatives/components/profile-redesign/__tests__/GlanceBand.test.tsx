/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlanceBand, votesCaption } from '../GlanceBand';
import type { ProfileSummary } from '../types';

// Pelosi's real 119th House numbers (prod, 2026-10-21): 615 cast of 676.
const base: ProfileSummary = {
  votesParticipated: 615,
  votesAppearances: 676,
  votesMissed: 61,
  votesMedianMissedPct: 2.0710059171597637,
  votesFullCoverage: true,
};

describe('votesCaption', () => {
  it('shows the denominator and the chamber median', () => {
    expect(votesCaption(base)).toBe('Missed 61 of 676 (9%) · chamber median 2.1%');
  });

  it('says "most recent" when the sweep did not cover the full Congress', () => {
    expect(votesCaption({ ...base, votesFullCoverage: false })).toBe(
      'Missed 61 of the 676 most recent (9%) · chamber median 2.1%'
    );
  });

  it('drops the median when no baseline was computed', () => {
    expect(votesCaption({ ...base, votesMedianMissedPct: null })).toBe('Missed 61 of 676 (9%)');
  });

  it('returns null for a summary without the denominator', () => {
    expect(votesCaption({ votesParticipated: 615 })).toBeNull();
  });
});

describe('GlanceBand votes cell', () => {
  it('renders the caption and the standing note', () => {
    render(<GlanceBand summary={base} loading={false} committeeCount={2} />);
    expect(screen.getByText('Missed 61 of 676 (9%) · chamber median 2.1%')).toBeInTheDocument();
    expect(screen.getByText('Chamber medians are a description, not a grade.')).toBeInTheDocument();
  });

  it('falls back without a denominator and hides the note', () => {
    render(<GlanceBand summary={{ votesParticipated: 615 }} loading={false} committeeCount={2} />);
    expect(screen.getByText('Votes cast, 119th Congress')).toBeInTheDocument();
    expect(screen.queryByText(/description, not a grade/)).toBeNull();
  });
});
