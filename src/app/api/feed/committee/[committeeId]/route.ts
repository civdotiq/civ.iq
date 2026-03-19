/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Atom Feed — Committee Activity
 *
 * Returns an Atom feed with committee membership and referred bills.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed } from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
import { getCommitteeDataService } from '@/lib/services/committee.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse> {
  try {
    const { committeeId } = await params;

    if (!committeeId) {
      return new NextResponse('Committee ID is required', { status: 400 });
    }

    const committee = await getCommitteeDataService(committeeId);

    if (!committee) {
      return new NextResponse('Committee not found', { status: 404 });
    }

    const baseUrl = 'https://civdotiq.org';
    const now = new Date();
    const entries: AtomEntry[] = [];

    const chair = committee.leadership.chair;

    // Entry for committee overview
    entries.push({
      id: `${baseUrl}/committee/${committeeId}#overview`,
      title: `${committee.name} — Overview`,
      link: `${baseUrl}/committee/${committeeId}`,
      updated: new Date(committee.lastUpdated || now),
      summary: `${committee.name} (${committee.chamber}). ${committee.members.length} members.${chair ? ` Chair: ${chair.representative.name}.` : ''}`,
      categories: [
        { term: 'overview', label: 'Overview' },
        { term: committee.chamber.toLowerCase(), label: committee.chamber },
      ],
    });

    // Entries for members
    for (const member of committee.members.slice(0, 30)) {
      entries.push({
        id: `${baseUrl}/committee/${committeeId}#member-${member.representative.bioguideId}`,
        title: `${member.representative.name} (${member.representative.party}-${member.representative.state}) — ${member.role}`,
        link: `${baseUrl}/representative/${member.representative.bioguideId}`,
        updated: now,
        author: { name: member.representative.name },
        summary: `${member.representative.name} serves as ${member.role} on the ${committee.name}.`,
        categories: [{ term: 'member', label: 'Member' }],
      });
    }

    // Entries for subcommittees
    for (const sub of committee.subcommittees) {
      entries.push({
        id: `${baseUrl}/committee/${committeeId}#subcommittee-${sub.id}`,
        title: `Subcommittee: ${sub.name}`,
        link: `${baseUrl}/committee/${sub.id}`,
        updated: now,
        summary: `Subcommittee of ${committee.name}: ${sub.name}.`,
        categories: [{ term: 'subcommittee', label: 'Subcommittee' }],
      });
    }

    const feedConfig: AtomFeedConfig = {
      id: `${baseUrl}/feed/committee/${committeeId}`,
      title: `${committee.name} — CIV.IQ`,
      subtitle: `Activity and membership for the ${committee.name}`,
      link: `${baseUrl}/committee/${committeeId}`,
      selfLink: `${baseUrl}/api/feed/committee/${committeeId}`,
      updated: entries.length > 0 && entries[0] ? entries[0].updated : now,
      author: { name: 'CIV.IQ', uri: baseUrl },
      icon: `${baseUrl}/favicon.ico`,
      rights: 'Data sourced from Congress.gov. MIT License.',
    };

    const xml = generateAtomFeed(feedConfig, entries);

    logger.info('Generated committee Atom feed', {
      committeeId,
      name: committee.name,
      entryCount: entries.length,
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    logger.error('Committee Atom feed error', error as Error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate committee feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
      }
    );
  }
}
