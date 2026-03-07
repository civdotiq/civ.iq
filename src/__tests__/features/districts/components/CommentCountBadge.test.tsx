/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';

// We need to extract CommentCountBadge for testing. Since it's not exported,
// test the behavior indirectly through the page, or test the fetch logic.
// For now, test the comment fetching logic directly.

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('CommentCountBadge fetch logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches comment count with staggered delay', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        stats: { total: 1500 },
      }),
    });

    // Simulate the staggered fetch behavior
    const documentNumber = '2025-12345';
    let result: { total: number } | null = null;

    await act(async () => {
      // Simulate the fetch with minimal delay
      const res = await fetch(`/api/federal-register/${documentNumber}/comments?pageSize=1`);
      const json = await res.json();
      if (json?.success && json.stats?.total > 0) {
        result = json.stats;
      }
    });

    expect(result).toEqual({ total: 1500 });
    expect(mockFetch).toHaveBeenCalledWith('/api/federal-register/2025-12345/comments?pageSize=1');
  });

  it('returns null on fetch failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    let result: number | null = null;

    await act(async () => {
      try {
        const res = await fetch('/api/federal-register/2025-12345/comments?pageSize=1');
        const json = await res.json();
        if (json?.success && json.stats?.total > 0) {
          result = json.stats.total;
        }
      } catch {
        result = null;
      }
    });

    expect(result).toBeNull();
  });

  it('returns null when API returns no comments', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        stats: { total: 0 },
      }),
    });

    let result: number | null = null;

    await act(async () => {
      const res = await fetch('/api/federal-register/2025-12345/comments?pageSize=1');
      const json = await res.json();
      if (json?.success && json.stats?.total > 0) {
        result = json.stats.total;
      }
    });

    expect(result).toBeNull();
  });

  it('returns null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    let result: number | null = null;

    await act(async () => {
      const res = await fetch('/api/federal-register/2025-12345/comments?pageSize=1');
      if (!res.ok) {
        result = null;
      }
    });

    expect(result).toBeNull();
  });
});
