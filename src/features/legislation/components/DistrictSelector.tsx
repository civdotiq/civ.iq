'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Selector Widget
 *
 * Compact inline component for selecting a congressional district on bill pages.
 * Reads from localStorage and URL params, allows manual entry.
 */

import React, { useState } from 'react';
import { MapPin, X } from 'lucide-react';

const STORAGE_KEY = 'civiq-district';

interface DistrictSelectorProps {
  currentDistrict: string | null;
  onDistrictChange: (districtId: string | null) => void;
  className?: string;
}

export function DistrictSelector({
  currentDistrict,
  onDistrictChange,
  className = '',
}: DistrictSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [stateInput, setStateInput] = useState('');
  const [districtInput, setDistrictInput] = useState('');
  const [inputError, setInputError] = useState('');

  const formatDistrictLabel = (districtId: string) => {
    const parts = districtId.split('-');
    if (parts.length === 2) {
      const districtNum = parseInt(parts[1] || '0');
      if (districtNum === 0) return `${parts[0]} (At-Large)`;
      return `${parts[0]} District ${parts[1]}`;
    }
    return districtId;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInputError('');

    const state = stateInput.toUpperCase().trim();
    const district = districtInput.trim();

    if (!/^[A-Z]{2}$/.test(state)) {
      setInputError('Enter a valid 2-letter state code (e.g., CA, NY)');
      return;
    }

    if (!/^\d{1,2}$/.test(district)) {
      setInputError('Enter a district number (0 for at-large)');
      return;
    }

    const districtId = `${state}-${district}`;

    try {
      localStorage.setItem(STORAGE_KEY, districtId);
    } catch {
      // localStorage may be unavailable
    }

    onDistrictChange(districtId);
    setIsEditing(false);
    setStateInput('');
    setDistrictInput('');
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
    onDistrictChange(null);
  };

  if (currentDistrict && !isEditing) {
    return (
      <div
        className={`flex items-center gap-3 p-3 bg-civiq-blue/10 border border-civiq-blue ${className}`}
      >
        <MapPin className="h-4 w-4 text-civiq-blue flex-shrink-0" />
        <span className="text-sm text-gray-700">
          Showing impact for{' '}
          <span className="font-medium text-gray-900">{formatDistrictLabel(currentDistrict)}</span>
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-civiq-blue hover:text-civiq-blue font-medium"
        >
          Change
        </button>
        <button
          onClick={handleClear}
          className="p-1 text-gray-400 hover:text-gray-600"
          aria-label="Clear district"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  if (isEditing || !currentDistrict) {
    return (
      <div className={`p-3 bg-gray-50 border border-gray-200 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-700">
            Enter your district to see how this bill affects your community
          </span>
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={stateInput}
            onChange={e => setStateInput(e.target.value)}
            placeholder="State (CA)"
            maxLength={2}
            className="w-20 px-2 py-1 text-sm border-2 border-gray-300 focus:border-civiq-blue focus:outline-none"
          />
          <span className="text-gray-400">-</span>
          <input
            type="text"
            value={districtInput}
            onChange={e => setDistrictInput(e.target.value)}
            placeholder="District (12)"
            maxLength={2}
            className="w-24 px-2 py-1 text-sm border-2 border-gray-300 focus:border-civiq-blue focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1 bg-civiq-blue text-white text-sm font-medium hover:bg-civiq-blue transition-colors"
          >
            Go
          </button>
          {isEditing && currentDistrict && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          )}
        </form>
        {inputError && <p className="text-xs text-amber-600 mt-1">{inputError}</p>}
      </div>
    );
  }

  return null;
}
