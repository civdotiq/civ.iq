#!/usr/bin/env node

/**
 * Generate Static Committee Biography Data
 *
 * Fetches Wikipedia and Wikidata biographies for all congressional committees
 * and saves them to a static JSON file for fast loading.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  outputPath: path.join(process.cwd(), 'src', 'data', 'committee-biographies.json'),
  requestDelay: 1000, // 1 second between requests to be respectful
  timeout: 10000, // 10 second timeout
  maxRetries: 3,
  testMode: process.env.TEST_MODE === 'true', // Only process first 3 if TEST_MODE=true
  testLimit: 3,
};

// Committee ID to name mapping (from /api/committee/[committeeId]/wikipedia/route.ts)
const COMMITTEE_NAMES = {
  SSJU: { name: 'Committee on the Judiciary', chamber: 'Senate' },
  SSAP: { name: 'Committee on Appropriations', chamber: 'Senate' },
  SSAS: { name: 'Committee on Armed Services', chamber: 'Senate' },
  SSBK: { name: 'Committee on Banking, Housing, and Urban Affairs', chamber: 'Senate' },
  SSBU: { name: 'Committee on the Budget', chamber: 'Senate' },
  SSCM: { name: 'Committee on Commerce, Science, and Transportation', chamber: 'Senate' },
  SSEG: { name: 'Committee on Energy and Natural Resources', chamber: 'Senate' },
  SSEV: { name: 'Committee on Environment and Public Works', chamber: 'Senate' },
  SSFI: { name: 'Committee on Finance', chamber: 'Senate' },
  SSFO: { name: 'Committee on Foreign Relations', chamber: 'Senate' },
  SSGA: { name: 'Committee on Homeland Security and Governmental Affairs', chamber: 'Senate' },
  SSHR: { name: 'Committee on Health, Education, Labor and Pensions', chamber: 'Senate' },
  SLIA: { name: 'Committee on Indian Affairs', chamber: 'Senate' },
  SSRA: { name: 'Committee on Rules and Administration', chamber: 'Senate' },
  SSSB: { name: 'Committee on Small Business and Entrepreneurship', chamber: 'Senate' },
  SSVA: { name: "Committee on Veterans' Affairs", chamber: 'Senate' },
  HSAG: { name: 'Committee on Agriculture', chamber: 'House' },
  HSAP: { name: 'Committee on Appropriations', chamber: 'House' },
  HSAS: { name: 'Committee on Armed Services', chamber: 'House' },
  HSBA: { name: 'Committee on Financial Services', chamber: 'House' },
  HSBU: { name: 'Committee on the Budget', chamber: 'House' },
  HSED: { name: 'Committee on Education and the Workforce', chamber: 'House' },
  HSIF: { name: 'Committee on Energy and Commerce', chamber: 'House' },
  HSFA: { name: 'Committee on Foreign Affairs', chamber: 'House' },
  HSGO: { name: 'Committee on Oversight and Accountability', chamber: 'House' },
  HSHA: { name: 'Committee on House Administration', chamber: 'House' },
  HSII: { name: 'Committee on Natural Resources', chamber: 'House' },
  HSJU: { name: 'Committee on the Judiciary', chamber: 'House' },
  HSPW: { name: 'Committee on Transportation and Infrastructure', chamber: 'House' },
  HSRU: { name: 'Committee on Rules', chamber: 'House' },
  HSSM: { name: 'Committee on Small Business', chamber: 'House' },
  HSSY: { name: 'Committee on Science, Space, and Technology', chamber: 'House' },
  HSVR: { name: "Committee on Veterans' Affairs", chamber: 'House' },
  HSWM: { name: 'Committee on Ways and Means', chamber: 'House' },
};

class CommitteeBiographyGenerator {
  constructor() {
    this.biographies = {};
    this.stats = {
      total: 0,
      successful: 0,
      failed: 0,
      wikipediaSuccess: 0,
      wikidataSuccess: 0,
    };
  }

  /**
   * Sleep helper for rate limiting
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetch with timeout and retry
   */
  async fetchWithRetry(url, retries = CONFIG.maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Committee Biography Generator',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && retries > 0) {
        await this.sleep(CONFIG.requestDelay * 2);
        return this.fetchWithRetry(url, retries - 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0) {
        await this.sleep(CONFIG.requestDelay * 2);
        return this.fetchWithRetry(url, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Search for committee pages on Wikipedia
   */
  async searchCommittee(committeeName, chamber) {
    try {
      const searchTerms = [
        `"United States ${chamber} ${committeeName}"`,
        `"${chamber} Committee on ${committeeName.replace(/^Committee on\s+/, '')}"`,
        `"${chamber} ${committeeName.replace(/^(Committee|Subcommittee) on\s+/, '')}"`,
      ];

      const results = [];

      for (const term of searchTerms) {
        const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
          action: 'query',
          format: 'json',
          list: 'search',
          srsearch: term,
          srlimit: '5',
          origin: '*',
        })}`;

        const response = await this.fetchWithRetry(url);

        if (response.ok) {
          const data = await response.json();
          if (data.query?.search) {
            results.push(...data.query.search.map(item => item.title));
          }
        }
      }

      return [...new Set(results)]; // Remove duplicates
    } catch (error) {
      console.error(`Search error for ${committeeName}:`, error.message);
      return [];
    }
  }

  /**
   * Get Wikipedia page extract for a committee
   */
  async getWikipediaExtract(pageTitle) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
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
      })}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) return null;

      const data = await response.json();
      const pages = data.query?.pages;

      if (!pages) return null;

      const page = Object.values(pages)[0];

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
      console.error(`Wikipedia extract error for ${pageTitle}:`, error.message);
      return null;
    }
  }

  /**
   * Query Wikidata for committee information using SPARQL
   */
  async queryWikidataCommittee(committeeName) {
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

      const response = await fetch('https://query.wikidata.org/sparql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/sparql-results+json',
        },
        body: new URLSearchParams({ query: sparqlQuery }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const bindings = data.results?.bindings;

      if (!bindings || bindings.length === 0) return null;

      const result = bindings[0];

      return {
        id: result.committee?.value || '',
        label: result.committeeLabel?.value || '',
        description: result.description?.value,
        wikipediaTitle: result.wikipediaTitle?.value,
        establishedDate: result.establishedDate?.value,
        parentCommittee: result.parentCommitteeLabel?.value,
      };
    } catch (error) {
      console.error(`Wikidata query error for ${committeeName}:`, error.message);
      return null;
    }
  }

  /**
   * Parse historical information from Wikipedia extract
   */
  parseHistoricalInformation(text) {
    const history = {};

    // Look for establishment dates
    const establishedMatch = text.match(/established?\s+(?:in\s+)?(\d{4})/i);
    if (establishedMatch) {
      history.establishedDate = establishedMatch[1];
    }

    // Look for name changes
    const nameChanges = [];
    const previousNames = [];

    const renamePatterns = [
      /renamed from (?:the\s+)?([^.]+?)\s+(?:at the start of|in)\s+(?:the\s+)?(\d+(?:th|st|nd|rd)?\s+Congress)/gi,
      /previously known as (?:the\s+)?([^.]+?)(?:\.|$)/gi,
    ];

    for (const pattern of renamePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[2]) {
          nameChanges.push({
            from: match[1].trim(),
            to: 'Current name',
            date: match[2].trim(),
          });
        } else if (match[1]) {
          previousNames.push({
            name: match[1].trim(),
            period: 'Historical',
          });
        }
      }
    }

    if (nameChanges.length > 0) history.nameChanges = nameChanges;
    if (previousNames.length > 0) history.previousNames = previousNames;

    return Object.keys(history).length > 0 ? history : undefined;
  }

  /**
   * Parse oversight information from Wikipedia extract
   */
  parseOversightInformation(text) {
    const oversight = [];

    const agencyPatterns = [
      { name: 'Federal Communications Commission', acronym: 'FCC' },
      { name: 'Corporation for Public Broadcasting', acronym: 'CPB' },
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
          wikipediaUrl: `https://en.wikipedia.org/wiki/${agency.name.replace(/\s+/g, '_')}`,
        });
      }
    }

    return oversight.length > 0 ? oversight : undefined;
  }

  /**
   * Extract jurisdiction information from Wikipedia text
   */
  extractJurisdiction(text) {
    const jurisdictionMatch = text.match(/has jurisdiction over ([^.]+)/i);
    if (jurisdictionMatch && jurisdictionMatch[1]) {
      return jurisdictionMatch[1].trim();
    }

    const responsibilityMatch = text.match(/responsible for ([^.]+)/i);
    if (responsibilityMatch && responsibilityMatch[1]) {
      return responsibilityMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Generate biography for a single committee
   */
  async generateCommitteeBiography(committeeId, committeeInfo) {
    try {
      // Search for Wikipedia pages
      const searchResults = await this.searchCommittee(committeeInfo.name, committeeInfo.chamber);
      await this.sleep(CONFIG.requestDelay);

      let wikipediaData = null;
      let wikidataData = null;

      // Try to get Wikipedia data from search results
      for (const title of searchResults.slice(0, 3)) {
        const extract = await this.getWikipediaExtract(title);
        if (extract && extract.extract.length > 100) {
          wikipediaData = extract;
          break;
        }
        await this.sleep(CONFIG.requestDelay);
      }

      // Get Wikidata information
      wikidataData = await this.queryWikidataCommittee(committeeInfo.name);
      await this.sleep(CONFIG.requestDelay);

      // If we found Wikidata with Wikipedia title, try to get that extract too
      if (wikidataData?.wikipediaTitle && !wikipediaData) {
        wikipediaData = await this.getWikipediaExtract(wikidataData.wikipediaTitle);
        await this.sleep(CONFIG.requestDelay);
      }

      if (!wikipediaData && !wikidataData) {
        return null;
      }

      // Parse additional information
      const extractText = wikipediaData?.extract || '';
      const history = this.parseHistoricalInformation(extractText);
      const oversight = this.parseOversightInformation(extractText);
      const jurisdiction = this.extractJurisdiction(extractText);

      return {
        committeeId,
        committeeName: committeeInfo.name,
        chamber: committeeInfo.chamber,
        wikipedia: wikipediaData || undefined,
        wikidata: wikidataData || undefined,
        jurisdiction,
        history,
        oversight,
        lastUpdated: new Date().toISOString(),
        wikipediaSuccess: !!wikipediaData,
        wikidataSuccess: !!wikidataData,
      };
    } catch (error) {
      console.error(`Error generating biography for ${committeeId}:`, error.message);
      return null;
    }
  }

  /**
   * Generate all committee biographies
   */
  async generateAll() {
    console.log('📚 Starting committee biography generation...\n');

    let committeeEntries = Object.entries(COMMITTEE_NAMES);

    // Test mode: only process first few
    if (CONFIG.testMode) {
      committeeEntries = committeeEntries.slice(0, CONFIG.testLimit);
      console.log(`⚠️  TEST MODE: Processing only ${committeeEntries.length} committees\n`);
    }

    this.stats.total = committeeEntries.length;
    console.log(`✓ Found ${this.stats.total} committees to process\n`);

    // Fetch biographies with progress tracking
    let processed = 0;

    for (const [committeeId, committeeInfo] of committeeEntries) {
      processed++;
      console.log(`[${processed}/${this.stats.total}] Fetching ${committeeId} (${committeeInfo.chamber} ${committeeInfo.name})...`);

      const biography = await this.generateCommitteeBiography(committeeId, committeeInfo);

      if (biography) {
        this.biographies[committeeId] = biography;
        this.stats.successful++;
        if (biography.wikipediaSuccess) this.stats.wikipediaSuccess++;
        if (biography.wikidataSuccess) this.stats.wikidataSuccess++;
        console.log(`  ✓ Success (Wikipedia: ${biography.wikipediaSuccess}, Wikidata: ${biography.wikidataSuccess})`);
      } else {
        this.stats.failed++;
        console.log(`  ✗ Failed (no data from either source)`);
      }

      // Progress update every 10 items
      if (processed % 10 === 0) {
        console.log(`\n📊 Progress: ${processed}/${this.stats.total} (${Math.round(processed/this.stats.total*100)}%)\n`);
      }
    }

    // Save to file
    console.log('\n💾 Saving committee biography data...');

    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalCommittees: this.stats.total,
        successfulFetches: this.stats.successful,
        failedFetches: this.stats.failed,
        wikipediaSuccessRate: `${Math.round(this.stats.wikipediaSuccess/this.stats.total*100)}%`,
        wikidataSuccessRate: `${Math.round(this.stats.wikidataSuccess/this.stats.total*100)}%`,
      },
      biographies: this.biographies,
    };

    await fs.mkdir(path.dirname(CONFIG.outputPath), { recursive: true });
    await fs.writeFile(
      CONFIG.outputPath,
      JSON.stringify(output, null, 2),
      'utf-8'
    );

    console.log(`✓ Saved to ${CONFIG.outputPath}`);

    // Print statistics
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Committees: ${this.stats.total}`);
    console.log(`   Successful: ${this.stats.successful} (${Math.round(this.stats.successful/this.stats.total*100)}%)`);
    console.log(`   Failed: ${this.stats.failed} (${Math.round(this.stats.failed/this.stats.total*100)}%)`);
    console.log(`   Wikipedia Success: ${this.stats.wikipediaSuccess} (${Math.round(this.stats.wikipediaSuccess/this.stats.total*100)}%)`);
    console.log(`   Wikidata Success: ${this.stats.wikidataSuccess} (${Math.round(this.stats.wikidataSuccess/this.stats.total*100)}%)`);
    console.log('\n✅ Committee biography generation complete!\n');
  }
}

// Run the generator
const generator = new CommitteeBiographyGenerator();
generator.generateAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
