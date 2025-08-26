/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CommitteeDetailPage } from './components/CommitteeDetailPage';
import { CommitteeAPIResponse } from '@/types/committee';
import logger from '@/lib/logging/simple-logger';

interface PageProps {
  params: Promise<{
    committeeId: string;
  }>;
}

async function getCommitteeData(committeeId: string): Promise<CommitteeAPIResponse | null> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
        ? 'http://localhost:3000'
        : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/committee/${committeeId}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      logger.warn('Failed to fetch committee data', {
        committeeId,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error fetching committee data', error as Error, {
      committeeId,
    });
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { committeeId } = await params;
  const decodedName = committeeId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const data = await getCommitteeData(committeeId);

  const title = data?.committee.name || decodedName;
  const chamber = data?.committee.chamber || 'Committee';

  return {
    title: `${title} | ${chamber} Committee | CIV.IQ`,
    description:
      data?.committee.jurisdiction ||
      `Information about the ${title} committee, including members, leadership, and current activities.`,
    keywords: [
      title,
      'committee',
      'congress',
      'house',
      'senate',
      'legislation',
      'government',
      'committee members',
      'jurisdiction',
    ],
    openGraph: {
      title: `${title} | Committee Info`,
      description: data?.committee.jurisdiction || `Committee information for ${title}`,
      type: 'website',
    },
  };
}

export default async function CommitteePage({ params }: PageProps) {
  const { committeeId } = await params;

  logger.info('Committee page request', { committeeId });

  const data = await getCommitteeData(committeeId);

  if (!data || !data.committee) {
    logger.warn('Committee not found', { committeeId });
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CommitteeDetailPage committee={data.committee} metadata={data.metadata} />
    </div>
  );
}

export async function generateStaticParams() {
  // Generate static params for known committees
  return [
    { committeeId: 'house-committee-on-agriculture' },
    { committeeId: 'senate-committee-on-agriculture-nutrition-and-forestry' },
    { committeeId: 'house-committee-on-appropriations' },
    { committeeId: 'senate-committee-on-appropriations' },
    { committeeId: 'house-committee-on-armed-services' },
    { committeeId: 'senate-committee-on-armed-services' },
    { committeeId: 'house-committee-on-the-judiciary' },
    { committeeId: 'senate-committee-on-the-judiciary' },
    { committeeId: 'house-committee-on-ways-and-means' },
    { committeeId: 'senate-committee-on-finance' },
  ];
}
