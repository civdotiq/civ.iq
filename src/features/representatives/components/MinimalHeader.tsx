/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Image from 'next/image';

interface MinimalHeaderProps {
  rep: {
    bioguideId: string;
    name: string;
    title?: string;
    state: string;
    district?: string;
    party: string;
    photoUrl?: string;
    firstElected?: string;
    termEnd?: string;
    chamber: 'House' | 'Senate';
    currentTerm?: {
      start?: string;
      end?: string;
    };
  };
}

export function MinimalHeader({ rep }: MinimalHeaderProps) {
  // Get photo URL
  const photoUrl =
    rep.photoUrl ||
    `https://bioguide.congress.gov/bioguide/photo/${rep.bioguideId.charAt(0)}/${rep.bioguideId}.jpg`;

  // Format dates
  const firstElected = rep.firstElected || rep.currentTerm?.start?.split('-')[0] || 'Unknown';
  const termEnd = rep.termEnd || rep.currentTerm?.end || 'Unknown';

  // Format party name
  const partyDisplay =
    rep.party === 'D' || rep.party === 'Democrat'
      ? 'Democrat'
      : rep.party === 'R' || rep.party === 'Republican'
        ? 'Republican'
        : rep.party || 'Independent';

  // Get party color
  const partyColor =
    rep.party === 'D' || rep.party === 'Democrat'
      ? 'text-[#3ea2d4]'
      : rep.party === 'R' || rep.party === 'Republican'
        ? 'text-[#e11d07]'
        : 'text-gray-600';

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto py-12 px-8">
        <div className="flex gap-8 items-start">
          <div className="relative w-24 h-24 flex-shrink-0">
            <Image
              src={photoUrl}
              alt={rep.name}
              width={96}
              height={96}
              className="rounded-full grayscale hover:grayscale-0 transition-all duration-300 object-cover"
              onError={e => {
                const target = e.target as HTMLImageElement;
                target.src = '/api/placeholder/96/96';
              }}
            />
          </div>

          <div>
            <h1 className="text-4xl font-light text-gray-900">{rep.name}</h1>
            <p className="text-lg text-gray-600 mt-1">
              {rep.title || (rep.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative')} •{' '}
              {rep.state}
              {rep.district ? `-${rep.district}` : ''}
            </p>
            <div className="flex gap-6 mt-4 text-sm text-gray-500">
              <span className={partyColor}>{partyDisplay}</span>
              <span>Since {firstElected}</span>
              <span>Term ends {termEnd}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
