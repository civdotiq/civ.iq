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

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Personal Information</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-600">Full Name</label>
          <div className="text-gray-900">
            {representative.fullName?.official || representative.name}
          </div>
        </div>

        {representative.bio?.gender && (
          <div>
            <label className="text-sm font-medium text-gray-600">Gender</label>
            <div className="text-gray-900">
              {representative.bio.gender === 'M' ? 'Male' : 'Female'}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-gray-600">Age</label>
          <div className="text-gray-900">
            {isLoadingAge ? (
              <span className="text-gray-500">Loading...</span>
            ) : age !== null ? (
              `${age} years old`
            ) : (
              <span className="text-gray-500">Not available</span>
            )}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-600">Party Affiliation</label>
          <div className="text-gray-900">{representative.party}</div>
        </div>
      </div>
    </div>
  );
}
