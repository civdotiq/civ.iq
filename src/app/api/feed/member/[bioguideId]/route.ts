/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed, createRepresentativeFeedConfig } from '@/lib/feeds/atom-generator';
import type { AtomEntry } from '@/lib/feeds/atom-generator';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getVotesByMember } from '@/features/representatives/services/congress-api';
import { getComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId || !/^[A-Z]\d{6}$/i.test(bioguideId)) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><error>Invalid bioguide ID</error>',
        { status: 400, headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } }
      );
    }

    const rep = await getEnhancedRepresentative(bioguideId);
    if (!rep) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><error>Representative not found</error>',
        { status: 404, headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' } }
      );
    }

    const entries: AtomEntry[] = [];
    const baseUrl = 'https://civdotiq.org';
    const now = new Date();

    // Entry for current role
    entries.push({
      id: `${baseUrl}/representative/${bioguideId}#role`,
      title: `${rep.title} ${rep.name} (${rep.party}-${rep.state})`,
      link: `${baseUrl}/representative/${bioguideId}`,
      updated: now,
      summary: `Currently serving as ${rep.title} for ${rep.state}${rep.district ? ` District ${rep.district}` : ''}. Party: ${rep.party}.`,
      categories: [
        { term: 'role', label: 'Current Role' },
        { term: rep.chamber, label: rep.chamber },
      ],
    });

    // Entry for current term info
    if (rep.currentTerm) {
      entries.push({
        id: `${baseUrl}/representative/${bioguideId}#term`,
        title: `Term: ${rep.currentTerm.start} to ${rep.currentTerm.end}`,
        link: `${baseUrl}/representative/${bioguideId}`,
        updated: new Date(rep.currentTerm.start),
        summary: [
          `Term period: ${rep.currentTerm.start} to ${rep.currentTerm.end}.`,
          rep.currentTerm.office ? `Office: ${rep.currentTerm.office}.` : '',
          rep.currentTerm.phone ? `Phone: ${rep.currentTerm.phone}.` : '',
        ]
          .filter(Boolean)
          .join(' '),
        categories: [{ term: 'term', label: 'Term Info' }],
      });
    }

    // Entries for committee memberships
    if (rep.committees && rep.committees.length > 0) {
      for (const committee of rep.committees) {
        const slug = committee.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        entries.push({
          id: `${baseUrl}/representative/${bioguideId}#committee-${slug}`,
          title: `Serves on: ${committee.name}`,
          link: `${baseUrl}/representative/${bioguideId}`,
          updated: now,
          author: { name: rep.name, uri: `${baseUrl}/representative/${bioguideId}` },
          summary: `${rep.name} serves on the ${committee.name}${committee.role ? ` (${committee.role})` : ''}.`,
          categories: [{ term: 'committee', label: 'Committee' }],
        });
      }
    }

    // Leadership roles
    if (rep.leadershipRoles && rep.leadershipRoles.length > 0) {
      for (const role of rep.leadershipRoles) {
        entries.push({
          id: `${baseUrl}/representative/${bioguideId}#leadership-${role.title}`,
          title: `Leadership: ${role.title}`,
          link: `${baseUrl}/representative/${bioguideId}`,
          updated: new Date(role.start),
          summary: `${rep.name} holds leadership role: ${role.title}. Started ${role.start}.`,
          categories: [{ term: 'leadership', label: 'Leadership' }],
        });
      }
    }

    // Recent votes (graceful degradation — empty votes = feed still works)
    try {
      const chamber = rep.chamber as 'House' | 'Senate';
      const votes = await getVotesByMember(bioguideId, undefined, chamber);
      const recentVotes = (
        votes as Array<{
          voteId?: string;
          question?: string;
          result?: string;
          date?: string;
          position?: string;
          rollNumber?: number;
        }>
      ).slice(0, 10);

      for (const vote of recentVotes) {
        const voteDate = vote.date ? new Date(vote.date) : now;
        const voteIdStr = vote.voteId || `vote-${vote.rollNumber || 'unknown'}`;
        entries.push({
          id: `${baseUrl}/representative/${bioguideId}#vote-${voteIdStr}`,
          title: vote.question || 'Roll Call Vote',
          link: `${baseUrl}/representative/${bioguideId}`,
          updated: voteDate,
          summary: `${rep.name} voted ${vote.position || 'Unknown'}. Result: ${vote.result || 'Pending'}.`,
          categories: [{ term: 'vote', label: 'Vote' }],
        });
      }
    } catch {
      // Votes unavailable — feed continues with profile-only entries
    }

    // Sponsored bills (graceful degradation)
    try {
      const billsResponse = await getComprehensiveBillsByMember({
        bioguideId,
        limit: 10,
      });

      for (const bill of billsResponse.bills) {
        const billDate = bill.introducedDate ? new Date(bill.introducedDate) : now;
        entries.push({
          id: `${baseUrl}/bill/${bill.type?.toLowerCase() || 'hr'}${bill.number}-${bill.congress}`,
          title: `Sponsored: ${bill.title}`,
          link: `${baseUrl}/bill/${bill.type?.toLowerCase() || 'hr'}${bill.number}-${bill.congress}`,
          updated: billDate,
          summary: `${bill.title}. Latest action: ${bill.lastAction || 'Introduced'}.`,
          categories: [{ term: 'sponsored-bill', label: 'Sponsored Bill' }],
        });
      }
    } catch {
      // Bills unavailable — feed continues with profile-only entries
    }

    // Sort entries by date (newest first)
    entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());

    const feedConfig = createRepresentativeFeedConfig(bioguideId, rep.name, rep.party, rep.state);
    const firstEntry = entries[0];
    if (firstEntry) {
      feedConfig.updated = firstEntry.updated;
    }

    const xml = generateAtomFeed(feedConfig, entries);

    logger.info('Generated member Atom feed', {
      bioguideId,
      name: rep.name,
      entryCount: entries.length,
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('Member Atom feed error', error as Error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate member feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
