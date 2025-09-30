/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useState } from 'react';
import { RepresentativesIcon, LocationIcon } from '@/components/icons/AicherIcons';
import { EnhancedRepresentative } from '@/types/representative';
import { getAgeFromWikidata, getBiographyFromWikidata } from '@/lib/api/wikidata';

interface PersonalInfoCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function PersonalInfoCard({ representative, className = '' }: PersonalInfoCardProps) {
  const [age, setAge] = useState<number | null>(null);
  const [birthPlace, setBirthPlace] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBiographicalData = async () => {
      try {
        const [ageFromWikidata, biographyData] = await Promise.all([
          getAgeFromWikidata(representative.bioguideId),
          getBiographyFromWikidata(representative.bioguideId),
        ]);
        setAge(ageFromWikidata);
        setBirthPlace(biographyData?.birthPlace || null);
      } catch {
        setAge(null);
        setBirthPlace(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBiographicalData();
  }, [representative.bioguideId]);

  const partyColor =
    representative.party === 'Republican'
      ? 'border-red-300 bg-red-100 text-red-800'
      : representative.party === 'Democrat'
        ? 'border-blue-300 bg-blue-100 text-blue-800'
        : 'border-gray-200 bg-white text-gray-700';

  return (
    <div className={`bg-white border-2 border-black accent-bar-red ${className}`}>
      <div className="p-6 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <RepresentativesIcon className="w-6 h-6 text-civiq-red" />
          <h3 className="aicher-heading text-lg text-civiq-red">Personal Information</h3>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="aicher-heading text-xs text-gray-700">FULL NAME</label>
          <div className="mt-1 text-lg font-medium text-gray-900">
            {representative.fullName?.official || representative.name}
          </div>
        </div>

        {representative.bio?.gender && (
          <div>
            <label className="aicher-heading text-xs text-gray-700">GENDER</label>
            <div className="mt-1 text-base text-gray-900">
              {representative.bio.gender === 'M' ? 'Male' : 'Female'}
            </div>
          </div>
        )}

        <div>
          <label className="aicher-heading text-xs text-gray-700">AGE</label>
          <div className="mt-1 text-base text-gray-900">
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="animate-pulse h-4 w-16 bg-gray-200"></span>
              </span>
            ) : age !== null ? (
              <span className="font-medium">{age} years old</span>
            ) : (
              <span className="text-gray-400">Not available</span>
            )}
          </div>
        </div>

        {birthPlace && (
          <div>
            <label className="aicher-heading text-xs text-gray-700">
              <LocationIcon className="w-3 h-3 inline mr-1" />
              BIRTHPLACE
            </label>
            <div className="mt-1 text-base text-gray-900">{birthPlace}</div>
          </div>
        )}

        <div>
          <label className="aicher-heading text-xs text-gray-700">PARTY AFFILIATION</label>
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-3 py-1.5 text-sm font-bold aicher-heading border-2 ${partyColor}`}
            >
              {representative.party}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
