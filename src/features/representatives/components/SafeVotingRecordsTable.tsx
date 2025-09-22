'use client';

/**
 * Safe wrapper for VotingRecordsTable with error boundary
 */

import React from 'react';
import { VotingRecordsTable } from './VotingRecordsTable';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';

interface SafeVotingRecordsTableProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
}

export function SafeVotingRecordsTable(props: SafeVotingRecordsTableProps) {
  return (
    <ErrorBoundary
      fallback={({ retry }) => (
        <div className="bg-white border border-gray-200 p-8 text-center">
          <p className="text-gray-600 mb-4">Unable to load voting records at this time.</p>
          <button
            onClick={retry}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      )}
    >
      <VotingRecordsTable {...props} />
    </ErrorBoundary>
  );
}

export default SafeVotingRecordsTable;
