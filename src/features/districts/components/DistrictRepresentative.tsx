/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

interface Representative {
  name: string;
  party: string;
  bioguideId: string;
  imageUrl?: string;
  yearsInOffice?: number;
}

interface DistrictRepresentativeProps {
  representative: Representative;
  districtName: string;
}

export default function DistrictRepresentative({
  representative,
  districtName,
}: DistrictRepresentativeProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="flex items-center space-x-6">
        <div className="flex-shrink-0">
          <RepresentativePhoto
            bioguideId={representative.bioguideId}
            name={representative.name}
            className="w-24 h-24 rounded-full"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{representative.name}</h2>
          <p className="text-lg text-gray-600 mb-1">Representative for {districtName}</p>
          <div className="flex items-center space-x-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                representative.party === 'Democrat'
                  ? 'bg-blue-100 text-blue-800'
                  : representative.party === 'Republican'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {representative.party}
            </span>
            {representative.yearsInOffice && (
              <span className="text-sm text-gray-500">
                {representative.yearsInOffice} years in office
              </span>
            )}
          </div>
          <div className="mt-4">
            <Link
              href={`/representative/${representative.bioguideId}`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
