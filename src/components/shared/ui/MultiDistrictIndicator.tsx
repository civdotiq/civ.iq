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
        return 'text-civiq-green bg-civiq-green/10';
      case 'medium':
        return 'text-gray-600 bg-gray-100';
      case 'low':
        return 'text-civiq-red bg-civiq-red/10';
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
      <div className="bg-civiq-red/10 border border-civiq-red p-4 mb-4">
        <div className="flex items-center gap-2 text-civiq-red">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">ZIP Code Not Found</span>
        </div>
        <p className="text-civiq-red mt-2">
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
          <MapPin className="w-5 h-5 text-civiq-blue" />
          <span className="font-semibold text-gray-900">ZIP Code {zipCode}</span>
          {isMultiDistrict && (
            <span className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs font-medium">
              Multi-District
            </span>
          )}
        </div>

        {isMultiDistrict && (
          <button
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center gap-1 text-civiq-blue hover:text-civiq-blue text-sm"
          >
            <Info className="w-4 h-4" />
            <span>Why multiple districts?</span>
          </button>
        )}
      </div>

      {/* Primary District */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-civiq-green" />
          <span className="font-medium text-gray-900">
            {isMultiDistrict ? 'Primary District' : 'Congressional District'}
          </span>
        </div>

        <div className="flex items-center gap-3 p-3 bg-civiq-green/10 border border-civiq-green">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-civiq-green">
                {getDistrictDisplay(primaryDistrict || districts[0]!)}
              </span>
              {primaryDistrict?.primary && <CheckCircle className="w-4 h-4 text-civiq-green" />}
              <span
                className={`px-2 py-1 text-xs font-medium ${getConfidenceColor(primaryDistrict?.confidence)}`}
              >
                {primaryDistrict?.confidence || 'high'} confidence
              </span>
            </div>

            <div className="text-sm text-civiq-green mt-1">
              {getDistrictType(primaryDistrict || districts[0]!)}
              {(() => {
                const state = primaryDistrict?.state || (districts[0] && districts[0].state);
                return (
                  state &&
                  isSpecialTerritory(state) && (
                    <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1">
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
                  ? 'bg-civiq-green text-white'
                  : 'bg-white text-civiq-green hover:bg-civiq-green/10'
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
        <div className="mb-4 p-3 bg-civiq-blue/10 border border-civiq-blue">
          <h4 className="font-medium text-civiq-blue mb-2">
            Why does this ZIP code span multiple districts?
          </h4>
          <p className="text-civiq-blue text-sm leading-relaxed">
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
                    district.primary
                      ? 'border-civiq-green bg-civiq-green/10'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {getDistrictDisplay(district)}
                      </span>
                      {district.primary && (
                        <span className="px-2 py-1 bg-civiq-green/10 text-civiq-green text-xs font-medium">
                          Primary
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs font-medium ${getConfidenceColor(district.confidence)}`}
                      >
                        {district.confidence || 'high'}
                      </span>
                    </div>

                    {onDistrictSelect && (
                      <button
                        onClick={() => onDistrictSelect(district)}
                        className={`px-3 py-1 text-sm font-medium transition-colors ${
                          selectedDistrict?.district === district.district
                            ? 'bg-civiq-blue text-white'
                            : 'bg-white text-civiq-blue hover:bg-civiq-blue/10'
                        }`}
                      >
                        {selectedDistrict?.district === district.district ? 'Selected' : 'Select'}
                      </button>
                    )}
                  </div>

                  <div className="text-sm text-gray-600 mt-1">
                    {getDistrictType(district)}
                    {isSpecialTerritory(district.state) && (
                      <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1">
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
              className="flex items-start gap-2 p-3 bg-gray-100 border border-gray-300 mb-2"
            >
              <AlertTriangle className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
              <p className="text-gray-600 text-sm">{warning}</p>
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
