/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';
import { getStateLegislatureMetadata } from '@/lib/data/static-state-legislatures';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import { getJurisdictionRoster } from '@/lib/data-sources/openstates-people/load-people';
import { chamberBucket } from '@/lib/data-sources/openstates-people/adapt';
import type { CorpusPerson } from '@/lib/data-sources/openstates-people/people-corpus';

export const dynamic = 'force-dynamic';

interface StateLegislator {
  id: string;
  name: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  chamber: 'upper' | 'lower';
  district: string;
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  committees: Array<{
    name: string;
    role?: 'chair' | 'vice-chair' | 'member';
  }>;
  terms: Array<{
    startYear: number;
    /** Absent when OpenStates reports no end date — never inferred. */
    endYear?: number;
    chamber: 'upper' | 'lower';
  }>;
  bills: {
    sponsored: number;
    cosponsored: number;
  };
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    crossoverVotes: number;
  };
}

interface StateLegislatureData {
  state: string;
  stateName: string;
  lastUpdated: string;
  /** True for Nebraska and DC, where upper and lower describe the same body. */
  isUnicameral?: boolean;
  /**
   * False when the OpenStates roster fetch stopped early (usually a rate
   * limit). Party breakdowns are suppressed in that case.
   */
  rosterComplete?: boolean;
  session: {
    name: string;
    identifier?: string;
    startDate: string;
    endDate: string;
    type: 'regular' | 'special';
    status?: 'active' | 'in-recess' | 'adjourned' | 'upcoming';
  };
  chambers: {
    upper: ChamberSummary;
    lower: ChamberSummary;
  };
  legislators: StateLegislator[];
}

interface ChamberSummary {
  name: string;
  title: string; // e.g., "Senator", "State Senator"
  /** Real chamber size from the curated NCSL dataset. */
  totalSeats: number;
  /** How many members OpenStates actually returned — not the seat count. */
  membersListed?: number;
  /** False when most listed members have no party (e.g. nonpartisan Nebraska). */
  partyDataAvailable?: boolean;
  democraticSeats: number;
  republicanSeats: number;
  otherSeats: number;
}

// Helper function to get the OpenStates jurisdiction abbreviation.
// Uses the canonical state list rather than a local map: the previous 50-entry
// map omitted DC, so every request for the DC Council threw "Invalid state
// abbreviation" even though OpenStates publishes its 13 councilmembers.
function getStateAbbreviation(state: string): string | null {
  const code = normalizeStateIdentifier(state);
  return code ? code.toLowerCase() : null;
}

// Helper: Sleep for rate limiting
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: Retry with exponential backoff for rate limiting
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-KEY': process.env.OPENSTATES_API_KEY || '',
        },
      });

      // If rate limited (429), wait and retry
      if (response.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        logger.warn('OpenStates rate limit hit, retrying...', {
          attempt: attempt + 1,
          maxRetries,
          delayMs: delay,
          url,
        });
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await sleep(baseDelay * Math.pow(2, attempt));
    }
  }
  return null;
}

/** OpenStates jurisdiction API response shape (v3) */
interface StateJurisdiction {
  name?: string;
  /** Only present when the request asks for ?include=legislative_sessions */
  legislative_sessions?: LegislativeSession[];
}

/** Raised when OpenStates returns nothing usable, so the miss is not cached. */
class OpenStatesUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpenStatesUnavailableError';
  }
}

interface LegislatorFetchResult {
  legislators: StateLegislator[];
  /** False when pagination stopped early — party totals are then unreliable. */
  complete: boolean;
}

interface LegislativeSession {
  identifier?: string;
  name?: string;
  classification?: string;
  start_date?: string;
  end_date?: string;
}

function isSpecialSession(session: LegislativeSession): boolean {
  if (session.classification === 'special') return true;
  // Classification is frequently blank in OpenStates, so fall back to the name
  // (Virginia labels these "2026, 1st Special Session" with no classification).
  return /special/i.test(session.name ?? '');
}

/**
 * Pick the session a state is actually in.
 *
 * Order of preference:
 *  1. A session currently in progress (started, with a real end date still ahead).
 *  2. The most recently started regular session — the right answer for states
 *     like Virginia that adjourn in March and sit idle for most of the year.
 *  3. The most recently started session of any kind.
 *
 * An end date is required for "in progress" on purpose: some states leave old
 * special sessions open-ended, and treating those as live would let a 2018
 * session outrank the current one.
 *
 * Returns null when OpenStates gives us nothing usable — callers must not
 * invent a session name.
 */
