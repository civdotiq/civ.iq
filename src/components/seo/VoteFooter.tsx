/**
 * Vote Footer - Contextual navigation for vote detail pages
 * Follows Ulm School of Design principles (Otl Aicher / HfG Ulm)
 */

import Link from 'next/link';

export interface VoteFooterProps {
  chamber: 'House' | 'Senate';
  congress: string;
  rollNumber: number;
  result: string;
  date: string;
  bill?: {
    number: string;
    type: string;
    title?: string;
  };
  notableVoters?: Array<{
    name: string;
    bioguideId: string;
    party: string;
    note: string;
  }>;
}

export function VoteFooter({
  chamber,
  congress,
  rollNumber: _rollNumber,
  result: _result,
  date: _date,
  bill,
  notableVoters = [],
}: VoteFooterProps) {
  return (
    <footer className="mt-12 border-t-2 border-gray-900 pt-8 pb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
        Explore
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Column 1: Related Bill */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Related Legislation
          </h3>
          {bill ? (
            <div className="space-y-2">
              <Link
                href={`/bill/${congress}-${bill.type?.toLowerCase().replace(/\./g, '') || (chamber === 'House' ? 'hr' : 's')}-${bill.number.replace(/[^\d]/g, '')}`}
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                {bill.number}: {bill.title || 'View Bill Details'}
              </Link>
              <Link
                href="/legislation"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                Browse All Legislation
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 mb-2">Procedural vote</p>
              <Link
                href="/legislation"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                Browse Legislation
              </Link>
            </div>
          )}
        </div>

        {/* Column 2: Notable Voters */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Notable Voters
          </h3>
          {notableVoters.length > 0 ? (
            <ul className="space-y-2">
              {notableVoters.slice(0, 5).map(voter => (
                <li key={voter.bioguideId}>
                  <Link
                    href={`/representative/${voter.bioguideId}`}
                    className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
                  >
                    {voter.name} <span className="text-xs text-gray-400">({voter.party})</span>
                  </Link>
                  <span className="text-xs text-gray-500">{voter.note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">View individual member positions above</p>
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
            <div>
              <span className="text-lg font-light text-gray-900">{congress}th</span>
              <span className="text-xs text-gray-500 block">Congress</span>
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
          <ul className="space-y-2">
            <li>
              <Link
                href="/legislation"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                Recent Legislation
              </Link>
            </li>
            <li>
              <Link
                href="/congress"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                All Members of Congress
              </Link>
            </li>
            <li>
              <Link
                href="/glossary/roll-call-vote"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                What is a Roll Call Vote?
              </Link>
            </li>
            <li>
              <Link
                href="/glossary/cloture"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                What is Cloture?
              </Link>
            </li>
            <li>
              <Link
                href="/topics"
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
              >
                Policy Topics
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Data Sources */}
      <div className="mt-10 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-[11px] text-gray-400">
        <div className="flex items-center gap-3">
          <span className="uppercase tracking-wider">Data</span>
          <a
            href="https://senate.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            Senate.gov
          </a>
          <span>•</span>
          <a
            href="https://clerk.house.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            House Clerk
          </a>
          <span>•</span>
          <a
            href="https://congress.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            Congress.gov
          </a>
        </div>
      </div>
    </footer>
  );
}
