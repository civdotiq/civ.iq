/**
 * Proper Batch Service Layer
 * Calls services directly instead of making HTTP requests
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import {
  getComprehensiveBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';
import { createLegacyResponse } from '@/services/congress/bill-response-utils';
import { fecApiService } from '@/lib/fec/fec-api-service';

export interface BatchRequest {
  bioguideId: string;
  endpoints: string[];
  options?: {
    bills?: {
      limit?: number;
      page?: number;
      summaryOnly?: boolean;
    };
    votes?: {
      limit?: number;
    };
    finance?: {
      summaryOnly?: boolean;
    };
  };
}

export interface BatchResponse {
  success: boolean;
  data: Record<string, unknown>;
  metadata: {
    bioguideId: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    executionTime: number;
    cached: boolean;
    timestamp: string;
  };
  errors?: Record<string, { code: string; message: string }>;
}

interface EndpointComputation {
  result: unknown;
  cacheable: boolean;
}

/**
 * Per-endpoint caching + in-flight coalescing.
 *
 * The profile page issues overlapping batch requests concurrently (the
 * summary GET and the overview POST both need finance, votes, bills), but
 * their combo-level cache keys differ, so each one recomputed every shared
 * endpoint from upstream. Caching at endpoint granularity — keyed only by
 * the options that change that endpoint's output — lets overlapping batches
 * reuse each other's work, and the in-flight map collapses concurrent
 * fetches of the same endpoint into a single upstream call.
 */
const inFlightEndpointFetches = new Map<string, Promise<EndpointComputation>>();

const ENDPOINT_CACHE_DATATYPE = {
  bills: 'bills',
  votes: 'votes',
  finance: 'finance',
  committees: 'committees',
} as const;

function endpointCacheKey(
  bioguideId: string,
  endpointName: string,
  options: BatchRequest['options'] = {}
): string | null {
  switch (endpointName) {
    case 'bills':
      return options.bills?.summaryOnly
        ? `batch-endpoint:${bioguideId}:bills:summary`
        : `batch-endpoint:${bioguideId}:bills:${options.bills?.limit || 25}:${options.bills?.page || 1}`;
    case 'votes':
      return `batch-endpoint:${bioguideId}:votes:${options.votes?.limit || 10}`;
    case 'finance':
      // The finance handler ignores per-request options — one result per member.
      return `batch-endpoint:${bioguideId}:finance`;
    case 'committees':
      return `batch-endpoint:${bioguideId}:committees`;
    default:
      return null;
  }
}

/**
 * Execute batch request using direct service calls
 * Much faster than HTTP-to-HTTP calls
 */
