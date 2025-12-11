import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="min-h-screen aicher-background">
      <div className="max-w-3xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-grid-6 sm:mb-grid-8">
          <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <Image
              src="/images/civiq-logo.png"
              alt="CIV.IQ"
              width={64}
              height={64}
              className="border-2 border-black mb-grid-2"
            />
          </Link>
        </div>

        {/* Mission Statement */}
        <div className="mb-grid-8 sm:mb-grid-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-grid-4 aicher-heading leading-tight">
            Know your
            <br />
            representatives.
          </h1>
          <p className="text-lg text-gray-600 max-w-md">
            Federal, state, and local government data in one place.
          </p>
        </div>

        {/* What CIV.IQ Provides - Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-4 mb-grid-8">
          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">540</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Federal Representatives</h2>
            <p className="text-gray-600 text-sm">
              435 House members, 100 Senators, 5 territorial delegates. Voting records, committee
              assignments, sponsored legislation.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">50</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">State Legislatures</h2>
            <p className="text-gray-600 text-sm">
              State legislators, bills, and votes. Governors, attorneys general, and state supreme
              court justices.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">39K</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">ZIP Codes</h2>
            <p className="text-gray-600 text-sm">
              Enter your ZIP code to find your representatives. Includes multi-district areas and
              all U.S. territories.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">$</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Campaign Finance</h2>
            <p className="text-gray-600 text-sm">
              FEC data on contributions, expenditures, and funding sources. See who funds your
              representatives.
            </p>
          </div>
        </div>

        {/* Data Sources - Minimal List */}
        <div className="mb-grid-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-grid-3">
            Official Sources
          </h2>
          <div className="space-y-grid-2">
            <DataSourceRow
              name="Congress.gov"
              description="Bills, votes, members"
              href="https://api.congress.gov/"
            />
            <DataSourceRow
              name="Federal Election Commission"
              description="Campaign finance"
              href="https://www.fec.gov/"
            />
            <DataSourceRow
              name="U.S. Census Bureau"
              description="Districts, demographics"
              href="https://www.census.gov/"
            />
            <DataSourceRow
              name="Open States"
              description="State legislatures"
              href="https://openstates.org/"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DataSourceRow({
  name,
  description,
  href,
}: {
  name: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-baseline justify-between py-grid-2 border-b border-gray-100 hover:border-gray-300 transition-colors group"
    >
      <span className="font-medium text-black group-hover:text-civiq-blue transition-colors">
        {name}
      </span>
      <span className="text-sm text-gray-500">{description}</span>
    </a>
  );
}
