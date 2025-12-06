/**
 * Representative Card Component - Displays federal representative information
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { memo, useState } from 'react';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { getCommitteeName } from '@/lib/data/committee-names';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
  terms?: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  yearsInOffice?: number;
  nextElection?: string;
  imageUrl?: string;
  dataComplete: number;
}

export const RepresentativeCard = memo(function RepresentativeCard({
  representative,
  defaultExpanded = false,
}: {
  representative: Representative;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-white';
  };

  return (
    <div className="bg-white border-2 border-black border border-gray-200 overflow-hidden">
      {/* Header Section - Always visible, clickable on mobile to expand */}
      <button
        type="button"
        className="w-full text-left p-4 sm:p-6 sm:pb-4 sm:cursor-default"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <RepresentativePhoto
            bioguideId={representative.bioguideId}
            name={representative.name}
            size="md"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {representative.name}
                </h3>
                <p className="text-sm text-gray-600">{representative.chamber}</p>
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
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPartyColor(representative.party)}`}
              >
                {representative.party}
              </span>
              {representative.chamber === 'House' && representative.district && (
                <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                  {representative.state}-{representative.district}
                </span>
              )}
              {representative.chamber === 'Senate' && (
                <span className="px-2 py-0.5 bg-white border border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                  {representative.state}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      {/* Expandable Content - collapsed on mobile by default, always visible on desktop */}
      <div className={`${isExpanded ? 'block' : 'hidden'} sm:block`}>
        {/* Additional badges */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {representative.chamber === 'Senate' && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                U.S. Senator
              </span>
            )}
            {representative.chamber === 'House' && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                U.S. Representative
              </span>
            )}
            {representative.yearsInOffice && representative.yearsInOffice > 0 && (
              <span className="px-2 py-0.5 bg-civiq-green/10 text-civiq-green rounded-full text-xs font-medium">
                {representative.yearsInOffice} yrs
              </span>
            )}
            {representative.nextElection &&
              representative.nextElection !== '' &&
              representative.nextElection !== '0' && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  Next: {representative.nextElection}
                </span>
              )}
          </div>
        </div>

        {/* Contact Information */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex flex-wrap gap-3 text-sm">
            {representative.phone && (
              <a
                href={`tel:${representative.phone}`}
                className="flex items-center gap-1 text-gray-600 hover:text-civiq-blue"
              >
                <span>📞</span>
                <span>{representative.phone}</span>
              </a>
            )}
            {representative.website && (
              <a
                href={representative.website}
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

        {/* Committee Assignments */}
        {representative.committees && representative.committees.length > 0 && (
          <div className="px-4 sm:px-6 pb-3">
            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">Committees</h4>
            <div className="space-y-0.5">
              {representative.committees.slice(0, 2).map((committee, index) => (
                <div key={index} className="text-sm text-gray-600 truncate">
                  <Link
                    href={`/committee/${committee.name}`}
                    className="hover:text-civiq-blue hover:underline"
                  >
                    {getCommitteeName(committee.name)}
                  </Link>
                </div>
              ))}
              {representative.committees.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{representative.committees.length - 2} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100">
          <Link
            href={`/representative/${representative.bioguideId}`}
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
