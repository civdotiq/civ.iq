#!/usr/bin/env node

/**
 * Script to update ZIP code to Congressional District mappings
 * Using official 2023 post-redistricting data from OpenSourceActivismTech
 * Source: https://github.com/OpenSourceActivismTech/us-zipcodes-congress
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// Read the CSV data
const csvData = fs.readFileSync('/tmp/zccd_official_2023.csv', 'utf8');
const lines = csvData.split('\n').filter(line => line.trim());

// Skip header and process data
const header = lines[0];
const dataLines = lines.slice(1);

console.log(`Processing ${dataLines.length} records...`);

// Group data by ZIP code
const zipMapping = {};
let totalZips = 0;
let multiDistrictZips = 0;

dataLines.forEach(line => {
  const [stateFips, stateAbbr, zcta, cd] = line.split(',');

  if (!zcta || !stateAbbr || !cd) return;

  const zip = zcta.trim();
  const state = stateAbbr.trim();
  const district = cd.trim().padStart(2, '0'); // Ensure 2-digit format
  const districtId = `${state}-${district}`;

  if (!zipMapping[zip]) {
    zipMapping[zip] = {
      state: state,
      districts: [],
      primary: null,
    };
    totalZips++;
  }

  if (!zipMapping[zip].districts.includes(districtId)) {
    zipMapping[zip].districts.push(districtId);
  }
});

// Determine primary districts and convert to our format
const finalMapping = {};

Object.keys(zipMapping).forEach(zip => {
  const data = zipMapping[zip];

  if (data.districts.length > 1) {
    multiDistrictZips++;

    // For multi-district ZIPs, we need to determine primary
    // Use the first district as primary for now (can be refined)
    const primary = data.districts[0];

    finalMapping[zip] = data.districts.map((district, index) => ({
      state: data.state,
      district: district.split('-')[1],
      primary: index === 0,
    }));
  } else {
    // Single district ZIP
    finalMapping[zip] = {
      state: data.state,
      district: data.districts[0].split('-')[1],
    };
  }
});

console.log(`Total ZIPs processed: ${totalZips}`);
console.log(`Multi-district ZIPs: ${multiDistrictZips}`);

// Generate TypeScript file content
const fileHeader = `/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Comprehensive ZIP to Congressional District mapping for 119th Congress (2023-2025)
// Source: OpenSourceActivismTech/us-zipcodes-congress
// Data URL: https://github.com/OpenSourceActivismTech/us-zipcodes-congress
// Generated: ${new Date().toISOString()}
// Total ZIP codes: ${totalZips}
// Multi-district ZIPs: ${multiDistrictZips}
// 
// DATA REFLECTS POST-2023 REDISTRICTING (119th Congress boundaries)
// Updated: July 30, 2024 (per source repository)

export interface ZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean; // For ZIPs that span multiple districts
}

// ZIP codes mapped to their congressional districts
export const ZIP_TO_DISTRICT_MAP_119TH: Record<string, ZipDistrictMapping | ZipDistrictMapping[]> =
  {`;

const fileFooter = `  };

/**
 * Get district for ZIP code
 */
export function getDistrictForZip(zipCode: string): ZipDistrictMapping | ZipDistrictMapping[] | null {
  return ZIP_TO_DISTRICT_MAP_119TH[zipCode] || null;
}

/**
 * Get primary district for ZIP code (for multi-district ZIPs)
 */
export function getPrimaryDistrictForZip(zipCode: string): ZipDistrictMapping | null {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  if (!result) return null;
  
  if (Array.isArray(result)) {
    return result.find(d => d.primary) || result[0];
  }
  
  return result;
}

/**
 * Check if ZIP spans multiple districts
 */
export function isMultiDistrictZip(zipCode: string): boolean {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  return Array.isArray(result);
}

/**
 * Get all districts for a ZIP code
 */
export function getAllDistrictsForZip(zipCode: string): ZipDistrictMapping[] {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  if (!result) return [];
  
  return Array.isArray(result) ? result : [result];
}

// Export statistics
export const ZIP_MAPPING_STATS = {
  totalZips: ${totalZips},
  multiDistrictZips: ${multiDistrictZips},
  singleDistrictZips: ${totalZips - multiDistrictZips},
  lastUpdated: '${new Date().toISOString()}',
  dataSource: 'OpenSourceActivismTech/us-zipcodes-congress',
  congressionalSession: '119th Congress (2023-2025)',
  redistrictingCycle: 'Post-2023 Redistricting'
};
`;

// Build the mapping entries
let fileContent = fileHeader + '\n';

const sortedZips = Object.keys(finalMapping).sort();
sortedZips.forEach((zip, index) => {
  const mapping = finalMapping[zip];
  const isLast = index === sortedZips.length - 1;

  if (Array.isArray(mapping)) {
    // Multi-district ZIP
    fileContent += `    '${zip}': [\n`;
    mapping.forEach((district, districtIndex) => {
      const isLastDistrict = districtIndex === mapping.length - 1;
      fileContent += `      { state: '${district.state}', district: '${district.district}'${district.primary ? ', primary: true' : ''} }${isLastDistrict ? '' : ','}\n`;
    });
    fileContent += `    ]${isLast ? '' : ','}\n`;
  } else {
    // Single district ZIP
    fileContent += `    '${zip}': { state: '${mapping.state}', district: '${mapping.district}' }${isLast ? '' : ','}\n`;
  }
});

fileContent += fileFooter;

// Write the new file
const outputPath = '/mnt/d/civic-intel-hub/src/lib/data/zip-district-mapping-119th.ts';
fs.writeFileSync(outputPath, fileContent, 'utf8');

console.log(`✅ Generated new ZIP mapping file: ${outputPath}`);
console.log(`📊 Statistics:`);
console.log(`   - Total ZIPs: ${totalZips}`);
console.log(`   - Single district: ${totalZips - multiDistrictZips}`);
console.log(`   - Multi-district: ${multiDistrictZips}`);
console.log(`   - File size: ${Math.round(fs.statSync(outputPath).size / 1024)} KB`);

// Test our known ZIP codes
const testZips = ['48221', '90210', '10001', '78701'];
console.log(`\n🧪 Testing known ZIP codes:`);

testZips.forEach(zip => {
  const result = finalMapping[zip];
  if (result) {
    if (Array.isArray(result)) {
      const primary = result.find(d => d.primary);
      console.log(`   ${zip}: Multi-district (Primary: ${primary.state}-${primary.district})`);
    } else {
      console.log(`   ${zip}: ${result.state}-${result.district}`);
    }
  } else {
    console.log(`   ${zip}: NOT FOUND ❌`);
  }
});
