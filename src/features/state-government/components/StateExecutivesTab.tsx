/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { Shield, Users, Calendar, AlertCircle } from 'lucide-react';
import { ExecutiveProfileCard } from './ExecutiveProfileCard';

interface StateExecutive {
  id: string;
  name: string;
  position:
    | 'governor'
    | 'lieutenant_governor'
    | 'attorney_general'
    | 'secretary_of_state'
    | 'treasurer'
    | 'comptroller'
    | 'auditor'
    | 'other';
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  termStart: string;
  termEnd: string;
  isIncumbent: boolean;
  previousOffices?: Array<{
    office: string;
    startYear: number;
    endYear: number;
  }>;
  keyInitiatives?: string[];
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    website?: string;
  };
}

interface StateExecutivesData {
  state: string;
  stateName: string;
  lastUpdated: string;
  nextElection: {
    date: string;
    offices: string[];
  };
  executives: StateExecutive[];
  totalCount: number;
  partyBreakdown: {
    Democratic: number;
    Republican: number;
    Independent: number;
    Other: number;
  };
}

interface StateExecutivesTabProps {
  state: string;
}

export const StateExecutivesTab: React.FC<StateExecutivesTabProps> = ({ state }) => {
  const { data, error, isLoading } = useSWR<StateExecutivesData>(
    `/api/state-executives/${state.toUpperCase()}`,
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-64 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-64 bg-white border-2 border-gray-300 rounded"></div>
          <div className="h-64 bg-white border-2 border-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load State Executives</h2>
        <p className="text-gray-600 mb-4">
          We couldn&apos;t retrieve information about {state.toUpperCase()} state executives at this
          time.
        </p>
        <p className="text-sm text-gray-500">Please try refreshing the page.</p>
      </div>
    );
  }

  // No data state
  if (!data.executives || data.executives.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Executives Data Available</h2>
        <p className="text-gray-600">
          Executive officer information for {data.stateName} is not currently available.
        </p>
      </div>
    );
  }

  // Sort executives by position importance
  const positionOrder = [
    'governor',
    'lieutenant_governor',
    'attorney_general',
    'secretary_of_state',
    'treasurer',
    'comptroller',
    'auditor',
    'other',
  ];

  const sortedExecutives = [...data.executives].sort((a, b) => {
    return positionOrder.indexOf(a.position) - positionOrder.indexOf(b.position);
  });

  const governor = sortedExecutives.find(exec => exec.position === 'governor');
  const otherExecutives = sortedExecutives.filter(exec => exec.position !== 'governor');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Shield className="w-6 h-6 text-civiq-blue" />
          {data.stateName} State Executives
        </h2>
        <p className="text-gray-600">Statewide elected officials and executive branch leadership</p>
      </div>

      {/* Party Breakdown Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-2 border-gray-300 p-4 text-center">
          <div className="text-3xl font-bold text-gray-900">{data.totalCount}</div>
          <div className="text-sm text-gray-600 flex items-center justify-center gap-1 mt-1">
            <Users className="w-4 h-4" />
            Total Officials
          </div>
        </div>
        <div className="bg-blue-50 border-2 border-blue-300 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{data.partyBreakdown.Democratic}</div>
          <div className="text-sm text-blue-700 mt-1">Democrats</div>
        </div>
        <div className="bg-red-50 border-2 border-red-300 p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{data.partyBreakdown.Republican}</div>
          <div className="text-sm text-red-700 mt-1">Republicans</div>
        </div>
        {data.partyBreakdown.Independent > 0 && (
          <div className="bg-purple-50 border-2 border-purple-300 p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">
              {data.partyBreakdown.Independent}
            </div>
            <div className="text-sm text-purple-700 mt-1">Independents</div>
          </div>
        )}
      </div>

      {/* Next Election Info */}
      {data.nextElection && (
        <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-6">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Next Election</h3>
              <p className="text-sm text-gray-700">
                {new Date(data.nextElection.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              {data.nextElection.offices && data.nextElection.offices.length > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  Offices up for election: {data.nextElection.offices.join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Source Notice */}
      <div className="bg-blue-50 border-2 border-blue-300 p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">Data Source</p>
            <p className="text-blue-800">
              Executive information is sourced from Wikidata and may not be complete for all states.
              Last updated: {new Date(data.lastUpdated).toLocaleDateString()}.
            </p>
          </div>
        </div>
      </div>

      {/* Governor (Highlighted) */}
      {governor && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Governor</h3>
          <ExecutiveProfileCard official={governor} highlighted={true} />
        </div>
      )}

      {/* Other Executives */}
      {otherExecutives.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Other Statewide Officials</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {otherExecutives.map(executive => (
              <ExecutiveProfileCard key={executive.id} official={executive} />
            ))}
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>
          For the most up-to-date information, please visit the official {data.stateName} state
          government website.
        </p>
      </div>
    </div>
  );
};
