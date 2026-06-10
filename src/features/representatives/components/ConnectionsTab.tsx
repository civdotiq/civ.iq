/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { DollarSign, Calendar, MessageSquare, Users, Building2 } from 'lucide-react';

interface ConnectionsTabProps {
  bioguideId: string;
}

interface DistrictSpending {
  totalSpending: number;
  contractSpending: number;
  grantSpending: number;
  topContracts: Array<{
    recipient: string;
    amount: number;
    agency: string;
    description: string;
  }>;
  topGrants: Array<{
    recipient: string;
    amount: number;
    agency: string;
    description: string;
  }>;
}

interface ConnectionsResponse {
  success: boolean;
  connections: {
    districtSpending: DistrictSpending | null;
    relevantAgencies: Array<{ name: string; slug: string }>;
    relevantTopics: string[];
    relevantHearings: Array<{
      id: string;
      title: string;
      chamber: string;
      dateIssued: string;
      relevance: string;
      pdfUrl: string;
    }>;
    openCommentPeriods: Array<{
      id: string;
      title: string;
      agency: string;
      summary: string;
      daysUntilClose: number;
      commentUrl: string | null;
      relevance: string;
    }>;
    stateLegislators: Array<{
      id: string;
      name: string;
      chamber: string;
      district: string;
      party: string;
    }>;
    cityCouncils: Array<{
      city: string;
      members: Array<{
        id: number;
        name: string;
        city: string;
        title: string | null;
      }>;
    }>;
  };
  civicActions: {
    canComment: number;
    upcomingDeadlines: Array<{
      title: string;
      daysLeft: number;
      url: string | null;
    }>;
  };
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
};

