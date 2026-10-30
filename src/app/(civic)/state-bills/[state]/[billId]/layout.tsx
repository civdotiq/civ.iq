/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema, LegislationSchema } from '@/components/seo/JsonLd';
import { getStateName, isValidStateCode } from '@/lib/data/us-states';
import { decodeBase64Url } from '@/lib/url-encoding';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';
import {
  StateLegislatureCoreService,
  type StateBillLookup,
} from '@/services/core/state-legislature-core.service';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ state: string; billId: string }>;
}

/** The address carries an Open States bill ID, base64url-encoded ("ocd-bill/<uuid>"). */
const OCD_BILL_ID = /^ocd-bill\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Whether the bill exists, once per request for metadata and layout. An
 * address that isn't an Open States bill ID is "not found" without a request
 * (/state-bills/mi/fake-bill used to render "FAKE-BILL — Michigan Bill").
 * Shares the bill API's cache key, so the page's own fetch then hits cache.
 */
const getBillLookup = cache(async (state: string, billId: string): Promise<StateBillLookup> => {
  if (!isValidStateCode(state)) return { status: 'not_found' };
  let ocdId: string;
  try {
    ocdId = decodeBase64Url(billId);
  } catch {
    return { status: 'not_found' };
  }
  if (!OCD_BILL_ID.test(ocdId)) return { status: 'not_found' };
  return StateLegislatureCoreService.lookupStateBill(state, ocdId);
});

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { state, billId } = await params;
  const lookup = await getBillLookup(state, billId);
  if (lookup.status === 'not_found') return { title: 'State bill not found' };
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();
  const url = `https://civdotiq.org/state-bills/${state.toLowerCase()}/${billId}`;
  if (lookup.status === 'unavailable') {
    // The page shows its own error state; it must not be indexed meanwhile.
    return { title: `${stateName} bill`, robots: { index: false, follow: true } };
  }
  const { identifier } = lookup.bill;

  return {
    title: `${identifier} — ${stateName} Bill`,
    description: `Details, sponsors, and status for ${identifier} in the ${stateName} state legislature.`,
    alternates: { canonical: url },
    openGraph: {
      images: SITE_OG_IMAGES,
      title: `${identifier} — ${stateName} Bill | CIV.IQ`,
      description: `Details, sponsors, and status for ${identifier} in the ${stateName} state legislature.`,
      url,
      siteName: 'CIV.IQ',
      type: 'website',
    },
  };
}

export default async function StateBillLayout({ children, params }: LayoutProps) {
  const { state, billId } = await params;
  const lookup = await getBillLookup(state, billId);
  if (lookup.status === 'not_found') notFound();
  if (lookup.status === 'unavailable') return <>{children}</>;

  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();
  const { identifier } = lookup.bill;
  const url = `https://civdotiq.org/state-bills/${state}/${billId}`;

  return (
    <>
      <LegislationSchema
        name={`${identifier} — ${stateName} bill`}
        legislationIdentifier={identifier}
        url={url}
        jurisdiction={{ name: stateName, type: 'State' }}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: stateName, url: `https://civdotiq.org/states/${state}` },
          { name: 'Bills', url: `https://civdotiq.org/state-bills/${state}` },
          { name: identifier, url },
        ]}
      />
      {children}
    </>
  );
}
