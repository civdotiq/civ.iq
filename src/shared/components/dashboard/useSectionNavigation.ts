/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const initialSection = searchParams.get(paramName);

  const [activeSection, setActiveSection] = useState<string | null>(() => {
    if (initialSection && validSections.includes(initialSection)) {
      return initialSection;
    }
    return null;
  });

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
