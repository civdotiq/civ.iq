/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ComponentErrorBoundary } from '@/components/error-boundaries';
import { DistrictInfo, formatDistrictName } from '@/lib/multi-district/detection';
import RepresentativePhoto from '@/components/RepresentativePhoto';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: string;
  title: string;
  phone?: string;
  website?: string;
}

interface DistrictSelectorProps {
  zipCode: string;
  districts: DistrictInfo[];
  representatives?: Representative[];
  onSelect: (district: DistrictInfo) => void;
  onRefineAddress?: () => void;
  className?: string;
}

export function DistrictSelector({
  zipCode,
  districts,
  representatives = [],
  onSelect,
  onRefineAddress,
  className = ''
}: DistrictSelectorProps) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleDistrictSelect = async (district: DistrictInfo) => {
    setIsLoading(true);
    setSelectedDistrictId(`${district.state}-${district.district}`);
    
    try {
      await onSelect(district);
    } finally {
      setIsLoading(false);
    }
  };

  const getRepresentativeForDistrict = (district: DistrictInfo): Representative | undefined => {
    return representatives.find(rep => 
      rep.chamber === 'House' && 
      rep.state === district.state && 
      rep.district === district.district
    );
  };

  const getPartyColor = (party: string) => {
    if (party.toLowerCase().includes('democrat')) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (party.toLowerCase().includes('republican')) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <ComponentErrorBoundary componentName="DistrictSelector">
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Multiple Districts Found
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            ZIP code <span className="font-semibold text-civiq-blue">{zipCode}</span> spans{' '}
            <span className="font-semibold">{districts.length} congressional districts</span>.
            Please select your district or enter your full address for exact matching.
          </p>
        </div>

        {/* District Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {districts.map((district, index) => {
            const representative = getRepresentativeForDistrict(district);
            const districtId = `${district.state}-${district.district}`;
            const isSelected = selectedDistrictId === districtId;
            
            return (
              <Card
                key={districtId}
                className={`
                  transition-all duration-200 hover:shadow-lg
                  ${isSelected 
                    ? 'ring-2 ring-civiq-blue border-civiq-blue bg-civiq-blue/5' 
                    : 'border-gray-200 hover:border-civiq-blue/50'
                  }
                  ${district.primary ? 'border-civiq-green/50 bg-civiq-green/5' : ''}
                `}
                padding="none"
                onClick={() => handleDistrictSelect(district)}
              >
                <div className="p-6">
                  {/* District Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDistrictName(district)}
                      </h3>
                      {district.primary && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-civiq-green text-white mt-1">
                          Primary District
                        </span>
                      )}
                      {district.confidence && district.confidence !== 'high' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          {district.confidence} confidence
                        </span>
                      )}
                    </div>
                    <div className="text-2xl">
                      {isSelected ? '✓' : `${index + 1}`}
                    </div>
                  </div>

                  {/* Representative Info */}
                  {representative ? (
                    <div className="flex items-center space-x-3">
                      <RepresentativePhoto
                        bioguideId={representative.bioguideId}
                        name={representative.name}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {representative.name}
                        </p>
                        <p className="text-sm text-gray-600 truncate">
                          {representative.title}
                        </p>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${getPartyColor(representative.party)}`}>
                          {representative.party}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      Representative information not available
                    </div>
                  )}

                  {/* Selection Indicator */}
                  {isSelected && isLoading && (
                    <div className="mt-4 flex items-center justify-center">
                      <div className="flex items-center space-x-2 text-civiq-blue">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-civiq-blue"></div>
                        <span className="text-sm">Loading representatives...</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Address Refinement Option */}
        {onRefineAddress && (
          <div className="text-center">
            <div className="inline-flex flex-col items-center space-y-3 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm text-gray-600">
                Not sure which district you're in?
              </div>
              <Button
                onClick={onRefineAddress}
                variant="secondary"
                className="inline-flex items-center space-x-2"
              >
                <span>🏠</span>
                <span>Enter your full address for exact match</span>
              </Button>
              <div className="text-xs text-gray-500">
                We'll use your street address to determine your exact district
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
          <p>
            Congressional districts can change due to redistricting. If you're unsure,
            using your full street address will provide the most accurate results.
          </p>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactDistrictSelector({
  zipCode,
  districts,
  onSelect,
  onRefineAddress,
  className = ''
}: DistrictSelectorProps) {
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);

  const handleSelect = (district: DistrictInfo) => {
    setSelectedDistrictId(`${district.state}-${district.district}`);
    onSelect(district);
  };

  return (
    <ComponentErrorBoundary componentName="CompactDistrictSelector">
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <p className="text-sm text-gray-600">
            ZIP {zipCode} spans multiple districts. Choose yours:
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center">
          {districts.map((district) => {
            const districtId = `${district.state}-${district.district}`;
            const isSelected = selectedDistrictId === districtId;

            return (
              <button
                key={districtId}
                onClick={() => handleSelect(district)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${isSelected 
                    ? 'bg-civiq-blue text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                  ${district.primary ? 'ring-2 ring-civiq-green ring-opacity-50' : ''}
                `}
              >
                {formatDistrictName(district)}
                {district.primary && <span className="ml-1">★</span>}
              </button>
            );
          })}
        </div>

        {onRefineAddress && (
          <div className="text-center">
            <button
              onClick={onRefineAddress}
              className="text-sm text-civiq-blue hover:text-civiq-blue/80 transition-colors"
            >
              🏠 Enter address for exact match
            </button>
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  );
}