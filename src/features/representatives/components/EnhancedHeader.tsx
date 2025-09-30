/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { EnhancedRepresentative } from '@/types/representative';

interface EnhancedHeaderProps {
  representative: EnhancedRepresentative;
}

export function EnhancedHeader({ representative }: EnhancedHeaderProps) {
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

  return (
    <div className={`bg-white border-2 border-black relative ${getAccentBarClass()}`}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-4 sm:gap-6 md:gap-12">
          {/* Photo - Square geometric frame */}
          <div className="flex-shrink-0 justify-self-center md:justify-self-start">
            {!imageError ? (
              <Image
                src={photoUrl}
                alt={getDisplayName()}
                width={160}
                height={160}
                className="profile-photo-frame"
                onError={() => setImageError(true)}
                data-testid="representative-photo"
              />
            ) : (
              <div className="profile-photo-frame bg-gray-100 flex items-center justify-center text-gray-400">
                <svg
                  className="w-16 h-16"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and Title - Ulm School large typography */}
          <div className="text-center md:text-left">
            <h1 data-testid="representative-name" className="profile-hero-name mb-4">
              {getDisplayName()}
            </h1>

            <p data-testid="representative-state" className="profile-hero-title mb-6">
              {getTitle()}
            </p>

            {/* Geometric badges with systematic spacing */}
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
      </div>
    </div>
  );
}
