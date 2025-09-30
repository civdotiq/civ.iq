/**
 * Custom hook for responsive media queries
 * Properly handles SSR and updates on resize
 */

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side)
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia(query);

    // Set initial value
    setMatches(media.matches);

    // Create listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use modern addEventListener API
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Convenience hooks for common breakpoints
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}

export function useIsSmallMobile(): boolean {
  return useMediaQuery('(max-width: 375px)');
}
