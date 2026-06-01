/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, ExternalLink, Phone, Globe, Map } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface DistrictInfoCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function DistrictInfoCard({ representative, className = '' }: DistrictInfoCardProps) {
  // Early return if representative data is not available
  if (!representative || !representative.state) {
    return <div className="text-gray-500 text-center py-4">District information not available</div>;
  }

  // Get district display format
  const getDistrictDisplay = () => {
    try {
      if (representative.chamber === 'Senate') {
        return `${representative.state} (Statewide)`;
      }
      if (representative.district && representative.district !== 'AL') {
        return `${representative.state}-${representative.district}`;
      }
      return `${representative.state} (At-Large)`;
    } catch {
      return 'District information unavailable';
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* District Information */}
      <div className="bg-white border-2 border-black transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-civiq-red/10">
              <MapPin className="w-5 h-5" style={{ color: '#e21f0a' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
              District Information
            </h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="group">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              District
            </label>
            <div className="flex items-center justify-between mt-1">
              <div className="text-lg font-bold text-gray-900">{getDistrictDisplay()}</div>
              {representative.chamber === 'House' &&
                representative.state &&
                representative.district && (
                  <Link
                    href={`/districts/${representative.state}-${representative.district}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] text-xs font-semibold text-civiq-red bg-civiq-red/10 hover:bg-civiq-red/10 transition-colors"
                  >
                    <Map className="w-3 h-3" />
                    View District
                  </Link>
                )}
            </div>
          </div>

          <div className="group">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Population
            </label>
            <div className="mt-1 text-base font-medium text-gray-900">
              {representative.chamber === 'House'
                ? '~760,000 constituents'
                : 'Entire state population'}
            </div>
            <div className="text-xs text-gray-400 mt-1 italic">Based on 2020 Census</div>
          </div>
        </div>
      </div>

      {/* Office Contact */}
      <div className="bg-white border-2 border-black transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-civiq-blue/10">
              <Phone className="w-5 h-5" style={{ color: '#3aa3d5' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#3aa3d5' }}>
              Office Contact
            </h3>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {representative.currentTerm?.office && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Washington DC Address
              </label>
              <div className="mt-1 text-sm text-gray-900 leading-relaxed">
                {representative.currentTerm.office}
              </div>
            </div>
          )}

          {representative.currentTerm?.phone && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Phone Number
              </label>
              <div className="mt-1">
                <a
                  href={`tel:${representative.currentTerm.phone}`}
                  className="inline-flex items-center gap-2 text-civiq-blue hover:text-civiq-blue font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {representative.currentTerm.phone}
                </a>
              </div>
            </div>
          )}

          {representative.currentTerm?.website && (
            <div className="group">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Website
              </label>
              <div className="mt-1">
                <a
                  href={representative.currentTerm.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium text-civiq-blue bg-civiq-blue/10 hover:bg-civiq-blue/10 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Official Website
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border-2 border-black transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-bold" style={{ color: '#0e8d37' }}>
            Quick Actions
          </h3>
        </div>
        <div className="p-6 space-y-3">
          {representative.currentTerm?.website && (
            <a
              href={representative.currentTerm.website}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-civiq-blue text-white text-center py-3 px-4 text-sm font-bold transition-all border-2 border-black transform hover:-translate-y-0.5"
            >
              Visit Website
            </a>
          )}
          <button className="block w-full bg-white border-2 border-gray-200 text-gray-700 text-center py-3 px-4 text-sm font-semibold hover:border-gray-300 hover:bg-white transition-all">
            Find Local Offices
          </button>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-white border-2 border-black transition-colors duration-200">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="text-lg font-bold" style={{ color: '#e21f0a' }}>
            Data Sources
          </h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <a
              href={`https://www.congress.gov/member/${representative.bioguideId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group hover:bg-civiq-blue/10 -mx-2 px-3 py-2 min-h-[44px] transition-colors"
            >
              <div className="w-2.5 h-2.5 bg-civiq-blue ring-4 ring-civiq-blue group-hover:ring-civiq-blue"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-civiq-blue group-hover:underline">
                Congress.gov
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-civiq-blue ml-auto" />
            </a>
            <a
              href={`https://github.com/unitedstates/congress-legislators/search?q=${encodeURIComponent(representative.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group hover:bg-civiq-green/10 -mx-2 px-3 py-2 min-h-[44px] transition-colors"
            >
              <div className="w-2.5 h-2.5 bg-civiq-green ring-4 ring-civiq-green group-hover:ring-civiq-green"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-civiq-green group-hover:underline">
                Congress Legislators
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-civiq-green ml-auto" />
            </a>
            {representative.ids?.fec && representative.ids.fec.length > 0 ? (
              <a
                href={`https://www.fec.gov/data/candidate/${representative.ids.fec[0]}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 group hover:bg-civiq-blue/10 -mx-2 px-3 py-2 min-h-[44px] transition-colors"
              >
                <div className="w-2.5 h-2.5 bg-civiq-blue ring-4 ring-civiq-blue group-hover:ring-civiq-blue"></div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-civiq-blue group-hover:underline">
                  FEC Campaign Finance
                </span>
                <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-civiq-blue ml-auto" />
              </a>
            ) : (
              <div className="flex items-center gap-3 -mx-2 px-3 py-2 min-h-[44px] opacity-50">
                <div className="w-2.5 h-2.5 bg-civiq-blue ring-4 ring-civiq-blue"></div>
                <span className="text-sm font-medium text-gray-700">FEC Campaign Finance</span>
                <span className="text-xs text-gray-500 ml-auto">(N/A)</span>
              </div>
            )}
            <a
              href={
                representative.district
                  ? `https://data.census.gov/profile/${representative.state}_Congressional_District_${representative.district}_(118th_Congress),_${representative.state}`
                  : `https://data.census.gov/profile/${representative.state}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group hover:bg-civiq-red/10 -mx-2 px-3 py-2 min-h-[44px] transition-colors"
            >
              <div className="w-2.5 h-2.5 bg-civiq-red ring-4 ring-civiq-red group-hover:ring-civiq-red"></div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-civiq-red group-hover:underline">
                U.S. Census Bureau
              </span>
              <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-civiq-red ml-auto" />
            </a>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 italic">
                All data from official government sources
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
