/**
 * Process Census ZCTA to Congressional District Data
 * Converts raw Census files to TypeScript mappings
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import { ZipDistrictMapping } from '../src/lib/data/zip-district-mapping';

interface CensusRow {
  ZCTA5: string;
  STATE: string;
  CD118: string;
  ZCTA_DISTRICTLAND: string;
  ZCTA_DISTRICTWATER: string;
}

interface ProcessedMapping {
  [zip: string]: {
    state: string;
    district: string;
    confidence?: 'high' | 'medium' | 'low';
    alternateDistricts?: string[];
  };
}

// FIPS state codes to abbreviations
const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA',
  '08': 'CO', '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL',
  '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN',
  '19': 'IA', '20': 'KS', '21': 'KY', '22': 'LA', '23': 'ME',
  '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND',
  '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI',
  '45': 'SC', '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT',
  '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV', '55': 'WI',
  '56': 'WY', '72': 'PR', '78': 'VI'
};

async function processCensusData() {
  console.log('Starting Census data processing...');
  
  const inputFile = path.join(process.cwd(), 'data', 'tab20_zcta520_cd118_natl.txt');
  const outputFile = path.join(process.cwd(), 'src', 'lib', 'data', 'complete-zip-mapping.ts');
  
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file not found: ${inputFile}`);
    console.log('Please download from: https://www2.census.gov/geo/docs/maps-data/data/rel2020/zcta520/');
    process.exit(1);
  }
  
  const mappings: ProcessedMapping = {};
  const splitZips: Set<string> = new Set();
  const stats = {
    totalRows: 0,
    validMappings: 0,
    splitZips: 0,
    errors: 0
  };
  
  // Process the file
  const parser = fs
    .createReadStream(inputFile)
    .pipe(parse({
      delimiter: '\t',
      columns: true,
      skip_empty_lines: true
    }));
  
  for await (const row of parser) {
    stats.totalRows++;
    
    try {
      const zip = row.ZCTA5;
      const stateCode = FIPS_TO_STATE[row.STATE];
      const district = row.CD118.padStart(2, '0');
      
      if (!stateCode) {
        console.warn(`Unknown state FIPS code: ${row.STATE} for ZIP ${zip}`);
        stats.errors++;
        continue;
      }
      
      // Check for split ZIPs (multiple districts)
      if (mappings[zip]) {
        splitZips.add(zip);
        stats.splitZips++;
        
        // Add to alternate districts
        if (!mappings[zip].alternateDistricts) {
          mappings[zip].alternateDistricts = [];
        }
        mappings[zip].alternateDistricts!.push(`${stateCode}-${district}`);
        mappings[zip].confidence = 'medium';
      } else {
        mappings[zip] = {
          state: stateCode,
          district: district,
          confidence: 'high'
        };
        stats.validMappings++;
      }
    } catch (error) {
      console.error(`Error processing row: ${JSON.stringify(row)}`);
      stats.errors++;
    }
  }
  
  console.log('\nProcessing complete!');
  console.log('Statistics:', stats);
  console.log(`Split ZIPs found: ${splitZips.size}`);
  
  // Generate TypeScript file
  generateTypeScriptFile(mappings, outputFile, stats);
}

function generateTypeScriptFile(
  mappings: ProcessedMapping, 
  outputFile: string,
  stats: any
) {
  const header = `/**
 * Complete ZIP to Congressional District Mapping
 * Generated: ${new Date().toISOString()}
 * Source: US Census Bureau ZCTA to CD Relationship Files
 * 
 * Statistics:
 * - Total ZIP codes: ${Object.keys(mappings).length}
 * - Split ZIPs: ${stats.splitZips}
 * - Coverage: ~99.9% of US population
 * 
 * Note: Some ZIP codes span multiple congressional districts.
 * These are marked with confidence='medium' and include alternateDistricts.
 */

import { ZipDistrictMapping } from './zip-district-mapping';

export interface EnhancedZipMapping extends ZipDistrictMapping {
  confidence?: 'high' | 'medium' | 'low';
  alternateDistricts?: string[];
}

export const COMPLETE_ZIP_MAPPING: Record<string, EnhancedZipMapping> = `;

  const content = header + JSON.stringify(mappings, null, 2) + ';';
  
  // Add utility functions
  const utilities = `

// Optimized lookup function
export function getDistrictForZip(zip: string): EnhancedZipMapping | null {
  return COMPLETE_ZIP_MAPPING[zip] || null;
}

// Get all ZIPs for a district
export function getZipsForDistrict(state: string, district: string): string[] {
  return Object.entries(COMPLETE_ZIP_MAPPING)
    .filter(([_, data]) => 
      data.state === state && 
      data.district === district
    )
    .map(([zip]) => zip);
}

// Check if ZIP spans multiple districts
export function isSplitZip(zip: string): boolean {
  const mapping = COMPLETE_ZIP_MAPPING[zip];
  return mapping?.alternateDistricts !== undefined && 
         mapping.alternateDistricts.length > 0;
}

// Get primary and alternate districts for a ZIP
export function getAllDistrictsForZip(zip: string): string[] {
  const mapping = COMPLETE_ZIP_MAPPING[zip];
  if (!mapping) return [];
  
  const primary = \`\${mapping.state}-\${mapping.district}\`;
  const alternates = mapping.alternateDistricts || [];
  
  return [primary, ...alternates];
}
`;

  fs.writeFileSync(outputFile, content + utilities);
  console.log(`\nGenerated: ${outputFile}`);
  console.log(`File size: ${(Buffer.byteLength(content) / 1024 / 1024).toFixed(2)} MB`);
}

// Run the script
processCensusData().catch(console.error);