function selectCurrentSession(
  sessions: LegislativeSession[] | undefined
): LegislativeSession | null {
  if (!sessions || sessions.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const started = sessions.filter(s => s.start_date && s.start_date <= today);
  if (started.length === 0) return null;

  const mostRecent = (pool: LegislativeSession[]) =>
    pool.reduce((latest, s) => (s.start_date! > latest.start_date! ? s : latest));

  const inProgress = started.filter(s => s.end_date && s.end_date >= today);
  if (inProgress.length > 0) return mostRecent(inProgress);

  const regular = started.filter(s => !isSpecialSession(s));
  if (regular.length > 0) return mostRecent(regular);

  return mostRecent(started);
}

// Fetch state jurisdiction info from OpenStates API
async function fetchStateJurisdiction(stateAbbrev: string): Promise<StateJurisdiction | null> {
  // legislative_sessions is opt-in; without the include the response carries no
  // session data at all and every state falls back to a placeholder.
  const jurisdictionUrl = `https://v3.openstates.org/jurisdictions/${stateAbbrev}?include=legislative_sessions`;

  const monitor = monitorExternalApi('openstates', 'jurisdiction', jurisdictionUrl);

  try {
    const response = await fetchWithRetry(jurisdictionUrl);

    if (!response || !response.ok) {
      monitor.end(false, response?.status);
      logger.error('OpenStates jurisdiction API error', new Error(`HTTP ${response?.status}`), {
        stateAbbrev,
        statusCode: response?.status,
      });
      return null;
    }

    monitor.end(true, 200);
    const data = (await response.json()) as StateJurisdiction;
    logger.info('Successfully fetched state jurisdiction', {
      stateAbbrev,
      jurisdictionName: data.name,
    });

    return data;
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching state jurisdiction', error as Error, {
      stateAbbrev,
    });
    return null;
  }
}

/** Corpus record → the shape this route serves. Mirrors transformLegislator. */
function transformCorpusPerson(person: CorpusPerson): StateLegislator {
  const chamber = chamberBucket(person);
  const startYear = person.startDate ? new Date(person.startDate).getFullYear() : null;
  const endYear = person.endDate ? new Date(person.endDate).getFullYear() : undefined;

  return {
    id: person.id,
    name: person.name || 'Unknown',
    party: normalizeParty(person.party),
    chamber,
    district: person.district || 'Unknown',
    email: person.email,
    phone: person.phone,
    office: person.office,
    photoUrl: person.image,
    committees: [], // Rosters carry no committee memberships; that is a separate source.
    // Only report a term when there are real dates behind it, exactly as the
    // API path does — never inferred from the election cycle.
    terms: startYear !== null ? [{ startYear, endYear, chamber }] : [],
    bills: { sponsored: 0, cosponsored: 0 },
    votingRecord: { totalVotes: 0, partyLineVotes: 0, crossoverVotes: 0 },
  };
}

/**
 * Roster from the committed corpus, or null when it is unavailable.
 *
 * This is the normal path. It replaces 3-9 OpenStates requests per state — New
 * Hampshire alone needed 9 — against an allowance of 1,000 a day that the state
 * surface was structurally exceeding. Completeness is unconditional here: there
 * is no pagination to be truncated by a rate limit, which is the only way the
 * API path could return a partial roster and a confidently wrong party split.
 */
async function fetchStateLegislatorsFromCorpus(
  stateAbbrev: string,
  requestedChamber?: string
): Promise<LegislatorFetchResult | null> {
  const roster = await getJurisdictionRoster(stateAbbrev);
  if (!roster || roster.length === 0) return null;

  const legislators = roster.map(transformCorpusPerson);
  logger.info('Loaded state legislators from roster corpus', {
    stateAbbrev,
    requestedChamber,
    members: legislators.length,
  });

  return {
    legislators: requestedChamber
      ? legislators.filter(leg => leg.chamber === requestedChamber)
      : legislators,
    complete: true,
  };
}

