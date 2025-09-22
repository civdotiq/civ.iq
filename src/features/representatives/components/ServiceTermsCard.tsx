/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { Calendar, ChevronDown, ChevronUp, ExternalLink, ArrowRight } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface ServiceTermsCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function ServiceTermsCard({ representative, className = '' }: ServiceTermsCardProps) {
  const [showAllTerms, setShowAllTerms] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<'all' | 'House' | 'Senate'>('all');

  // Sort terms by congress number (most recent first)
  const sortedTerms = representative.terms
    ? [...representative.terms].sort((a, b) => parseInt(b.congress) - parseInt(a.congress))
    : [];

  // Helper function to get Wikipedia URL for a Congress
  const getCongressWikipediaUrl = (congressNumber: string) => {
    const num = parseInt(congressNumber);
    if (isNaN(num)) return null;

    // Add ordinal suffix
    const getOrdinal = (n: number) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || 'th');
    };

    return `https://en.wikipedia.org/wiki/${getOrdinal(num)}_United_States_Congress`;
  };

  // Calculate total years of service
  const calculateTotalYears = () => {
    if (!sortedTerms.length) return 0;

    const uniqueYears = new Set<number>();

    sortedTerms.forEach(term => {
      const startYear = parseInt(term.startYear);
      const endYear = parseInt(term.endYear);
      if (!isNaN(startYear) && !isNaN(endYear)) {
        for (let year = startYear; year <= endYear; year++) {
          uniqueYears.add(year);
        }
      }
    });

    return uniqueYears.size;
  };

  // Group consecutive terms by chamber
  const groupTermsByPeriod = () => {
    const groups: Array<{
      chamber: string;
      startYear: string;
      endYear: string;
      terms: typeof sortedTerms;
    }> = [];

    sortedTerms.forEach(term => {
      const lastGroup = groups[groups.length - 1];

      if (!lastGroup || lastGroup.chamber !== term.chamber) {
        // Start a new group
        groups.push({
          chamber: term.chamber || 'Unknown',
          startYear: term.startYear,
          endYear: term.endYear,
          terms: [term],
        });
      } else {
        // Add to existing group and update end year
        lastGroup.terms.push(term);
        lastGroup.endYear = term.endYear;
      }
    });

    return groups.reverse(); // Chronological order
  };

  const totalYears = calculateTotalYears();
  const termGroups = groupTermsByPeriod();

  // Filter terms based on selected chamber
  const filteredTerms =
    selectedChamber === 'all'
      ? sortedTerms
      : sortedTerms.filter(term => term.chamber === selectedChamber);

  const displayTerms = showAllTerms ? filteredTerms : filteredTerms.slice(0, 5);

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-2 border-black hover:border-2 border-black transition-border-2 border-black duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-green-50">
              <Calendar className="w-5 h-5" style={{ color: '#0e8d37' }} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: '#0e8d37' }}>
              Federal Service History
            </h3>
          </div>
          {totalYears > 0 && (
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{totalYears}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">Total Years</div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {sortedTerms.length > 0 ? (
          <div className="space-y-6">
            {/* Career Timeline - Simple and Clear */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Career Timeline
                </h4>
                {termGroups.length > 1 && (
                  <span className="text-xs text-gray-500">{termGroups.length} positions held</span>
                )}
              </div>

              <div className="space-y-3">
                {termGroups.map((group, index) => (
                  <div key={index} className="relative">
                    {index > 0 && (
                      <div className="absolute -top-2 left-6 text-gray-400">
                        <ArrowRight className="w-3 h-3 rotate-90" />
                      </div>
                    )}
                    <div
                      className={`flex items-start gap-3 p-3 transition-all cursor-pointer border-2 ${
                        selectedChamber === (group.chamber === 'Senate' ? 'Senate' : 'House')
                          ? 'bg-green-50 border-green-300 border-2 border-black'
                          : 'bg-white border-transparent hover:bg-white border-2 border-gray-300'
                      }`}
                      onClick={() =>
                        setSelectedChamber(group.chamber === 'Senate' ? 'Senate' : 'House')
                      }
                      title={`Click to filter ${group.chamber} terms`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          group.chamber === 'Senate' ? 'bg-blue-600' : 'bg-purple-600'
                        }`}
                      >
                        {group.chamber === 'Senate' ? 'S' : 'H'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {group.chamber === 'Senate'
                            ? 'U.S. Senate'
                            : 'U.S. House of Representatives'}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {group.startYear} -{' '}
                          {group.endYear === new Date().getFullYear().toString()
                            ? 'Present'
                            : group.endYear}
                          <span className="text-gray-400 mx-2">•</span>
                          {group.terms.length} {group.terms.length === 1 ? 'term' : 'terms'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Terms List */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  Congressional Terms
                  {selectedChamber !== 'all' && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      ({selectedChamber} only)
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2">
                  {selectedChamber !== 'all' && (
                    <button
                      onClick={() => setSelectedChamber('all')}
                      className="text-xs text-green-600 hover:text-green-700 hover:underline"
                    >
                      Show all
                    </button>
                  )}
                  <span className="text-xs text-gray-500">
                    {filteredTerms.length} {selectedChamber !== 'all' ? selectedChamber : 'total'}{' '}
                    terms
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {displayTerms.map((term, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 hover:bg-white transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <a
                        href={getCongressWikipediaUrl(term.congress) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-green-600 inline-flex items-center gap-1.5 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        {term.congress}th Congress
                        <ExternalLink className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                      </a>
                      <span className="text-sm text-gray-500">
                        {term.startYear}-{term.endYear}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          term.chamber === 'Senate'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {term.chamber}
                      </span>
                      {term.state && (
                        <span className="text-xs text-gray-500">
                          {term.state}
                          {term.district && term.district !== '0' && `-${term.district}`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredTerms.length > 5 && (
                <button
                  onClick={() => setShowAllTerms(!showAllTerms)}
                  className="mt-3 w-full py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors flex items-center justify-center gap-1"
                >
                  {showAllTerms ? (
                    <>
                      <ChevronUp className="w-4 h-4" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      Show all {filteredTerms.length} terms
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 italic">No service history available</p>
          </div>
        )}
      </div>
    </div>
  );
}
