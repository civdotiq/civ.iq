/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cache } from 'react';
import { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus } from '@/types/bill';
import { lookupBill, type BillLookup } from '@/lib/services/bill.service';
import { parseBillSlug } from '@/lib/data/route-slugs';
import { ClientBillContent } from './ClientBillContent';
import { Breadcrumb } from '@/components/shared/ui/Breadcrumb';
import { LegislationSchema, BreadcrumbSchema, SpeakableSchema } from '@/components/seo/JsonLd';
import { BillDetail } from '@/components/bills/BillDetail';

interface BillPageProps {
  params: Promise<{ billId: string }>;
  searchParams: Promise<{ from?: string; name?: string; v?: string }>;
}

/**
 * One Congress.gov lookup per request, shared by metadata and the page.
 * A missing API key counts as unavailable, never as "no such bill".
 */
const getBillLookup = cache(async (billId: string): Promise<BillLookup> => {
  if (!process.env.CONGRESS_API_KEY) return { status: 'unavailable' };
  try {
    return await lookupBill(billId);
  } catch {
    return { status: 'unavailable' };
  }
});

/**
 * The bill as sent to the browser. Bill text runs to megabytes (the NDAA's is
 * 3.3MB) behind a collapsed section, so the page sends only its version and
 * date; the text loads when someone opens that section.
 */
function withoutTextBody(bill: Bill): Bill {
  return bill.fullText ? { ...bill, fullText: { ...bill.fullText, content: '' } } : bill;
}

/**
 * Official bill titles run to 190+ characters, and search results cut a title
 * off near 60. Keep whole words; the full title stays in the page's h1.
 */
function shortenAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.-]+$/, '')}…`;
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
  const lookup = await getBillLookup(parsed.canonical);
  const bill = lookup.status === 'found' ? lookup.bill : null;

  const title = bill
    ? `${bill.number}: ${shortenAtWord(bill.shortTitle || bill.title, 70)}`
    : `Bill ${parsed.canonical}`;
  const description = bill
    ? `Learn about ${bill.number} - ${bill.title}. Current status: ${getBillDisplayStatus(bill.status.current)}. Sponsored by ${bill.sponsor.representative.name}.`
    : `Information about bill ${billId}`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://civdotiq.org/bill/${parsed.canonical}`,
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

// Bill content component. `bill` is null only while Congress.gov is
// unreachable; the browser then retries the fetch itself.
function BillContent({
  billId,
  bill,
  fromBioguideId,
  fromRepName,
}: {
  billId: string;
  bill: Bill | null;
  fromBioguideId?: string;
  fromRepName?: string;
}) {
  return (
    <div className="min-h-screen aicher-background density-detailed">
      {/* Structured Data for SEO */}
      {bill && (
        <LegislationSchema
          name={`${bill.number}: ${bill.title}`}
          legislationIdentifier={bill.number}
          description={bill.summary?.text
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()}
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
        <Breadcrumb
          currentPage={bill?.number ?? `Bill ${billId}`}
          fromBioguideId={fromBioguideId}
          fromRepName={fromRepName}
          customItems={
            fromBioguideId && fromRepName ? [] : [{ label: 'Legislation', href: '/legislation' }]
          }
        />

        <ClientBillContent billId={billId} initialBill={bill ? withoutTextBody(bill) : undefined} />
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

  // Awaited before anything streams, so the status code is still ours to set:
  // only Congress.gov's own 404 becomes a 404 page.
  const lookup = await getBillLookup(parsed.canonical);
  if (lookup.status === 'not_found') notFound();
  const bill = lookup.status === 'found' ? lookup.bill : null;

  if (useRedesign) {
    if (!bill) throw new Error(`Bill ${parsed.canonical} unavailable from Congress.gov`);
    return <BillDetail bill={bill} />;
  }

  return (
    <BillContent
      billId={parsed.canonical}
      bill={bill}
      fromBioguideId={fromBioguideId}
      fromRepName={fromRepName}
    />
  );
}
