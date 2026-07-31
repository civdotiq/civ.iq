/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { EnhancedRepresentative } from '@/types/representative';
import { CommitteeLink } from '@/components/shared/links/EntityLinks';
import { getStateName } from '@/lib/data/us-states';
import type { ProfileCommittee } from './types';

interface SidebarCardProps {
  title: string;
  children: React.ReactNode;
}

function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <div className="border-2 border-black bg-white mb-6">
      <h3 className="px-4 py-3 border-b border-gray-300 text-xs font-bold uppercase tracking-widest text-gray-900">
        {title}
      </h3>
      <div className="p-4 text-sm">{children}</div>
    </div>
  );
}

interface ProfileSidebarProps {
  representative: EnhancedRepresentative;
  nextElection: number | null;
  /** Opens the district drill-down section. */
  onExploreDistrict: () => void;
}

export function ProfileSidebar({
  representative: r,
  nextElection,
  onExploreDistrict,
}: ProfileSidebarProps) {
  const committees = (r.committees ?? []) as ProfileCommittee[];
  const stateName = getStateName(r.state) || r.state;
  const termEndYear = r.currentTerm?.end ? new Date(r.currentTerm.end).getFullYear() : null;
  const isHouse = r.chamber === 'House';

  return (
    <aside aria-label="Reference information">
      <SidebarCard title="Committees">
        {committees.length === 0 ? (
          <p className="text-gray-500">
            No current committee assignments listed by congress-legislators.
          </p>
        ) : (
          <ul id="committees">
            {committees.map(committee => (
              <li
                key={committee.name}
                className="py-2 border-b border-gray-100 first:pt-0 last:border-b-0 last:pb-0"
              >
                <CommitteeLink
                  code={committee.id || committee.thomas_id}
                  name={committee.name}
                  className="font-medium"
                />
                {committee.role && committee.role !== 'Member' && (
                  <span className="block text-xs text-gray-500">{committee.role}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SidebarCard>

      {(nextElection || termEndYear) && (
        <SidebarCard title="Next election">
          {nextElection && (
            <div className="flex justify-between gap-2 py-1.5 text-[13px]">
              <span className="text-gray-500">Seat up</span>
              <span className="font-medium text-right">November {nextElection}</span>
            </div>
          )}
          {termEndYear && (
            <div className="flex justify-between gap-2 py-1.5 text-[13px]">
              <span className="text-gray-500">Current term ends</span>
              <span className="font-medium text-right">{termEndYear}</span>
            </div>
          )}
        </SidebarCard>
      )}

      {isHouse && r.district && (
        <SidebarCard title={`District ${r.state}-${r.district}`}>
          <p>
            <Link
              href={`/districts/${r.state}-${r.district}`}
              className="text-civiq-blue hover:underline font-medium"
            >
              Full district profile →
            </Link>
          </p>
          <p className="mt-2">
            <button
              type="button"
              onClick={onExploreDistrict}
              className="text-civiq-blue hover:underline"
            >
              Demographics, spending & hearings →
            </button>
          </p>
          <div className="border-l-[3px] border-civiq-amber bg-gray-50 px-3 py-2 mt-3 text-xs text-gray-700">
            Not sure this is your district?{' '}
            <Link href="/" className="text-civiq-blue hover:underline">
              Look up by home address
            </Link>{' '}
            — ZIP codes are wrong 10–20% of the time.
          </div>
        </SidebarCard>
      )}

      <SidebarCard title={`${stateName} delegation`}>
        <p>
          <Link href={`/states/${r.state}`} className="text-civiq-blue hover:underline">
            All {stateName} representatives →
          </Link>
        </p>
      </SidebarCard>

      <SidebarCard title="Data sources">
        <ul>
          <li className="py-2 border-b border-gray-100 first:pt-0">
            <a
              href="https://www.congress.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              Congress.gov
            </a>
            <span className="block text-xs text-gray-500">Bills, votes, committees</span>
          </li>
          <li className="py-2 border-b border-gray-100">
            <a
              href="https://www.fec.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              FEC.gov
            </a>
            <span className="block text-xs text-gray-500">Campaign finance</span>
          </li>
          <li className="py-2 border-b border-gray-100">
            <a
              href="https://lda.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              Senate LDA
            </a>
            <span className="block text-xs text-gray-500">Lobbying filings</span>
          </li>
          <li className="py-2 last:pb-0">
            <a
              href="https://github.com/unitedstates/congress-legislators"
              target="_blank"
              rel="noopener noreferrer"
              className="text-civiq-blue hover:underline"
            >
              congress-legislators
            </a>
            <span className="block text-xs text-gray-500">Biographical data</span>
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          All data from official government APIs and public repositories.
        </p>
      </SidebarCard>
    </aside>
  );
}
