/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
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
    <div className="flex flex-col gap-grid-5">
      {/* Two-column grid layout: 2/3 main content, 1/3 sidebar */}
      {/* On mobile, sidebar (contact info) comes first via order classes */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'calc(var(--grid) * 4)' }}>
        {/* SIDEBAR - Appears first on mobile, right column on desktop */}
        <div className="order-first md:order-last md:col-span-1 md:sticky md:top-4 md:self-start">
          <OverviewSidebar representative={representative} />
        </div>

        {/* MAIN CONTENT - Appears second on mobile, left column on desktop */}
        <div className="order-last md:order-first md:col-span-2 flex flex-col gap-grid-5">
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
      </div>

      {/* Full-width Need Help Section */}
      <div
        className="bg-civiq-blue/10 aicher-border border-civiq-blue"
        style={{ padding: 'calc(var(--grid) * 3)', marginTop: 'calc(var(--grid) * 2)' }}
      >
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-civiq-blue flex-shrink-0 mt-1" />
          <div>
            <h3
              className="aicher-heading type-lg text-gray-900"
              style={{ marginBottom: 'calc(var(--grid) * 2)' }}
            >
              Need Help?
            </h3>
            <p className="type-sm text-gray-700 leading-relaxed mb-3">
              Having trouble reaching your representative? Contact information is updated regularly
              from official sources.
            </p>
            <a
              href="https://www.house.gov/representatives/find-your-representative"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-civiq-blue hover:underline type-sm font-semibold aicher-heading-wide"
            >
              Find alternative contact methods →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
