/**
 * Committee Footer - Ulm School of Design
 * Contextual navigation for committee pages
 */

import Link from 'next/link';

export interface CommitteeFooterProps {
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  committeeType: string;
  memberCount?: number;
  subcommitteeCount?: number;
  chairName?: string;
  chairBioguideId?: string;
  rankingMemberName?: string;
  rankingMemberBioguideId?: string;
  lastUpdated?: Date;
}

export function CommitteeFooter({
  committeeName,
  chamber,
  committeeType,
  memberCount = 0,
  subcommitteeCount = 0,
  chairName,
  chairBioguideId,
  rankingMemberName,
  rankingMemberBioguideId,
  lastUpdated,
}: CommitteeFooterProps) {
  // Short name for display
  const shortName = committeeName
    .replace(/^Senate Committee on /, '')
    .replace(/^House Committee on /, '')
    .replace(/^Committee on /, '');

  return (
    <footer className="mt-12 border-t-2 border-gray-900 pt-8 pb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
        Explore
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Column 1: Committee Stats */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {shortName}
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-2xl font-light text-gray-900">{memberCount}</span>
                <span className="text-xs text-gray-500 block">Members</span>
              </div>
              <div>
                <span className="text-2xl font-light text-gray-900">{subcommitteeCount}</span>
                <span className="text-xs text-gray-500 block">Subcommittees</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {committeeType} committee in the {chamber}
            </p>
          </div>
        </div>

        {/* Column 2: Leadership */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Leadership
          </h3>
          <ul className="space-y-3">
            {chairName && chairBioguideId && (
              <li>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">
                  Chair
                </span>
                <Link
                  href={`/representative/${chairBioguideId}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline"
                >
                  {chairName}
                </Link>
              </li>
            )}
            {rankingMemberName && rankingMemberBioguideId && (
              <li>
                <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1">
                  Ranking Member
                </span>
                <Link
                  href={`/representative/${rankingMemberBioguideId}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline"
                >
                  {rankingMemberName}
                </Link>
              </li>
            )}
            {!chairName && !rankingMemberName && (
              <li className="text-xs text-gray-400">Leadership data unavailable</li>
            )}
          </ul>
        </div>

        {/* Column 3: Chamber */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {chamber}
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-2xl font-light text-gray-900">
                {chamber === 'Senate' ? '24' : chamber === 'House' ? '21' : '4'}
              </span>
              <span className="text-xs text-gray-500 block">{chamber} Committees</span>
            </div>
            <Link
              href={`/committees?chamber=${chamber}`}
              className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
            >
              All {chamber} Committees →
            </Link>
          </div>
        </div>

        {/* Column 4: Browse */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Browse
          </h3>

          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Committees
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/committees"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  All Committees
                </Link>
              </li>
              <li>
                <Link
                  href="/committees?chamber=House"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  House
                </Link>
              </li>
              <li>
                <Link
                  href="/committees?chamber=Senate"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Senate
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Congress
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/congress"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  119th Congress
                </Link>
              </li>
              <li>
                <Link
                  href="/bills/latest"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Recent Bills
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Data Sources */}
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
