/**
 * Representative Card Component - Displays federal representative information
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { memo } from 'react';
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
}: {
  representative: Representative;
}) {
  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-white';
  };

  return (
    <div className="bg-white border-2 border-black border border-gray-200 overflow-hidden">
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <RepresentativePhoto
            bioguideId={representative.bioguideId}
            name={representative.name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">{representative.name}</h3>
            <p className="text-gray-600 mb-2">{representative.title}</p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(representative.party)}`}
              >
                {representative.party}
              </span>
              {representative.chamber === 'Senate' && (
                <span className="px-2 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                  U.S. Senator
                </span>
              )}
              {representative.chamber === 'House' && (
                <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  U.S. Representative
                </span>
              )}
              {representative.chamber === 'House' && representative.district && (
                <span className="px-2 py-1 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                  District {representative.district}
                </span>
              )}
              {representative.yearsInOffice && representative.yearsInOffice > 0 && (
                <span className="px-2 py-1 bg-civiq-green/10 text-civiq-green rounded-full text-xs font-medium">
                  {representative.yearsInOffice} years in office
                </span>
              )}
            </div>

            {representative.nextElection &&
              representative.nextElection !== '' &&
              representative.nextElection !== '0' && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                  <span className="font-medium">Next Election:</span>
                  <span>{representative.nextElection}</span>
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Committee Assignments */}
      {representative.committees && representative.committees.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Key Committee Assignments</h4>
          <div className="space-y-1">
            {representative.committees.slice(0, 3).map((committee, index) => (
              <div key={index} className="text-sm text-gray-600">
                <Link
                  href={`/committee/${committee.name}`}
                  className="font-medium hover:text-civiq-blue hover:underline"
                >
                  {getCommitteeName(committee.name)}
                </Link>
                {committee.role && <span className="text-civiq-blue ml-1">({committee.role})</span>}
              </div>
            ))}
            {representative.committees.length > 3 && (
              <div className="text-xs text-gray-500">
                +{representative.committees.length - 3} more committees
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {representative.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{representative.phone}</span>
            </div>
          )}
          {representative.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a
                href={`mailto:${representative.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {representative.email}
              </a>
            </div>
          )}
          {representative.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
              <a
                href={representative.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                Official Website
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="px-6 py-4 bg-white border-t border-gray-100">
        <div className="flex justify-end">
          <Link
            href={`/representative/${representative.bioguideId}`}
            className="bg-civiq-blue text-white px-4 py-2 rounded hover:bg-civiq-blue/90 transition-colors text-sm font-medium"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
});
