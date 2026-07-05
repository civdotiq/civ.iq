/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getServerBaseUrl } from '@/lib/server-url';
import { mapWithConcurrency } from '@/lib/utils/concurrency';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface StateLegislator {
  id: string;
  name: string;
  party: string;
  chamber: 'upper' | 'lower';
  district: string;
  image?: string;
  email?: string;
  phone?: string;
  website?: string;
  offices?: Array<{
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
}

interface StateBill {
  id: string;
  identifier: string;
  title: string;
  subject: string[];
  abstract?: string;
  latest_action_date: string;
  latest_action_description: string;
  classification: string[];
  sponsors: Array<{
    name: string;
    classification: string;
  }>;
  session: string;
  created_at: string;
  updated_at: string;
}

interface StateSession {
  identifier: string;
  name: string;
  classification: string;
  start_date: string;
  end_date: string;
}

interface OpenStatesJurisdiction {
  name: string;
  abbreviation: string;
  classification: string;
  chambers: Array<{
    name: string;
    classification: string;
  }>;
  current_session?: StateSession;
}

interface OpenStatesPerson {
  id: string;
  name: string;
  current_role?: {
    party?: string;
    org_classification?: string;
    district?: string;
  };
  image?: string;
  email?: string;
  phone?: string;
  links?: Array<{ note?: string; url?: string }>;
  offices?: Array<{
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  }>;
}

interface OpenStatesBill {
  id: string;
  identifier: string;
  title: string;
  subject?: string[];
  abstract?: string;
  latest_action_date: string;
  latest_action_description: string;
  classification?: string[];
  sponsorships?: Array<{
    name: string;
    classification: string;
  }>;
  session: string;
  created_at: string;
  updated_at: string;
}

interface StateLegislatureData {
  jurisdiction: {
    name: string;
    abbreviation: string;
    classification: string;
    chambers: Array<{
      name: string;
      classification: string;
    }>;
  };
  current_session: StateSession | null;
  state_legislators: StateLegislator[];
  recent_bills: StateBill[];
  representative_district_bills: StateBill[];
}

// Helper function to get state abbreviation mapping
function getStateAbbreviation(state: string): string {
  const stateMap: { [key: string]: string } = {
    Alabama: 'al',
    Alaska: 'ak',
    Arizona: 'az',
    Arkansas: 'ar',
    California: 'ca',
    Colorado: 'co',
    Connecticut: 'ct',
    Delaware: 'de',
    Florida: 'fl',
    Georgia: 'ga',
    Hawaii: 'hi',
    Idaho: 'id',
    Illinois: 'il',
    Indiana: 'in',
    Iowa: 'ia',
    Kansas: 'ks',
    Kentucky: 'ky',
    Louisiana: 'la',
    Maine: 'me',
    Maryland: 'md',
    Massachusetts: 'ma',
    Michigan: 'mi',
    Minnesota: 'mn',
    Mississippi: 'ms',
    Missouri: 'mo',
    Montana: 'mt',
    Nebraska: 'ne',
    Nevada: 'nv',
    'New Hampshire': 'nh',
    'New Jersey': 'nj',
    'New Mexico': 'nm',
    'New York': 'ny',
    'North Carolina': 'nc',
    'North Dakota': 'nd',
    Ohio: 'oh',
    Oklahoma: 'ok',
    Oregon: 'or',
    Pennsylvania: 'pa',
    'Rhode Island': 'ri',
    'South Carolina': 'sc',
    'South Dakota': 'sd',
    Tennessee: 'tn',
    Texas: 'tx',
    Utah: 'ut',
    Vermont: 'vt',
    Virginia: 'va',
    Washington: 'wa',
    'West Virginia': 'wv',
    Wisconsin: 'wi',
    Wyoming: 'wy',
  };

  // Handle direct state abbreviation inputs
  const directMatch = Object.values(stateMap).includes(state.toLowerCase());
  if (directMatch) return state.toLowerCase();

  // Handle full state name inputs
  return stateMap[state] || state.toLowerCase();
}

// Helper function to get state legislative districts for specific areas
function getStateDistrictsForArea(
  state: string,
  congressionalDistrict?: string
): { senate: string[]; house: string[] } {
  // ZIP 48221 is in Detroit, Michigan Congressional District 13
  // Based on Michigan redistricting, Detroit area includes these districts
  if (state === 'Michigan' && congressionalDistrict === '13') {
    return {
      senate: ['1', '2', '3', '4', '5'], // Detroit metro area senate districts
      house: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], // Detroit metro area house districts
    };
  }

  // Default: return empty to fetch all legislators
  return { senate: [], house: [] };
}

