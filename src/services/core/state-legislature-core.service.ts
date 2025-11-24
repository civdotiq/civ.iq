/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislature Core Service
 *
 * This service provides direct function access to state legislature data
 * from OpenStates.org API, eliminating service-to-self HTTP calls.
 *
 * Key Benefits:
 * - Eliminates network latency for internal calls
 * - Removes circular HTTP dependencies
 * - Provides consistent caching strategy
 * - Centralizes state legislature data logic
 *
 * Architecture:
 * - Direct calls to OpenStatesAPI class
 * - Election-aware caching with govCache:
 *   * Legislators: 30 days (Jan-Sep) / 3 days (Oct-Dec election season)
 *   * Bills: 60 minutes (active legislative data)
 *   * Votes: 6 months (immutable historical records)
 * - Type-safe with state-legislature.ts types
 * - Graceful degradation when API unavailable
 *
 * Caching Rationale:
 * State legislators change primarily during biennial election cycles.
 * Elections occur in November (even years); certified results in December.
 * Mid-term changes (special elections) are rare (<5% annually).
 * This election-aware strategy reduces API calls by ~95% while maintaining accuracy.
 */

import { openStatesAPI, OpenStatesUtils } from '@/lib/openstates-api';
import { getStateDistrictDemographics } from '@/lib/services/state-census-api.service';
import type {
  OpenStatesLegislator,
  OpenStatesBill,
  OpenStatesJurisdiction,
  OpenStatesPersonVote,
} from '@/lib/openstates-api';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  EnhancedStateLegislator,
  StateLegislatorSummary,
  StateChamber,
  StateParty,
  StateBill,
  StateBillSummary,
  StateJurisdiction,
  ZipCodeStateLegislators,
  StatePersonVote,
  StateVoteDetail,
} from '@/types/state-legislature';

export class StateLegislatureCoreService {
  /**
   * Transform OpenStates legislator to EnhancedStateLegislator
   */
  private static transformLegislator(osLegislator: OpenStatesLegislator): EnhancedStateLegislator {
    // Parse name components
    const nameParts = osLegislator.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(-1)[0] || '';

    // Map party to standard format
    const partyMap: Record<string, StateParty> = {
      Democratic: 'Democratic',
      Republican: 'Republican',
      Independent: 'Independent',
      Green: 'Green',
      Libertarian: 'Libertarian',
    };
    const party: StateParty = partyMap[osLegislator.party] || 'Other';

    return {
      id: osLegislator.id,
      name: osLegislator.name,
      firstName,
      lastName,
      party,
      state: osLegislator.state,
      chamber: osLegislator.chamber,
      district: osLegislator.district,
      email: osLegislator.email,
      phone: osLegislator.phone,
      photo_url: osLegislator.photo_url,
      isActive: true,
      terms: [
        {
          chamber: osLegislator.chamber,
          district: osLegislator.district,
          startYear: new Date().getFullYear().toString(),
          endYear: undefined,
          party,
        },
      ],
      links: osLegislator.links,
      extras: osLegislator.extras,
      metadata: {
        lastUpdated: new Date().toISOString(),
        dataSources: ['openstates'],
        completeness: {
          basicInfo: true,
          biography: false,
          contact: !!(osLegislator.email || osLegislator.phone),
          committees: false,
          voting: false,
          legislation: false,
        },
      },
    };
  }

  /**
   * Transform OpenStates legislator to summary
   */
  private static transformLegislatorSummary(
    osLegislator: OpenStatesLegislator
  ): StateLegislatorSummary {
    const partyMap: Record<string, StateParty> = {
      Democratic: 'Democratic',
      Republican: 'Republican',
      Independent: 'Independent',
      Green: 'Green',
      Libertarian: 'Libertarian',
    };
    const party: StateParty = partyMap[osLegislator.party] || 'Other';

    return {
      id: osLegislator.id,
      name: osLegislator.name,
      party,
      state: osLegislator.state,
      chamber: osLegislator.chamber,
      district: osLegislator.district,
      photo_url: osLegislator.photo_url,
      phone: osLegislator.phone,
      email: osLegislator.email,
    };
  }