const ConnectionsTabComponent = React.memo(({ bioguideId }: ConnectionsTabProps) => {
  const { data, error, isLoading } = useSWR<ConnectionsResponse>(
    `/api/representative/${bioguideId}/connections`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 bg-gray-200 w-1/3"></div>
        <div className="h-32 bg-gray-100 border-2 border-gray-300"></div>
        <div className="h-32 bg-gray-100 border-2 border-gray-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-amber-600 mb-2">Failed to load connections data</div>
        <div className="text-sm text-gray-500">Please try refreshing the page</div>
      </div>
    );
  }

  if (!data?.success || !data.connections) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No connections data available</div>
        <div className="text-sm text-gray-400">
          Connection data aggregates spending, hearings, regulations, and officials
        </div>
      </div>
    );
  }

  const { connections, civicActions } = data;

  // Check if there's any data to show
  const hasContent =
    civicActions.canComment > 0 ||
    (connections.districtSpending && connections.districtSpending.totalSpending > 0) ||
    connections.relevantHearings.length > 0 ||
    connections.openCommentPeriods.length > 0 ||
    connections.stateLegislators.length > 0 ||
    connections.cityCouncils.length > 0;

  if (!hasContent) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No connections data available</div>
        <div className="text-sm text-gray-400">
          Connection data aggregates spending, hearings, regulations, and officials related to this
          representative
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Civic Action Summary */}
      {civicActions.canComment > 0 && (
        <div className="bg-gray-100 border-2 border-gray-400 p-4">
          <div className="font-semibold text-gray-600 mb-1">
            {civicActions.canComment} Open Comment Period
            {civicActions.canComment !== 1 ? 's' : ''}
          </div>
          <div className="text-sm text-gray-600">
            You can influence policy — these regulations are open for public comment
          </div>
          {civicActions.upcomingDeadlines.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Closing soon:{' '}
              {civicActions.upcomingDeadlines.map(d => `${d.title} (${d.daysLeft}d)`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* District Spending */}
      {connections.districtSpending && connections.districtSpending.totalSpending > 0 && (
        <div className="border-2 border-black p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-civiq-blue" />
            <h3 className="text-lg font-semibold text-gray-900">District Spending</h3>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 uppercase">Total</div>
              <div className="text-xl font-bold">
                {formatCurrency(connections.districtSpending.totalSpending)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Contracts</div>
              <div className="text-xl font-bold">
                {formatCurrency(connections.districtSpending.contractSpending)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Grants</div>
              <div className="text-xl font-bold">
                {formatCurrency(connections.districtSpending.grantSpending)}
              </div>
            </div>
          </div>

          {connections.districtSpending.topContracts.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Contracts</h4>
              <div className="space-y-2 font-mono text-sm">
                {connections.districtSpending.topContracts.slice(0, 5).map((c, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-700 truncate mr-3" title={c.recipient}>
                      {c.recipient}
                    </span>
                    <span className="font-semibold flex-shrink-0">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {connections.districtSpending.topGrants.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Top Grants</h4>
              <div className="space-y-2 font-mono text-sm">
                {connections.districtSpending.topGrants.slice(0, 5).map((g, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-700 truncate mr-3" title={g.recipient}>
                      {g.recipient}
                    </span>
                    <span className="font-semibold flex-shrink-0">{formatCurrency(g.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Relevant Hearings */}
      {connections.relevantHearings.length > 0 && (
        <div className="border-2 border-black p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-civiq-blue" />
            <h3 className="text-lg font-semibold text-gray-900">
              Relevant Hearings ({connections.relevantHearings.length})
            </h3>
          </div>
          <div className="space-y-3">
            {connections.relevantHearings.map(hearing => (
              <div key={hearing.id} className="border-b border-gray-200 pb-3 last:border-0">
                <a
                  href={hearing.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3ea2d4] hover:underline text-sm font-medium"
                >
                  {hearing.title}
                </a>
                <div className="text-xs text-gray-500 mt-1">
                  {hearing.chamber} ·{' '}
                  {new Date(hearing.dateIssued).toLocaleDateString('en-US', { timeZone: 'UTC' })} ·{' '}
                  {hearing.relevance}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Comment Periods */}
      {connections.openCommentPeriods.length > 0 && (
        <div className="border-2 border-black p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-civiq-blue" />
            <h3 className="text-lg font-semibold text-gray-900">
              Open Comment Periods ({connections.openCommentPeriods.length})
            </h3>
          </div>
          <div className="space-y-3">
            {connections.openCommentPeriods.map(period => (
              <div key={period.id} className="border-b border-gray-200 pb-3 last:border-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    {period.commentUrl ? (
                      <a
                        href={period.commentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3ea2d4] hover:underline text-sm font-medium"
                      >
                        {period.title}
                      </a>
                    ) : (
                      <span className="text-sm font-medium text-gray-900">{period.title}</span>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {period.agency} · {period.relevance}
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 text-xs font-bold px-2 py-1 border-2 ${
                      period.daysUntilClose <= 7
                        ? 'border-civiq-red bg-civiq-red/10 text-civiq-red'
                        : 'border-gray-300 bg-gray-50 text-gray-700'
                    }`}
                  >
                    {period.daysUntilClose}d left
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Legislators */}
      {connections.stateLegislators.length > 0 && (
        <div className="border-2 border-black p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-civiq-blue" />
            <h3 className="text-lg font-semibold text-gray-900">
              State Legislators ({connections.stateLegislators.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {connections.stateLegislators.map(leg => (
              <div key={leg.id} className="flex items-center gap-2 text-sm py-1">
                <span
                  className={`w-2 h-2 flex-shrink-0 ${
                    leg.party === 'Democratic'
                      ? 'bg-party-dem'
                      : leg.party === 'Republican'
                        ? 'bg-[#e11d07]'
                        : 'bg-gray-400'
                  }`}
                />
                <span className="text-gray-900">{leg.name}</span>
                <span className="text-xs text-gray-500">
                  {leg.chamber} {leg.district}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* City Councils */}
      {connections.cityCouncils.length > 0 && (
        <div className="border-2 border-black p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-civiq-blue" />
            <h3 className="text-lg font-semibold text-gray-900">City Council</h3>
          </div>
          {connections.cityCouncils.map(council => (
            <div key={council.city} className="mb-4 last:mb-0">
              <h4 className="text-sm font-medium text-gray-700 mb-2">{council.city}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {council.members.map(member => (
                  <div key={member.id} className="text-sm text-gray-700 py-1">
                    {member.name}
                    {member.title && (
                      <span className="text-xs text-gray-500 ml-1">· {member.title}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

ConnectionsTabComponent.displayName = 'ConnectionsTab';
export const ConnectionsTab = ConnectionsTabComponent;
