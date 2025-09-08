/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Calendar, MapPin, Phone, Globe, Mail, ExternalLink } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface EnhancedHeaderProps {
  representative: EnhancedRepresentative;
}

export function EnhancedHeader({ representative }: EnhancedHeaderProps) {
  const [imageError, setImageError] = useState(false);

  // Get photo URL - use API-provided imageUrl or fallback to proxy
  const photoUrl = representative.imageUrl || `/api/photo/${representative.bioguideId}`;

  // Get party colors
  const getPartyStyle = (party: string) => {
    const normalizedParty = party.toLowerCase();
    if (normalizedParty.includes('democrat') || normalizedParty === 'democratic') {
      return {
        badge: 'bg-blue-600 text-white',
        accent: 'border-blue-600',
      };
    }
    if (normalizedParty.includes('republican')) {
      return {
        badge: 'bg-red-600 text-white',
        accent: 'border-red-600',
      };
    }
    return {
      badge: 'bg-gray-600 text-white',
      accent: 'border-gray-600',
    };
  };

  const partyStyle = getPartyStyle(representative.party);

  // Format term dates
  const formatTermDates = () => {
    if (!representative.currentTerm?.start || !representative.currentTerm?.end) {
      return 'Current Term';
    }
    const start = new Date(representative.currentTerm.start).getFullYear();
    const end = new Date(representative.currentTerm.end).getFullYear();
    return `${start} - ${end}`;
  };

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

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white p-8">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* Photo */}
          <div className="flex-shrink-0">
            <div className={`relative p-1 bg-white rounded-full ${partyStyle.accent} border-4`}>
              {!imageError ? (
                <Image
                  src={photoUrl}
                  alt={getDisplayName()}
                  width={120}
                  height={120}
                  className="w-28 h-28 lg:w-32 lg:h-32 rounded-full object-cover"
                  onError={() => setImageError(true)}
                  data-testid="representative-photo"
                />
              ) : (
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
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
          </div>

          {/* Name and Title */}
          <div className="flex-1">
            <div className="mb-3">
              <h1
                data-testid="representative-name"
                className="text-3xl lg:text-4xl font-bold text-white mb-2"
              >
                {getDisplayName()}
              </h1>
              <p data-testid="representative-state" className="text-xl text-blue-100 mb-1">
                {getTitle()}
              </p>
              {getStateRank() && <p className="text-lg text-blue-200">{getStateRank()}</p>}
            </div>

            {/* Party Badge and Term Info */}
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="representative-party"
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${partyStyle.badge}`}
              >
                {representative.party}
              </span>

              <div className="flex items-center gap-1 text-blue-100">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">{formatTermDates()}</span>
              </div>

              {representative.chamber === 'Senate' && representative.currentTerm?.class && (
                <div className="flex items-center gap-1 text-blue-100">
                  <span className="text-sm">Class {representative.currentTerm.class}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Contact Actions */}
          <div className="flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              {representative.currentTerm?.website && (
                <a
                  href={representative.currentTerm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Globe className="w-4 h-4" />
                  Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}

              {representative.currentTerm?.contactForm && (
                <a
                  href={representative.currentTerm.contactForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Mail className="w-4 h-4" />
                  Contact
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information Bar */}
      <div className="bg-gray-50 border-b px-8 py-4">
        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
          {representative.currentTerm?.office && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{representative.currentTerm.office}</span>
            </div>
          )}

          {representative.currentTerm?.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <a
                href={`tel:${representative.currentTerm.phone}`}
                className="text-blue-600 hover:text-blue-800"
              >
                {representative.currentTerm.phone}
              </a>
            </div>
          )}

          {/* Bio information */}
          {representative.bio?.birthday && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>
                Born{' '}
                {new Date(representative.bio.birthday).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
