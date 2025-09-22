/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { Bill } from '@/types/bill';
import { getBillDisplayStatus } from '@/types/bill';
import { ClientBillContent } from './ClientBillContent';

interface BillPageProps {
  params: Promise<{ billId: string }>;
}

// For SSR, we'll use a simple approach - return null and let the client handle the data fetching
async function getBillData(_billId: string): Promise<Bill | null> {
  // During SSR, just return null to avoid fetch issues
  // The client-side will handle the data fetching
  return null;
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
    openGraph: {
      title,
      description,
      type: 'website',
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
        <div className="aicher-card p-8 mb-8">
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
function BillContent({ billId }: { billId: string }) {
  return (
    <div className="min-h-screen aicher-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/representatives"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Representatives
        </Link>

        {/* Client-side content */}
        <ClientBillContent billId={billId} />
      </div>
    </div>
  );
}

// Main bill page component
export default async function BillPage({ params }: BillPageProps) {
  const { billId } = await params;

  return (
    <Suspense fallback={<BillLoading />}>
      <BillContent billId={billId} />
    </Suspense>
  );
}
