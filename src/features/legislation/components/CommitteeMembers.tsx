/**
 * Enhanced Committee Members component with sorting, filtering, and legislation tracking
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  FunnelIcon,
  XMarkIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChevronRightIcon,
  ClockIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import type { Committee } from '@/types/committee';

// Sort options
type SortField = 'name' | 'party' | 'state' | 'role' | 'joined' | 'legislation';
type SortDirection = 'asc' | 'desc';

interface SortOption {
  field: SortField;
  direction: SortDirection;
}

// Filter options
interface FilterState {
  party: string[];
  state: string[];
  role: string[];
  chamber: string[];
}

// Bill interface for 119th Congress legislation
interface Bill {
  billId: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  introducedDate: string;
  latestAction: {
    text: string;
    actionDate: string;
  };
  policyArea?: string;
  committees?: string[];
  relationship?: 'sponsored' | 'cosponsored';
}

interface MemberBills {
  loading: boolean;
  error?: string;
  bills?: Bill[];
  sponsored?: number;
  cosponsored?: number;
}

interface CommitteeMembersProps {
  committee: Committee;
}

export default function CommitteeMembers({ committee }: CommitteeMembersProps) {
  const [sortBy, setSortBy] = useState<SortOption>({ field: 'name', direction: 'asc' });
  const [filters, setFilters] = useState<FilterState>({
    party: [],
    state: [],
    role: [],
    chamber: [],
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [memberBills, setMemberBills] = useState<Record<string, MemberBills>>({});

  // Get unique values for filter options
  const filterOptions = useMemo(() => {
    const parties = [...new Set(committee.members.map(m => m.representative.party))].sort();
    const states = [...new Set(committee.members.map(m => m.representative.state))].sort();
    const roles = [...new Set(committee.members.map(m => m.role))].sort();
    const chambers = [...new Set(committee.members.map(m => m.representative.chamber))].sort();

    return { parties, states, roles, chambers };
  }, [committee.members]);

  // Apply filters and sorting
  const filteredAndSortedMembers = useMemo(() => {
    const filtered = committee.members.filter(member => {
      const partyMatch =
        filters.party.length === 0 || filters.party.includes(member.representative.party);
      const stateMatch =
        filters.state.length === 0 || filters.state.includes(member.representative.state);
      const roleMatch = filters.role.length === 0 || filters.role.includes(member.role);
      const chamberMatch =
        filters.chamber.length === 0 || filters.chamber.includes(member.representative.chamber);

      return partyMatch && stateMatch && roleMatch && chamberMatch;
    });

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;

      switch (sortBy.field) {
        case 'name':
          aValue = a.representative.name;
          bValue = b.representative.name;
          break;
        case 'party':
          aValue = a.representative.party;
          bValue = b.representative.party;
          break;
        case 'state':
          aValue = `${a.representative.state}${a.representative.district || ''}`;
          bValue = `${b.representative.state}${b.representative.district || ''}`;
          break;
        case 'role':
          // Custom role ordering: Chair > Ranking Member > Members
          const roleOrder = { Chair: 0, 'Ranking Member': 1, Member: 2 };
          aValue = roleOrder[a.role as keyof typeof roleOrder] ?? 3;
          bValue = roleOrder[b.role as keyof typeof roleOrder] ?? 3;
          break;
        case 'joined':
          aValue = new Date(a.joinedDate).getTime();
          bValue = new Date(b.joinedDate).getTime();
          break;
        default:
          aValue = a.representative.name;
          bValue = b.representative.name;
      }

      if (aValue < bValue) return sortBy.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortBy.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [committee.members, filters, sortBy]);

  const handleSort = useCallback((field: SortField) => {
    setSortBy(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: prev[filterType].includes(value)
        ? prev[filterType].filter(v => v !== value)
        : [...prev[filterType], value],
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ party: [], state: [], role: [], chamber: [] });
  }, []);

  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);

  // Fetch bills for a member when expanded
  const fetchMemberBills = useCallback(async (bioguideId: string) => {
    setMemberBills(prev => ({
      ...prev,
      [bioguideId]: { loading: true },
    }));

    try {
      const response = await fetch(`/api/representative/${bioguideId}/bills?congress=119&limit=5`);
      if (!response.ok) throw new Error('Failed to fetch bills');

      const data = await response.json();
      setMemberBills(prev => ({
        ...prev,
        [bioguideId]: {
          loading: false,
          bills: data.sponsoredLegislation || [],
          sponsored: data.totalSponsored || 0,
          cosponsored: data.totalCosponsored || 0,
        },
      }));
    } catch {
      setMemberBills(prev => ({
        ...prev,
        [bioguideId]: {
          loading: false,
          error: 'Failed to load legislation',
        },
      }));
    }
  }, []);

  const toggleMemberExpanded = useCallback(
    (bioguideId: string) => {
      setExpandedMembers(prev => {
        const newSet = new Set(prev);
        if (newSet.has(bioguideId)) {
          newSet.delete(bioguideId);
        } else {
          newSet.add(bioguideId);
          // Fetch bills when expanding
          if (!memberBills[bioguideId]) {
            fetchMemberBills(bioguideId);
          }
        }
        return newSet;
      });
    },
    [memberBills, fetchMemberBills]
  );

  const getSortIcon = (field: SortField) => {
    if (sortBy.field !== field) {
      return <ChevronUpIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortBy.direction === 'asc' ? (
      <ChevronUpIcon className="w-4 h-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="w-4 h-4 text-blue-600" />
    );
  };

  const getDistrictUrl = (state: string, district?: number | string) => {
    if (district) {
      // House district
      return `/district/${state}-${String(district).padStart(2, '0')}`;
    } else {
      // Senate - link to state overview
      return `/state/${state.toLowerCase()}`;
    }
  };

  return (
    <div className="bg-white border-2 border-black p-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Committee Members ({filteredAndSortedMembers.length})
        </h2>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium ${
              hasActiveFilters
                ? 'bg-blue-50 text-blue-700 border-blue-300'
                : 'text-gray-700 bg-white'
            } hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                {Object.values(filters).reduce((sum, arr) => sum + arr.length, 0)}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center px-2 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Party Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Party</label>
              <div className="space-y-1">
                {filterOptions.parties.map(party => (
                  <label key={party} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.party.includes(party)}
                      onChange={() => handleFilterChange('party', party)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-600">{party}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {filterOptions.states.map(state => (
                  <label key={state} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.state.includes(state)}
                      onChange={() => handleFilterChange('state', state)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-600">{state}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="space-y-1">
                {filterOptions.roles.map(role => (
                  <label key={role} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.role.includes(role)}
                      onChange={() => handleFilterChange('role', role)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-600">{role}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chamber Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Chamber</label>
              <div className="space-y-1">
                {filterOptions.chambers.map(chamber => (
                  <label key={chamber} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.chamber.includes(chamber)}
                      onChange={() => handleFilterChange('chamber', chamber)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                    />
                    <span className="text-sm text-gray-600">{chamber}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-white">
            <tr>
              {/* Representative Column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="group flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Representative
                  {getSortIcon('name')}
                </button>
              </th>

              {/* Party Column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('party')}
                  className="group flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Party
                  {getSortIcon('party')}
                </button>
              </th>

              {/* State/District Column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('state')}
                  className="group flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  State/District
                  {getSortIcon('state')}
                </button>
              </th>

              {/* Role Column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('role')}
                  className="group flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Role
                  {getSortIcon('role')}
                </button>
              </th>

              {/* Joined Column */}
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('joined')}
                  className="group flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                >
                  Joined
                  {getSortIcon('joined')}
                </button>
              </th>

              {/* Legislation Column */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                119th Congress Bills
              </th>
            </tr>
          </thead>

          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedMembers.map(member => (
              <React.Fragment key={member.representative.bioguideId}>
                <tr className="hover:bg-white">
                  {/* Representative */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <RepresentativePhoto
                        bioguideId={member.representative.bioguideId}
                        name={member.representative.name}
                        size="sm"
                        className="mr-3"
                      />
                      <div>
                        <Link
                          href={`/representative/${member.representative.bioguideId}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {member.representative.name}
                        </Link>
                        <div className="text-xs text-gray-500">{member.representative.title}</div>
                      </div>
                    </div>
                  </td>

                  {/* Party */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        member.representative.party === 'Democrat' ||
                        member.representative.party === 'D'
                          ? 'bg-blue-100 text-blue-800'
                          : member.representative.party === 'Independent'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {member.representative.party}
                    </span>
                  </td>

                  {/* State/District - with links */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Link
                      href={getDistrictUrl(
                        member.representative.state,
                        member.representative.district
                      )}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {member.representative.state}
                      {member.representative.district && `-${member.representative.district}`}
                    </Link>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full ${
                        member.role === 'Chair'
                          ? 'bg-green-100 text-green-800'
                          : member.role === 'Ranking Member'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-white border-2 border-gray-300 text-gray-800'
                      }`}
                    >
                      {member.role}
                    </span>
                  </td>

                  {/* Joined */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {new Date(member.joinedDate).getFullYear()}
                    </div>
                  </td>

                  {/* Legislation */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleMemberExpanded(member.representative.bioguideId)}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 rounded hover:border-blue-300"
                    >
                      {expandedMembers.has(member.representative.bioguideId) ? (
                        <>
                          <ChevronDownIcon className="w-3 h-3 mr-1" />
                          Hide Bills
                        </>
                      ) : (
                        <>
                          <ChevronRightIcon className="w-3 h-3 mr-1" />
                          View Bills
                        </>
                      )}
                    </button>
                  </td>
                </tr>
                {/* Expanded Row for Bills */}
                {expandedMembers.has(member.representative.bioguideId) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 bg-white">
                      <div className="space-y-3">
                        {memberBills[member.representative.bioguideId]?.loading && (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-sm text-gray-600">
                              Loading 119th Congress bills...
                            </span>
                          </div>
                        )}

                        {memberBills[member.representative.bioguideId]?.error && (
                          <div className="text-sm text-red-600 text-center py-4">
                            {memberBills[member.representative.bioguideId]?.error}
                          </div>
                        )}

                        {memberBills[member.representative.bioguideId]?.bills && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-900">
                                119th Congress Legislation
                              </h4>
                              <div className="flex gap-4 text-xs text-gray-600">
                                <span>
                                  <strong>
                                    {memberBills[member.representative.bioguideId]?.sponsored || 0}
                                  </strong>{' '}
                                  Sponsored
                                </span>
                                <span>
                                  <strong>
                                    {memberBills[member.representative.bioguideId]?.cosponsored ||
                                      0}
                                  </strong>{' '}
                                  Cosponsored
                                </span>
                              </div>
                            </div>

                            {memberBills[member.representative.bioguideId]?.bills?.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-2">
                                No bills found for the 119th Congress
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {memberBills[member.representative.bioguideId]?.bills
                                  ?.slice(0, 5)
                                  .map(bill => (
                                    <div
                                      key={bill.billId}
                                      className="border border-gray-200 p-3 bg-white"
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <Link
                                            href={`/bill/${bill.billId}`}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                          >
                                            {bill.type} {bill.number}
                                          </Link>
                                          <p className="text-xs text-gray-700 mt-1">{bill.title}</p>
                                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center">
                                              <CalendarIcon className="w-3 h-3 mr-1" />
                                              {new Date(bill.introducedDate).toLocaleDateString()}
                                            </span>
                                            {bill.policyArea && (
                                              <span className="flex items-center">
                                                <TagIcon className="w-3 h-3 mr-1" />
                                                {bill.policyArea}
                                              </span>
                                            )}
                                            {bill.latestAction && (
                                              <span className="flex items-center">
                                                <ClockIcon className="w-3 h-3 mr-1" />
                                                {new Date(
                                                  bill.latestAction.actionDate
                                                ).toLocaleDateString()}
                                              </span>
                                            )}
                                          </div>
                                          {bill.latestAction && (
                                            <p className="text-xs text-gray-600 mt-1">
                                              <strong>Latest:</strong> {bill.latestAction.text}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}

                            <div className="mt-3 text-center">
                              <Link
                                href={`/representative/${member.representative.bioguideId}/bills`}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                View all bills →
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {filteredAndSortedMembers.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No members found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters to see committee members.
          </p>
        </div>
      )}
    </div>
  );
}
