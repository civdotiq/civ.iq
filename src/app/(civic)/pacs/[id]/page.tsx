/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * /pacs/[id] — permanent redirect to the shipped FEC committee page.
 *
 * The committee profile at /influence/[committeeId] already carries the
 * same FEC data (totals, recipients with profile links, vote tracing), so
 * this route only validates the id and forwards. Malformed ids are a
 * real 404 rather than a redirect to a 404.
 */

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

const COMMITTEE_ID_RE = /^C\d{8}$/;

export default async function PACProfileRoute({ params }: PageProps) {
  const { id } = await params;
  const upperId = (id ?? '').toUpperCase();

  if (!COMMITTEE_ID_RE.test(upperId)) {
    notFound();
  }

  permanentRedirect(`/influence/${upperId}`);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const upperId = (id ?? '').toUpperCase();
  if (!COMMITTEE_ID_RE.test(upperId)) {
    return {
      title: 'Committee not found',
      description: 'FEC committee ids start with C followed by eight digits.',
      robots: { index: false, follow: false },
    };
  }
  return {
    title: `PAC ${upperId}`,
    alternates: { canonical: `https://civdotiq.org/influence/${upperId}` },
    robots: { index: false, follow: true },
  };
}
