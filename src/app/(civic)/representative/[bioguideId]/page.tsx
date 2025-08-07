/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import SimpleRepresentativePage from './simple-page';

export const dynamic = 'force-dynamic';

export default async function RepresentativePage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;

  // Use client-side fetching to avoid SSR URL issues
  return <SimpleRepresentativePage bioguideId={bioguideId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;

  return {
    title: `Representative ${bioguideId} | CIV.IQ`,
    description: `View detailed information about federal representative ${bioguideId}`,
  };
}
