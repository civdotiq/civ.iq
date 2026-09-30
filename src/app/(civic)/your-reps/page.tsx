/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import SearchForm from '@/components/SearchForm';
import { RepBriefSummary } from '@/components/intelligence/RepBriefSummary';
import { AlertSubscribeForm } from '@/components/alerts/AlertSubscribeForm';
import { BallotCard } from '@/features/record-card/components/BallotCard';

export default function YourRepsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Your Representatives</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Your Representatives
          </h1>
          <p className="type-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Enter your home address to see who represents you in Congress and in your state
            legislature, with phone numbers and email. Each member of Congress gets a plain-language
            summary of their voting record, funding sources, and key findings from public government
            data.
          </p>
        </div>

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

        {/* Money Report CTA */}
        <div className="mt-8 border-2 border-gray-900 dark:border-[#444] p-4 sm:p-6 max-w-2xl">
          <h2 className="aicher-heading type-base text-gray-900 dark:text-gray-100 mb-2">
            Money Report Card
          </h2>
          <p className="type-sm text-gray-600 dark:text-gray-400 mb-3">
            See how campaign contributions correlate with voting patterns for all your
            representatives in one view.
          </p>
          <Link
            href="/your-reps/money-report"
            className="inline-flex items-center border-2 border-[#3ea2d4] text-[#3ea2d4] px-4 py-2 type-sm font-bold hover:bg-[#3ea2d4] hover:text-white transition-colors min-h-[44px]"
          >
            Get your Money Report Card
          </Link>
        </div>
      </main>
    </div>
  );
}
