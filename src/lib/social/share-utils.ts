/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Social Sharing Utilities
 *
 * Generates share URLs and tweet text for representative data
 * Following Rams principle: "As little design as possible"
 */

export type ShareSection =
  | 'overview'
  | 'finance'
  | 'voting'
  | 'legislation'
  | 'committees'
  | 'alignment'
  | 'district'
  | 'card-profile'
  | 'card-money'
  | 'card-vote'
  | 'card-alignment'
  | 'card-legislation';

export interface ShareData {
  representative: {
    name: string;
    party: string;
    state: string;
    bioguideId: string;
    chamber?: 'House' | 'Senate';
    district?: string;
  };
  section: ShareSection;
  stats?: {
    // Finance stats
    totalRaised?: number;
    individualPercent?: number;
    pacPercent?: number;
    topIndustry?: string;
    topIndustryAmount?: number;

    // Voting stats
    partyAlignment?: number;
    votesAgainstParty?: number;
    totalVotes?: number;
    peerAverageAlignment?: number;

    // Legislative stats
    billsSponsored?: number;
    billsEnacted?: number;
    topAreas?: string[];

    // Committee stats
    committeeCount?: number;
    leadershipRoles?: string[];
  };
}

/**
 * Generate full URL with section anchor
 */
export function generateShareUrl(bioguideId: string, section: ShareSection): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://civdotiq.org';
  const path = `/representative/${bioguideId}`;

  // Card sections use ?card= query param instead of anchor
  const cardTypeMap: Partial<Record<ShareSection, string>> = {
    'card-profile': 'profile',
    'card-money': 'money',
    'card-vote': 'vote',
    'card-alignment': 'alignment',
    'card-legislation': 'legislation',
  };

  const cardType = cardTypeMap[section];
  if (cardType) {
    return `${baseUrl}${path}?card=${cardType}`;
  }

  // Map sections to anchor IDs
  const sectionAnchors: Record<string, string> = {
    overview: '',
    finance: '#campaign-finance',
    voting: '#voting-record',
    legislation: '#legislation',
    committees: '#committees',
    alignment: '#party-alignment',
    district: '#district',
  };

  return `${baseUrl}${path}${sectionAnchors[section] || ''}`;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format representative title
 */
function formatRepTitle(rep: ShareData['representative']): string {
  const { name, party, state, chamber, district } = rep;

  if (chamber === 'Senate') {
    return `Sen. ${name} (${party}-${state})`;
  }

  if (district) {
    return `Rep. ${name} (${party}-${state}-${district})`;
  }

  return `${name} (${party}-${state})`;
}

/**
 * Generate tweet text based on section and data
 */
