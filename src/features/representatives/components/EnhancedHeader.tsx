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
    <div className="bg-white aicher-border relative">
      {/* Colored top accent bar - CIV.IQ brand gradient */}
      <div
        className="absolute top-0 left-0 right-0 bg-gradient-to-r from-civiq-red via-civiq-green to-civiq-blue"
        style={{ height: 'calc(var(--grid) * 0.75)' }}
      ></div>

      <div style={{ padding: 'calc(var(--grid) * 6) calc(var(--grid) * 4) calc(var(--grid) * 4)' }}>
        <div
          className="grid grid-cols-1 md:grid-cols-[auto_1fr] items-center"
          style={{ gap: 'calc(var(--grid) * 6)' }}
        >
          {/* Photo - Geometric framing with consistent sizing */}
          <div className="flex-shrink-0 justify-self-center md:justify-self-start">
            {!imageError ? (
              <Image
                src={photoUrl}
                alt={getDisplayName()}
                width={128}
                height={128}
                className="object-cover aicher-border"
                style={{ width: 'calc(var(--grid) * 16)', height: 'calc(var(--grid) * 16)' }}
                onError={() => setImageError(true)}
                data-testid="representative-photo"
              />
            ) : (
              <div
                className="bg-gray-100 flex items-center justify-center text-gray-400 aicher-border"
                style={{ width: 'calc(var(--grid) * 16)', height: 'calc(var(--grid) * 16)' }}
              >
                <svg
                  className="w-12 h-12"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name and Title - Improved typography hierarchy */}
          <div className="text-center md:text-left">
            <h1
              data-testid="representative-name"
              className="aicher-display-title text-gray-900 leading-tight"
              style={{
                marginBottom: 'calc(var(--grid) * 2)',
                fontSize: 'calc(var(--type-3xl) * 1.1)',
                lineHeight: '1.1',
              }}
            >
              {getDisplayName()}
            </h1>

            <p
              data-testid="representative-state"
              className="type-xl text-gray-600 font-medium"
              style={{ marginBottom: 'calc(var(--grid) * 3)' }}
            >
              {getTitle()}
            </p>

            {/* Geometric badges with improved spacing */}
            <div
              className="flex flex-wrap items-center justify-center md:justify-start"
              style={{ gap: 'calc(var(--grid) * 2)' }}
            >
              {representative.party && (
                <span
                  className={`aicher-heading type-sm font-bold aicher-border ${
                    representative.party === 'Republican'
                      ? 'bg-red-50 text-red-800 border-red'
                      : representative.party === 'Democrat'
                        ? 'bg-blue-50 text-blue-800 border-blue'
                        : 'bg-gray-50 text-gray-800 border-black'
                  }`}
                  style={{ padding: 'calc(var(--grid) * 1.5) calc(var(--grid) * 3)' }}
                >
                  {representative.party}
                </span>
              )}
              {getAge() && (
                <span
                  className="aicher-heading type-sm font-bold bg-green-50 text-green-800 border-green aicher-border"
                  style={{ padding: 'calc(var(--grid) * 1.5) calc(var(--grid) * 3)' }}
                >
                  {getAge()} years old
                </span>
              )}
              {getStateRank() && (
                <span
                  className="aicher-heading type-sm font-bold bg-purple-50 text-purple-800 border-black aicher-border"
                  style={{ padding: 'calc(var(--grid) * 1.5) calc(var(--grid) * 3)' }}
                >
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
