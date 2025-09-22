/*
 * CIV.IQ - Civic Information Hub
 * Phase 4: Edge Case Tooltip Component
 * 
 * Provides informative tooltips for edge cases like territories, DC, 
 * and other special ZIP code situations.
 */

'use client';

import { useState } from 'react';
import { Info, AlertTriangle, MapPin, ExternalLink, X } from 'lucide-react';

interface EdgeCaseTooltipProps {
  type: 'territory' | 'dc' | 'at-large' | 'multi-district' | 'low-confidence' | 'unmapped';
  zipCode?: string;
  state?: string;
  district?: string;
  additionalInfo?: string;
  className?: string;
}

export default function EdgeCaseTooltip({
  type,
  zipCode,
  state,
  district,
  additionalInfo,
  className = ''
}: EdgeCaseTooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Configuration for different edge cases
  const edgeCaseConfig = {
    territory: {
      icon: MapPin,
      title: 'U.S. Territory',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'This ZIP code is located in a U.S. territory with non-voting representation in Congress.',
      details: [
        'Representatives from territories cannot vote on final legislation',
        'They can participate in committee work and debates',
        'Territories have unique political status within the U.S. system'
      ],
      learnMoreUrl: 'https://www.house.gov/representatives/find-your-representative'
    },
    dc: {
      icon: MapPin,
      title: 'District of Columbia',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      description: 'Washington D.C. has non-voting representation in the House of Representatives.',
      details: [
        'D.C. has one non-voting delegate in the House',
        'No representation in the U.S. Senate',
        'Residents pay federal taxes but have limited representation'
      ],
      learnMoreUrl: 'https://www.house.gov/representatives/find-your-representative'
    },
    'at-large': {
      icon: Info,
      title: 'At-Large District',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'This state has only one House representative serving the entire state.',
      details: [
        'States with populations too small for multiple districts',
        'Representative serves all residents of the state',
        'Common in less populated states like Wyoming, Vermont, and Delaware'
      ],
      learnMoreUrl: 'https://www.census.gov/topics/public-sector/congressional-apportionment.html'
    },
    'multi-district': {
      icon: AlertTriangle,
      title: 'Multi-District ZIP Code',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'This ZIP code spans multiple congressional districts.',
      details: [
        'ZIP codes are designed for mail delivery, not political boundaries',
        'About 15% of ZIP codes cross district boundaries',
        'We show the primary district based on population distribution'
      ],
      learnMoreUrl: 'https://www.census.gov/programs-surveys/geography/guidance/geo-areas/zctas.html'
    },
    'low-confidence': {
      icon: AlertTriangle,
      title: 'Low Confidence Mapping',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'The district mapping for this ZIP code has lower confidence.',
      details: [
        'Data source may be incomplete or outdated',
        'ZIP code may be newly created or modified',
        'Consider verifying with official sources'
      ],
      learnMoreUrl: 'https://www.census.gov/geographies/mapping-files/time-series/geo/carto-boundary-file.html'
    },
    unmapped: {
      icon: AlertTriangle,
      title: 'Unmapped ZIP Code',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'This ZIP code could not be mapped to a congressional district.',
      details: [
        'ZIP code may be invalid or no longer in use',
        'Could be a PO Box or business-specific ZIP code',
        'May be located in a territory not represented in Congress'
      ],
      learnMoreUrl: 'https://tools.usps.com/zip-code-lookup.htm'
    }
  };

  const config = edgeCaseConfig[type];
  const IconComponent = config.icon;

  const getTerritoryName = (state: string): string => {
    const territories: Record<string, string> = {
      'DC': 'District of Columbia',
      'GU': 'Guam',
      'PR': 'Puerto Rico',
      'VI': 'U.S. Virgin Islands',
      'AS': 'American Samoa',
      'MP': 'Northern Mariana Islands'
    };
    return territories[state] || state;
  };

  const getDistrictDisplay = (state: string, district: string): string => {
    if (district === '00') {
      return `${state} At-Large`;
    }
    return `${state}-${district}`;
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${config.color} ${config.bgColor} hover:opacity-80`}
        aria-label={`Show information about ${config.title}`}
      >
        <IconComponent className="w-3 h-3" />
        <span className="hidden sm:inline">{config.title}</span>
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 sm:absolute sm:inset-auto sm:bg-transparent sm:p-0">
          <div className={`relative w-full max-w-md bg-white rounded-lg shadow-xl border-2 ${config.borderColor} sm:absolute sm:top-full sm:left-0 sm:mt-2 sm:w-80`}>
            {/* Header */}
            <div className={`px-4 py-3 rounded-t-lg ${config.bgColor} border-b ${config.borderColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className={`w-5 h-5 ${config.color}`} />
                  <h3 className={`font-semibold ${config.color}`}>{config.title}</h3>
                </div>
                <button
                  onClick={() => setShowTooltip(false)}
                  className={`${config.color} hover:opacity-70 transition-opacity`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Context Information */}
              {zipCode && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600">
                    <strong>ZIP Code:</strong> {zipCode}
                    {state && district && (
                      <>
                        <br />
                        <strong>District:</strong> {getDistrictDisplay(state, district)}
                        {state && ['GU', 'PR', 'VI', 'AS', 'MP', 'DC'].includes(state) && (
                          <>
                            <br />
                            <strong>Location:</strong> {getTerritoryName(state)}
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Main Description */}
              <p className="text-gray-700 mb-4">{config.description}</p>

              {/* Additional Info */}
              {additionalInfo && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">{additionalInfo}</p>
                </div>
              )}

              {/* Details */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">What this means:</h4>
                <ul className="space-y-1">
                  {config.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Learn More */}
              <div className="pt-3 border-t border-gray-100">
                <a
                  href={config.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1 text-sm font-medium ${config.color} hover:opacity-70 transition-opacity`}
                >
                  <span>Learn more</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}