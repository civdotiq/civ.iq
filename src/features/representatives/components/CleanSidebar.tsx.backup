/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Building, MapPin, BarChart3, Info } from 'lucide-react';

interface CleanSidebarProps {
  representative: {
    bioguideId: string;
    name: string;
    state: string;
    district?: string;
    chamber: 'House' | 'Senate';
  };
}

export function CleanSidebar({ representative }: CleanSidebarProps) {
  const getStateFullName = (stateCode: string): string => {
    const stateNames: Record<string, string> = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
      DC: 'District of Columbia',
    };
    return stateNames[stateCode] || stateCode;
  };

  return (
    <div className="space-y-4">
      {/* Federal Level Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Building className="h-5 w-5 text-blue-500" />
          Federal Level
        </h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          U.S. Representatives serve specific congressional districts within their state, focusing
          on both national legislation and local district concerns.
        </p>
        <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
          {representative.state}
          {representative.district && `-${representative.district}`}
        </div>
      </div>

      {/* District Information Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-500" />
          District Information
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">State:</span>
            <span className="text-sm font-medium text-gray-900">
              {representative.state} ({getStateFullName(representative.state)})
            </span>
          </div>
          {representative.district && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">District:</span>
              <span className="text-sm font-medium text-gray-900">{representative.district}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Chamber:</span>
            <span className="text-sm font-medium text-gray-900">{representative.chamber}</span>
          </div>
          <div className="pt-3 border-t border-gray-100">
            <Link
              href={`/districts/${representative.state}${representative.district ? `-${representative.district}` : ''}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View district details &gt;
            </Link>
          </div>
        </div>
      </div>

      {/* Compare Representatives Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Compare Representatives
        </h3>
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          Compare {representative.name}&apos;s voting record, campaign finances, and legislative
          activity with other representatives from your state or across the country.
        </p>
        <div className="space-y-2">
          <Link
            href={`/compare?reps=${representative.bioguideId}`}
            className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Compare representatives
          </Link>
          <Link
            href={`/representatives?state=${representative.state}`}
            className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            View all from {representative.state}
          </Link>
        </div>
      </div>

      {/* Additional Resources Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="h-5 w-5 text-orange-500" />
          Additional Resources
        </h3>
        <div className="space-y-2">
          <Link
            href="/about"
            className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            About CIV.IQ
          </Link>
          <Link
            href="/data-sources"
            className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Data Sources
          </Link>
          <Link
            href="/privacy"
            className="block text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
