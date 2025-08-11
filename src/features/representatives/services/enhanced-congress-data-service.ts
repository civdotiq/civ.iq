/**
 * Enhanced Congressional Data Service
 * Fixes Congress.gov API 404 issues and Senate XML URL parsing
 * Adds retry logic, better error handling, and data enhancement
 */

import { logger } from '@/lib/logging/logger-edge';

// Configuration
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const SENATE_GOV_BASE = 'https://www.senate.gov';
const CURRENT_CONGRESS = 119;
const CURRENT_SESSION = 1;

interface EnhancedVoteData {
  voteId: string;
  congress: number;
  session: number;
  chamber: 'House' | 'Senate';
  rollCallNumber: number;
  date: string;
  question: string;
  result: string;
  bill?: {
    congress: number;
    type: string;
    number: string;
    title: string;
    url: string;
  };
  totals: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
  memberVotes?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
  metadata: {
    sourceUrl: string;
    dataSource: 'congress-api' | 'senate-xml' | 'house-clerk';
    fetchedAt: string;
    parseSuccess: boolean;
  };
}

export class EnhancedCongressDataService {
  private static instance: EnhancedCongressDataService;
  private apiKey: string | undefined;
  private retryCount = 3;
  private retryDelay = 1000; // ms
  private lisToBioguideMap: Map<string, string> | null = null;

  constructor() {
    this.apiKey = process.env.CONGRESS_API_KEY;
  }

  public static getInstance(): EnhancedCongressDataService {
    if (!EnhancedCongressDataService.instance) {
      EnhancedCongressDataService.instance = new EnhancedCongressDataService();
    }
    return EnhancedCongressDataService.instance;
  }

  /**
   * Initialize or get the LIS member ID to bioguide ID mapping
   */
  private async initializeLisMapping(): Promise<void> {
    if (this.lisToBioguideMap) return;

    try {
      // Load legislators data from congress-legislators
      const fs = await import('fs/promises');
      const yaml = await import('js-yaml');
      const path = await import('path');

      // Use a relative path that works in Next.js environment
      const legislatorsPath = path.join(process.cwd(), 'data', 'legislators-current.yaml');
      logger.debug('Attempting to load legislators data', { path: legislatorsPath });

      const legislatorsYaml = await fs.readFile(legislatorsPath, 'utf8');
      const legislators = yaml.load(legislatorsYaml) as Array<{
        id: { bioguide: string; lis?: string };
      }>;

      this.lisToBioguideMap = new Map();

      for (const legislator of legislators) {
        if (legislator.id.lis && legislator.id.bioguide) {
          this.lisToBioguideMap.set(legislator.id.lis, legislator.id.bioguide);
        }
      }

      logger.info('Initialized LIS to bioguide mapping', {
        mappingCount: this.lisToBioguideMap.size,
        sampleMappings: Array.from(this.lisToBioguideMap.entries()).slice(0, 3),
      });
    } catch (error) {
      logger.error('Failed to initialize LIS mapping', error as Error);
      this.lisToBioguideMap = new Map(); // Empty fallback
    }
  }

  /**
   * Convert LIS member ID to bioguide ID
   */
  private async convertLisToBioguide(lisId: string): Promise<string> {
    logger.debug('Converting LIS ID to bioguide', { lisId });
    await this.initializeLisMapping();
    const bioguideId = this.lisToBioguideMap?.get(lisId) || lisId;
    logger.debug('LIS ID conversion result', {
      lisId,
      bioguideId,
      mappingSize: this.lisToBioguideMap?.size,
    });
    return bioguideId;
  }

