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
 * Follows PlainLanguage.gov guidelines: short sentences,
 * common words, active voice, no jargon without explanation.
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

interface DataSource {
  name: string;
  covers: string;
  url: string;
}

interface DataSourceGroup {
  label: string;
  sources: DataSource[];
}

const CORE_SOURCES: DataSource[] = [
  {
    name: 'Congress.gov API',
    covers: 'Bills, members, committees, votes, hearings (Library of Congress)',
    url: 'https://api.congress.gov',
  },
  {
    name: 'FEC API',
    covers: 'Campaign contributions, expenditures, PAC filings (Federal Election Commission)',
    url: 'https://api.open.fec.gov',
  },
  {
    name: 'Senate LDA',
    covers: 'Lobbying disclosure filings (U.S. Senate)',
    url: 'https://lda.senate.gov/api/v1',
  },
  {
    name: 'Census Geocoder',
    covers: 'Address-to-district lookup, demographics (U.S. Census Bureau)',
    url: 'https://www.census.gov/data/developers.html',
  },
];

const SOURCE_GROUPS: DataSourceGroup[] = [
  {
    label: 'Regulations and policy',
    sources: [
      {
        name: 'Federal Register API',
        covers: 'Rules, proposed rules, executive orders',
        url: 'https://www.federalregister.gov/developers/api/v1',
      },
      {
        name: 'Regulations.gov API',
        covers: 'Regulatory documents, dockets, public comments',
        url: 'https://api.regulations.gov',
      },
    ],
  },
  {
    label: 'Financial disclosure',
    sources: [
      {
        name: 'Senate Stock Disclosures',
        covers: 'Stock trades by senators, via Senate Stock Watcher',
        url: 'https://efdsearch.senate.gov',
      },
      {
        name: 'House Stock Disclosures',
        covers: 'Stock trades by representatives (STOCK Act)',
        url: 'https://disclosures-clerk.house.gov',
      },
      {
        name: 'SEC EDGAR',
        covers: 'Company filings, ticker resolution',
        url: 'https://www.sec.gov/edgar',
      },
    ],
  },
  {
    label: 'Spending and economy',
    sources: [
      {
        name: 'USASpending.gov API',
        covers: 'Federal contracts and grants by district',
        url: 'https://api.usaspending.gov',
      },
      {
        name: 'Treasury Fiscal Data',
        covers: 'Federal debt, revenue, spending',
        url: 'https://fiscaldata.treasury.gov',
      },
      {
        name: 'FRED API',
        covers: 'Economic indicators by state',
        url: 'https://fred.stlouisfed.org/docs/api/',
      },
      {
        name: 'BLS API',
        covers: 'Employment and wage data',
        url: 'https://www.bls.gov/developers/',
      },
    ],
  },
  {
    label: 'Environment, energy, and safety',
    sources: [
      {
        name: 'EPA ECHO',
        covers: 'Environmental enforcement actions, facility violations',
        url: 'https://echo.epa.gov',
      },
      {
        name: 'OSHA Enforcement',
        covers: 'Workplace safety inspections, violations',
        url: 'https://www.osha.gov/data',
      },
      {
        name: 'EIA API',
        covers: 'State energy production and consumption',
        url: 'https://api.eia.gov',
      },
      {
        name: 'NOAA Climate API',
        covers: 'Climate normals, severe weather events',
        url: 'https://www.ncdc.noaa.gov/cdo-web/',
      },
      {
        name: 'NHTSA API',
        covers: 'Vehicle recalls, safety complaints',
        url: 'https://api.nhtsa.gov',
      },
      {
        name: 'FEMA OpenAPI',
        covers: 'Disaster declarations, assistance data',
        url: 'https://www.fema.gov/about/openfema/api',
      },
    ],
  },
  {
    label: 'Health, education, and housing',
    sources: [
      {
        name: 'NIH Reporter',
        covers: 'Research grants and funded projects',
        url: 'https://reporter.nih.gov',
      },
      {
        name: 'CMS Provider Data',
        covers: 'Hospital and nursing home quality data',
        url: 'https://data.cms.gov',
      },
      {
        name: 'College Scorecard',
        covers: 'College costs, outcomes, demographics',
        url: 'https://collegescorecard.ed.gov',
      },
      {
        name: 'HUD API',
        covers: 'Fair market rents, income limits',
        url: 'https://www.huduser.gov/hudapi/',
      },
    ],
  },
  {
    label: 'Consumer protection, justice, and crime',
    sources: [
      {
        name: 'CFPB Complaints',
        covers: 'Consumer financial complaints by company',
        url: 'https://www.consumerfinance.gov/data-research/consumer-complaints/',
      },
      {
        name: 'FDIC API',
        covers: 'Bank institution data, bank failures',
        url: 'https://api.fdic.gov',
      },
      {
        name: 'FBI Crime Data',
        covers: 'Uniform Crime Reporting statistics by state',
        url: 'https://cde.ucr.cjis.gov',
      },
      {
        name: 'CourtListener API',
        covers: 'Federal court dockets, case information',
        url: 'https://www.courtlistener.com',
      },
    ],
  },
  {
    label: 'State government and biographical',
    sources: [
      {
        name: 'Open States API',
        covers: 'State legislators, state bills, state votes',
        url: 'https://openstates.org',
      },
      {
        name: 'Wikidata',
        covers: 'Biographical data, state executives, judiciary',
        url: 'https://www.wikidata.org',
      },
    ],
  },
];

