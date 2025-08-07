/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger-client';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { ZIP_TO_DISTRICT_MAP_119TH } from '@/lib/data/zip-district-mapping-119th';
import type { EnhancedRepresentative } from '@/types/representative';

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  state: string;
  district: string | null;
  party: string;
  chamber: 'House' | 'Senate';
  imageUrl: string;
  contactInfo: {
    phone: string;
    website: string;
    office: string;
  };
  committees: Array<{
    name: string;
    role?: string;
  }>;
  social: {
    twitter?: string;
    facebook?: string;
  };
  // Additional fields expected by the frontend
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  yearsInOffice?: number;
  nextElection?: string;
  dataComplete: number;
}

/**
 * Get representatives by ZIP code using real Congress.gov data
 */
async function getRepresentativesByZip(zipCode: string): Promise<Representative[]> {
  try {
    // Get district mapping for ZIP code
    const districtMapping = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
    if (!districtMapping) {
      logger.warn('ZIP code not found in district mapping', { zipCode });
      return [];
    }

    // Handle both single district and multi-district ZIP codes
    const primaryMapping = Array.isArray(districtMapping)
      ? districtMapping.find(m => m.primary) || districtMapping[0]
      : districtMapping;

    if (!primaryMapping) {
      logger.warn('No primary mapping found for ZIP code', { zipCode });
      return [];
    }

    // Get all enhanced representatives
    const allRepresentatives = await getAllEnhancedRepresentatives();
    if (!allRepresentatives.length) {
      logger.warn('No representatives data available from congress.service');
      return [];
    }

    // Find representatives for this state
    const stateReps = allRepresentatives.filter(rep => rep.state === primaryMapping.state);

    // Find House representative for the specific district
    const houseRep = stateReps.find(
      rep => rep.chamber === 'House' && rep.district === primaryMapping.district
    );

    // Find Senate representatives for the state
    const senateReps = stateReps.filter(rep => rep.chamber === 'Senate');

    // Combine House and Senate representatives
    const representatives: Representative[] = [];

    if (houseRep) {
      representatives.push(transformToSimpleFormat(houseRep));
    }

    senateReps.forEach(senateRep => {
      representatives.push(transformToSimpleFormat(senateRep));
    });

    if (representatives.length === 0) {
      logger.warn('No representatives found for ZIP code', {
        zipCode,
        state: primaryMapping.state,
        district: primaryMapping.district,
      });
    }

    return representatives;
  } catch (error) {
    logger.error('Error getting representatives by ZIP', error as Error, { zipCode });
    return [];
  }
}

/**
 * Transform EnhancedRepresentative to simple Representative format
 */
function transformToSimpleFormat(enhanced: EnhancedRepresentative): Representative {
  return {
    bioguideId: enhanced.bioguideId,
    name: enhanced.name,
    firstName: enhanced.firstName,
    lastName: enhanced.lastName,
    state: enhanced.state,
    district: enhanced.district || null,
    party: enhanced.party,
    chamber: enhanced.chamber,
    title: enhanced.title,
    imageUrl: '', // Will be populated by photo service
    contactInfo: {
      phone: enhanced.currentTerm?.phone || enhanced.phone || '',
      website: enhanced.currentTerm?.website || enhanced.website || '',
      office: enhanced.currentTerm?.office || '',
    },
    committees:
      enhanced.committees?.map(committee => ({
        name: committee.name,
        role: committee.role,
      })) || [],
    social: {
      twitter: enhanced.socialMedia?.twitter,
      facebook: enhanced.socialMedia?.facebook,
    },
    phone: enhanced.currentTerm?.phone || enhanced.phone,
    website: enhanced.currentTerm?.website || enhanced.website,
    yearsInOffice: calculateYearsInOffice(enhanced.currentTerm?.start),
    nextElection: calculateNextElection(enhanced.chamber),
    dataComplete: 100, // Real data is complete
  };
}

/**
 * Calculate years in office from start date
 */
function calculateYearsInOffice(startDate?: string): number {
  if (!startDate) return 0;
  const start = new Date(startDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
}

/**
 * Calculate next election year based on chamber
 */
function calculateNextElection(chamber?: string): string {
  const currentYear = new Date().getFullYear();
  if (chamber === 'House') {
    // House elections every 2 years (even years)
    return currentYear % 2 === 0 ? currentYear.toString() : (currentYear + 1).toString();
  } else {
    // Senate elections every 6 years, staggered
    // Simplified calculation - in reality it's more complex
    return (currentYear + 2).toString();
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zip');

  // Validate ZIP code
  if (!zipCode) {
    return NextResponse.json({ error: 'ZIP code is required' }, { status: 400 });
  }

  if (!/^\d{5}$/.test(zipCode)) {
    return NextResponse.json(
      { error: 'Invalid ZIP code format. Please provide a 5-digit ZIP code.' },
      { status: 400 }
    );
  }

  try {
    logger.info('Fetching representatives for ZIP code', { zipCode });

    // Get real representatives data
    const representatives = await getRepresentativesByZip(zipCode);

    if (representatives.length === 0) {
      logger.warn('No representatives found, returning empty result', { zipCode });
      return NextResponse.json(
        {
          zipCode,
          state: 'XX',
          district: '00',
          representatives: [],
          metadata: {
            dataSource: 'congress.gov',
            timestamp: new Date().toISOString(),
            totalFound: 0,
            note: 'No representatives found for this ZIP code. Please verify the ZIP code is valid.',
          },
        },
        { status: 404 }
      );
    }

    // Determine state and district from representatives
    const state = representatives[0]?.state || 'XX';
    const district = representatives.find(r => r.chamber === 'House')?.district || '00';

    logger.info('Successfully fetched representatives', {
      zipCode,
      state,
      district,
      count: representatives.length,
    });

    const response = {
      zipCode,
      state,
      district,
      representatives,
      metadata: {
        dataSource: 'congress.gov',
        timestamp: new Date().toISOString(),
        totalFound: representatives.length,
        note: 'Live data from Congress.gov via congress-legislators repository',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, max-age=1800, stale-while-revalidate=300', // 30 min cache
      },
    });
  } catch (error) {
    logger.error('Representatives API error', error as Error, { zipCode });

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Unable to fetch representatives at this time',
      },
      { status: 500 }
    );
  }
}
