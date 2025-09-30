/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

interface DistrictNavigationProps {
  state: string;
  representativeName: string;
  bioguideId: string;
  counties: string[];
  majorCities: string[];
}

export default function DistrictNavigation({
  state,
  representativeName,
  bioguideId,
  counties,
  majorCities,
}: DistrictNavigationProps) {
  return (
    <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Facts</h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Representative</h4>
          <Link
            href={`/representative/${bioguideId}`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {representativeName}
          </Link>
        </div>

        {counties.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Major Counties</h4>
            <div className="text-sm text-gray-600">
              {counties.slice(0, 3).join(', ')}
              {counties.length > 3 && ` and ${counties.length - 3} more`}
            </div>
          </div>
        )}

        {majorCities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Major Cities</h4>
            <div className="text-sm text-gray-600">
              {majorCities.slice(0, 3).join(', ')}
              {majorCities.length > 3 && ` and ${majorCities.length - 3} more`}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Related Pages</h4>
          <div className="space-y-2">
            <Link
              href="/representatives"
              className="block text-sm text-blue-600 hover:text-blue-800"
            >
              All Representatives
            </Link>
            <Link href="/districts" className="block text-sm text-blue-600 hover:text-blue-800">
              All Districts
            </Link>
            <Link
              href={`/districts/${state}-Senate`}
              className="block text-sm text-blue-600 hover:text-blue-800"
            >
              {state} Senate Seats
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
