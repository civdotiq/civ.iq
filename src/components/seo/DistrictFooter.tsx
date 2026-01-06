/**
 * District Footer - Ulm School of Design
 * Contextual navigation for district pages
 */

import Link from 'next/link';

export interface DistrictFooterProps {
  districtName: string;
  state: string;
  districtNumber: string;
  representativeName: string;
  representativeBioguideId: string;
  representativeParty: string;
  population?: number;
  cookPVI?: string;
  lastUpdated?: Date;
}

export function DistrictFooter({
  districtName: _districtName,
  state,
  districtNumber,
  representativeName,
  representativeBioguideId,
  representativeParty,
  population,
  cookPVI,
  lastUpdated,
}: DistrictFooterProps) {
  const isStatewide = districtNumber === 'STATE';

  return (
    <footer className="mt-12 border-t-2 border-gray-900 pt-8 pb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
        Explore
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Column 1: District Stats */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {isStatewide ? state : `${state}-${districtNumber}`}
          </h3>
          <div className="space-y-4">
            {population && (
              <div>
                <span className="text-2xl font-light text-gray-900">
                  {(population / 1000000).toFixed(1)}M
                </span>
                <span className="text-xs text-gray-500 block">Population</span>
              </div>
            )}
            {cookPVI && (
              <div>
                <span className="text-lg font-medium text-gray-900">{cookPVI}</span>
                <span className="text-xs text-gray-500 block">Cook PVI</span>
              </div>
            )}
            <p className="text-xs text-gray-500">
              {isStatewide ? 'Statewide Senate seat' : 'Congressional district'}
            </p>
          </div>
        </div>

        {/* Column 2: Representative */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Representative
          </h3>
          <div className="space-y-3">
            <div>
              <Link
                href={`/representative/${representativeBioguideId}`}
                className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block"
              >
                {representativeName}
              </Link>
              <span className="text-xs text-gray-500">{representativeParty}</span>
            </div>
            <Link
              href={`/representative/${representativeBioguideId}`}
              className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
            >
              View Profile →
            </Link>
          </div>
        </div>

        {/* Column 3: State Delegation */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {state} Delegation
          </h3>
          <div className="space-y-3">
            <p className="text-xs text-gray-500">All senators and representatives from {state}</p>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/delegation/${state}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
                >
                  View Full Delegation →
                </Link>
              </li>
              <li>
                <Link
                  href={`/districts?state=${state}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
                >
                  {state} Districts
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Column 4: Browse */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Browse
          </h3>

          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Districts
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/districts"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  All 435 Districts
                </Link>
              </li>
              <li>
                <Link
                  href={`/districts?state=${state}`}
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  {state} Districts
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
                  href="/committees"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Committees
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
            href="https://census.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            Census Bureau
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
