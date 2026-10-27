/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import type { SenateVoteFreshness as Freshness } from '@/features/representatives/services/senate-vote-freshness';
import { SenateVoteFreshness } from './SenateVoteFreshness';

async function fetchFreshness(url: string): Promise<Freshness | null> {
  const response = await fetch(url);
  return response.ok ? ((await response.json()) as Freshness) : null;
}

function isSenate(chamber: string | null | undefined): boolean {
  return chamber?.toLowerCase() === 'senate';
}

/** Freshness of the stored Senate votes; null for House members. One shared
 *  request per page (SWR dedupes the key). */
export function useSenateVoteFreshness(chamber: string | null | undefined): Freshness | null {
  const { data } = useSWR(isSenate(chamber) ? '/api/senate-vote-freshness' : null, fetchFreshness, {
    revalidateOnFocus: false,
  });
  return data ?? null;
}

/** SenateVoteFreshness for client-rendered vote lists; nothing for House members. */
export function SenateVoteFreshnessClient({
  chamber,
  className,
}: {
  chamber: string | null | undefined;
  className?: string;
}) {
  const freshness = useSenateVoteFreshness(chamber);
  if (!isSenate(chamber)) return null;
  return <SenateVoteFreshness freshness={freshness} className={className} />;
}
