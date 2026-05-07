/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus } from '@/types/bill';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { parseBillSlug } from '@/lib/data/route-slugs';
import { ClientBillContent } from './ClientBillContent';
import { Breadcrumb, SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { LegislationSchema, BreadcrumbSchema, SpeakableSchema } from '@/components/seo/JsonLd';
import { BillDetail } from '@/components/bills/BillDetail';

interface BillPageProps {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ from?: string; name?: string; v?: string }>;
}

async function getBillData(billId: string): Promise<Bill | null> {
  try {
    if (!process.env.CONGRESS_API_KEY) return null;
    return await fetchBillFromCongress(billId);
  } catch {
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: BillPageProps): Promise<Metadata> {
  const { billId } = await params;
  const parsed = parseBillSlug(billId);
  if (parsed.kind !== 'canonical') {
    // Recoverable and invalid cases never render metadata; the page handler
    // redirects or 404s before the shell is emitted.
    return {};
  }
  const bill = await getBillData(parsed.canonical);

  const title = bill ? `${bill.number}: ${bill.title}` : `Bill ${parsed.canonical}`;
  const description = bill
    ? `Learn about ${bill.number} - ${bill.title}. Current status: ${getBillDisplayStatus(bill.status.current)}. Sponsored by ${bill.sponsor.representative.name}.`
    : `Information about bill ${billId}`;

  return {
    title,
    description,
    alternates: {
      types: {
        'application/atom+xml': `/api/feed/bill/${billId}`,
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// Loading component for bill data
function BillLoading() {
  return (
    <div className="min-h-screen aicher-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingState fullPage message="Loading bill details..." />
      </div>
    </div>
  );
}

// Bill content component
async function BillContent({
  billId,
  fromBioguideId,
  fromRepName,
}: {
  billId: string;
  fromBioguideId?: string;
  fromRepName?: string;
}) {
  const bill = await getBillData(billId);

  return (
    <div className="min-h-screen aicher-background density-detailed">
      {/* Structured Data for SEO */}
      {bill && (
        <LegislationSchema
          name={`${bill.number}: ${bill.title}`}
          legislationIdentifier={bill.number}
          description={bill.summary?.text}
          datePublished={bill.introducedDate}
          legislationDate={bill.introducedDate}
          legislationPassedBy={
            bill.status.current === 'enacted'
              ? 'United States Congress'
              : bill.status.current === 'passed_house'
                ? 'United States House of Representatives'
                : bill.status.current === 'passed_senate'
                  ? 'United States Senate'
                  : undefined
          }
          sponsor={{
            name: bill.sponsor.representative.name,
            url: `https://civdotiq.org/representative/${bill.sponsor.representative.bioguideId}`,
          }}
          legislationType={bill.type === 'hr' || bill.type === 's' ? 'Bill' : 'Resolution'}
          url={`https://civdotiq.org/bill/${billId}`}
          mainEntityOfPage={`https://civdotiq.org/bill/${billId}`}
        />
      )}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Legislation', url: 'https://civdotiq.org/legislation' },
          {
            name: bill ? bill.number : `Bill ${billId}`,
            url: `https://civdotiq.org/bill/${billId}`,
          },
        ]}
      />
      {bill && (
        <SpeakableSchema
          url={`https://civdotiq.org/bill/${billId}`}
          cssSelectors={['[data-speakable="bill-summary"]']}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        {fromBioguideId && fromRepName ? (
          <Breadcrumb
            currentPage={`Bill ${billId}`}
            fromBioguideId={fromBioguideId}
            fromRepName={fromRepName}
          />
        ) : (
          <SimpleBreadcrumb />
        )}

        {/* Client-side content */}
        <ClientBillContent billId={billId} />
      </div>
    </div>
  );
}

// Main bill page component
export default async function BillPage({ params, searchParams }: BillPageProps) {
  const { billId } = await params;
  const { from: fromBioguideId, name: fromRepName, v } = await searchParams;

  const parsed = parseBillSlug(billId);
  if (parsed.kind === 'invalid') notFound();
  if (parsed.kind === 'recoverable') {
    permanentRedirect(`/bill/${parsed.canonical}`);
  }

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    const bill = await getBillData(parsed.canonical);
    if (!bill) notFound();
    return <BillDetail bill={bill} />;
  }

  return (
    <Suspense fallback={<BillLoading />}>
      <BillContent
        billId={parsed.canonical}
        fromBioguideId={fromBioguideId}
        fromRepName={fromRepName}
      />
    </Suspense>
  );
}
