/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';

/**
 * Methodology page — explains how CIV.IQ analyzes civic data,
 * with academic citations and explicit statements about what
 * we do and do not claim.
 *
 * Target reading level: Flesch-Kincaid grade 8 or below.
 */

interface CitationProps {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  url?: string;
}

function Citation({ id, authors, year, title, journal, url }: CitationProps) {
  return (
    <li id={`ref-${id}`} className="type-sm text-gray-600 leading-relaxed">
      {authors} ({year}).{' '}
      {url ? (
        <a
          href={url}
          className="text-[#3ea2d4] hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          &ldquo;{title}.&rdquo;
        </a>
      ) : (
        <>&ldquo;{title}.&rdquo;</>
      )}{' '}
      <em>{journal}.</em>
    </li>
  );
}

const DATA_SOURCES = [
  {
    name: 'Congress.gov API',
    agency: 'Library of Congress',
    covers: 'Bills, members, committees, votes, hearings',
    url: 'https://api.congress.gov',
  },
  {
    name: 'FEC API',
    agency: 'Federal Election Commission',
    covers: 'Campaign contributions, expenditures, PAC filings',
    url: 'https://api.open.fec.gov',
  },
  {
    name: 'Senate LDA',
    agency: 'U.S. Senate',
    covers: 'Lobbying disclosure filings',
    url: 'https://lda.senate.gov/api/v1',
  },
  {
    name: 'Federal Register API',
    agency: 'National Archives',
    covers: 'Rules, proposed rules, executive orders',
    url: 'https://www.federalregister.gov/developers/api/v1',
  },
  {
    name: 'USASpending.gov API',
    agency: 'U.S. Treasury',
    covers: 'Federal contracts and grants by district',
    url: 'https://api.usaspending.gov',
  },
  {
    name: 'Census Bureau ACS',
    agency: 'U.S. Census Bureau',
    covers: 'Demographics, geocoding for district lookup',
    url: 'https://www.census.gov/data/developers.html',
  },
  {
    name: 'FRED API',
    agency: 'Federal Reserve Bank of St. Louis',
    covers: 'Economic indicators by state',
    url: 'https://fred.stlouisfed.org/docs/api/',
  },
  {
    name: 'SEC EDGAR',
    agency: 'Securities and Exchange Commission',
    covers: 'Company filings, ticker resolution',
    url: 'https://www.sec.gov/edgar',
  },
  {
    name: 'Senate/House Disclosures',
    agency: 'U.S. Senate & House Clerk',
    covers: 'Stock trades by members of Congress',
    url: 'https://efdsearch.senate.gov',
  },
  {
    name: 'Open States',
    agency: 'Civic Eagle / Open States',
    covers: 'State legislators, state bills, state votes',
    url: 'https://openstates.org',
  },
  {
    name: 'EPA ECHO',
    agency: 'Environmental Protection Agency',
    covers: 'Environmental enforcement actions',
    url: 'https://echo.epa.gov',
  },
  {
    name: 'BLS API',
    agency: 'Bureau of Labor Statistics',
    covers: 'Employment and wage data',
    url: 'https://www.bls.gov/developers/',
  },
] as const;

