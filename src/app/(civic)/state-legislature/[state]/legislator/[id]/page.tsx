/**
 * State Legislator Profile Page
 * Displays detailed information about an individual state legislator
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { SimpleStateLegislatorProfile } from '@/features/state-legislature/components/SimpleStateLegislatorProfile';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
}

/**
 * Fetch legislator data from API
 */
async function getLegislator(state: string, id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/state-legislature/${state}/legislator/${id}`;

    logger.info(`[StateLegislatorPage] Fetching legislator from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-store', // Always fetch fresh data for profile pages
    });

    if (!response.ok) {
      logger.error(`[StateLegislatorPage] Failed to fetch legislator: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // API returns { success: true, legislator: {...} }
    if (data.success && data.legislator) {
      logger.info(`[StateLegislatorPage] Successfully fetched legislator: ${data.legislator.name}`);
      return data.legislator;
    }

    logger.error(`[StateLegislatorPage] Invalid API response format`);
    return null;
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
  const legislatorId = decodeBase64Url(id); // Decode Base64 ID
  const legislator = await getLegislator(state, legislatorId);

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
  const legislatorId = decodeBase64Url(id); // Decode Base64 ID
  const legislator = await getLegislator(state, legislatorId);

  if (!legislator) {
    logger.warn(`[StateLegislatorPage] Legislator not found: ${state}/${legislatorId}`);
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gray-50 border-b-2 border-black py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-civiq-blue hover:underline text-sm font-medium">
              ← Back to Search
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href={`/state-legislature/${state}`}
              className="text-civiq-blue hover:underline text-sm font-medium"
            >
              {state.toUpperCase()} Legislature
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SimpleStateLegislatorProfile legislator={legislator} />
      </div>
    </div>
  );
}
