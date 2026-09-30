/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface UseSectionNavigationOptions {
  validSections: string[];
  paramName?: string;
}

interface UseSectionNavigationReturn {
  activeSection: string | null;
  navigateToSection: (id: string) => void;
  navigateBack: () => void;
}

export function useSectionNavigation({
  validSections,
  paramName = 'section',
}: UseSectionNavigationOptions): UseSectionNavigationReturn {
  // The URL is read after mount, not with useSearchParams(). On a prerendered
  // (ISR) page, useSearchParams() makes Next.js skip server rendering for the
  // whole client tree up to the nearest Suspense boundary. On the profile page
  // that shipped search engines an empty skeleton with no h1 and no content.
  // A ?section= deep link now shows the overview for one frame first.
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get(paramName);
    if (section && validSections.includes(section)) {
      setActiveSection(section);
    }
    // Initial read only; later changes arrive through navigateTo/popstate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateToSection = useCallback(
    (id: string) => {
      if (!validSections.includes(id)) return;
      setActiveSection(id);
      const url = new URL(window.location.href);
      url.searchParams.set(paramName, id);
      window.history.pushState({}, '', url.toString());
    },
    [validSections, paramName]
  );

  const navigateBack = useCallback(() => {
    setActiveSection(null);
    const url = new URL(window.location.href);
    url.searchParams.delete(paramName);
    window.history.pushState({}, '', url.toString());
  }, [paramName]);

  // Sync state on browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const section = params.get(paramName);
      if (section && validSections.includes(section)) {
        setActiveSection(section);
      } else {
        setActiveSection(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [validSections, paramName]);

  return { activeSection, navigateToSection, navigateBack };
}
