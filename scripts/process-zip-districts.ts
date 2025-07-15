#!/usr/bin/env tsx

/*
 * CIV.IQ - Civic Information Hub
 * Phase 2: Data Processing Pipeline
 * 
 * This script processes the OpenSourceActivismTech ZIP code to Congressional District
 * CSV data and generates a comprehensive TypeScript mapping file for the 119th Congress.
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface CSVRow {
  state_fips: string;
  state_abbr: string;
  zip: string;
  cd: string;
}

interface ZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean; // For ZIPs that span multiple districts
}

interface ProcessingReport {
  inputFile: string;
  totalRows: number;
  validRows: number;
  skippedRows: number;
  uniqueZips: number;
  multiDistrictZips: number;
  atLargeDistricts: string[];
  stateBreakdown: Record<string, number>;
  errors: string[];
  processingTime: number;
}

class ZipDistrictProcessor {
  private report: ProcessingReport;
  private zipMappings: Record<string, ZipDistrictMapping[]> = {};
  private stateBreakdown: Record<string, number> = {};
  private errors: string[] = [];

  constructor(inputFile: string) {
    this.report = {
      inputFile,
      totalRows: 0,
      validRows: 0,
      skippedRows: 0,
      uniqueZips: 0,
      multiDistrictZips: 0,
      atLargeDistricts: [],
      stateBreakdown: {},
      errors: [],
      processingTime: 0
    };
  }

  /**
   * Process CSV data and generate TypeScript mapping
   */
  async processCSV(): Promise<ProcessingReport> {
    const startTime = Date.now();

    try {
      console.log(`🚀 Starting Phase 2: Data Processing Pipeline`);
      console.log(`📁 Input file: ${this.report.inputFile}`);

      // Read and parse CSV file
      const csvContent = fs.readFileSync(this.report.inputFile, 'utf-8');
      const parseResult = Papa.parse<CSVRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transform: (value: string) => value.trim()
      });

      if (parseResult.errors.length > 0) {
        this.errors.push(...parseResult.errors.map(e => `Parse error: ${e.message}`));
      }

      console.log(`📊 Parsed ${parseResult.data.length} rows`);
      this.report.totalRows = parseResult.data.length;

      // Process each row
      for (const row of parseResult.data) {
        this.processRow(row);
      }

      // Generate primary district assignments for multi-district ZIPs
      this.assignPrimaryDistricts();

      // Generate statistics
      this.generateStatistics();

      // Generate TypeScript file
      await this.generateTypeScriptFile();

      this.report.processingTime = Date.now() - startTime;
      console.log(`✅ Processing complete in ${this.report.processingTime}ms`);

      return this.report;

    } catch (error) {
      this.errors.push(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Process a single CSV row
   */
  private processRow(row: CSVRow): void {
    // Validate required fields
    if (!row.state_fips || !row.state_abbr || !row.zip || !row.cd) {
      this.errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
      this.report.skippedRows++;
      return;
    }

    // Validate ZIP code format
    if (!/^\d{5}$/.test(row.zip)) {
      this.errors.push(`Invalid ZIP code format: ${row.zip}`);
      this.report.skippedRows++;
      return;
    }

    // Validate and normalize district
    const normalizedDistrict = this.normalizeDistrict(row.cd);
    if (!normalizedDistrict) {
      this.errors.push(`Invalid district format: ${row.cd}`);
      this.report.skippedRows++;
      return;
    }

    // Create mapping entry
    const mapping: ZipDistrictMapping = {
      state: row.state_abbr,
      district: normalizedDistrict
    };

    // Track ZIP mappings
    if (!this.zipMappings[row.zip]) {
      this.zipMappings[row.zip] = [];
    }
    this.zipMappings[row.zip].push(mapping);

    // Track state breakdown
    this.stateBreakdown[row.state_abbr] = (this.stateBreakdown[row.state_abbr] || 0) + 1;

    // Track at-large districts
    if (normalizedDistrict === '00' && !this.report.atLargeDistricts.includes(row.state_abbr)) {
      this.report.atLargeDistricts.push(row.state_abbr);
    }

    this.report.validRows++;
  }

  /**
   * Normalize district codes (98 → 00 for at-large)
   */
  private normalizeDistrict(district: string): string | null {
    // Remove any non-digit characters and pad with zeros
    const cleanDistrict = district.replace(/\D/g, '');
    
    if (!/^\d+$/.test(cleanDistrict)) {
      return null;
    }

    const districtNum = parseInt(cleanDistrict, 10);
    
    // Handle at-large districts (98 → 00, or already 0)
    if (districtNum === 98 || districtNum === 0) {
      return '00';
    }

    // Validate district range (1-99)
    if (districtNum < 1 || districtNum > 99) {
      return null;
    }

    // Pad with leading zero if needed
    return districtNum.toString().padStart(2, '0');
  }

  /**
   * Assign primary districts for multi-district ZIPs
   */
  private assignPrimaryDistricts(): void {
    for (const [zip, mappings] of Object.entries(this.zipMappings)) {
      if (mappings.length > 1) {
        // Sort by state, then by district number
        mappings.sort((a, b) => {
          if (a.state !== b.state) {
            return a.state.localeCompare(b.state);
          }
          return a.district.localeCompare(b.district);
        });
        
        // Mark the first one as primary
        mappings[0].primary = true;
        this.report.multiDistrictZips++;
      }
    }
  }

  /**
   * Generate processing statistics
   */
  private generateStatistics(): void {
    this.report.uniqueZips = Object.keys(this.zipMappings).length;
    this.report.stateBreakdown = this.stateBreakdown;
    this.report.errors = this.errors;
    
    // Sort at-large districts
    this.report.atLargeDistricts.sort();
  }

  /**
   * Generate TypeScript mapping file
   */
  private async generateTypeScriptFile(): Promise<void> {
    const outputPath = path.join(process.cwd(), 'src', 'lib', 'data', 'zip-district-mapping-119th.ts');
    const outputDir = path.dirname(outputPath);

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`📝 Generating TypeScript file: ${outputPath}`);

    // Generate file content
    const content = this.generateFileContent();

    // Write file
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`✅ TypeScript file generated: ${this.report.uniqueZips} ZIP codes`);
  }

  /**
   * Generate the content for the TypeScript file
   */
  private generateFileContent(): string {
    const timestamp = new Date().toISOString();
    const sortedZips = Object.keys(this.zipMappings).sort();

    let content = `/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
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