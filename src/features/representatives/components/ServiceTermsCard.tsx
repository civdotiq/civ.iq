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
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Service Terms</h3>
        </div>
      </div>
      <div className="p-4">
        {sortedTerms.length > 0 ? (
          <div className="space-y-3">
            {sortedTerms.map((term, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
              >
                <div>
                  <div className="font-medium text-gray-900">Congress {term.congress}</div>
                  <div className="text-sm text-gray-600">
                    {term.startYear} - {term.endYear}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-blue-600 font-medium">{representative.chamber}</div>
                </div>
              </div>
            ))}

            {/* Timeline visualization */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600 mb-2">Service Timeline</div>
              <div className="relative">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-blue-200"></div>
                {sortedTerms.slice(0, 3).map((term, index) => (
                  <div key={index} className="relative flex items-center mb-2 last:mb-0">
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                    <div className="ml-3 text-sm">
                      <span className="font-medium">{term.startYear}</span>
                      <span className="text-gray-500 ml-1">Congress {term.congress}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No term information available</p>
          </div>
        )}
      </div>
    </div>
  );
}
