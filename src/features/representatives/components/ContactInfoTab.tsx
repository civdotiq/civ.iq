/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { ServiceTermsCard } from './ServiceTermsCard';
import { CommitteeMembershipsCard } from './CommitteeMembershipsCard';
import { BiographyCard } from './BiographyCard';

interface ContactInfoTabProps {
  representative: EnhancedRepresentative;
}

export function ContactInfoTab({ representative }: ContactInfoTabProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">Detailed Information</h2>

        {/* Biography Section - Full Width */}
        <BiographyCard representative={representative} className="mb-6" />

        {/* Two-column grid layout - removed duplicated content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Committee Details */}
          <div className="space-y-6">
            <CommitteeMembershipsCard representative={representative} />
          </div>

          {/* Right Column - Service History */}
          <div className="space-y-6">
            <ServiceTermsCard representative={representative} />
          </div>
        </div>
      </div>
    </div>
  );
}