  /**
   * Transform OpenStates bill to StateBill
   */
  private static transformBill(osBill: OpenStatesBill, state: string): StateBill {
    // Extract abstract from v3 API response (uses first abstract if multiple exist)
    const abstract =
      osBill.abstracts && osBill.abstracts.length > 0 ? osBill.abstracts[0]?.abstract : undefined;

    return {
      id: osBill.id,
      identifier: osBill.identifier,
      title: osBill.title,
      abstract,
      classification: (osBill.classification ?? []) as StateBill['classification'],
      subject: osBill.subject ?? [],
      chamber: (osBill.chamber ?? 'lower') as StateChamber,
      from_organization: '', // v3 API doesn't provide from_organization in simplified format
      session: '', // OpenStates doesn't always return session in bill object
      state: state.toUpperCase(),
      sponsorships:
        osBill.sponsorships?.map(s => ({
          name: s.name,
          legislatorId: undefined,
          entity_type: s.entity_type as 'person' | 'organization',
          classification: s.classification === 'primary' ? 'primary' : 'cosponsor',
          primary: s.primary,
        })) ?? [],
      actions:
        osBill.actions?.map(action => ({
          date: action.date,
          description: action.description,
          organization: osBill.chamber === 'upper' ? 'Senate' : 'House',
          classification: action.classification,
        })) ?? [],
      votes: (osBill.votes ?? []).map(vote => ({
        id: vote.id,
        identifier: vote.id,
        motion_text: vote.motion_text,
        start_date: vote.start_date,
        result: vote.result as 'passed' | 'failed',
        chamber: (osBill.chamber ?? 'lower') as StateChamber,
        counts: vote.counts.map(c => ({
          option: c.option as 'yes' | 'no' | 'absent' | 'abstain' | 'not voting',
          value: c.value,
        })),
      })),
      sources: osBill.sources ?? [],
      extras: undefined, // v3 API doesn't provide extras in simplified format
    };
  }

  /**
   * Transform OpenStates bill to summary
   */
  private static transformBillSummary(osBill: OpenStatesBill): StateBillSummary {
    const latestAction = osBill.actions?.[osBill.actions.length - 1];
    const primarySponsor = osBill.sponsorships?.find(s => s.primary)?.name;

    return {
      id: osBill.id,
      identifier: osBill.identifier,
      title: osBill.title,
      chamber: (osBill.chamber ?? 'lower') as StateChamber,
      primary_sponsor: primarySponsor,
      latest_action: latestAction?.description,
      latest_action_date: latestAction?.date,
    };
  }

  /**
   * Transform OpenStates jurisdiction to StateJurisdiction
   */
  private static transformJurisdiction(
    osJurisdiction: OpenStatesJurisdiction,
    state: string
  ): StateJurisdiction {
    // Use the first legislative session if available
    const currentSession = osJurisdiction.legislative_sessions?.[0];

    return {
      id: osJurisdiction.id,
      name: osJurisdiction.name,
      state: state.toUpperCase(),
      classification: osJurisdiction.classification,
      division_id: '', // v3 API doesn't provide division_id in simplified format
      url: '', // v3 API doesn't provide url in simplified format
      chambers: {
        upper: {
          name: osJurisdiction.chambers.upper?.name || 'Senate',
          title: osJurisdiction.chambers.upper?.title || 'Senator',
        },
        lower: {
          name: osJurisdiction.chambers.lower?.name || 'House of Representatives',
          title: osJurisdiction.chambers.lower?.title || 'Representative',
        },
      },
      currentSession: currentSession
        ? {
            identifier: currentSession.identifier,
            name: currentSession.name,
            start_date: currentSession.start_date,
            end_date: currentSession.end_date,
            active: true,
          }
        : undefined,
    };
  }

