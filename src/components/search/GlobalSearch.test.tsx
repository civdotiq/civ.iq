/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GlobalSearch } from './GlobalSearch';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockResults = {
  representatives: [
    {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      firstName: 'Nancy',
      lastName: 'Pelosi',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House' as const,
      district: '11',
    },
  ],
  stateLegislators: [],
  bills: [],
  committees: [],
  fecCommittees: [],
  query: 'pelosi',
  totalResults: 1,
};

const emptyResults = {
  representatives: [],
  stateLegislators: [],
  bills: [],
  committees: [],
  fecCommittees: [],
  query: 'xyznonexistent',
  totalResults: 0,
};

describe('GlobalSearch accessibility (WCAG 4.1.3 Status Messages)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('always renders an aria-live region for screen reader announcements', () => {
    render(<GlobalSearch />);

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces result count when search returns results', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResults),
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<GlobalSearch />);

    await user.type(screen.getByRole('textbox'), 'pelosi');

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/1 result/i);
    });
  });

  it('announces "no results" when search returns empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyResults),
    });

    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<GlobalSearch />);

    await user.type(screen.getByRole('textbox'), 'xyznonexistent');

    await act(async () => {
      jest.advanceTimersByTime(350);
    });

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/no results/i);
    });
  });

  it('links input to listbox via aria-controls', () => {
    render(<GlobalSearch />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-controls', 'global-search-listbox');
  });
});
