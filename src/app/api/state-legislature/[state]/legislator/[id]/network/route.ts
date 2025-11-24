/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legislator Co-Sponsorship Network API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/network
 * Analyzes bill co-sponsorships to identify collaboration patterns and bipartisan scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { openStatesAPI } from '@/lib/openstates-api';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import type { CoSponsorshipNetwork } from '@/types/state-legislature';

// ISR: Revalidate every 24 hours (sponsorship networks change daily)
export const revalidate = 86400; // 24 hours

export const dynamic = 'force-dynamic';

/**
 * Analyze co-sponsorship patterns from bills
 */
function analyzeCoSponsorshipNetwork(
  legislatorId: string,
  legislatorName: string,
  legislatorParty: string,
  legislatorChamber: 'upper' | 'lower',
  bills: Array<{
    id: string;
    identifier: string;
    title: string;
    sponsorships: Array<{
      id: string;
      name: string;
      entity_type: string;
      primary: boolean;
      party?: string;
    }>;
  }>
): CoSponsorshipNetwork {
  const collaborators = new Map<
    string,
    {
      id: string;
      name: string;
      party?: string;
      collaborationCount: number;
      sharedBills: Array<{ id: string; identifier: string; title: string }>;
    }
  >();

  let bipartisanBills = 0;
  let totalSponsored = 0;
  let totalCosponsored = 0;
  const recentCollaborations: Array<{
    billId: string;
    billIdentifier: string;
    billTitle: string;
    cosponsors: string[];
  }> = [];

  // Analyze each bill for co-sponsors
  for (const bill of bills) {
    const sponsors = bill.sponsorships.filter(s => s.entity_type === 'person');

    // Check if legislator is involved in this bill
    const isPrimary = sponsors.some(s => s.id === legislatorId && s.primary);
    const isInvolved = sponsors.some(s => s.id === legislatorId);
    if (!isInvolved) continue;

    if (isPrimary) {
      totalSponsored++;
    } else {
      totalCosponsored++;
    }

    // Check for bipartisan support
    const parties = new Set(sponsors.map(s => s.party).filter(Boolean));
    if (parties.size > 1) {
      bipartisanBills++;
    }

    // Add to recent collaborations
    const cosponsorNames = sponsors.filter(s => s.id !== legislatorId).map(s => s.name);
    recentCollaborations.push({
      billId: bill.id,
      billIdentifier: bill.identifier,
      billTitle: bill.title,
      cosponsors: cosponsorNames,
    });

    // Track co-sponsors
    for (const sponsor of sponsors) {
      if (sponsor.id === legislatorId) continue; // Skip self

      const existing = collaborators.get(sponsor.id);
      if (existing) {
        existing.collaborationCount++;
        existing.sharedBills.push({
          id: bill.id,
          identifier: bill.identifier,
          title: bill.title,
        });
      } else {
        collaborators.set(sponsor.id, {
          id: sponsor.id,
          name: sponsor.name,
          party: sponsor.party,
          collaborationCount: 1,
          sharedBills: [
            {
              id: bill.id,
              identifier: bill.identifier,
              title: bill.title,
            },
          ],
        });
      }
    }
  }

  // Convert to array and sort by collaboration count
  const sortedCollaborators = Array.from(collaborators.values()).sort(
    (a, b) => b.collaborationCount - a.collaborationCount
  );

  // Calculate bipartisan score (percentage of bills with cross-party support)
  const totalBills = totalSponsored + totalCosponsored;
  const bipartisanScore = totalBills > 0 ? Math.round((bipartisanBills / totalBills) * 100) : 0;

  // Group collaborators by party
  const collaborationByParty: Record<string, { count: number; legislators: string[] }> = {};
  for (const collaborator of sortedCollaborators) {
    const party = collaborator.party || 'Unknown';
    if (!collaborationByParty[party]) {
      collaborationByParty[party] = { count: 0, legislators: [] };
    }
    collaborationByParty[party].count += collaborator.collaborationCount;
    collaborationByParty[party].legislators.push(collaborator.name);
  }

  return {
    legislatorId,
    legislatorName,
    party: legislatorParty as 'Democratic' | 'Republican' | 'Independent' | 'Other',
    chamber: legislatorChamber,
    summary: {
      totalBillsSponsored: totalSponsored,
      totalBillsCosponsored: totalCosponsored,
      uniqueCollaborators: collaborators.size,
      bipartisanCollaborations: bipartisanBills,
      bipartisanScore,
    },
    frequentCollaborators: sortedCollaborators.slice(0, 10).map(c => ({
      legislatorId: c.id,
      legislatorName: c.name,
      party: (c.party || 'Other') as 'Democratic' | 'Republican' | 'Independent' | 'Other',
      chamber: legislatorChamber, // Note: Would need separate API call to get accurate chamber for each collaborator
      collaborationCount: c.collaborationCount,
      bipartisan: c.party !== legislatorParty,
    })),
    collaborationByParty,
    recentCollaborations: recentCollaborations.slice(0, 10).map(rc => ({
      ...rc,
      introducedDate: '', // Note: Would need bill details to get accurate introduced date
    })),
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id); // Decode Base64 legislator ID

    if (!state || state.length !== 2) {
      logger.warn('Invalid state parameter for network API', { state });
      return NextResponse.json(
        {
          success: false,
          error: 'Valid 2-letter state code is required',
        },
        { status: 400 }
      );
    }

    if (!legislatorId) {
      logger.warn('Missing legislator ID for network API', { state });
      return NextResponse.json(
        {
          success: false,
          error: 'Legislator ID is required',
        },
        { status: 400 }
      );
    }

    logger.info('Fetching co-sponsorship network', {
      state: state.toUpperCase(),
      legislatorId,
    });

    // Fetch legislator details to get party affiliation
    const legislator = await openStatesAPI.getPersonById(legislatorId);
    if (!legislator) {
      logger.warn('Legislator not found for network analysis', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Legislator not found',
        },
        { status: 404 }
      );
    }

    // Fetch bills sponsored by this legislator (max 100 for network analysis)
    const rawBills = await openStatesAPI.getBillsBySponsor(
      legislatorId,
      state.toLowerCase(),
      undefined,
      100
    );

    // Transform bills to match expected format (add missing id and party fields to sponsorships)
    const bills = rawBills.map(bill => ({
      id: bill.id,
      identifier: bill.identifier,
      title: bill.title,
      sponsorships: (bill.sponsorships || []).map(s => ({
        id: '', // OpenStates v3 doesn't provide sponsor ID in bill sponsorships
        name: s.name,
        entity_type: s.entity_type,
        primary: s.primary,
        party: undefined, // Would need separate API calls to get party for each sponsor
      })),
    }));

    const chamber = legislator.chamber;

    if (bills.length === 0) {
      logger.info('No bills found for network analysis', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json({
        success: true,
        state: state.toUpperCase(),
        network: {
          legislatorId,
          legislatorName: legislator.name,
          party: (legislator.party || 'Other') as
            | 'Democratic'
            | 'Republican'
            | 'Independent'
            | 'Other',
          chamber,
          summary: {
            totalBillsSponsored: 0,
            totalBillsCosponsored: 0,
            uniqueCollaborators: 0,
            bipartisanCollaborations: 0,
            bipartisanScore: 0,
          },
          frequentCollaborators: [],
          collaborationByParty: {},
          recentCollaborations: [],
          lastUpdated: new Date().toISOString(),
        },
        metadata: {
          responseTime: Date.now() - startTime,
        },
      });
    }

    // Analyze co-sponsorship network
    const network = analyzeCoSponsorshipNetwork(
      legislatorId,
      legislator.name,
      legislator.party || 'Other',
      chamber,
      bills
    );

    const responseTime = Date.now() - startTime;

    logger.info('Co-sponsorship network analysis complete', {
      state: state.toUpperCase(),
      legislatorId,
      billsAnalyzed: network.summary.totalBillsSponsored + network.summary.totalBillsCosponsored,
      bipartisanScore: network.summary.bipartisanScore,
      collaboratorCount: network.frequentCollaborators.length,
      responseTime,
    });

    return NextResponse.json({
      success: true,
      state: state.toUpperCase(),
      network,
      metadata: {
        responseTime,
      },
    });
  } catch (error) {
    logger.error('Co-sponsorship network API error', error as Error, {
      state: (await params).state.toUpperCase(),
      legislatorId: (await params).id,
    });

    return NextResponse.json(
      {
        success: false,
        state: (await params).state.toUpperCase(),
        error: error instanceof Error ? error.message : 'Failed to analyze co-sponsorship network',
      },
      { status: 500 }
    );
  }
}
