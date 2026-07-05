/**
 * State Representatives Tab Component - Displays state legislators for a ZIP code
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect, memo } from 'react';
import { StateLegislatorCard } from '@/features/representatives/components/StateLegislatorCard';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import type { StateLegislatorSummary } from '@/types/state-legislature';

// API response type for state legislators by ZIP
interface StateLegislator extends StateLegislatorSummary {
  image?: string; // Alias for photo_url (API compatibility)
  website?: string;
  offices?: Array<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
  currentRole?: {
    title: string;
    org_classification: string;
    district: string;
    party: string;
    start_date: string;
    end_date?: string;
  };
}

interface StateApiResponse {
  zipCode: string;
  state: string;
  stateName: string;
  legislators: StateLegislator[];
  /** Error message when data is unavailable (e.g., rate limiting) */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

/** BackboneResponse envelope returned by /api/state-representatives */
interface StateApiEnvelope {
  data: Omit<StateApiResponse, 'error' | 'errorCode'>;
  dataQuality: 'complete' | 'partial' | 'empty' | 'unavailable';
  accuracyNote?: string;
  error?: { code: string; message: string };
}

interface StateRepresentativesTabProps {
  zipCode: string;
  /** State abbreviation (e.g., 'MI', 'CA') */
  state?: string;
  /** Optional specific state senator from unified geocode result */
  stateSenator?: {
    id: string;
    name: string;
    party: string;
    district: string;
    chamber: 'upper';
    image?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  /** Optional specific state representative from unified geocode result */
  stateRepresentative?: {
    id: string;
    name: string;
    party: string;
    district: string;
    chamber: 'lower';
    image?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
}

export const StateRepresentativesTab = memo(function StateRepresentativesTab({
  zipCode,
  state,
  stateSenator,
  stateRepresentative,
}: StateRepresentativesTabProps) {
  const [stateData, setStateData] = useState<StateApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // If specific legislators are provided from unified geocode, use them directly
  const useSpecificLegislators = stateSenator || stateRepresentative;

  useEffect(() => {
    // If we have specific legislators from unified geocode, skip the API call
    if (useSpecificLegislators) {
      const legislators: StateLegislator[] = [];

      if (stateSenator) {
        legislators.push({
          id: stateSenator.id,
          name: stateSenator.name,
          party: stateSenator.party as StateLegislator['party'],
          chamber: 'upper',
          district: stateSenator.district,
          state: state || '', // Use provided state or empty string as fallback
          photo_url: stateSenator.image,
          image: stateSenator.image,
          email: stateSenator.email,
          phone: stateSenator.phone,
          website: stateSenator.website,
        });
      }

      if (stateRepresentative) {
        legislators.push({
          id: stateRepresentative.id,
          name: stateRepresentative.name,
          party: stateRepresentative.party as StateLegislator['party'],
          chamber: 'lower',
          district: stateRepresentative.district,
          state: state || '', // Use provided state or empty string as fallback
          photo_url: stateRepresentative.image,
          image: stateRepresentative.image,
          email: stateRepresentative.email,
          phone: stateRepresentative.phone,
          website: stateRepresentative.website,
        });
      }

      setStateData({
        zipCode,
        state: state || '', // Use provided state or empty string
        stateName: state ? `${state}` : 'State',
        legislators,
      });
      setLoading(false);
      setError(null);
      return;
    }

    // Otherwise, fetch all legislators for the ZIP code (fallback behavior)
    const fetchStateRepresentatives = async () => {
      try {
        setLoading(true);

        // Build API URL - include state param if available
        let apiUrl = `/api/state-representatives?zip=${encodeURIComponent(zipCode)}`;
        if (state) {
          apiUrl += `&state=${encodeURIComponent(state)}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error?.message || errorData.error || 'Failed to fetch state representatives'
          );
        }

        // Unwrap the BackboneResponse envelope; keep the error fields the
        // rest of this component already handles
        const envelope: StateApiEnvelope = await response.json();
        setStateData({
          ...envelope.data,
          ...(envelope.error
            ? { error: envelope.error.message, errorCode: envelope.error.code }
            : {}),
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setStateData(null);
      } finally {
        setLoading(false);
      }
    };

    if (zipCode) {
      fetchStateRepresentatives();
    }
  }, [zipCode, state, stateSenator, stateRepresentative, useSpecificLegislators]);

  if (loading) {
    return (
      <>
        <LoadingState message="Finding your state representatives..." />
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-amber-50 border border-amber-600 p-6 text-center">
        <p className="text-amber-600 font-medium">Error</p>
        <p className="text-amber-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!stateData || stateData.legislators.length === 0) {
    // Check if this is due to a service error (e.g., rate limiting)
    if (stateData?.error || stateData?.errorCode === 'OPENSTATES_UNAVAILABLE') {
      return (
        <div className="bg-gray-100 border border-gray-300 p-6 text-center">
          <p className="text-gray-600 font-medium">
            State Legislature Data Temporarily Unavailable
          </p>
          <p className="text-gray-600 mt-2">
            {stateData.error ||
              'We are currently unable to load state legislator information. This is usually temporary.'}
          </p>
          <p className="text-gray-600 mt-4 text-sm">
            Please try again in a few minutes, or visit{' '}
            <a
              href="https://openstates.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              OpenStates.org
            </a>{' '}
            directly to find your state legislators.
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-600">
        <p>No state representatives found for this ZIP code.</p>
        <p className="text-sm mt-2">
          Try entering your full street address for more accurate results.
        </p>
      </div>
    );
  }

  const senators = stateData.legislators.filter(leg => leg.chamber === 'upper');
  const representatives = stateData.legislators.filter(leg => leg.chamber === 'lower');

  return (
    <div className="space-y-8">
      {/* State Info */}
      <div className="bg-white border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {stateData.stateName} State Legislature
        </h3>
        <p className="text-gray-600">State representatives for your address</p>
        {stateData.jurisdiction && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stateData.jurisdiction.chambers.map((chamber, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white border-2 border-gray-300 text-gray-700 text-sm"
              >
                {chamber.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* State Senators */}
      {senators.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Senators ({senators.length})
          </h3>
          <div className="space-y-4">
            {senators.map(senator => (
              <StateLegislatorCard key={senator.id} legislator={senator} />
            ))}
          </div>
        </div>
      )}

      {/* State Representatives */}
      {representatives.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            State Representatives ({representatives.length})
          </h3>
          <div className="space-y-4">
            {representatives.map(representative => (
              <StateLegislatorCard key={representative.id} legislator={representative} />
            ))}
          </div>
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        State legislature data sourced from the OpenStates Project
      </div>
    </div>
  );
});
