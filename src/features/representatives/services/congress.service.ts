/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress Legislators Data Integration
 *
 * This module integrates with the unitedstates/congress-legislators repository
 * to provide enhanced representative data including social media, contact info,
 * committee memberships, and comprehensive ID mappings.
 *
 * Data sources:
 * - https://github.com/unitedstates/congress-legislators
 * - legislators-current.yaml: Current members of Congress
 * - legislators-social-media.yaml: Social media accounts
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import yaml from 'js-yaml';
import type { EnhancedRepresentative } from '@/types/representative';
import { filterCurrent119thCongress, is119thCongressTerm } from '@/lib/helpers/congress-validation';
import { getFileCache } from '@/lib/cache/file-cache';

// Base URLs for congress-legislators data
const CONGRESS_LEGISLATORS_BASE_URL =
  'https://raw.githubusercontent.com/unitedstates/congress-legislators/main';

// Rate limiter for GitHub API calls
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequestsPerSecond = 10; // GitHub's rate limit

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove requests older than 1 second
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const firstRequest = this.requests[0];
      if (firstRequest !== undefined) {
        const waitTime = 1000 - (now - firstRequest);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    this.requests.push(now);
  }
}

const githubRateLimiter = new RateLimiter();
const fileCache = getFileCache();

/**
 * Enhanced caching with file persistence for large congress data
 */
async function persistentCachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 86400
): Promise<T> {
  const startTime = Date.now();

  // Try file cache first for persistence across restarts
  const fileCached = await fileCache.get<T>(key);
  if (fileCached) {
    const duration = Date.now() - startTime;
    // eslint-disable-next-line no-console
    console.log(`🎯 [CACHE HIT] File cache hit for ${key} (${duration}ms)`);
    logger.info('File cache hit for congress data', { key, duration });
    return fileCached;
  }

  // eslint-disable-next-line no-console
  console.log(`❌ [CACHE MISS] File cache miss for ${key}, checking memory cache...`);

  // Fall back to regular cache and fetch
  return cachedFetch(
    key,
    async () => {
      // eslint-disable-next-line no-console
      console.log(`📡 [FETCHING] Downloading ${key} from GitHub...`);
      logger.info('Fetching congress data from remote source', { key });

      const fetchStartTime = Date.now();
      const data = await fetchFn();
      const fetchDuration = Date.now() - fetchStartTime;

      // eslint-disable-next-line no-console
      console.log(`✅ [FETCH COMPLETE] Downloaded ${key} in ${fetchDuration}ms`);

      // Save to file cache for persistence
      const cacheStartTime = Date.now();
      await fileCache.set(key, data, ttlSeconds);
      const cacheDuration = Date.now() - cacheStartTime;

      // eslint-disable-next-line no-console
      console.log(`💾 [CACHE SAVE] Saved ${key} to file cache in ${cacheDuration}ms`);
      logger.info('Congress data cached successfully', {
        key,
        fetchDuration,
        cacheDuration,
        totalDuration: Date.now() - startTime,
      });

      return data;
    },
    ttlSeconds
  );
}

// Interfaces for congress-legislators data
export interface CongressLegislatorId {
  bioguide: string;
  thomas?: string;
  lis?: string;
  govtrack?: number;
  opensecrets?: string;
  votesmart?: number;
  fec?: string[];
  cspan?: number;
  wikipedia?: string;
  house_history?: number;
  ballotpedia?: string;
  maplight?: number;
  icpsr?: number;
  wikidata?: string;
}

export interface CongressLegislatorName {
  first: string;
  middle?: string;
  last: string;
  suffix?: string;
  nickname?: string;
  official_full?: string;
}

export interface CongressLegislatorBio {
  birthday?: string;
  gender: 'M' | 'F';
  religion?: string;
}

export interface CongressLegislatorTerm {
  type: 'rep' | 'sen';
  start: string;
  end: string;
  state: string;
  district?: number;
  party: string;
  caucus?: string;
  state_rank?: 'junior' | 'senior';
  url?: string;
  address?: string;
  phone?: string;
  fax?: string;
  contact_form?: string;
  office?: string;
  rss_url?: string;
  class?: number;
}

