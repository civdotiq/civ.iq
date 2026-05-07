/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Single-filing detail route for Senate LDA disclosures.
 * URL: /lobby/filings/{filing_uuid}
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  LobbyFilingDetail,
  loadLobbyFilingDetailData,
} from '@/components/lobbying/LobbyFilingDetail';

interface LobbyFilingPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const UUID_RE = /^[a-f0-9-]{8,}$/i;

export async function generateMetadata({ params }: LobbyFilingPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return { title: 'Lobbying Filing' };
  }
  const data = await loadLobbyFilingDetailData(id);
  if (!data) {
    return {
      title: 'Lobbying Filing',
      description: 'Senate LDA filing detail.',
    };
  }
  const title = `${data.registrant.name} — ${data.filingTypeDisplay} (${data.filingYear})`;
  const description = `Senate LDA filing by ${data.registrant.name} for ${data.client.name}, ${data.filingPeriod} ${data.filingYear}. ${data.lobbyists.length} lobbyists, ${data.issues.length} issues.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/lobby/filings/${id}`,
      siteName: 'CIV.IQ',
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  };
}

export default async function LobbyFilingPage({ params }: LobbyFilingPageProps) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const data = await loadLobbyFilingDetailData(id);
  if (!data) notFound();

  return <LobbyFilingDetail data={data} />;
}
