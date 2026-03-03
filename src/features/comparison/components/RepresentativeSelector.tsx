'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo } from 'react';

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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function getPartyAbbrev(party: string): string {
  if (party === 'Democrat' || party === 'Democratic') return 'D';
  if (party === 'Republican') return 'R';
  if (party === 'Independent') return 'I';
  return party.charAt(0);
}

function getPartyColor(party: string): string {
  if (party === 'Democrat' || party === 'Democratic') return 'bg-[#0a9338] text-white';
  if (party === 'Republican') return 'bg-[#e11d07] text-white';
  if (party === 'Independent') return 'bg-gray-600 text-white';
  return 'bg-gray-400 text-white';
}

export default function RepresentativeSelector({
  representatives,
  selectedIds,
  onSelectionChange,
  maxSelections = 4,
  collapsed = false,
  onToggleCollapse,
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

  return (
    <div>
      {/* Collapse toggle */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="mb-3 px-3 py-1.5 text-sm font-medium border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {collapsed ? 'Change Selection' : 'Hide Selection'}
        </button>
      )}

      {collapsed ? null : (
        <>
          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name..."
              className="px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#222226] text-gray-900 dark:text-gray-100 focus:border-[#3ea2d4] focus:outline-none"
            />
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#222226] text-gray-900 dark:text-gray-100"
            >
              <option value="">All States</option>
              {states.map(state => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <select
              value={partyFilter}
              onChange={e => setPartyFilter(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#222226] text-gray-900 dark:text-gray-100"
            >
              <option value="">All Parties</option>
              {parties.map(party => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
            <select
              value={chamberFilter}
              onChange={e => setChamberFilter(e.target.value)}
              className="px-3 py-2 text-sm border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-[#222226] text-gray-900 dark:text-gray-100"
            >
              <option value="">Both Chambers</option>
              <option value="House">House</option>
              <option value="Senate">Senate</option>
            </select>
          </div>

          {selectedIds.length >= maxSelections && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Maximum of {maxSelections} selected. Remove one to add another.
            </p>
          )}

          {/* Representative List */}
          <div className="border-2 border-black dark:border-[#333333] max-h-[480px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-[#1a1a1e] border-b-2 border-black dark:border-[#333333]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 w-8"></th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                    Name
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                    Party
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                    State
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100 hidden sm:table-cell">
                    Chamber
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReps.map(rep => {
                  const isSelected = selectedIds.includes(rep.bioguideId);
                  const canSelect = isSelected || selectedIds.length < maxSelections;

                  return (
                    <tr
                      key={rep.bioguideId}
                      onClick={() => canSelect && handleToggleSelection(rep.bioguideId)}
                      className={`
                    border-b border-gray-200 dark:border-gray-700 cursor-pointer
                    ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : canSelect
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                          : 'opacity-40 cursor-not-allowed'
                    }
                  `}
                    >
                      <td className="px-3 py-2.5">
                        <div
                          className={`w-4 h-4 border-2 flex items-center justify-center ${
                            isSelected
                              ? 'border-[#3ea2d4] bg-[#3ea2d4]'
                              : 'border-gray-400 dark:border-gray-500'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                        {rep.name}
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-xs font-bold ${getPartyColor(rep.party)}`}
                        >
                          {getPartyAbbrev(rep.party)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300">
                        {rep.state}
                        {rep.district ? `-${rep.district}` : ''}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                        {rep.chamber}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredReps.length === 0 && (
              <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                No representatives match your filters.
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {filteredReps.length} of {representatives.length} members shown
          </p>
        </>
      )}
    </div>
  );
}
