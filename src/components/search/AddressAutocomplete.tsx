'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type {
  RadarAddress,
  RadarAutocompleteResponse,
  AddressAutocompleteProps,
} from '@/types/radar';

/**
 * Address Autocomplete Component using Radar.io API
 *
 * Rate limits: Radar free tier allows 100k requests/month.
 * Debounced to 300ms to provide responsive UX while staying well within limits.
 *
 * Requires NEXT_PUBLIC_RADAR_API_KEY in .env.local
 * Get your free API key at: https://radar.io/signup
 */
export default function AddressAutocomplete({
  onSelect,
  onChange,
  placeholder = 'Enter address or ZIP code',
  className,
  defaultValue = '',
  disabled = false,
  ariaLabel = 'Search by address',
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<RadarAddress[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions from Radar.io
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    const apiKey = process.env.NEXT_PUBLIC_RADAR_API_KEY;

    if (!apiKey) {
      setError('Address search unavailable');
      setIsLoading(false);
      return;
    }

    if (searchQuery.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery,
        country: 'US',
        layers: 'address,postalCode,locality',
        limit: '6',
      });

      const response = await fetch(
        `https://api.radar.io/v1/search/autocomplete?${params.toString()}`,
        {
          headers: {
            Authorization: apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data: RadarAutocompleteResponse = await response.json();

      if (data.addresses && data.addresses.length > 0) {
        setSuggestions(data.addresses);
        setIsOpen(true);
        setHighlightedIndex(-1);
      } else {
        setSuggestions([]);
        setIsOpen(true); // Keep open to show "no results"
      }
    } catch {
      setError('Unable to search addresses');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced input handler (300ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Notify parent of input changes for controlled usage
    onChange?.(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  // Handle suggestion selection
  const handleSelect = (address: RadarAddress) => {
    const formattedAddress = address.formattedAddress;
    setQuery(formattedAddress);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);

    onSelect(formattedAddress, {
      lat: address.latitude,
      lng: address.longitude,
    });
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      // Allow form submission on Enter when dropdown is closed
      if (e.key === 'Enter' && query.trim()) {
        // Let the parent form handle the submission
        return;
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Format display address (shorter for dropdown)
  const formatDisplayAddress = (address: RadarAddress): string => {
    const parts: string[] = [];

    if (address.number && address.street) {
      parts.push(`${address.number} ${address.street}`);
    } else if (address.street) {
      parts.push(address.street);
    }

    if (address.city) {
      parts.push(address.city);
    }

    if (address.stateCode) {
      parts.push(address.stateCode);
    }

    if (address.postalCode) {
      parts.push(address.postalCode);
    }

    return parts.join(', ') || address.formattedAddress;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls="address-suggestions"
        aria-autocomplete="list"
        role="combobox"
        className="block w-full px-4 py-3 text-sm sm:text-lg border-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-civiq-blue disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute right-16 sm:right-24 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-civiq-blue border-t-transparent rounded-full" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <ul
          id="address-suggestions"
          role="listbox"
          className="absolute z-50 w-full bg-white border-2 border-black border-t-0 shadow-lg max-h-80 overflow-y-auto"
        >
          {suggestions.length > 0 ? (
            suggestions.map((address, index) => (
              <li
                key={`${address.formattedAddress}-${index}`}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => handleSelect(address)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'px-4 py-3 cursor-pointer transition-colors min-h-[44px] flex items-center',
                  highlightedIndex === index ? 'bg-gray-100' : 'hover:bg-gray-50'
                )}
              >
                <svg
                  className="w-4 h-4 mr-3 text-gray-400 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
                <span className="text-sm sm:text-base truncate">
                  {formatDisplayAddress(address)}
                </span>
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-gray-500 text-sm">{error || 'No addresses found'}</li>
          )}
        </ul>
      )}
    </div>
  );
}
