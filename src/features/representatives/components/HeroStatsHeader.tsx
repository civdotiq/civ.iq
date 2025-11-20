/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { EnhancedRepresentative } from '@/types/representative';
import { Users, FileText, DollarSign, Award } from 'lucide-react';
import { ShareIconButton } from '@/components/shared/social/ShareButton';

interface HeroStatsHeaderProps {
  representative: EnhancedRepresentative;
  stats: {
    billsSponsored?: number;
    votesParticipated?: number;
    totalRaised?: number;
    committees?: number;
  };
  loading?: boolean;
  onStatClick?: (tabId: string) => void;
}

export function HeroStatsHeader({
  representative,
  stats,
  loading = false,
  onStatClick,
}: HeroStatsHeaderProps) {
  const [imageError, setImageError] = useState(false);

  // Get photo URL - use API-provided imageUrl or fallback to proxy
  const photoUrl = representative.imageUrl || `/api/photo/${representative.bioguideId}`;

  // Get display name with preference for official name
  const getDisplayName = () => {
    if (representative.fullName?.official) {
      return representative.fullName.official;
    }
    if (representative.fullName?.first && representative.fullName?.last) {
      const middle = representative.fullName.middle ? ` ${representative.fullName.middle}` : '';
      const suffix = representative.fullName.suffix ? `, ${representative.fullName.suffix}` : '';
      return `${representative.fullName.first}${middle} ${representative.fullName.last}${suffix}`;
    }
    return representative.name;
  };

  // Get title with proper formatting
  const getTitle = () => {
    if (representative.chamber === 'Senate') {
      return `U.S. Senator from ${representative.state}`;
    }
    if (representative.district && representative.district !== 'AL') {
      return `U.S. Representative, ${representative.state}-${representative.district}`;
    }
    return `U.S. Representative from ${representative.state}`;
  };

  // Get state rank for senators
  const getStateRank = () => {
    if (representative.chamber === 'Senate' && representative.currentTerm?.stateRank) {
      return representative.currentTerm.stateRank === 'senior'
        ? 'Senior Senator'
        : 'Junior Senator';
    }
    return null;
  };

  // Calculate age from birthday
  const getAge = () => {
    if (!representative.bio?.birthday) return null;

    try {
      const birthDate = new Date(representative.bio.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age;
    } catch {
      return null;
    }
  };

  // Get accent bar color based on party affiliation
  const getAccentBarClass = () => {
    if (representative.party === 'Republican') return 'accent-bar-red';
    if (representative.party === 'Democrat') return 'accent-bar-blue';
    return 'accent-bar-green';
  };

  // Format currency values
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className={`bg-white border-2 border-black relative ${getAccentBarClass()}`}>
      <div className="p-4 sm:p-6 md:p-8">
        {/* Top Section: Photo and Name */}
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-4 sm:gap-6 md:gap-8 mb-6">
          {/* Photo - Compact square frame */}
          <div className="flex-shrink-0 justify-self-center md:justify-self-start">
            {!imageError ? (
              <Image
                src={photoUrl}
                alt={getDisplayName()}
                width={160}
                height={160}
                className="profile-photo-frame w-32 h-32 md:w-40 md:h-40 object-cover"
                onError={() => setImageError(true)}
                data-testid="representative-photo"
                priority
              />
            ) : (
              <div className="profile-photo-frame bg-gray-100 flex items-center justify-center text-gray-400 w-32 h-32 md:w-40 md:h-40">
                <svg
                  className="w-12 h-12 md:w-16 md:h-16"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and Title */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 data-testid="representative-name" className="profile-hero-name">
                {getDisplayName()}
              </h1>
              <ShareIconButton
                data={{
                  representative: {
                    name: representative.name,
                    party: representative.party,
                    state: representative.state,
                    bioguideId: representative.bioguideId,
                    chamber: representative.chamber,
                    district: representative.district,
                  },
                  section: 'overview',
                  stats: {
                    billsSponsored: stats.billsSponsored,
                    totalRaised: stats.totalRaised,
                    committeeCount: stats.committees,
                  },
                }}
              />
            </div>

            <p data-testid="representative-state" className="profile-hero-title mb-4">
              {getTitle()}
            </p>

            {/* Geometric badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {representative.party && (
                <span
                  className={`aicher-heading text-xs sm:text-sm font-bold border-2 px-3 py-2 ${
                    representative.party === 'Republican'
                      ? 'bg-red-50 text-red-800 border-civiq-red'
                      : representative.party === 'Democrat'
                        ? 'bg-blue-50 text-blue-800 border-civiq-blue'
                        : 'bg-gray-50 text-gray-800 border-black'
                  }`}
                >
                  {representative.party}
                </span>
              )}
              {getAge() && (
                <span className="aicher-heading text-xs sm:text-sm font-bold bg-white text-gray-800 border-2 border-black px-3 py-2">
                  AGE {getAge()}
                </span>
              )}
              {getStateRank() && (
                <span className="aicher-heading text-xs sm:text-sm font-bold bg-white text-gray-800 border-2 border-black px-3 py-2">
                  {getStateRank()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats Section - Integrated into Hero */}
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bills Sponsored */}
            <button
              onClick={() => onStatClick?.('legislation')}
              className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-blue transition-colors cursor-pointer text-left"
              type="button"
              aria-label="View sponsored bills"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-civiq-blue" />
                <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                  Bills Sponsored
                </span>
              </div>
              {loading ? (
                <div className="h-8 bg-gray-200 animate-pulse"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.billsSponsored !== undefined ? stats.billsSponsored : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Current Congress</div>
                </>
              )}
            </button>

            {/* Votes Cast */}
            <button
              onClick={() => onStatClick?.('voting')}
              className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-green transition-colors cursor-pointer text-left"
              type="button"
              aria-label="View voting records"
            >
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-civiq-green" />
                <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                  Votes Cast
                </span>
              </div>
              {loading ? (
                <div className="h-8 bg-gray-200 animate-pulse"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.votesParticipated !== undefined ? stats.votesParticipated : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">This term</div>
                </>
              )}
            </button>

            {/* Total Raised */}
            <button
              onClick={() => onStatClick?.('finance')}
              className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-red transition-colors cursor-pointer text-left"
              type="button"
              aria-label="View campaign finance data"
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-civiq-red" />
                <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                  Total Raised
                </span>
              </div>
              {loading ? (
                <div className="h-8 bg-gray-200 animate-pulse"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.totalRaised !== undefined ? formatCurrency(stats.totalRaised) : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Current cycle</div>
                </>
              )}
            </button>

            {/* Committees */}
            <button
              onClick={() => onStatClick?.('overview')}
              className="bg-gray-50 border-2 border-gray-300 p-4 hover:bg-gray-100 hover:border-civiq-blue transition-colors cursor-pointer text-left"
              type="button"
              aria-label="View committee memberships"
            >
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-civiq-blue" />
                <span className="aicher-heading-wide text-xs text-gray-600 uppercase">
                  Committees
                </span>
              </div>
              {loading ? (
                <div className="h-8 bg-gray-200 animate-pulse"></div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.committees !== undefined ? stats.committees : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Current</div>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
