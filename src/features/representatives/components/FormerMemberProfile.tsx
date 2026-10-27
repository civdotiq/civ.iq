/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';
import { getStateName } from '@/lib/data/us-states';
import { bioguideUrl } from '@/lib/outside-ids';
import { longDate } from '@/lib/seo/answer-first';
import { ordinal } from '@/features/trading-cards/og/profile-preview-data';
import { chamberName, type FormerMemberFacts } from '../utils/former-member';

interface FormerMemberProfileProps {
  bioguideId: string;
  name: string;
  state: string;
  facts: FormerMemberFacts;
}

/**
 * Short page for a member who has left Congress: who they were, when they
 * served, and where the full biography lives. Nothing that only applies to
 * a sitting member (term, next election, office contact).
 */
export function FormerMemberProfile({ bioguideId, name, state, facts }: FormerMemberProfileProps) {
  const stateName = getStateName(state) ?? state;
  const congress = facts.recordCongress ? `${ordinal(facts.recordCongress)} Congress` : null;
  const left = facts.leftOffice ? longDate(facts.leftOffice) : null;

  return (
    <div className="density-default">
      <div className="container mx-auto px-grid-2 md:px-grid-4 py-grid-3">
        <BreadcrumbsWithContext
          items={[
            { label: 'Search', href: '/' },
            { label: 'Representatives', href: '/representatives' },
            { label: name, href: '#' },
          ]}
          className="mb-grid-3"
        />

        <main className="max-w-3xl">
          <div className="inline-block border-2 border-gray-400 bg-gray-50 px-2 py-0.5 rounded-sm text-xs font-semibold uppercase tracking-wide text-gray-700 mb-grid-2">
            Former member
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-grid-3">{name}</h1>

          <dl className="border-2 border-black bg-white p-grid-3 space-y-grid-1 mb-grid-3">
            {facts.service.map(run => (
              <div key={`${run.chamber}-${run.start}`} className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500">Served</dt>
                <dd className="font-medium text-gray-900">
                  {chamberName(run.chamber)}, {run.start}–{run.end}
                </dd>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-gray-500">State</dt>
              <dd className="font-medium text-gray-900">{stateName}</dd>
            </div>
            {left && (
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-gray-500">Left office</dt>
                <dd className="font-medium text-gray-900">{left}</dd>
              </div>
            )}
          </dl>

          {congress && (
            <section className="border-2 border-gray-300 bg-white p-grid-3 mb-grid-3">
              <h2 className="text-lg font-semibold text-gray-900 mb-grid-1">
                Past record in the {congress}
              </h2>
              <ul className="space-y-1 text-sm">
                <li>
                  <Link href={`/representative/${bioguideId}/votes`} className="text-civiq-blue">
                    Votes cast in the {congress}
                    {left ? `, through ${left}` : ''}
                  </Link>
                </li>
                <li>
                  <Link href={`/ask/bills-sponsored/${bioguideId}`} className="text-civiq-blue">
                    Bills sponsored in the {congress}
                  </Link>
                </li>
              </ul>
            </section>
          )}

          <p className="text-gray-700 mb-grid-2">
            CIV.IQ covers current members of Congress. The full biography is in the{' '}
            <a
              href={bioguideUrl(bioguideId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              Biographical Directory of the U.S. Congress
            </a>
            .
          </p>
          <p className="text-sm">
            <Link href={`/delegation/${state}`} className="text-civiq-blue">
              Current members of Congress from {stateName}
            </Link>
          </p>
          <p className="text-xs text-gray-500 mt-grid-3">
            Source: Congress member roster (congress-legislators), from the Biographical Directory.
          </p>
        </main>
      </div>
    </div>
  );
}
