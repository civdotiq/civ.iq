'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchIcon } from '@/components/icons/AicherIcons';
import { quickMultiDistrictCheck, checkMultiDistrict } from '@/lib/multi-district/detection';
import AddressAutocomplete from '@/components/search/AddressAutocomplete';

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
        // Route to results page which has geocoding support for addresses
        router.push(`/results?q=${encodeURIComponent(cleanInput)}`);
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
        suggestion:
          'Your browser does not support geolocation. Please enter your address manually.',
      });
      return;
    }

    setIsGeolocating(true);
    setError(null);

    try {
      // Get browser geolocation with specific error handling
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 15000, // Increased timeout to 15 seconds
          maximumAge: 300000,
          enableHighAccuracy: false, // Faster response, lower accuracy is fine for congressional districts
        });
      });

      const { latitude, longitude } = position.coords;

      // Use Census Geocoding API with geographies endpoint to get district data
      const response = await fetch(
        `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${longitude}&y=${latitude}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=all`
      );

      if (!response.ok) {
        throw new Error('CENSUS_API_ERROR');
      }

      const data = await response.json();
      const geographies = data.result?.geographies;

      if (!geographies) {
        throw new Error('NO_GEOGRAPHY_DATA');
      }

      // Extract congressional district and state from geography layers
      const congressionalDistricts = geographies['119th Congressional Districts'] || [];
      const states = geographies['States'] || [];
      const zipAreas = geographies['2020 Census ZIP Code Tabulation Areas'] || [];

      if (congressionalDistricts.length === 0 || states.length === 0) {
        throw new Error('NO_DISTRICT_FOUND');
      }

      const districtName = congressionalDistricts[0]?.NAME || '';
      const stateCode = states[0]?.STUSAB || '';
      const zipCode = zipAreas[0]?.ZCTA5CE20 || '';

      // Parse district number from name (e.g., "Congressional District 13" -> "13")
      const districtMatch = districtName.match(/Congressional District (\d+)/);
      const districtNumber = districtMatch ? districtMatch[1] : '';

      // Create a descriptive location string
      const locationDescription = zipCode
        ? `${stateCode}-${districtNumber} (ZIP ${zipCode})`
        : `${stateCode}-${districtNumber}`;

      setSearchInput(locationDescription);
      setIsGeolocating(false);

      // Navigate to representatives page with state and district info
      if (zipCode) {
        // If we have a ZIP, use it for more precise results
        router.push(`/representatives?zip=${zipCode}`);
      } else {
        // Otherwise, navigate to district page directly
        const districtId = `${stateCode.toLowerCase()}${districtNumber.padStart(2, '0')}`;
        router.push(`/districts/${districtId}`);
      }
    } catch (error) {
      setIsGeolocating(false);

      // Handle specific geolocation errors
      if (error && typeof error === 'object' && 'code' in error) {
        const geoError = error as GeolocationPositionError;

        if (geoError.code === 1) {
          // PERMISSION_DENIED
          setError({
            type: 'geolocation',
            message: 'Location permission denied',
            suggestion:
              'Please enable location permissions in your browser settings, or enter your address manually.',
          });
        } else if (geoError.code === 2) {
          // POSITION_UNAVAILABLE
          setError({
            type: 'geolocation',
            message: 'Location unavailable',
            suggestion:
              'Your device could not determine your location. Please enter your address manually.',
          });
        } else if (geoError.code === 3) {
          // TIMEOUT
          setError({
            type: 'geolocation',
            message: 'Location request timed out',
            suggestion:
              'The request took too long. Please try again or enter your address manually.',
          });
        }
      } else if (error instanceof Error) {
        // Handle Census API errors
        if (error.message === 'CENSUS_API_ERROR') {
          setError({
            type: 'api_error',
            message: 'Geocoding service unavailable',
            suggestion:
              'The address lookup service is currently unavailable. Please enter your address manually.',
          });
        } else if (error.message === 'NO_GEOGRAPHY_DATA' || error.message === 'NO_DISTRICT_FOUND') {
          setError({
            type: 'geolocation',
            message: 'No district found',
            suggestion:
              'Could not determine your congressional district. Please enter your address or ZIP code manually.',
          });
        } else {
          setError({
            type: 'unknown',
            message: 'Location detection failed',
            suggestion: 'An unexpected error occurred. Please enter your address manually.',
          });
        }
      } else {
        // Generic fallback
        setError({
          type: 'geolocation',
          message: 'Location detection failed',
          suggestion: 'Please check location permissions or enter your address manually.',
        });
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto mb-grid-2 sm:mb-grid-6 px-grid-2 sm:px-0">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative border-2 border-black">
          <div className="absolute inset-y-0 left-0 pl-grid-2 flex items-center pointer-events-none z-10">
            <SearchIcon className="h-4 sm:h-5 w-4 sm:w-5 text-gray-400" />
          </div>
          <AddressAutocomplete
            onSelect={address => {
              setSearchInput(address);
            }}
            onChange={value => {
              setSearchInput(value);
            }}
            placeholder="Enter address or ZIP code"
            disabled={isLoading}
            defaultValue={searchInput}
            ariaLabel="Search by address or ZIP code"
            className="pl-grid-4 sm:pl-grid-5 pr-grid-8 sm:pr-grid-12"
          />
          <button
            type="submit"
            disabled={!searchInput.trim() || isLoading}
            className="absolute inset-y-0 right-0 flex items-center px-grid-2 sm:px-grid-3 text-white bg-civiq-blue hover:bg-civiq-green disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors aicher-heading text-xs sm:text-base border-l-2 border-black"
          >
            {isLoading ? (
              <div className="animate-spin h-4 sm:h-5 w-4 sm:w-5 border-2 border-white border-t-transparent"></div>
            ) : (
              'SEARCH'
            )}
          </button>
        </div>
      </form>

      {/* Geolocation Button */}
      <div className="mt-grid-2 text-center">
        <button
          onClick={handleGeolocation}
          disabled={isGeolocating || isLoading}
          className="inline-flex items-center justify-center space-x-2 px-grid-2 py-grid-2 text-xs sm:text-sm font-bold uppercase tracking-aicher text-civiq-blue bg-white border-2 border-civiq-blue hover:bg-civiq-blue hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] w-full sm:w-auto"
        >
          {isGeolocating ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-civiq-blue border-t-transparent"></div>
              <span>Finding location...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="square"
                  strokeLinejoin="miter"
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
        <div className="mt-grid-2 p-grid-2 sm:p-grid-3 bg-blue-50 border-2 border-civiq-blue text-xs sm:text-sm text-blue-800">
          <div className="flex items-start">
            <svg
              className="w-4 sm:w-5 h-4 sm:h-5 text-blue-500 mt-0.5 mr-grid-1 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="square" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
            <div className="flex-1">
              <p className="font-bold uppercase tracking-aicher text-xs sm:text-sm">
                Multi-District ZIP Code
              </p>
              <p className="mt-grid-1 text-xs sm:text-sm">
                This ZIP spans multiple districts. Use advanced search to select yours.
              </p>
              <button
                onClick={handleAdvancedSearch}
                className="mt-grid-2 inline-flex items-center justify-center px-grid-2 py-grid-2 bg-civiq-blue text-white text-xs sm:text-sm font-bold uppercase tracking-aicher hover:bg-civiq-green transition-colors min-h-[44px] w-full sm:w-auto"
              >
                Choose Your District →
              </button>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="mt-grid-2 p-grid-2 sm:p-grid-3 bg-red-50 border-2 border-civiq-red text-xs sm:text-sm text-red-800">
          <div className="flex items-start">
            <svg
              className="w-4 sm:w-5 h-4 sm:h-5 text-red-500 mt-0.5 mr-grid-1 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="9" strokeWidth={2} />
              <path strokeLinecap="square" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
            <div className="flex-1">
              <p className="font-bold uppercase tracking-aicher text-xs sm:text-sm">
                {error.message}
              </p>
              <p className="mt-grid-1 text-xs sm:text-sm">{error.suggestion}</p>
              <div className="mt-grid-2 flex flex-col sm:flex-row space-y-grid-1 sm:space-y-0 sm:space-x-grid-2">
                {error.type !== 'invalid_zip' && (
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center justify-center w-full sm:w-auto px-grid-2 py-grid-2 bg-civiq-red text-white text-sm font-bold uppercase tracking-aicher hover:bg-red-700 transition-colors border-2 border-black"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={handleClearError}
                  className="inline-flex items-center justify-center w-full sm:w-auto px-grid-2 py-grid-2 bg-white border-2 border-civiq-red text-red-700 text-sm font-bold uppercase tracking-aicher hover:bg-red-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs sm:text-sm text-gray-500 mt-grid-1 sm:mt-grid-2 px-grid-1">
        Try: &ldquo;123 Main St, Detroit, MI&rdquo;, &ldquo;1600 Pennsylvania Ave&rdquo;, or
        &ldquo;48221&rdquo;
      </p>
    </div>
  );
}
