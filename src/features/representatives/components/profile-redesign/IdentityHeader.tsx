/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { EnhancedRepresentative } from '@/types/representative';
import { AlertSubscribeButton } from '@/components/alerts/AlertSubscribeButton';
import { partyChipClasses } from './types';

interface IdentityHeaderProps {
  representative: EnhancedRepresentative;
  nextElection: number | null;
  focusAreas: string[];
  /** Opens the full biography / contact drill-down section. */
  onOpenBio: () => void;
}

function computeAge(birthday: string | undefined): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age < 120 ? age : null;
}

export function IdentityHeader({
  representative: r,
  nextElection,
  focusAreas,
  onOpenBio,
}: IdentityHeaderProps) {
  const [imageError, setImageError] = useState(false);
  const photoUrl = r.imageUrl || `/api/photo/${r.bioguideId}`;

  const displayName = r.fullName?.official || r.name;
  const age = computeAge(r.bio?.birthday);
  const phone = r.currentTerm?.phone || r.phone;
  const websiteHost = r.website
    ? r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : undefined;
  const contactHref = r.website || r.currentTerm?.contactForm || r.contact?.contactForm;

  // Terms are sorted most-recent-first; the earliest term is last.
  const terms = r.terms ?? [];
  const sinceYear = terms[terms.length - 1]?.startYear;
  const termRange = terms[0] ? `${terms[0].startYear}–${terms[0].endYear}` : null;
  const termCount = terms.length;

  const roleTitle =
    r.chamber === 'Senate' ? (
      <>
        U.S. Senator from{' '}
        <Link href={`/states/${r.state}`} className="font-bold text-civiq-blue hover:underline">
          {r.state}
        </Link>
      </>
    ) : r.district && r.district !== 'AL' ? (
      <>
        U.S. Representative,{' '}
        <Link
          href={`/districts/${r.state}-${r.district}`}
          className="font-bold text-civiq-blue hover:underline"
        >
          {r.state}-{r.district}
        </Link>
      </>
    ) : (
      <>
        U.S. Representative from{' '}
        <Link href={`/states/${r.state}`} className="font-bold text-civiq-blue hover:underline">
          {r.state}
        </Link>
      </>
    );

  return (
    <header className="border-2 border-black bg-white p-6">
      <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[128px_1fr] lg:grid-cols-[128px_1fr_auto] gap-6 items-start">
        {/* Portrait */}
        <div className="w-24 sm:w-32">
          {!imageError ? (
            <Image
              src={photoUrl}
              alt={`Official photo of ${displayName}`}
              width={128}
              height={160}
              className="border border-black object-cover w-full h-auto"
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className="border border-black bg-gray-200 w-full aspect-[4/5] flex items-center justify-center text-xs text-gray-600"
              aria-label="Photo unavailable"
            >
              No photo
            </div>
          )}
        </div>

        {/* Identity */}
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900">
            {displayName}
          </h1>
          <p className="text-lg font-medium mt-1 text-gray-900">{roleTitle}</p>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span
              className={`border-2 rounded-[2px] px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${partyChipClasses(r.party)}`}
            >
              {r.party}
            </span>
            {age !== null && (
              <span className="border border-gray-300 rounded-[2px] px-2.5 py-1 text-xs font-medium text-gray-700">
                Age {age}
              </span>
            )}
            {nextElection && r.status !== 'resigned' && r.status !== 'deceased' && (
              <span className="border border-gray-300 rounded-[2px] px-2.5 py-1 text-xs font-medium text-gray-700">
                Up for re-election {nextElection}
              </span>
            )}
            {focusAreas.map(area => (
              <span
                key={area}
                className="border border-gray-300 rounded-[2px] px-2.5 py-1 text-xs font-medium text-gray-700"
              >
                {area}
              </span>
            ))}
          </div>

          <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm">
            {termRange && (
              <div>
                <dd className="font-bold text-gray-900">{termRange}</dd>
                <dt className="text-[11px] uppercase tracking-wider text-gray-500">Current term</dt>
              </div>
            )}
            {sinceYear && (
              <div>
                <dd className="font-bold text-gray-900">
                  {termCount === 1 ? '1st term' : `In Congress since ${sinceYear}`}
                </dd>
                <dt className="text-[11px] uppercase tracking-wider text-gray-500">
                  {termCount} {termCount === 1 ? 'term' : 'terms'} served
                </dt>
              </div>
            )}
            <div>
              <dd>
                <button
                  type="button"
                  onClick={onOpenBio}
                  className="font-bold text-civiq-blue hover:underline"
                >
                  Full biography & contact →
                </button>
              </dd>
              <dt className="text-[11px] uppercase tracking-wider text-gray-500">
                Offices, service history
              </dt>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="col-span-2 lg:col-span-1 flex lg:flex-col gap-2 lg:min-w-[192px]">
          {contactHref && (
            <a
              href={contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none text-center border-2 border-black rounded-[2px] bg-black text-white px-4 py-2.5 text-sm font-bold hover:bg-gray-800"
            >
              Contact
            </a>
          )}
          {!r.isHistorical && (
            <AlertSubscribeButton
              bioguideId={r.bioguideId}
              name={r.name}
              chamber={r.chamber}
              className="flex-1 lg:flex-none"
            />
          )}
          <p className="hidden lg:block text-xs text-center text-gray-700 mt-1">
            {phone}
            {phone && websiteHost ? ' · ' : ''}
            {r.website && websiteHost && (
              <a
                href={r.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                {websiteHost}
              </a>
            )}
          </p>
        </div>
      </div>
    </header>
  );
}
