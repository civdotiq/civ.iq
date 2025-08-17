/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { PersonalInfoCard } from './PersonalInfoCard';
import { ServiceTermsCard } from './ServiceTermsCard';
import { CommitteeMembershipsCard } from './CommitteeMembershipsCard';
import { DistrictInfoCard } from './DistrictInfoCard';

interface ContactInfoTabProps {
  representative: EnhancedRepresentative;
}

export function ContactInfoTab({ representative }: ContactInfoTabProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Contact Information</h2>

        {/* Three-column grid layout matching screenshot */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <PersonalInfoCard representative={representative} />
            <CommitteeMembershipsCard representative={representative} />
          </div>

          {/* Center Column */}
          <div className="space-y-6">
            <ServiceTermsCard representative={representative} />

            {/* Office Contact (matching screenshot layout) */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Office Contact</h3>
              </div>
              <div className="p-4 space-y-3">
                {representative.currentTerm?.office && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">
                      Washington DC Address
                    </label>
                    <div className="text-gray-900 text-sm">{representative.currentTerm.office}</div>
                  </div>
                )}

                {representative.currentTerm?.phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone Number</label>
                    <div className="text-gray-900">
                      <a
                        href={`tel:${representative.currentTerm.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {representative.currentTerm.phone}
                      </a>
                    </div>
                  </div>
                )}

                {representative.currentTerm?.website && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Website Link</label>
                    <div>
                      <a
                        href={representative.currentTerm.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Official Website
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <DistrictInfoCard representative={representative} />
          </div>
        </div>
      </div>
    </div>
  );
}
