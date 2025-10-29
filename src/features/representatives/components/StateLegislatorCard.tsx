/**
 * State Legislator Card Component - Displays state representative information
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { memo } from 'react';
import Link from 'next/link';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

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
}: {
  legislator: StateLegislator;
}) {
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

  // Generate profile URL
  const profileUrl = `/state-legislature/${legislator.state.toLowerCase()}/legislator/${legislator.id}`;

  return (
    <Link
      href={profileUrl}
      className="block bg-white border-2 border-black hover:shadow-lg transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Header Section */}
      <div className="p-6 pb-4">
        <div className="flex items-start gap-4">
          <RepresentativePhoto bioguideId={legislator.id} name={legislator.name} size="md" />
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{legislator.name}</h3>
            <p className="text-gray-600 mb-2">
              {legislator.currentRole?.title || `${chamberInfo.name} Member`}
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(legislator.party)}`}
              >
                {legislator.party}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${chamberInfo.color}`}>
                {chamberInfo.name}
              </span>
              <span className="px-2 py-1 bg-white border-2 border-gray-300 text-gray-700 rounded-full text-xs font-medium">
                District {legislator.district}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {legislator.phone && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">📞</span>
              <span className="text-gray-600">{legislator.phone}</span>
            </div>
          )}
          {legislator.email && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">✉️</span>
              <a
                href={`mailto:${legislator.email}`}
                className="text-civiq-blue hover:underline truncate"
              >
                {legislator.email}
              </a>
            </div>
          )}
          {legislator.website && (
            <div className="flex items-center gap-2 md:col-span-2">
              <span className="font-medium text-gray-700">🌐</span>
              <a
                href={legislator.website}
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

      {/* Offices */}
      {legislator.offices && legislator.offices.length > 0 && (
        <div className="px-6 pb-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Offices</h4>
          <div className="space-y-2">
            {legislator.offices.slice(0, 2).map((office, index) => (
              <div key={index} className="text-sm text-gray-600">
                <span className="font-medium">{office.name}</span>
                {office.address && (
                  <div className="text-xs text-gray-500 mt-1">{office.address}</div>
                )}
                {office.phone && <div className="text-xs text-gray-500">Phone: {office.phone}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{legislator.state} State Legislature</span>
          {legislator.currentRole?.start_date && (
            <span className="text-gray-500">
              Since {new Date(legislator.currentRole.start_date).getFullYear()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
});
