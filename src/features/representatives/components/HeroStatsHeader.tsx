/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Crown, Phone, ExternalLink } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { ShareIconButton } from '@/components/shared/social/ShareButton';
import { AlertSubscribeButton } from '@/components/alerts/AlertSubscribeButton';

interface HeroStatsHeaderProps {
  representative: EnhancedRepresentative;
  nextElection?: number | null;
  focusAreas?: string[];
}

export function HeroStatsHeader({
  representative,
  nextElection,
  focusAreas,
}: HeroStatsHeaderProps) {
  const [imageError, setImageError] = useState(false);

  // Use leadership roles from the representative data (loaded from legislators YAML)
  const currentLeadershipRoles = representative.leadershipRoles?.filter(
    role => !role.end || new Date(role.end) > new Date()
  );

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

  // Get title with proper formatting and links
  const getTitleElement = () => {
    if (representative.chamber === 'Senate') {
      return (
        <>
          U.S. Senator from{' '}
          <Link
            href={`/states/${representative.state}`}
            className="hover:text-civiq-blue transition-colors underline decoration-1 underline-offset-2"
          >
            {representative.state}
          </Link>
        </>
      );
    }
    if (representative.district && representative.district !== 'AL') {
      return (
        <>
          U.S. Representative,{' '}
          <Link
            href={`/districts/${representative.state}-${representative.district}`}
            className="hover:text-civiq-blue transition-colors underline decoration-1 underline-offset-2"
          >
            {representative.state}-{representative.district}
          </Link>
        </>
      );
    }
    return (
      <>
        U.S. Representative from{' '}
        <Link
          href={`/states/${representative.state}`}
          className="hover:text-civiq-blue transition-colors underline decoration-1 underline-offset-2"
        >
          {representative.state}
        </Link>
      </>
    );
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

  // Resolve contact info — currentTerm takes precedence
  const phone = representative.currentTerm?.phone || representative.phone;
  const website = representative.currentTerm?.website || representative.website;
  const hasContact = phone || website;

  return (
    <div className={`bg-white border-2 border-black relative ${getAccentBarClass()}`}>
      {representative.isHistorical && (
        <div className="bg-gray-100 border-b-2 border-black px-4 py-3 text-center">
          <p className="text-sm font-medium text-gray-700">
            Former Member of Congress — No longer serving
          </p>
        </div>
      )}
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
                }}
              />
              {!representative.isHistorical && (
                <AlertSubscribeButton
                  bioguideId={representative.bioguideId}
                  name={representative.name}
                  chamber={representative.chamber}
                />
              )}
            </div>

            <p
              data-testid="representative-state"
              className="profile-hero-title accent-title-underline-blue mb-6"
            >
              {getTitleElement()}
            </p>

            {/* Geometric badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {representative.party && (
                <span
                  className={`aicher-heading text-xs sm:text-sm font-bold border-2 px-3 py-2 ${
                    representative.party === 'Republican'
                      ? 'bg-civiq-red/10 text-civiq-red border-civiq-red'
                      : representative.party === 'Democrat'
                        ? 'bg-civiq-blue/10 text-civiq-blue border-civiq-blue'
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
              {nextElection && (
                <span className="aicher-heading text-xs sm:text-sm font-bold bg-white text-gray-800 border-2 border-black px-3 py-2">
                  UP IN {nextElection}
                </span>
              )}
              {currentLeadershipRoles?.map((role, index) => (
                <span
                  key={index}
                  className="aicher-heading text-xs sm:text-sm font-bold bg-gray-100 text-gray-600 border-2 border-gray-400 px-3 py-2 flex items-center gap-1"
                >
                  <Crown className="w-3 h-3" />
                  {role.title}
                </span>
              ))}
            </div>

            {/* Focus Areas */}
            {focusAreas && focusAreas.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="aicher-heading-wide text-xs text-gray-500">FOCUS AREAS</span>
                {focusAreas.map(area => (
                  <span
                    key={area}
                    className="type-xs text-gray-700 bg-gray-100 border border-gray-300 px-2 py-1"
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}

            {/* Contact row */}
            {hasContact && (
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-gray-600">
                {phone && (
                  <a
                    href={`tel:${phone}`}
                    className="flex items-center gap-1.5 hover:text-civiq-blue transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{phone}</span>
                  </a>
                )}
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 hover:text-civiq-blue transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</span>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
