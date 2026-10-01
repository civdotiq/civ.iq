/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Server-rendered top of /states/[state]: a one-paragraph summary, the
 * governor, the Congress delegation and the legislature's party split. Passed
 * into the (client) overview as a slot so it is in the first HTML response.
 */

import Link from 'next/link';
import { getPartyTextClass } from '@/lib/party-colors';
import type { StateChiefExecutive } from '@/lib/data-sources/state-governors';
import type { StateHubData } from '@/lib/state-hub/load-state-hub';
import type {
  DelegationMember,
  StateOverviewServerData,
} from '@/lib/state-overview/load-state-overview';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2025-01-09" → "January 2025", without a timezone round-trip. */
function monthYear(isoDate: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${month} ${m[1]}` : null;
}

/** Jurisdictions whose name takes "the" mid-sentence. */
const TAKES_ARTICLE = new Set(['DC', 'VI', 'MP']);

/** "an 80-seat", "an 11-seat", "a 110-seat". */
function seatCount(n: number): string {
  const s = String(n);
  return `${s.startsWith('8') || s === '11' || s === '18' ? 'an' : 'a'} ${n}-seat`;
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "D" party members as nouns: 2 Democrats, 1 Republican, 1 Independent. */
function partyTally(members: DelegationMember[]): string {
  const counts = new Map<string, number>();
  for (const m of members) counts.set(m.party, (counts.get(m.party) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([party, n]) => {
      const noun = /^democrat/i.test(party) ? 'Democrat' : party;
      return `${n} ${noun}${n === 1 ? '' : 's'}`;
    })
    .join(', ');
}

function houseSeatLabel(member: DelegationMember): string {
  if (member.role === 'Delegate' || member.role === 'Resident Commissioner') return member.role;
  return !member.district || member.district === '0' ? 'At-large' : `District ${member.district}`;
}

interface Props {
  stateCode: string;
  stateName: string;
  data: StateOverviewServerData;
  hub: StateHubData | null;
}

export function StateOverviewServerSections({ stateCode, stateName, data, hub }: Props) {
  const { chiefExecutive, senators, houseMembers, delegationAvailable } = data;
  const delegation = [...senators, ...houseMembers];

  return (
    <>
      <Summary
        stateName={TAKES_ARTICLE.has(stateCode) ? `the ${stateName}` : stateName}
        data={data}
        hub={hub}
      />

      {chiefExecutive && (
        <ChiefExecutiveCard
          exec={chiefExecutive}
          stateName={TAKES_ARTICLE.has(stateCode) ? `the ${stateName}` : stateName}
        />
      )}

      {delegationAvailable && delegation.length > 0 && (
        <section className="border-2 border-gray-900 bg-white p-4 sm:p-6">
          <h2 className="aicher-heading type-lg text-gray-900 mb-1">{stateName} in Congress</h2>
          <p className="type-sm text-gray-500 mb-4">{partyTally(delegation)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {senators.length > 0 && (
              <MemberList heading="U.S. Senate" members={senators} seat={() => 'Senator'} />
            )}
            {houseMembers.length > 0 && (
              <MemberList heading="U.S. House" members={houseMembers} seat={houseSeatLabel} />
            )}
          </div>
          <Link
            href={`/delegation/${stateCode}`}
            className="inline-block mt-4 type-sm text-[#3ea2d4] hover:underline"
          >
            Compare the {stateName} delegation →
          </Link>
        </section>
      )}

      {hub && <LegislatureCard hub={hub} />}
    </>
  );
}

function Summary({
  stateName,
  data,
  hub,
}: {
  stateName: string;
  data: StateOverviewServerData;
  hub: StateHubData | null;
}) {
  const { chiefExecutive, senators, houseMembers, delegationAvailable } = data;
  const sentences: string[] = [];

  if (chiefExecutive) {
    const since = chiefExecutive.inOfficeSince ? monthYear(chiefExecutive.inOfficeSince) : null;
    const party = chiefExecutive.party ? ` (${chiefExecutive.party})` : '';
    sentences.push(
      `The ${chiefExecutive.title.toLowerCase()} of ${stateName} is ${chiefExecutive.name}${party}` +
        (since ? `, in office since ${since}.` : '.')
    );
  }

  if (delegationAvailable && (senators.length > 0 || houseMembers.length > 0)) {
    const voting = houseMembers.filter(m => m.role === 'Representative');
    const nonVoting = houseMembers.filter(m => m.role !== 'Representative');
    const parts: string[] = [];
    if (senators.length > 0) parts.push(plural(senators.length, 'U.S. senator', 'U.S. senators'));
    if (voting.length > 0) parts.push(plural(voting.length, 'representative', 'representatives'));
    if (nonVoting[0]) parts.push(`a non-voting ${nonVoting[0].role.toLowerCase()}`);
    sentences.push(`In Congress, ${stateName} is represented by ${parts.join(' and ')}.`);
  }

  if (hub) {
    const allSeatsKnown = hub.chambers.every(c => c.seats !== null);
    const chambers = allSeatsKnown
      ? hub.chambers.map(c => `${seatCount(c.seats ?? 0)} ${c.name}`).join(' and ')
      : `two chambers, the ${hub.chambers.map(c => c.name).join(' and the ')}`;
    sentences.push(
      hub.unicameral
        ? `The ${hub.legislatureName} has one chamber with ${hub.chambers[0]?.seats ?? hub.memberCount} seats.`
        : `The ${hub.legislatureName} has ${chambers}.`
    );
    if (hub.nextElectionYear) {
      sentences.push(`The next regular legislative election is in ${hub.nextElectionYear}.`);
    }
  }

  if (sentences.length === 0) return null;
  return <p className="type-base text-gray-700 leading-relaxed">{sentences.join(' ')}</p>;
}

function ChiefExecutiveCard({ exec, stateName }: { exec: StateChiefExecutive; stateName: string }) {
  const since = exec.inOfficeSince ? monthYear(exec.inOfficeSince) : null;
  const fromNga = exec.sourceUrl.includes('nga.org');
  return (
    <section className="border-2 border-gray-900 bg-white p-4 sm:p-6">
      <h2 className="aicher-heading type-lg text-gray-900 mb-3">
        {exec.title} of {stateName}
      </h2>
      <p className="text-xl font-semibold text-gray-900">{exec.name}</p>
      <p className="type-sm mt-1">
        {exec.party && <span className={getPartyTextClass(exec.party)}>{exec.party}</span>}
        {exec.party && since && <span className="text-gray-400"> · </span>}
        {since && <span className="text-gray-600">In office since {since}</span>}
      </p>
      {exec.website && (
        <a
          href={exec.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-3 type-sm text-[#3ea2d4] hover:underline"
        >
          Official website →
        </a>
      )}
      <p className="type-xs text-gray-400 mt-3">
        Source:{' '}
        <a href={exec.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {fromNga ? 'National Governors Association' : 'Wikidata'}
        </a>
      </p>
    </section>
  );
}

function MemberList({
  heading,
  members,
  seat,
}: {
  heading: string;
  members: DelegationMember[];
  seat: (m: DelegationMember) => string;
}) {
  return (
    <div>
      <h3 className="aicher-heading type-sm text-gray-500 mb-2">{heading}</h3>
      <ul>
        {members.map(m => (
          <li
            key={m.bioguideId}
            className="flex items-baseline justify-between gap-3 py-2 border-b border-gray-200"
          >
            <Link
              href={`/representative/${m.bioguideId}`}
              className="type-sm font-medium text-gray-900 hover:text-[#3ea2d4]"
            >
              {m.name}
            </Link>
            <span className="type-xs text-gray-500 whitespace-nowrap">
              <span className={getPartyTextClass(m.party)}>{m.party.charAt(0)}</span> · {seat(m)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function LegislatureCard({ hub }: { hub: StateHubData }) {
  return (
    <section className="border-2 border-gray-900 bg-white p-4 sm:p-6">
      <h2 className="aicher-heading type-lg text-gray-900 mb-4">{hub.legislatureName}</h2>
      <dl className="space-y-3">
        {hub.chambers.map(c => {
          const listed = c.members.length;
          return (
            <div key={c.key} className="border-b border-gray-200 pb-3">
              <dt className="type-sm font-medium text-gray-900">
                {c.name}
                <span className="text-gray-500 font-normal">
                  {c.seats !== null ? ` · ${c.seats} seats` : ` · ${listed} members`}
                  {c.seats !== null && listed !== c.seats ? ` · ${listed} members listed` : ''}
                </span>
              </dt>
              <dd className="type-sm text-gray-600 mt-1">
                {c.partyCounts.map(p => `${p.count} ${p.party}`).join(', ')}
              </dd>
            </div>
          );
        })}
      </dl>
      <Link
        href={`/state-legislature/${hub.stateCode.toLowerCase()}`}
        className="inline-block mt-4 type-sm text-[#3ea2d4] hover:underline"
      >
        Find your {hub.chambers.map(c => c.roleTitle).join(' and ')} →
      </Link>
    </section>
  );
}
