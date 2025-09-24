'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from '@/components/icons/AicherIcons';
import { quickMultiDistrictCheck, checkMultiDistrict } from '@/lib/multi-district/detection';

interface SearchError {
  type: 'network' | 'invalid_zip' | 'api_error' | 'unknown' | 'geolocation';
  message: string;
  suggestion: string;
}

export default function SearchForm() {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [multiDistrictWarning, setMultiDistrictWarning] = useState(false);
  const [error, setError] = useState<SearchError | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || isLoading) return;

    setIsLoading(true);
    setMultiDistrictWarning(false);
    setError(null);

    const cleanInput = searchInput.trim();

    try {
      if (/^\d{5}(-\d{4})?$/.test(cleanInput)) {
        const zipCode = cleanInput.split('-')[0];

        if (!zipCode) {
          setError({
            type: 'invalid_zip',
            message: 'Invalid ZIP code format',
            suggestion: 'Please enter a valid 5-digit ZIP code (e.g., 90210)',
          });
          setIsLoading(false);
          return;
        }

        // Quick pre-check for known multi-district ZIPs
        const isLikelyMultiDistrict = quickMultiDistrictCheck(zipCode);
        if (isLikelyMultiDistrict) {
          try {
            // Fetch actual multi-district data
            const multiDistrictCheck = await checkMultiDistrict(zipCode);

            if (multiDistrictCheck.success && multiDistrictCheck.isMultiDistrict) {
              setMultiDistrictWarning(true);
              setIsLoading(false);
              return; // Don't navigate yet - show enhanced warning
            } else if (!multiDistrictCheck.success) {
              setError({
                type: 'api_error',
                message: 'Unable to verify district information',
                suggestion: 'Try again or use the advanced search option below',
              });
              setIsLoading(false);
              return;
            }
          } catch {
            setError({
              type: 'network',
              message: 'Network error checking districts',
              suggestion: 'Check your connection and try again, or proceed with basic search',
            });
            setIsLoading(false);
            return;
          }
        }

        // Single district or failed check - proceed normally
        router.push(`/representatives?zip=${zipCode}`);
      } else if (cleanInput.length < 3) {
        setError({
          type: 'invalid_zip',
          message: 'Search term too short',
          suggestion: 'Please enter at least 3 characters or a valid ZIP code',
        });
        setIsLoading(false);
        return;
      } else {
        router.push(`/representatives?query=${encodeURIComponent(cleanInput)}`);
      }
    } catch {
      setError({
        type: 'unknown',
        message: 'An unexpected error occurred',
        suggestion: 'Please try again or contact support if the problem persists',
      });
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    handleSearch({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleClearError = () => {
    setError(null);
  };

  const handleAdvancedSearch = () => {
    // Navigate to results page which has full multi-district handling
    const zipCode = searchInput.trim().split('-')[0];
    if (zipCode) {
      router.push(`/results?zip=${zipCode}`);
    }
  };

  const handleGeolocation = async () => {
    if (!navigator.geolocation) {
      setError({
        type: 'geolocation',
        message: 'Geolocation not supported',
        suggestion: 'Please enter your ZIP code manually',
      });
      return;
    }

    setIsGeolocating(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use Census Geocoding API to get ZIP from coordinates
      const response = await fetch(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${latitude},${longitude}&benchmark=2020&format=json`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      const result = data.result?.addressMatches?.[0];

      if (!result?.components?.zip) {
        throw new Error('No ZIP code found');
      }

      const zipCode = result.components.zip;
      setSearchInput(zipCode);
      setIsGeolocating(false);

      // Automatically trigger search with the found ZIP
      router.push(`/representatives?zip=${zipCode}`);
    } catch {
      setIsGeolocating(false);
      setError({
        type: 'geolocation',
        message: 'Location detection failed',
        suggestion: 'Please check location permissions or enter your ZIP code manually',
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-12">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Enter your ZIP code or address..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="block w-full pl-grid-5 pr-grid-12 py-grid-2 text-lg border-aicher border-gray-300 focus:outline-none focus:border-civiq-blue"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!searchInput.trim() || isLoading}
            className="absolute inset-y-0 right-0 flex items-center px-grid-3 text-white bg-civiq-blue hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors aicher-heading"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Search'
            )}
          </button>
        </div>
      </form>

      {/* Geolocation Button */}
      <div className="mt-3 text-center">
        <button
          onClick={handleGeolocation}
          disabled={isGeolocating || isLoading}
          className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-civiq-blue bg-white border border-civiq-blue hover:bg-civiq-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGeolocating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-civiq-blue"></div>
              <span>Finding your location...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>Use my location</span>
            </>
          )}
        </button>
      </div>
      {multiDistrictWarning && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <div className="flex items-start">
            <svg
              className="w-4 h-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">Multi-District ZIP Code Detected</p>
              <p className="mt-1">
                This ZIP code spans multiple congressional districts. Use our advanced search to
                select your exact district or provide your street address.
              </p>
              <button
                onClick={handleAdvancedSearch}
                className="mt-2 inline-flex items-center px-3 py-1 bg-civiq-blue text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                Choose Your District →
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 text-sm text-red-800">
          <div className="flex items-start">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="font-medium">{error.message}</p>
              <p className="mt-1">{error.suggestion}</p>
              <div className="mt-2 flex space-x-3">
                {error.type !== 'invalid_zip' && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-3 py-1 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClearError}
                  className="inline-flex items-center px-3 py-1 bg-white border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="text-sm text-gray-500 mt-2">
        Try: &ldquo;48221&rdquo;, &ldquo;1600 Pennsylvania Avenue&rdquo;, or &ldquo;Detroit,
        MI&rdquo;
      </p>
    </div>
  );
}
