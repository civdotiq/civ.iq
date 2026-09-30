/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Who is my state representative in [State]?" — the state legislature hub.
 *
 * Server-rendered from committed data so the question, the answer's shape and
 * a link to every sitting member are in the first HTML response. The address
 * lookup and the bills/executives/judiciary tabs are the only parts that load
 * in the browser.
 */

import Link from 'next/link';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { RepLookup } from '@/components/lookup/RepLookup';
import { getPartyTextClass } from '@/lib/party-colors';
import { buildDelegationUrl } from '@/lib/helpers/url-builders';
import type { HubChamber, StateHubData } from '@/lib/state-hub/load-state-hub';
import { StateGovernmentTabs } from './StateGovernmentTabs';

function seatCount(chamber: HubChamber): number {
  return chamber.seats ?? chamber.members.length;
}

/** "58 Republican, 52 Democratic" */
function partySummary(chamber: HubChamber): string {
  return chamber.partyCounts.map(p => `${p.count} ${p.party}`).join(', ');
}

function formatAsOf(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function ChamberRoster({ chamber, id }: { chamber: HubChamber; id: string }) {
  const listed = chamber.members.length;
  const seats = chamber.seats;
  return (
    <section aria-labelledby={id} className="mb-10">
      <h3 id={id} className="text-xl font-bold text-gray-900">
        {chamber.name}
      </h3>
      <p className="text-sm text-gray-600 mt-1">
        {seats !== null ? `${seats} seats` : `${listed} members`}
        {seats !== null && listed !== seats ? ` · ${listed} members listed` : ''}
        {chamber.partyCounts.length > 0 ? ` · ${partySummary(chamber)}` : ''}
      </p>
      <ul className="mt-4 border-t-2 border-t-black">
        {chamber.members.map(m => (
          <li
            key={m.id}
            className="grid grid-cols-[5.5rem_1fr] sm:grid-cols-[8rem_1fr_9rem_11rem] gap-x-3 gap-y-0.5 py-2 border-b border-gray-200 items-baseline"
          >
            <span className="text-sm text-gray-600 break-words">{m.district}</span>
            <Link href={m.url} className="font-medium text-civiq-blue hover:underline">
              {m.name}
            </Link>
            <span className={`col-start-2 sm:col-start-auto text-sm ${getPartyTextClass(m.party)}`}>
              {m.party}
            </span>
            <span className="col-start-2 sm:col-start-auto text-sm">
              {m.phone ? (
                <a
                  href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}
                  className="text-civiq-blue underline"
                >
                  {m.phone}
                </a>
              ) : m.email ? (
                <a href={`mailto:${m.email}`} className="text-civiq-blue underline break-all">
                  Email
                </a>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AboutSection({ data }: { data: StateHubData }) {
  const { stateCode, stateName, legislatureName, chambers } = data;
  const [first, second] = chambers;
  const asOf = formatAsOf(data.rosterAsOf);
  const place = stateCode === 'DC' ? 'DC' : stateName;
  const body = stateCode === 'DC' ? 'Council' : 'legislative';

  const describe = (c: HubChamber, noun: string) =>
    `${seatCount(c)} ${noun}${c.termYears ? `, who serve ${c.termYears}-year terms` : ''}`;

  let structure: string;
  if (!second && first) {
    structure =
      stateCode === 'DC'
        ? `The ${legislatureName} has ${describe(first, 'members')}.`
        : `The ${legislatureName} has one chamber of ${describe(first, `${first.roleTitle.toLowerCase()}s`)}.`;
  } else if (first && second) {
    const part = (c: HubChamber) =>
      `a ${seatCount(c)}-member ${c.name}${c.termYears ? ` (${c.termYears}-year terms)` : ''}`;
    structure = `The ${legislatureName} has two chambers: ${part(first)} and ${part(second)}.`;
  } else {
    structure = '';
  }

  return (
    <section aria-labelledby="about-heading" className="mb-10">
      <h2 id="about-heading" className="text-2xl font-bold text-gray-900 mb-4">
        About the {legislatureName}
      </h2>
      <div className="space-y-3 text-base text-gray-800 max-w-3xl">
        {structure && <p>{structure}</p>}
        {chambers
          .filter(c => c.hasMultiMemberDistricts)
          .map(c => (
            <p key={c.key}>
              Some {c.name} districts elect more than one member, so you may have more than one{' '}
              {c.roleTitle}.
            </p>
          ))}
        {data.nextElectionYear !== null && (
          <p>
            {place}’s next regular {body} elections are in {data.nextElectionYear}. Not every seat
            is on the ballot in every election.
          </p>
        )}
        {data.capitolCity && stateCode !== 'DC' && (
          <p>
            The {legislatureName} meets in {data.capitolCity}.
          </p>
        )}
        <p>
          To reach a member, call or email their office using the numbers above or on their profile
          page.
          {data.website && (
            <>
              {' '}
              The official website is{' '}
              <a href={data.website} className="text-civiq-blue underline" rel="noopener">
                {data.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
              .
            </>
          )}
        </p>
        <p className="text-sm text-gray-600">
          Members and contact details come from Open States, which collects them from official
          legislature websites{asOf ? `; data as of ${asOf}` : ''}. Chamber sizes and term lengths
          are from the National Conference of State Legislatures.
        </p>
      </div>
    </section>
  );
}

export function StateHubPage({ data }: { data: StateHubData }) {
  const code = data.stateCode.toLowerCase();
  const roster = data.chambers.flatMap(c => c.members);

  return (
    <div className="min-h-screen bg-white">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'States', href: '/states' },
            { label: data.stateName, href: `/states/${code}` },
            { label: 'Legislature' },
          ]}
          className="mb-6"
        />

        <header className="mb-8 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">{data.copy.h1}</h1>
          <p className="text-lg text-gray-700">{data.copy.lede}</p>
        </header>

        <div className="mb-12">
          <RepLookup
            stateCode={data.stateCode}
            stateName={data.stateName}
            chambers={data.chambers.map(c => ({
              key: c.key,
              name: c.name,
              roleTitle: c.roleTitle,
            }))}
            roster={roster}
          />
        </div>

        <section aria-labelledby="roster-heading" className="mb-4">
          <h2 id="roster-heading" className="text-2xl font-bold text-gray-900 mb-6">
            All {data.memberCount} members of the {data.legislatureName}
          </h2>
          {data.chambers.map(c => (
            <ChamberRoster key={c.key} chamber={c} id={`roster-${c.key}`} />
          ))}
        </section>

        <AboutSection data={data} />

        <section aria-labelledby="more-heading" className="mb-10">
          <h2 id="more-heading" className="text-2xl font-bold text-gray-900 mb-4">
            More about {data.stateCode === 'DC' ? 'DC' : data.stateName}
          </h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 mb-8">
            <li>
              <Link href={`/states/${code}`} className="text-civiq-blue underline">
                {data.stateName} overview
              </Link>
            </li>
            <li>
              <Link
                href={`/state-legislature/${code}/committees`}
                className="text-civiq-blue underline"
              >
                Committees
              </Link>
            </li>
            <li>
              <Link href={`/state-bills/${code}`} className="text-civiq-blue underline">
                Bills
              </Link>
            </li>
            <li>
              <Link href={buildDelegationUrl(data.stateCode)} className="text-civiq-blue underline">
                Members of Congress from {data.stateName}
              </Link>
            </li>
          </ul>
          <StateGovernmentTabs stateCode={data.stateCode} />
        </section>

        <ExploreFooter
          variant="state"
          currentSection="State Legislature"
          relatedLinks={[
            { href: '/states', label: 'All states' },
            { href: '/state-bills', label: 'State bill search' },
            { href: '/glossary', label: 'Glossary' },
          ]}
        />
      </main>
    </div>
  );
}
