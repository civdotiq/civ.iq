/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
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
import {
  currentLegislatorsAvailable,
  getEnhancedRepresentative,
} from './services/congress.service';
import { commonName } from './utils/common-name';
import { chamberName, formerMemberFacts, isFormerMember } from './utils/former-member';
import { partyAbbreviation, partyAdjective } from '@/lib/party-label';
import { memberProfileMetaDescription } from '@/lib/seo/meta-descriptions';
import { getStateName } from '@/lib/data/us-states';
import { longDate } from '@/lib/seo/answer-first';

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
  /** congress-legislators cross-references, keyed by Bioguide ID. */
  ids?: { wikipedia?: string; wikidata?: string };
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
    chamber?: string;
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
  if (!bioguideId || typeof bioguideId !== 'string') {
    notFound();
  }

  // Direct service call - no HTTP networking during SSR
  const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase()).catch(() => null);
  if (enhancedData) return enhancedData;

  // Empty means "no such member" only when the member list was read. If it
  // couldn't be, error.tsx answers with a server error, which search engines
  // retry; a 404 would tell them a real member's page is gone.
  if (await currentLegislatorsAvailable()) notFound();
  throw new Error(`Member list unavailable; could not look up ${bioguideId}`);
});

const VALID_CARD_TYPES = ['profile', 'money', 'vote', 'alignment', 'legislation'] as const;

export async function buildProfileMetadata(
  bioguideId: string,
  opts: { card?: string; billId?: string } = {}
): Promise<Metadata> {
  try {
    // Fetch representative data for rich metadata
    const representative = await getProfileRepresentative(bioguideId);

    // The name the member goes by ("Bernie Sanders"), which is what people search for
    const name = commonName(representative);

    if (isFormerMember(representative.status)) {
      return formerMemberMetadata(bioguideId, name, representative);
    }
    const title = `${name} (${partyAbbreviation(representative.party)}-${representative.state})`;
    const chamberLabel =
      representative.chamber === 'Senate'
        ? 'Senator'
        : representative.role === 'Delegate' || representative.role === 'Resident Commissioner'
          ? representative.role
          : 'Representative';
    const description = memberProfileMetaDescription({
      party: partyAdjective(representative.party),
      title: chamberLabel,
      name,
      state: representative.state,
      district: representative.chamber === 'House' ? representative.district : null,
      committeeCount: representative.committees?.length,
    });
    const url = `https://civdotiq.org/representative/${bioguideId.toUpperCase()}`;

    // Build OG image URL - default to profile card, override with specific card type
    const cardType = opts.card;
    const isValidCard =
      cardType && VALID_CARD_TYPES.includes(cardType as (typeof VALID_CARD_TYPES)[number]);
    const effectiveCardType = isValidCard ? cardType : 'profile';
    let ogImageUrl = `https://civdotiq.org/api/card/${bioguideId}?type=${effectiveCardType}`;
    // v=2: the photo-led JPEG card. A new URL makes X/Facebook/Slack, which
    // cache og:image by URL, fetch it instead of the old PNG.
    if (effectiveCardType === 'profile') ogImageUrl += '&v=2';
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
        title: `${name} - Federal ${representative.role}`,
        description,
        url,
        siteName: 'CIV.IQ',
        type: 'profile',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${name}, ${partyAdjective(representative.party)} ${chamberLabel}`,
          },
        ],
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

/**
 * Former members: who they were and when they served. Those who served in a
 * Congress the site still serves stay indexable (their votes and bills are
 * on the site); everyone else is noindexed.
 */
function formerMemberMetadata(
  bioguideId: string,
  name: string,
  representative: RepresentativeDetails
): Metadata {
  const facts = formerMemberFacts(representative);
  const stateName = getStateName(representative.state) || representative.state;
  const service = facts.service.map(r => `the ${chamberName(r.chamber)} ${r.start}–${r.end}`);
  const left = facts.leftOffice ? longDate(facts.leftOffice) : null;
  const description = [
    `${name} served ${stateName} in ${service.join(' and ')}.`,
    left ? `Left office ${left}.` : null,
    'CIV.IQ covers current members of Congress.',
  ]
    .filter(Boolean)
    .join(' ');
  const url = `https://civdotiq.org/representative/${bioguideId.toUpperCase()}`;
  const title = `${name}, former member of Congress`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'CIV.IQ', type: 'profile' },
    ...(facts.hasRecordOnSite ? {} : { robots: { index: false, follow: true } }),
  };
}