async function fetchStateJurisdiction(stateAbbrev: string): Promise<OpenStatesJurisdiction | null> {
  const startTime = Date.now();
  try {
    const response = await fetch(`https://v3.openstates.org/jurisdictions/${stateAbbrev}`, {
      headers: {
        'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
      },
    });

    const duration = Date.now() - startTime;

    // Log external API call
    logger.info('OpenStates fetchJurisdiction API call', {
      stateAbbrev,
      duration,
      success: response.ok,
      statusCode: response.status,
    });

    if (!response.ok) {
      throw new Error(`OpenStates jurisdiction API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log failed external API call
    logger.error('OpenStates fetchJurisdiction API call failed', error as Error, {
      stateAbbrev,
      duration,
      success: false,
    });

    logger.error('Error fetching state jurisdiction', error as Error, {
      stateAbbrev,
      operation: 'state_jurisdiction_fetch',
    });
    return null;
  }
}

async function fetchStateLegislators(
  stateAbbrev: string,
  state: string,
  congressionalDistrict?: string
): Promise<StateLegislator[]> {
  try {
    const districts = getStateDistrictsForArea(state, congressionalDistrict);
    const legislators: StateLegislator[] = [];

    logger.info('Fetching state legislators', {
      state,
      congressionalDistrict,
      operation: 'state_legislators_fetch',
    });
    logger.debug('Target state districts', {
      state,
      congressionalDistrict,
      districts,
      operation: 'state_districts_mapping',
    });

    // If we have specific districts to target, fetch them individually
    if (districts.senate.length > 0 || districts.house.length > 0) {
      // Fetch specific districts
      const allDistrictsToFetch = [
        ...districts.senate.map(d => ({ district: d, chamber: 'upper' })),
        ...districts.house.map(d => ({ district: d, chamber: 'lower' })),
      ];

      // Fetch districts in parallel with bounded concurrency (was a serial
      // loop: up to 10 back-to-back OpenStates round-trips per request).
      // Concurrency stays at 4 — OpenStates rate limits are tight.
      // Order preserved; a failed district yields [] without sinking the rest.
      const districtsToFetch = allDistrictsToFetch.slice(0, 10); // Limit to avoid too many requests
      const perDistrictLegislators = await mapWithConcurrency(
        districtsToFetch,
        4,
        async ({ district, chamber }): Promise<StateLegislator[]> => {
          const url = `https://v3.openstates.org/people?jurisdiction=${stateAbbrev}&current_role=true&district=${district}`;

          logger.debug('Fetching legislators from district', {
            district,
            chamber,
            url: url.replace(process.env.OPENSTATES_API_KEY || '', 'API_KEY_HIDDEN'),
            operation: 'district_legislators_fetch',
          });

          const fetchStartTime = Date.now();
          try {
            const response = await fetch(url, {
              signal: AbortSignal.timeout(10000),
              headers: {
                'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
              },
            });

            const fetchDuration = Date.now() - fetchStartTime;

            // Log external API call
            logger.info('OpenStates fetchLegislators API call', {
              district,
              chamber,
              duration: fetchDuration,
              success: response.ok,
              statusCode: response.status,
            });

            if (!response.ok) {
              return [];
            }

            const data = await response.json();
            const districtLegislators: StateLegislator[] =
              data.results?.map((person: OpenStatesPerson) => ({
                id: person.id,
                name: person.name,
                party: person.current_role?.party || 'Unknown',
                chamber: person.current_role?.org_classification || chamber,
                district: person.current_role?.district || district,
                image: person.image,
                email: person.email,
                phone: person.phone,
                website: person.links?.find(
                  (link: { note?: string; url?: string }) => link.note === 'website'
                )?.url,
                offices: person.offices?.map(
                  (office: {
                    name?: string;
                    address?: string;
                    phone?: string;
                    email?: string;
                  }) => ({
                    name: office.name || 'Office',
                    address: office.address,
                    phone: office.phone,
                    email: office.email,
                  })
                ),
              })) || [];

            logger.info('Found legislators in district', {
              district,
              legislatorCount: districtLegislators.length,
              operation: 'district_legislators_found',
            });
            return districtLegislators;
          } catch (error) {
            // Per-district fault isolation: one failed/timed-out district
            // must not sink the others
            logger.error('Error fetching district legislators', error as Error, {
              district,
              chamber,
              duration: Date.now() - fetchStartTime,
              operation: 'district_legislators_fetch_error',
            });
            return [];
          }
        }
      );

      legislators.push(...perDistrictLegislators.flat());
    } else {
      // Fallback: fetch all current legislators for the state
      const url = `https://v3.openstates.org/people?jurisdiction=${stateAbbrev}&current_role=true&per_page=20`;

      logger.info('Fetching all current legislators', {
        stateAbbrev,
        url: url.replace(process.env.OPENSTATES_API_KEY || '', 'API_KEY_HIDDEN'),
        operation: 'all_legislators_fetch',
      });

      const fetchStartTime = Date.now();
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        },
      });

      const fetchDuration = Date.now() - fetchStartTime;

      // Log external API call
      logger.info('OpenStates fetchAllLegislators API call', {
        stateAbbrev,
        duration: fetchDuration,
        success: response.ok,
        statusCode: response.status,
      });

      if (response.ok) {
        const data = await response.json();
        const allLegislators =
          data.results?.slice(0, 15).map((person: OpenStatesPerson) => ({
            id: person.id,
            name: person.name,
            party: person.current_role?.party || 'Unknown',
            chamber: person.current_role?.org_classification || 'lower',
            district: person.current_role?.district || 'Unknown',
            image: person.image,
            email: person.email,
            phone: person.phone,
            website: person.links?.find(
              (link: { note?: string; url?: string }) => link.note === 'website'
            )?.url,
            offices: person.offices?.map(
              (office: { name?: string; address?: string; phone?: string; email?: string }) => ({
                name: office.name || 'Office',
                address: office.address,
                phone: office.phone,
                email: office.email,
              })
            ),
          })) || [];

        legislators.push(...allLegislators);
      }
    }

    logger.info('Total legislators found', {
      state,
      congressionalDistrict,
      legislatorCount: legislators.length,
      operation: 'legislators_fetch_complete',
    });
    return legislators;
  } catch (error) {
    logger.error('Error fetching state legislators', error as Error, {
      stateAbbrev,
      state,
      congressionalDistrict,
      operation: 'state_legislators_fetch_error',
    });
    return [];
  }
}