// Fetch state legislators from the OpenStates API. Fallback only — the corpus
// above is the normal path; this runs when the artifact is missing or a
// jurisdiction is absent from it, so a build problem degrades to the old
// behaviour rather than to "Data unavailable".
async function fetchStateLegislators(
  stateAbbrev: string,
  requestedChamber?: string
): Promise<LegislatorFetchResult> {
  const monitor = monitorExternalApi(
    'openstates',
    'legislators',
    `https://v3.openstates.org/people`
  );

  try {
    // NOTE: OpenStates API's 'chamber' parameter is unreliable (returns wrong data for some states like MI)
    // So we fetch ALL legislators with pagination and filter by org_classification ourselves
    const allLegislators: StateLegislator[] = [];
    let page = 1;
    let hasMore = true;
    // OpenStates reports its own match count, so completeness is checked
    // against that rather than inferred from how many rows we managed to pull.
    // A 429 partway through a large chamber (New Hampshire needs 9 pages)
    // otherwise yields a truncated roster and a wrong party split.
    let rawFetched = 0;
    let expectedTotal: number | null = null;
    let complete = true;

    while (hasMore) {
      const url = new URL('https://v3.openstates.org/people');
      url.searchParams.set('jurisdiction', stateAbbrev);
      url.searchParams.set('current_role', 'true');
      url.searchParams.set('per_page', '50'); // OpenStates API maximum is 50
      url.searchParams.set('page', page.toString());

      const response = await fetchWithRetry(url.toString());

      if (!response || !response.ok) {
        monitor.end(false, response?.status);
        logger.error('OpenStates legislators API error', new Error(`HTTP ${response?.status}`), {
          stateAbbrev,
          requestedChamber,
          page,
          statusCode: response?.status,
        });
        complete = false;
        break;
      }

      const data = await response.json();
      const results = data.results || [];
      rawFetched += results.length;
      if (typeof data.pagination?.total_items === 'number') {
        expectedTotal = data.pagination.total_items;
      }

      if (results.length === 0) {
        hasMore = false;
      } else {
        // OpenStates returns statewide executives alongside legislators for a
        // jurisdiction — Michigan's page includes the Governor, Lt. Governor,
        // Attorney General and Secretary of State. They are not members of
        // either chamber, so they are dropped here rather than defaulted into
        // the lower house, where they inflated its roster and party split.
        // 'legislature' is how the unicameral bodies are classified — Nebraska's
        // 46 senators and DC's 13 councilmembers are neither upper nor lower.
        const chamberMembers = (results as unknown[]).filter(person => {
          const role = (person as Record<string, unknown>).current_role as
            | Record<string, unknown>
            | undefined;
          const classification = role?.org_classification;
          return (
            classification === 'upper' ||
            classification === 'lower' ||
            classification === 'legislature'
          );
        });

        const transformed = chamberMembers.map((person: unknown) =>
          transformLegislator(person, stateAbbrev)
        );
        allLegislators.push(...transformed);
        page++;
        // Page size is judged on the raw result count, not the filtered one,
        // so dropping executives never truncates pagination early.
        hasMore = results.length === 50;
      }
    }

    monitor.end(true, 200);

    if (expectedTotal !== null && rawFetched < expectedTotal) {
      complete = false;
    }

    if (!complete) {
      logger.warn('State legislator roster is incomplete', {
        stateAbbrev,
        requestedChamber,
        rawFetched,
        expectedTotal,
        reason: 'pagination stopped early — likely an OpenStates rate limit',
      });
    }

    logger.info('Fetched all state legislators from OpenStates', {
      stateAbbrev,
      requestedChamber,
      totalPages: page - 1,
      totalFetched: allLegislators.length,
      complete,
    });

    // Filter by chamber if requested (using org_classification from transform)
    if (requestedChamber) {
      const filtered = allLegislators.filter(
        (leg: StateLegislator) => leg.chamber === requestedChamber
      );
      logger.info('Filtered legislators by chamber', {
        requestedChamber,
        beforeFilter: allLegislators.length,
        afterFilter: filtered.length,
      });
      return { legislators: filtered, complete };
    }

    return { legislators: allLegislators, complete };
  } catch (error) {
    monitor.end(false, undefined, error as Error);
    logger.error('Error fetching state legislators', error as Error, {
      stateAbbrev,
      requestedChamber,
    });
    return { legislators: [], complete: false };
  }
}

