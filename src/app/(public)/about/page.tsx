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

        {/* Principle Statement */}
        <div className="mb-grid-8 sm:mb-grid-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-grid-4 aicher-heading leading-tight">
            Good design is
            <br />
            as little design
            <br />
            as possible.
          </h1>
          <p className="text-lg text-gray-600 max-w-md">
            We apply this principle to civic information.
          </p>
        </div>

        {/* Core Values - Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-4 mb-grid-8">
          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">01</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Honest</h2>
            <p className="text-gray-600 text-sm">
              Real data from official sources. No fabrication. No spin.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">02</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Useful</h2>
            <p className="text-gray-600 text-sm">
              Information that serves a purpose. Nothing decorative.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">03</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Clear</h2>
            <p className="text-gray-600 text-sm">
              Complex government data made understandable at a glance.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">04</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Open</h2>
            <p className="text-gray-600 text-sm">
              Transparent methods. Open source. Publicly verifiable.
            </p>
          </div>
        </div>

        {/* Data Sources - Minimal List */}
        <div className="mb-grid-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-grid-3">
            Sources
          </h2>
          <div className="space-y-grid-2">
            <DataSourceRow
              name="Congress.gov"
              description="Legislative records"
              href="https://api.congress.gov/"
            />
            <DataSourceRow
              name="Federal Election Commission"
              description="Campaign finance"
              href="https://www.fec.gov/"
            />
            <DataSourceRow
              name="U.S. Census Bureau"
              description="Demographics"
              href="https://www.census.gov/"
            />
            <DataSourceRow
              name="Open States"
              description="State legislatures"
              href="https://openstates.org/"
            />
          </div>
        </div>

        {/* Simple Footer */}
        <div className="pt-grid-4 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-grid-2">
            <p className="text-sm text-gray-500">Built for citizens who want facts.</p>
            <Link
              href="/"
              className="text-sm font-medium text-black hover:text-civiq-blue transition-colors"
            >
              Enter CIV.IQ
            </Link>
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
