/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';
import { ProfilePageSchema, SpeakableSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import { ContextualFooter, type CommitteeLink } from '@/components/seo/ContextualFooter';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { QuestionSuggestions } from '@/components/questions/QuestionSuggestions';
import { getStateName } from '@/lib/data/us-states';
import {
  getVacancyInfo,
  getSenateVacancy,
  formatVacancyMessage,
} from '@/lib/data/congressional-vacancies';
import {
  buildProfileMetadata,
  getProfileRepresentative as getRepresentativeData,
  type RepresentativeDetails,
} from '@/features/representatives/profile-metadata';

export const runtime = 'nodejs';
export const revalidate = 3600; // ISR: revalidate every hour

// Empty generateStaticParams activates on-demand ISR — without it a
// dynamic-segment route renders per-request and `revalidate` is ignored.
export async function generateStaticParams(): Promise<Array<{ bioguideId: string }>> {
  return [];
}

// Dynamic imports for the profile layouts to reduce initial bundle size
const ProfileRedesign = dynamicImport(
  () =>
    import('@/features/representatives/components/profile-redesign').then(mod => ({
      default: mod.ProfileRedesign,
    })),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="h-12 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-grid-4">
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

/**
 * Server-rendered key facts block for AI citation readiness.
 * Plain semantic HTML — no client JS, no tabs, no interaction required.
 * Crawlers and AI systems get party, state, committees, finance, and contact
 * info without executing JavaScript.
 */
function CitableFacts({
  representative,
  summary,
}: {
  representative: RepresentativeDetails;
  summary: {
    totalRaised?: number;
    financeCycle?: number;
  } | null;
}) {
  const stateName = getStateName(representative.state) || representative.state;
  const chamberFull =
    representative.chamber === 'Senate'
      ? 'United States Senate'
      : 'United States House of Representatives';
  const districtLabel = representative.district
    ? `${stateName}, District ${representative.district}`
    : stateName;

  // Compute tenure. Terms are sorted most-recent-first by getEnhancedRepresentative,
  // so the earliest term sits at the end of the array.
  const terms = representative.terms ?? [];
  const termCount = terms.length;
  const firstElectedYear = terms[terms.length - 1]?.startYear;
  const currentTermStartYear =
    terms[0]?.startYear ?? representative.currentTerm?.start?.split('-')[0];
  const currentTermEndYear = terms[0]?.endYear ?? representative.currentTerm?.end?.split('-')[0];
  const hasTenure = Boolean(firstElectedYear);
  const isFreshman = termCount <= 1 || firstElectedYear === currentTermStartYear;
  const tenureText = !hasTenure
    ? null
    : isFreshman
      ? `In Congress since ${currentTermStartYear} (${termCount} ${termCount === 1 ? 'term' : 'terms'})`
      : `Elected ${firstElectedYear} · current term ${currentTermStartYear}–${currentTermEndYear} · ${termCount} terms total`;

  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const totalRaised = summary?.totalRaised && summary.totalRaised > 0 ? summary.totalRaised : null;
  const financeCycle = summary?.financeCycle;

  return (
    <section
      aria-label={`Key facts about ${representative.name}`}
      data-speakable="rep-facts"
      className="sr-only"
    >
      <dl>
        <div className="flex gap-2">
          <dt className="text-gray-500 shrink-0">Party</dt>
          <dd className="font-medium text-gray-900">{representative.party}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 shrink-0">Represents</dt>
          <dd className="font-medium text-gray-900">{districtLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-gray-500 shrink-0">Chamber</dt>
          <dd className="font-medium text-gray-900">{chamberFull}</dd>
        </div>
        {tenureText && (
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0">In office</dt>
            <dd className="font-medium text-gray-900">{tenureText}</dd>
          </div>
        )}
        {representative.committees && representative.committees.length > 0 && (
          <div className="flex gap-2 sm:col-span-2">
            <dt className="text-gray-500 shrink-0">Committees</dt>
            <dd className="font-medium text-gray-900">
              {representative.committees.map((c, i) => (
                <span key={c.name}>
                  {i > 0 && ', '}
                  {c.id ? (
                    <Link href={`/committee/${c.id}`} className="text-civiq-blue hover:underline">
                      {c.name}
                    </Link>
                  ) : (
                    c.name
                  )}
                  {c.role && c.role !== 'Member' && (
                    <span className="text-gray-500"> ({c.role})</span>
                  )}
                </span>
              ))}
            </dd>
          </div>
        )}
        {totalRaised && (
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0">Total raised</dt>
            <dd className="font-medium text-gray-900">
              {formatCurrency(totalRaised)}
              {financeCycle && <span className="text-gray-500"> ({financeCycle} cycle)</span>}
            </dd>
          </div>
        )}
        {representative.currentTerm?.phone && (
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0">Phone</dt>
            <dd className="font-medium text-gray-900">{representative.currentTerm.phone}</dd>
          </div>
        )}
        {representative.website && (
          <div className="flex gap-2">
            <dt className="text-gray-500 shrink-0">Website</dt>
            <dd className="font-medium text-gray-900">
              <a
                href={representative.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-civiq-blue hover:underline"
              >
                {representative.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            </dd>
          </div>
        )}
      </dl>
      <p className="text-xs text-gray-400 mt-1">
        Source:{' '}
        <a href="https://www.congress.gov" className="hover:underline">
          Congress.gov
        </a>
        {totalRaised ? (
          <>
            {' '}
            and{' '}
            <a href="https://www.fec.gov" className="hover:underline">
              FEC.gov
            </a>
          </>
        ) : null}
      </p>
    </section>
  );
}

function MemberStatusBanner({ representative }: { representative: RepresentativeDetails }) {
  if (!representative.status || representative.status === 'active') return null;

  const vacancy =
    representative.chamber === 'Senate'
      ? representative.currentTerm?.class
        ? getSenateVacancy(
            representative.state,
            String(representative.currentTerm.class) as '1' | '2' | '3'
          )
        : undefined
      : representative.district
        ? getVacancyInfo(representative.state, representative.district)
        : undefined;

  const headlineMap: Record<NonNullable<RepresentativeDetails['status']>, string> = {
    active: '',
    pending_resignation: 'Announced intent to resign',
    resigned: 'No longer serving — resigned',
    expelled: 'No longer serving — expelled',
    deceased: 'Deceased',
    retired: 'No longer serving',
  };

  const isPending = representative.status === 'pending_resignation';
  const borderColor = isPending ? 'border-civiq-amber' : 'border-gray-400';
  const bgColor = isPending ? 'bg-amber-50' : 'bg-gray-50';
  const textColor = isPending ? 'text-civiq-amber' : 'text-gray-900';

  const headline = headlineMap[representative.status];
  const effective = representative.statusEffectiveDate;
  const message = vacancy ? formatVacancyMessage(vacancy) : representative.statusDetail;

  return (
    <div
      role="status"
      aria-label={`Status: ${headline}`}
      className={`container mx-auto px-grid-2 md:px-grid-4 mb-grid-3`}
    >
      <div className={`border-2 ${borderColor} ${bgColor} p-grid-2 md:p-grid-3`}>
        <div className={`text-sm font-semibold uppercase tracking-wide ${textColor}`}>
          {headline}
          {effective ? ` · ${effective}` : ''}
        </div>
        {message && <p className="mt-1 text-sm text-gray-700">{message}</p>}
      </div>
    </div>
  );
}

// Main Server Component - renders immediately with SSR data
export default async function RepresentativeProfilePage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  let bioguideId: string;

  try {
    const resolvedParams = await params;
    bioguideId = resolvedParams.bioguideId;

    if (!bioguideId || typeof bioguideId !== 'string') {
      notFound();
    }
  } catch {
    notFound();
  }

  // Server-side: fetch representative data only (summary loads client-side via SWR
  // to avoid blocking render on slow vote/finance API calls)
  const representative = await getRepresentativeData(bioguideId);

  // Handle fetch errors gracefully - representative data is required
  if (!representative) {
    notFound();
  }

  // Validate essential representative data - be more lenient
  if (!representative) {
    notFound();
  }

  if (!representative.name && !representative.firstName && !representative.lastName) {
    notFound();
  }

  // Set display name if needed
  if (!representative.name && representative.firstName && representative.lastName) {
    representative.name = `${representative.firstName} ${representative.lastName}`;
  }

  // Build identity links for schema. The Congressional Bioguide entry is the
  // authoritative government identifier — it anchors knowledge-graph
  // reconciliation, so it leads regardless of which social links exist.
  const sameAs: string[] = [`https://bioguide.congress.gov/search/bio/${bioguideId}`];
  if (representative.socialMedia?.twitter) {
    sameAs.push(`https://twitter.com/${representative.socialMedia.twitter}`);
  }
  if (representative.socialMedia?.facebook) {
    sameAs.push(`https://facebook.com/${representative.socialMedia.facebook}`);
  }
  if (representative.website) {
    sameAs.push(representative.website);
  }

  // Build committee memberships for schema
  const memberOf = representative.committees?.map(c => ({
    name: c.name,
    url: c.id ? `https://civdotiq.org/committee/${c.id}` : undefined,
  }));

  // Structured data renders in BOTH the hybrid and classic branches — the
  // hybrid preview must never silently drop the page's schema.
  const structuredData = (
    <>
      <ProfilePageSchema
        url={`https://civdotiq.org/representative/${bioguideId}`}
        person={{
          name: representative.name,
          jobTitle: `${representative.role} - ${representative.state}${representative.district ? ` District ${representative.district}` : ''}`,
          description: `${representative.party} ${representative.role} representing ${representative.state} in the U.S. Congress`,
          image: representative.imageUrl,
          worksFor: {
            name:
              representative.chamber === 'Senate'
                ? 'United States Senate'
                : 'United States House of Representatives',
            url: representative.chamber === 'Senate' ? 'https://senate.gov' : 'https://house.gov',
          },
          memberOf,
          sameAs,
          affiliation: representative.party,
          birthDate: representative.bio?.birthday,
          knowsAbout: representative.committees?.map(c => c.name),
        }}
      />
      <SpeakableSchema
        url={`https://civdotiq.org/representative/${bioguideId}`}
        cssSelectors={['[data-speakable="rep-facts"]', '[data-speakable="rep-summary"]']}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Representatives', url: 'https://civdotiq.org/results' },
          { name: representative.name, url: `https://civdotiq.org/representative/${bioguideId}` },
        ]}
      />
    </>
  );

  // Breadcrumb navigation with preserved search context
  const breadcrumbItems = [
    { label: 'Search', href: '/' },
    { label: 'Your Representatives', href: '/results', preserveSearch: true },
    { label: representative.name, href: '#' },
  ];

  // Build committee links for contextual footer
  const committeeLinks: CommitteeLink[] = (representative.committees || [])
    .filter(c => c.id || c.thomas_id)
    .map(committee => ({
      name: committee.name,
      href: `/committee/${committee.id || committee.thomas_id}`,
      role: committee.role,
    }));

  // Server render time — honest ceiling on data age for this page.
  // The route sets `revalidate = 3600`, so the rendered HTML never reflects
  // data older than an hour at delivery time.
  const renderedAt = new Date();

  return (
    <>
      {/* Structured Data for SEO */}
      {structuredData}

      <div className="density-default">
        <div className="container mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <BreadcrumbsWithContext items={breadcrumbItems} className="mb-grid-3" />
          <p className="text-xs text-gray-500 mb-grid-3">
            Data loaded{' '}
            <time dateTime={renderedAt.toISOString()}>
              {renderedAt.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </time>
            . Refreshes hourly from Congress.gov and FEC.gov.{' '}
            <Link href="/methodology" className="text-civiq-blue hover:underline">
              See methodology
            </Link>
            .
          </p>
        </div>

        <MemberStatusBanner representative={representative} />

        {/* Server-rendered key facts for AI citation and crawlers (visually hidden, in DOM for SEO) */}
        <CitableFacts representative={representative} summary={null} />

        <ErrorBoundary>
          <ChunkLoadErrorBoundary>
            <ProfileRedesign representative={representative} />
          </ChunkLoadErrorBoundary>
        </ErrorBoundary>

        {/* Common questions — discovery section after main navigation grid */}
        <div className="bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
            <QuestionSuggestions bioguideId={bioguideId} name={representative.name} />
          </div>
        </div>

        {/* Contextual Footer - SEO navigation without redundancy */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <ContextualFooter
            representativeName={representative.name}
            party={representative.party}
            state={representative.state}
            chamber={representative.chamber}
            committees={committeeLinks}
            totalCommittees={representative.committees?.length}
            dataSource="Congress.gov API"
          />
          <OpenDataStrip
            feedUrl={`/api/feed/member/${bioguideId}`}
            feedLabel="Member Feed"
            apiUrl={`/api/v1/representatives/${bioguideId}`}
          />
        </div>
      </div>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;
  // Card-specific OG variants (?card=/?billId=) are served by the dynamic
  // /share route via middleware rewrite — this ISR route stays query-free.
  return buildProfileMetadata(bioguideId);
}
