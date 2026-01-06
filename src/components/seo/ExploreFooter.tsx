/**
 * Explore Footer - Ulm School of Design
 * Generic contextual navigation for content pages
 */

import Link from 'next/link';

export interface ExploreFooterProps {
  currentSection: string;
  relatedLinks?: Array<{
    href: string;
    label: string;
  }>;
  lastUpdated?: Date;
  dataSource?: string;
}

export function ExploreFooter({
  currentSection,
  relatedLinks = [],
  lastUpdated,
  dataSource = 'Congress.gov',
}: ExploreFooterProps) {
  return (
    <footer className="mt-12 border-t-2 border-gray-900 pt-8 pb-4">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">
        Explore
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
        {/* Column 1: Current Section */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            {currentSection}
          </h3>
          {relatedLinks.length > 0 && (
            <ul className="space-y-2">
              {relatedLinks.slice(0, 5).map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Column 2: Representatives */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Representatives
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-2xl font-light text-gray-900">100</span>
                <span className="text-xs text-gray-500 block">Senators</span>
              </div>
              <div>
                <span className="text-2xl font-light text-gray-900">435</span>
                <span className="text-xs text-gray-500 block">Reps</span>
              </div>
            </div>
            <Link
              href="/congress"
              className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
            >
              Browse Congress →
            </Link>
          </div>
        </div>

        {/* Column 3: Districts */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3 pb-2 border-b border-gray-200">
            Districts
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-2xl font-light text-gray-900">435</span>
              <span className="text-xs text-gray-500 block">Congressional Districts</span>
            </div>
            <Link
              href="/districts"
              className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-1"
            >
              Browse Districts →
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

          <div>
            <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-2">
              Resources
            </span>
            <ul className="space-y-1">
              <li>
                <Link
                  href="/glossary"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Glossary
                </Link>
              </li>
              <li>
                <Link
                  href="/education"
                  className="text-sm text-gray-700 hover:text-[#3ea2d4] hover:underline block py-0.5"
                >
                  Education
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
            href="https://census.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            Census Bureau
          </a>
        </div>
        {lastUpdated && (
          <span>
            Updated{' '}
            {lastUpdated.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}{' '}
            • Source: {dataSource}
          </span>
        )}
      </div>
    </footer>
  );
}
