/**
 * Validate ZIP to District Mappings
 * Ensures data quality and identifies issues
 */

import { COMPLETE_ZIP_MAPPING, getDistrictForZip } from '../src/lib/data/complete-zip-mapping';
import { getAllEnhancedRepresentatives } from '../src/lib/congress-legislators';
import { ZIP_TO_DISTRICT_MAP } from '../src/lib/data/zip-district-mapping';

interface ValidationReport {
  totalZips: number;
  validDistricts: number;
  invalidDistricts: string[];
  matchesWithExisting: number;
  conflicts: Array<{
    zip: string;
    existing: any;
    new: any;
  }>;
  splitZips: string[];
  missingRepresentatives: string[];
  statesCovered: string[];
}

async function validateMappings(): Promise<ValidationReport> {
  console.log('Starting validation...\n');
  
  const report: ValidationReport = {
    totalZips: 0,
    validDistricts: 0,
    invalidDistricts: [],
    matchesWithExisting: 0,
    conflicts: [],
    splitZips: [],
    missingRepresentatives: [],
    statesCovered: []
  };
  
  // Get all representatives
  const representatives = await getAllEnhancedRepresentatives();
  const validDistricts = new Set(
    representatives
      .filter(r => r.chamber === 'House')
      .map(r => `${r.state}-${r.district}`)
  );
  
  // Track states
  const states = new Set<string>();
  
  // Validate each mapping
  for (const [zip, mapping] of Object.entries(COMPLETE_ZIP_MAPPING)) {
    report.totalZips++;
    states.add(mapping.state);
    
    const districtKey = `${mapping.state}-${mapping.district}`;
    
    // Check if district has a representative
    if (validDistricts.has(districtKey)) {
      report.validDistricts++;
    } else {
      report.invalidDistricts.push(districtKey);
      report.missingRepresentatives.push(`${zip} -> ${districtKey}`);
    }
    
    // Check for split ZIPs
    if (mapping.alternateDistricts && mapping.alternateDistricts.length > 0) {
      report.splitZips.push(zip);
    }
    
    // Compare with existing mappings
    if (ZIP_TO_DISTRICT_MAP[zip]) {
      const existing = ZIP_TO_DISTRICT_MAP[zip];
      if (existing.state === mapping.state && existing.district === mapping.district) {
        report.matchesWithExisting++;
      } else {
        report.conflicts.push({
          zip,
          existing,
          new: mapping
        });
      }
    }
  }
  
  report.statesCovered = Array.from(states).sort();
  
  // Print report
  console.log('=== VALIDATION REPORT ===\n');
  console.log(`Total ZIP codes processed: ${report.totalZips.toLocaleString()}`);
  console.log(`Valid districts: ${report.validDistricts.toLocaleString()} (${(report.validDistricts / report.totalZips * 100).toFixed(2)}%)`);
  console.log(`States covered: ${report.statesCovered.length} states`);
  console.log(`Split ZIPs: ${report.splitZips.length}`);
  console.log(`Matches with existing: ${report.matchesWithExisting}`);
  console.log(`Conflicts: ${report.conflicts.length}`);
  
  if (report.invalidDistricts.length > 0) {
    console.log('\n⚠️  Invalid districts found:');
    const uniqueInvalid = Array.from(new Set(report.invalidDistricts));
    console.log(uniqueInvalid.slice(0, 10).join(', '));
    if (uniqueInvalid.length > 10) {
      console.log(`... and ${uniqueInvalid.length - 10} more`);
    }
  }
  
  if (report.conflicts.length > 0) {
    console.log('\n⚠️  Conflicts with existing mappings:');
    report.conflicts.slice(0, 5).forEach(conflict => {
      console.log(`  ZIP ${conflict.zip}:`);
      console.log(`    Existing: ${conflict.existing.state}-${conflict.existing.district}`);
      console.log(`    New:      ${conflict.new.state}-${conflict.new.district}`);
    });
    if (report.conflicts.length > 5) {
      console.log(`  ... and ${report.conflicts.length - 5} more conflicts`);
    }
  }
  
  // Test random lookups
  console.log('\n=== TESTING RANDOM LOOKUPS ===');
  const testZips = ['10001', '90210', '60601', '77001', '33101', '29650'];
  
  for (const zip of testZips) {
    const result = getDistrictForZip(zip);
    if (result) {
      console.log(`✓ ${zip}: ${result.state}-${result.district}`);
    } else {
      console.log(`✗ ${zip}: NOT FOUND`);
    }
  }
  
  // Save detailed report
  const detailedReport = JSON.stringify(report, null, 2);
  await fs.promises.writeFile('validation-report.json', detailedReport);
  console.log('\n📄 Detailed report saved to validation-report.json');
  
  return report;
}

// Run validation
validateMappings()
  .then(report => {
    const successRate = (report.validDistricts / report.totalZips * 100).toFixed(2);
    console.log(`\n✅ Validation complete! Success rate: ${successRate}%`);
    
    if (parseFloat(successRate) < 99) {
      console.log('⚠️  Success rate below 99% - review validation report');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });