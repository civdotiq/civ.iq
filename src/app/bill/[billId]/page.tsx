/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus } from '@/types/bill';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { ClientBillContent } from './ClientBillContent';
import { Breadcrumb, SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';
import { LegislationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

interface BillPageProps {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ from?: string; name?: string }>;
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
  const bill = await getBillData(billId);

  const title = bill ? `${bill.number}: ${bill.title}` : `Bill ${billId}`;
  const description = bill
    ? `Learn about ${bill.number} - ${bill.title}. Current status: ${getBillDisplayStatus(bill.status.current)}. Sponsored by ${bill.sponsor.representative.name}.`
    : `Information about bill ${billId}`;

  return {
    title: `${title} | CIV.IQ`,
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
      card: 'summary',
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
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="aicher-card p-4 sm:p-8 mb-8">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Content skeleton */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="aicher-card p-6">
              <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="aicher-card p-6">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
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
  const { from: fromBioguideId, name: fromRepName } = await searchParams;

  return (
    <Suspense fallback={<BillLoading />}>
      <BillContent billId={billId} fromBioguideId={fromBioguideId} fromRepName={fromRepName} />
    </Suspense>
  );
}
