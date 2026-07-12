/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared data fetcher and metadata builder for the representative profile
 * page and its /share variant. The canonical profile URL is ISR-cached and
 * cannot read query strings, so card-specific OG images are served by the
 * dynamic /share route through a middleware rewrite — both routes compose
 * their metadata here.
 */

import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getEnhancedRepresentative } from './services/congress.service';

export interface RepresentativeDetails {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  votingMember: boolean;
  role: 'Representative' | 'Senator' | 'Delegate' | 'Resident Commissioner';
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
    thomas_id?: string;
    id?: string;
  }>;
  fullName?: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
  };
  currentTerm?: {
    start: string;
    end: string;
    office?: string;
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
    rssUrl?: string;
    stateRank?: 'junior' | 'senior';
    class?: number;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };
  status?: 'active' | 'pending_resignation' | 'resigned' | 'expelled' | 'deceased' | 'retired';
  statusDetail?: string;
  statusEffectiveDate?: string | null;
}

// Server-side data fetching with direct service import (no HTTP networking).
// Wrapped in React cache() so generateMetadata and the page body share a
// single fetch per request instead of running the full pipeline twice.
export const getProfileRepresentative = cache(async function getProfileRepresentative(
  bioguideId: string
): Promise<RepresentativeDetails> {
  try {
    if (!bioguideId || typeof bioguideId !== 'string') {
      notFound();
    }

    // Direct service call - no HTTP networking during SSR
    const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase());

    if (!enhancedData) {
      notFound();
    }

    return enhancedData;
  } catch {
    notFound();
  }
});

const VALID_CARD_TYPES = ['profile', 'money', 'vote', 'alignment', 'legislation'] as const;

export async function buildProfileMetadata(
  bioguideId: string,
  opts: { card?: string; billId?: string } = {}
): Promise<Metadata> {
  try {
    // Fetch representative data for rich metadata
    const representative = await getProfileRepresentative(bioguideId);

    const title = `${representative.name} (${representative.party}-${representative.state})`;
    const chamberLabel = representative.chamber === 'Senate' ? 'Senator' : 'Representative';
    const districtLabel = representative.district ? `, District ${representative.district}` : '';
    const committeeNote = representative.committees?.length
      ? `. Serves on ${representative.committees.length} committee${representative.committees.length === 1 ? '' : 's'}`
      : '';
    const description = `${representative.party} ${chamberLabel} ${representative.name} (${representative.state}${districtLabel}) — voting record, campaign finance, and legislative activity in the 119th Congress${committeeNote}.`;
    const url = `https://civdotiq.org/representative/${bioguideId}`;

    // Build OG image URL - default to profile card, override with specific card type
    const cardType = opts.card;
    const isValidCard =
      cardType && VALID_CARD_TYPES.includes(cardType as (typeof VALID_CARD_TYPES)[number]);
    const effectiveCardType = isValidCard ? cardType : 'profile';
    let ogImageUrl = `https://civdotiq.org/api/card/${bioguideId}?type=${effectiveCardType}`;
    if (effectiveCardType === 'vote' && opts.billId) {
      ogImageUrl += `&billId=${encodeURIComponent(opts.billId)}`;
    }

    return {
      title,
      description,
      alternates: {
        canonical: url,
        types: {
          'application/atom+xml': `/api/feed/member/${bioguideId}`,
        },
      },
      openGraph: {
        title: `${representative.name} - Federal ${representative.role}`,
        description,
        url,
        siteName: 'CIV.IQ',
        type: 'profile',
        images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      },
      twitter: {
        card: 'summary_large_image' as const,
        title,
        description,
        site: '@civdotiq',
        images: [ogImageUrl],
      },
    };
  } catch {
    // Fallback metadata if representative data fetch fails
    return {
      title: `Representative ${bioguideId}`,
      description: `View detailed information about federal representative ${bioguideId}`,
    };
  }
}
