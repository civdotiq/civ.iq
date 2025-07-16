'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { TradingCardPreview } from './TradingCardPreview';
import { TradingCardModal } from './TradingCardModal';
import { EnhancedRepresentative } from '@/types/representative';
import { useState } from 'react';

interface RepresentativePageSidebarProps {
  representative: {
    name: string;
    state: string;
    district?: string;
    chamber: 'House' | 'Senate';
    bioguideId: string;
  };
  additionalData?: {
    votes?: any[];
    bills?: any[];
    finance?: any;
    news?: any[];
    partyAlignment?: any;
  };
}

export function RepresentativePageSidebar({ representative, additionalData }: RepresentativePageSidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedStats, setGeneratedStats] = useState<any[]>([]);
  const getDistrictDisplay = () => {
    if (representative.chamber === 'Senate') {
      return `${representative.state} (Statewide)`;
    }
    return representative.district ? `${representative.state}-${representative.district}` : representative.state;
  };

  const getFederalLevelDescription = () => {
    if (representative.chamber === 'Senate') {
      return 'U.S. Senators represent their entire state in the federal government, focusing on national legislation, federal policy, and statewide issues.';
    }
    return 'U.S. Representatives serve specific congressional districts within their state, focusing on both national legislation and local district concerns.';
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-6">
      {/* Federal Level Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-3">Federal Level</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          {getFederalLevelDescription()}
        </p>
        
        <div className="bg-gray-50 rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {representative.chamber === 'Senate' ? 'State' : 'District'}:
            </span>
            <span className="text-sm text-gray-900 font-medium">
              {getDistrictDisplay()}
            </span>
          </div>
        </div>
      </div>

      {/* District Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-3">District Information</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">State:</span>
            <span className="text-sm text-gray-900 font-medium">{representative.state}</span>
          </div>
          
          {representative.district && representative.chamber === 'House' && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">District:</span>
              <span className="text-sm text-gray-900 font-medium">{representative.district}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Chamber:</span>
            <span className="text-sm text-gray-900 font-medium">{representative.chamber}</span>
          </div>
        </div>
        
        {representative.chamber === 'House' && representative.district && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Link 
              href={`/districts/${representative.state}-${representative.district}`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View district details
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>

      {/* Compare Representatives Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-3">Compare Representatives</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Compare {representative.name}'s voting records, campaign finances, and legislative activity with other representatives from your state or across the country.
        </p>
        
        <div className="space-y-3">
          <Link 
            href={`/compare?base=${representative.bioguideId}`}
            className="block w-full bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors duration-200"
          >
            Compare representatives
          </Link>
          
          <Link 
            href={`/representatives?state=${representative.state}`}
            className="block w-full bg-gray-50 hover:bg-gray-100 text-gray-700 hover:text-gray-800 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors duration-200"
          >
            View all from {representative.state}
          </Link>
        </div>
      </div>

      {/* Trading Card Preview Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m0 0V1a1 1 0 011-1h2a1 1 0 011 1v18a1 1 0 01-1 1h-2a1 1 0 01-1-1V4M7 4H5a1 1 0 00-1 1v16a1 1 0 001 1h2a1 1 0 001-1V5a1 1 0 00-1-1z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-3">Trading Card</h3>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Create a shareable trading card with key stats about {representative.name}. Perfect for social media!
        </p>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="block w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 px-4 py-2 rounded-md text-sm font-medium text-center transition-colors duration-200"
        >
          🎴 Create Trading Card
        </button>
        
        {/* Hidden Trading Card Preview - this will be visible to inspect element */}
        <TradingCardPreview 
          representative={{
            bioguideId: representative.bioguideId,
            name: representative.name,
            firstName: representative.name.split(' ')[0],
            lastName: representative.name.split(' ').slice(1).join(' '),
            party: 'Republican', // This will be dynamic later
            state: representative.state,
            district: representative.district,
            chamber: representative.chamber,
            title: representative.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
            terms: []
          }}
          visible={false}
        />
      </div>

      {/* Additional Resources Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 ml-3">Additional Resources</h3>
        </div>
        
        <div className="space-y-2">
          <Link 
            href="/about"
            className="block text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            About CIV.IQ
          </Link>
          <Link 
            href="/data-sources"
            className="block text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Data Sources
          </Link>
          <Link 
            href="/privacy"
            className="block text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Privacy Policy
          </Link>
        </div>
      </div>

      {/* Trading Card Modal */}
      <TradingCardModal
        representative={{
          bioguideId: representative.bioguideId,
          name: representative.name,
          firstName: representative.name.split(' ')[0],
          lastName: representative.name.split(' ').slice(1).join(' '),
          party: 'Republican', // This will be dynamic later
          state: representative.state,
          district: representative.district,
          chamber: representative.chamber,
          title: representative.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
          terms: []
        }}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onGenerate={(stats) => {
          setGeneratedStats(stats);
          // This will be expanded in Phase 3 for actual generation
          console.log('Generated stats:', stats);
        }}
        additionalData={additionalData}
      />
    </div>
  );
}