// Transform OpenStates legislator data to our format
function transformLegislator(person: unknown, stateAbbrev: string): StateLegislator {
  const personData = person as Record<string, unknown>;
  const currentRole = personData.current_role as Record<string, unknown> | undefined;

  // OpenStates v3 uses 'org_classification' not 'chamber'
  const orgClassification = currentRole?.org_classification as string | undefined;
  const roleTitle = (currentRole?.title as string | undefined)?.toLowerCase() ?? '';
  // Unicameral members are classified 'legislature'; fall back to the title so
  // Nebraska's senators land in the senate bucket rather than defaulting to a
  // lower house that does not exist.
  const chamber: 'upper' | 'lower' =
    orgClassification === 'upper' ||
    (orgClassification === 'legislature' && roleTitle === 'senator')
      ? 'upper'
      : 'lower';
  const contactDetails = (personData.contact_details as Record<string, unknown>[]) || [];

  const email = contactDetails.find((c: Record<string, unknown>) => c.type === 'email')?.value as
    | string
    | undefined;
  const phone = contactDetails.find((c: Record<string, unknown>) => c.type === 'voice')?.value as
    | string
    | undefined;

  return {
    id: (personData.id as string) || `${stateAbbrev}-${orgClassification}-${currentRole?.district}`,
    name: (personData.name as string) || 'Unknown',
    party: normalizeParty(personData.party as string) || 'Other',
    chamber,
    district: (currentRole?.district as string) || 'Unknown',
    email,
    phone,
    office: contactDetails.find((c: Record<string, unknown>) => c.type === 'address')?.value as
      | string
      | undefined,
    photoUrl: personData.image as string | undefined,
    committees: [], // Would need separate API call to get committee memberships
    // Only report a term when OpenStates gives us real dates. The previous
    // fallbacks invented a 2023 start and a 2025/2027 end for anyone missing
    // them, which put fabricated term years on a legislator's record.
    terms: currentRole?.start_date
      ? [
          {
            startYear: new Date(currentRole.start_date as string).getFullYear(),
            endYear: currentRole?.end_date
              ? new Date(currentRole.end_date as string).getFullYear()
              : undefined,
            chamber,
          },
        ]
      : [],
    bills: {
      sponsored: 0, // Would need separate API call to get bill counts
      cosponsored: 0,
    },
    votingRecord: {
      totalVotes: 0, // Would need separate API call to get voting records
      partyLineVotes: 0,
      crossoverVotes: 0,
    },
  };
}

// Normalize party names
function normalizeParty(party: string): StateLegislator['party'] {
  if (!party) return 'Other';

  const normalized = party.toLowerCase();
  if (normalized.includes('democrat')) return 'Democratic';
  if (normalized.includes('republican')) return 'Republican';
  if (normalized.includes('independent')) return 'Independent';
  return 'Other';
}

