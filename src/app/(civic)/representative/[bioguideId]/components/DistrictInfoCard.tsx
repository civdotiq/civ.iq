/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { MapPin, ExternalLink, Phone, Globe } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface DistrictInfoCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function DistrictInfoCard({ representative, className = '' }: DistrictInfoCardProps) {
  // Get district display format
  const getDistrictDisplay = () => {
    if (representative.chamber === 'Senate') {
      return `${representative.state} (Statewide)`;
    }
    if (representative.district && representative.district !== 'AL') {
      return `${representative.state}-${representative.district}`;
    }
    return `${representative.state} (At-Large)`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* District Information */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">District Information</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-600">District</label>
            <div className="text-gray-900 font-semibold">{getDistrictDisplay()}</div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Population</label>
            <div className="text-gray-900">
              {representative.chamber === 'House'
                ? '~760,000 constituents'
                : 'Entire state population'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Based on 2020 Census</div>
          </div>
        </div>
      </div>

      {/* Office Contact */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-gray-900">Office Contact</h3>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {representative.currentTerm?.office && (
            <div>
              <label className="text-sm font-medium text-gray-600">Washington DC Address</label>
              <div className="text-gray-900 text-sm">{representative.currentTerm.office}</div>
            </div>
          )}

          {representative.currentTerm?.phone && (
            <div>
              <label className="text-sm font-medium text-gray-600">Phone Number</label>
              <div className="text-gray-900">
                <a
                  href={`tel:${representative.currentTerm.phone}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {representative.currentTerm.phone}
                </a>
              </div>
            </div>
          )}

          {representative.currentTerm?.website && (
            <div>
              <label className="text-sm font-medium text-gray-600">Website</label>
              <div>
                <a
                  href={representative.currentTerm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                >
                  <Globe className="w-3 h-3" />
                  Official Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-4 space-y-2">
          {representative.currentTerm?.website && (
            <a
              href={representative.currentTerm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Visit Website
            </a>
          )}
          <button className="block w-full bg-white border border-gray-300 text-gray-700 text-center py-2 px-3 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors">
            Find Local Offices
          </button>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Data Sources</h3>
        </div>
        <div className="p-4">
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Congress.gov</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span>Congress Legislators</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
              <span>FEC Campaign Finance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span>U.S. Census Bureau</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              All data from official government sources
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
