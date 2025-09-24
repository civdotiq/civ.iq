'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React, { useState } from 'react';
import { MapPin, Search, AlertCircle } from 'lucide-react';

interface AddressRefinementInputProps {
  zipCode: string;
  onSuccess: (address: string) => void;
  onCancel: () => void;
}

export function AddressRefinementInput({
  zipCode,
  onSuccess,
  onCancel,
}: AddressRefinementInputProps) {
  const [address, setAddress] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setValidationError('Please enter a valid address');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      // Simple validation - check if it looks like an address
      const hasNumber = /\d/.test(trimmedAddress);
      const hasStreet =
        trimmedAddress.toLowerCase().includes('st') ||
        trimmedAddress.toLowerCase().includes('ave') ||
        trimmedAddress.toLowerCase().includes('blvd') ||
        trimmedAddress.toLowerCase().includes('rd') ||
        trimmedAddress.toLowerCase().includes('lane') ||
        trimmedAddress.toLowerCase().includes('drive');

      if (!hasNumber && !hasStreet) {
        setValidationError('Please enter a complete street address (e.g., "123 Main St")');
        setIsValidating(false);
        return;
      }

      // Add ZIP code if not included
      let fullAddress = trimmedAddress;
      if (!fullAddress.includes(zipCode)) {
        fullAddress = `${trimmedAddress}, ${zipCode}`;
      }

      setIsValidating(false);
      onSuccess(fullAddress);
    } catch {
      setIsValidating(false);
      setValidationError('Failed to validate address. Please try again.');
    }
  };

  const exampleAddresses = [
    `123 Main Street, ${zipCode}`,
    `456 Oak Avenue, ${zipCode}`,
    `789 Park Boulevard, ${zipCode}`,
  ];

  return (
    <div className="bg-white border-2 border-blue-200 rounded-xl p-6 mx-auto max-w-lg animate-fade-in-up">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Enter Your Full Address</h3>
        <p className="text-gray-600">
          Please provide your street address in ZIP code {zipCode} for precise representative
          matching.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="address-input" className="block text-sm font-medium text-gray-700 mb-2">
            Street Address
          </label>
          <div className="relative">
            <input
              id="address-input"
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={`e.g., 123 Main Street`}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={isValidating}
              autoComplete="street-address"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-5 h-5 text-gray-400" />
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            ZIP code {zipCode} will be added automatically
          </p>
        </div>

        {/* Validation Error */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{validationError}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!address.trim() || isValidating}
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center justify-center gap-2"
          >
            {isValidating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Validating...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Find Representatives
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Examples */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Examples for ZIP {zipCode}:</h4>
        <div className="space-y-2">
          {exampleAddresses.map((example, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setAddress(example.split(',')[0] || '')}
              className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <strong>Tip:</strong> Include your house number and street name for best results. We&apos;ll
        use this to determine your exact congressional district.
      </div>
    </div>
  );
}
