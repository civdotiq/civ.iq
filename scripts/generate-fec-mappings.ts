#!/usr/bin/env npx tsx

/**
 * FEC Mapping Generator
 *
 * Extracts all BioGuide ID → FEC ID mappings from congress-legislators data
 * and generates a comprehensive bioguide-fec-mapping.ts file.
 *
 * This replaces manual mapping maintenance with automated generation from
 * the authoritative congress-legislators dataset.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface LegislatorData {
  id: {
    bioguide: string;
    fec?: string[];
    [key: string]: unknown;
  };
  name: {
    first: string;
    last: string;
    official_full?: string;
  };
  terms: Array<{
    type: 'rep' | 'sen';
    state: string;
    district?: string | number;
    party: string;
    start: string;
    end: string;
  }>;
}

interface FECMapping {
  fecId: string;
  name: string;
  state: string;
  district?: string;
  office: 'H' | 'S';
  lastUpdated: string;
}

async function generateFECMappings(): Promise<void> {
  console.log('🏛️  Generating comprehensive FEC mappings from congress-legislators data...\n');

  // Read the legislators-current.yaml file
  const yamlPath = path.join(process.cwd(), 'data', 'legislators-current.yaml');

  if (!fs.existsSync(yamlPath)) {
    throw new Error(`legislators-current.yaml not found at ${yamlPath}`);
  }

  console.log(`📁 Reading congress-legislators data from: ${yamlPath}`);

  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  const legislators = yaml.load(yamlContent) as LegislatorData[];

  console.log(`📊 Found ${legislators.length} legislators in dataset`);

  // Generate mappings
  const mappings: Record<string, FECMapping> = {};
  let mappingsGenerated = 0;
  let skippedNoFEC = 0;
  let skippedInvalidFEC = 0;

  for (const legislator of legislators) {
    const bioguideId = legislator.id.bioguide;

    if (!bioguideId) {
      console.warn(`⚠️  Skipping legislator with no bioguide ID:`, legislator.name);
      continue;
    }

    // Get FEC ID (take the first one if multiple)
    const fecIds = legislator.id.fec;
    if (!fecIds || fecIds.length === 0) {
      skippedNoFEC++;
      continue;
    }

    const fecId = fecIds[0]; // Use most recent/primary FEC ID

    // Validate FEC ID format (should be like H2MI13204 or S8NY00082)
    if (!fecId || !fecId.match(/^[HSP]\d[A-Z]{2}\d{5}$/)) {
      console.warn(`⚠️  Invalid FEC ID format for ${bioguideId}: ${fecId || 'undefined'}`);
      skippedInvalidFEC++;
      continue;
    }

    // Get current term to determine office and state
    const currentTerm = legislator.terms[legislator.terms.length - 1];
    if (!currentTerm) {
      console.warn(`⚠️  No terms found for ${bioguideId}`);
      continue;
    }

    // Determine office type from most recent term
    const office = currentTerm.type === 'rep' ? 'H' : 'S';

    // Format name (LAST, FIRST format for consistency)
    const name = `${legislator.name.last.toUpperCase()}, ${legislator.name.first.toUpperCase()}`;

    const mapping: FECMapping = {
      fecId: fecId!, // We've already validated this is not undefined
      name,
      state: currentTerm.state,
      office,
      lastUpdated: new Date().toISOString().split('T')[0]!, // YYYY-MM-DD format
    };

    // Add district for House members
    if (office === 'H' && currentTerm.district) {
      mapping.district = String(currentTerm.district).padStart(2, '0'); // Ensure 2-digit format
    }

    mappings[bioguideId] = mapping;
    mappingsGenerated++;

    if (mappingsGenerated % 50 === 0) {
      console.log(`✅ Generated ${mappingsGenerated} mappings...`);
    }
  }

  console.log('\n📈 Generation Summary:');
  console.log(`✅ Mappings generated: ${mappingsGenerated}`);
  console.log(`⚠️  Skipped (no FEC ID): ${skippedNoFEC}`);
  console.log(`⚠️  Skipped (invalid FEC): ${skippedInvalidFEC}`);
  console.log(`📊 Total legislators processed: ${legislators.length}`);

  // Generate the TypeScript file content
  const today = new Date().toISOString().split('T')[0];

  const fileContent = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Bioguide ID to FEC Candidate ID mapping
// This mapping helps match Congressional representatives to their FEC campaign finance records
// Format: bioguideId -> { fecId, name, state, district?, office, lastUpdated }
//
// AUTO-GENERATED FROM congress-legislators data on ${today}
// Source: https://github.com/unitedstates/congress-legislators
// To regenerate: npm run generate-fec-mappings

export interface FECMapping {
  fecId: string;
  name: string;
  state: string;
  district?: string;
  office: 'H' | 'S'; // House or Senate
  lastUpdated: string;
}

// Complete mappings for 119th Congress (${mappingsGenerated} representatives)
export const bioguideToFECMapping: Record<string, FECMapping> = {
${Object.entries(mappings)
  .sort(([a], [b]) => a.localeCompare(b)) // Sort by bioguide ID
  .map(([bioguideId, mapping]) => {
    const districtStr = mapping.district ? `\n    district: '${mapping.district}',` : '';
    return `  '${bioguideId}': {
    fecId: '${mapping.fecId}',
    name: '${mapping.name}',
    state: '${mapping.state}',${districtStr}
    office: '${mapping.office}',
    lastUpdated: '${mapping.lastUpdated}'
  }`;
  })
  .join(',\n')}
};

// Helper function to get FEC ID from Bioguide ID
export function getFECIdFromBioguide(bioguideId: string): string | null {
  const mapping = bioguideToFECMapping[bioguideId];
  return mapping ? mapping.fecId : null;
}

// Helper function to check if a mapping exists
export function hasFECMapping(bioguideId: string): boolean {
  return bioguideId in bioguideToFECMapping;
}

// Function to add or update a mapping (for future use)
export function addFECMapping(bioguideId: string, mapping: FECMapping): void {
  bioguideToFECMapping[bioguideId] = mapping;
}

// Get mapping statistics
export function getMappingStats(): {
  totalMappings: number;
  houseMembers: number;
  senateMembers: number;
  lastUpdated: string;
} {
  const mappings = Object.values(bioguideToFECMapping);
  return {
    totalMappings: mappings.length,
    houseMembers: mappings.filter(m => m.office === 'H').length,
    senateMembers: mappings.filter(m => m.office === 'S').length,
    lastUpdated: '${today}'
  };
}
`;

  // Write the generated file
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'data', 'bioguide-fec-mapping.ts');
  fs.writeFileSync(outputPath, fileContent, 'utf8');

  console.log(`\n🎉 SUCCESS!`);
  console.log(`📄 Generated mapping file: ${outputPath}`);
  console.log(`📊 Contains ${mappingsGenerated} FEC mappings for current Congress`);

  // Highlight specific cases
  if (mappings['T000488']) {
    console.log(`\n🎯 T000488 (Shri Thanedar) mapping found:`);
    console.log(`   FEC ID: ${mappings['T000488'].fecId}`);
    console.log(`   Name: ${mappings['T000488'].name}`);
    console.log(`   State: ${mappings['T000488'].state}`);
    console.log(`   District: ${mappings['T000488'].district}`);
  }

  // Show some statistics
  const houseCount = Object.values(mappings).filter(m => m.office === 'H').length;
  const senateCount = Object.values(mappings).filter(m => m.office === 'S').length;

  console.log(`\n📈 Breakdown:`);
  console.log(`   House members: ${houseCount}`);
  console.log(`   Senate members: ${senateCount}`);
  console.log(`   Coverage: ${((mappingsGenerated / 535) * 100).toFixed(1)}% of Congress`);

  console.log(`\n🚀 Next steps:`);
  console.log(`   1. Test the campaign finance data for T000488`);
  console.log(`   2. Verify other representatives now show finance data`);
  console.log(`   3. Update this mapping after each election cycle`);
}

// Run if called directly
if (require.main === module) {
  generateFECMappings()
    .then(() => {
      console.log('\n✅ FEC mapping generation completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ FEC mapping generation failed:', error);
      process.exit(1);
    });
}

export { generateFECMappings };
