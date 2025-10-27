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
import { OverviewSidebar } from './OverviewSidebar';

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

      {/* Two-column grid layout: 2/3 main content, 1/3 sidebar */}
      <div
        className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]"
        style={{ gap: 'calc(var(--grid) * 4)' }}
      >
        {/* LEFT COLUMN (2/3) - Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--grid) * 4)' }}>
          {/* Biography Section */}
          <div>
            <BiographyCard representative={representative} />
          </div>

          {/* Committee Memberships */}
          <div>
            <CommitteeMembershipsCard representative={representative} />
          </div>

          {/* Federal Service History */}
          <div>
            <ServiceTermsCard representative={representative} />
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) - Sidebar */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <OverviewSidebar representative={representative} />
        </div>
      </div>
    </div>
  );
}
