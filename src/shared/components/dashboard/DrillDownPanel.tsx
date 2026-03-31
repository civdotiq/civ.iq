/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { FC, ReactNode, useEffect, useRef, Suspense } from 'react';
import { ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { TabLoadingSpinner } from '@/lib/utils/code-splitting';

interface DrillDownPanelProps {
  sectionTitle: string;
  onBack: () => void;
  children: ReactNode;
}

export const DrillDownPanel: FC<DrillDownPanelProps> = ({ sectionTitle, onBack, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Scroll to top and focus content on section change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    contentRef.current?.focus();
  }, [sectionTitle]);

  return (
    <div role="region" aria-label={sectionTitle}>
      {/* Back navigation bar */}
      <div className="border-b-2 border-gray-200 p-4 sm:p-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="type-sm text-[#3ea2d4] aicher-heading-wide aicher-focus min-h-[44px] inline-flex items-center gap-2"
          aria-label="Back to all sections"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          All sections
        </button>
        <span className="type-sm text-gray-400" aria-hidden="true">
          /
        </span>
        <span className="type-sm aicher-heading-wide text-gray-900">{sectionTitle}</span>
      </div>

      {/* Section content */}
      <div className="p-4 sm:p-6" ref={contentRef} tabIndex={-1} data-testid="drill-down-content">
        <ErrorBoundary
          key={sectionTitle}
          fallback={({ retry }) => (
            <div className="border-2 border-gray-200 p-6 text-center min-h-[200px] flex flex-col items-center justify-center">
              <p className="type-sm text-gray-500">
                This section failed to load. Please try again.
              </p>
              <button
                onClick={retry}
                className="mt-3 type-xs text-[#3ea2d4] aicher-heading-wide py-2 min-h-[44px] inline-flex items-center aicher-focus"
              >
                Retry
              </button>
            </div>
          )}
        >
          <Suspense fallback={<TabLoadingSpinner />}>{children}</Suspense>
        </ErrorBoundary>
      </div>
    </div>
  );
};

DrillDownPanel.displayName = 'DrillDownPanel';
