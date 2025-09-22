'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Calendar, Users, MapPin, ExternalLink } from 'lucide-react';

/**
 * 119th Congress Session Information Component
 * Displays contextual information about the current congressional session
 * using data from Wikidata Q113893555 (119th United States Congress)
 */
export default function CongressSessionInfo() {
  const congressInfo = {
    session: '119th Congress',
    period: '2025-2027',
    startDate: 'January 3, 2025',
    endDate: 'January 3, 2027',
    type: 'Current Legislative Session',
    wikidataId: 'Q113893555',
    totalDistricts: 435,
    description: 'Current meeting of the U.S. legislature following the 2024 elections',
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              {congressInfo.session} ({congressInfo.period})
            </h3>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Current
            </span>
          </div>

          <p className="text-sm text-blue-700 mb-3">{congressInfo.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Session Period</span>
                <p className="text-blue-700">
                  {congressInfo.startDate} - {congressInfo.endDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Districts</span>
                <p className="text-blue-700">{congressInfo.totalDistricts} House districts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-medium text-blue-900">Source</span>
                <a
                  href={`https://www.wikidata.org/wiki/${congressInfo.wikidataId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:text-blue-900 hover:underline"
                >
                  Wikidata
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
