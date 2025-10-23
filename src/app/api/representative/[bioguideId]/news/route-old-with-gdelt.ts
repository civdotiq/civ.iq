/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import {
  normalizeGDELTArticle,
  fetchGDELTNews,
  calculateLocalImpactScore,
} from '@/features/news/services/gdelt-api';
import { getAdvancedRepresentativeNews } from '@/lib/services/news';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

// Vercel serverless function configuration
export const maxDuration = 20; // 20 seconds for news aggregation
export const dynamic = 'force-dynamic';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
  localImpact?: {
    score: number;
    localRelevance: 'high' | 'medium' | 'low';
    factors: string[];
  };
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'newsapi' | 'gdelt' | 'google-news' | 'fallback';
  cacheStatus?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '15');
  const page = parseInt(searchParams.get('page') || '1');
  const enableAdvanced = searchParams.get('advanced') === 'true';
  const includeTelevision = searchParams.get('tv') === 'true';
  const includeTrending = searchParams.get('trending') === 'true';

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // Try NewsAPI.org first (primary source - best quality, most reliable)
  try {
    // Get representative info for building search query
    const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

    if (repResponse.ok) {
      const repData = await repResponse.json();
      const representative = repData.representative as EnhancedRepresentative;

      // Import NewsAPI service
      const { fetchRepresentativeNewsAPI } = await import('@/lib/services/newsapi');

      logger.info('Fetching NewsAPI for representative', {
        bioguideId,
        name: representative.name,
        state: representative.state,
        chamber: representative.chamber,
      });

      // Fetch from NewsAPI
      const newsAPIArticles = await fetchRepresentativeNewsAPI(
        representative.name,
        representative.state,
        representative.chamber,
        {
          pageSize: limit * 2, // Fetch more for better selection
        }
      );

      if (newsAPIArticles.length > 0) {
        // Apply pagination to NewsAPI articles
        const offset = (page - 1) * limit;
        const paginatedArticles = newsAPIArticles.slice(offset, offset + limit);

        // Convert to NewsArticle interface
        const convertedArticles = paginatedArticles.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.publishedDate,
          language: article.language,
          domain: article.domain,
          imageUrl: article.imageUrl,
          summary: article.summary,
        }));

        const response: NewsResponse = {
          articles: convertedArticles,
          totalResults: newsAPIArticles.length,
          searchTerms: [`NewsAPI for ${representative.name}`],
          dataSource: 'newsapi',
          cacheStatus: 'Live NewsAPI.org data',
          pagination: {
            currentPage: page,
            limit: limit,
            hasNextPage: offset + limit < newsAPIArticles.length,
            totalPages: Math.ceil(newsAPIArticles.length / limit),
          },
        };

        logger.info('Served NewsAPI data', {
          bioguideId,
          articlesCount: convertedArticles.length,
          totalAvailable: newsAPIArticles.length,
          source: 'newsapi',
        });

        return NextResponse.json(response);
      } else {
        logger.info('No NewsAPI articles found, falling back to Google News', { bioguideId });
      }
    }
  } catch (error) {
    logger.error('Failed to fetch NewsAPI, falling back to Google News', error as Error, {
      bioguideId,
    });
  }

  // Try Google News RSS second (better quality, less noise for common names)
  try {
    // Get representative info for building search query
    const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

    if (repResponse.ok) {
      const repData = await repResponse.json();
      const representative = repData.representative as EnhancedRepresentative;

      // Import Google News RSS service
      const { fetchRepresentativeGoogleNews } = await import('@/lib/services/google-news-rss');

      logger.info('Fetching Google News RSS for representative', {
        bioguideId,
        name: representative.name,
        state: representative.state,
        chamber: representative.chamber,
      });

      // Fetch from Google News RSS
      const googleNewsArticles = await fetchRepresentativeGoogleNews(
        representative.name,
        representative.state,
        representative.chamber,
        {
          limit: limit * 2, // Fetch more for better selection
          language: 'en',
          country: 'US',
        }
      );

      if (googleNewsArticles.length > 0) {
        // Apply pagination to Google News articles
        const offset = (page - 1) * limit;
        const paginatedArticles = googleNewsArticles.slice(offset, offset + limit);

        // Convert to NewsArticle interface
        const convertedArticles = paginatedArticles.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.seendate,
          language: 'English',
          domain: article.domain,
          imageUrl: article.socialimage || undefined,
          summary: article.description,
        }));

        const response: NewsResponse = {
          articles: convertedArticles,
          totalResults: googleNewsArticles.length,
          searchTerms: [`Google News for ${representative.name}`],
          dataSource: 'google-news',
          cacheStatus: 'Live Google News RSS data',
          pagination: {
            currentPage: page,
            limit: limit,
            hasNextPage: offset + limit < googleNewsArticles.length,
            totalPages: Math.ceil(googleNewsArticles.length / limit),
          },
        };

        logger.info('Served Google News RSS data', {
          bioguideId,
          articlesCount: convertedArticles.length,
          totalAvailable: googleNewsArticles.length,
          source: 'google-news',
        });

        return NextResponse.json(response);
      } else {
        logger.info('No Google News articles found, falling back to GDELT', { bioguideId });
      }
    }
  } catch (error) {
    logger.error('Failed to fetch Google News RSS, falling back to GDELT', error as Error, {
      bioguideId,
    });
  }

  // Use advanced GDELT service if requested
  if (enableAdvanced) {
    try {
      // Get representative info for advanced news
      const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

      if (!repResponse.ok) {
        throw new Error('Representative not found');
      }

      const repData = await repResponse.json();
      const representative = repData.representative as EnhancedRepresentative;

      // Extract committees from representative data
      const committees =
        representative.committees?.map(committee => ({
          name: committee.name,
          type: 'committee' as const,
        })) || [];

      const advancedNews = await getAdvancedRepresentativeNews(representative, committees, {
        includeTelevision,
        includeTrending,
        includeDistrict: true,
        limit,
      });

      return NextResponse.json({
        ...advancedNews,
        cacheStatus: 'Advanced GDELT integration with GEO, TV, and trending analysis',
      });
    } catch (error) {
      logger.error(
        'Advanced news API error',
        error as Error,
        {
          bioguideId,
          operation: 'advanced_news_api_error',
        },
        request
      );

      // Fall back to standard news if advanced fails
    }
  }

  try {
    // Use cached fetch with 30-minute TTL as specified in project docs
    const cacheKey = `news-${bioguideId}-${limit}-${page}-v4`; // v4 to include expanded district mappings
    const TTL_30_MINUTES = 30 * 60; // 30 minutes in seconds

    const newsData = await cachedFetch(
      cacheKey,
      async (): Promise<NewsResponse> => {
        // First, get representative info for search optimization
        let representative;
        try {
          const repResponse = await fetch(
            `${request.nextUrl.origin}/api/representative/${bioguideId}`
          );

          if (repResponse.ok) {
            const repData = await repResponse.json();
            const enhancedRep = repData.representative as EnhancedRepresentative;

            // Extract the correct fields from the API response
            // Handle both BaseRepresentative and EnhancedRepresentative structures
            const fullName = enhancedRep.fullName
              ? `${enhancedRep.fullName.first} ${enhancedRep.fullName.last}`
              : enhancedRep.name;

            representative = {
              ...enhancedRep,
              name: fullName || `${enhancedRep.firstName} ${enhancedRep.lastName}`,
              state: enhancedRep.state,
              district: enhancedRep.district,
              party: enhancedRep.party,
              bioguideId: enhancedRep.bioguideId || bioguideId,
              chamber: enhancedRep.chamber,
            };

            // Validate we have the minimum required data
            if (!representative.name || representative.name.includes('undefined')) {
              throw new Error('Invalid representative data - missing name');
            }
          } else {
            throw new Error('Representative not found');
          }
        } catch (error) {
          logger.warn(
            'Could not fetch representative info, using fallback',
            {
              bioguideId,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'representative_info_fallback',
            },
            request
          );

          // Use sample news articles when representative info unavailable
          representative = {
            name: 'Representative',
            state: 'US',
            district: '1',
            party: 'Unknown',
            bioguideId: bioguideId,
            chamber: 'House',
          };
        }

        logger.info(
          'Fetching news for representative',
          {
            bioguideId,
            representativeName: representative.name,
            state: representative.state,
            operation: 'news_fetch',
          },
          request
        );

        // Build more precise search terms to avoid irrelevant results
        const simpleName =
          representative.name || `${representative.firstName} ${representative.lastName}`;

        // Extract first and last name for better filtering
        const nameParts = simpleName.split(' ').filter(part => part.length > 0);
        const firstName = nameParts[0] || '';
        const lastName = nameParts[nameParts.length - 1] || '';
        const state = representative.state || '';

        // For common names, we need to be extra careful about relevance
        // Common first names that need special handling
        const commonFirstNames = [
          'John',
          'James',
          'Robert',
          'Michael',
          'David',
          'William',
          'Mary',
          'Sarah',
          'Jennifer',
        ];
        const hasCommonFirstName = commonFirstNames.includes(firstName);
        const hasCommonLastName = [
          'James',
          'Johnson',
          'Smith',
          'Brown',
          'Jones',
          'Davis',
          'Miller',
          'Wilson',
        ].includes(lastName);

        // Create more precise queries with better context
        // GDELT requires keywords to be at least 3 characters, so we need to use full state names
        const stateNameMap: Record<string, string> = {
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

        const fullStateName = stateNameMap[state] || state;

        // Build more targeted search terms based on name commonality
        const baseSearchTerms = [];

        // For common names like "John James", be more specific
        if (hasCommonFirstName || hasCommonLastName) {
          // Always use full name with quotes for exact matching
          baseSearchTerms.push(`"${simpleName}"`);

          // Add title + full name for better precision
          if (representative.chamber === 'Senate') {
            baseSearchTerms.push(`"Senator ${simpleName}"`);
            baseSearchTerms.push(`"Sen. ${simpleName}"`);
          } else {
            baseSearchTerms.push(`"Representative ${simpleName}"`);
            baseSearchTerms.push(`"Rep. ${simpleName}"`);
            baseSearchTerms.push(`"Congressman ${simpleName}"`);
            baseSearchTerms.push(`"Congresswoman ${simpleName}"`);
          }

          // Add state context with full name
          if (fullStateName && fullStateName.length >= 3) {
            baseSearchTerms.push(`"${simpleName}" "${fullStateName}"`);
            baseSearchTerms.push(`"${simpleName}" ${state}`);
          }

          // Add district context for House members
          if (representative.chamber === 'House' && representative.district) {
            baseSearchTerms.push(`"${simpleName}" "${state}-${representative.district}"`);
            baseSearchTerms.push(`"${simpleName}" "District ${representative.district}"`);
          }

          // DO NOT add standalone last name for common names
        } else {
          // For unique names, we can be less strict
          baseSearchTerms.push(`"${simpleName}"`);

          // Last name with context is OK for unique names
          if (fullStateName && fullStateName.length >= 3) {
            baseSearchTerms.push(`"${lastName}" "${fullStateName}"`);
          }

          // Name with title
          if (representative.chamber === 'Senate') {
            baseSearchTerms.push(`"Senator ${lastName}"`);
          } else {
            baseSearchTerms.push(`"Representative ${lastName}"`);
          }
        }

        // Add nickname variations from GDELT API service
        const nicknameVariations = [];
        try {
          // Import the nickname mapping from gdelt-api.ts
          const { REPRESENTATIVE_NICKNAMES } = await import('@/features/news/services/gdelt-api');
          const nicknames = REPRESENTATIVE_NICKNAMES[simpleName] || [];
          nicknameVariations.push(...nicknames);
        } catch {
          // If import fails, continue without nicknames
        }

        // Add district-specific terms for House members
        const districtTerms = [];
        if (representative.chamber === 'House' && representative.district && state) {
          const districtNum = representative.district;
          districtTerms.push(
            // District identifier: "SC-4"
            `${state}-${districtNum}`,
            // Full district name: "South Carolina 4th District"
            `${fullStateName} ${districtNum}th District`,
            // Congressional district: "Congressional District 4"
            `Congressional District ${districtNum}`,
            // Alternative format: "4th Congressional District"
            `${districtNum}th Congressional District`,
            // District-wide news (broader coverage)
            `${fullStateName} ${districtNum}th District news`,
            `${state}-${districtNum} politics`,
            `${fullStateName} ${districtNum}th District election`
          );
        }

        // Add Congressional press release and legislative action terms
        const pressReleaseTerms = [];
        pressReleaseTerms.push(
          `${lastName} press release`,
          `${lastName} statement`,
          `${lastName} announces`,
          `${lastName} votes on`,
          `${lastName} supports`,
          `${lastName} introduces bill`,
          `${lastName} cosponsors`,
          `${lastName} legislation`
        );

        // Add local newspaper coverage terms
        const localNewsTerms = [];
        if (fullStateName && state) {
          // State-specific newspaper coverage
          localNewsTerms.push(
            `${lastName} ${fullStateName} news`,
            `${lastName} ${state} newspaper`,
            `${fullStateName} delegation ${lastName}`,
            `${state} congressman ${lastName}`,
            `${state} representative ${lastName}`
          );
        }

        // Add committee-based search terms
        const committeeTerms = [];
        if (representative.committees && representative.committees.length > 0) {
          // Use primary committee for additional context
          const primaryCommittee = representative.committees[0];
          if (primaryCommittee?.name) {
            // Extract key committee words (avoid very long names)
            const committeeKeywords = primaryCommittee.name
              .split(' ')
              .filter(word => word.length > 4 && !['Committee', 'Subcommittee'].includes(word))
              .slice(0, 2) // Take first 2 meaningful words
              .join(' ');

            if (committeeKeywords) {
              committeeTerms.push(`${lastName} ${committeeKeywords}`);
            }
          }
        }

        // Combine all search terms
        const searchTerms = [
          ...baseSearchTerms,
          ...nicknameVariations,
          ...districtTerms,
          ...pressReleaseTerms,
          ...localNewsTerms,
          ...committeeTerms,
        ].filter(term => term && term.trim().length > 0 && term.length < 100); // Avoid overly long terms

        logger.info(
          'Generated optimized search terms',
          {
            bioguideId,
            searchTerms,
            searchTermsCount: searchTerms.length,
            state,
            fullStateName,
            lastName,
            simpleName,
            operation: 'news_search_terms_generation',
          },
          request
        );

        // Calculate pagination offset
        const offset = (page - 1) * limit;

        // Fetch news from GDELT with intelligent deduplication
        // Fetch extra articles to account for pagination and deduplication
        const totalNeeded = offset + limit;
        const articlesPerTerm = Math.ceil((totalNeeded * 1.5) / searchTerms.length); // Fetch more to account for deduplication
        let totalDuplicatesRemoved = 0;

        const fetchPromises = searchTerms.map(async (searchTerm, _index) => {
          try {
            // Use simple fetchGDELTNews for better results
            const gdeltArticles = await fetchGDELTNews(searchTerm, articlesPerTerm);
            return gdeltArticles.map(article => normalizeGDELTArticle(article));
          } catch (error) {
            logger.error(
              `Error fetching GDELT news for term: ${searchTerm}`,
              error as Error,
              {
                bioguideId,
                searchTerm,
                operation: 'gdelt_news_fetch_error',
              },
              request
            );
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);
        const flattenedArticles = results.flat();

        // Apply advanced clustering to group related stories
        const { newsClusteringService } = await import('@/features/news/utils/news-clustering');
        const clusteringResult = newsClusteringService.clusterNews(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flattenedArticles.map((article: any) => ({
            url: article.url,
            title: article.title,
            seendate: article.publishedDate,
            domain: article.domain || new URL(article.url).hostname,
            socialimage: article.imageUrl,
            language: article.language || 'en',
          })),
          {
            maxClusters: 8,
            minClusterSize: 2,
            titleSimilarityThreshold: 0.6,
            timespanHours: 72,
          }
        );

        // Convert clusters back to articles, keeping primary articles
        const clusteredArticles = clusteringResult.clusters
          .map(cluster => {
            const primaryArticle = flattenedArticles.find(
              (a: unknown) => (a as { url: string }).url === cluster.primaryArticle.url
            );
            const articleData = primaryArticle as Record<string, unknown>;
            return {
              ...articleData,
              relatedStories: cluster.relatedArticles.length,
              sources: cluster.sources.join(', '),
              category: cluster.category,
              importance: cluster.importance,
            };
          })
          .filter(Boolean);

        // Add unclustered articles
        const unclusteredArticles = clusteringResult.unclustered
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(unclustered => flattenedArticles.find((a: any) => a.url === unclustered.url))
          .filter(Boolean);

        const finalArticles = [...clusteredArticles, ...unclusteredArticles];

        // Apply quality filters and final deduplication to the clustered articles
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

        // Enhanced relevance filtering for common names
        const qualityFilteredArticles = finalArticles.filter((article: unknown) => {
          const articleData = article as {
            publishedDate: string;
            language: string;
            title: string;
            domain: string;
          };
          const articleDate = new Date(articleData.publishedDate);

          // Basic quality checks
          const passesBasicQuality =
            articleData.language === 'English' &&
            articleData.title.length > 10 &&
            articleData.title.length < 300 &&
            articleDate >= ninetyDaysAgo &&
            !articleData.title.toLowerCase().includes('404') &&
            !articleData.title.toLowerCase().includes('error') &&
            !articleData.domain.includes('facebook.com') &&
            !articleData.domain.includes('twitter.com');

          if (!passesBasicQuality) return false;

          // Enhanced relevance check for common names
          if (hasCommonFirstName || hasCommonLastName) {
            const titleLower = articleData.title.toLowerCase();
            const firstNameLower = firstName.toLowerCase();
            const lastNameLower = lastName.toLowerCase();
            const fullNameLower = simpleName.toLowerCase();

            // Check if the full name appears (best case)
            if (titleLower.includes(fullNameLower)) {
              return true;
            }

            // For common names, require both first and last name to appear
            // This filters out articles about other people named "James"
            if (firstName && lastName && firstName !== lastName) {
              const hasFirstName = titleLower.includes(firstNameLower);
              const hasLastName = titleLower.includes(lastNameLower);

              // Both names must appear for common names
              if (!hasFirstName || !hasLastName) {
                logger.debug('Filtering out article - missing name components for common name', {
                  title: articleData.title.slice(0, 100),
                  representativeName: simpleName,
                  hasFirstName,
                  hasLastName,
                });
                return false;
              }

              // Additional check: names should be reasonably close to each other
              // This helps filter out articles that happen to have both common words
              // Made less aggressive: increased from 50 to 100 characters
              if (hasFirstName && hasLastName) {
                const firstIndex = titleLower.indexOf(firstNameLower);
                const lastIndex = titleLower.indexOf(lastNameLower);
                const distance = Math.abs(lastIndex - firstIndex);

                // Names should be within ~100 characters of each other (relaxed)
                if (distance > 100) {
                  logger.debug('Filtering out article - names too far apart', {
                    title: articleData.title.slice(0, 100),
                    distance,
                    representativeName: simpleName,
                  });
                  return false;
                }
              }

              // If we have both first and last name, that's good enough
              return true;
            }

            // Check for title + last name pattern (e.g., "Senator James", "Rep. James")
            const titlePatterns = [
              `senator ${lastNameLower}`,
              `sen. ${lastNameLower}`,
              `representative ${lastNameLower}`,
              `rep. ${lastNameLower}`,
              `congressman ${lastNameLower}`,
              `congresswoman ${lastNameLower}`,
            ];

            if (titlePatterns.some(pattern => titleLower.includes(pattern))) {
              // Accept title + lastname without state check (less aggressive)
              return true;
            }

            // For House members, check district references
            if (representative.chamber === 'House' && representative.district) {
              const districtPatterns = [
                `${state}-${representative.district}`,
                `${state} ${representative.district}`,
                `district ${representative.district}`,
                `${representative.district}th district`,
                `${representative.district}st district`,
                `${representative.district}nd district`,
                `${representative.district}rd district`,
              ];

              const hasDistrictContext = districtPatterns.some(pattern =>
                titleLower.includes(pattern.toLowerCase())
              );

              if (hasDistrictContext && titleLower.includes(lastNameLower)) {
                return true;
              }
            }

            // If we get here for common names and didn't find strong evidence, filter out
            logger.debug('Filtering out article - insufficient evidence for common name', {
              title: articleData.title.slice(0, 100),
              representativeName: simpleName,
            });
            return false;
          }

          // For non-common names, be less strict
          return passesBasicQuality;
        });

        // Final cross-term deduplication using enhanced system
        const { deduplicateEnhancedNews } = await import(
          '@/features/news/services/enhanced-deduplication'
        );
        const { articles: finalDeduplicatedArticles, stats: finalStats } = deduplicateEnhancedNews(
          qualityFilteredArticles.map((article: unknown) => {
            const articleData = article as {
              url: string;
              title: string;
              publishedDate: string;
              domain: string;
              imageUrl?: string;
              language: string;
            };
            return {
              url: articleData.url,
              title: articleData.title,
              seendate: articleData.publishedDate,
              domain: articleData.domain,
              socialimage: articleData.imageUrl,
              language: articleData.language,
            };
          }),
          {
            titleSimilarityThreshold: 0.9,
            maxArticlesPerDomain: 1,
            preserveNewestArticles: true,
          }
        );

        totalDuplicatesRemoved += finalStats.duplicatesRemoved;

        // Convert back and sort by date (most recent first)
        const uniqueArticles = finalDeduplicatedArticles.map(article => {
          // Calculate local impact score for geographic relevance
          const localImpact = calculateLocalImpactScore(
            {
              title: article.title,
              url: article.url,
              domain: article.domain,
              seendate: article.seendate,
              socialimage: article.socialimage,
              language: article.language || 'English',
              sourcecountry: 'US',
            },
            representative.name,
            representative.state,
            representative.district
          );

          logger.info('✅ Calculated local impact score', {
            articleTitle: article.title.slice(0, 50),
            representativeName: representative.name,
            state: representative.state,
            district: representative.district,
            localImpact,
            operation: 'local_impact_calculation',
          });

          return {
            title: article.title,
            url: article.url,
            publishedDate: article.seendate,
            domain: article.domain,
            imageUrl: article.socialimage,
            language: article.language || 'English',
            source:
              (
                qualityFilteredArticles.find(
                  (orig: unknown) => (orig as { url: string }).url === article.url
                ) as { source?: string }
              )?.source || article.domain,
            localImpact,
          };
        });

        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(offset, offset + limit);

        // Log deduplication statistics
        logger.info(
          'News deduplication completed',
          {
            bioguideId,
            originalCount: flattenedArticles.length,
            afterQualityFilter: qualityFilteredArticles.length,
            totalDuplicatesRemoved,
            finalCount: sortedArticles.length,
            operation: 'news_deduplication_complete',
          },
          request
        );

        // Log when no real articles are found - return empty instead of sample data
        if (sortedArticles.length === 0) {
          logger.info('No GDELT articles found, returning empty result', {
            bioguideId,
            representativeName: representative.name,
            searchTerms: searchTerms.length,
            searchTermsUsed: searchTerms,
          });
        }

        const totalArticlesBeforePagination = uniqueArticles.length;

        return {
          articles: sortedArticles,
          totalResults: totalArticlesBeforePagination,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback',
          pagination: {
            currentPage: page,
            limit: limit,
            hasNextPage: offset + limit < totalArticlesBeforePagination,
            totalPages: Math.ceil(totalArticlesBeforePagination / limit),
          },
        };
      },
      TTL_30_MINUTES
    );

    // Return empty result when no real news is available
    if (newsData.articles.length === 0) {
      logger.info('No real news data available from GDELT', {
        bioguideId,
      });

      const emptyResponse: NewsResponse = {
        articles: [],
        totalResults: 0,
        searchTerms: newsData.searchTerms,
        dataSource: 'gdelt',
        cacheStatus: 'No news articles currently available for this representative',
        pagination: {
          currentPage: page,
          limit: limit,
          hasNextPage: false,
          totalPages: 0,
        },
      };

      return NextResponse.json(emptyResponse);
    }

    // Add cache status to response
    const response: NewsResponse = {
      ...newsData,
      cacheStatus: 'Live news data',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      'News API Error',
      error as Error,
      {
        bioguideId,
        operation: 'news_api_error',
      },
      request
    );

    // Comprehensive error response with fallback
    const errorResponse: NewsResponse = {
      articles: [],
      totalResults: 0,
      searchTerms: [],
      dataSource: 'fallback',
      cacheStatus: 'API temporarily unavailable',
      pagination: {
        currentPage: page,
        limit: limit,
        hasNextPage: false,
        totalPages: 0,
      },
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}