export interface CongressLegislatorLeadership {
  title: string;
  start: string;
  end?: string;
}

export interface CongressLegislator {
  id: CongressLegislatorId;
  name: CongressLegislatorName;
  bio: CongressLegislatorBio;
  terms: CongressLegislatorTerm[];
  leadership_roles?: CongressLegislatorLeadership[];
}

export interface CongressLegislatorSocialMedia {
  bioguide: string;
  social?: {
    twitter?: string;
    twitter_id?: string;
    facebook?: string;
    facebook_id?: string;
    youtube?: string;
    youtube_id?: string;
    instagram?: string;
    instagram_id?: string;
    mastodon?: string;
  };
}

export interface CongressCommitteeMembership {
  bioguide: string;
  thomas?: string;
  committees: Array<{
    thomas_id: string;
    house_committee_id?: string;
    senate_committee_id?: string;
    rank?: number;
    party?: string;
    title?: string;
    chamber?: 'house' | 'senate';
  }>;
}

export interface CongressCommittee {
  thomas_id: string;
  house_committee_id?: string;
  senate_committee_id?: string;
  type: 'house' | 'senate' | 'joint';
  name: string;
  chamber?: 'house' | 'senate';
  jurisdiction?: string;
  subcommittees?: Array<{
    thomas_id: string;
    name: string;
  }>;
}

/**
 * Fetch current legislators data
 */
async function fetchCurrentLegislators(): Promise<CongressLegislator[]> {
  return persistentCachedFetch(
    'congress-legislators-current',
    async () => {
      try {
        logger.info('Fetching current legislators from congress-legislators');

        // Apply rate limiting
        await githubRateLimiter.waitIfNeeded();

        const response = await fetch(`${CONGRESS_LEGISLATORS_BASE_URL}/legislators-current.yaml`, {
          signal: AbortSignal.timeout(60000), // 60 second timeout for large YAML files
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch legislators: ${response.status} ${response.statusText}`);
        }

        const yamlText = await response.text();

        // Parse YAML (simplified parser for this specific format)
        const legislators = parseCongressLegilatorsYAML(yamlText);

        logger.info('Successfully fetched current legislators', {
          count: legislators.length,
        });

        return legislators;
      } catch (error) {
        logger.error('Error fetching current legislators', error as Error, {
          url: `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-current.yaml`,
          timeout: '60s',
          errorType: error instanceof Error ? error.name : 'Unknown',
        });

        // Check if we have any cached data we can use as fallback
        const fallbackData = await fileCache.get<CongressLegislator[]>(
          'congress-legislators-current-fallback'
        );
        if (fallbackData && fallbackData.length > 0) {
          // eslint-disable-next-line no-console
          console.log(
            `🔄 [FALLBACK] Using cached fallback data (${fallbackData.length} legislators)`
          );
          logger.warn('Using fallback data due to fetch error', {
            fallbackCount: fallbackData.length,
          });
          return fallbackData;
        }

        // eslint-disable-next-line no-console
        console.log('❌ [ERROR] No fallback data available, returning empty array');
        return [];
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache - data doesn't change frequently
  );
}

/**
 * Fetch historical legislators data for former members
 */
async function fetchHistoricalLegislators(): Promise<CongressLegislator[]> {
  return persistentCachedFetch(
    'congress-legislators-historical',
    async () => {
      try {
        logger.info('Fetching historical legislators from congress-legislators');

        // Apply rate limiting
        await githubRateLimiter.waitIfNeeded();

        const response = await fetch(
          `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-historical.yaml`,
          {
            signal: AbortSignal.timeout(120000), // 2 minute timeout for large historical file
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch historical legislators: ${response.status} ${response.statusText}`
          );
        }

        const yamlText = await response.text();

        // Parse YAML using same parser
        const legislators = parseCongressLegilatorsYAML(yamlText);

        logger.info('Successfully fetched historical legislators', {
          count: legislators.length,
        });

        return legislators;
      } catch (error) {
        logger.error('Error fetching historical legislators', error as Error, {
          url: `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-historical.yaml`,
          timeout: '120s',
          errorType: error instanceof Error ? error.name : 'Unknown',
        });

        // Return empty array if historical data fails - not critical
        return [];
      }
    },
    12 * 60 * 60 * 1000 // 12 hours cache - historical data changes infrequently
  );
}