export async function executeBatchRequest(request: BatchRequest): Promise<BatchResponse> {
  const startTime = Date.now();
  const { bioguideId, endpoints, options = {} } = request;

  // Check if we have a cached batch response
  const cacheKey = `batch:${bioguideId}:${endpoints.sort().join(',')}:${JSON.stringify(options)}`;
  const cached = await govCache.get<BatchResponse>(cacheKey);

  if (cached) {
    logger.info('Batch cache hit', { bioguideId, endpoints, cacheKey });
    return {
      ...cached,
      metadata: { ...cached.metadata, cached: true },
    };
  }

  const data: Record<string, unknown> = {};
  const errors: Record<string, { code: string; message: string }> = {};
  const successfulEndpoints: string[] = [];
  const failedEndpoints: string[] = [];

  // Enhanced request queue with exponential backoff
  const maxConcurrent = 8; // Increased from 3 to 8 for better throughput
  const queue: Array<{ endpoint: string; resolve: () => void; retryCount: number }> = [];
  let runningRequests = 0;

  const executeWithBackoff = async (endpointName: string, retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const baseDelayMs = 1000; // 1 second base delay

    try {
      await processEndpoint(endpointName);
    } catch (error) {
      if (retryCount < maxRetries && shouldRetry(error)) {
        const delayMs = baseDelayMs * Math.pow(2, retryCount); // Exponential backoff
        logger.warn(
          `Retrying ${endpointName} after ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries + 1})`,
          {
            bioguideId,
            error: error instanceof Error ? error.message : 'Unknown error',
          }
        );

        await new Promise(resolve => setTimeout(resolve, delayMs));
        return executeWithBackoff(endpointName, retryCount + 1);
      }
      throw error;
    }
  };

  const shouldRetry = (error: unknown): boolean => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('econnreset') ||
        message.includes('503') ||
        message.includes('502')
      );
    }
    return false;
  };

  const executeEndpoint = async (endpoint: string): Promise<void> => {
    // Wait for available slot with queue management
    if (runningRequests >= maxConcurrent) {
      await new Promise<void>(resolve => {
        queue.push({ endpoint, resolve, retryCount: 0 });
      });
    }

    runningRequests++;

    const processNext = () => {
      runningRequests--;
      if (queue.length > 0) {
        const next = queue.shift();
        if (next) {
          setImmediate(() => {
            runningRequests++;
            next.resolve();
          });
        }
      }
    };

    try {
      await executeWithBackoff(endpoint);
      successfulEndpoints.push(endpoint);
    } catch (error) {
      logger.error(`Batch endpoint ${endpoint} failed`, error as Error, { bioguideId });
      failedEndpoints.push(endpoint);
      errors[endpoint] = {
        code: 'EXECUTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      processNext();
    }
  };

  const computeEndpoint = async (endpointName: string): Promise<EndpointComputation> => {
    let result;
    // Flipped off in catch / not-found branches so transient upstream
    // failures are never cached at the endpoint level.
    let cacheable = true;

    switch (endpointName) {
      case 'bills': {
        if (options.bills?.summaryOnly) {
          result = await getBillsSummary(bioguideId);
        } else {
          const billsResult = await getComprehensiveBillsByMember({
            bioguideId,
            limit: options.bills?.limit || 25,
            page: options.bills?.page || 1,
          });

          result = createLegacyResponse(billsResult, 119);
        }
        break;
      }

      case 'votes': {
        try {
          logger.info(`Batch votes: Starting for ${bioguideId}`);

          // Get representative chamber info for proper API routing
          const { getEnhancedRepresentative } = await import(
            '@/features/representatives/services/congress.service'
          );
          const representative = await getEnhancedRepresentative(bioguideId);
          if (!representative) {
            logger.error('Representative not found for votes', { bioguideId });
            cacheable = false;
            result = {
              votes: [],
              totalResults: 0,
              member: {
                bioguideId,
                name: 'Unknown',
                chamber: 'Unknown',
              },
              dataSource: 'member-not-found',
              success: false,
            };
            break;
          }
          const { chamber, name } = representative;

          logger.info(`Fetching ${chamber} votes for ${bioguideId}`, {
            bioguideId,
            chamber,
          });

          // Use the same optimized batch voting service as the direct votes endpoint
          const limit = options.votes?.limit || 10;
          let votes = [];
          let dataSource = '';

          const { batchVotingService } = await import(
            '@/features/representatives/services/batch-voting-service'
          );

          if (chamber === 'Senate') {
            const memberVotes = await batchVotingService.getSenateMemberVotes(
              bioguideId,
              119, // 119th Congress
              1, // Session 1
              limit
            );

            // Transform to the same Vote format as the direct endpoint
            votes = memberVotes.map(vote => ({
              voteId: vote.voteId,
              bill: vote.bill || {
                number: 'N/A',
                title: 'Vote without associated bill',
                congress: '119',
                type: 'Senate Resolution',
              },
              question: vote.question || 'Unknown Question',
              result: vote.result || 'Unknown',
              date: vote.date,
              position: vote.position,
              chamber: 'Senate' as const,
              rollNumber: vote.rollCallNumber || 0,
              description: vote.question || 'Unknown Question',
              category: 'Other',
              isKeyVote: false,
              metadata: {
                source: 'senate-xml-feed',
                confidence: 'high',
                processingDate: new Date().toISOString(),
              },
            }));
            dataSource = 'senate-xml-feed';
          } else {
            const memberVotes = await batchVotingService.getHouseMemberVotes(
              bioguideId,
              119, // 119th Congress
              1, // Session 1
              limit
            );

            // Transform to the same Vote format as the direct endpoint
            votes = memberVotes.map(vote => ({
              voteId: vote.voteId,
              bill: vote.bill || {
                number: 'N/A',
                title: 'Vote without associated bill',
                congress: '119',
                type: 'House Resolution',
              },
              question: vote.question || 'Unknown Question',
              result: vote.result || 'Unknown',
              date: vote.date,
              position: vote.position,
              chamber: 'House' as const,
              rollNumber: vote.rollCallNumber || 0,
              description: vote.question || 'Unknown Question',
              category: 'Other',
              isKeyVote: false,
              metadata: {
                source: 'house-congress-api',
                confidence: 'high',
                processingDate: new Date().toISOString(),
              },
            }));
            dataSource = 'house-congress-api';
          }

          // Return in the same format as the direct votes endpoint
          result = {
            votes,
            totalResults: votes.length,
            member: {
              bioguideId,
              name,
              chamber,
            },
            dataSource,
            success: true,
          };

          logger.info(`Batch votes completed for ${bioguideId}`, {
            count: votes.length,
            chamber,
          });
        } catch (error) {
          logger.error(`Batch votes error for ${bioguideId}:`, error);
          cacheable = false;
          // Return proper error format matching the direct endpoint
          result = {
            votes: [],
            totalResults: 0,
            member: {
              bioguideId,
              name: 'Unknown',
              chamber: 'Unknown',
            },
            dataSource: 'batch-error',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }

        break;
      }

      case 'finance': {
        try {
          logger.info(`Batch finance: Starting for ${bioguideId}`);

          // Import FEC mapping
          const { bioguideToFECMapping } = await import('@/lib/data/bioguide-fec-mapping');
          const fecMapping = bioguideToFECMapping[bioguideId];

          logger.info(`FEC mapping lookup for ${bioguideId}:`, {
            hasFecMapping: !!fecMapping,
            fecId: fecMapping?.fecId || 'none',
            name: fecMapping?.name || 'unknown',
          });

          if (!fecMapping || !fecMapping.fecId) {
            // Return empty structure for representatives without FEC data
            logger.info(`No FEC mapping for ${bioguideId}`);
            result = {
              totalRaised: 0,
              totalSpent: 0,
              cashOnHand: 0,
              individualContributions: 0,
              pacContributions: 0,
              partyContributions: 0,
              candidateContributions: 0,
              metadata: {
                note: 'No FEC data available for this representative',
                bioguideId,
              },
            };
            break;
          }

          // Call FEC API with the mapped ID — try all cycles concurrently, pick newest with data
          const candidateId = fecMapping.fecId;
          const FALLBACK_CYCLES = [2024, 2022, 2020, 2018] as const;

          let summaryData = null;
          let matchedCycle: number | undefined;

          const cycleResults = await Promise.allSettled(
            FALLBACK_CYCLES.map(cycle =>
              fecApiService
                .getFinancialSummary(candidateId, cycle)
                .then(data => (data ? { data, cycle } : null))
            )
          );

          // Pick the most recent cycle that returned data (array is already ordered newest-first)
          for (const [i, cycleResult] of cycleResults.entries()) {
            if (cycleResult.status === 'fulfilled' && cycleResult.value) {
              summaryData = cycleResult.value.data;
              matchedCycle = cycleResult.value.cycle;
              logger.info(`FEC API found data in cycle`, { candidateId, cycle: matchedCycle });
              break;
            }
            if (cycleResult.status === 'rejected') {
              logger.warn(`FEC API cycle ${FALLBACK_CYCLES[i]} failed for ${candidateId}`, {
                error: cycleResult.reason instanceof Error ? cycleResult.reason.message : 'Unknown',
              });
            }
          }

          if (!summaryData) {
            logger.warn(`No financial data returned from FEC for ${candidateId} (${bioguideId})`);
            result = {
              totalRaised: 0,
              totalSpent: 0,
              cashOnHand: 0,
              individualContributions: 0,
              pacContributions: 0,
              partyContributions: 0,
              candidateContributions: 0,
              metadata: {
                note: 'No financial data found in FEC records',
                candidateId,
                bioguideId,
              },
            };
            break;
          }

          // Process financial data with proper types (interface now matches API response)
          logger.info(`Processing financial data for ${bioguideId}:`, {
            receipts: summaryData.receipts,
            disbursements: summaryData.disbursements,
            cashOnHand: summaryData.last_cash_on_hand_end_period,
            individualContributions: summaryData.individual_contributions,
          });

          // Transform to expected format using proper field names
          result = {
            totalRaised: summaryData.receipts || 0,
            totalSpent: summaryData.disbursements || 0,
            cashOnHand: summaryData.last_cash_on_hand_end_period || 0,
            individualContributions: summaryData.individual_contributions || 0,
            pacContributions: summaryData.other_political_committee_contributions || 0,
            partyContributions: summaryData.political_party_committee_contributions || 0,
            candidateContributions: summaryData.candidate_contribution || 0,

            metadata: {
              candidateId,
              matchedCycle,
              lastUpdated: new Date().toISOString(),
              bioguideId,
            },
          };

          logger.info(`Finance data retrieved for ${bioguideId}`, {
            totalRaised: result.totalRaised,
            hasFECMapping: true,
          });
        } catch (error) {
          logger.error(`Finance error for ${bioguideId}:`, error);
          cacheable = false;
          // Return empty data on error
          result = {
            totalRaised: 0,
            totalSpent: 0,
            cashOnHand: 0,
            individualContributions: 0,
            pacContributions: 0,
            partyContributions: 0,
            candidateContributions: 0,
            metadata: {
              note: 'Finance data temporarily unavailable',
              bioguideId,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }

        break;
      }

      case 'committees': {
        try {
          logger.info(`Batch committees: Starting for ${bioguideId}`);

          // Use the existing enhanced representative service which has real committee data
          const { getEnhancedRepresentative } = await import(
            '@/features/representatives/services/congress.service'
          );

          const representative = await getEnhancedRepresentative(bioguideId);

          if (!representative) {
            logger.warn(`Representative not found for committees: ${bioguideId}`);
            cacheable = false;
            result = {
              committees: [],
              count: 0,
              metadata: {
                note: 'Representative not found',
                bioguideId,
                source: 'congress-legislators',
              },
            };
            break;
          }

          const committees = representative.committees || [];

          result = {
            committees,
            count: committees.length,
            metadata: {
              bioguideId,
              source: 'congress-legislators YAML',
              lastUpdated: new Date().toISOString(),
              representativeName:
                representative.fullName?.first + ' ' + representative.fullName?.last,
            },
          };

          logger.info(`Committees retrieved for ${bioguideId}`, {
            count: committees.length,
            representativeName:
              representative.fullName?.first + ' ' + representative.fullName?.last,
          });
        } catch (error) {
          logger.error(`Committees error for ${bioguideId}:`, error);
          cacheable = false;
          result = {
            committees: [],
            count: 0,
            metadata: {
              note: 'Committee data temporarily unavailable',
              bioguideId,
              source: 'congress-legislators',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }

        break;
      }

      default:
        throw new Error(`Unknown endpoint: ${endpointName}`);
    }

    return { result, cacheable };
  };

  const processEndpoint = async (endpointName: string): Promise<void> => {
    const epCacheKey = endpointCacheKey(bioguideId, endpointName, options);

    let result: unknown;

    const cachedResult = epCacheKey ? await govCache.get<unknown>(epCacheKey) : null;
    if (cachedResult !== null && cachedResult !== undefined) {
      result = cachedResult;
    } else {
      const inFlight = epCacheKey ? inFlightEndpointFetches.get(epCacheKey) : undefined;
      if (inFlight) {
        result = (await inFlight).result;
      } else {
        const computation = computeEndpoint(endpointName).then(computed => {
          if (epCacheKey && computed.cacheable) {
            govCache.set(epCacheKey, computed.result, {
              dataType:
                ENDPOINT_CACHE_DATATYPE[endpointName as keyof typeof ENDPOINT_CACHE_DATATYPE],
              source: 'batch-service',
            });
          }
          return computed;
        });
        if (epCacheKey) {
          inFlightEndpointFetches.set(epCacheKey, computation);
          // Always clear the in-flight slot; swallow only the cleanup chain's
          // rejection — callers still see the original failure via `await`.
          computation
            .finally(() => inFlightEndpointFetches.delete(epCacheKey))
            .catch(() => undefined);
        }
        result = (await computation).result;
      }
    }

    data[endpointName] = result;

    logger.info(`Batch endpoint ${endpointName} completed`, {
      bioguideId,
      endpoint: endpointName,
      hasData: !!result,
      resultType: typeof result,
      isNull: result === null,
      isUndefined: result === undefined,
      dataSize: Array.isArray(result)
        ? result.length
        : typeof result === 'object' && result !== null
          ? Object.keys(result).length
          : 1,
      actualResult: result === null ? 'NULL' : result === undefined ? 'UNDEFINED' : 'HAS_DATA',
    });
  };

  // Execute all endpoints with concurrency control
  await Promise.allSettled(endpoints.map(endpoint => executeEndpoint(endpoint)));

  const result: BatchResponse = {
    success: successfulEndpoints.length > 0,
    data,
    metadata: {
      bioguideId,
      requestedEndpoints: endpoints,
      successfulEndpoints,
      failedEndpoints,
      executionTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
    },
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };

  // Cache successful results for 5 minutes using heavy endpoint TTL
  if (successfulEndpoints.length > 0) {
    govCache.set(cacheKey, result, { dataType: 'batch', source: 'batch-service' });
  }

  logger.info('Batch request completed', {
    bioguideId,
    requestedEndpoints: endpoints,
    successfulEndpoints,
    failedEndpoints,
    executionTime: result.metadata.executionTime,
    cacheKey,
  });

  return result;
}

/**
 * Get optimized summary data for stats displays
 * Much faster than full batch requests
 */
export async function getRepresentativeSummary(bioguideId: string) {
  const cacheKey = `representative-summary:${bioguideId}`;
  const cached = await govCache.get<{
    billsSponsored?: number;
    billsCosponsored?: number;
    totalRaised?: number;
    totalSpent?: number;
    cashOnHand?: number;
    votesParticipated?: number;
    financeCycle?: number;
    lastUpdated: string;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Execute minimal requests for summary data including votes count
    const [billsSummary, financeSummary, votesSummary] = await Promise.allSettled([
      getBillsSummary(bioguideId),
      executeBatchRequest({
        bioguideId,
        endpoints: ['finance'],
        options: { finance: { summaryOnly: true } },
      }),
      executeBatchRequest({
        bioguideId,
        endpoints: ['votes'],
        // Keep limit low for summary — fetching hundreds of votes just
        // for a count causes multi-second hangs (each Senate vote is a
        // separate XML fetch). The user sees the full count when they
        // drill into the Voting tab.
        options: { votes: { limit: 20 } },
      }),
    ]);

    // Extract the data KeyStatsBar needs
    const billsData = billsSummary.status === 'fulfilled' ? billsSummary.value : null;
    const financeData =
      financeSummary.status === 'fulfilled' && financeSummary.value.success
        ? financeSummary.value.data.finance
        : null;
    const votesData =
      votesSummary.status === 'fulfilled' && votesSummary.value.success
        ? votesSummary.value.data.votes
        : null;

    const result = {
      billsSponsored:
        (billsData as { totalSponsored?: number; currentCongress?: { count: number } })
          ?.totalSponsored ??
        (billsData as { totalSponsored?: number; currentCongress?: { count: number } })
          ?.currentCongress?.count ??
        0,
      billsCosponsored: (billsData as { cosponsoredCount?: number })?.cosponsoredCount ?? 0,
      totalRaised: (financeData as { totalRaised?: number })?.totalRaised ?? 0,
      totalSpent: (financeData as { totalSpent?: number })?.totalSpent ?? 0,
      cashOnHand: (financeData as { cashOnHand?: number })?.cashOnHand ?? 0,
      votesParticipated:
        (votesData as { totalResults?: number; votes?: unknown[] })?.totalResults ??
        (votesData as { totalResults?: number; votes?: unknown[] })?.votes?.length ??
        0,
      financeCycle: (financeData as { metadata?: { matchedCycle?: number } })?.metadata
        ?.matchedCycle,
      lastUpdated: new Date().toISOString(),
    };

    govCache.set(cacheKey, result, { ttl: 1800 * 1000, source: 'summary-service' }); // Cache for 30 minutes
    return result;
  } catch (error) {
    logger.error('Representative summary failed', error as Error, { bioguideId });
    return {
      billsSponsored: 0,
      billsCosponsored: 0,
      totalRaised: 0,
      totalSpent: 0,
      cashOnHand: 0,
      votesParticipated: undefined,
      lastUpdated: new Date().toISOString(),
    };
  }
}
