'use client';

/**
 * Enhanced News Feed - Google News Style
 * Phase 3: UI/UX Transformation Integration
 *
 * This component now provides Google News-style clustering and display
 * using the enhanced multi-dimensional search and clustering services.
 */

import { useMemo } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { SimpleGoogleNewsFeed } from './SimpleGoogleNewsFeed';
import logger from '@/lib/logging/simple-logger';

/**
 * Props for the Enhanced News Feed component
 */
interface EnhancedNewsFeedProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
    state: string;
  };
}

/**
 * Enhanced News Feed Component
 *
 * Now uses the new Google News-style interface with Phase 1 & 2 services.
 * Converts legacy props to the new enhanced format.
 */
export function EnhancedNewsFeed({ bioguideId, representative }: EnhancedNewsFeedProps) {
  // Convert legacy representative format to EnhancedRepresentative
  const enhancedRepresentative = useMemo(
    (): EnhancedRepresentative => ({
      bioguideId,
      name: representative.name,
      firstName: representative.name.split(' ')[0] || '',
      lastName: representative.name.split(' ').slice(1).join(' ') || '',
      party: representative.party,
      state: representative.state,
      chamber: 'House' as const, // Default to House; this will be enhanced by the API
      title:
        representative.party === 'Republican'
          ? 'Rep.'
          : representative.party === 'Democratic'
            ? 'Rep.'
            : 'Rep.',
      terms: [], // Will be populated by the GoogleNewsStyleFeed component if needed
      committees: [], // Will be populated by the GoogleNewsStyleFeed component if needed
    }),
    [bioguideId, representative]
  );

  logger.info('EnhancedNewsFeed rendering with Google News-style interface', {
    component: 'EnhancedNewsFeed',
    metadata: {
      bioguideId,
      representativeName: representative.name,
      party: representative.party,
      state: representative.state,
    },
  });

  return (
    <SimpleGoogleNewsFeed
      representative={enhancedRepresentative}
      viewMode="headlines"
      maxClusters={10}
      autoRefresh={true}
      refreshInterval={300000}
    />
  );
}