const TOTAL_SOURCES =
  CORE_SOURCES.length + SOURCE_GROUPS.reduce((sum, g) => sum + g.sources.length, 0);

function SourceList({ sources }: { sources: DataSource[] }) {
  return (
    <ul className="space-y-1">
      {sources.map(source => (
        <li key={source.name} className="flex gap-2 type-sm">
          <span className="text-gray-400 select-none">&mdash;</span>
          <span>
            <a
              href={source.url}
              className="text-[#3ea2d4] hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              {source.name}
            </a>
            <span className="text-gray-600"> &mdash; {source.covers}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

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
          How CIV.IQ handles campaign finance data, what the research says, where our data comes
          from, and what we do not claim.
        </p>

        {/* ── Section 1: Campaign Finance Framing ──────────────── */}
        <section className="mb-12" aria-labelledby="campaign-finance">
          <h2 id="campaign-finance" className="text-2xl font-bold mb-4">
            How CIV.IQ presents campaign finance data
          </h2>

          <div className="space-y-4 type-base text-gray-700 leading-relaxed">
            <p>
              CIV.IQ shows campaign donations alongside voting records. We do this so you can see
              the full picture. We do not claim that donations caused any vote.
            </p>

            <p>
              Party membership and personal beliefs predict how a legislator votes far better than
              campaign money. Ansolabehere, de Figueiredo, and Snyder (2003) found that
              contributions explain a &ldquo;minuscule fraction&rdquo; of voting after you account
              for party and ideology.
              <sup>
                <a href="#ref-ansolabehere" className="text-[#3ea2d4]">
                  1
                </a>
              </sup>
            </p>

            <p>
              The strongest finding about campaign money is about <em>access</em>, not votes. Kalla
              and Broockman (2016) found that donors get three to four times more meetings with
              elected officials than non-donors. Money opens doors. It does not necessarily change
              minds.
              <sup>
                <a href="#ref-kalla" className="text-[#3ea2d4]">
                  2
                </a>
              </sup>
            </p>

            <p>
              There is also a chicken-and-egg problem. Donors tend to give money to legislators who
              already agree with them. This makes it look like money changed a vote, when the
              legislator was already going to vote that way. Researchers call this{' '}
              <strong>strategic giving</strong>, and it is the biggest challenge in studying
              campaign finance.
            </p>

            <div className="border-l-[3px] border-[#3ea2d4] pl-4 py-2 bg-gray-50">
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
            Five ways campaign money relates to legislation
          </h2>

          <p className="type-base text-gray-700 mb-6 leading-relaxed">
            Researchers have found five ways campaign money connects to what legislators do. We rank
            them by how strong the evidence is, from strongest to weakest.
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
                Donors get more meetings with legislators. Kalla and Broockman (2016) ran a
                controlled experiment and found donors were three to four times more likely to get a
                meeting.
                <sup>
                  <a href="#ref-kalla" className="text-[#3ea2d4]">
                    2
                  </a>
                </sup>{' '}
                This is the best-supported finding in campaign finance research.
              </p>
            </li>

            {/* Pathway 2 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">02</span>
                <h3 className="text-lg font-bold">Committee work</h3>
                <span className="type-xs font-medium text-[#3ea2d4] aicher-heading-wide">
                  STRONG
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Donations match up with how hard a member works on bills in committee that affect
                donors. Hall and Wayman (1990) found this pattern.
                <sup>
                  <a href="#ref-hall" className="text-[#3ea2d4]">
                    3
                  </a>
                </sup>{' '}
                Hojnacki and Kimball (2001) found the same thing.
                <sup>
                  <a href="#ref-hojnacki" className="text-[#3ea2d4]">
                    4
                  </a>
                </sup>{' '}
                Money may affect effort in committee, not how someone votes on the floor.
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
                Lobbying groups spend money to get certain issues in front of Congress. Furnas et
                al. (2023) studied how lobbying shapes which issues get attention.
                <sup>
                  <a href="#ref-furnas" className="text-[#3ea2d4]">
                    5
                  </a>
                </sup>{' '}
                McKay (2018) looked at how fundraising connects to legislative outcomes.
                <sup>
                  <a href="#ref-mckay" className="text-[#3ea2d4]">
                    6
                  </a>
                </sup>{' '}
                This is harder to measure than votes because you cannot see what <em>did not</em>{' '}
                make it onto the agenda.
              </p>
            </li>

            {/* Pathway 4 */}
            <li className="border-2 border-gray-200 p-4">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="type-sm font-bold text-gray-400 aicher-heading-wide">04</span>
                <h3 className="text-lg font-bold">Strategic giving</h3>
                <span className="type-xs font-medium text-amber-600 aicher-heading-wide">
                  THE CATCH
                </span>
              </div>
              <p className="type-base text-gray-700 leading-relaxed">
                Donors give to legislators who already agree with them. When a legislator votes the
                way a donor wants, you can&rsquo;t always tell why. Did the money change the vote?
                Or did the donor just pick someone who already agreed? This chicken-and-egg problem
                is the biggest challenge in campaign finance research.
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
                find no real effect after accounting for party and ideology.
                <sup>
                  <a href="#ref-ansolabehere" className="text-[#3ea2d4]">
                    1
                  </a>
                </sup>{' '}
                A few narrow exceptions exist in specific industries, but the overall evidence is
                weak.
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
              CIV.IQ pulls data from {TOTAL_SOURCES} official government and public data sources. We
              never make up data or use estimates. When a source is unavailable, we tell you and
              show the date of the last available data.
            </p>
          </div>

          {/* Core sources — always visible */}
          <div className="mt-6">
            <h3 className="type-sm font-bold aicher-heading-wide mb-3">CORE SOURCES</h3>
            <SourceList sources={CORE_SOURCES} />
          </div>

          {/* Grouped sources — expandable */}
          <div className="mt-6 space-y-2">
            <h3 className="type-sm font-bold aicher-heading-wide mb-3">
              {TOTAL_SOURCES - CORE_SOURCES.length} MORE SOURCES BY CATEGORY
            </h3>
            {SOURCE_GROUPS.map(group => (
              <details key={group.label} className="border-b border-gray-200">
                <summary className="py-2 type-sm font-medium cursor-pointer hover:text-[#3ea2d4] select-none">
                  {group.label}
                  <span className="text-gray-400 ml-2">({group.sources.length})</span>
                </summary>
                <div className="pb-3 pl-4">
                  <SourceList sources={group.sources} />
                </div>
              </details>
            ))}
          </div>

          {/* Analysis pipeline */}
          <div className="mt-8 space-y-4 type-base text-gray-700 leading-relaxed">
            <h3 className="text-lg font-bold">How we analyze data</h3>

            <p>Every analysis starts with math, not AI. The numbers come first.</p>

            <ul className="space-y-2 ml-4">
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  Every insight has a <strong>confidence score</strong> from 0 to 1. We hide
                  anything below 0.6.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  We require <strong>minimum sample sizes</strong> before showing results: at least
                  10 votes per sector, 4 quarters for trends, and 3 trades for stock analysis.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  We always compare a legislator to their <strong>peers</strong> in the same
                  chamber, party, or committee. This shows patterns in context, not in isolation.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  AI-generated summaries use plain language at an 8th-grade reading level or below.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-gray-400 select-none">&mdash;</span>
                <span>
                  We match records across sources by linking names, IDs, and organizations across
                  FEC filings, Congress.gov, Senate lobbying filings, and SEC records. This lets you
                  see the connections between money, votes, and lobbying in one place.
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
                We show donations and votes together so you can see the full picture. We use words
                like &ldquo;received,&rdquo; &ldquo;associated with,&rdquo; and &ldquo;correlated
                with.&rdquo; We do not use &ldquo;influenced,&rdquo; &ldquo;caused,&rdquo; or
                &ldquo;resulted in&rdquo; when describing money and votes.
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
              <h3 className="font-bold mb-1">We do not take sides.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                CIV.IQ presents data without opinion. We do not rate legislators as good or bad. We
                do not tell you how to vote. We show public records and let you draw your own
                conclusions.
              </p>
            </div>

            <div className="border-2 border-gray-200 p-4">
              <h3 className="font-bold mb-1">We do not cherry-pick.</h3>
              <p className="type-base text-gray-700 leading-relaxed">
                We do not select time periods or comparisons to make any legislator look better or
                worse. Every comparison follows the same rules for all members.
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
              title="More than Mere Access: An Experiment on Moneyed Interests, Information Provision, and Legislative Action in Congress"
              journal="Political Research Quarterly, 76(1), 348-364"
              url="https://doi.org/10.1177/10659129221098743"
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
            methods improve as research advances. For questions about our methodology, see our{' '}
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
