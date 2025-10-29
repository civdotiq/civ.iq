/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { ComponentErrorBoundary } from '@/shared/components/error-boundaries';
import { SmartSearchInput } from '@/features/search/components/search/SmartSearchInput';
import { logger } from '@/lib/logging/logger-client';
import type { UnifiedGeocodeResult } from '@/types/unified-geocode';

interface AddressRefinementProps {
  zipCode: string;
  onSuccess: (result: UnifiedGeocodeResult) => void;
  onCancel: () => void;
  className?: string;
}

export function AddressRefinement({
  zipCode,
  onSuccess,
  onCancel,
  className = '',
}: AddressRefinementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSubmit = async (fullAddress: string) => {
    if (!fullAddress.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.info('Address refinement started', {
        zipCode,
        addressLength: fullAddress.length,
      });

      // Parse the address into components
      // Expected format: "street, city, state zip" or variations
      const addressParts = fullAddress.split(',').map(part => part.trim());

      let street = '';
      let city = '';
      let state = '';
      let zip = zipCode;

      if (addressParts.length >= 3) {
        // Format: "street, city, state zip"
        street = addressParts[0] || '';
        city = addressParts[1] || '';
        const lastPart = addressParts[2] || '';
        const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/i);
        if (stateZipMatch) {
          state = stateZipMatch[1] || '';
          zip = stateZipMatch[2] || zip;
        } else {
          state = lastPart;
        }
      } else if (addressParts.length === 2) {
        // Format: "street, city state" or "street, state"
        street = addressParts[0] || '';
        const secondPart = addressParts[1] || '';
        const cityStateMatch = secondPart.match(/^(.+?)\s+([A-Z]{2})$/i);
        if (cityStateMatch) {
          city = cityStateMatch[1] || '';
          state = cityStateMatch[2] || '';
        } else {
          state = secondPart;
        }
      } else {
        // Single part - just treat as street, require more info
        street = fullAddress;
      }

      if (!street || !state) {
        throw new Error(
          'Please provide at least a street address and state (e.g., "123 Main St, Springfield, IL")'
        );
      }

      // Call unified geocode API
      const response = await fetch('/api/unified-geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          street,
          city: city || 'Unknown',
          state,
          zip,
        }),
      });

      const result: UnifiedGeocodeResult = await response.json();

      if (!result.success || !result.districts) {
        throw new Error(
          result.error?.userMessage || result.error?.message || 'Failed to geocode address'
        );
      }

      logger.info('Address refinement successful', {
        zipCode,
        matchedAddress: result.matchedAddress,
        federalDistrict: result.districts.federal,
        stateSenate: result.districts.stateSenate?.number,
        stateHouse: result.districts.stateHouse?.number,
      });

      onSuccess(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to geocode address';
      setError(errorMessage);

      logger.error('Address refinement failed', err as Error, {
        zipCode,
        address: fullAddress,
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
            <h3 className="text-xl font-bold text-gray-900 mb-2">Enter Your Full Address</h3>
            <p className="text-gray-600">
              Provide your street address to get your exact congressional district. This is more
              accurate than using just your ZIP code.
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
              <div className="p-3 bg-red-50 border border-red-200">
                <div className="flex items-start">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Address Not Found</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
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
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips for Better Results</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Include your full street address (number, street name, type)</li>
              <li>• Add your city and state for best accuracy</li>
              <li>
                • Examples: &quot;123 Oak Street, Springfield, IL&quot; or &quot;456 Park Ave, Apt
                2B, New York, NY&quot;
              </li>
              <li>• Avoid PO Boxes - use your physical residence address</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your address is only used to determine your congressional district and is not
              stored.
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
  zipCode: _zipCode,
  onSuccess,
  onCancel,
  className = '',
}: AddressRefinementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSubmit = async (fullAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Parse address (simplified for inline version)
      const addressParts = fullAddress.split(',').map(part => part.trim());

      const street = addressParts[0] || '';
      let city = '';
      let state = '';

      if (addressParts.length >= 3) {
        city = addressParts[1] || '';
        state = addressParts[2]?.match(/([A-Z]{2})/i)?.[1] || '';
      } else if (addressParts.length === 2) {
        const secondPart = addressParts[1] || '';
        const cityStateMatch = secondPart.match(/^(.+?)\s+([A-Z]{2})$/i);
        if (cityStateMatch) {
          city = cityStateMatch[1] || '';
          state = cityStateMatch[2] || '';
        }
      }

      if (!street || !state) {
        throw new Error('Please provide street address and state');
      }

      const response = await fetch('/api/unified-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street,
          city: city || 'Unknown',
          state,
        }),
      });

      const result: UnifiedGeocodeResult = await response.json();

      if (!result.success) {
        throw new Error(result.error?.userMessage || 'Address not found');
      }

      onSuccess(result);
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

        {error && <div className="text-xs text-red-600 text-center">{error}</div>}

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
