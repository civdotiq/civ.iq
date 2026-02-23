/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateAtomFeed } from '@/lib/feeds/atom-generator';
import type { AtomFeedConfig, AtomEntry } from '@/lib/feeds/atom-generator';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { getCachedDistrictImpactEntries } from '@/lib/feeds/district-impact-feed-helper';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse> {
  try {
    const { districtId } = await params;

    // Validate format: "MI-12", "CA-04", "AK-AL"
    if (!districtId || !/^[A-Z]{2}-(\d{1,2}|AL)$/i.test(districtId)) {
      return new NextResponse(
        'Invalid district ID. Expected format: ST-## (e.g., MI-12, CA-04, AK-AL)',
        { status: 400 }
      );
    }

    const [state, districtNum] = districtId.toUpperCase().split('-') as [string, string];
    const baseUrl = 'https://civdotiq.org';
    const now = new Date();

    const allReps = await getAllEnhancedRepresentatives();

    // Filter for this district
    const normalizeDistrict = (d: string | undefined): string => {
      if (!d || d === '' || d === '0' || d === '00') return '00';
      return d.padStart(2, '0');
    };

    const districtReps = allReps.filter(rep => {
      if (rep.state !== state) return false;
      if (rep.chamber === 'Senate') return true;
      if (rep.chamber === 'House') {
        if (districtNum === 'AL') return true; // At-large matches any house member
        return normalizeDistrict(rep.district) === normalizeDistrict(districtNum);
      }
      return false;
    });

    const districtLabel = districtNum === 'AL' ? 'At-Large' : `District ${districtNum}`;
    const entries: AtomEntry[] = [];

    for (const rep of districtReps) {
      entries.push({
        id: `${baseUrl}/representative/${rep.bioguideId}#district-${districtId}`,
        title: `${rep.title} ${rep.name} (${rep.party}-${rep.state})`,
        link: `${baseUrl}/representative/${rep.bioguideId}`,
        updated: rep.currentTerm ? new Date(rep.currentTerm.start) : now,
        author: { name: rep.name, uri: `${baseUrl}/representative/${rep.bioguideId}` },
        summary: `${rep.name} represents ${state} ${rep.chamber === 'Senate' ? 'in the Senate' : districtLabel + ' in the House'}. Party: ${rep.party}.`,
        categories: [
          { term: rep.chamber.toLowerCase(), label: rep.chamber },
          { term: rep.party, label: rep.party },
        ],
      });

      // Add committee entries for each rep
      if (rep.committees && rep.committees.length > 0) {
        for (const committee of rep.committees.slice(0, 3)) {
          const slug = committee.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          entries.push({
            id: `${baseUrl}/representative/${rep.bioguideId}#committee-${slug}`,
            title: `${rep.name} serves on ${committee.name}`,
            link: `${baseUrl}/representative/${rep.bioguideId}`,
            updated: now,
            author: { name: rep.name },
            summary: `${rep.name} is a member of the ${committee.name}.`,
            categories: [{ term: 'committee', label: 'Committee' }],
          });
        }
      }
    }

    // District impact entries (read-only from cache, never triggers AI)
    try {
      const impactEntries = await getCachedDistrictImpactEntries(districtId.toUpperCase(), baseUrl);
      entries.push(...impactEntries);
    } catch {
      // Impacts unavailable — feed continues without them
    }

    // Sort by date newest first
    entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());

    const feedConfig: AtomFeedConfig = {
      id: `${baseUrl}/feed/district/${districtId}`,
      title: `${state} ${districtLabel} — CIV.IQ`,
      subtitle: `Congressional representatives and activity for ${state} ${districtLabel}`,
      link: `${baseUrl}/districts/${districtId}`,
      selfLink: `${baseUrl}/api/feed/district/${districtId}`,
      updated: entries.length > 0 && entries[0] ? entries[0].updated : now,
      author: { name: 'CIV.IQ', uri: baseUrl },
      icon: `${baseUrl}/favicon.ico`,
      rights: 'Data sourced from Congress.gov. MIT License.',
    };

    const xml = generateAtomFeed(feedConfig, entries);

    logger.info('Generated district Atom feed', {
      districtId,
      representativeCount: districtReps.length,
      entryCount: entries.length,
    });

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/atom+xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('District Atom feed error', error as Error);
    return new NextResponse('Failed to generate district feed', { status: 500 });
  }
}
