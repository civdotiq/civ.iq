/**
 * State Representatives Tab Component - Displays state legislators for a ZIP code
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, memo } from 'react';
import { StateLegislatorCard } from '@/features/representatives/components/StateLegislatorCard';
import { RepresentativeSkeleton } from '@/shared/components/ui/SkeletonComponents';
import { Spinner } from '@/shared/components/ui/LoadingStates';

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  state: string;
  image?: string;
  email?: string;
  phone?: string;
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
  jurisdiction?: {
    name: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
}

export const StateRepresentativesTab = memo(function StateRepresentativesTab({
  zipCode,
}: {
  zipCode: string;
}) {
  const [stateData, setStateData] = useState<StateApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStateRepresentatives = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/state-representatives?zip=${encodeURIComponent(zipCode)}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch state representatives');
        }

        const data: StateApiResponse = await response.json();
        setStateData(data);
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
  }, [zipCode]);

  if (loading) {
    return (
      <>
        <div className="text-center py-8">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600">Finding your state representatives...</p>
        </div>

        <div className="space-y-6">
          <RepresentativeSkeleton />
          <RepresentativeSkeleton />
          <RepresentativeSkeleton />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 text-center">
        <p className="text-red-800 font-medium">Error</p>
        <p className="text-red-600 mt-1">{error}</p>
      </div>
    );
  }

  if (!stateData || stateData.legislators.length === 0) {
    return (
      <div className="text-center py-8 text-gray-600">
        <p>No state representatives found for this ZIP code.</p>
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
        <p className="text-gray-600">
          State representatives for ZIP code <span className="font-semibold">{zipCode}</span>
        </p>
        {stateData.jurisdiction && (
          <div className="mt-4 flex flex-wrap gap-2">
            {stateData.jurisdiction.chambers.map((chamber, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-sm"
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
