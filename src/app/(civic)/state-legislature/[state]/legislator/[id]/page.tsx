/**
 * State Legislator Profile Page
 * Displays detailed information about an individual state legislator
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SimpleStateLegislatorProfile } from '@/features/state-legislature/components/SimpleStateLegislatorProfile';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
}

/**
 * Fetch legislator data directly from core service
 * No longer makes HTTP calls to localhost - uses service layer directly
 */
async function getLegislator(state: string, base64Id: string) {
  try {
    // Decode Base64 ID to get OCD ID
    const legislatorId = decodeBase64Url(base64Id);

    logger.info(`[StateLegislatorPage] Fetching legislator: ${state}/${legislatorId}`);

    // Call core service directly (no HTTP overhead)
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state,
      legislatorId
    );

    if (legislator) {
      logger.info(`[StateLegislatorPage] Successfully fetched legislator: ${legislator.name}`);
    } else {
      logger.warn(`[StateLegislatorPage] Legislator not found: ${state}/${legislatorId}`);
    }

    return legislator;
  } catch (error) {
    logger.error(`[StateLegislatorPage] Error fetching legislator:`, error);
    return null;
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, id } = await params;
  // Pass Base64-encoded ID to getLegislator (it constructs the API URL)
  const legislator = await getLegislator(state, id);

  if (!legislator) {
    return {
      title: 'Legislator Not Found | CIV.IQ',
      description: 'State legislator profile not found',
    };
  }

  const chamber = legislator.chamber === 'upper' ? 'State Senator' : 'State Representative';
  const title = `${legislator.name} - ${chamber} | CIV.IQ`;
  const description = `View ${legislator.name}'s profile, sponsored bills, voting record, and contact information. ${chamber} representing District ${legislator.district} in ${state.toUpperCase()}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

/**
 * State Legislator Profile Page Component
 */
export default async function StateLegislatorPage({ params }: PageProps) {
  const { state, id } = await params;
  // Pass Base64-encoded ID to getLegislator (it decodes and fetches from core service)
  const legislator = await getLegislator(state, id);

  if (!legislator) {
    // getLegislator already logs the error with decoded ID
    notFound();
  }

  // Breadcrumb navigation with preserved search context
  const breadcrumbItems = [
    { label: 'Search', href: '/' },
    { label: 'Your Representatives', href: '/results', preserveSearch: true },
    { label: legislator.name, href: '#' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Breadcrumbs */}
      <div className="bg-gray-50 border-b-2 border-black py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <BreadcrumbsWithContext items={breadcrumbItems} />
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SimpleStateLegislatorProfile legislator={legislator} />
      </div>
    </div>
  );
}
