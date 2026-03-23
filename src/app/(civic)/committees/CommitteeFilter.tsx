'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Building2, Scale, Users, ChevronDown } from 'lucide-react';

interface Subcommittee {
  code: string;
  name: string;
}

interface Committee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type: 'standing';
  jurisdiction: string;
  subcommittees: Subcommittee[];
}

type ChamberFilter = 'All' | 'House' | 'Senate' | 'Joint';

function CommitteeCard({ committee }: { committee: Committee }) {
  const hasSubcommittees = committee.subcommittees.length > 0;

  return (
    <div className="bg-white border-2 border-black">
      <Link
        href={`/committee/${committee.code}`}
        className="block p-6 hover:bg-gray-50 transition-colors group"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {committee.name}
          </h3>
          <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 uppercase tracking-wide">
            {committee.type}
          </span>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{committee.jurisdiction}</p>
      </Link>

      {hasSubcommittees && (
        <details className="border-t-2 border-gray-200">
          <summary className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 select-none">
            <span>{committee.subcommittees.length} Subcommittees</span>
            <ChevronDown className="w-4 h-4 transition-transform details-chevron" />
          </summary>
          <ul className="px-6 pb-4 space-y-1">
            {committee.subcommittees.map(sub => (
              <li key={sub.code} className="text-sm pl-4 border-l-2 border-gray-200">
                <Link
                  href={`/committee/${sub.code}`}
                  className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ChamberSection({
  id,
  title,
  committees,
  icon: Icon,
  color,
}: {
  id: string;
  title: string;
  committees: Committee[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const totalSubs = committees.reduce((sum, c) => sum + c.subcommittees.length, 0);

  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <div className="flex items-center mb-6">
        <div className={`${color} p-3 mr-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">
            {committees.length} committees &middot; {totalSubs} subcommittees
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {committees.map(committee => (
          <CommitteeCard key={committee.code} committee={committee} />
        ))}
      </div>
    </section>
  );
}

const chamberConfig = {
  House: { id: 'house', title: 'House Committees', icon: Building2, color: 'bg-blue-600' },
  Senate: { id: 'senate', title: 'Senate Committees', icon: Scale, color: 'bg-green-600' },
  Joint: { id: 'joint', title: 'Joint Committees', icon: Users, color: 'bg-[#3ea2d4]' },
} as const;

export default function CommitteeFilter({ committees }: { committees: Committee[] }) {
  const [search, setSearch] = useState('');
  const [chamber, setChamber] = useState<ChamberFilter>('All');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return committees.filter(c => {
      if (chamber !== 'All' && c.chamber !== chamber) return false;
      if (query && !c.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [committees, search, chamber]);

  const grouped = useMemo(() => {
    const house = filtered.filter(c => c.chamber === 'House');
    const senate = filtered.filter(c => c.chamber === 'Senate');
    const joint = filtered.filter(c => c.chamber === 'Joint');
    return { house, senate, joint };
  }, [filtered]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-12">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search committees..."
          className="border-2 border-gray-300 px-4 py-2 text-sm w-full sm:flex-1 focus:border-black focus:outline-none"
        />
        <select
          value={chamber}
          onChange={e => setChamber(e.target.value as ChamberFilter)}
          className="border-2 border-gray-300 px-4 py-2 text-sm w-full sm:w-48 focus:border-black focus:outline-none bg-white"
        >
          <option value="All">All Chambers</option>
          <option value="House">House</option>
          <option value="Senate">Senate</option>
          <option value="Joint">Joint</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-gray-500 text-sm mb-12">No committees match your search.</p>
      )}

      {grouped.house.length > 0 && (
        <ChamberSection {...chamberConfig.House} committees={grouped.house} />
      )}
      {grouped.senate.length > 0 && (
        <ChamberSection {...chamberConfig.Senate} committees={grouped.senate} />
      )}
      {grouped.joint.length > 0 && (
        <ChamberSection {...chamberConfig.Joint} committees={grouped.joint} />
      )}
    </>
  );
}
