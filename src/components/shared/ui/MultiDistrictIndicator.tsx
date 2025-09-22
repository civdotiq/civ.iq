/*
 * CIV.IQ - Civic Information Hub
 * Phase 4: Multi-District ZIP Code UI Component
 *
 * Component for displaying multi-district ZIP code information with user-friendly
 * explanations and warnings for edge cases.
 */

'use client';

import { useState } from 'react';
import {
  Info,
  AlertTriangle,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle,
} from 'lucide-react';

interface DistrictInfo {
  state: string;
  district: string;
  primary?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

interface MultiDistrictIndicatorProps {
  zipCode: string;
  isMultiDistrict: boolean;
  districts: DistrictInfo[];
  primaryDistrict?: DistrictInfo;
  warnings?: string[];
  onDistrictSelect?: (district: DistrictInfo) => void;
  selectedDistrict?: DistrictInfo;
}

export default function MultiDistrictIndicator({
  zipCode,
  isMultiDistrict,
  districts,
  primaryDistrict,
  warnings = [],
  onDistrictSelect,
  selectedDistrict,
}: MultiDistrictIndicatorProps) {
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // Helper functions
  const getDistrictDisplay = (district: DistrictInfo): string => {
    if (district.district === '00') {
      return `${district.state} At-Large`;
    }
    return `${district.state}-${district.district}`;
  };

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low' = 'high'): string => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-white';
    }
  };

  const getDistrictType = (district: DistrictInfo): string => {
    if (['DC', 'GU', 'PR', 'VI', 'AS', 'MP'].includes(district.state)) {
      return 'Non-voting Delegate';
    }
    return district.district === '00' ? 'At-Large Representative' : 'Representative';
  };

  const isSpecialTerritory = (state: string): boolean => {
    return ['DC', 'GU', 'PR', 'VI', 'AS', 'MP'].includes(state);
  };

  const getTerritoryName = (state: string): string => {
    const territories: Record<string, string> = {
      DC: 'District of Columbia',
      GU: 'Guam',
      PR: 'Puerto Rico',
      VI: 'U.S. Virgin Islands',
      AS: 'American Samoa',
      MP: 'Northern Mariana Islands',
    };
    return territories[state] || state;
  };

  if (districts.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 mb-4">
        <div className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">ZIP Code Not Found</span>
        </div>
        <p className="text-red-600 mt-2">
          ZIP code {zipCode} could not be mapped to a congressional district.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 p-4 mb-6 border-2 border-black">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">ZIP Code {zipCode}</span>
          {isMultiDistrict && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              Multi-District
            </span>
          )}
        </div>

        {isMultiDistrict && (
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            <Info className="w-4 h-4" />
            <span>Why multiple districts?</span>
          </button>
        )}
      </div>

      {/* Primary District */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-green-600" />
          <span className="font-medium text-gray-900">
            {isMultiDistrict ? 'Primary District' : 'Congressional District'}
          </span>
        </div>

        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-green-800">
                {getDistrictDisplay(primaryDistrict || districts[0]!)}
              </span>
              {primaryDistrict?.primary && <CheckCircle className="w-4 h-4 text-green-600" />}
              <span
                className={`px-2 py-1 text-xs rounded-full font-medium ${getConfidenceColor(primaryDistrict?.confidence)}`}
              >
                {primaryDistrict?.confidence || 'high'} confidence
              </span>
            </div>

            <div className="text-sm text-green-700 mt-1">
              {getDistrictType(primaryDistrict || districts[0]!)}
              {(() => {
                const state = primaryDistrict?.state || (districts[0] && districts[0].state);
                return (
                  state &&
                  isSpecialTerritory(state) && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      {getTerritoryName(state)}
                    </span>
                  )
                );
              })()}
            </div>
          </div>

          {onDistrictSelect && (primaryDistrict || districts[0]) && (
            <button
              onClick={() => onDistrictSelect((primaryDistrict || districts[0])!)}
              className={`px-3 py-1 text-sm font-medium transition-colors ${
                selectedDistrict?.district === (primaryDistrict || districts[0])?.district
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-green-700 hover:bg-green-100'
              }`}
            >
              {selectedDistrict?.district === (primaryDistrict || districts[0])?.district
                ? 'Selected'
                : 'Select'}
            </button>
          )}
        </div>
      </div>

      {/* Multi-District Explanation */}
      {showExplanation && isMultiDistrict && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">
            Why does this ZIP code span multiple districts?
          </h4>
          <p className="text-blue-800 text-sm leading-relaxed">
            Some ZIP codes cross congressional district boundaries due to how postal routes are
            designed versus how political districts are drawn. This is common in urban areas and
            large ZIP codes. We show the primary district based on population distribution, but you
            can view all districts below.
          </p>
        </div>
      )}

      {/* Additional Districts */}
      {isMultiDistrict && districts.length > 1 && (
        <div className="mb-3">
          <button
            onClick={() => setShowAllDistricts(!showAllDistricts)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-2"
          >
            {showAllDistricts ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="font-medium">
              {showAllDistricts ? 'Hide' : 'Show'} All Districts ({districts.length})
            </span>
          </button>

          {showAllDistricts && (
            <div className="space-y-2">
              {districts.map((district, _index) => (
                <div
                  key={`${district.state}-${district.district}`}
                  className={`p-3 border ${
                    district.primary ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {getDistrictDisplay(district)}
                      </span>
                      {district.primary && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                          Primary
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${getConfidenceColor(district.confidence)}`}
                      >
                        {district.confidence || 'high'}
                      </span>
                    </div>

                    {onDistrictSelect && (
                      <button
                        onClick={() => onDistrictSelect(district)}
                        className={`px-3 py-1 text-sm font-medium transition-colors ${
                          selectedDistrict?.district === district.district
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        {selectedDistrict?.district === district.district ? 'Selected' : 'Select'}
                      </button>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    {getDistrictType(district)}
                    {isSpecialTerritory(district.state) && (
                      <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        {getTerritoryName(district.state)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-3">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 mb-2"
            >
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-yellow-800 text-sm">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data Quality Note */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>
            Data sourced from {isMultiDistrict ? 'comprehensive' : 'official'} mapping •
            {districts.length > 1 ? ' Multi-district ZIP code' : ' Single district ZIP code'}
          </span>
        </div>
      </div>
    </div>
  );
}