export function generateTweetText(data: ShareData): string {
  const { representative, section, stats } = data;
  const repTitle = formatRepTitle(representative);
  const url = generateShareUrl(representative.bioguideId, section);

  switch (section) {
    case 'finance': {
      if (!stats?.totalRaised) {
        return `${repTitle} campaign finance data\n\nReal government data via @civdotiq\n${url}`;
      }

      const parts = [
        `${repTitle} campaign finance:`,
        `• ${formatCurrency(stats.totalRaised)} raised`,
      ];

      if (stats.individualPercent !== undefined) {
        parts.push(`• ${stats.individualPercent}% from individuals`);
      }

      if (stats.topIndustry && stats.topIndustryAmount) {
        parts.push(`• Top: ${stats.topIndustry} (${formatCurrency(stats.topIndustryAmount)})`);
      }

      parts.push('', 'Real government data via @civdotiq', url);
      return parts.join('\n');
    }

    case 'voting':
    case 'alignment': {
      if (!stats?.partyAlignment) {
        return `${repTitle} voting record\n\nReal government data via @civdotiq\n${url}`;
      }

      const parts = [`${repTitle} voting record:`, `• ${stats.partyAlignment}% party alignment`];

      if (stats.votesAgainstParty) {
        parts.push(`• ${stats.votesAgainstParty} votes against party`);
      }

      if (stats.peerAverageAlignment != null) {
        const diff = Math.round(stats.partyAlignment) - Math.round(stats.peerAverageAlignment);
        if (diff > 0) {
          parts.push(`• ${diff}% above party average`);
        } else if (diff < 0) {
          parts.push(`• ${Math.abs(diff)}% below party average`);
        } else {
          parts.push('• At party average');
        }
      }

      parts.push('', 'Transparency via @civdotiq', url);
      return parts.join('\n');
    }

    case 'legislation': {
      if (!stats?.billsSponsored) {
        return `${repTitle} legislative activity\n\nReal government data via @civdotiq\n${url}`;
      }

      const parts = [
        `${repTitle} legislative activity:`,
        `• ${stats.billsSponsored} bills sponsored`,
      ];

      if (stats.billsEnacted !== undefined) {
        parts.push(`• ${stats.billsEnacted} became law`);
      }

      if (stats.topAreas && stats.topAreas.length > 0) {
        parts.push(`• Focus: ${stats.topAreas.slice(0, 2).join(', ')}`);
      }

      parts.push('', 'Track Congress via @civdotiq', url);
      return parts.join('\n');
    }

    case 'committees': {
      if (!stats?.committeeCount) {
        return `${repTitle} committee assignments\n\nReal government data via @civdotiq\n${url}`;
      }

      const parts = [`${repTitle} committees:`, `• ${stats.committeeCount} committee assignments`];

      if (stats.leadershipRoles && stats.leadershipRoles.length > 0) {
        parts.push(`• Leadership: ${stats.leadershipRoles[0]}`);
      }

      parts.push('', 'Track Congress via @civdotiq', url);
      return parts.join('\n');
    }

    case 'card-profile': {
      return `${repTitle} trading card\n\nCampaign finance, voting records, and legislative activity from official sources\n\n${url}`;
    }

    case 'card-money': {
      if (!stats?.totalRaised) {
        return `${repTitle} campaign finance card\n\nReal government data via @civdotiq\n${url}`;
      }
      return `${repTitle} campaign finance card:\n\n${formatCurrency(stats.totalRaised)} raised${stats.individualPercent !== undefined ? ` (${stats.individualPercent}% from individuals)` : ''}\n\nReal government data via @civdotiq\n${url}`;
    }

    case 'card-vote': {
      return `${repTitle} vote card\n\nSee how they voted on key legislation\n\n${url}`;
    }

    case 'card-alignment': {
      if (!stats?.partyAlignment) {
        return `${repTitle} party alignment card\n\nReal government data via @civdotiq\n${url}`;
      }
      return `${repTitle} party alignment card:\n\n${stats.partyAlignment}% party alignment\n\nReal government data via @civdotiq\n${url}`;
    }

    case 'card-legislation': {
      if (!stats?.billsSponsored) {
        return `${repTitle} legislation card\n\nReal government data via @civdotiq\n${url}`;
      }
      return `${repTitle} legislation card:\n\n${stats.billsSponsored} bills sponsored\n\nReal government data via @civdotiq\n${url}`;
    }

    case 'overview':
    case 'district':
    default: {
      return `${repTitle} - Federal representative data\n\nCampaign finance, voting records, and legislative activity from official sources\n\n${url}`;
    }
  }
}

/**
 * Generate a short title for platforms that need a separate title field (Reddit, Email, Native Share)
 */
export function generateShareTitle(data: ShareData): string {
  const repTitle = formatRepTitle(data.representative);
  const sectionName = getSectionDisplayName(data.section);
  return `${repTitle} — ${sectionName} | CIV.IQ`;
}

/**
 * Generate X.com share URL
 */
export function generateTwitterShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://x.com/intent/post?text=${encodedText}`;
}

/**
 * Generate Bluesky share URL
 */
export function generateBlueskyShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://bsky.app/intent/compose?text=${encodedText}`;
}

/**
 * Generate Facebook share URL
 */
export function generateFacebookShareUrl(url: string): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
}

/**
 * Generate Reddit share URL
 */
export function generateRedditShareUrl(url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  return `https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
}

/**
 * Generate email share URL (mailto:)
 */
export function generateEmailShareUrl(subject: string, body: string): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Validate share data before generating content
 */
export function isShareDataValid(data: ShareData): boolean {
  return !!(
    data.representative &&
    data.representative.name &&
    data.representative.bioguideId &&
    data.section
  );
}

/**
 * Get section display name
 */
export function getSectionDisplayName(section: ShareSection): string {
  const names: Record<ShareSection, string> = {
    overview: 'Overview',
    finance: 'Campaign Finance',
    voting: 'Voting Record',
    legislation: 'Legislation',
    committees: 'Committees',
    alignment: 'Party Alignment',
    district: 'District',
    'card-profile': 'Profile Card',
    'card-money': 'Finance Card',
    'card-vote': 'Vote Card',
    'card-alignment': 'Alignment Card',
    'card-legislation': 'Legislation Card',
  };

  return names[section];
}
