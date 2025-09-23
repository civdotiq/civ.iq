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

  if (!isOpen) return null;

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddressSubmit(address.trim());
    } finally {
      setIsSubmitting(false);
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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-white border-2 border-black p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Multiple Districts Found</h2>
            <p className="text-sm text-gray-600">
              ZIP code <strong>{zipCode}</strong> spans multiple congressional districts. Please
              provide your street address for precise representative identification.
            </p>
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
              className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-civiq-blue"
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
              <span className="px-2 bg-white text-gray-500">or choose your district</span>
            </div>
          </div>

          {/* District Selection */}
          <div className="space-y-3">
            <button
              onClick={() => setShowDistrictOptions(!showDistrictOptions)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm text-gray-700">
                {showDistrictOptions ? 'Hide' : 'Show'} district options
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
              <div className="space-y-2">
                {districts.map(district => (
                  <button
                    key={`${district.state}-${district.district}`}
                    onClick={() => handleDistrictSelect(district)}
                    className="w-full text-left px-3 py-2 border border-gray-200 hover:bg-blue-50 hover:border-civiq-blue transition-colors"
                  >
                    <div className="font-medium text-gray-900">{formatDistrictName(district)}</div>
                    {district.primary && (
                      <div className="text-xs text-blue-600 mt-1">Primary district</div>
                    )}
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
