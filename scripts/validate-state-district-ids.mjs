#!/usr/bin/env node

/**
 * State Legislative District ID Validation Script
 *
 * Validates that district IDs generated from TIGER/Line data match
 * the district identifiers used by OpenStates API. This is critical
 * to ensure the map boundaries align with legislator data.
 *
 * Process:
 * 1. Load TIGER-generated manifest (state-districts-manifest.json)
 * 2. Fetch legislators from OpenStates API for each state
 * 3. Build expected IDs from OpenStates data
 * 4. Compare and report mismatches
 *
 * Usage:
 *   node scripts/validate-state-district-ids.mjs [--states=CA,TX,MI] [--chamber=upper|lower]
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  manifestPath: path.join(process.cwd(), 'public', 'data', 'state-districts', 'state-districts-manifest.json'),
  openstatesApiKey: process.env.OPENSTATES_API_KEY,
  openstatesBaseUrl: 'https://v3.openstates.org',

  // All US states + DC
  states: [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI',
    'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN',
    'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
    'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA',
    'WV', 'WI', 'WY'
  ]
};

class DistrictIDValidator {
  constructor(options = {}) {
    this.statesToTest = options.states || CONFIG.states;
    this.chamberFilter = options.chamber; // 'upper', 'lower', or null (both)
    this.manifest = null;
    this.mismatches = [];
    this.matches = [];
    this.warnings = [];
  }

  async run() {
    console.log('🔍 State Legislative District ID Validator');
    console.log('===========================================');
    console.log(`Testing states: ${this.statesToTest.length}`);
    console.log(`Chamber filter: ${this.chamberFilter || 'both'}`);
    console.log('');

    try {
      // Load TIGER manifest
      await this.loadManifest();

      // Validate each state
      for (const stateCode of this.statesToTest) {
        await this.validateState(stateCode);
      }

      // Print results
      this.printResults();

      // Exit with error if mismatches found
      if (this.mismatches.length > 0) {
        console.log('\n❌ Validation FAILED: District ID mismatches found');
        process.exit(1);
      } else {
        console.log('\n✅ Validation PASSED: All district IDs match');
        process.exit(0);
      }

    } catch (error) {
      console.error('\n❌ Validation error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  async loadManifest() {
    console.log('📄 Loading TIGER manifest...');

    try {
      const content = await fs.readFile(CONFIG.manifestPath, 'utf8');
      this.manifest = JSON.parse(content);

      console.log(`✅ Loaded ${Object.keys(this.manifest.districts).length} districts from TIGER data`);
      console.log(`   - Lower chamber: ${this.manifest.summary.chambers.lower}`);
      console.log(`   - Upper chamber: ${this.manifest.summary.chambers.upper}`);
      console.log('');
    } catch (error) {
      throw new Error(`Failed to load manifest: ${error.message}\nRun process-state-legislative-districts.mjs first`);
    }
  }

  async validateState(stateCode) {
    console.log(`🔍 Validating ${stateCode}...`);

    try {
      // Fetch legislators from OpenStates
      const legislators = await this.fetchOpenStatesLegislators(stateCode);

      if (legislators.length === 0) {
        this.warnings.push({
          state: stateCode,
          message: 'No legislators found in OpenStates API'
        });
        console.log(`⚠️  ${stateCode}: No legislators found in OpenStates`);
        return;
      }

      // Group by chamber
      const byChamber = {
        upper: legislators.filter(l => this.getChamber(l) === 'upper'),
        lower: legislators.filter(l => this.getChamber(l) === 'lower')
      };

      // Validate each chamber
      for (const chamber of ['upper', 'lower']) {
        if (this.chamberFilter && this.chamberFilter !== chamber) continue;

        const chamberLegislators = byChamber[chamber];

        if (chamberLegislators.length === 0) {
          // Nebraska has no lower chamber
          if (stateCode === 'NE' && chamber === 'lower') {
            console.log(`  ✓ Lower chamber: N/A (unicameral)`);
            continue;
          }

          this.warnings.push({
            state: stateCode,
            chamber,
            message: 'No legislators found'
          });
          console.log(`  ⚠️  ${chamber}: No legislators`);
          continue;
        }

        // Get unique districts from OpenStates
        const openStatesDistricts = [...new Set(
          chamberLegislators.map(l => l.current_role?.district).filter(Boolean)
        )];

        // Check each district exists in TIGER manifest
        let chamberMatches = 0;
        let chamberMismatches = 0;

        for (const district of openStatesDistricts) {
          const expectedId = `${stateCode}-${chamber}-${district}`;

          if (this.manifest.districts[expectedId]) {
            this.matches.push({ state: stateCode, chamber, district, id: expectedId });
            chamberMatches++;
          } else {
            // Try fuzzy matching
            const fuzzyMatch = this.findFuzzyMatch(stateCode, chamber, district);

            if (fuzzyMatch) {
              this.warnings.push({
                state: stateCode,
                chamber,
                district,
                message: `Fuzzy match found: ${fuzzyMatch}`,
                expected: expectedId,
                found: fuzzyMatch
              });
            } else {
              this.mismatches.push({
                state: stateCode,
                chamber,
                district,
                expected: expectedId,
                legislators: chamberLegislators
                  .filter(l => l.current_role?.district === district)
                  .map(l => l.name)
              });
              chamberMismatches++;
            }
          }
        }

        const status = chamberMismatches > 0 ? '❌' : '✅';
        console.log(`  ${status} ${chamber}: ${chamberMatches} matched, ${chamberMismatches} mismatched`);
      }

    } catch (error) {
      console.error(`❌ ${stateCode}: Error - ${error.message}`);
      this.warnings.push({
        state: stateCode,
        message: `API error: ${error.message}`
      });
    }
  }

  async fetchOpenStatesLegislators(stateCode) {
    const url = new URL('/people', CONFIG.openstatesBaseUrl);
    url.searchParams.set('jurisdiction', stateCode.toLowerCase());
    url.searchParams.set('per_page', '50'); // API max

    const allLegislators = [];
    let page = 1;

    while (true) {
      url.searchParams.set('page', page.toString());

      const response = await fetch(url.toString(), {
        headers: {
          'X-API-KEY': CONFIG.openstatesApiKey || '',
          'User-Agent': 'CivIQ-Hub/2.0 (Validation-Script)'
        }
      });

      if (!response.ok) {
        throw new Error(`OpenStates API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.results || data.results.length === 0) break;

      allLegislators.push(...data.results);

      // Check if there are more pages
      if (page >= data.pagination.max_page) break;
      page++;
    }

    return allLegislators;
  }

  getChamber(legislator) {
    if (!legislator.current_role) return null;

    const org = legislator.current_role.org_classification;
    const title = legislator.current_role.title?.toLowerCase() || '';

    if (org === 'upper' || title.includes('senator') || title.includes('senate')) {
      return 'upper';
    }
    if (org === 'lower' || title.includes('representative') || title.includes('delegate') || title.includes('assembly')) {
      return 'lower';
    }

    return null;
  }

  findFuzzyMatch(stateCode, chamber, district) {
    // Try variations of district number
    const variations = [
      `${stateCode}-${chamber}-${district}`,
      `${stateCode}-${chamber}-${district.padStart(2, '0')}`,
      `${stateCode}-${chamber}-${district.padStart(3, '0')}`,
      `${stateCode}-${chamber}-${district.replace(/^0+/, '')}`,
    ];

    // Handle at-large variations
    if (district === '0' || district === '00' || district === '000' || district === 'At-Large') {
      variations.push(`${stateCode}-${chamber}-AL`);
    }
    if (district === 'AL') {
      variations.push(`${stateCode}-${chamber}-0`);
      variations.push(`${stateCode}-${chamber}-00`);
      variations.push(`${stateCode}-${chamber}-000`);
    }

    for (const variation of variations) {
      if (this.manifest.districts[variation]) {
        return variation;
      }
    }

    return null;
  }

  printResults() {
    console.log('\n');
    console.log('📊 Validation Results');
    console.log('=====================');
    console.log(`Total matches: ${this.matches.length}`);
    console.log(`Total mismatches: ${this.mismatches.length}`);
    console.log(`Warnings: ${this.warnings.length}`);

    if (this.mismatches.length > 0) {
      console.log('\n❌ MISMATCHES FOUND:');
      console.log('===================');

      for (const mismatch of this.mismatches) {
        console.log(`\n${mismatch.state} ${mismatch.chamber} District ${mismatch.district}:`);
        console.log(`  Expected ID: ${mismatch.expected}`);
        console.log(`  Found in TIGER: NO`);
        console.log(`  Legislators affected:`);
        for (const name of mismatch.legislators) {
          console.log(`    - ${name}`);
        }
      }
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      console.log('============');

      for (const warning of this.warnings) {
        console.log(`${warning.state} ${warning.chamber || ''}: ${warning.message}`);
        if (warning.expected) {
          console.log(`  Expected: ${warning.expected}, Found: ${warning.found}`);
        }
      }
    }

    // Print sample of successful matches
    if (this.matches.length > 0) {
      console.log('\n✅ Sample Successful Matches (first 10):');
      console.log('========================================');
      this.matches.slice(0, 10).forEach(match => {
        console.log(`  ${match.id}`);
      });
      if (this.matches.length > 10) {
        console.log(`  ... and ${this.matches.length - 10} more`);
      }
    }
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (const arg of args) {
    if (arg.startsWith('--states=')) {
      options.states = arg.split('=')[1].split(',');
    }
    if (arg.startsWith('--chamber=')) {
      options.chamber = arg.split('=')[1];
    }
  }

  return options;
}

// Run validator if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  const validator = new DistrictIDValidator(options);
  await validator.run();
}

export default DistrictIDValidator;
