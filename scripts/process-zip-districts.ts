#!/usr/bin/env tsx

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Comprehensive ZIP to Congressional District mapping for 119th Congress (2025-2027)
// Source: OpenSourceActivismTech/us-zipcodes-congress
// Generated: ${timestamp}
// Total ZIP codes: ${this.report.uniqueZips.toLocaleString()}
// Multi-district ZIPs: ${this.report.multiDistrictZips.toLocaleString()}

export interface ZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean; // For ZIPs that span multiple districts
}

// ZIP codes mapped to their congressional districts
export const ZIP_TO_DISTRICT_MAP_119TH: Record<string, ZipDistrictMapping | ZipDistrictMapping[]> = {
`;

    // Generate mappings
    for (const zip of sortedZips) {
      const mappings = this.zipMappings[zip];
      
      if (mappings.length === 1) {
        // Single district ZIP
        const mapping = mappings[0];
        content += `  '${zip}': { state: '${mapping.state}', district: '${mapping.district}' },\n`;
      } else {
        // Multi-district ZIP
        content += `  '${zip}': [\n`;
        for (const mapping of mappings) {
          const primaryFlag = mapping.primary ? ', primary: true' : '';
          content += `    { state: '${mapping.state}', district: '${mapping.district}'${primaryFlag} },\n`;
        }
        content += `  ],\n`;
      }
    }

    content += `};\n\n`;

    // Add utility functions
    content += `/**
 * Get congressional district for a ZIP code
 */
export function getDistrictForZip(zip: string): ZipDistrictMapping | ZipDistrictMapping[] | null {
  return ZIP_TO_DISTRICT_MAP_119TH[zip] || null;
}

/**
 * Get primary district for a ZIP code (useful for multi-district ZIPs)
 */
export function getPrimaryDistrictForZip(zip: string): ZipDistrictMapping | null {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zip];
  
  if (!result) return null;
  
  if (Array.isArray(result)) {
    return result.find(mapping => mapping.primary) || result[0];
  }
  
  return result;
}

/**
 * Check if a ZIP code spans multiple districts
 */
export function isMultiDistrictZip(zip: string): boolean {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zip];
  return Array.isArray(result) && result.length > 1;
}

/**
 * Get all districts for a ZIP code
 */
export function getAllDistrictsForZip(zip: string): ZipDistrictMapping[] {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zip];
  
  if (!result) return [];
  
  return Array.isArray(result) ? result : [result];
}

// Statistics
export const ZIP_MAPPING_STATS = {
  totalZips: ${this.report.uniqueZips},
  multiDistrictZips: ${this.report.multiDistrictZips},
  atLargeDistricts: ${JSON.stringify(this.report.atLargeDistricts)},
  generatedAt: '${timestamp}',
  dataSource: 'OpenSourceActivismTech/us-zipcodes-congress',
  congress: '119th'
};
`;

    return content;
  }

  /**
   * Print processing report
   */
  printReport(): void {
    console.log('\n📋 PHASE 2 PROCESSING REPORT');
    console.log('='.repeat(60));
    console.log(`📁 Input file: ${this.report.inputFile}`);
    console.log(`⏱️  Processing time: ${this.report.processingTime}ms`);
    console.log(`📊 Total rows: ${this.report.totalRows.toLocaleString()}`);
    console.log(`✅ Valid rows: ${this.report.validRows.toLocaleString()}`);
    console.log(`❌ Skipped rows: ${this.report.skippedRows.toLocaleString()}`);
    console.log(`🎯 Unique ZIP codes: ${this.report.uniqueZips.toLocaleString()}`);
    console.log(`🗺️ Multi-district ZIPs: ${this.report.multiDistrictZips.toLocaleString()}`);
    console.log(`🏛️ At-large districts: ${this.report.atLargeDistricts.join(', ')}`);
    
    if (this.report.errors.length > 0) {
      console.log(`\n⚠️  ERRORS (${this.report.errors.length}):`);
      this.report.errors.slice(0, 10).forEach(error => console.log(`  - ${error}`));
      if (this.report.errors.length > 10) {
        console.log(`  ... and ${this.report.errors.length - 10} more errors`);
      }
    }
    
    console.log(`\n📈 TOP 10 STATES BY ZIP COVERAGE:`);
    const sortedStates = Object.entries(this.report.stateBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    sortedStates.forEach(([state, count]) => {
      console.log(`  ${state}: ${count.toLocaleString()}`);
    });
    
    console.log('='.repeat(60));
  }
}

async function main() {
  try {
    const dataDir = path.join(process.cwd(), 'data-sources', 'us-zipcodes-congress');
    const inputFile = path.join(dataDir, 'zccd_hud.csv'); // Use HUD file for better coverage

    if (!fs.existsSync(inputFile)) {
      console.error(`❌ Input file not found: ${inputFile}`);
      console.error('Please ensure Phase 1 data validation has been completed.');
      process.exit(1);
    }

    const processor = new ZipDistrictProcessor(inputFile);
    const report = await processor.processCSV();
    
    processor.printReport();

    console.log('\n✅ Phase 2 Complete: Data Processing Pipeline');
    console.log('📋 Summary:');
    console.log(`  - ${report.uniqueZips.toLocaleString()} ZIP codes processed`);
    console.log(`  - ${report.multiDistrictZips.toLocaleString()} multi-district ZIPs handled`);
    console.log(`  - TypeScript mapping file generated`);
    console.log(`  - Ready for Phase 3: Integration with Existing System`);

  } catch (error) {
    console.error('❌ Phase 2 failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { ZipDistrictProcessor };