export default function MethodologyPage() {
  return (
    <main className="min-h-screen px-4 pt-8 pb-16 bg-white">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Methodology</span>
        </nav>

        <h1 className="text-4xl font-bold mb-4">Methodology</h1>
        <p className="type-lg text-gray-600 mb-12 max-w-2xl">
          How CIV.IQ handles campaign finance data, what the research says, and what we do and do
          not claim.
        </p>

        {/* ── Section 1: Campaign Finance Framing ──────────────── */}
        <section className="mb-12" aria-labelledby="campaign-finance">
          <h2 id="campaign-finance" className="text-2xl font-bold mb-4">
            How CIV.IQ presents campaign finance data
          </h2>

          <div className="space-y-4 type-base text-gray-700 leading-relaxed">
            <p>
              CIV.IQ shows campaign donations alongside voting records. We do this for transparency.
              We do not claim that donations caused any vote.
            </p>

            <p>
              Research shows that party membership and personal beliefs predict how a legislator
              votes far better than campaign money. A 2003 study by Ansolabehere, de Figueiredo, and
              Snyder found that contributions explain a &ldquo;minuscule fraction&rdquo; of voting
              behavior after accounting for party and ideology.
              <sup>
                <a href="#ref-ansolabehere" className="text-[#3ea2d4]">
                  1
                </a>
              </sup>
            </p>

            <p>
              The strongest research finding about campaign money is about <em>access</em>, not
              votes. A 2016 study by Kalla and Broockman found that donors get three to four times
              more meetings with elected officials than non-donors. Money opens doors. It does not
              necessarily change minds.
              <sup>
                <a href="#ref-kalla" className="text-[#3ea2d4]">
                  2
                </a>
              </sup>
            </p>

            <p>
              A major challenge in this research is <strong>strategic giving</strong>. Donors tend
              to give money to legislators who already agree with them. This creates a pattern that
              looks like money changed a vote, when in fact the legislator was already going to vote
              that way.
            </p>

            <div className="border-l-3 border-[#3ea2d4] pl-4 py-2 bg-gray-50">
              <p className="font-medium text-gray-900">
                CIV.IQ presents donations alongside votes for transparency. We do not claim that
                donations caused votes.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 2: Five Pathways ─────────────────────────── */}
        <section className="mb-12" aria-labelledby="pathways">
          <h2 id="pathways" className="text-2xl font-bold mb-4">
            Five pathways of campaign finance activity
          </h2>

          <p className="type-base text-gray-700 mb-6 leading-relaxed">
            Researchers have identified five ways campaign money relates to what legislators do. We
            rank them by how strong the evidence is, from strongest to weakest.
          </p>

          <ol className="space-y-6">
            {/* Pathway 1 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">01</span>
                <h3 className="text-lg font-bold">Access</h3>
                <span className="type-xs font-medium text-[#3ea2d4] aicher-heading-wide">
                  STRONGEST
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Donors get more meetings with legislators. Kalla and Broockman (2016) showed that
                donors were three to four times more likely to get a meeting than non-donors.
                <sup>
                  <a href="#ref-kalla" className="text-[#3ea2d4]">
                    2
                  </a>
                </sup>{' '}
                This is the most well-supported finding in campaign finance research.
              </p>
            </li>

            {/* Pathway 2 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">02</span>
                <h3 className="text-lg font-bold">Committee gatekeeping</h3>
                <span className="type-xs font-medium text-[#3ea2d4] aicher-heading-wide">
                  STRONG
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Money correlates with how actively a member works in committee on bills that affect
                donors. Hall and Wayman (1990) found this pattern.
                <sup>
                  <a href="#ref-hall" className="text-[#3ea2d4]">
                    3
                  </a>
                </sup>{' '}
                Hojnacki and Kimball (2001) confirmed it.
                <sup>
                  <a href="#ref-hojnacki" className="text-[#3ea2d4]">
                    4
                  </a>
                </sup>{' '}
                Money may affect how much effort a legislator puts into committee work, not how they
                vote on the floor.
              </p>
            </li>

            {/* Pathway 3 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">03</span>
                <h3 className="text-lg font-bold">Agenda-setting</h3>
                <span className="type-xs font-medium text-gray-400 aicher-heading-wide">
                  MODERATE
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Lobbying organizations spend money to get certain issues onto the legislative
                agenda. Furnas et al. (2023)
                <sup>
                  <a href="#ref-furnas" className="text-[#3ea2d4]">
                    5
                  </a>
                </sup>{' '}
                and McKay (2018)
                <sup>
                  <a href="#ref-mckay" className="text-[#3ea2d4]">
                    6
                  </a>
                </sup>{' '}
                studied this pathway. It is harder to measure than votes because &ldquo;what did not
                happen&rdquo; is invisible.
              </p>
            </li>

            {/* Pathway 4 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">04</span>
                <h3 className="text-lg font-bold">Strategic giving</h3>
                <span className="type-xs font-medium text-amber-600 aicher-heading-wide">
                  THE CONFOUND
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Donors give to legislators who already agree with them. This is the biggest
                challenge in campaign finance research. When a legislator votes in line with a
                donor&rsquo;s interests, it is usually impossible to tell whether the money changed
                the vote or the donor simply picked a like-minded legislator. This is called the{' '}
                <strong>endogeneity problem</strong>.
              </p>
            </li>

            {/* Pathway 5 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">05</span>
                <h3 className="text-lg font-bold">Direct vote-buying</h3>
                <span className="type-xs font-medium text-gray-400 aicher-heading-wide">
                  WEAKEST
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                The idea that a donation flips a specific vote has very little support. Most studies
                find no significant effect after controlling for party and ideology.
                <sup>
                  <a href="#ref-ansolabehere" className="text-[#3ea2d4]">
                    1
                  </a>
                </sup>{' '}
                Narrow exceptions exist in specific industries, but the overall evidence is weak.
              </p>
            </li>
          </ol>
        </section>

        {/* ── Section 3: Data Sources & Methodology ────────────── */}
        <section className="mb-12" aria-labelledby="data-sources">
          <h2 id="data-sources" className="text-2xl font-bold mb-4">
            Data sources and methodology
          </h2>

          <div className="space-y-4 type-base text-gray-700 leading-relaxed">
            <p>
              CIV.IQ uses only official government data sources. We never use mock or estimated
              data. If a source is unavailable, we say so.
            </p>
          </div>

          {/* Data source table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 pr-4 type-sm font-bold aicher-heading-wide">
                    SOURCE
                  </th>
                  <th className="text-left py-2 pr-4 type-sm font-bold aicher-heading-wide">
                    AGENCY
                  </th>
                  <th className="text-left py-2 type-sm font-bold aicher-heading-wide">COVERS</th>
                </tr>
              </thead>
              <tbody>
                {DATA_SOURCES.map(source => (
                  <tr key={source.name} className="border-b border-gray-200">
                    <td className="py-2 pr-4 type-sm">
                      <a
                        href={source.url}
                        className="text-[#3ea2d4] hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.name}
                      </a>
                    </td>
                    <td className="py-2 pr-4 type-sm text-gray-600">{source.agency}</td>
                    <td className="py-2 type-sm text-gray-600">{source.covers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Analysis pipeline */}
          <div className="mt-8 space-y-4 type-base text-gray-700 leading-relaxed">
            <h3 className="text-lg font-bold">How we analyze data</h3>

            <p>Our analysis follows a statistics-first approach.</p>

            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>Every analyzer computes numbers before any AI text is generated.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  Every insight carries a <strong>confidence score</strong> from 0 to 1. Insights
                  below 0.6 are not shown.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  <strong>Minimum sample sizes</strong>: 10 votes per sector, 4 quarters for trend
                  analysis, 3 trades for stock analysis.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  We compare every legislator to their <strong>peer group</strong> (same chamber,
                  same party, or same committee) so that patterns are shown in context.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>AI-generated text is written at an 8th-grade reading level or below.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  We link records across data sources using <strong>entity resolution</strong>{' '}
                  &mdash; matching names, IDs, and organizations across FEC, Congress.gov, Senate
                  LDA, and SEC filings.
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* ── Section 4: What We Do NOT Claim ──────────────────── */}
        <section className="mb-12" aria-labelledby="no-claims">
          <h2 id="no-claims" className="text-2xl font-bold mb-4">
            What CIV.IQ does not claim
          </h2>

          <div className="space-y-4">
            <div className="border-2 border-gray-200 p-4">
              <h3 className="font-bold mb-1">We do not claim donations caused votes.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                We show donations and votes together so citizens can see the full picture. We use
                words like &ldquo;received,&rdquo; &ldquo;associated with,&rdquo; and
                &ldquo;correlated with.&rdquo; We never say &ldquo;influenced,&rdquo;
                &ldquo;caused,&rdquo; or &ldquo;resulted in.&rdquo;
              </p>
            </div>

            <div className="border-2 border-gray-200 p-4">
              <h3 className="font-bold mb-1">We do not claim lobbying is improper.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                Lobbying is protected by the First Amendment. We show lobbying filings because they
                are public records, not because lobbying is wrong.
              </p>
            </div>

            <div className="border-2 border-gray-200 p-4">
              <h3 className="font-bold mb-1">We do not editorialize.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                CIV.IQ presents data without opinion. We do not rate legislators as good or bad. We
                do not recommend how to vote. We show public records and let citizens draw their own
                conclusions.
              </p>
            </div>

            <div className="border-2 border-gray-200 p-4">
              <h3 className="font-bold mb-1">We do not cherry-pick.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                We do not select timeframes or comparisons to make any legislator look better or
                worse. Every comparison uses consistent rules across all members.
              </p>
            </div>
          </div>
        </section>

        {/* ── References ───────────────────────────────────────── */}
        <section className="mb-12 border-t-2 border-gray-200 pt-8" aria-labelledby="references">
          <h2 id="references" className="text-2xl font-bold mb-4">
            References
          </h2>

          <ol className="space-y-3 list-decimal list-inside">
            <Citation
              id="ansolabehere"
              authors="Ansolabehere, S., de Figueiredo, J. M., & Snyder, J. M."
              year={2003}
              title="Why Is There So Little Money in U.S. Politics?"
              journal="Journal of Economic Perspectives, 17(1), 105-130"
              url="https://doi.org/10.1257/089533003321164976"
            />
            <Citation
              id="kalla"
              authors="Kalla, J. L. & Broockman, D. E."
              year={2016}
              title="Campaign Contributions Facilitate Access to Congressional Officials: A Randomized Field Experiment"
              journal="American Journal of Political Science, 60(3), 545-558"
              url="https://doi.org/10.1111/ajps.12180"
            />
            <Citation
              id="hall"
              authors="Hall, R. L. & Wayman, F. W."
              year={1990}
              title="Buying Time: Moneyed Interests and the Mobilization of Bias in Congressional Committees"
              journal="American Political Science Review, 84(3), 797-820"
              url="https://doi.org/10.2307/1962767"
            />
            <Citation
              id="hojnacki"
              authors="Hojnacki, M. & Kimball, D. C."
              year={2001}
              title="PAC Contributions and Lobbying Contacts in Congressional Committees"
              journal="Political Research Quarterly, 54(1), 161-180"
              url="https://doi.org/10.1177/106591290105400109"
            />
            <Citation
              id="furnas"
              authors="Furnas, A. C., LaPira, T. M., Hertel-Fernandez, A., Drutman, L., & Kosar, K. R."
              year={2023}
              title="The People&rsquo;s Lobby? Lobbying and Representation in the U.S. Congress"
              journal="American Political Science Review, 117(4), 1424-1441"
            />
            <Citation
              id="mckay"
              authors="McKay, A."
              year={2018}
              title="Fundraising for Favors? Linking Lobbyist-Bundled Campaign Contributions to Legislative Outcomes"
              journal="Political Research Quarterly, 71(2), 379-391"
              url="https://doi.org/10.1177/1065912917735178"
            />
          </ol>
        </section>

        {/* ── Footer Note ──────────────────────────────────────── */}
        <div className="p-4 bg-gray-50 border-2 border-gray-200">
          <p className="type-sm text-gray-600">
            This page was last updated April 2026. CIV.IQ is open-source civic infrastructure. Our
            analysis methods evolve as research advances. For questions about our methodology, see
            our{' '}
            <a
              href="https://github.com/civic-intel-hub/civic-intel-hub"
              className="text-[#3ea2d4] hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              source code
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
