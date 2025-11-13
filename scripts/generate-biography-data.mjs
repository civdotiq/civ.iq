#!/usr/bin/env node

/**
 * Generate Static Biography Data
 *
 * Fetches Wikipedia and Wikidata biographies for all current representatives
 * and saves them to a static JSON file for fast loading.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  outputPath: path.join(process.cwd(), 'src', 'data', 'representative-biographies.json'),
  mappingsPath: path.join(process.cwd(), 'src', 'lib', 'data', 'enhanced-wikipedia-mappings.ts'),
  requestDelay: 1000, // 1 second between requests to be respectful
  timeout: 10000, // 10 second timeout
  maxRetries: 3,
  testMode: process.env.TEST_MODE === 'true', // Only process first 3 if TEST_MODE=true
  testLimit: 3,
};

class BiographyGenerator {
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
          'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Biography Data Generator',
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
   * Fetch Wikipedia biography
   */
  async fetchWikipediaBiography(wikipediaPageName) {
    try {
      const url = `https://en.wikipedia.org/w/api.php?${new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'extracts|pageimages|info',
        exintro: 'true',
        explaintext: 'false', // Get HTML
        exsectionformat: 'wiki',
        piprop: 'thumbnail',
        pithumbsize: '300',
        inprop: 'url',
        titles: wikipediaPageName.replace(/_/g, ' '),
        origin: '*',
      })}`;

      const response = await this.fetchWithRetry(url);

      if (!response.ok) return null;

      const data = await response.json();
      const pages = data?.query?.pages;

      if (!pages) return null;

      const page = Object.values(pages)[0];

      if (!page || page.missing) return null;

      return {
        wikipediaSummary: page.extract?.replace(/<[^>]*>/g, '') || null, // Plain text
        wikipediaHtmlSummary: page.extract || null, // HTML version
        wikipediaImageUrl: page.thumbnail?.source || null,
        wikipediaPageUrl: page.fullurl || null,
      };
    } catch (error) {
      console.error(`Wikipedia fetch error for ${wikipediaPageName}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch Wikidata biography
   */
  async fetchWikidataBiography(bioguideId) {
    try {
      const sparqlQuery = `
        SELECT DISTINCT ?person ?birthPlace ?birthPlaceLabel ?education ?educationLabel
               ?occupation ?occupationLabel ?spouse ?spouseLabel
               ?children ?award ?awardLabel ?description
        WHERE {
          ?person wdt:P1157 "${bioguideId}" .
          OPTIONAL { ?person wdt:P19 ?birthPlace }
          OPTIONAL { ?person wdt:P69 ?education }
          OPTIONAL { ?person wdt:P106 ?occupation }
          OPTIONAL { ?person wdt:P26 ?spouse }
          OPTIONAL { ?person wdt:P1971 ?children }
          OPTIONAL { ?person wdt:P166 ?award }
          OPTIONAL { ?person schema:description ?description . FILTER(LANG(?description) = "en") }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
        }
        LIMIT 50
      `;

      const url = 'https://query.wikidata.org/sparql?' + new URLSearchParams({
        query: sparqlQuery,
        format: 'json',
      });

      const response = await this.fetchWithRetry(url);

      if (!response.ok) return null;

      const data = await response.json();
      const bindings = data?.results?.bindings;

      if (!bindings || bindings.length === 0) return null;

      // Aggregate data from multiple rows
      const birthPlace = bindings.find(b => b.birthPlaceLabel)?.birthPlaceLabel?.value;
      const education = [...new Set(bindings
        .filter(b => b.educationLabel)
        .map(b => b.educationLabel.value))];
      const occupations = [...new Set(bindings
        .filter(b => b.occupationLabel)
        .map(b => b.occupationLabel.value))];
      const spouse = bindings.find(b => b.spouseLabel)?.spouseLabel?.value;
      const children = bindings.find(b => b.children)?.children?.value;
      const awards = [...new Set(bindings
        .filter(b => b.awardLabel)
        .map(b => b.awardLabel.value))];
      const description = bindings.find(b => b.description)?.description?.value;

      return {
        birthPlace: birthPlace || null,
        education: education.length > 0 ? education : null,
        occupations: occupations.length > 0 ? occupations : null,
        spouse: spouse || null,
        children: children ? parseInt(children) : null,
        awards: awards.length > 0 ? awards : null,
        wikidataDescription: description || null,
      };
    } catch (error) {
      console.error(`Wikidata fetch error for ${bioguideId}:`, error.message);
      return null;
    }
  }

  /**
   * Load Wikipedia mappings from TypeScript file
   */
  async loadWikipediaMappings() {
    try {
      const content = await fs.readFile(CONFIG.mappingsPath, 'utf-8');

      // Extract the mapping object from TypeScript file - match the entire Record
      const mappingMatch = content.match(/export const ENHANCED_BIOGUIDE_TO_WIKIPEDIA[^{]*{([^}]+)}/s);

      if (!mappingMatch) {
        throw new Error('Could not find ENHANCED_BIOGUIDE_TO_WIKIPEDIA mapping');
      }

      // Parse each line of the mapping
      const lines = mappingMatch[1].split('\n');
      const mappings = {};

      for (const line of lines) {
        // Match pattern: BIOGUIDE_ID: 'Wikipedia_Page_Name',
        const lineMatch = line.trim().match(/^([A-Z]\d+):\s*'([^']+)',?$/);
        if (lineMatch) {
          const [, bioguideId, wikipediaPage] = lineMatch;
          mappings[bioguideId] = wikipediaPage;
        }
      }

      console.log(`  Parsed ${Object.keys(mappings).length} mappings`);
      return mappings;
    } catch (error) {
      console.error('Error loading Wikipedia mappings:', error.message);
      throw error;
    }
  }

  /**
   * Generate all biographies
   */
  async generateAll() {
    console.log('📚 Starting biography data generation...\n');

    // Load mappings
    console.log('📋 Loading Wikipedia mappings...');
    const mappings = await this.loadWikipediaMappings();

    let bioguideIds = Object.keys(mappings);

    // Test mode: only process first few
    if (CONFIG.testMode) {
      bioguideIds = bioguideIds.slice(0, CONFIG.testLimit);
      console.log(`⚠️  TEST MODE: Processing only ${bioguideIds.length} representatives\n`);
    }

    this.stats.total = bioguideIds.length;
    console.log(`✓ Found ${this.stats.total} representatives to process\n`);

    // Fetch biographies with progress tracking
    let processed = 0;

    for (const bioguideId of bioguideIds) {
      const wikipediaPageName = mappings[bioguideId];
      processed++;

      console.log(`[${processed}/${this.stats.total}] Fetching ${bioguideId} (${wikipediaPageName})...`);

      try {
        // Fetch Wikipedia data
        const wikipediaData = await this.fetchWikipediaBiography(wikipediaPageName);

        // Wait to be respectful to Wikipedia
        await this.sleep(CONFIG.requestDelay);

        // Fetch Wikidata data
        const wikidataData = await this.fetchWikidataBiography(bioguideId);

        // Wait to be respectful to Wikidata
        await this.sleep(CONFIG.requestDelay);

        // Combine data
        if (wikipediaData || wikidataData) {
          this.biographies[bioguideId] = {
            bioguideId,
            wikipediaPageName,
            ...wikipediaData,
            ...wikidataData,
            lastUpdated: new Date().toISOString(),
            wikipediaSuccess: !!wikipediaData,
            wikidataSuccess: !!wikidataData,
          };

          this.stats.successful++;
          if (wikipediaData) this.stats.wikipediaSuccess++;
          if (wikidataData) this.stats.wikidataSuccess++;

          console.log(`  ✓ Success (Wikipedia: ${!!wikipediaData}, Wikidata: ${!!wikidataData})`);
        } else {
          this.stats.failed++;
          console.log(`  ✗ Failed (no data from either source)`);
        }
      } catch (error) {
        this.stats.failed++;
        console.error(`  ✗ Error: ${error.message}`);
      }

      // Progress update every 50 items
      if (processed % 50 === 0) {
        console.log(`\n📊 Progress: ${processed}/${this.stats.total} (${Math.round(processed/this.stats.total*100)}%)\n`);
      }
    }

    // Save to file
    console.log('\n💾 Saving biography data...');

    const output = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalRepresentatives: this.stats.total,
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
    console.log(`   Total Representatives: ${this.stats.total}`);
    console.log(`   Successful: ${this.stats.successful} (${Math.round(this.stats.successful/this.stats.total*100)}%)`);
    console.log(`   Failed: ${this.stats.failed} (${Math.round(this.stats.failed/this.stats.total*100)}%)`);
    console.log(`   Wikipedia Success: ${this.stats.wikipediaSuccess} (${Math.round(this.stats.wikipediaSuccess/this.stats.total*100)}%)`);
    console.log(`   Wikidata Success: ${this.stats.wikidataSuccess} (${Math.round(this.stats.wikidataSuccess/this.stats.total*100)}%)`);
    console.log('\n✅ Biography data generation complete!\n');
  }
}

// Run the generator
const generator = new BiographyGenerator();
generator.generateAll().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