async function fetchRecentStateBills(stateAbbrev: string): Promise<StateBill[]> {
  const startTime = Date.now();
  try {
    const response = await fetch(
      `https://v3.openstates.org/bills?jurisdiction=${stateAbbrev}&sort=updated_desc&per_page=15`,
      {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        },
      }
    );

    const duration = Date.now() - startTime;

    // Log external API call
    logger.info('OpenStates fetchBills API call', {
      stateAbbrev,
      duration,
      success: response.ok,
      statusCode: response.status,
    });

    if (!response.ok) {
      throw new Error(`OpenStates bills API error: ${response.status}`);
    }

    const data = await response.json();

    return (
      data.results?.map((bill: OpenStatesBill) => ({
        id: bill.id,
        identifier: bill.identifier,
        title: bill.title,
        subject: bill.subject || [],
        abstract: bill.abstract,
        latest_action_date: bill.latest_action_date,
        latest_action_description: bill.latest_action_description,
        classification: bill.classification || [],
        sponsors:
          bill.sponsorships?.map((sponsor: { name: string; classification: string }) => ({
            name: sponsor.name,
            classification: sponsor.classification,
          })) || [],
        session: bill.session,
        created_at: bill.created_at,
        updated_at: bill.updated_at,
      })) || []
    );
  } catch (error) {
    const duration = Date.now() - startTime;

    // Log failed external API call
    logger.error('OpenStates fetchBills API call failed', error as Error, {
      stateAbbrev,
      duration,
      success: false,
    });

    logger.error('Error fetching state bills', error as Error, {
      stateAbbrev,
      operation: 'state_bills_fetch_error',
    });
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // First, get representative info
    const repResponse = await fetch(`${getServerBaseUrl()}/api/representative/${bioguideId}`);

    if (!repResponse.ok) {
      throw new Error('Failed to fetch representative info');
    }

    const representative = await repResponse.json();
    const stateAbbrev = getStateAbbreviation(representative.state);

    if (process.env.OPENSTATES_API_KEY) {
      // Fetch real data from OpenStates API
      const [jurisdiction, legislators, recentBills] = await Promise.all([
        fetchStateJurisdiction(stateAbbrev),
        fetchStateLegislators(stateAbbrev, representative.state, representative.district),
        fetchRecentStateBills(stateAbbrev),
      ]);

      const stateData: StateLegislatureData = {
        jurisdiction: jurisdiction || {
          name: representative.state,
          abbreviation: stateAbbrev.toUpperCase(),
          classification: 'state',
          chambers: [
            { name: 'House', classification: 'lower' },
            { name: 'Senate', classification: 'upper' },
          ],
        },
        current_session: jurisdiction?.current_session || null,
        state_legislators: legislators,
        recent_bills: recentBills,
        representative_district_bills: recentBills
          .filter(bill =>
            bill.subject.some(
              subj =>
                subj.toLowerCase().includes('federal') || subj.toLowerCase().includes('congress')
            )
          )
          .slice(0, 5),
      };

      return NextResponse.json(stateData, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Fallback mock data
    // EMERGENCY FIX: Never return fake state legislature data
    // Previously returned fake legislators "State Sen. District 1", "State Rep. District A"
    // and fake bills "SB 1234 - Infrastructure Act", "HB 5678 - Education Act"
    logger.warn('State legislature data unavailable - OpenStates API not accessible', {
      bioguideId,
      state: representative.state,
      reason: 'Cannot return fake state legislators or bills - misleads citizens',
    });

    const emptyData: StateLegislatureData = {
      jurisdiction: {
        name: representative.state,
        abbreviation: representative.state,
        classification: 'state',
        chambers: [
          { name: 'House of Representatives', classification: 'lower' },
          { name: 'Senate', classification: 'upper' },
        ],
      },
      current_session: {
        identifier: '2024',
        name: '2024 Regular Session',
        classification: 'primary',
        start_date: '2024-01-08',
        end_date: '2024-06-30',
      },
      state_legislators: [], // NEVER return fake legislators
      recent_bills: [], // NEVER return fake bills
      representative_district_bills: [],
    };

    return NextResponse.json(emptyData, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('State Legislature API Error', error as Error, {
      bioguideId,
      operation: 'state_legislature_api_error',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
