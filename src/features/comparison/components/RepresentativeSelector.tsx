'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo } from 'react';
import Image from 'next/image';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
}

interface RepresentativeSelectorProps {
  representatives: Representative[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  maxSelections?: number;
}

export default function RepresentativeSelector({
  representatives,
  selectedIds,
  onSelectionChange,
  maxSelections = 4,
}: RepresentativeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [chamberFilter, setChamberFilter] = useState('');

  const filteredReps = useMemo(() => {
    return representatives.filter(rep => {
      const matchesSearch = rep.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = !stateFilter || rep.state === stateFilter;
      const matchesParty = !partyFilter || rep.party === partyFilter;
      const matchesChamber = !chamberFilter || rep.chamber === chamberFilter;

      return matchesSearch && matchesState && matchesParty && matchesChamber;
    });
  }, [representatives, searchTerm, stateFilter, partyFilter, chamberFilter]);

  const states = useMemo(
    () => [...new Set(representatives.map(r => r.state))].sort(),
    [representatives]
  );

  const parties = useMemo(
    () => [...new Set(representatives.map(r => r.party))].sort(),
    [representatives]
  );

  const handleToggleSelection = (bioguideId: string) => {
    if (selectedIds.includes(bioguideId)) {
      onSelectionChange(selectedIds.filter(id => id !== bioguideId));
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, bioguideId]);
    }
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Republican':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Democrat':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Independent':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Select Representatives to Compare</h2>
        <p className="text-gray-600 mb-4">
          Choose up to {maxSelections} representatives to compare their voting records, committee
          memberships, and legislative achievements.
        </p>

        {selectedIds.length >= maxSelections && (
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <p className="text-amber-800 text-sm">
              Maximum of {maxSelections} representatives selected. Remove one to select another.
            </p>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Representative name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
          <select
            value={stateFilter}
            onChange={e => setStateFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All States</option>
            {states.map(state => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
          <select
            value={partyFilter}
            onChange={e => setPartyFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Parties</option>
            {parties.map(party => (
              <option key={party} value={party}>
                {party}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Chamber</label>
          <select
            value={chamberFilter}
            onChange={e => setChamberFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Both Chambers</option>
            <option value="House">House</option>
            <option value="Senate">Senate</option>
          </select>
        </div>
      </div>

      {/* Representative Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
        {filteredReps.map(rep => {
          const isSelected = selectedIds.includes(rep.bioguideId);
          const canSelect = isSelected || selectedIds.length < maxSelections;

          return (
            <div
              key={rep.bioguideId}
              className={`
                relative border-2 rounded-lg p-4 transition-all cursor-pointer
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : canSelect
                      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                }
              `}
              onClick={() => canSelect && handleToggleSelection(rep.bioguideId)}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}

              <div className="flex items-center mb-3">
                {rep.imageUrl ? (
                  <Image
                    src={rep.imageUrl}
                    alt={rep.name}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {rep.name
                        .split(' ')
                        .map(n => n[0])
                        .join('')}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{rep.name}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {rep.title} ({rep.state}
                  {rep.district && `-${rep.district}`})
                </p>
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getPartyColor(
                    rep.party
                  )}`}
                >
                  {rep.party}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredReps.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No representatives match your current filters.</p>
        </div>
      )}
    </div>
  );
}
