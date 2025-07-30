/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { ValidationErrorHandler } from '@/lib/errors/ErrorHandlers';
import { InvalidZipCodeError, InvalidAddressError } from '@/lib/errors/ErrorTypes';
import { InlineError } from '@/shared/components/ui/ErrorComponents';

interface SearchValidationProps {
  onValidSearch: (query: string, type: 'zip' | 'address') => void;
  placeholder?: string;
  className?: string;
}

export function SearchValidation({
  onValidSearch,
  placeholder = 'Enter ZIP code or address',
  className = '',
}: SearchValidationProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const validateAndSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setError('Please enter a ZIP code or address');
        return;
      }

      setIsValidating(true);
      setError(null);

      try {
        const trimmed = searchQuery.trim();

        // Determine if it's a ZIP code or address
        const isZipCode = /^\d{5}(-\d{4})?$/.test(trimmed);

        if (isZipCode) {
          // Extract 5-digit ZIP from ZIP+4 format
          const zipCode = trimmed.substring(0, 5);
          ValidationErrorHandler.validateZipCode(zipCode);
          onValidSearch(zipCode, 'zip');
        } else {
          ValidationErrorHandler.validateAddress(trimmed);
          onValidSearch(trimmed, 'address');
        }
      } catch (err) {
        if (err instanceof InvalidZipCodeError) {
          setError(err.userMessage + '. ' + err.helpText);
        } else if (err instanceof InvalidAddressError) {
          setError(err.userMessage + '. ' + err.helpText);
        } else {
          setError('Please enter a valid ZIP code or full address');
        }
      } finally {
        setIsValidating(false);
      }
    },
    [onValidSearch]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateAndSearch(query);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }

    // Real-time validation for ZIP codes
    if (value.trim()) {
      const isZipCode = /^\d+$/.test(value.trim());
      if (isZipCode && value.length > 5) {
        setError('ZIP codes are 5 digits only');
      }
    }
  };

  const getSuggestions = () => {
    if (!query.trim()) return null;

    const trimmed = query.trim();
    const isNumeric = /^\d+$/.test(trimmed);

    if (isNumeric) {
      if (trimmed.length < 5) {
        return (
          <div className="text-xs text-gray-500 mt-1">
            ZIP codes are 5 digits (e.g., 48201, 10001)
          </div>
        );
      }
    } else {
      const hasNumbers = /\d/.test(trimmed);
      if (!hasNumbers && trimmed.length > 2) {
        return (
          <div className="text-xs text-gray-500 mt-1">
            Include street number (e.g., "123 Main St, Detroit MI")
          </div>
        );
      }
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-2 ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:border-transparent ${
            error ? 'border-red-300 bg-red-50' : 'border-gray-300'
          }`}
          disabled={isValidating}
        />

        <button
          type="submit"
          disabled={!query.trim() || isValidating}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-civiq-blue text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isValidating ? (
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {error && <InlineError error={error} />}
      {getSuggestions()}

      {/* Example searches */}
      <div className="text-xs text-gray-500">
        <span className="font-medium">Examples:</span>
        <button
          type="button"
          onClick={() => setQuery('48201')}
          className="ml-2 text-civiq-blue hover:underline"
        >
          48201
        </button>
        <span className="mx-1">•</span>
        <button
          type="button"
          onClick={() => setQuery('1600 Pennsylvania Ave, Washington DC')}
          className="text-civiq-blue hover:underline"
        >
          1600 Pennsylvania Ave, Washington DC
        </button>
      </div>
    </form>
  );
}

// Enhanced SmartSearchInput with validation
interface SmartSearchInputProps {
  onSearch: (query: string, type: 'zip' | 'address') => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
  showExamples?: boolean;
}

export function EnhancedSmartSearchInput({
  onSearch,
  placeholder = 'Enter ZIP code or address',
  className = '',
  showRecentSearches = false,
  showExamples = false,
}: SmartSearchInputProps) {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load recent searches on mount
  React.useEffect(() => {
    if (showRecentSearches && typeof localStorage !== 'undefined') {
      try {
        const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        setRecentSearches(recent.slice(0, 5));
      } catch (e) {
        console.warn('Failed to load recent searches:', e);
      }
    }
  }, [showRecentSearches]);

  const handleValidSearch = useCallback(
    (query: string, type: 'zip' | 'address') => {
      // Save to recent searches
      if (showRecentSearches && typeof localStorage !== 'undefined') {
        try {
          const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
          const updated = [query, ...recent.filter((s: string) => s !== query)].slice(0, 10);
          localStorage.setItem('recentSearches', JSON.stringify(updated));
          setRecentSearches(updated.slice(0, 5));
        } catch (e) {
          console.warn('Failed to save recent search:', e);
        }
      }

      setShowSuggestions(false);
      onSearch(query, type);
    },
    [onSearch, showRecentSearches]
  );

  const examples = [
    { label: 'Detroit', value: '48201' },
    { label: 'Manhattan', value: '10001' },
    { label: 'Full Address', value: '123 Main St, Detroit MI' },
  ];

  return (
    <div className={`relative ${className}`}>
      <SearchValidation
        onValidSearch={handleValidSearch}
        placeholder={placeholder}
        className="w-full"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && (showRecentSearches || showExamples) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Recent searches */}
          {showRecentSearches && recentSearches.length > 0 && (
            <div className="p-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Recent Searches
              </h4>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const isZip = /^\d{5}$/.test(search);
                      handleValidSearch(search, isZip ? 'zip' : 'address');
                    }}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Examples */}
          {showExamples && (
            <div className="p-3">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Examples
              </h4>
              <div className="space-y-1">
                {examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      const isZip = /^\d{5}$/.test(example.value);
                      handleValidSearch(example.value, isZip ? 'zip' : 'address');
                    }}
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    <span className="font-medium">{example.label}:</span>{' '}
                    <span className="text-gray-600">{example.value}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay to close suggestions */}
      {showSuggestions && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
      )}
    </div>
  );
}
