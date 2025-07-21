/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ComponentErrorBoundary } from '@/components/error-boundaries';
import { SmartSearchInput } from '@/components/search/SmartSearchInput';
import { geocodeAddress, extractDistrictFromResult } from '@/lib/census-geocoder';
import { structuredLogger } from '@/lib/logging/logger';

interface AddressRefinementProps {
  zipCode: string;
  onSuccess: (state: string, district: string, address: string) => void;
  onCancel: () => void;
  className?: string;
}

export function AddressRefinement({
  zipCode,
  onSuccess,
  onCancel,
  className = ''
}: AddressRefinementProps) {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSubmit = async (fullAddress: string) => {
    if (!fullAddress.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      structuredLogger.info('Address refinement started', {
        zipCode,
        addressLength: fullAddress.length
      });

      const result = await geocodeAddress(fullAddress);

      if ('error' in result) {
        throw new Error(result.error);
      }

      if (result.length === 0) {
        throw new Error('No congressional district found for this address');
      }

      // Use the first (most confident) result
      const match = result[0];
      const districtInfo = extractDistrictFromResult(match);
      
      if (!districtInfo) {
        throw new Error('No congressional district information found in the geocoding result');
      }
      
      structuredLogger.info('Address refinement successful', {
        zipCode,
        state: districtInfo.state,
        district: districtInfo.district,
        fullDistrict: districtInfo.fullDistrict,
        matchedAddress: match.matchedAddress
      });

      onSuccess(districtInfo.state, districtInfo.district, fullAddress);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to geocode address';
      setError(errorMessage);
      
      structuredLogger.error('Address refinement failed', err as Error, {
        zipCode,
        address: fullAddress
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ComponentErrorBoundary componentName="AddressRefinement">
      <Card className={`max-w-2xl mx-auto ${className}`}>
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Enter Your Full Address
            </h3>
            <p className="text-gray-600">
              Provide your street address to get your exact congressional district.
              This is more accurate than using just your ZIP code.
            </p>
          </div>

          {/* Address Input */}
          <div className="space-y-4">
            <SmartSearchInput
              placeholder={`Enter your address (e.g., 123 Main St, Your City, State ${zipCode})`}
              initialValue={zipCode ? `, ${zipCode}` : ''}
              onSearch={handleAddressSubmit}
              showRecentSearches={false}
              showExamples={false}
              className="w-full"
            />

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Address Not Found
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {error}
                    </p>
                    <p className="text-xs text-red-600 mt-2">
                      Try including more details like your full street address, city, and state.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="flex items-center space-x-3 text-civiq-blue">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-civiq-blue"></div>
                  <span className="text-sm">Finding your exact district...</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={onCancel}
                variant="secondary"
                className="flex-1"
                disabled={isLoading}
              >
                Back to District Selection
              </Button>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">
              💡 Tips for Better Results
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Include your full street address (number, street name, type)</li>
              <li>• Add your city and state for best accuracy</li>
              <li>• Examples: "123 Oak Street, Springfield, IL" or "456 Park Ave, Apt 2B, New York, NY"</li>
              <li>• Avoid PO Boxes - use your physical residence address</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your address is only used to determine your congressional district and is not stored.
            </p>
          </div>
        </div>
      </Card>
    </ComponentErrorBoundary>
  );
}

/**
 * Compact inline version for smaller spaces
 */
export function InlineAddressRefinement({
  zipCode,
  onSuccess,
  onCancel,
  className = ''
}: AddressRefinementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSubmit = async (fullAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await geocodeAddress(fullAddress);

      if ('error' in result) {
        throw new Error(result.error);
      }

      if (result.length === 0) {
        throw new Error('Address not found');
      }

      const match = result[0];
      const districtInfo = extractDistrictFromResult(match);
      
      if (!districtInfo) {
        throw new Error('No district information found');
      }
      
      onSuccess(districtInfo.state, districtInfo.district, fullAddress);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ComponentErrorBoundary componentName="InlineAddressRefinement">
      <div className={`space-y-3 ${className}`}>
        <div className="text-center text-sm text-gray-600">
          Enter your street address for exact district matching:
        </div>

        <SmartSearchInput
          placeholder="123 Main St, City, State"
          onSearch={handleAddressSubmit}
          showRecentSearches={false}
          showExamples={false}
          className="w-full"
        />

        {error && (
          <div className="text-xs text-red-600 text-center">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center text-sm text-civiq-blue">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-civiq-blue mr-2"></div>
            Geocoding...
          </div>
        )}

        <div className="text-center">
          <button
            onClick={onCancel}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isLoading}
          >
            ← Back to district selection
          </button>
        </div>
      </div>
    </ComponentErrorBoundary>
  );
}