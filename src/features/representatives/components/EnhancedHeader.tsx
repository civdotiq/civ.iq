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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
      {/* Simple horizontal header layout like June 2025 */}
      <div className="p-6">
        <div className="flex items-center gap-6">
          {/* Photo - smaller and circular like June version */}
          <div className="flex-shrink-0">
            {!imageError ? (
              <Image
                src={photoUrl}
                alt={getDisplayName()}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                onError={() => setImageError(true)}
                data-testid="representative-photo"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-2 border-gray-200">
                <svg
                  className="w-10 h-10"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and Title - cleaner layout */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 data-testid="representative-name" className="text-3xl font-bold text-gray-900">
                {getDisplayName()}
              </h1>
              {getAge() && (
                <span className="text-lg text-gray-500 font-medium">{getAge()} years old</span>
              )}
              {representative.party && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    representative.party === 'Republican'
                      ? 'bg-red-100 text-red-800 border border-red-200'
                      : representative.party === 'Democrat'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}
                >
                  {representative.party}
                </span>
              )}
            </div>
            <p data-testid="representative-state" className="text-lg text-gray-600 mb-2">
              {getTitle()}
            </p>
            {getStateRank() && <p className="text-base text-gray-500">{getStateRank()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
