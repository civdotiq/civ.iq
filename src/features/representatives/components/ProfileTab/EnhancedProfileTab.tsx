/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { EnhancedRepresentative } from '@/types/representative';

interface ProfileTabProps {
  representative: EnhancedRepresentative;
  committees?: Array<{
    name: string;
    role?: string;
    thomas_id?: string;
    id?: string;
  }>;
}

// Helper function to calculate age
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

// Helper function to format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper function to calculate years in office
function calculateYearsInOffice(startDate: string): string {
  const start = new Date(startDate);
  const today = new Date();
  const years = today.getFullYear() - start.getFullYear();
  const months = today.getMonth() - start.getMonth();

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else if (months < 0) {
    return `${years - 1} year${years - 1 !== 1 ? 's' : ''}`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

// Helper function to get next election date
function getNextElectionDate(chamber: 'House' | 'Senate', currentTermEnd?: string): string {
  if (currentTermEnd) {
    const endDate = new Date(currentTermEnd);
    const electionYear = endDate.getFullYear();
    return `November ${electionYear}`;
  }

  // Default fallback based on chamber
  if (chamber === 'House') {
    // House members are elected every 2 years
    const currentYear = new Date().getFullYear();
    const nextEvenYear = currentYear % 2 === 0 ? currentYear : currentYear + 1;
    return `November ${nextEvenYear}`;
  } else {
    // Senate members are elected every 6 years
    return 'See current term end date';
  }
}

export function EnhancedProfileTab({ representative, committees }: ProfileTabProps) {
  const age = representative.bio?.birthday ? calculateAge(representative.bio.birthday) : null;

  const timeInOffice = representative.currentTerm?.start
    ? calculateYearsInOffice(representative.currentTerm.start)
    : null;

  const nextElection = getNextElectionDate(representative.chamber, representative.currentTerm?.end);

  return (
    <div className="space-y-6">
      {/* Enhanced Biography Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Biography</h3>
          <span className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleDateString()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h4>
            <dl className="space-y-3">
              {/* Age */}
              {age && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Age:</dt>
                  <dd className="text-sm text-gray-900">{age} years old</dd>
                </div>
              )}

              {/* Birthday */}
              {representative.bio?.birthday && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Birthday:</dt>
                  <dd className="text-sm text-gray-900">
                    {formatDate(representative.bio.birthday)}
                  </dd>
                </div>
              )}

              {/* Gender */}
              {representative.bio?.gender && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Gender:</dt>
                  <dd className="text-sm text-gray-900">
                    {representative.bio.gender === 'M' ? 'Male' : 'Female'}
                  </dd>
                </div>
              )}

              {/* Religion */}
              {representative.bio?.religion && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Religion:</dt>
                  <dd className="text-sm text-gray-900">{representative.bio.religion}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Political Information with Clickable Links */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Political Information</h4>
            <dl className="space-y-3">
              {/* Chamber - Clickable */}
              <div className="flex">
                <dt className="w-32 text-sm font-medium text-gray-500">Chamber:</dt>
                <dd className="text-sm">
                  <Link
                    href={`/representatives?chamber=${representative.chamber}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {representative.chamber}
                  </Link>
                </dd>
              </div>

              {/* State - Clickable */}
              <div className="flex">
                <dt className="w-32 text-sm font-medium text-gray-500">State:</dt>
                <dd className="text-sm">
                  <Link
                    href={`/representatives?state=${representative.state}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {representative.state}
                  </Link>
                </dd>
              </div>

              {/* District - Clickable */}
              {representative.district && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">District:</dt>
                  <dd className="text-sm">
                    <Link
                      href={`/districts/${representative.state}-${representative.district}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {representative.district}
                    </Link>
                  </dd>
                </div>
              )}

              {/* Party - Clickable */}
              <div className="flex">
                <dt className="w-32 text-sm font-medium text-gray-500">Party:</dt>
                <dd className="text-sm">
                  <Link
                    href={`/representatives?party=${encodeURIComponent(representative.party || 'Unknown')}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {representative.party || 'Unknown'}
                  </Link>
                </dd>
              </div>

              {/* Time in Office */}
              {timeInOffice && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Time in Office:</dt>
                  <dd className="text-sm text-gray-900">{timeInOffice}</dd>
                </div>
              )}

              {/* Next Election */}
              <div className="flex">
                <dt className="w-32 text-sm font-medium text-gray-500">Next Election:</dt>
                <dd className="text-sm text-gray-900">{nextElection}</dd>
              </div>

              {/* Senate Class (if applicable) */}
              {representative.chamber === 'Senate' && representative.currentTerm?.class && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Senate Class:</dt>
                  <dd className="text-sm text-gray-900">
                    Class {representative.currentTerm.class}
                  </dd>
                </div>
              )}

              {/* State Rank (for Senators) */}
              {representative.chamber === 'Senate' && representative.currentTerm?.stateRank && (
                <div className="flex">
                  <dt className="w-32 text-sm font-medium text-gray-500">Seniority:</dt>
                  <dd className="text-sm text-gray-900">
                    {representative.currentTerm.stateRank === 'senior' ? 'Senior' : 'Junior'}{' '}
                    Senator
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Contact Information - Enhanced */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Washington DC Office */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Washington, DC Office</h4>
            <dl className="space-y-2">
              {representative.currentTerm?.office && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Office:</dt>
                  <dd className="text-sm text-gray-900">{representative.currentTerm.office}</dd>
                </div>
              )}
              {representative.currentTerm?.address && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Address:</dt>
                  <dd className="text-sm text-gray-900">{representative.currentTerm.address}</dd>
                </div>
              )}
              {representative.currentTerm?.phone && (
                <div>
                  <dt className="text-xs font-medium text-gray-500">Phone:</dt>
                  <dd className="text-sm">
                    <a
                      href={`tel:${representative.currentTerm.phone}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      {representative.currentTerm.phone}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-medium text-gray-500">Hours:</dt>
                <dd className="text-sm text-gray-900">Monday-Friday, 9:00 AM - 5:00 PM EST</dd>
              </div>
            </dl>
          </div>

          {/* Online Presence */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Online Presence</h4>
            <div className="space-y-2">
              {representative.currentTerm?.website && (
                <a
                  href={representative.currentTerm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  Official Website
                </a>
              )}
              {representative.currentTerm?.contactForm && (
                <a
                  href={representative.currentTerm.contactForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Send Message
                </a>
              )}
              {representative.currentTerm?.rssUrl && (
                <a
                  href={representative.currentTerm.rssUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
                    />
                  </svg>
                  RSS Feed
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Committee Assignments - Enhanced with Links */}
      {committees && committees.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Committee Assignments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {committees.map((committee, idx) => {
              const committeeId = committee.thomas_id || committee.id || '';
              // For committee routing, use the full ID (e.g., HSAG22, HSHM09)
              const routingId = committeeId;

              // Skip if no valid committee ID
              if (!routingId) {
                // Committee missing ID - skip rendering
                return null;
              }

              return (
                <div
                  key={`committee-${committee.name}-${committee.id || idx}`}
                  className="bg-gray-50 p-4 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/committee/${routingId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {committee.name}
                    </Link>
                    {committee.role && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          committee.role === 'Chair'
                            ? 'bg-green-100 text-green-800'
                            : committee.role === 'Ranking Member'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {committee.role}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
