/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { renderHook, act } from '@testing-library/react';
import { useSectionNavigation } from './useSectionNavigation';

// Mock window.history.pushState
const pushStateSpy = jest.spyOn(window.history, 'pushState').mockImplementation(() => {});

const validSections = ['overview', 'voting', 'finance'];

/** Put `?section=` in the jsdom URL (replaceState is not mocked). */
function setSectionInUrl(section: string | null): void {
  window.history.replaceState({}, '', section ? `?section=${section}` : window.location.pathname);
}

beforeEach(() => {
  jest.clearAllMocks();
  setSectionInUrl(null);
});

describe('useSectionNavigation', () => {
  it('returns null activeSection when no section param in URL', () => {
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBeNull();
  });

  it('reads the initial section from the URL after mount', () => {
    setSectionInUrl('voting');
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBe('voting');
  });

  it('ignores invalid section from URL', () => {
    setSectionInUrl('invalid-section');
    const { result } = renderHook(() => useSectionNavigation({ validSections }));
    expect(result.current.activeSection).toBeNull();
  });

  it('does not use useSearchParams (it disables server rendering on ISR pages)', () => {
    const source = jest
      .requireActual<typeof import('fs')>('fs')
      .readFileSync(require.resolve('./useSectionNavigation'), 'utf8');
    expect(source).not.toMatch(/from 'next\/navigation'/);
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
    setSectionInUrl('voting');
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
