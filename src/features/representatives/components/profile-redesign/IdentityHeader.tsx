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
import { ShareButton } from '@/components/shared/social/ShareButton';
import { partyFillClasses } from './types';
import { dcOfficeLines, safeHttpUrl, telHref } from './contact';

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

function Fact({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-gray-600">{label}</dt>
      <dd className="text-lg font-medium text-gray-900 mt-0.5">{value}</dd>
      {caption && <dd className="text-[13px] text-gray-600">{caption}</dd>}
    </div>
  );
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
  // The roster keeps contact details on the current term; top-level fields
  // are fallbacks only.
  const phone = r.currentTerm?.phone || r.phone;
  const phoneHref = telHref(phone);
  const officeLines = dcOfficeLines(r.currentTerm?.address);
  const website = safeHttpUrl(r.currentTerm?.website || r.website);
  const websiteHost = website?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const contactForm = safeHttpUrl(r.currentTerm?.contactForm || r.contact?.contactForm);

  // Terms are sorted most-recent-first; the earliest term is last.
  const terms = r.terms ?? [];
  const sinceYear = terms[terms.length - 1]?.startYear;
  const termRange = terms[0] ? `${terms[0].startYear}–${terms[0].endYear}` : null;
  const termCount = terms.length;
  const showElection = nextElection && r.status !== 'resigned' && r.status !== 'deceased';
  const partyClasses = partyFillClasses(r.party);

  const roleTitle =
    r.chamber === 'Senate' ? (
      <>
        U.S. Senator from{' '}
        <Link
          href={`/states/${r.state}`}
          className="font-bold text-civiq-blue-dark hover:underline"
        >
          {r.state}
        </Link>
      </>
    ) : r.district && r.district !== 'AL' ? (
      <>
        U.S. Representative,{' '}
        <Link
          href={`/districts/${r.state}-${r.district}`}
          className="font-bold text-civiq-blue-dark hover:underline"
        >
          {r.state}-{r.district}
        </Link>
      </>
    ) : (
      <>
        U.S. Representative from{' '}
        <Link
          href={`/states/${r.state}`}
          className="font-bold text-civiq-blue-dark hover:underline"
        >
          {r.state}
        </Link>
      </>
    );

  return (
    <header className="border-2 border-black bg-civiq-blue/5">
      {/* Party identity band — party colors identify party ONLY. */}
      <div className={`h-2 ${partyClasses}`} aria-hidden="true" />
      {/* Mobile: portrait + name share a row; facts span full width beneath.
          sm+: facts sit under the name. lg+: actions take a third column. */}
      <div className="p-6 lg:p-8 grid grid-cols-[80px_1fr] sm:grid-cols-[160px_1fr] lg:grid-cols-[160px_1fr_auto] gap-x-5 gap-y-5 sm:gap-x-8 items-start">
        {/* Portrait */}
        <div className="w-20 sm:w-40 sm:row-span-2">
          {!imageError ? (
            <Image
              src={photoUrl}
              alt={`Official photo of ${displayName}`}
              width={160}
              height={200}
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span
              className={`rounded-[2px] px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${partyClasses}`}
            >
              {r.party}
            </span>
            <p className="text-base font-medium text-gray-800">{roleTitle}</p>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-gray-900 mt-3">
            {displayName}
          </h1>
        </div>

        {/* Facts + focus areas */}
        <div className="col-span-2 sm:col-span-1 sm:col-start-2">
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 pt-4 border-t border-civiq-blue/30">
            {termRange && <Fact label="Current term" value={termRange} />}
            {sinceYear && (
              <Fact
                label="In Congress"
                value={termCount === 1 ? '1st term' : `Since ${sinceYear}`}
                caption={`${termCount} ${termCount === 1 ? 'term' : 'terms'} served`}
              />
            )}
            {showElection && <Fact label="Next election" value={`November ${nextElection}`} />}
            {age !== null && <Fact label="Age" value={String(age)} />}
          </dl>

          <div className="flex flex-wrap items-center gap-2 mt-5 text-[13px]">
            {focusAreas.length > 0 && <span className="text-gray-600 mr-1">Focus areas</span>}
            {focusAreas.map(area => (
              <span
                key={area}
                className="border border-civiq-blue/40 bg-white rounded-[2px] px-2.5 py-1 font-medium text-civiq-blue-dark"
              >
                {area}
              </span>
            ))}
            <button
              type="button"
              onClick={onOpenBio}
              className="ml-2 font-medium text-civiq-blue-dark hover:underline"
            >
              Full biography & contact →
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-1 lg:row-span-2 flex flex-wrap lg:flex-col lg:flex-nowrap gap-2 lg:min-w-[224px]">
          {/* Official contact form when the roster has one (most senators,
              almost no House members); otherwise the official website. */}
          {(contactForm || website) && (
            <a
              href={contactForm ?? website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 lg:flex-none text-center border-2 border-civiq-blue-dark rounded-[2px] bg-civiq-blue-dark text-white px-4 py-3 text-[15px] font-bold hover:bg-black"
            >
              {contactForm ? 'Contact office' : 'Official website'}
            </a>
          )}
          <div className="flex items-center gap-4">
            <ShareButton
              data={{
                representative: {
                  name: r.name,
                  party: r.party,
                  state: r.state,
                  bioguideId: r.bioguideId,
                  chamber: r.chamber,
                  district: r.district,
                },
                section: 'overview',
              }}
            />
            {!r.isHistorical && (
              <AlertSubscribeButton bioguideId={r.bioguideId} name={r.name} chamber={r.chamber} />
            )}
          </div>
          {(phone || officeLines.length > 0 || (contactForm && websiteHost)) && (
            <address className="basis-full not-italic flex flex-col gap-1 text-sm text-gray-800 mt-2">
              {phone && (
                <span>
                  <span className="text-gray-600">DC office </span>
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="text-[15px] font-bold text-civiq-blue-dark hover:underline"
                    >
                      {phone}
                    </a>
                  ) : (
                    <span className="text-[15px] font-bold">{phone}</span>
                  )}
                </span>
              )}
              {officeLines.map(line => (
                <span key={line}>{line}</span>
              ))}
              {/* Without a contact form the button above is already the website. */}
              {contactForm && website && websiteHost && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue-dark hover:underline"
                >
                  {websiteHost}
                </a>
              )}
            </address>
          )}
        </div>
      </div>
    </header>
  );
}
