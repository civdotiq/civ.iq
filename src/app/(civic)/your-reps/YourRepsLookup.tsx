/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import SearchForm from '@/components/SearchForm';
import { RepBriefSummary } from '@/components/intelligence/RepBriefSummary';
import { AlertSubscribeForm } from '@/components/alerts/AlertSubscribeForm';
import { BallotCard } from '@/features/record-card/components/BallotCard';

/** The address lookup and per-member summaries; the page around it is server-rendered. */
export function YourRepsLookup() {
  return (
    <SearchForm
      renderFederalExtras={federal => (
        <div className="mt-6">
          {/* Which of these seats are on the next ballot (additive; fails silent) */}
          <BallotCard bioguideIds={federal.map(r => r.bioguideId)} />
          <div className="mt-6 space-y-4">
            {federal.map(rep => (
              <RepBriefSummary
                key={rep.bioguideId}
                bioguideId={rep.bioguideId}
                name={rep.name}
                party={rep.party}
                state={rep.state}
                district={rep.district ?? null}
                chamber={rep.chamber}
              />
            ))}
          </div>
          <div className="mt-6">
            <AlertSubscribeForm
              entities={federal.map(rep => ({
                type: 'representative' as const,
                id: rep.bioguideId,
                name: rep.name,
                chamber: rep.chamber,
              }))}
            />
          </div>
        </div>
      )}
    />
  );
}
