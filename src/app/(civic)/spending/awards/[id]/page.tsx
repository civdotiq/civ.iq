/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal award detail route — server component.
 *
 * Validates the USASpending generated_unique_award_id format and renders
 * the award file. Malformed ids are a real 404 (no route-level
 * loading.tsx sits above this page, so notFound() commits the status).
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { SpendingContractPage } from '@/components/spending/SpendingContractPage';

interface PageProps {
  params: Promise<{ id: string }>;
}

const AWARD_ID_RE = /^[A-Z0-9_\-]{8,200}$/i;

export default async function SpendingAwardRoute({ params }: PageProps) {
  const { id } = await params;
  const awardId = (id ?? '').trim();

  if (!AWARD_ID_RE.test(awardId)) {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Federal Spending', url: 'https://civdotiq.org/spending' },
          {
            name: `Award ${awardId}`,
            url: `https://civdotiq.org/spending/awards/${awardId}`,
          },
        ]}
      />
      <SpendingContractPage awardId={awardId} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const awardId = (id ?? '').trim();
  if (!AWARD_ID_RE.test(awardId)) {
    return {
      title: 'Award not found',
      description: 'USASpending award ids are alphanumeric, may include underscores and hyphens.',
      robots: { index: false, follow: false },
    };
  }
  const title = `Federal award ${awardId} — file`;
  const description = `USASpending award ${awardId}: awarder, recipient, period of performance, obligation schedule, and peer awards.`;
  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/spending/awards/${awardId}` },
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/spending/awards/${awardId}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@civdotiq',
    },
  };
}
