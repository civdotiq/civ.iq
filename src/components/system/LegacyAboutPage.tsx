/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Legacy About page — lifted from the original
 * src/app/(public)/about/page.tsx so the redesign can ship behind ?v=new.
 */

import Link from 'next/link';
import Image from 'next/image';

export function LegacyAboutPage() {
  return (
    <div className="min-h-screen aicher-background">
      <div className="max-w-3xl mx-auto px-grid-2 sm:px-grid-4 py-grid-4 sm:py-grid-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">About</span>
        </nav>

        {/* Logo */}
        <div className="flex flex-col items-center mb-grid-6 sm:mb-grid-8">
          <Link href="/" className="flex flex-col items-center hover:opacity-80 transition-opacity">
            <Image
              src="/images/civiq-logo-hero.webp"
              alt="CIV.IQ"
              width={148}
              height={148}
              className="mb-grid-2"
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
          <p className="text-lg text-gray-600 max-w-lg">
            Information about who represents you is spread across dozens of government websites in
            different formats. CIV.IQ brings it together as a civic utility should: organized,
            accessible, and nonpartisan.
          </p>
        </div>

        {/* What CIV.IQ Provides - Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-grid-4 mb-grid-8">
          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">535</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Members of Congress</h2>
            <p className="text-gray-600 text-sm">
              435 House members and 100 Senators. Voting records, committee assignments, sponsored
              legislation, and plain-language summaries.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">50</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">State Legislatures</h2>
            <p className="text-gray-600 text-sm">
              7,383 state legislators across all 50 states. Bills, votes, committees, governors, and
              attorneys general. State campaign finance is not currently available.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">12</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Intelligence Analyzers</h2>
            <p className="text-gray-600 text-sm">
              Statistical analysis cross-referencing votes, campaign finance, lobbying, and stock
              trades. Every insight carries a confidence score and methodology.
            </p>
          </div>

          <div className="aicher-card p-grid-4">
            <div className="text-3xl font-bold text-black mb-grid-1">18</div>
            <h2 className="text-lg font-semibold text-black mb-grid-2">Government Data Sources</h2>
            <p className="text-gray-600 text-sm">
              Congress.gov, FEC, Census Bureau, Federal Register, Senate lobbying disclosures,
              USASpending, BLS, and more.
            </p>
          </div>
        </div>

        {/* Why CIV.IQ */}
        <div className="mb-grid-8">
          <p className="text-gray-600 max-w-lg">
            Votes, campaign contributions, lobbying filings, committee records, federal spending —
            this data exists in the public record, but it sits in isolated databases that no regular
            citizen has the time or skill to connect. Lobbyists and political consultants connect it
            every day. Citizens cannot. CIV.IQ corrects that asymmetry.
          </p>
          <p className="text-gray-600 max-w-lg mt-grid-3">
            Type in your address and it opens up a whole world of information: who represents you at
            every level, how they vote, the money behind them, and how it all compares to their
            peers. Your address is the key.
          </p>
        </div>

        {/* Coverage Honesty */}
        <div className="mb-grid-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-grid-3">
            Coverage
          </h2>
          <div className="space-y-grid-3">
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Federal:</span>{' '}
              <span className="text-gray-600 text-sm">
                Complete across all wired domains — bills, votes, members, committees, FEC campaign
                finance, lobbying disclosures, federal contracts, and the Federal Register.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">State:</span>{' '}
              <span className="text-gray-600 text-sm">
                All 50 state legislatures via OpenStates (legislators, bills, committees, votes).
                State campaign finance is not currently available — FollowTheMoney.org is in
                maintenance mode during the OpenSecrets merger.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Local:</span>{' '}
              <span className="text-gray-600 text-sm">
                10 pilot cities via Legistar — Austin, Boston, Chicago, Denver, Detroit,
                Minneapolis, Oakland, Philadelphia, Portland, Seattle. Outside this list, local
                routes return &ldquo;data unavailable&rdquo; rather than empty arrays.
              </span>
            </div>
            <div className="text-sm text-gray-500 mt-grid-2">
              Full matrix:{' '}
              <a
                href="https://github.com/civdotiq/civic-intel-hub/blob/main/docs/COVERAGE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                docs/COVERAGE.md
              </a>
            </div>
          </div>
        </div>

        {/* Epistemic Limits */}
        <div className="mb-grid-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-grid-3">
            What This Data Cannot Tell You
          </h2>
          <div className="space-y-grid-3">
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Private talks.</span>{' '}
              <span className="text-gray-600 text-sm">
                Congress members negotiate behind closed doors. You see only the public votes and
                statements.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Bills that never get a vote.</span>{' '}
              <span className="text-gray-600 text-sm">
                Leaders can block bills without a vote. You cannot tell which bills died this way.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">
                How well your representative helps people.
              </span>{' '}
              <span className="text-gray-600 text-sm">
                We show contact info but not how fast or well the office handles your problems.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Who meets with your representative.</span>{' '}
              <span className="text-gray-600 text-sm">
                Lobbying reports list some meetings. Most access leaves no public record.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Which votes matter most.</span>{' '}
              <span className="text-gray-600 text-sm">
                Some votes are symbolic. Others change law. We show all votes the same way.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Staff quality.</span>{' '}
              <span className="text-gray-600 text-sm">
                Most daily work in Congress happens through staff. We have no data on staff
                performance.
              </span>
            </div>
            <div className="border-b border-gray-100 pb-grid-2">
              <span className="font-medium text-black">Whether money changed a vote.</span>{' '}
              <span className="text-gray-600 text-sm">
                We show contributions and votes side by side. We cannot tell you if one caused the
                other.
              </span>
            </div>
          </div>
        </div>

        {/* Data Sources */}
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
            <DataSourceRow
              name="Federal Register"
              description="Rules, regulations, executive orders"
              href="https://www.federalregister.gov/"
            />
            <DataSourceRow
              name="Senate LDA"
              description="Lobbying disclosures"
              href="https://lda.senate.gov/"
            />
            <DataSourceRow
              name="USASpending.gov"
              description="Federal contracts, grants"
              href="https://www.usaspending.gov/"
            />
            <DataSourceRow
              name="Bureau of Labor Statistics"
              description="Employment, wages"
              href="https://www.bls.gov/"
            />
            <DataSourceRow
              name="GovInfo.gov"
              description="Hearing transcripts"
              href="https://www.govinfo.gov/"
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
