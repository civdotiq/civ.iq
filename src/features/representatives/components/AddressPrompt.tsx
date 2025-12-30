'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import { DistrictInfo } from '@/lib/multi-district/detection';

interface AddressPromptProps {
  isOpen: boolean;
  onClose: () => void;
  zipCode: string;
  districts: DistrictInfo[];
  onAddressSubmit: (address: string) => void;
  onDistrictSelect: (district: DistrictInfo) => void;
}

export function AddressPrompt({
  isOpen,
  onClose,
  zipCode,
  districts,
  onAddressSubmit,
  onDistrictSelect,
}: AddressPromptProps) {
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDistrictOptions, setShowDistrictOptions] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setLocationError(null);
    try {
      await onAddressSubmit(address.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseLocation = async () => {
    if (isGettingLocation) return;

    setIsGettingLocation(true);
    setLocationError(null);

    try {
      // Check if geolocation is available
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        return;
      }

      // Get current position
      navigator.geolocation.getCurrentPosition(
        async position => {
          try {
            // Call geocode API with coordinates
            const response = await fetch('/api/geocode', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                mode: 'coordinates',
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                zipCode,
              }),
            });

            const data = await response.json();

            if (data.success && data.district) {
              // Found the district - select it
              const foundDistrict = districts.find(
                d => d.state === data.district.state && d.district === data.district.district
              );
              if (foundDistrict) {
                onDistrictSelect(foundDistrict);
                onClose();
              } else {
                setLocationError('Could not match your location to available districts');
              }
            } else {
              setLocationError(data.error?.message || 'Could not determine your district');
            }
          } catch {
            // Geocoding error
            setLocationError('Failed to determine your district. Please try again.');
          } finally {
            setIsGettingLocation(false);
          }
        },
        error => {
          setIsGettingLocation(false);
          switch (error.code) {
            case error.PERMISSION_DENIED:
              setLocationError('Location access denied. Please enable location permissions.');
              break;
            case error.POSITION_UNAVAILABLE:
              setLocationError('Location information unavailable.');
              break;
            case error.TIMEOUT:
              setLocationError('Location request timed out.');
              break;
            default:
              setLocationError('An error occurred getting your location.');
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    } catch {
      // Location error
      setLocationError('Failed to get your location. Please try again.');
      setIsGettingLocation(false);
    }
  };

  const handleDistrictSelect = (district: DistrictInfo) => {
    onDistrictSelect(district);
    onClose();
  };

  const formatDistrictName = (district: DistrictInfo) => {
    if (district.district === '00' || district.district === 'AL') {
      return `${district.state} At-Large`;
    }
    return `${district.state} District ${district.district}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg bg-white border-2 border-black p-6 shadow-xl">
          {/* Header */}
          <div className="mb-6">
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 mb-2">
              Multiple Districts Found
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    ZIP code <strong>{zipCode}</strong> spans{' '}
                    <strong>{districts.length} congressional districts</strong>.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600">For accurate representation, please choose one:</p>
            <ul className="list-disc list-inside text-sm text-gray-600 mt-2 ml-2">
              <li>Share your location for instant district identification</li>
              <li>Enter your street address for precise lookup</li>
              <li>Select your district manually if you know it</li>
            </ul>
          </div>

          {/* Use Location Button */}
          <div className="mb-4">
            <button
              onClick={handleUseLocation}
              disabled={isGettingLocation}
              className="w-full px-4 py-3 bg-civiq-blue text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors rounded-lg flex items-center justify-center"
            >
              {isGettingLocation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Getting your location...
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
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
                  Use My Location
                </>
              )}
            </button>
            {locationError && <p className="mt-2 text-sm text-red-600">{locationError}</p>}
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or enter your address</span>
            </div>
          </div>

          {/* Address Form */}
          <form onSubmit={handleAddressSubmit} className="mb-6">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
              Street Address
            </label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g., 1600 Pennsylvania Avenue"
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-civiq-blue"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={!address.trim() || isSubmitting}
              className="w-full mt-3 px-4 py-2 bg-civiq-blue text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Finding District...
                </div>
              ) : (
                'Find My Representative'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or choose your district manually</span>
            </div>
          </div>

          {/* District Selection */}
          <div className="space-y-3">
            <button
              onClick={() => setShowDistrictOptions(!showDistrictOptions)}
              className="w-full flex items-center justify-between px-4 py-3 border-2 border-gray-300 hover:border-civiq-blue hover:bg-blue-50 transition-all rounded-lg"
            >
              <span className="text-sm font-medium text-gray-700">
                {showDistrictOptions ? 'Hide' : 'Select from'} {districts.length} available
                districts
              </span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${
                  showDistrictOptions ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showDistrictOptions && (
              <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {districts.map(district => (
                  <button
                    key={`${district.state}-${district.district}`}
                    onClick={() => handleDistrictSelect(district)}
                    className="w-full text-left px-4 py-3 border border-gray-200 hover:bg-blue-50 hover:border-civiq-blue transition-colors rounded-lg group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-civiq-blue">
                          {formatDistrictName(district)}
                        </div>
                        {district.primary && (
                          <div className="text-xs text-blue-600 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            Most likely district
                          </div>
                        )}
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 group-hover:text-civiq-blue"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Having trouble? You can also visit{' '}
              <a
                href="https://www.house.gov/representatives/find-your-representative"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                House.gov
              </a>{' '}
              for official district lookup.
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