  /**
   * Enhanced retry mechanism for API calls
   */
  private async fetchWithRetry<T>(
    fetchFn: () => Promise<T>,
    retries = this.retryCount
  ): Promise<T | null> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchFn();
      } catch (error) {
        logger.warn(`Fetch attempt ${i + 1} failed`, {
          error: (error as Error).message,
          retriesLeft: retries - i - 1,
        });

        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
        }
      }
    }
    return null;
  }

  /**
   * Get House roll call votes with enhanced error handling
   * Tries multiple endpoints and data sources
   */
  async getHouseVotes(
    congress = CURRENT_CONGRESS,
    session = CURRENT_SESSION,
    limit = 20
  ): Promise<EnhancedVoteData[]> {
    const votes: EnhancedVoteData[] = [];

    // Try Congress.gov API first
    const apiVotes = await this.fetchHouseVotesFromAPI(congress, session, limit);
    if (apiVotes.length > 0) {
      votes.push(...apiVotes);
    }

    // If API fails or returns limited data, try House Clerk data
    if (votes.length < limit / 2) {
      logger.info('Fetching additional House data from Clerk.house.gov');
      const clerkVotes = await this.fetchHouseVotesFromClerk(congress, session, limit);
      votes.push(...clerkVotes);
    }

    return votes.slice(0, limit);
  }

  /**
   * Fetch House votes from Congress.gov API with better error handling
   */
  private async fetchHouseVotesFromAPI(
    congress: number,
    session: number,
    limit: number
  ): Promise<EnhancedVoteData[]> {
    const endpoints = [
      // Try the new House roll call endpoint (May 2025 release)
      `/house-roll-call-vote/${congress}/${session}`,
      // Fallback to general house-vote endpoint
      `/house-vote/${congress}`,
      // Try alternative bill/vote endpoint
      `/bill/${congress}/house-joint-resolution`,
    ];

    for (const endpoint of endpoints) {
      const result = await this.fetchWithRetry(async () => {
        const url = new URL(`${CONGRESS_API_BASE}${endpoint}`);
        url.searchParams.append('format', 'json');
        url.searchParams.append('limit', limit.toString());
        url.searchParams.append('sort', 'date:desc');

        if (this.apiKey) {
          url.searchParams.append('api_key', this.apiKey);
        }

        const response = await fetch(url.toString(), {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CivicIntelHub/1.0',
          },
        });

        if (response.status === 404) {
          logger.debug(`Endpoint not available yet: ${endpoint}`);
          return null;
        }

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return this.parseHouseAPIResponse(data, congress, session);
      });

      if (result && result.length > 0) {
        return result;
      }
    }

    return [];
  }

  /**
   * Parse House API response into standardized format
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseHouseAPIResponse(data: any, congress: number, session: number): EnhancedVoteData[] {
    const votes: EnhancedVoteData[] = [];

    // Handle different response structures
    const voteList = data.rollCallVotes || data.houseRollCallVotes || data.votes || [];

    for (const vote of voteList) {
      try {
        const enhancedVote: EnhancedVoteData = {
          voteId: `house-${congress}-${session}-${vote.rollCallNumber || vote.number}`,
          congress,
          session,
          chamber: 'House',
          rollCallNumber: parseInt(vote.rollCallNumber || vote.number || '0'),
          date: vote.date || vote.voteDate || new Date().toISOString(),
          question: vote.question || vote.voteQuestion || 'Unknown',
          result: vote.result || vote.voteResult || 'Unknown',
          bill: vote.bill
            ? {
                congress,
                type: vote.bill.type || 'Unknown',
                number: vote.bill.number?.toString() || 'Unknown',
                title: vote.bill.title || 'Unknown',
                url: vote.bill.url || '',
              }
            : undefined,
          totals: {
            yea: vote.totals?.yea || 0,
            nay: vote.totals?.nay || 0,
            present: vote.totals?.present || 0,
            notVoting: vote.totals?.notVoting || 0,
          },
          metadata: {
            sourceUrl: vote.url || '',
            dataSource: 'congress-api',
            fetchedAt: new Date().toISOString(),
            parseSuccess: true,
          },
        };
        votes.push(enhancedVote);
      } catch (error) {
        logger.warn('Failed to parse House vote', { error: (error as Error).message, vote });
      }
    }

    return votes;
  }

  /**
   * Fallback: Fetch House votes from Clerk.house.gov
   */
  private async fetchHouseVotesFromClerk(
    congress: number,
    _session: number,
    limit: number
  ): Promise<EnhancedVoteData[]> {
    try {
      // House Clerk provides XML data for roll call votes
      const year = 2025; // 119th Congress started in 2025
      const url = `https://clerk.house.gov/evs/${year}/index.xml`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Clerk API error: ${response.status}`);
      }

      const xmlText = await response.text();
      return this.parseClerkXML(xmlText, congress, limit);
    } catch (error) {
      logger.error('Failed to fetch from House Clerk', error as Error);
      return [];
    }
  }

  /**
   * Parse House Clerk XML data with regex (Node.js compatible)
   */
  private parseClerkXML(xmlText: string, congress: number, limit: number): EnhancedVoteData[] {
    const votes: EnhancedVoteData[] = [];

    try {
      // Parse rollcall votes using regex
      const rollcallMatches = xmlText.matchAll(/<rollcall-vote[^>]*>([\s\S]*?)<\/rollcall-vote>/g);

      let count = 0;
      for (const [fullMatch, rollcallXml] of rollcallMatches) {
        if (count++ >= limit) break;
        if (!rollcallXml) continue;

        // Helper function to get XML tag or attribute
        const getTag = (tag: string) =>
          rollcallXml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1] || '';
        const getAttr = (attr: string) =>
          fullMatch.match(new RegExp(`${attr}="([^"]+)"`))?.[1] || '';

        const rollNumber = getAttr('roll') || count.toString();

        votes.push({
          voteId: `house-clerk-${congress}-${rollNumber}`,
          congress,
          session: 1,
          chamber: 'House',
          rollCallNumber: parseInt(rollNumber),
          date: getAttr('date') || new Date().toISOString(),
          question: getTag('vote-question') || 'Unknown',
          result: getTag('vote-result') || 'Unknown',
          totals: {
            yea: parseInt(getTag('yea-total') || '0'),
            nay: parseInt(getTag('nay-total') || '0'),
            present: parseInt(getTag('present-total') || '0'),
            notVoting: parseInt(getTag('not-voting-total') || '0'),
          },
          metadata: {
            sourceUrl: `https://clerk.house.gov/evs/2025/${rollNumber}.xml`,
            dataSource: 'house-clerk',
            fetchedAt: new Date().toISOString(),
            parseSuccess: true,
          },
        });
      }
    } catch (error) {
      logger.error('Failed to parse Clerk XML', error as Error);
    }

    return votes;
  }

  /**
   * Enhanced Senate vote fetching with direct XML access (August 2025 - bypassing failed Congress.gov API)
   */
  async getSenateVotes(
    congress = CURRENT_CONGRESS,
    session = CURRENT_SESSION,
    limit = 20
  ): Promise<EnhancedVoteData[]> {
    const votes: EnhancedVoteData[] = [];

    // Direct Senate.gov XML fetching - start from recent votes (200+ by August 2025)
    logger.info('Fetching Senate votes directly from Senate.gov XML', { congress, session, limit });

    // Senate typically has ~200+ votes by August in an active session
    const startVoteNumber = 220;

    for (
      let voteNum = startVoteNumber;
      voteNum > startVoteNumber - 50 && votes.length < limit;
      voteNum--
    ) {
      try {
        const paddedNum = voteNum.toString().padStart(5, '0');
        const url = `${SENATE_GOV_BASE}/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedNum}.xml`;

        logger.debug('Fetching Senate vote XML', { voteNum, url });

        const response = await fetch(url, {
          headers: {
            'User-Agent': 'CivicIntelHub/1.0',
            Accept: 'application/xml, text/xml',
          },
        });

        if (!response.ok) {
          logger.debug('Senate vote not found', { voteNum, status: response.status });
          continue; // Vote doesn't exist, try next
        }

        const xmlText = await response.text();

        // Validate it's actual vote XML
        if (!xmlText.includes('<roll_call_vote') && !xmlText.includes('<vote_summary')) {
          logger.debug('Invalid XML response for Senate vote', { voteNum });
          continue;
        }

        const parsed = await this.parseSenateVoteXML(xmlText, congress, session, voteNum);
        if (parsed) {
          votes.push(parsed);
          logger.debug('Successfully parsed Senate vote', {
            voteNum,
            hasMemberVotes: !!parsed.memberVotes,
            memberCount: parsed.memberVotes?.length || 0,
          });
        }

        // Small delay to avoid overwhelming Senate.gov
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.debug('Error fetching Senate vote', { voteNum, error: (error as Error).message });
        continue; // Try next vote
      }
    }

    logger.info('Senate votes fetched successfully', {
      votesFound: votes.length,
      method: 'direct-senate-xml',
    });

    // Debug: Log bioguide IDs found in votes
    for (const vote of votes) {
      if (vote.memberVotes && vote.memberVotes.length > 0) {
        const bioguideIds = vote.memberVotes.map(m => m.bioguideId).slice(0, 5);
        logger.debug('Vote member bioguide IDs (first 5)', { voteId: vote.voteId, bioguideIds });
      }
    }

    return votes;
  }

  /**
   * Fetch and parse individual Senate vote with fixed URL handling
   */
  private async fetchSenateVoteDetail(
    congress: number,
    session: number,
    voteNumber: number
  ): Promise<EnhancedVoteData | null> {
    try {
      const paddedVoteNumber = voteNumber.toString().padStart(5, '0');
      const voteUrl = `${SENATE_GOV_BASE}/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedVoteNumber}.xml`;

      const response = await fetch(voteUrl);
      if (!response.ok) {
        throw new Error(`Senate vote fetch failed: ${response.status}`);
      }

      const xmlText = await response.text();
      return await this.parseSenateVoteXML(xmlText, congress, session, voteNumber);
    } catch (error) {
      logger.error(`Failed to fetch Senate vote ${voteNumber}`, error as Error);
      return null;
    }
  }

  /**
   * Parse Senate vote XML with regex (Node.js compatible)
   */
  private async parseSenateVoteXML(
    xmlText: string,
    congress: number,
    session: number,
    voteNumber: number
  ): Promise<EnhancedVoteData | null> {
    try {
      // Helper function to extract XML tag content
      const getTag = (tag: string) =>
        xmlText.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() || '';

      // Extract vote metadata
      const question = getTag('vote_question_text') || getTag('question') || 'Unknown';
      const result = getTag('vote_result') || 'Unknown';
      const date = getTag('vote_date') || new Date().toISOString();
      const issueLink = getTag('issue_link');

      // Fix relative URLs
      const billUrl =
        issueLink && !issueLink.startsWith('http')
          ? `https://www.senate.gov${issueLink.startsWith('/') ? '' : '/'}${issueLink}`
          : issueLink;

      // Extract bill information
      const documentNumber = getTag('document_number');
      const bill = documentNumber
        ? {
            congress,
            type: getTag('document_type') || 'Bill',
            number: documentNumber,
            title: getTag('document_title') || getTag('vote_title') || '',
            url: billUrl,
          }
        : undefined;

      // Parse member votes using regex
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const memberVotes: any[] = [];
      const memberMatches = xmlText.matchAll(/<member>[\s\S]*?<\/member>/g);

      logger.debug('Parsing member votes from Senate XML', {
        memberCount: Array.from(memberMatches).length,
      });

      // Need to re-create the iterator since we consumed it above
      const memberMatchesArray = Array.from(xmlText.matchAll(/<member>[\s\S]*?<\/member>/g));

      for (const [memberXml] of memberMatchesArray) {
        const getMemberTag = (tag: string) =>
          memberXml.match(new RegExp(`<${tag}>([^<]+)`))?.[1]?.trim() || '';

        const memberName = getMemberTag('member_full');
        const lisId = getMemberTag('lis_member_id');
        const bioguideIdDirect = getMemberTag('bioguide_id');

        logger.debug('Processing member vote', { memberName, lisId, bioguideIdDirect });

        const voteCast = getMemberTag('vote_cast').toLowerCase();

        // Map vote positions
        let position: 'Yea' | 'Nay' | 'Present' | 'Not Voting' = 'Not Voting';
        if (voteCast === 'yea' || voteCast === 'aye') position = 'Yea';
        else if (voteCast === 'nay' || voteCast === 'no') position = 'Nay';
        else if (voteCast === 'present') position = 'Present';

        // Convert LIS member ID to bioguide ID for proper matching
        const bioguideId = lisId ? await this.convertLisToBioguide(lisId) : bioguideIdDirect;

        // Temporary debug for Schumer
        if (lisId === 'S270') {
          logger.info('SCHUMER FOUND', { lisId, bioguideId, memberName });
        }

        memberVotes.push({
          bioguideId,
          name: memberName,
          party: getMemberTag('party'),
          state: getMemberTag('state'),
          position,
        });
      }

      // Calculate totals
      const totals = {
        yea: memberVotes.filter(v => v.position === 'Yea').length,
        nay: memberVotes.filter(v => v.position === 'Nay').length,
        present: memberVotes.filter(v => v.position === 'Present').length,
        notVoting: memberVotes.filter(v => v.position === 'Not Voting').length,
      };

      return {
        voteId: `senate-${congress}-${session}-${voteNumber}`,
        congress,
        session,
        chamber: 'Senate',
        rollCallNumber: voteNumber,
        date,
        question,
        result,
        bill,
        totals,
        memberVotes,
        metadata: {
          sourceUrl: `${SENATE_GOV_BASE}/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${voteNumber.toString().padStart(5, '0')}.xml`,
          dataSource: 'senate-xml',
          fetchedAt: new Date().toISOString(),
          parseSuccess: true,
        },
      };
    } catch (error) {
      logger.error('Failed to parse Senate vote XML', error as Error);
      return null;
    }
  }

  /**
   * Resolve relative URLs to absolute URLs
   */
  private resolveUrl(url: string, base: string): string {
    if (!url) return '';

    // If already absolute, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return 'https:' + url;
    }

    // Handle root-relative URLs
    if (url.startsWith('/')) {
      const baseUrl = new URL(base);
      return `${baseUrl.protocol}//${baseUrl.host}${url}`;
    }

    // Handle relative URLs
    return new URL(url, base).toString();
  }

  /**
   * Get combined voting data for both chambers
   */
  async getAllCongressionalVotes(limit = 20): Promise<{
    house: EnhancedVoteData[];
    senate: EnhancedVoteData[];
    combined: EnhancedVoteData[];
  }> {
    const [houseVotes, senateVotes] = await Promise.all([
      this.getHouseVotes(CURRENT_CONGRESS, CURRENT_SESSION, limit),
      this.getSenateVotes(CURRENT_CONGRESS, CURRENT_SESSION, limit),
    ]);

    // Combine and sort by date
    const combined = [...houseVotes, ...senateVotes]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);

    return {
      house: houseVotes,
      senate: senateVotes,
      combined,
    };
  }

  /**
   * Get member voting history across both chambers
   */
  async getMemberVotingHistory(
    bioguideId: string,
    chamber: 'House' | 'Senate' | 'Both' = 'Both',
    limit = 20
  ): Promise<
    Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bill?: any;
    }>
  > {
    const votes =
      chamber === 'Both'
        ? await this.getAllCongressionalVotes(limit * 2)
        : chamber === 'House'
          ? { combined: await this.getHouseVotes(CURRENT_CONGRESS, CURRENT_SESSION, limit * 2) }
          : { combined: await this.getSenateVotes(CURRENT_CONGRESS, CURRENT_SESSION, limit * 2) };

    const memberVotes = [];

    for (const vote of votes.combined) {
      if (vote.memberVotes) {
        const memberVote = vote.memberVotes.find(m => m.bioguideId === bioguideId);

        if (memberVote) {
          memberVotes.push({
            voteId: vote.voteId,
            date: vote.date,
            question: vote.question,
            position: memberVote.position,
            result: vote.result,
            bill: vote.bill,
          });
        }
      }
    }

    return memberVotes.slice(0, limit);
  }
}

// Export singleton instance
export const enhancedCongressDataService = EnhancedCongressDataService.getInstance();
