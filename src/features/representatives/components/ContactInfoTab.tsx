/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { ServiceTermsCard } from './ServiceTermsCard';
import { CommitteeMembershipsCard } from './CommitteeMembershipsCard';
import { BiographyCard } from './BiographyCard';
import { OverviewSidebar } from './OverviewSidebar';
import { RepresentativeContactForm } from './RepresentativeContactForm';

interface ContactInfoTabProps {
  representative: EnhancedRepresentative;
}

export function ContactInfoTab({ representative }: ContactInfoTabProps) {
  return (
    <div className="flex flex-col gap-grid-5">
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
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 'calc(var(--grid) * 4)' }}>
        {/* LEFT COLUMN (2/3) - Main Content */}
        <div className="md:col-span-2 flex flex-col gap-grid-5">
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

          {/* Contact Form */}
          <div>
            <RepresentativeContactForm representative={representative} />
          </div>
        </div>

        {/* RIGHT COLUMN (1/3) - Sidebar */}
        <div className="md:col-span-1 md:sticky md:top-4 md:self-start">
          <OverviewSidebar representative={representative} />
        </div>
      </div>

      {/* Full-width Need Help Section */}
      <div
        className="bg-red-50 aicher-border border-civiq-red"
        style={{ padding: 'calc(var(--grid) * 3)', marginTop: 'calc(var(--grid) * 2)' }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-civiq-red flex-shrink-0 mt-1" />
          <div>
            <h3
              className="aicher-heading type-lg text-civiq-red"
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
              className="inline-flex items-center text-civiq-red hover:underline type-sm font-semibold aicher-heading-wide"
            >
              Find alternative contact methods →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
