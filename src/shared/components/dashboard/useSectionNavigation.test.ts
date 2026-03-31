/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { renderHook, act } from '@testing-library/react';
import { useSectionNavigation } from './useSectionNavigation';

// Mock useSearchParams
const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock window.history.pushState
const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

const validSections = ['overview', 'voting', 'finance'];

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockReturnValue(null);
});

describe('useSectionNavigation', () => {
  it('returns null activeSection when no section param in URL', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBeNull();
  });

  it('reads initial section from URL search params', () => {
    mockGet.mockReturnValue('voting');
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBe('voting');
  });

  it('ignores invalid section from URL', () => {
    mockGet.mockReturnValue('invalid-section');
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBeNull();
  });

  it('navigateToSection updates state and calls pushState', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));

    act(() => {
      result.current.navigateToSection('finance');
    });

    expect(result.current.activeSection).toBe('finance');
    expect(pushStateSpy).toHaveBeenCalledWith({}, '', expect.stringContaining('section=finance'));
  });

  it('navigateToSection rejects invalid sections', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));

    act(() => {
      result.current.navigateToSection('nonexistent');
    });

    expect(result.current.activeSection).toBeNull();
    expect(pushStateSpy).not.toHaveBeenCalled();
  });

  it('navigateBack clears section and calls pushState', () => {
    mockGet.mockReturnValue('voting');
    const { result } = renderHook(() => useSectionNavigation({ validSections }));

    act(() => {
      result.current.navigateBack();
    });

    expect(result.current.activeSection).toBeNull();
    expect(pushStateSpy).toHaveBeenCalled();
  });

  it('syncs state on popstate event', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));

    // Simulate browser back to a URL with section param by changing the search string
    // jsdom doesn't allow redefining window.location, so we use history.replaceState
    // to change the URL, then fire popstate
    window.history.replaceState({}, '', '?section=overview');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.activeSection).toBe('overview');

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
  });

  it('popstate with invalid section sets null', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));

    window.history.replaceState({}, '', '?section=bad');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current.activeSection).toBeNull();

    // Clean up URL
    window.history.replaceState({}, '', window.location.pathname);
  });
});
