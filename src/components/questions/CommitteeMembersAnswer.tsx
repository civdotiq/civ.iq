/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CommitteeMembersAnswer — pod renderer for the committee-members question.
 *
 * Pods: Leadership, Members list, Subcommittees, Sources.
 * Server component. Data from committee.service.
 */

import Link from 'next/link';
import type { Committee, CommitteeMember } from '@/types/committee';

interface CommitteeMembersAnswerProps {
  committee: Committee;
}

function partyColor(party: string): string {
  if (party === 'Republican') return 'text-[#e11d07]';
  if (party === 'Democratic') return 'text-[#0a9338]';
  return 'text-gray-600';
}

function LeadershipPod({ leadership }: { leadership: Committee['leadership'] }) {
  const { chair, rankingMember } = leadership;

  if (!chair && !rankingMember) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Leadership</h2>
        <p className="type-sm text-gray-500">Leadership data is not yet available.</p>
      </div>
    );
  }

  function LeaderRow({ member, label }: { member: CommitteeMember; label: string }) {
    const rep = member.representative;
    return (
      <div className="flex items-baseline gap-3">
        <span className="type-xs text-gray-500 shrink-0 w-32">{label}</span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/representative/${rep.bioguideId}`}
            className="type-sm text-[#3ea2d4] hover:underline"
          >
            {rep.name}
          </Link>
          <span className={`type-xs ml-2 ${partyColor(rep.party)}`}>
            ({rep.party?.charAt(0)}-{rep.state})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Leadership</h2>
      <div className="space-y-3">
        {chair && <LeaderRow member={chair} label="Chair" />}
        {rankingMember && <LeaderRow member={rankingMember} label="Ranking member" />}
      </div>
    </div>
  );
}

function MembersListPod({ members }: { members: CommitteeMember[] }) {
  if (!members.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Members</h2>
        <p className="type-sm text-gray-500">
          Member data is not yet available for this committee.
        </p>
      </div>
    );
  }

  // Sort: leadership first (Chair, Ranking Member, Vice Chair), then by rank
  const roleOrder: Record<string, number> = {
    Chair: 0,
    'Ranking Member': 1,
    'Vice Chair': 2,
    Member: 3,
  };
  const sorted = [...members].sort(
    (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3) || (a.rank ?? 99) - (b.rank ?? 99)
  );

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Members ({members.length})</h2>
      <ul className="divide-y divide-gray-200">
        {sorted.map(member => {
          const rep = member.representative;
          return (
            <li key={rep.bioguideId} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline gap-3">
                <Link
                  href={`/representative/${rep.bioguideId}`}
                  className="type-sm text-[#3ea2d4] hover:underline"
                >
                  {rep.name}
                </Link>
                <span className={`type-xs ${partyColor(rep.party)}`}>
                  ({rep.party?.charAt(0)}-{rep.state})
                </span>
                {member.role !== 'Member' && (
                  <span className="type-xs text-gray-400">{member.role}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SubcommitteesPod({ subcommittees }: { subcommittees: Committee['subcommittees'] }) {
  if (!subcommittees.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Subcommittees</h2>
        <p className="type-sm text-gray-500">No subcommittees listed.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">
        Subcommittees ({subcommittees.length})
      </h2>
      <ul className="space-y-2">
        {subcommittees.map(sub => (
          <li key={sub.id}>
            <Link
              href={`/committee/${sub.id}`}
              className="type-sm text-[#3ea2d4] hover:underline line-clamp-2"
            >
              {sub.name}
            </Link>
            {sub.chair && <p className="type-xs text-gray-500 mt-0.5">Chair: {sub.chair.name}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Committee data from{' '}
        <a
          href="https://www.congress.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress.gov
        </a>{' '}
        and{' '}
        <a
          href="https://github.com/unitedstates/congress-legislators"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          congress-legislators
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function CommitteeMembersAnswer({ committee }: CommitteeMembersAnswerProps) {
  return (
    <>
      <LeadershipPod leadership={committee.leadership} />
      <SubcommitteesPod subcommittees={committee.subcommittees} />
      <MembersListPod members={committee.members} />
      <SourcesPod />
    </>
  );
}
