/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { CivicAlignmentTab } from './CivicAlignmentTab';
import { ConnectionsTab } from './ConnectionsTab';

interface DistrictTabProps {
  bioguideId: string;
}

export function DistrictTab({ bioguideId }: DistrictTabProps) {
  return (
    <div className="space-y-8">
      {/* Headline: How they vote for your district */}
      <section>
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          How they vote for your district
        </h3>
        <p className="type-sm text-gray-500 mb-4">
          Gap analysis between district needs and voting record, cross-referenced with donor
          profiles.
        </p>
        <CivicAlignmentTab bioguideId={bioguideId} />
      </section>

      {/* Drill-down: What's happening in your district */}
      <section className="border-t-2 border-gray-100 pt-8">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          What&apos;s happening in your district
        </h3>
        <p className="type-sm text-gray-500 mb-4">
          Federal spending, hearings, open comment periods, and local officials connected to this
          representative.
        </p>
        <ConnectionsTab bioguideId={bioguideId} />
      </section>
    </div>
  );
}
