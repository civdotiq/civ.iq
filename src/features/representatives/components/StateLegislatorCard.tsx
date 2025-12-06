/**
 * State Legislator Card Component - Displays state representative information
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { memo, useState } from 'react';
import Link from 'next/link';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { encodeBase64Url } from '@/lib/url-encoding';

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

export const StateLegislatorCard = memo(function StateLegislatorCard({
  legislator,
  defaultExpanded = false,
}: {
  legislator: StateLegislator;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-white';
  };

  const getChamberInfo = (chamber: string) => {
    if (chamber === 'upper')
      return { name: 'State Senate', color: 'bg-purple-100 text-purple-800' };
    if (chamber === 'lower') return { name: 'State House', color: 'bg-green-100 text-green-800' };
    return { name: 'Legislature', color: 'bg-white border-2 border-gray-300 text-gray-800' };
  };

  const chamberInfo = getChamberInfo(legislator.chamber);

  // Generate profile URL - Base64 encode the ID for URL safety
  const base64Id = encodeBase64Url(legislator.id);
  const profileUrl = `/state-legislature/${legislator.state.toLowerCase()}/legislator/${base64Id}`;

  return (
    <div className="bg-white border-2 border-black border border-gray-200 overflow-hidden">
      {/* Header Section - Always visible, clickable on mobile to expand */}
      <button
        type="button"
        className="w-full text-left p-4 sm:p-6 sm:pb-4 sm:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <RepresentativePhoto bioguideId={legislator.id} name={legislator.name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {legislator.name}
                </h3>
                <p className="text-sm text-gray-600">
                  {legislator.currentRole?.title || `${chamberInfo.name} Member`}
                </p>
              </div>
              {/* Expand/collapse chevron - mobile only */}
              <div className="sm:hidden flex-shrink-0 mt-1">
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPartyColor(legislator.party)}`}
              >
                {legislator.party}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${chamberInfo.color}`}>
                {chamberInfo.name}
              </span>
              <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                District {legislator.district}
              </span>
            </div>
          </div>
        </div>
      </button>

      {/* Expandable Content - collapsed on mobile by default, always visible on desktop */}
      <div className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
        {/* Additional badges */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {legislator.currentRole?.start_date && (
              <span className="px-2 py-0.5 bg-civiq-green/10 text-civiq-green rounded-full text-xs font-medium">
                Since {new Date(legislator.currentRole.start_date).getFullYear()}
              </span>
            )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex flex-wrap gap-3 text-sm">
            {legislator.phone && (
              <a
                href={`tel:${legislator.phone}`}
                className="flex items-center gap-1 text-gray-600 hover:text-civiq-blue"
              >
                <span>📞</span>
                <span>{legislator.phone}</span>
              </a>
            )}
            {legislator.email && (
              <a
                href={`mailto:${legislator.email}`}
                className="flex items-center gap-1 text-civiq-blue hover:underline truncate"
              >
                <span>✉️</span>
                <span className="truncate max-w-[180px]">{legislator.email}</span>
              </a>
            )}
            {legislator.website && (
              <a
                href={legislator.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-civiq-blue hover:underline"
              >
                <span>🌐</span>
                <span>Website</span>
              </a>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href={profileUrl}
            className="block w-full bg-civiq-blue text-white text-center px-4 py-2.5 hover:bg-civiq-blue/90 transition-colors text-sm font-medium"
          >
            View Full Profile
          </Link>
        </div>
      </div>

      {/* Collapsed state hint - mobile only */}
      {!isExpanded && (
        <div className="sm:hidden px-4 pb-3 text-center">
          <span className="text-xs text-gray-400">Tap to expand</span>
        </div>
      )}
    </div>
  );
});