// Determine session status based on dates
function determineSessionStatus(
  startDate: string,
  endDate: string
): 'active' | 'in-recess' | 'adjourned' | 'upcoming' {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now < start) {
    return 'upcoming';
  } else if (now > end) {
    return 'adjourned';
  } else {
    // Between start and end - could be active or in recess
    // Without detailed recess data, we'll assume active during session dates
    return 'active';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const { searchParams } = request.nextUrl;
  const chamber = searchParams.get('chamber'); // 'upper', 'lower', or null for both
  const party = searchParams.get('party'); // 'D', 'R', 'I', or null for all

  if (!state || state.length !== 2) {
    return NextResponse.json({ error: 'Valid state abbreviation is required' }, { status: 400 });
  }

  try {
    // Use cached fetch with 60-minute TTL for state legislature data
    const cacheKey = `state-legislature-${state.toUpperCase()}-${chamber || 'all'}-${party || 'all'}`;
    const TTL_60_MINUTES = 60 * 60;

    const legislatureData = await cachedFetch(
      cacheKey,
      async (): Promise<StateLegislatureData> => {
        logger.info(
          'Fetching state legislature data from OpenStates',
          {
            state: state.toUpperCase(),
            chamber: chamber || 'all',
            party: party || 'all',
            operation: 'state_legislature_fetch',
          },
          request
        );

        const stateAbbrev = getStateAbbreviation(state);
        if (!stateAbbrev) {
          throw new Error('Invalid state abbreviation');
        }

        // Rosters come from the committed corpus; only the session still needs
        // the API, which costs one request instead of the roster's 3-9.
        const [jurisdiction, corpusResult] = await Promise.all([
          fetchStateJurisdiction(stateAbbrev),
          fetchStateLegislatorsFromCorpus(stateAbbrev, chamber || undefined),
        ]);
        const legislatorResult =
          corpusResult ?? (await fetchStateLegislators(stateAbbrev, chamber || undefined));
        const { legislators, complete: rosterComplete } = legislatorResult;

        // EMERGENCY FIX: Never return fake legislators - return empty results with clear message
        if (!jurisdiction || legislators.length === 0) {
          logger.warn('OpenStates API unavailable - returning empty results', {
            state: state.toUpperCase(),
            hasJurisdiction: !!jurisdiction,
            legislatorCount: legislators.length,
            reason: 'Real state legislature data not available from OpenStates API',
          });

          // Thrown rather than returned so cachedFetch does not store it.
          // OpenStates allows 40 requests/minute and one roster costs 3-9 of
          // them, so a 429 here is routine and transient — caching the empty
          // result would turn a few seconds of rate limiting into an hour of
          // "Data unavailable". cachedFetch only declines to cache empty
          // *arrays*, and this response is an object, so it would be stored.
          throw new OpenStatesUnavailableError(
            `No legislature data for ${state.toUpperCase()} (jurisdiction: ${!!jurisdiction}, legislators: ${legislators.length})`
          );
        }

        // Calculate party distribution
        const upperLegislators = legislators.filter(leg => leg.chamber === 'upper');
        const lowerLegislators = legislators.filter(leg => leg.chamber === 'lower');

        const upperPartyCount = upperLegislators.reduce((acc: Record<string, number>, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        const lowerPartyCount = lowerLegislators.reduce((acc: Record<string, number>, leg) => {
          acc[leg.party] = (acc[leg.party] || 0) + 1;
          return acc;
        }, {});

        // Real session from OpenStates. If it gives us nothing, say so rather
        // than inventing a session name.
        const currentSession = selectCurrentSession(jurisdiction.legislative_sessions);
        const sessionStartDate = currentSession?.start_date ?? '';
        const sessionEndDate = currentSession?.end_date ?? '';

        // Chamber names and seat counts come from the curated NCSL dataset.
        // The roster length is the number of members OpenStates returned, which
        // drifts from the real chamber size (vacancies, mid-term replacements
        // still listed) and must never be presented as the seat count.
        const metadata = getStateLegislatureMetadata(state.toUpperCase());
        const unicameral = metadata?.unicameral ?? false;

        // In a unicameral legislature every member sits in the single chamber,
        // whichever bucket OpenStates filed them under.
        const unicameralPartyCount = unicameral
          ? legislators.reduce((acc: Record<string, number>, leg) => {
              acc[leg.party] = (acc[leg.party] || 0) + 1;
              return acc;
            }, {})
          : {};

        const buildChamber = (which: 'upper' | 'lower') => {
          const partyCount = unicameral
            ? unicameralPartyCount
            : which === 'upper'
              ? upperPartyCount
              : lowerPartyCount;
          const roster = unicameral
            ? legislators
            : which === 'upper'
              ? upperLegislators
              : lowerLegislators;
          const chamberMeta = metadata?.chambers[which];

          // Unknown party normalizes to 'Other', so a chamber where most
          // members carry no party is a data gap, not a chamber full of
          // independents. Nebraska's legislature is elected on a nonpartisan
          // ballot and trips this legitimately.
          const identified =
            (partyCount['Democratic'] || 0) +
            (partyCount['Republican'] || 0) +
            (partyCount['Independent'] || 0);
          // A truncated roster produces a party split that looks precise and is
          // simply wrong, so completeness gates it too.
          const partyDataAvailable =
            rosterComplete && roster.length > 0 && identified > roster.length / 2;

          return {
            name: chamberMeta?.name ?? (which === 'upper' ? 'Senate' : 'House of Representatives'),
            title: which === 'upper' ? 'Senator' : 'Representative',
            totalSeats: chamberMeta?.seats ?? 0,
            membersListed: roster.length,
            partyDataAvailable,
            democraticSeats: partyCount['Democratic'] || 0,
            republicanSeats: partyCount['Republican'] || 0,
            otherSeats: (partyCount['Independent'] || 0) + (partyCount['Other'] || 0),
          };
        };

        return {
          state: state.toUpperCase(),
          stateName: metadata?.name || jurisdiction.name || state.toUpperCase(),
          lastUpdated: new Date().toISOString(),
          isUnicameral: unicameral,
          rosterComplete,
          session: currentSession
            ? {
                name: currentSession.name || currentSession.identifier || 'Current session',
                identifier: currentSession.identifier,
                startDate: sessionStartDate,
                endDate: sessionEndDate,
                type: (currentSession.classification === 'special' ? 'special' : 'regular') as
                  | 'regular'
                  | 'special',
                status: determineSessionStatus(sessionStartDate, sessionEndDate),
                // Note: recesses and deadlines require state-specific data not provided by OpenStates API
                // These fields can be populated with manual data or state-specific scraping in the future
              }
            : {
                name: 'Session data unavailable',
                startDate: '',
                endDate: '',
                type: 'regular' as const,
              },
          chambers: {
            upper: buildChamber('upper'),
            lower: buildChamber('lower'),
          },
          legislators,
        };
      },
      TTL_60_MINUTES
    );

    // Apply filters
    let filteredLegislators = legislatureData.legislators;

    if (chamber) {
      filteredLegislators = filteredLegislators.filter(leg => leg.chamber === chamber);
    }

    if (party) {
      const partyMap: Record<string, string> = {
        D: 'Democratic',
        R: 'Republican',
        I: 'Independent',
      };
      const fullPartyName = partyMap[party.toUpperCase()];
      if (fullPartyName) {
        filteredLegislators = filteredLegislators.filter(leg => leg.party === fullPartyName);
      }
    }

    const response = {
      ...legislatureData,
      legislators: filteredLegislators,
      totalCount: filteredLegislators.length,
      filters: {
        chamber: chamber || 'all',
        party: party || 'all',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=259200, stale-while-revalidate=518400',
      },
    });
  } catch (error) {
    logger.error(
      'State Legislature API Error',
      error as Error,
      {
        state: state.toUpperCase(),
        chamber: chamber || 'all',
        party: party || 'all',
        operation: 'state_legislature_api_error',
      },
      request
    );

    // Return empty but valid response structure on error. The state's real
    // name and chamber names are still known from curated data, so only the
    // live figures are withheld.
    const basics = getBasicStateInfo(state.toUpperCase());
    const errorResponse = {
      state: state.toUpperCase(),
      stateName: basics.name,
      lastUpdated: new Date().toISOString(),
      session: {
        name: 'Data Unavailable',
        startDate: '',
        endDate: '',
        type: 'regular' as const,
      },
      chambers: basics.chambers,
      legislators: [],
      totalCount: 0,
      error: 'State legislature data temporarily unavailable',
    };

    // Short CDN cache rather than no-store. The failure must not persist for
    // the full 60-minute success TTL, but serving it uncached is worse: every
    // page view would re-attempt OpenStates, and each attempt counts against
    // the 1000/day quota even when it is rejected, so a quota exhaustion could
    // never drain. 60 seconds lets the CDN absorb repeats while still
    // retrying roughly once a minute.
    return NextResponse.json(errorResponse, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=60' },
    });
  }
}

// EMERGENCY FIX: Removed generateFallbackData function
// Never return fake legislators - this was generating mock data

function getBasicStateInfo(state: string) {
  const metadata = getStateLegislatureMetadata(state);
  const stateNames: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
  };

  return {
    name: stateNames[state] || 'Unknown State',
    chambers: {
      upper: {
        name: metadata?.chambers.upper.name ?? 'Senate',
        title: 'Senator',
        // Left at 0 on purpose: this is the OpenStates-unavailable path, and
        // consumers read totalSeats === 0 as "no data".
        totalSeats: 0,
        democraticSeats: 0,
        republicanSeats: 0,
        otherSeats: 0,
      },
      lower: {
        name: metadata?.chambers.lower.name ?? 'House of Representatives',
        title: 'Representative',
        totalSeats: 0,
        democraticSeats: 0,
        republicanSeats: 0,
        otherSeats: 0,
      },
    },
  };
}
