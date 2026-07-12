/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Share-target variant of the profile page. Middleware rewrites
 * /representative/{id}?card=... here so social crawlers get card-specific
 * OG images while the canonical profile URL stays ISR-cached. Renders the
 * exact same profile content; never linked directly, noindexed, and
 * canonicalized to the main profile URL.
 */

import type { Metadata } from 'next';
import { buildProfileMetadata } from '@/features/representatives/profile-metadata';
import RepresentativeProfilePage from '../page';

export const runtime = 'nodejs';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ bioguideId: string }>;
  searchParams: Promise<{ card?: string; billId?: string }>;
}): Promise<Metadata> {
  const { bioguideId } = await params;
  const { card, billId } = await searchParams;
  const metadata = await buildProfileMetadata(bioguideId, { card, billId });
  return { ...metadata, robots: { index: false, follow: true } };
}

export default function ShareCardProfilePage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  return <RepresentativeProfilePage params={params} />;
}