  /**
   * Get state legislators by geographic location (lat/lng)
   * Uses OpenStates /people.geo endpoint - faster than district-based lookup
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Object with senator and representative for that location
   */
  static async getStateLegislatorsByLocation(
    lat: number,
    lng: number
  ): Promise<{
    senator: EnhancedStateLegislator | null;
    representative: EnhancedStateLegislator | null;
  }> {
    const cacheKey = `core:state-legislators:geo:${lat.toFixed(6)},${lng.toFixed(6)}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<{
        senator: EnhancedStateLegislator | null;
        representative: EnhancedStateLegislator | null;
      }>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for geographic state legislators', {
          lat,
          lng,
          hasSenator: !!cached.senator,
          hasRep: !!cached.representative,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Check if OpenStates is configured
      if (!OpenStatesUtils.isConfigured()) {
        logger.warn('OpenStates API not configured', { lat, lng });
        return { senator: null, representative: null };
      }

      // Direct function call to OpenStates /people.geo API
      logger.info('Fetching state legislators via geographic OpenStates API call', {
        lat,
        lng,
      });
      const legislators = await openStatesAPI.getLegislatorsByLocation(lat, lng);

      if (!legislators || legislators.length === 0) {
        logger.warn('No state legislators returned from OpenStates geographic lookup', {
          lat,
          lng,
        });
        return { senator: null, representative: null };
      }

      // Transform to our type system
      const enhancedLegislators = legislators.map(leg => this.transformLegislator(leg));

      // Separate by chamber
      const senator = enhancedLegislators.find(leg => leg.chamber === 'upper') || null;
      const representative = enhancedLegislators.find(leg => leg.chamber === 'lower') || null;

      const result = { senator, representative };

      // Cache the result with election-aware TTL
      const now = new Date();
      const month = now.getMonth();
      const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec
      const geoTTL = isElectionSeason ? 259200000 : 2592000000; // 3 days or 30 days

      await govCache.set(cacheKey, result, {
        ttl: geoTTL, // Election-aware: 3 days (Oct-Dec) or 30 days (Jan-Sep)
        source: 'openstates-geo',
        dataType: 'representatives',
      });

      logger.info('Successfully cached state legislators via geographic lookup', {
        lat,
        lng,
        hasSenator: !!senator,
        hasRep: !!representative,
        senatorName: senator?.name,
        repName: representative?.name,
        responseTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Failed to get state legislators by location', error as Error, {
        lat,
        lng,
        responseTime: Date.now() - startTime,
      });
      return { senator: null, representative: null };
    }
  }

  /**
   * Get all state legislators for a state - DIRECT function call, no HTTP
   */
  static async getAllStateLegislators(
    state: string,
    chamber?: StateChamber
  ): Promise<EnhancedStateLegislator[]> {
    const cacheKey = `core:state-legislators:${state}:${chamber || 'all'}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<EnhancedStateLegislator[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state legislators', {
          state,
          chamber,
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Check if OpenStates is configured
      if (!OpenStatesUtils.isConfigured()) {
        logger.warn('OpenStates API not configured', { state, chamber });
        return [];
      }

      // Direct function call to OpenStates API - NO HTTP fetch to localhost!
      logger.info('Fetching state legislators via direct OpenStates API call', {
        state,
        chamber,
      });
      const legislators = await openStatesAPI.getLegislators(state, chamber);

      if (!legislators || legislators.length === 0) {
        logger.warn('No state legislators returned from OpenStates', {
          state,
          chamber,
        });
        return [];
      }

      // Transform to our type system
      const enhancedLegislators = legislators.map(leg => this.transformLegislator(leg));

      // Cache the result with election-aware TTL
      // Legislator rosters change primarily during election cycles (every 2 years)
      // Elections occur in Nov (even years); certified results in Dec
      // Mid-term changes (special elections) are rare (<5% annually)
      const now = new Date();
      const month = now.getMonth(); // 0-11 (0=Jan, 9=Oct, 10=Nov, 11=Dec)
      const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec
      const rosterTTL = isElectionSeason ? 259200000 : 2592000000; // 3 days or 30 days

      await govCache.set(cacheKey, enhancedLegislators, {
        ttl: rosterTTL, // Election-aware: 3 days (Oct-Dec) or 30 days (Jan-Sep)
        source: 'openstates-direct',
        dataType: 'representatives', // Using representatives dataType for similar data
      });

      logger.info('Successfully cached state legislators', {
        state,
        chamber,
        count: enhancedLegislators.length,
        responseTime: Date.now() - startTime,
      });

      return enhancedLegislators;
    } catch (error) {
      logger.error('Failed to get state legislators', error as Error, {
        state,
        chamber,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get state legislators as summaries (for list views)
   */
  static async getStateLegislatorsSummary(
    state: string,
    chamber?: StateChamber
  ): Promise<StateLegislatorSummary[]> {
    const cacheKey = `core:state-legislators-summary:${state}:${chamber || 'all'}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StateLegislatorSummary[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state legislators summary', {
          state,
          chamber,
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Get legislators from OpenStates
      const legislators = await openStatesAPI.getLegislators(state, chamber);
      const summaries = legislators.map(leg => this.transformLegislatorSummary(leg));

      // Cache the result with election-aware TTL
      const now = new Date();
      const month = now.getMonth();
      const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec
      const summaryTTL = isElectionSeason ? 259200000 : 2592000000; // 3 days or 30 days

      await govCache.set(cacheKey, summaries, {
        ttl: summaryTTL, // Election-aware: 3 days (Oct-Dec) or 30 days (Jan-Sep)
        source: 'openstates-direct',
        dataType: 'representatives',
      });

      logger.info('Successfully cached state legislators summary', {
        state,
        chamber,
        count: summaries.length,
        responseTime: Date.now() - startTime,
      });

      return summaries;
    } catch (error) {
      logger.error('Failed to get state legislators summary', error as Error, {
        state,
        chamber,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get single state legislator by ID - DIRECT lookup, no HTTP
   */
  static async getStateLegislatorById(
    state: string,
    legislatorId: string
  ): Promise<EnhancedStateLegislator | null> {
    // Normalize state to uppercase for consistent caching across all endpoints
    const normalizedState = state.toUpperCase();
    const cacheKey = `core:state-legislator:${normalizedState}:${legislatorId}`;
    const startTime = Date.now();

    try {
      // Check individual cache first
      const cached = await govCache.get<EnhancedStateLegislator>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for individual state legislator', {
          state: normalizedState,
          legislatorId,
          name: cached.name,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Try direct person lookup API first for detailed profile data
      const osLegislator = await openStatesAPI.getPersonById(legislatorId);

      // Fallback to list endpoint if direct lookup fails
      // Some legislators may not be available via direct endpoint but exist in the list
      if (!osLegislator) {
        logger.info('Direct person lookup failed, falling back to list endpoint', {
          state: normalizedState,
          legislatorId,
        });

        const allLegislators = await this.getAllStateLegislators(normalizedState);
        const legislatorFromList = allLegislators.find(leg => leg.id === legislatorId);

        if (!legislatorFromList) {
          logger.warn('State legislator not found in list either', {
            state: normalizedState,
            legislatorId,
            totalLegsSearched: allLegislators.length,
            responseTime: Date.now() - startTime,
          });
          return null;
        }

        // Return the legislator from the list (won't have enhanced bio data, but will work)
        return legislatorFromList;
      }

      // Transform to our enhanced type
      const legislator = this.transformLegislator(osLegislator);

      // ENRICHMENT PHASE: Fetch additional data in parallel for better performance
      await Promise.allSettled([
        // 1. Fetch district demographics from Census API
        (async () => {
          try {
            const demographics = await getStateDistrictDemographics(
              normalizedState,
              legislator.district,
              legislator.chamber
            );

            if (demographics) {
              legislator.demographics = demographics;
              logger.info('Enriched state legislator with district demographics', {
                state: normalizedState,
                legislatorId,
                district: legislator.district,
                chamber: legislator.chamber,
                population: demographics.population,
              });
            }
          } catch (error) {
            logger.warn('Failed to fetch district demographics, continuing without', {
              error: error instanceof Error ? error.message : 'Unknown error',
              state: normalizedState,
              legislatorId,
              district: legislator.district,
            });
          }
        })(),

        // 2. Fetch committees for this legislator
        (async () => {
          try {
            const allCommittees = await openStatesAPI.getCommittees(
              normalizedState,
              legislator.chamber,
              undefined,
              true // include memberships
            );

            // Filter to committees where this legislator is a member
            const legislatorCommittees = allCommittees
              .filter(committee =>
                committee.memberships?.some(member => member.person_id === legislatorId)
              )
              .map(committee => {
                const membership = committee.memberships?.find(m => m.person_id === legislatorId);
                return {
                  id: committee.id,
                  name: committee.name,
                  role: membership?.role as
                    | 'Chair'
                    | 'Vice Chair'
                    | 'Ranking Member'
                    | 'Member'
                    | undefined,
                  chamber: committee.chamber || legislator.chamber,
                };
              });

            if (legislatorCommittees.length > 0) {
              legislator.committees = legislatorCommittees;
              logger.info('Enriched state legislator with committees', {
                state: normalizedState,
                legislatorId,
                committeeCount: legislatorCommittees.length,
              });
            }

            // Update completeness metadata
            if (legislator.metadata?.completeness) {
              legislator.metadata.completeness.committees = legislatorCommittees.length > 0;
            }
          } catch (error) {
            logger.warn('Failed to fetch committees, continuing without', {
              error: error instanceof Error ? error.message : 'Unknown error',
              state: normalizedState,
              legislatorId,
            });
          }
        })(),

        // 3. Fetch bills to get sponsored/cosponsored counts
        (async () => {
          try {
            const bills = await openStatesAPI.getBillsBySponsor(
              legislatorId,
              normalizedState,
              undefined,
              100
            );

            if (bills.length > 0) {
              // Count primary sponsorships vs cosponsorships
              let sponsoredCount = 0;
              let cosponsoredCount = 0;

              bills.forEach(bill => {
                const sponsorship = bill.sponsorships?.find(
                  s => s.name === legislator.name || s.entity_type === 'person'
                );
                if (sponsorship?.primary) {
                  sponsoredCount++;
                } else if (sponsorship) {
                  cosponsoredCount++;
                }
              });

              legislator.legislation = {
                sponsored: sponsoredCount,
                cosponsored: cosponsoredCount,
                passed: 0, // Future enhancement: Calculate from bill.status
                failed: 0,
                pending: 0,
              };

              logger.info('Enriched state legislator with legislation counts', {
                state: normalizedState,
                legislatorId,
                sponsored: sponsoredCount,
                cosponsored: cosponsoredCount,
              });
            }

            // Update completeness metadata
            if (legislator.metadata?.completeness) {
              legislator.metadata.completeness.legislation = bills.length > 0;
            }
          } catch (error) {
            logger.warn('Failed to fetch bills, continuing without', {
              error: error instanceof Error ? error.message : 'Unknown error',
              state: normalizedState,
              legislatorId,
            });
          }
        })(),

        // 4. Fetch Wikipedia biography
        (async () => {
          try {
            const wikipediaData = await this.fetchWikipediaForStateLegislator(
              legislator.name,
              normalizedState
            );

            if (wikipediaData) {
              legislator.wikipedia = wikipediaData;
              logger.info('Enriched state legislator with Wikipedia data', {
                state: normalizedState,
                legislatorId,
                hasWikipedia: true,
              });
            }

            // Update completeness metadata
            if (legislator.metadata?.completeness) {
              legislator.metadata.completeness.biography = !!wikipediaData;
            }
          } catch (error) {
            logger.warn('Failed to fetch Wikipedia data, continuing without', {
              error: error instanceof Error ? error.message : 'Unknown error',
              state: normalizedState,
              legislatorId,
            });
          }
        })(),
      ]);

      // Cache individual legislator with all enrichments
      // Use election-aware TTL for legislator profile (changes rarely between elections)
      // Legislative activity (bills, votes) is cached separately with shorter TTLs
      const now = new Date();
      const month = now.getMonth();
      const isElectionSeason = month >= 9 && month <= 11; // Oct-Dec
      const legislatorTTL = isElectionSeason ? 259200000 : 2592000000; // 3 days or 30 days

      await govCache.set(cacheKey, legislator, {
        ttl: legislatorTTL, // Election-aware: 3 days (Oct-Dec) or 30 days (Jan-Sep)
        source: 'openstates-individual-enriched',
        dataType: 'representatives',
      });

      logger.info('Successfully found and enriched state legislator', {
        state: normalizedState,
        legislatorId,
        name: legislator.name,
        hasDemographics: !!legislator.demographics,
        hasCommittees: !!legislator.committees && legislator.committees.length > 0,
        hasLegislation: !!legislator.legislation,
        hasWikipedia: !!legislator.wikipedia,
        responseTime: Date.now() - startTime,
      });

      return legislator;
    } catch (error) {
      logger.error('Failed to get state legislator by ID', error as Error, {
        state: normalizedState,
        legislatorId,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Get voting records for a specific state legislator - DIRECT function call, no HTTP
   */
  static async getStateLegislatorVotes(
    state: string,
    legislatorId: string,
    limit = 50
  ): Promise<StatePersonVote[]> {
    const cacheKey = `core:state-legislator-votes:${state}:${legislatorId}:${limit}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StatePersonVote[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state legislator votes', {
          state,
          legislatorId,
          voteCount: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Fetch votes directly from OpenStates API
      const osVotes: OpenStatesPersonVote[] = await openStatesAPI.getVotesByPerson(
        legislatorId,
        limit
      );

      // Transform to StatePersonVote format
      const votes: StatePersonVote[] = osVotes.map(osVote => ({
        vote_id: osVote.vote_id,
        identifier: osVote.identifier,
        motion_text: osVote.motion_text,
        start_date: osVote.start_date,
        result: osVote.result === 'pass' ? 'passed' : 'failed',
        option: osVote.option,
        bill_identifier: osVote.bill_identifier,
        bill_title: osVote.bill_title,
        bill_id: osVote.bill_id,
        organization_name: osVote.organization_name,
        chamber: osVote.chamber,
      }));

      // Cache the transformed votes for 1 hour
      await govCache.set(cacheKey, votes, {
        ttl: 3600000, // 60 minutes
        source: 'openstates-votes',
        dataType: 'voting',
      });

      logger.info('Successfully fetched state legislator votes', {
        state,
        legislatorId,
        voteCount: votes.length,
        limit,
        responseTime: Date.now() - startTime,
      });

      return votes;
    } catch (error) {
      logger.error('Failed to get state legislator votes', error as Error, {
        state,
        legislatorId,
        limit,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get detailed vote information by vote ID - DIRECT function call, no HTTP
   */
  static async getStateVoteById(state: string, voteId: string): Promise<StateVoteDetail | null> {
    const cacheKey = `core:state-vote:${state}:${voteId}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StateVoteDetail>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state vote detail', {
          state,
          voteId,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Fetch vote details from OpenStates API
      const osVote = await openStatesAPI.getVoteById(voteId);

      if (!osVote) {
        logger.warn('State vote not found', {
          state,
          voteId,
          responseTime: Date.now() - startTime,
        });
        return null;
      }

      // Transform to StateVoteDetail format
      const voteDetail: StateVoteDetail = {
        id: osVote.id,
        identifier: osVote.identifier,
        motion_text: osVote.motion_text,
        motion_classification: osVote.motion_classification,
        start_date: osVote.start_date,
        result: osVote.result === 'pass' ? 'passed' : 'failed',
        chamber: osVote.organization.classification === 'upper' ? 'upper' : 'lower',
        organization_name: osVote.organization.name,
        counts: osVote.counts.map(c => ({
          option: c.option as 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused',
          value: c.value,
        })),
        votes: osVote.votes,
        bill: osVote.bill,
      };

      // Cache the vote detail with long TTL (votes are immutable historical records)
      await govCache.set(cacheKey, voteDetail, {
        ttl: 15552000000, // 6 months - vote records don't change
        source: 'openstates-vote',
        dataType: 'voting',
      });

      logger.info('Successfully fetched state vote detail', {
        state,
        voteId,
        voterCount: voteDetail.votes.length,
        result: voteDetail.result,
        responseTime: Date.now() - startTime,
      });

      return voteDetail;
    } catch (error) {
      logger.error('Failed to get state vote by ID', error as Error, {
        state,
        voteId,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Get state legislators by ZIP code - DIRECT lookup with state mapping
   */
  static async getStateLegislatorsByZip(zipCode: string): Promise<ZipCodeStateLegislators | null> {
    const cacheKey = `core:state-legislators:zip:${zipCode}`;
    const startTime = Date.now();

    try {
      // Check ZIP-specific cache first
      const cached = await govCache.get<ZipCodeStateLegislators>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for ZIP state legislators', {
          zipCode,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // NOTE: ZIP-to-state-district mapping not yet implemented
      // This would require integration with Census geocoding API
      // or state-specific district boundary data
      logger.info('ZIP-to-state-legislator mapping not yet fully implemented', {
        zipCode,
        responseTime: Date.now() - startTime,
      });

      return null;
    } catch (error) {
      logger.error('Failed to get state legislators by ZIP', error as Error, {
        zipCode,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Get state bills - DIRECT function call, no HTTP
   */
  static async getStateBills(
    state: string,
    session?: string,
    chamber?: StateChamber,
    subject?: string,
    limit = 50
  ): Promise<StateBillSummary[]> {
    const cacheKey = `core:state-bills:${state}:${session || 'current'}:${chamber || 'all'}:${subject || 'all'}:${limit}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StateBillSummary[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state bills', {
          state,
          session,
          chamber,
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Check if OpenStates is configured
      if (!OpenStatesUtils.isConfigured()) {
        logger.warn('OpenStates API not configured for bills', { state });
        return [];
      }

      // Direct function call to OpenStates API
      logger.info('Fetching state bills via direct OpenStates API call', {
        state,
        session,
        chamber,
        subject,
        limit,
      });
      const bills = await openStatesAPI.getBills(state, session, chamber, subject, limit);

      if (!bills || bills.length === 0) {
        logger.warn('No state bills returned from OpenStates', {
          state,
          session,
          chamber,
        });
        return [];
      }

      // Transform to summaries
      const billSummaries = bills.map(bill => this.transformBillSummary(bill));

      // Cache the result
      await govCache.set(cacheKey, billSummaries, {
        ttl: 3600000, // 60 minutes
        source: 'openstates-direct',
        dataType: 'bills',
      });

      logger.info('Successfully cached state bills', {
        state,
        session,
        chamber,
        count: billSummaries.length,
        responseTime: Date.now() - startTime,
      });

      return billSummaries;
    } catch (error) {
      logger.error('Failed to get state bills', error as Error, {
        state,
        session,
        chamber,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get single state bill by ID - DIRECT lookup, no HTTP
   */
  static async getStateBillById(state: string, billId: string): Promise<StateBill | null> {
    const cacheKey = `core:state-bill:${state}:${billId}`;
    const startTime = Date.now();

    try {
      // Check individual cache first
      const cached = await govCache.get<StateBill>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for individual state bill', {
          state,
          billId,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Use direct bill lookup API for efficiency
      const osBill = await openStatesAPI.getBillById(billId);

      if (osBill) {
        const bill = this.transformBill(osBill, state);

        // Cache individual bill
        await govCache.set(cacheKey, bill, {
          ttl: 3600000, // 60 minutes
          source: 'openstates-individual',
          dataType: 'bills',
        });

        logger.info('Successfully found state bill', {
          state,
          billId,
          identifier: bill.identifier,
          hasAbstract: !!(bill.abstract && bill.abstract.length > 0),
          responseTime: Date.now() - startTime,
        });

        return bill;
      }

      logger.warn('State bill not found', {
        state,
        billId,
        responseTime: Date.now() - startTime,
      });

      return null;
    } catch (error) {
      logger.error('Failed to get state bill by ID', error as Error, {
        state,
        billId,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Get bills sponsored or cosponsored by a specific state legislator
   * Uses server-side filtering for optimal performance
   * @param state - State abbreviation
   * @param legislatorId - OpenStates person ID
   * @param session - Optional session identifier
   * @param limit - Maximum number of bills to return
   */
  static async getStateLegislatorBills(
    state: string,
    legislatorId: string,
    session?: string,
    limit = 50
  ): Promise<StateBill[]> {
    const cacheKey = `core:state-legislator-bills:${state}:${legislatorId}:${session || 'latest'}:${limit}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StateBill[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for legislator bills', {
          state,
          legislatorId,
          billCount: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Use server-side sponsor filtering (efficient!)
      const osBills = await openStatesAPI.getBillsBySponsor(legislatorId, state, session, limit);

      // Transform to our type system
      const bills = osBills.map(bill => this.transformBill(bill, state));

      // Cache for 1 hour
      await govCache.set(cacheKey, bills, {
        ttl: 3600000, // 60 minutes
        source: 'openstates-bills',
        dataType: 'bills',
      });

      logger.info('Successfully fetched legislator bills via sponsor filtering', {
        state,
        legislatorId,
        billCount: bills.length,
        responseTime: Date.now() - startTime,
      });

      return bills;
    } catch (error) {
      logger.error('Failed to get legislator bills', error as Error, {
        state,
        legislatorId,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get state jurisdiction information - DIRECT function call, no HTTP
   */
  static async getStateJurisdiction(state: string): Promise<StateJurisdiction | null> {
    const cacheKey = `core:state-jurisdiction:${state}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<StateJurisdiction>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state jurisdiction', {
          state,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Check if OpenStates is configured
      if (!OpenStatesUtils.isConfigured()) {
        logger.warn('OpenStates API not configured for jurisdiction', { state });
        return null;
      }

      // Direct function call to OpenStates API
      logger.info('Fetching state jurisdiction via direct OpenStates API call', {
        state,
      });
      const osJurisdiction = await openStatesAPI.getJurisdiction(state);

      if (!osJurisdiction) {
        logger.warn('No jurisdiction data returned from OpenStates', { state });
        return null;
      }

      // Transform to our type system
      const jurisdiction = this.transformJurisdiction(osJurisdiction, state);

      // Cache the result with longer TTL (jurisdiction data changes infrequently)
      await govCache.set(cacheKey, jurisdiction, {
        ttl: 86400000, // 24 hours
        source: 'openstates-direct',
        dataType: 'districts',
      });

      logger.info('Successfully cached state jurisdiction', {
        state,
        jurisdictionName: jurisdiction.name,
        responseTime: Date.now() - startTime,
      });

      return jurisdiction;
    } catch (error) {
      logger.error('Failed to get state jurisdiction', error as Error, {
        state,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Fetch Wikipedia data for a state legislator
   * Uses Wikipedia REST API with intelligent search
   * @param legislatorName - Full name of the legislator
   * @param state - State code (e.g., 'MI')
   * @returns Wikipedia data or null if not found
   */
  private static async fetchWikipediaForStateLegislator(
    legislatorName: string,
    state: string
  ): Promise<{
    summary: string;
    htmlSummary: string;
    pageUrl: string;
  } | null> {
    try {
      // Search Wikipedia for the legislator
      const searchQuery = `${legislatorName} ${state} state legislator`;
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&format=json&origin=*`;

      const searchResponse = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq)',
        },
      });

      if (!searchResponse.ok) return null;

      const searchData = await searchResponse.json();
      if (!searchData.query?.search?.[0]) return null;

      const pageTitle = searchData.query.search[0].title;

      // Fetch page summary
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
      const summaryResponse = await fetch(summaryUrl, {
        headers: {
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq)',
        },
      });

      if (!summaryResponse.ok) return null;

      const summary = await summaryResponse.json();

      return {
        summary: summary.extract,
        htmlSummary: summary.extract_html,
        pageUrl: summary.content_urls.desktop.page,
      };
    } catch (error) {
      logger.warn('Failed to fetch Wikipedia data for state legislator', {
        error: error instanceof Error ? error.message : 'Unknown error',
        legislatorName,
        state,
      });
      return null;
    }
  }

  /**
   * Cache invalidation utilities
   */
  static async invalidateCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        await govCache.clear(`core:state-${pattern}`);
        logger.info('Invalidated state legislature core service cache', { pattern });
      } else {
        await govCache.clear('core:state-');
        logger.info('Invalidated all state legislature core service cache');
      }
    } catch (error) {
      logger.error('Failed to invalidate state legislature cache', error as Error, {
        pattern,
      });
    }
  }

  /**
   * Get service health and statistics
   */
  static async getHealthStatus(state = 'CA'): Promise<{
    healthy: boolean;
    openStatesConfigured: boolean;
    sampleStateLegislators: number;
    cacheStats: Record<string, unknown>;
    lastUpdate: string;
  }> {
    try {
      const configured = OpenStatesUtils.isConfigured();
      let legislatorCount = 0;

      if (configured) {
        const legislators = await this.getAllStateLegislators(state);
        legislatorCount = legislators.length;
      }

      const cacheStats = await govCache.getStats();

      return {
        healthy: configured && legislatorCount > 0,
        openStatesConfigured: configured,
        sampleStateLegislators: legislatorCount,
        cacheStats,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('State legislature health check failed', error as Error);
      return {
        healthy: false,
        openStatesConfigured: false,
        sampleStateLegislators: 0,
        cacheStats: {},
        lastUpdate: new Date().toISOString(),
      };
    }
  }
}
