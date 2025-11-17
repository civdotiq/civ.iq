'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React, { useState } from 'react';
import { Navigation, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface GeolocationLookupProps {
  zipCode: string;
  onSuccess: (latitude: number, longitude: number, address?: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export function GeolocationLookup({
  zipCode,
  onSuccess,
  onError,
  onCancel,
}: GeolocationLookupProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      const error = 'Geolocation is not supported by this browser';
      setLocationError(error);
      onError(error);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setHasRequested(true);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          const { latitude, longitude } = position.coords;

          // Optional: Reverse geocode to get a readable address
          let address: string | undefined;
          try {
            // Use a simple reverse geocoding service (you might want to replace this with a more robust solution)
            const response = await fetch(
              `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
            );
            if (response.ok) {
              const data = await response.json();
              address = `${data.locality}, ${data.principalSubdivision}, ${data.countryCode}`;
            }
          } catch {
            // Ignore reverse geocoding errors - we still have coordinates
          }

          setIsLocating(false);
          onSuccess(latitude, longitude, address);
        } catch {
          setIsLocating(false);
          const error = 'Failed to process location data';
          setLocationError(error);
          onError(error);
        }
      },
      error => {
        setIsLocating(false);
        let errorMessage: string;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location access was denied. Please enable location services and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              'Location information is unavailable. Please try entering your address instead.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again or enter your address.';
            break;
          default:
            errorMessage = 'An unknown error occurred while retrieving your location.';
            break;
        }

        setLocationError(errorMessage);
        onError(errorMessage);
      },
      options
    );
  };

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-6 mx-auto max-w-md animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-4 sm:mb-6">
        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
          <Navigation className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
          Find Your Exact Location
        </h3>
        <p className="text-sm sm:text-base text-gray-600">
          We&apos;ll use your precise location to determine which district in ZIP code {zipCode}{' '}
          you&apos;re in.
        </p>
      </div>

      {/* Status Display */}
      {isLocating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 animate-spin flex-shrink-0" />
            <div>
              <div className="font-medium text-blue-900 text-sm sm:text-base">
                Getting your location...
              </div>
              <div className="text-xs sm:text-sm text-blue-700">
                This may take a few seconds. Please allow location access when prompted.
              </div>
            </div>
          </div>
        </div>
      )}

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900 text-sm sm:text-base">Location Error</div>
              <div className="text-xs sm:text-sm text-red-700 mt-1">{locationError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2 sm:space-y-3">
        {!hasRequested && (
          <button
            onClick={handleLocationRequest}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm sm:text-base"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                <span className="hidden sm:inline">Getting Location...</span>
                <span className="sm:hidden">Locating...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Share My Location</span>
                <span className="sm:hidden">Share Location</span>
              </>
            )}
          </button>
        )}

        {hasRequested && !isLocating && locationError && (
          <button
            onClick={handleLocationRequest}
            className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm sm:text-base"
          >
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5" />
            Try Again
          </button>
        )}

        <button
          onClick={onCancel}
          className="w-full bg-gray-100 text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium text-sm sm:text-base"
        >
          Cancel
        </button>
      </div>

      {/* Privacy Note */}
      <div className="mt-4 sm:mt-6 text-[10px] sm:text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 sm:p-3">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Privacy:</strong> Your location is only used to find your representatives and is
            not stored or shared. Location data stays on your device.
          </div>
        </div>
      </div>
    </div>
  );
}
