/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { MapPin, X } from 'lucide-react';

interface StateSelectorProps {
  selectedStates: string[];
  onChange: (states: string[]) => void;
  multiSelect?: boolean;
}

interface State {
  code: string;
  name: string;
}

const US_STATES: State[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

export const StateSelector: React.FC<StateSelectorProps> = ({
  selectedStates,
  onChange,
  multiSelect = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleState = (stateCode: string) => {
    if (multiSelect) {
      if (selectedStates.includes(stateCode)) {
        onChange(selectedStates.filter(s => s !== stateCode));
      } else {
        onChange([...selectedStates, stateCode]);
      }
    } else {
      onChange([stateCode]);
      setIsOpen(false);
    }
  };

  const handleRemoveState = (stateCode: string) => {
    onChange(selectedStates.filter(s => s !== stateCode));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const filteredStates = US_STATES.filter(
    state =>
      state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      state.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSelectedStateNames = () => {
    return selectedStates
      .map(code => US_STATES.find(s => s.code === code)?.name)
      .filter(Boolean)
      .join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected States Display */}
      <div className="mb-2">
        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-civiq-blue" />
          {multiSelect ? 'Select States' : 'Select State'}
        </label>

        {/* Selection Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border-2 border-black px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center justify-between"
        >
          <span className="text-gray-900">
            {selectedStates.length === 0 ? (
              <span className="text-gray-500">
                {multiSelect ? 'Select states...' : 'Select a state...'}
              </span>
            ) : (
              <span className="font-medium">{getSelectedStateNames()}</span>
            )}
          </span>
          <svg
            className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Selected State Badges */}
        {multiSelect && selectedStates.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedStates.map(stateCode => {
              const state = US_STATES.find(s => s.code === stateCode);
              return (
                <span
                  key={stateCode}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-800 border-2 border-blue-600 text-sm font-medium"
                >
                  {state?.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveState(stateCode)}
                    className="hover:bg-blue-100 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedStates.length > 1 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm text-red-600 hover:text-red-800 font-medium underline"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-white border-2 border-black shadow-lg mt-1 max-h-96 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b-2 border-gray-300">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search states..."
              className="w-full px-3 py-2 border-2 border-gray-300 focus:border-civiq-blue focus:outline-none"
            />
          </div>

          {/* States List */}
          <div className="overflow-y-auto max-h-80">
            {filteredStates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No states found</div>
            ) : (
              filteredStates.map(state => {
                const isSelected = selectedStates.includes(state.code);
                return (
                  <button
                    key={state.code}
                    type="button"
                    onClick={() => handleToggleState(state.code)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-200 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {multiSelect && (
                        <div
                          className={`w-5 h-5 border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-civiq-blue border-civiq-blue'
                              : 'border-gray-400 bg-white'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{state.name}</div>
                        <div className="text-sm text-gray-500">{state.code}</div>
                      </div>
                    </div>
                    {isSelected && !multiSelect && (
                      <svg
                        className="w-5 h-5 text-civiq-blue"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
