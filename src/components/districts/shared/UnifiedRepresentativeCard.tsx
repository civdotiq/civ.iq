/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { encodeBase64Url } from '@/lib/url-encoding';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

/**
 * Federal representative type (minimal props needed for display)
 */
interface FederalRepresentative {
  bioguideId: string;
  name: string;
  party: string;
  imageUrl?: string;
  yearsInOffice?: number;
  email?: string;
}

/**
 * State legislator type (uses EnhancedStateLegislator)
 */
type StateLegislator = EnhancedStateLegislator;

/**
 * Union type for both federal and state representatives
 */
type UnifiedRepresentativeData = FederalRepresentative | StateLegislator;

interface UnifiedRepresentativeCardProps {
  representative: UnifiedRepresentativeData;
  districtName: string;
}

/**
 * Type guard to check if representative is a federal representative
 */
function isFederalRepresentative(rep: UnifiedRepresentativeData): rep is FederalRepresentative {
  return 'bioguideId' in rep;
}

/**
 * Unified Representative Card Component
 *
 * Displays representative information with a consistent design across
 * both federal and state district pages. Uses the superior state design
 * (larger photo, email contact, better hierarchy).
 *
 * Supports:
 * - Federal representatives (bioguideId-based)
 * - State legislators (OpenStates ID-based)
 */
export default function UnifiedRepresentativeCard({
  representative,
  districtName,
}: UnifiedRepresentativeCardProps) {
  const isFederal = isFederalRepresentative(representative);

  // Extract common fields
  const name = representative.name;
  const party = representative.party;
  const email = representative.email;

  // Build profile link
  const profileLink = isFederal
    ? `/representative/${representative.bioguideId}`
    : `/state-legislature/${representative.state}/legislator/${encodeBase64Url(representative.id)}`;

  // Normalize party names (state uses "Democratic", federal uses "Democrat")
  const displayParty = party === 'Democratic' ? 'Democrat' : party;
  const partyColorClass =
    party === 'Democrat' || party === 'Democratic'
      ? 'bg-blue-100 text-blue-800'
      : party === 'Republican'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800';

  return (
    <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
      <div className="flex items-start gap-6">
        {/* Photo - 100px for both federal and state (state's superior size) */}
        <div className="flex-shrink-0">
          {isFederal ? (
            <RepresentativePhoto
              bioguideId={representative.bioguideId}
              name={name}
              className="w-[100px] h-[100px] rounded-full border-2 border-gray-300"
            />
          ) : (
            representative.photo_url && (
              <Image
                src={representative.photo_url}
                alt={name}
                width={100}
                height={100}
                className="rounded-full border-2 border-gray-300"
              />
            )
          )}
        </div>

        {/* Info Section */}
        <div className="flex-1">
          {/* Name - larger text like state design */}
          <h3 className="font-bold text-2xl mb-2">{name}</h3>

          {/* District Title */}
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Representative for {districtName}</span>
            </div>

            {/* Party Badge */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-bold ${partyColorClass}`}
              >
                {displayParty}
              </span>

              {/* Years in Office (federal only) */}
              {isFederal && representative.yearsInOffice && (
                <span className="text-sm text-gray-500">
                  {representative.yearsInOffice} years in office
                </span>
              )}
            </div>

            {/* Email Contact (if available) */}
            {email && (
              <div className="text-civiq-blue hover:underline">
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            )}
          </div>

          {/* View Full Profile Button */}
          <Link
            href={profileLink}
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            View Full Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
