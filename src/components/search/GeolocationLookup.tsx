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
    <div className="bg-white border-2 border-blue-200 rounded-xl p-6 mx-auto max-w-md animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Navigation className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Find Your Exact Location</h3>
        <p className="text-gray-600">
          We&apos;ll use your precise location to determine which district in ZIP code {zipCode}{' '}
          you&apos;re in.
        </p>
      </div>

      {/* Status Display */}
      {isLocating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <div className="font-medium text-blue-900">Getting your location...</div>
              <div className="text-sm text-blue-700">
                This may take a few seconds. Please allow location access when prompted.
              </div>
            </div>
          </div>
        </div>
      )}

      {locationError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Location Error</div>
              <div className="text-sm text-red-700 mt-1">{locationError}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-3">
        {!hasRequested && (
          <button
            onClick={handleLocationRequest}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Getting Location...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                Share My Location
              </>
            )}
          </button>
        )}

        {hasRequested && !isLocating && locationError && (
          <button
            onClick={handleLocationRequest}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium"
          >
            <Navigation className="w-5 h-5" />
            Try Again
          </button>
        )}

        <button
          onClick={onCancel}
          className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
        >
          Cancel
        </button>
      </div>

      {/* Privacy Note */}
      <div className="mt-6 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Privacy:</strong> Your location is only used to find your representatives and is
            not stored or shared. Location data stays on your device.
          </div>
        </div>
      </div>
    </div>
  );
}
