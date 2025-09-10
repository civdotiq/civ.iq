/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { getAgeFromWikidata } from '@/lib/api/wikidata';

interface PersonalInfoCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function PersonalInfoCard({ representative, className = '' }: PersonalInfoCardProps) {
  const [age, setAge] = useState<number | null>(null);
  const [isLoadingAge, setIsLoadingAge] = useState(true);

  useEffect(() => {
    const fetchAge = async () => {
      try {
        const ageFromWikidata = await getAgeFromWikidata(representative.bioguideId);
        setAge(ageFromWikidata);
      } catch {
        setAge(null);
      } finally {
        setIsLoadingAge(false);
      }
    };

    fetchAge();
  }, [representative.bioguideId]);

  const partyColor =
    representative.party === 'Republican'
      ? 'border-red-300 bg-red-100 text-red-800'
      : representative.party === 'Democrat'
        ? 'border-blue-300 bg-blue-100 text-blue-800'
        : 'border-gray-200 bg-gray-50 text-gray-700';

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-red-50 rounded-lg">
            <User className="w-5 h-5" style={{ color: '#e21f0a' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
            Personal Information
          </h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Full Name
          </label>
          <div className="mt-1 text-lg font-medium text-gray-900">
            {representative.fullName?.official || representative.name}
          </div>
        </div>

        {representative.bio?.gender && (
          <div className="group">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Gender
            </label>
            <div className="mt-1 text-base text-gray-900">
              {representative.bio.gender === 'M' ? 'Male' : 'Female'}
            </div>
          </div>
        )}

        <div className="group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Age
          </label>
          <div className="mt-1 text-base text-gray-900">
            {isLoadingAge ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-pulse h-4 w-16 bg-gray-200 rounded"></span>
              </span>
            ) : age !== null ? (
              <span className="font-medium">{age} years old</span>
            ) : (
              <span className="text-gray-400 italic">Not available</span>
            )}
          </div>
        </div>

        <div className="group">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Party Affiliation
          </label>
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${partyColor}`}
            >
              {representative.party}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
