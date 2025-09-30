/**
 * District Card Component - Displays individual district information
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import Image from 'next/image';

interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
  political: {
    cookPVI: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
  };
}

export function DistrictCard({ district }: { district: District }) {
  const getPVIColor = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'text-blue-600';
    if (pvi.startsWith('R+')) return 'text-red-600';
    return 'text-gray-600';
  };

  const getPVIBackground = (pvi: string) => {
    if (pvi.startsWith('D+')) return 'bg-blue-100';
    if (pvi.startsWith('R+')) return 'bg-red-100';
    return 'bg-white border-2 border-gray-300';
  };

  return (
    <div className="bg-white border-2 border-black hover:border-civiq-blue transition-colors p-4 sm:p-6">
      <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex-1">
          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
            {district.state}-{district.number}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 truncate">{district.name}</p>
        </div>
        <span
          className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 ${getPVIBackground(district.political.cookPVI)} ${getPVIColor(district.political.cookPVI)}`}
        >
          {district.political.cookPVI}
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
          {district.representative.imageUrl ? (
            <Image
              src={district.representative.imageUrl}
              alt={district.representative.name}
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-gray-600">Photo</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
            {district.representative.name}
          </p>
          <p className="text-xs sm:text-sm text-gray-600">
            {district.representative.party === 'D' ? 'Democrat' : 'Republican'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div>
          <p className="text-xs sm:text-sm text-gray-600">Population</p>
          <p className="font-semibold text-sm sm:text-base">
            {district.demographics.population.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600">Median Income</p>
          <p className="font-semibold text-sm sm:text-base">
            ${district.demographics.medianIncome.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600">Last Election</p>
          <p className="font-semibold text-sm sm:text-base">
            {district.political.lastElection.margin.toFixed(1)}% margin
          </p>
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-600">Turnout</p>
          <p className="font-semibold text-sm sm:text-base">
            {district.political.lastElection.turnout}%
          </p>
        </div>
      </div>

      <Link
        href={`/districts/${district.state}-${district.number}`}
        className="block w-full text-center py-3 text-sm sm:text-base bg-civiq-blue text-white hover:bg-blue-700 transition-colors min-h-[44px] flex items-center justify-center"
      >
        View Details
      </Link>
    </div>
  );
}
