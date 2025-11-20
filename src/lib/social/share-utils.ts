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
  | 'district';

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
    bipartisanVotes?: number;
    totalVotes?: number;
    alignmentTrend?: 'increasing' | 'decreasing' | 'stable';

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

  // Map sections to anchor IDs
  const sectionAnchors: Record<ShareSection, string> = {
    overview: '',
    finance: '#campaign-finance',
    voting: '#voting-record',
    legislation: '#legislation',
    committees: '#committees',
    alignment: '#party-alignment',
    district: '#district',
  };

  return `${baseUrl}${path}${sectionAnchors[section]}`;
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

      const trendEmoji = {
        increasing: '↑',
        decreasing: '↓',
        stable: '→',
      }[stats.alignmentTrend || 'stable'];

      const parts = [`${repTitle} voting record:`, `• ${stats.partyAlignment}% party alignment`];

      if (stats.bipartisanVotes) {
        parts.push(`• ${stats.bipartisanVotes} bipartisan votes`);
      }

      if (stats.alignmentTrend) {
        parts.push(`• Trend: ${trendEmoji} ${stats.alignmentTrend}`);
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

    case 'overview':
    case 'district':
    default: {
      return `${repTitle} - Federal representative data\n\nCampaign finance, voting records, and legislative activity from official sources\n\n${url}`;
    }
  }
}

/**
 * Generate X.com (Twitter) share URL
 */
export function generateTwitterShareUrl(text: string): string {
  const encodedText = encodeURIComponent(text);
  return `https://twitter.com/intent/tweet?text=${encodedText}`;
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
  };

  return names[section];
}
