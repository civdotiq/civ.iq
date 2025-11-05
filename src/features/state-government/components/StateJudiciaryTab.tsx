/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Scale, AlertCircle, Building2, Users } from 'lucide-react';
import { JusticeCard } from './JusticeCard';
import type { StateJudiciaryApiResponse } from '@/types/state-judiciary';

interface StateJudiciaryTabProps {
  state: string;
}

export const StateJudiciaryTab: React.FC<StateJudiciaryTabProps> = ({ state }) => {
  const { data, error, isLoading } = useSWR<StateJudiciaryApiResponse>(
    `/api/state-judiciary/${state.toUpperCase()}`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-48 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-48 bg-white border-2 border-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data?.success || !data?.data) {
    return (
      <div className="text-center py-12">
        <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load State Judiciary</h2>
        <p className="text-gray-600 mb-4">
          We couldn&apos;t retrieve information about {state.toUpperCase()} state judiciary at this
          time.
        </p>
        <p className="text-sm text-gray-500">Please try refreshing the page.</p>
      </div>
    );
  }

  const courtSystem = data.data;

  // No justices data
  if (!courtSystem.supremeCourt.justices || courtSystem.supremeCourt.justices.length === 0) {
    return (
      <div className="text-center py-12">
        <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Judiciary Data Available</h2>
        <p className="text-gray-600">
          Supreme Court information for {courtSystem.stateName} is not currently available.
        </p>
      </div>
    );
  }

  const chiefJustice = courtSystem.supremeCourt.justices.find(j => j.isChief);
  const associateJustices = courtSystem.supremeCourt.justices.filter(j => !j.isChief);

  // Format selection method
  const formatSelectionMethod = (method: string): string => {
    return method
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Scale className="w-6 h-6 text-civiq-blue" />
          {courtSystem.stateName} Judiciary
        </h2>
        <p className="text-gray-600">State Supreme Court and judicial system information</p>
      </div>

      {/* Court System Information */}
      <div className="bg-white border-2 border-black p-6 mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-civiq-blue" />
          {courtSystem.supremeCourt.name}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Seats */}
          <div className="bg-gray-50 border-2 border-gray-300 p-4 text-center">
            <div className="text-3xl font-bold text-gray-900">{courtSystem.supremeCourt.seats}</div>
            <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
              <Users className="w-4 h-4" />
              Total Seats
            </div>
          </div>

          {/* Term Length */}
          <div className="bg-blue-50 border-2 border-blue-300 p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {courtSystem.supremeCourt.termLength}
            </div>
            <div className="text-sm text-blue-700 mt-1">Years per Term</div>
          </div>

          {/* Selection Method */}
          <div className="bg-green-50 border-2 border-green-300 p-4">
            <div className="text-sm text-gray-700 font-medium mb-1">Selection Method</div>
            <div className="text-sm text-green-800 font-semibold">
              {formatSelectionMethod(courtSystem.supremeCourt.selectionMethod)}
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Notice */}
      <div className="bg-blue-50 border-2 border-blue-300 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">Data Source</p>
            <p className="text-blue-800">
              Judiciary information is sourced from Wikidata and may not be complete for all states.
              Last updated: {new Date(courtSystem.lastUpdated).toLocaleDateString()}.
            </p>
          </div>
        </div>
      </div>

      {/* Chief Justice */}
      {chiefJustice && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Chief Justice</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <JusticeCard justice={chiefJustice} isChief={true} />
          </div>
        </div>
      )}

      {/* Associate Justices */}
      {associateJustices.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Associate Justices ({associateJustices.length})
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {associateJustices.map(justice => (
              <JusticeCard key={justice.wikidataId} justice={justice} />
            ))}
          </div>
        </div>
      )}

      {/* Appellate Courts (if available) */}
      {courtSystem.appellateCourts && courtSystem.appellateCourts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Appellate Courts</h3>
          <div className="space-y-4">
            {courtSystem.appellateCourts.map((court, index) => (
              <div key={index} className="bg-white border-2 border-gray-300 p-4">
                <h4 className="font-semibold text-gray-900 mb-2">{court.name}</h4>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Seats: </span>
                  {court.seats}
                </div>
                {court.judges && court.judges.length > 0 && (
                  <div className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">Current Judges: </span>
                    {court.judges.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          For the most up-to-date court information, please visit the official{' '}
          {courtSystem.stateName} state judiciary website.
        </p>
      </div>
    </div>
  );
};
