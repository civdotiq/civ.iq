/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Who is my state representative in [State]?" — rendered on the server from
 * the committed roster corpus, so crawling the 52 hubs makes no OpenStates
 * call. A code we hold no roster for is a real 404.
 */

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  BreadcrumbSchema,
  FAQPageSchema,
  GovernmentOrganizationSchema,
} from '@/components/seo/JsonLd';
import {
  StateLegislaturePage,
  loadStateLegislaturePageData,
} from '@/components/state-officials/StateLegislaturePage';
import { StateHubPage } from '@/components/state-hub/StateHubPage';
import { loadStateHub, type StateHubData } from '@/lib/state-hub/load-state-hub';

const BASE_URL = 'https://civdotiq.org';

interface PageProps {
  params: Promise<{ state: string }>;
  searchParams: Promise<{ v?: string }>;
}

// Canonical lives on the page, not the layout, so the legislator, committee
// and vote pages below don't inherit the hub's URL.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params;
  const data = await loadStateHub(state);
  if (!data) return { title: 'State not found', robots: { index: false } };

  const url = `${BASE_URL}/state-legislature/${data.stateCode.toLowerCase()}`;
  return {
    title: data.copy.title,
    description: data.copy.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${data.copy.title} | CIV.IQ`,
      description: data.copy.description,
      url,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

function HubSchemas({ data }: { data: StateHubData }) {
  const code = data.stateCode.toLowerCase();
  const url = `${BASE_URL}/state-legislature/${code}`;
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: BASE_URL },
          { name: 'States', url: `${BASE_URL}/states` },
          { name: data.stateName, url: `${BASE_URL}/states/${code}` },
          { name: 'Legislature', url },
        ]}
      />
      <GovernmentOrganizationSchema
        name={data.legislatureName}
        description={`State legislators, committees, bills, and votes for ${data.stateName}.`}
        url={url}
        parentOrganization={
          data.stateCode === 'DC' ? 'District of Columbia' : `State of ${data.stateName}`
        }
        areaServed={data.stateName}
      />
      <FAQPageSchema question={data.copy.h1} answer={data.copy.lede} />
    </>
  );
}

export default async function StateLegislatureRoute({ params, searchParams }: PageProps) {
  const { state } = await params;
  const { v } = await searchParams;
  const data = await loadStateHub(state);
  if (!data) notFound();

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  return (
    <>
      <HubSchemas data={data} />
      {useRedesign ? (
        <Suspense fallback={<RedesignLoading stateCode={data.stateCode} />}>
          <RedesignedLegislatureContent stateCode={data.stateCode} />
        </Suspense>
      ) : (
        <StateHubPage data={data} />
      )}
    </>
  );
}

async function RedesignedLegislatureContent({ stateCode }: { stateCode: string }) {
  const pageData = await loadStateLegislaturePageData(stateCode);
  return <StateLegislaturePage data={pageData} />;
}

function RedesignLoading({ stateCode }: { stateCode: string }) {
  return (
    <div style={{ padding: '32px 36px 56px', maxWidth: 1280, margin: '0 auto' }}>
      <p
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        Loading {stateCode} legislature…
      </p>
    </div>
  );
}
