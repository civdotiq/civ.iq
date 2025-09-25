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
    <div style={{ gap: 'calc(var(--grid) * 4)' }} className="flex flex-col">
      {/* Section Header */}
      <div>
        <h2
          className="aicher-heading type-2xl text-gray-900"
          style={{ marginBottom: 'calc(var(--grid) * 3)' }}
        >
          Detailed Information
        </h2>
      </div>

      {/* Biography Section - Full Width */}
      <div style={{ marginBottom: 'calc(var(--grid) * 4)' }}>
        <BiographyCard representative={representative} />
      </div>

      {/* Two-column grid layout with proper spacing */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'calc(var(--grid) * 4)' }}>
        {/* Left Column - Committee Details */}
        <div>
          <CommitteeMembershipsCard representative={representative} />
        </div>

        {/* Right Column - Service History */}
        <div>
          <ServiceTermsCard representative={representative} />
        </div>
      </div>
    </div>
  );
}
