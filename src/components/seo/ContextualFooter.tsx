/**
 * Contextual Footer - Ulm School of Design Principles
 *
 * Otl Aicher / HfG Ulm approach:
 * - Systematic grid with mathematical spacing
 * - Functional typography with clear hierarchy
 * - Dense but scannable information
 * - Every element serves a purpose
 * - No decoration, only function
 */

import Link from 'next/link';

// ============================================
// TYPES
// ============================================

export interface CommitteeLink {
  name: string;
  href: string;
  role?: string;
}

export interface ContextualFooterProps {
  representativeName: string;
  party: string;
  state: string;
  stateFullName?: string;
  chamber: 'House' | 'Senate';
  committees?: CommitteeLink[];
  totalCommittees?: number;
  senatorCount?: number;
  repCount?: number;
  lastUpdated?: Date;
  dataSource?: string;
}

// ============================================
// HELPER: Clean committee name
// ============================================

function cleanCommitteeName(name: string): string {
  // Remove "Senate " or "House " prefix for brevity
  // Keep full name if it's short
  const cleaned = name
    .replace(/^Senate Committee on /, '')
    .replace(/^House Committee on /, '')
    .replace(/^Subcommittee on /, '');

  // If name is a code like "SSAP01", return a more readable version
  if (/^[A-Z]{2,5}\d{2}$/.test(name)) {
    return name; // Keep code but we'll filter these out
  }

  return cleaned;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ContextualFooter({
  representativeName,
  party: _party,
  state,
  stateFullName,
  chamber,
  committees = [],
  totalCommittees,
  senatorCount = 2,
  repCount,
  lastUpdated,
  dataSource: _dataSource = 'Congress.gov',
}: ContextualFooterProps) {
  const displayState = stateFullName || state;
  const lastName = representativeName.split(' ').pop() || representativeName;

  // Filter out committee codes (like SSAP01) and get real names
  const realCommittees = committees.filter(
    c => c.name && !/^[A-Z]{2,5}\d{2}$/.test(c.name) && c.name.length > 6
  );

  const committeeCount = totalCommittees || committees.length;
  const topCommittees = realCommittees.slice(0, 5);
  const remainingCount = committeeCount - topCommittees.length;

  // Territory handling
  const territories = ['PR', 'VI', 'GU', 'AS', 'MP', 'DC'];
  const isTerritory = territories.includes(state);

  // Calculate rep count for states
  const displayRepCount = repCount ?? (isTerritory ? 0 : undefined);

  return (
    <footer className="mt-12 border-t-2 border-gray-900 pt-8 pb-4">
      {/* Section Header */}
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
        Explore
      </h2>

      {/* Main Grid - 4 columns on desktop, stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Column 1: Committees */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Committees
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            {lastName} serves on {committeeCount}
          </p>
          <ul className="space-y-2">
            {topCommittees.map(committee => (
              <li key={committee.href}>
                <Link
                  href={committee.href}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
                >
                  {cleanCommitteeName(committee.name)}
                </Link>
              </li>
            ))}
            {remainingCount > 0 && (
              <li>
                <Link
                  href={`#committees`}
                  className="text-xs text-gray-400 hover:text-[#3ea2d4] block py-1"
                >
                  + {remainingCount} more
                </Link>
              </li>
            )}
          </ul>
        </div>

        {/* Column 2: State Delegation */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {state} Delegation
          </h3>
          {isTerritory ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Non-voting delegate</p>
              <Link
                href={`/delegation/${state}`}
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                View {displayState}
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-2xl font-light text-gray-900">{senatorCount}</span>
                  <span className="text-xs text-gray-500 block">Senators</span>
                </div>
                {displayRepCount !== undefined && (
                  <div>
                    <span className="text-2xl font-light text-gray-900">{displayRepCount}</span>
                    <span className="text-xs text-gray-500 block">Reps</span>
                  </div>
                )}
              </div>
              <Link
                href={`/delegation/${state}`}
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                View Full Delegation →
              </Link>
            </div>
          )}
        </div>

        {/* Column 3: Chamber */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {chamber === 'Senate' ? 'U.S. Senate' : 'U.S. House'}
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-2xl font-light text-gray-900">
                {chamber === 'Senate' ? '100' : '435'}
              </span>
              <span className="text-xs text-gray-500 block">
                {chamber === 'Senate' ? 'Senators' : 'Voting Members'}
              </span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Democrats</span>
                <span className="text-gray-700">{chamber === 'Senate' ? '47' : '213'}</span>
              </div>
              <div className="flex justify-between">
                <span>Republicans</span>
                <span className="text-gray-700">{chamber === 'Senate' ? '51' : '220'}</span>
              </div>
              {chamber === 'Senate' && (
                <div className="flex justify-between">
                  <span>Independents</span>
                  <span className="text-gray-700">2</span>
                </div>
              )}
            </div>
            <Link
              href={`/congress?chamber=${chamber}`}
              className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
            >
              Browse {chamber} →
            </Link>
          </div>
        </div>

        {/* Column 4: Browse */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Browse
          </h3>

          {/* By Party */}
          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Party
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/congress?party=Democrat"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Democrat
                </Link>
              </li>
              <li>
                <Link
                  href="/congress?party=Republican"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Republican
                </Link>
              </li>
              <li>
                <Link
                  href="/congress?party=Independent"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Independent
                </Link>
              </li>
            </ul>
          </div>

          {/* By Chamber */}
          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Chamber
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/congress?chamber=House"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  House
                </Link>
              </li>
              <li>
                <Link
                  href="/congress?chamber=Senate"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Senate
                </Link>
              </li>
            </ul>
          </div>

          {/* By State */}
          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              State
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href={`/delegation/${state}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  {state}
                </Link>
              </li>
              <li>
                <Link
                  href="/congress"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  All States
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Sources - Minimal footer line */}
      <div className="mt-10 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-[11px] text-gray-400">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-wider">Data</span>
          <a
            href="https://congress.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            Congress.gov
          </a>
          <span>•</span>
          <a
            href="https://fec.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            FEC.gov
          </a>
          <span>•</span>
          <a
            href="https://github.com/unitedstates/congress-legislators"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            congress-legislators
          </a>
        </div>
        {lastUpdated && (
          <span>
            Updated{' '}
            {lastUpdated.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )}
      </div>
    </footer>
  );
}
