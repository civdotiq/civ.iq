/**
 * Wikipedia and Wikidata integration service for committee biographical data
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

export interface WikipediaExtract {
  title: string;
  extract: string;
  extract_html?: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  pageurl: string;
  description?: string;
}

export interface WikidataCommittee {
  id: string;
  label: string;
  description?: string;
  wikipediaTitle?: string;
  jurisdiction?: string;
  establishedDate?: string;
  parentCommittee?: string;
  subcommittees?: string[];
  oversightAgencies?: string[];
}

export interface CommitteeBiographicalData {
  wikipedia?: WikipediaExtract;
  wikidata?: WikidataCommittee;
  jurisdiction?: string;
  history?: {
    establishedDate?: string;
    previousNames?: Array<{
      name: string;
      period: string;
      congress?: string;
    }>;
    nameChanges?: Array<{
      from: string;
      to: string;
      date: string;
      congress?: string;
    }>;
  };
  oversight?: Array<{
    agency: string;
    acronym?: string;
    description?: string;
    wikipediaUrl?: string;
  }>;
  relatedEntities?: Array<{
    name: string;
    type: 'committee' | 'subcommittee' | 'department' | 'agency';
    wikipediaUrl?: string;
  }>;
}

class WikipediaService {
  private readonly WIKIPEDIA_API_BASE = 'https://en.wikipedia.org/api/rest_v1';
  private readonly WIKIDATA_SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
  private readonly WIKIPEDIA_EXTRACTS_API = 'https://en.wikipedia.org/w/api.php';

  /**
   * Search for committee pages on Wikipedia
   */
  async searchCommittee(
    committeeName: string,
    chamber: 'House' | 'Senate' | 'Joint'
  ): Promise<string[]> {
    try {
      const searchTerms = [
        `"United States ${chamber} ${committeeName}"`,
        `"${chamber} Committee on ${committeeName.replace(/^Committee on\s+/, '')}"`,
        `"${chamber} ${committeeName.replace(/^(Committee|Subcommittee) on\s+/, '')}"`,
      ];

      const results: string[] = [];

      for (const term of searchTerms) {
        const response = await fetch(
          `${this.WIKIPEDIA_EXTRACTS_API}?` +
            new URLSearchParams({
              action: 'query',
              format: 'json',
              list: 'search',
              srsearch: term,
              srlimit: '5',
              origin: '*',
            })
        );

        if (response.ok) {
          const data = (await response.json()) as {
            query?: {
              search?: Array<{ title: string }>;
            };
          };
          if (data.query?.search) {
            results.push(...data.query.search.map(item => item.title));
          }
        }
      }

      return [...new Set(results)]; // Remove duplicates
    } catch (error) {
      logger.error('Error searching Wikipedia for committee', error as Error);
      return [];
    }
  }

  /**
   * Get Wikipedia page extract for a committee
   */
  async getWikipediaExtract(pageTitle: string): Promise<WikipediaExtract | null> {
    try {
      const response = await fetch(
        `${this.WIKIPEDIA_EXTRACTS_API}?` +
          new URLSearchParams({
            action: 'query',
            format: 'json',
            prop: 'extracts|pageimages|info',
            exintro: 'true',
            explaintext: 'false', // Get HTML for rich formatting
            exsectionformat: 'wiki',
            piprop: 'thumbnail',
            pithumbsize: '300',
            inprop: 'url',
            titles: pageTitle,
            origin: '*',
          })
      );

      if (!response.ok) return null;

      const data = (await response.json()) as {
        query?: {
          pages?: Record<
            string,
            {
              title?: string;
              extract?: string;
              thumbnail?: {
                source: string;
                width: number;
                height: number;
              };
              fullurl?: string;
              description?: string;
              missing?: boolean;
            }
          >;
        };
      };
      const pages = data.query?.pages;

      if (!pages) return null;

      const pageEntries = Object.values(pages);
      if (pageEntries.length === 0) return null;

      const page = pageEntries[0];
      if (!page || page.missing) return null;

      return {
        title: page.title || '',
        extract: page.extract || '',
        extract_html: page.extract,
        thumbnail: page.thumbnail,
        pageurl: page.fullurl || '',
        description: page.description,
      };
    } catch (error) {
      logger.error('Error fetching Wikipedia extract', error as Error);
      return null;
    }
  }

  /**
   * Query Wikidata for committee information using SPARQL
   */
  async queryWikidataCommittee(committeeName: string): Promise<WikidataCommittee | null> {
    try {
      const sparqlQuery = `
        SELECT DISTINCT ?committee ?committeeLabel ?description ?wikipediaTitle ?establishedDate ?parentCommittee ?parentCommitteeLabel WHERE {
          ?committee wdt:P31/wdt:P279* wd:Q11255598 . # Instance of/subclass of committee
          ?committee rdfs:label ?committeeLabel .
          FILTER(LANG(?committeeLabel) = "en")
          FILTER(CONTAINS(LCASE(?committeeLabel), "${committeeName.toLowerCase()}"))

          OPTIONAL { ?committee schema:description ?description . FILTER(LANG(?description) = "en") }
          OPTIONAL {
            ?wikipediaTitle schema:about ?committee ;
                           schema:isPartOf <https://en.wikipedia.org/> ;
                           schema:name ?wikipediaTitle .
          }
          OPTIONAL { ?committee wdt:P571 ?establishedDate }
          OPTIONAL {
            ?committee wdt:P361 ?parentCommittee .
            ?parentCommittee rdfs:label ?parentCommitteeLabel .
            FILTER(LANG(?parentCommitteeLabel) = "en")
          }

          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
        }
        LIMIT 10
      `;

      const response = await fetch(this.WIKIDATA_SPARQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/sparql-results+json',
        },
        body: new URLSearchParams({
          query: sparqlQuery,
        }),
      });

      if (!response.ok) return null;

      const data = (await response.json()) as {
        results?: {
          bindings?: Array<{
            committee?: { value: string };
            committeeLabel?: { value: string };
            description?: { value: string };
            wikipediaTitle?: { value: string };
            establishedDate?: { value: string };
            parentCommitteeLabel?: { value: string };
          }>;
        };
      };
      const bindings = data.results?.bindings;

      if (!bindings || bindings.length === 0) return null;

      const result = bindings[0];
      if (!result) return null;

      return {
        id: result.committee?.value || '',
        label: result.committeeLabel?.value || '',
        description: result.description?.value,
        wikipediaTitle: result.wikipediaTitle?.value,
        establishedDate: result.establishedDate?.value,
        parentCommittee: result.parentCommitteeLabel?.value,
      };
    } catch (error) {
      logger.error('Error querying Wikidata', error as Error);
      return null;
    }
  }

  /**
   * Get comprehensive biographical data for a committee
   */
  async getCommitteeBiographicalData(
    committeeName: string,
    chamber: 'House' | 'Senate' | 'Joint',
    _thomasId?: string
  ): Promise<CommitteeBiographicalData | null> {
    try {
      // Try multiple search strategies
      const searchResults = await this.searchCommittee(committeeName, chamber);

      let wikipediaData: WikipediaExtract | null = null;
      let wikidataData: WikidataCommittee | null = null;

      // Try to get Wikipedia data from search results
      for (const title of searchResults.slice(0, 3)) {
        const extract = await this.getWikipediaExtract(title);
        if (extract && extract.extract.length > 100) {
          wikipediaData = extract;
          break;
        }
      }

      // Get Wikidata information
      wikidataData = await this.queryWikidataCommittee(committeeName);

      // If we found Wikidata with Wikipedia title, try to get that extract too
      if (wikidataData?.wikipediaTitle && !wikipediaData) {
        wikipediaData = await this.getWikipediaExtract(wikidataData.wikipediaTitle);
      }

      if (!wikipediaData && !wikidataData) {
        return null;
      }

      // Parse historical information from Wikipedia text
      const history = this.parseHistoricalInformation(wikipediaData?.extract || '');

      // Parse oversight information
      const oversight = this.parseOversightInformation(wikipediaData?.extract || '');

      // Parse related entities
      const relatedEntities = this.parseRelatedEntities(wikipediaData?.extract || '');

      return {
        wikipedia: wikipediaData || undefined,
        wikidata: wikidataData || undefined,
        jurisdiction: this.extractJurisdiction(wikipediaData?.extract || ''),
        history,
        oversight,
        relatedEntities,
      };
    } catch (error) {
      logger.error('Error getting committee biographical data', error as Error);
      return null;
    }
  }

  /**
   * Parse historical information from Wikipedia extract
   */
  private parseHistoricalInformation(text: string) {
    const history: CommitteeBiographicalData['history'] = {};

    // Look for establishment dates
    const establishedMatch = text.match(/established?\s+(?:in\s+)?(\d{4})/i);
    if (establishedMatch) {
      history.establishedDate = establishedMatch[1];
    }

    // Look for previous names and name changes
    const nameChanges: Array<{ from: string; to: string; date: string; congress?: string }> = [];
    const previousNames: Array<{ name: string; period: string; congress?: string }> = [];

    // Pattern for "renamed from X to Y" or "previously known as X"
    const renamePatterns = [
      /renamed from (?:the\s+)?([^.]+?)\s+(?:at the start of|in)\s+(?:the\s+)?(\d+(?:th|st|nd|rd)?\s+Congress)/gi,
      /previously known as (?:the\s+)?([^.]+?)(?:\.|$)/gi,
      /prior to (?:the\s+)?(\d+(?:th|st|nd|rd)?\s+Congress),?\s+it was (?:named|known as)\s+(?:the\s+)?([^.]+)/gi,
    ];

    for (const pattern of renamePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[2]) {
          nameChanges.push({
            from: match[1].trim(),
            to: 'Current name',
            date: match[2].trim(),
            congress: match[2].match(/\d+(?:th|st|nd|rd)?/)?.[0],
          });
        } else if (match[1]) {
          previousNames.push({
            name: match[1].trim(),
            period: 'Historical',
          });
        }
      }
    }

    if (nameChanges.length > 0) {
      history.nameChanges = nameChanges;
    }
    if (previousNames.length > 0) {
      history.previousNames = previousNames;
    }

    return Object.keys(history).length > 0 ? history : undefined;
  }

  /**
   * Parse oversight information from Wikipedia extract
   */
  private parseOversightInformation(text: string) {
    const oversight: Array<{
      agency: string;
      acronym?: string;
      description?: string;
      wikipediaUrl?: string;
    }> = [];

    // Common federal agencies and their patterns
    const agencyPatterns = [
      { name: 'Federal Communications Commission', acronym: 'FCC' },
      { name: 'Corporation for Public Broadcasting', acronym: 'CPB' },
      { name: 'National Telecommunications and Information Administration', acronym: 'NTIA' },
      { name: 'Department of Commerce', acronym: 'DOC' },
      { name: 'Federal Trade Commission', acronym: 'FTC' },
      { name: 'Securities and Exchange Commission', acronym: 'SEC' },
      { name: 'Environmental Protection Agency', acronym: 'EPA' },
      { name: 'Department of Agriculture', acronym: 'USDA' },
      { name: 'Food and Drug Administration', acronym: 'FDA' },
    ];

    for (const agency of agencyPatterns) {
      const fullNameRegex = new RegExp(agency.name, 'gi');
      const acronymRegex = new RegExp(`\\b${agency.acronym}\\b`, 'g');

      if (fullNameRegex.test(text) || acronymRegex.test(text)) {
        oversight.push({
          agency: agency.name,
          acronym: agency.acronym,
          description: `Oversight of ${agency.name}`,
          wikipediaUrl: `https://en.wikipedia.org/wiki/${agency.name.replace(/\s+/g, '_')}`,
        });
      }
    }

    return oversight.length > 0 ? oversight : undefined;
  }

  /**
   * Parse related entities from Wikipedia extract
   */
  private parseRelatedEntities(text: string) {
    const entities: Array<{
      name: string;
      type: 'committee' | 'subcommittee' | 'department' | 'agency';
      wikipediaUrl?: string;
    }> = [];

    // Look for committee mentions
    const committeePattern = /(?:Committee|Subcommittee) on ([^,.]+)/gi;
    let match;
    while ((match = committeePattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      const fullMatch = match[0];
      if (!name || !fullMatch) continue;

      const type = fullMatch.toLowerCase().includes('subcommittee') ? 'subcommittee' : 'committee';

      entities.push({
        name: `${type === 'subcommittee' ? 'Subcommittee' : 'Committee'} on ${name}`,
        type: type as 'committee' | 'subcommittee',
        wikipediaUrl: `https://en.wikipedia.org/wiki/${fullMatch.replace(/\s+/g, '_')}`,
      });
    }

    // Look for department mentions
    const departmentPattern = /Department of ([^,.]+)/gi;
    while ((match = departmentPattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (!name) continue;

      entities.push({
        name: `Department of ${name}`,
        type: 'department',
        wikipediaUrl: `https://en.wikipedia.org/wiki/United_States_Department_of_${name.replace(/\s+/g, '_')}`,
      });
    }

    return entities.length > 0 ? entities : undefined;
  }

  /**
   * Extract jurisdiction information from Wikipedia text
   */
  private extractJurisdiction(text: string): string | undefined {
    // Look for jurisdiction section
    const jurisdictionMatch = text.match(/has jurisdiction over ([^.]+)/i);
    if (jurisdictionMatch && jurisdictionMatch[1]) {
      return jurisdictionMatch[1].trim();
    }

    // Look for responsibility mentions
    const responsibilityMatch = text.match(/responsible for ([^.]+)/i);
    if (responsibilityMatch && responsibilityMatch[1]) {
      return responsibilityMatch[1].trim();
    }

    return undefined;
  }
}

export const wikipediaService = new WikipediaService();