/**
 * Fetch social media data
 */
async function fetchSocialMediaData(): Promise<CongressLegislatorSocialMedia[]> {
  return persistentCachedFetch(
    'congress-legislators-social-media',
    async () => {
      try {
        logger.info('Fetching social media data from congress-legislators');

        // Apply rate limiting
        await githubRateLimiter.waitIfNeeded();

        const response = await fetch(
          `${CONGRESS_LEGISLATORS_BASE_URL}/legislators-social-media.yaml`,
          {
            signal: AbortSignal.timeout(60000), // 60 second timeout for large YAML files
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch social media: ${response.status} ${response.statusText}`
          );
        }

        const yamlText = await response.text();

        // Parse YAML for social media data
        const socialMedia = parseSocialMediaYAML(yamlText);

        logger.info('Successfully fetched social media data', {
          count: socialMedia.length,
        });

        return socialMedia;
      } catch (error) {
        logger.error('Error fetching social media data', error as Error);
        return [];
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache
  );
}

/**
 * Parse YAML data for congress-legislators format with memory-efficient streaming
 */
function parseCongressLegilatorsYAML(yamlText: string): CongressLegislator[] {
  try {
    // Check file size before parsing to prevent memory issues
    const sizeInMB = yamlText.length / (1024 * 1024);
    if (sizeInMB > 10) {
      logger.warn('Large YAML file detected', { sizeInMB });
    }

    // Parse with safe loading to prevent memory overflow
    const data = yaml.load(yamlText) as CongressLegislator[];

    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of legislators');
    }

    logger.info('Successfully parsed congress legislators YAML', {
      count: data.length,
      sizeInMB: sizeInMB.toFixed(2),
    });

    return data;
  } catch (error) {
    logger.error('Error parsing congress legislators YAML', error as Error);
    return [];
  }
}

/**
 * Parse YAML data for social media format with memory limits
 */
function parseSocialMediaYAML(yamlText: string): CongressLegislatorSocialMedia[] {
  try {
    // Check file size before parsing
    const sizeInMB = yamlText.length / (1024 * 1024);
    if (sizeInMB > 10) {
      logger.warn('Large social media YAML file detected', { sizeInMB });
    }

    const data = yaml.load(yamlText) as CongressLegislatorSocialMedia[];

    if (!Array.isArray(data)) {
      throw new Error('Invalid YAML format: expected array of social media entries');
    }

    logger.info('Successfully parsed social media YAML', {
      count: data.length,
      sizeInMB: sizeInMB.toFixed(2),
    });

    return data;
  } catch (error) {
    logger.error('Error parsing social media YAML', error as Error);
    return [];
  }
}

/**
 * Fetch committee membership data
 */
export async function fetchCommitteeMemberships(): Promise<CongressCommitteeMembership[]> {
  return cachedFetch(
    'congress-committee-memberships',
    async () => {
      try {
        logger.info('Fetching committee memberships from congress-legislators');

        // Apply rate limiting
        await githubRateLimiter.waitIfNeeded();

        const response = await fetch(
          `${CONGRESS_LEGISLATORS_BASE_URL}/committee-membership-current.yaml`,
          {
            signal: AbortSignal.timeout(30000), // 30 second timeout
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch committee memberships: ${response.status} ${response.statusText}`
          );
        }

        const yamlText = await response.text();
        const data = yaml.load(yamlText) as Record<string, unknown>;

        // Transform the committee membership data which is organized by committee ID
        const memberships: CongressCommitteeMembership[] = [];
        const membershipsByBioguide = new Map<
          string,
          Array<{
            thomas_id: string;
            rank?: number;
            party?: string;
            title?: string;
            chamber?: 'house' | 'senate';
          }>
        >();

        // Parse committee-based structure where each key is a committee and values are member arrays
        for (const [committeeId, memberList] of Object.entries(data)) {
          if (Array.isArray(memberList)) {
            memberList.forEach((member: unknown) => {
              const typedMember = member as {
                bioguide?: string;
                rank?: number;
                party?: string;
                title?: string;
              };
              if (typedMember.bioguide) {
                if (!membershipsByBioguide.has(typedMember.bioguide)) {
                  membershipsByBioguide.set(typedMember.bioguide, []);
                }
                membershipsByBioguide.get(typedMember.bioguide)!.push({
                  thomas_id: committeeId,
                  rank: typedMember.rank,
                  party: typedMember.party,
                  title: typedMember.title,
                  chamber: committeeId.startsWith('H') ? 'house' : 'senate',
                });
              }
            });
          }
        }

        // Convert map to array format
        for (const [bioguideId, committees] of membershipsByBioguide.entries()) {
          memberships.push({
            bioguide: bioguideId,
            committees: committees,
          });
        }

        logger.info('Successfully fetched committee memberships', {
          count: memberships.length,
        });

        return memberships;
      } catch (error) {
        logger.error('Error fetching committee memberships', error as Error);
        return [];
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache
  );
}

/**
 * Fetch committee data
 */
export async function fetchCommittees(): Promise<CongressCommittee[]> {
  return cachedFetch(
    'congress-committees-current',
    async () => {
      try {
        logger.info('Fetching committees from congress-legislators');

        const response = await fetch(`${CONGRESS_LEGISLATORS_BASE_URL}/committees-current.yaml`);

        if (!response.ok) {
          throw new Error(`Failed to fetch committees: ${response.status} ${response.statusText}`);
        }

        const yamlText = await response.text();
        const committees = yaml.load(yamlText) as CongressCommittee[];

        logger.info('Successfully fetched committees', {
          count: committees.length,
        });

        return committees;
      } catch (error) {
        logger.error('Error fetching committees', error as Error);
        return [];
      }
    },
    6 * 60 * 60 * 1000 // 6 hours cache
  );
}

/**
 * Get enhanced representative data by bioguide ID
 */
export async function getEnhancedRepresentative(
  bioguideId: string
): Promise<EnhancedRepresentative | null> {
  try {
    const [legislators, socialMedia, committeeMemberships, committees] = await Promise.all([
      fetchCurrentLegislators(),
      fetchSocialMediaData(),
      fetchCommitteeMemberships(),
      fetchCommittees(),
    ]);

    // Find the legislator by bioguide ID in current data
    let legislator = legislators.find(l => l.id.bioguide === bioguideId);
    let isHistorical = false;

    logger.info('Looking for legislator in current data', {
      bioguideId,
      currentCount: legislators.length,
      found: !!legislator,
    });

    // If not found in current legislators, try historical data
    if (!legislator) {
      logger.info('Legislator not found in current data, checking historical', { bioguideId });
      try {
        const historicalLegislators = await fetchHistoricalLegislators();
        logger.info('Historical legislators loaded', {
          bioguideId,
          historicalCount: historicalLegislators.length,
        });
        legislator = historicalLegislators.find(l => l.id.bioguide === bioguideId);
        isHistorical = true;

        if (legislator) {
          logger.info('Found legislator in historical data', {
            bioguideId,
            name: `${legislator.name.first} ${legislator.name.last}`,
          });
        } else {
          logger.warn('Legislator not found in current or historical data', { bioguideId });
          return null;
        }
      } catch (error) {
        logger.error('Error fetching historical legislators', error as Error, { bioguideId });
        return null;
      }
    }

    // Find social media data
    const social = socialMedia.find(s => s.bioguide === bioguideId);

    // Find committee memberships
    const memberCommittees = committeeMemberships.find(m => m.bioguide === bioguideId);

    // Build committee array with names
    const representativeCommittees =
      memberCommittees?.committees
        ?.map(membership => {
          const committee = committees.find(c => c.thomas_id === membership.thomas_id);
          return {
            name: committee?.name || membership.thomas_id,
            role: membership.title || 'Member',
            thomas_id: membership.thomas_id,
            id: membership.house_committee_id || membership.senate_committee_id,
          };
        })
        .filter(c => c.name) || [];

    // Get current term for 119th Congress (post-2023 redistricting)
    const currentTerm =
      legislator.terms.find(term => is119thCongressTerm(term)) ||
      legislator.terms[legislator.terms.length - 1];

    // Ensure we have a current term before proceeding
    if (!currentTerm) {
      logger.warn('No current term found for legislator', { bioguideId });
      return null;
    }

    // Build photo URL using existing representative-photo API
    const buildPhotoUrl = (bioguideId: string): string | undefined => {
      return `/api/representative-photo/${bioguideId}`;
    };

    // Build enhanced representative object
    const enhanced: EnhancedRepresentative = {
      bioguideId: legislator.id.bioguide,
      name: `${legislator.name.first} ${legislator.name.last}`,
      firstName: legislator.name.first,
      lastName: legislator.name.last,
      party: currentTerm.party,
      state: currentTerm.state,
      district: currentTerm.district?.toString(),
      chamber: (currentTerm.type === 'sen' ? 'Senate' : 'House') as 'House' | 'Senate',
      title: currentTerm.type === 'sen' ? 'U.S. Senator' : 'U.S. Representative',
      phone: currentTerm.phone,
      website: currentTerm.url,
      imageUrl: buildPhotoUrl(legislator.id.bioguide), // Add photo URL
      terms: [
        {
          congress: '119', // Current congress
          startYear: currentTerm.start.split('-')[0] || 'Unknown',
          endYear: currentTerm.end.split('-')[0] || 'Unknown',
        },
      ],
      committees: representativeCommittees,

      // Status information
      isHistorical,

      fullName: {
        first: legislator.name.first,
        middle: legislator.name.middle,
        last: legislator.name.last,
        suffix: legislator.name.suffix,
        nickname: legislator.name.nickname,
        official: legislator.name.official_full,
      },

      bio: {
        birthday: legislator.bio.birthday,
        gender: legislator.bio.gender,
        religion: legislator.bio.religion,
      },

      currentTerm: {
        start: currentTerm.start,
        end: currentTerm.end,
        office: currentTerm.office,
        phone: currentTerm.phone,
        address: currentTerm.address,
        website: currentTerm.url,
        contactForm: currentTerm.contact_form,
        rssUrl: currentTerm.rss_url,
        stateRank: currentTerm.state_rank,
        class: currentTerm.class,
      },

      socialMedia: social?.social
        ? {
            twitter: social.social.twitter,
            facebook: social.social.facebook,
            youtube: social.social.youtube,
            instagram: social.social.instagram,
            mastodon: social.social.mastodon,
          }
        : undefined,

      ids: {
        govtrack: legislator.id.govtrack,
        opensecrets: legislator.id.opensecrets,
        votesmart: legislator.id.votesmart,
        fec: legislator.id.fec,
        cspan: legislator.id.cspan,
        wikipedia: legislator.id.wikipedia,
        wikidata: legislator.id.wikidata,
        ballotpedia: legislator.id.ballotpedia,
      },

      leadershipRoles: legislator.leadership_roles,
    };

    logger.info('Successfully enhanced representative data', {
      bioguideId,
      hasIds: !!enhanced.ids,
      hasSocialMedia: !!enhanced.socialMedia,
      hasCurrentTerm: !!enhanced.currentTerm,
    });

    return enhanced;
  } catch (error) {
    logger.error('Error getting enhanced representative', error as Error, { bioguideId });
    return null;
  }
}

/**
 * Get all enhanced representatives
 */
export async function getAllEnhancedRepresentatives(): Promise<EnhancedRepresentative[]> {
  try {
    logger.debug('Starting to fetch all enhanced representatives data');
    const [legislators, socialMedia] = await Promise.all([
      fetchCurrentLegislators(),
      fetchSocialMediaData(),
    ]);

    logger.debug('Fetched legislators and social media data', {
      legislatorsCount: legislators.length,
      socialMediaCount: socialMedia.length,
    });

    // Filter for current 119th Congress members only
    const currentLegislators = filterCurrent119thCongress(legislators);

    // Debug chamber breakdown
    const chamberBreakdown = currentLegislators.reduce(
      (acc, leg) => {
        const currentTerm = leg.terms[leg.terms.length - 1];
        if (currentTerm) {
          if (currentTerm.type === 'sen') acc.senators++;
          else if (currentTerm.type === 'rep') acc.representatives++;
          else acc.other++;
        }
        return acc;
      },
      { senators: 0, representatives: 0, other: 0 }
    );

    logger.debug('Filtered to current 119th Congress members', {
      originalCount: legislators.length,
      currentCount: currentLegislators.length,
      filteredOut: legislators.length - currentLegislators.length,
      breakdown: chamberBreakdown,
    });

    const enhanced: EnhancedRepresentative[] = currentLegislators
      .map(legislator => {
        const bioguideId = legislator.id.bioguide;
        const social = socialMedia.find(s => s.bioguide === bioguideId);
        const currentTerm =
          legislator.terms.find(term => is119thCongressTerm(term)) ||
          legislator.terms[legislator.terms.length - 1];

        // Skip legislators without a current term
        if (!currentTerm) {
          logger.warn('No current term found for legislator in bulk processing', { bioguideId });
          return null;
        }

        return {
          bioguideId: legislator.id.bioguide,
          name: `${legislator.name.first} ${legislator.name.last}`,
          firstName: legislator.name.first,
          lastName: legislator.name.last,
          party: currentTerm.party,
          state: currentTerm.state,
          district: currentTerm.district?.toString(),
          chamber: currentTerm.type === 'sen' ? 'Senate' : 'House',
          title: currentTerm.type === 'sen' ? 'U.S. Senator' : 'U.S. Representative',
          imageUrl: `/api/representative-photo/${legislator.id.bioguide}`, // Add photo URL
          terms: [
            {
              congress: '119', // Current congress
              startYear: currentTerm.start.split('-')[0],
              endYear: currentTerm.end.split('-')[0],
            },
          ],
          committees: [],

          fullName: {
            first: legislator.name.first,
            middle: legislator.name.middle,
            last: legislator.name.last,
            suffix: legislator.name.suffix,
            nickname: legislator.name.nickname,
            official: legislator.name.official_full,
          },

          bio: {
            birthday: legislator.bio.birthday,
            gender: legislator.bio.gender,
            religion: legislator.bio.religion,
          },

          currentTerm: {
            start: currentTerm.start,
            end: currentTerm.end,
            office: currentTerm.office,
            phone: currentTerm.phone,
            address: currentTerm.address,
            website: currentTerm.url,
            contactForm: currentTerm.contact_form,
            rssUrl: currentTerm.rss_url,
            stateRank: currentTerm.state_rank,
            class: currentTerm.class,
          },

          socialMedia: social?.social
            ? {
                twitter: social.social.twitter,
                facebook: social.social.facebook,
                youtube: social.social.youtube,
                instagram: social.social.instagram,
                mastodon: social.social.mastodon,
              }
            : undefined,

          ids: {
            govtrack: legislator.id.govtrack,
            opensecrets: legislator.id.opensecrets,
            votesmart: legislator.id.votesmart,
            fec: legislator.id.fec,
            cspan: legislator.id.cspan,
            wikipedia: legislator.id.wikipedia,
            wikidata: legislator.id.wikidata,
            ballotpedia: legislator.id.ballotpedia,
          },

          leadershipRoles: legislator.leadership_roles,
        } as EnhancedRepresentative;
      })
      .filter((rep): rep is EnhancedRepresentative => rep !== null);

    logger.debug('Successfully processed enhanced representatives', {
      count: enhanced.length,
    });

    logger.info('Successfully got all enhanced representatives', {
      count: enhanced.length,
    });

    return enhanced;
  } catch (error) {
    logger.error('Error getting all enhanced representatives', error as Error);
    return [];
  }
}

/**
 * Get OpenSecrets ID for improved FEC matching
 */
export function getOpenSecretsId(
  bioguideId: string,
  enhanced?: EnhancedRepresentative
): string | null {
  if (enhanced?.ids?.opensecrets) {
    return enhanced.ids.opensecrets;
  }

  // Could also fetch this individually if needed
  return null;
}

/**
 * Get FEC IDs from congress-legislators data
 */
export function getFECIds(bioguideId: string, enhanced?: EnhancedRepresentative): string[] {
  if (enhanced?.ids?.fec) {
    return enhanced.ids.fec;
  }

  return [];
}
