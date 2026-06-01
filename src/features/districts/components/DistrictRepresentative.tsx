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
    <div className="bg-white border-2 border-black p-8">
      <div className="flex items-center space-x-6">
        <div className="flex-shrink-0">
          <RepresentativePhoto
            bioguideId={representative.bioguideId}
            name={representative.name}
            className="w-24 h-24"
          />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{representative.name}</h2>
          <p className="text-lg text-gray-600 mb-1">Representative for {districtName}</p>
          <div className="flex items-center space-x-4">
            <span
              className={`px-3 py-1 text-sm font-medium ${
                representative.party === 'Democrat'
                  ? 'bg-civiq-blue/10 text-civiq-blue'
                  : representative.party === 'Republican'
                    ? 'bg-civiq-red/10 text-civiq-red'
                    : 'bg-white border-2 border-gray-300 text-gray-800'
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
              className="inline-flex items-center px-4 py-2 bg-civiq-blue text-white font-medium hover:bg-civiq-blue transition-colors"
            >
              View Full Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
