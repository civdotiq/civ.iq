'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React, { useState } from 'react';
import { MapPin, Navigation, Target } from 'lucide-react';
import { DistrictInfo } from '@/lib/multi-district/detection';

interface MultiDistrictNotificationProps {
  zipCode: string;
  districts: DistrictInfo[];
  onSelectDistrict: (district: DistrictInfo) => void;
  onUseLocation: () => void;
  onRefineAddress: () => void;
  onClose: () => void;
}

export function MultiDistrictNotification({
  zipCode,
  districts,
  onSelectDistrict,
  onUseLocation,
  onRefineAddress,
  onClose,
}: MultiDistrictNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mx-auto max-w-2xl animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Multiple Representatives Found</h3>
            <p className="text-blue-700">
              ZIP code {zipCode} spans {districts.length} congressional districts
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-blue-500 hover:text-blue-700 transition-colors p-1"
          aria-label="Close notification"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Main Message */}
      <p className="text-blue-800 mb-6">
        To find your exact representative, please choose one of these options:
      </p>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {/* Use Current Location */}
        <button
          onClick={onUseLocation}
          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
        >
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
            <Navigation className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Use Your Current Location</div>
            <div className="text-sm text-gray-600">
              Share your location to find your exact district automatically
            </div>
          </div>
          <div className="text-blue-600 group-hover:text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Enter Full Address */}
        <button
          onClick={onRefineAddress}
          className="w-full flex items-center gap-4 p-4 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
        >
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Enter Your Full Address</div>
            <div className="text-sm text-gray-600">
              Provide your street address for precise district matching
            </div>
          </div>
          <div className="text-blue-600 group-hover:text-blue-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      {/* District Selection */}
      <div className="border-t border-blue-200 pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <span className="text-sm font-medium text-blue-800">
            Or choose from available districts:
          </span>
          <svg
            className={`w-4 h-4 text-blue-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="space-y-2 animate-fade-in">
            {districts.map(district => (
              <button
                key={`${district.state}-${district.district}`}
                onClick={() => onSelectDistrict(district)}
                className="w-full p-3 bg-white border border-blue-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {district.state}-{district.district}
                      {district.primary && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Most likely
                        </span>
                      )}
                    </div>
                    {district.confidence && (
                      <div className="text-xs text-gray-600">Confidence: {district.confidence}</div>
                    )}
                  </div>
                  <div className="text-blue-600 group-hover:text-blue-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Note */}
      <div className="mt-4 text-xs text-blue-600 bg-blue-100 rounded-lg p-3">
        <strong>Why does this happen?</strong> Some ZIP codes cross congressional district
        boundaries. For the most accurate results, we need to know your specific location within the
        ZIP code.
      </div>
    </div>
  );
}
