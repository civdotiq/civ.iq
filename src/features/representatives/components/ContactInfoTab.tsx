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
        <h2 className="text-xl font-semibold mb-6">Detailed Information</h2>

        {/* Two-column grid layout - removed duplicated content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Personal & Committee Details */}
          <div className="space-y-6">
            <PersonalInfoCard representative={representative} />
            <CommitteeMembershipsCard representative={representative} />
          </div>

          {/* Right Column - Service History */}
          <div className="space-y-6">
            <ServiceTermsCard representative={representative} />

            {/* Additional District Demographics (not shown in sidebar) */}
            {representative.chamber === 'House' && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">District Demographics</h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-sm text-gray-600">
                    <p>Additional district information and demographics will be displayed here.</p>
                    <p className="mt-2">
                      This section provides unique content not shown in the sidebar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
