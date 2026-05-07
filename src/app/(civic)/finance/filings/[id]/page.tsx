/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Single-filing detail route for FEC committee reports.
 * URL: /finance/filings/{file_number}
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FECFilingDetail, loadFECFilingDetailData } from '@/components/finance/FECFilingDetail';

interface FECFilingPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const FILE_NUMBER_RE = /^\d+$/;

export async function generateMetadata({ params }: FECFilingPageProps): Promise<Metadata> {
  const { id } = await params;
  if (!FILE_NUMBER_RE.test(id)) {
    return { title: 'FEC Filing' };
  }
  const data = await loadFECFilingDetailData(id);
  if (!data) {
    return { title: 'FEC Filing', description: 'Federal campaign finance filing detail.' };
  }
  const period =
    data.reportType && data.reportYear
      ? `${data.reportType} ${data.reportYear}`
      : (data.reportYear?.toString() ?? '');
  const title = `${data.committeeName} — Form ${data.formType} ${period}`.trim();
  const description = `FEC Form ${data.formType} filing for ${data.committeeName} (${data.committeeId}), ${period}. Receipts $${data.totalReceipts.toLocaleString()}, disbursements $${data.totalDisbursements.toLocaleString()}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/finance/filings/${data.fileNumber}`,
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

export default async function FECFilingPage({ params }: FECFilingPageProps) {
  const { id } = await params;
  if (!FILE_NUMBER_RE.test(id)) notFound();

  const data = await loadFECFilingDetailData(id);
  if (!data) notFound();

  return <FECFilingDetail data={data} />;
}
