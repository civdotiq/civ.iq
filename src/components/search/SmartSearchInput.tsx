/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { classifyInput, formatInput } from '@/lib/search/input-classifier';
import { getRecentSearches, saveRecentSearch, clearRecentSearches } from '@/lib/search/unified-search';
import { structuredLogger } from '@/lib/logging/logger';
import { ComponentErrorBoundary } from '@/components/error-boundaries';

interface SmartSearchInputProps {
  initialValue?: string;
  onSearch?: (value: string) => void;
  placeholder?: string;
  className?: string;
  showRecentSearches?: boolean;
  showExamples?: boolean;
}

export function SmartSearchInput({
  initialValue = '',
  onSearch,
  placeholder = 'Enter ZIP code or full address',
  className = '',
  showRecentSearches = true,
  showExamples = true
}: SmartSearchInputProps) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [inputType, setInputType] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Load recent searches
  useEffect(() => {
    if (showRecentSearches) {
      setRecentSearches(getRecentSearches());
    }
  }, [showRecentSearches]);
  
  // Handle clicks outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current && 
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Debounced input classification
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.trim()) {
        const classification = classifyInput(value);
        setInputType(classification.type);
        setIsValid(classification.confidence > 0.5);
      } else {
        setInputType('');
        setIsValid(null);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [value]);
  
  const handleSubmit = useCallback(async (searchValue: string) => {
    const trimmedValue = searchValue.trim();
    if (!trimmedValue) return;
    
    setIsLoading(true);
    setShowDropdown(false);
    
    // Save to recent searches
    if (showRecentSearches) {
      saveRecentSearch(trimmedValue);
      setRecentSearches(getRecentSearches());
    }
    
    // Log search
    structuredLogger.info('Search submitted', {
      value: trimmedValue,
      inputType,
      component: 'SmartSearchInput'
    });
    
    try {
      if (onSearch) {
        await onSearch(trimmedValue);
      } else {
        // Default behavior: navigate to results
        router.push(`/results?q=${encodeURIComponent(trimmedValue)}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [inputType, onSearch, router, showRecentSearches]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(value);
    }
  };
  
  const handleRecentSearchClick = (search: string) => {
    setValue(search);
    handleSubmit(search);
  };
  
  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };
  
  const examples = [
    { text: '48201', type: 'ZIP code' },
    { text: '123 Main St, Detroit, MI', type: 'Street address' },
    { text: '1600 Pennsylvania Ave, Washington DC', type: 'Famous address' }
  ];
  
  return (
    <ComponentErrorBoundary componentName="SmartSearchInput">
      <div className={`relative ${className}`}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 pr-24 text-lg border rounded-lg
              transition-all duration-200
              ${isValid === true ? 'border-green-500 bg-green-50' : ''}
              ${isValid === false ? 'border-orange-500 bg-orange-50' : ''}
              ${isValid === null ? 'border-gray-300' : ''}
              focus:outline-none focus:ring-2 focus:ring-civiq-blue/50
            `}
            disabled={isLoading}
            aria-label="Search by ZIP code or address"
            aria-describedby="search-hint"
          />
          
          {/* Input type indicator */}
          {inputType && (
            <span className="absolute right-16 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {inputType === 'zip' && '📍 ZIP'}
              {inputType === 'zip_plus_4' && '📍 ZIP+4'}
              {inputType === 'address' && '🏠 Address'}
              {inputType === 'ambiguous' && '❓ Unclear'}
            </span>
          )}
          
          {/* Submit button */}
          <button
            onClick={() => handleSubmit(value)}
            disabled={!value.trim() || isLoading}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2
              px-3 py-1.5 rounded-md text-white font-medium
              transition-all duration-200
              ${value.trim() && !isLoading
                ? 'bg-civiq-blue hover:bg-civiq-blue/90 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
            aria-label="Search"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </button>
        </div>
        
        {/* Format hint */}
        <p id="search-hint" className="mt-1 text-sm text-gray-600">
          {inputType === 'zip' && '✓ Valid ZIP code format'}
          {inputType === 'zip_plus_4' && '✓ Valid ZIP+4 format'}
          {inputType === 'address' && '✓ Looks like a valid address'}
          {inputType === 'ambiguous' && '💡 Try adding more details (city, state)'}
          {!inputType && showExamples && 'Examples: 48201 or 123 Main St, Detroit, MI'}
        </p>
        
        {/* Dropdown for recent searches and examples */}
        {showDropdown && (showRecentSearches || showExamples) && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg"
          >
            {/* Recent searches */}
            {showRecentSearches && recentSearches.length > 0 && (
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
                  <button
                    onClick={handleClearRecent}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                </div>
                <ul className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleRecentSearchClick(search)}
                        className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
                      >
                        🕐 {search}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Examples */}
            {showExamples && (
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Try these examples:</h3>
                <ul className="space-y-1">
                  {examples.map((example, index) => (
                    <li key={index}>
                      <button
                        onClick={() => {
                          setValue(example.text);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 transition-colors"
                      >
                        <span className="font-medium">{example.text}</span>
                        <span className="text-gray-500 ml-2">({example.type})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  );
}