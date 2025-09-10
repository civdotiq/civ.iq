/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { Calendar } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';

interface ServiceTermsCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

export function ServiceTermsCard({ representative, className = '' }: ServiceTermsCardProps) {
  // Sort terms by congress number (most recent first)
  const sortedTerms = representative.terms
    ? [...representative.terms].sort((a, b) => parseInt(b.congress) - parseInt(a.congress))
    : [];

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-green-50 rounded-lg">
            <Calendar className="w-5 h-5" style={{ color: '#0e8d37' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: '#0e8d37' }}>
            Service Terms
          </h3>
        </div>
      </div>
      <div className="p-6">
        {sortedTerms.length > 0 ? (
          <div className="space-y-3">
            {sortedTerms.map((term, index) => (
              <div
                key={index}
                className="group flex items-center justify-between py-3 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <div>
                  <div className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                    Congress {term.congress}
                  </div>
                  <div className="text-sm text-gray-500 font-medium">
                    {term.startYear} - {term.endYear}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100"
                    style={{ color: '#0e8d37' }}
                  >
                    {representative.chamber}
                  </span>
                </div>
              </div>
            ))}

            {/* Timeline visualization */}
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Service Timeline
              </div>
              <div className="relative pl-2">
                <div
                  className="absolute left-2 top-0 bottom-0 w-0.5 bg-gradient-to-b"
                  style={{ background: 'linear-gradient(to bottom, #0e8d37, #4ade80)' }}
                ></div>
                {sortedTerms.slice(0, 3).map((term, index) => (
                  <div key={index} className="relative flex items-center mb-3 last:mb-0 group">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md group-hover:scale-125 transition-transform"
                      style={{ backgroundColor: '#0e8d37' }}
                    ></div>
                    <div className="ml-4 text-sm">
                      <span className="font-bold text-gray-900">{term.startYear}</span>
                      <span className="text-gray-500 ml-2">Congress {term.congress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 italic">No term information available</p>
          </div>
        )}
      </div>
    </div>
  );
}
