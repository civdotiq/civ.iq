/**
 * State Legislator Profile Page
 * Displays detailed information about an individual state legislator
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Crawl-safe by construction: the member comes from the committed roster
 * corpus and nothing on the server path calls OpenStates, so Googlebot walking
 * all 7,420 profiles costs no quota. Bill counts load in the browser from a
 * robots-blocked /api/ route. An id the corpus doesn't hold is a 404.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { SimpleStateLegislatorProfile } from '@/features/state-legislature/components/SimpleStateLegislatorProfile';
import { StateLegislatorProfile } from '@/components/state-officials/StateLegislatorProfile';
import { buildStateLegislatorUrl, buildStateLegislatureUrl } from '@/lib/helpers/url-builders';
import { encodeBase64Url } from '@/lib/url-encoding';
import { ProfilePageSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import { getStateName } from '@/lib/data/us-states';
import {
  formatStateDistrict,
  getLegislatorRoleTitle,
  type EnhancedStateLegislator,
} from '@/types/state-legislature';
import { getLegislator } from './get-legislator';

const BASE_URL = 'https://civdotiq.org';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
  searchParams?: Promise<{ address?: string; v?: string }>;
}

/** "Angela Rigas, Michigan State Representative (District 81)" */
function describe(legislator: EnhancedStateLegislator) {
  const stateName = getStateName(legislator.state) || legislator.state;
  const role = getLegislatorRoleTitle(legislator.state, legislator.chamber);
  const district = formatStateDistrict(legislator.district);
  const path = buildStateLegislatorUrl(legislator.state, legislator.id, legislator.name);
  return { stateName, role, district, path, url: `${BASE_URL}${path}` };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const legislator = await getLegislator(id);

  if (!legislator) {
    return {
      title: 'Legislator Not Found',
      description: 'State legislator profile not found',
    };
  }

  const { stateName, role, district, url } = describe(legislator);
  const title = `${legislator.name}, ${stateName} ${role} (${district})`;

  // Contact first: it is what people searching a legislator's name came for.
  const contact = [
    legislator.phone && `Phone ${legislator.phone}`,
    legislator.email && `email ${legislator.email}`,
  ].filter(Boolean);
  const description =
    `${legislator.name} is the ${stateName} ${role} for ${district}` +
    (legislator.party ? ` (${legislator.party})` : '') +
    '. ' +
    (contact.length > 0 ? `${contact.join(', ')}. ` : '') +
    'Office address, committees, sponsored bills and votes.';

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: `${title} | CIV.IQ`,
      description,
      url,
      siteName: 'CIV.IQ',
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${title} | CIV.IQ`,
      description,
    },
  };
}

export default async function StateLegislatorPage({ params, searchParams }: PageProps) {
  const { state, id } = await params;
  const search = searchParams ? await searchParams : {};

  const legislator = await getLegislator(id);
  if (!legislator) notFound();

  const { stateName, role, district, path, url } = describe(legislator);

  // One URL per member: legacy base64 links, raw ids, a stale name or the
  // wrong state all land on the current slug, keeping the query string.
  if (`/state-legislature/${state}/legislator/${id}` !== path) {
    const query = new URLSearchParams();
    if (search.address) query.set('address', search.address);
    if (search.v) query.set('v', search.v);
    const qs = query.toString();
    permanentRedirect(qs ? `${path}?${qs}` : path);
  }

  const hubUrl = `${BASE_URL}${buildStateLegislatureUrl(legislator.state)}`;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  if (search.v === 'new' || isPreviewEnv) {
    return (
      <StateLegislatorProfile
        legislator={legislator}
        legislatorIdBase64={encodeBase64Url(legislator.id)}
        stateCode={legislator.state}
        stateName={stateName}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfilePageSchema
        url={url}
        person={{
          name: legislator.name,
          jobTitle: `${stateName} ${role}, ${district}`,
          description: `${legislator.party} ${role} representing ${district} in ${stateName}`,
          image: legislator.photo_url ?? undefined,
          worksFor: { name: `${stateName} Legislature`, url: hubUrl },
          affiliation: legislator.party ?? undefined,
          memberOf: legislator.committees?.map(c => ({ name: c.name })),
          sameAs: [
            legislator.contact?.socialMedia?.twitter
              ? `https://twitter.com/${legislator.contact.socialMedia.twitter}`
              : '',
            legislator.contact?.socialMedia?.facebook
              ? `https://facebook.com/${legislator.contact.socialMedia.facebook}`
              : '',
            legislator.links?.[0]?.url ?? '',
          ].filter(Boolean),
          knowsAbout: legislator.committees?.map(c => c.name),
          telephone: legislator.phone,
          email: legislator.email,
          workAddress: legislator.contact?.capitolOffice?.address,
        }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: BASE_URL },
          { name: `${stateName} Legislature`, url: hubUrl },
          { name: legislator.name, url },
        ]}
      />

      <div className="bg-gray-50 border-b-2 border-black py-4">
        <nav
          aria-label="Breadcrumb"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-sm text-gray-600"
        >
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2" aria-hidden="true">
            &rsaquo;
          </span>
          <Link href={buildStateLegislatureUrl(legislator.state)} className="hover:text-civiq-blue">
            {stateName} Legislature
          </Link>
          <span className="mx-2" aria-hidden="true">
            &rsaquo;
          </span>
          <span className="font-medium text-gray-900" aria-current="page">
            {legislator.name}
          </span>
        </nav>
      </div>

      <SimpleStateLegislatorProfile legislator={legislator} fromAddress={search.address} />
    </div>
  );
}
