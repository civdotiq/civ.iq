#!/usr/bin/env ts-node
/**
 * Automated Data Validation Script
 * Validates congressional district GeoJSON data against ground truth
 *
 * Validation Checks:
 * 1. Coordinate hemisphere (all US districts should be positive latitude)
 * 2. Bounding box validation (within continental US bounds)
 * 3. Internal point consistency (INTPTLAT/INTPTLON match geometry)
 * 4. District ID format consistency
 * 5. Required properties presence
 * 6. File size and complexity checks
 */

import * as fs from 'fs/promises';
import * as path from 'path';

interface DistrictProperties {
  STATEFP?: string;
  CD119FP?: string;
  GEOID?: string;
  NAMELSAD?: string;
  INTPTLAT?: string;
  INTPTLON?: string;
  state_name?: string;
  state_abbr?: string;
  district_num?: string;
  [key: string]: unknown;
}

interface DistrictGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: DistrictProperties;
}

interface ValidationResult {
  districtId: string;
  fileName: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    firstPointLat?: number;
    firstPointLon?: number;
    expectedLat?: number;
    expectedLon?: number;
    latDifference?: number;
    lonDifference?: number;
    fileSize?: number;
    coordinateCount?: number;
  };
}

class DistrictValidator {
  private results: ValidationResult[] = [];
  private totalDistricts = 0;
  private passedDistricts = 0;
  private failedDistricts = 0;

  // Continental US bounds (including Alaska and Hawaii)
  private readonly US_BOUNDS = {
    minLat: 18.0, // Southern tip of Hawaii
    maxLat: 72.0, // Northern Alaska
    minLon: -180.0, // Western Aleutians
    maxLon: -65.0, // Eastern Maine
  };

  // US Territories with negative latitudes (Southern Hemisphere)
  private readonly SOUTHERN_HEMISPHERE_TERRITORIES = [
    '6098', // American Samoa At-Large
    '6000', // American Samoa (alternative ID)
    'AS00', // American Samoa (state format)
  ];

  // Extended US bounds for all territories
  private readonly US_TERRITORIES_BOUNDS = {
    minLat: -15.0, // American Samoa (southernmost US territory)
    maxLat: 72.0, // Northern Alaska
    minLon: -180.0, // Western Aleutians
    maxLon: -64.0, // US Virgin Islands (easternmost US territory)
  };

  async validateAllDistricts(): Promise<void> {
    console.log('🔍 Congressional District Data Validation Tool');
    console.log('============================================\n');

    const districtDirs = ['full', 'standard', 'simple'];

    for (const detail of districtDirs) {
      console.log(`\n📂 Validating ${detail.toUpperCase()} resolution districts...`);
      await this.validateDirectory(detail);
    }

    this.generateReport();
  }

  async validateDirectory(detail: string): Promise<void> {
    const dirPath = path.join(process.cwd(), 'public', 'data', 'districts', detail);

    try {
      const files = await fs.readdir(dirPath);
      const jsonFiles = files.filter(f => f.endsWith('.json') && !f.includes('_fixed'));

      console.log(`   Found ${jsonFiles.length} district files to validate`);

      for (const file of jsonFiles) {
        await this.validateDistrictFile(path.join(dirPath, file), detail);
        this.totalDistricts++;

        if (this.totalDistricts % 50 === 0) {
          console.log(`   ⏳ Validated ${this.totalDistricts} districts...`);
        }
      }
    } catch (error) {
      console.error(`   ❌ Error reading directory ${dirPath}:`, error);
    }
  }

  async validateDistrictFile(filePath: string, detail: string): Promise<void> {
    const fileName = path.basename(filePath);
    const districtId = fileName.replace('.json', '');

    const result: ValidationResult = {
      districtId,
      fileName,
      passed: true,
      errors: [],
      warnings: [],
      metrics: {},
    };

    try {
      // Read and parse file
      const content = await fs.readFile(filePath, 'utf-8');
      const geoJSON = JSON.parse(content) as DistrictGeoJSON;

      // Get file size
      const stats = await fs.stat(filePath);
      result.metrics.fileSize = stats.size;

      // Validate structure
      this.validateStructure(geoJSON, result);

      // Validate coordinates
      this.validateCoordinates(geoJSON, result);

      // Validate properties
      this.validateProperties(geoJSON, result);

      // Validate consistency
      this.validateConsistency(geoJSON, result);

      // Check for critical errors
      if (result.errors.length > 0) {
        result.passed = false;
        this.failedDistricts++;
      } else {
        this.passedDistricts++;
      }
    } catch (error) {
      result.passed = false;
      result.errors.push(`Failed to process file: ${error}`);
      this.failedDistricts++;
    }

    this.results.push(result);
  }

  private validateStructure(geoJSON: DistrictGeoJSON, result: ValidationResult): void {
    // Check basic GeoJSON structure
    if (geoJSON.type !== 'Feature') {
      result.errors.push('Invalid GeoJSON type: must be "Feature"');
    }

    if (!geoJSON.geometry) {
      result.errors.push('Missing geometry object');
      return;
    }

    if (!['Polygon', 'MultiPolygon'].includes(geoJSON.geometry.type)) {
      result.errors.push(`Invalid geometry type: ${geoJSON.geometry.type}`);
    }

    if (!geoJSON.properties) {
      result.errors.push('Missing properties object');
    }
  }

  private validateCoordinates(geoJSON: DistrictGeoJSON, result: ValidationResult): void {
    if (!geoJSON.geometry?.coordinates) {
      result.errors.push('Missing coordinates');
      return;
    }

    // Get first coordinate point
    let firstPoint: number[] | undefined;

    if (geoJSON.geometry.type === 'Polygon') {
      const ring = geoJSON.geometry.coordinates[0];
      if (Array.isArray(ring) && ring.length > 0) {
        firstPoint = ring[0] as number[];
      }
    } else if (geoJSON.geometry.type === 'MultiPolygon') {
      const polygon = geoJSON.geometry.coordinates[0];
      if (Array.isArray(polygon) && polygon.length > 0) {
        const ring = polygon[0];
        if (Array.isArray(ring) && ring.length > 0) {
          firstPoint = ring[0] as number[];
        }
      }
    }

    if (!firstPoint || firstPoint.length < 2) {
      result.errors.push('Invalid coordinate structure');
      return;
    }

    const lon = firstPoint[0];
    const lat = firstPoint[1];

    if (typeof lon !== 'number' || typeof lat !== 'number') {
      result.errors.push('Invalid coordinate values');
      return;
    }

    result.metrics.firstPointLon = lon;
    result.metrics.firstPointLat = lat;

    // Check hemisphere - CRITICAL CHECK (with territory exception)
    const isSouthernHemisphereTerritory = this.SOUTHERN_HEMISPHERE_TERRITORIES.includes(
      result.districtId
    );

    if (lat < 0 && !isSouthernHemisphereTerritory) {
      result.errors.push(
        `❌ CRITICAL: Negative latitude ${lat.toFixed(4)}° - Wrong hemisphere! (Not an expected US territory)`
      );
    } else if (lat < 0 && isSouthernHemisphereTerritory) {
      // Expected for southern hemisphere territories like American Samoa
      result.warnings.push(
        `ℹ️ Expected negative latitude ${lat.toFixed(4)}° for southern hemisphere territory ${result.districtId}`
      );
    }

    // Check bounds (use extended bounds for all territories)
    const bounds = this.US_TERRITORIES_BOUNDS;

    if (lat < bounds.minLat || lat > bounds.maxLat) {
      result.errors.push(
        `Latitude ${lat.toFixed(4)}° outside US territories bounds [${bounds.minLat}, ${bounds.maxLat}]`
      );
    }

    if (lon < bounds.minLon || lon > bounds.maxLon) {
      result.errors.push(
        `Longitude ${lon.toFixed(4)}° outside US territories bounds [${bounds.minLon}, ${bounds.maxLon}]`
      );
    }

    // Count total coordinates for complexity check
    const countCoords = (coords: number[] | number[][] | number[][][] | number[][][][]): number => {
      if (!Array.isArray(coords)) return 0;
      if (coords.length === 0) return 0;

      // Check if this is a coordinate pair [lon, lat]
      if (typeof coords[0] === 'number') {
        return 1;
      }

      // Otherwise, recurse through nested arrays
      let total = 0;
      for (const coord of coords) {
        total += countCoords(coord as number[] | number[][] | number[][][]);
      }
      return total;
    };

    result.metrics.coordinateCount = countCoords(geoJSON.geometry.coordinates);

    // Warn if too complex
    if (result.metrics.coordinateCount > 10000) {
      result.warnings.push(
        `High coordinate count: ${result.metrics.coordinateCount} (consider simplification)`
      );
    }
  }

  private validateProperties(geoJSON: DistrictGeoJSON, result: ValidationResult): void {
    const props = geoJSON.properties;

    // Check required properties
    const requiredProps = ['GEOID', 'NAMELSAD', 'STATEFP', 'CD119FP'];

    for (const prop of requiredProps) {
      if (!props[prop]) {
        result.warnings.push(`Missing property: ${prop}`);
      }
    }

    // Validate GEOID format (should be 4 digits)
    if (props.GEOID && !/^\d{4}$/.test(props.GEOID)) {
      result.errors.push(`Invalid GEOID format: ${props.GEOID} (expected 4 digits)`);
    }

    // Extract expected coordinates from properties
    if (props.INTPTLAT && props.INTPTLON) {
      result.metrics.expectedLat = parseFloat(props.INTPTLAT);
      result.metrics.expectedLon = parseFloat(props.INTPTLON);
    }
  }

  private validateConsistency(geoJSON: DistrictGeoJSON, result: ValidationResult): void {
    // Check internal point consistency
    if (
      result.metrics.expectedLat &&
      result.metrics.expectedLon &&
      result.metrics.firstPointLat &&
      result.metrics.firstPointLon
    ) {
      const latDiff = Math.abs(result.metrics.firstPointLat - result.metrics.expectedLat);
      const lonDiff = Math.abs(result.metrics.firstPointLon - result.metrics.expectedLon);

      result.metrics.latDifference = latDiff;
      result.metrics.lonDifference = lonDiff;

      // Districts can be large, so allow up to 2 degrees difference
      // between internal point and boundary
      if (latDiff > 2.0) {
        result.warnings.push(
          `Large latitude difference from internal point: ${latDiff.toFixed(4)}°`
        );
      }

      if (lonDiff > 2.0) {
        result.warnings.push(
          `Large longitude difference from internal point: ${lonDiff.toFixed(4)}°`
        );
      }
    }

    // Check file size
    if (result.metrics.fileSize) {
      if (result.metrics.fileSize > 5000000) {
        // 5MB
        result.warnings.push(
          `Large file size: ${(result.metrics.fileSize / 1000000).toFixed(2)}MB`
        );
      }
    }
  }

  private generateReport(): void {
    console.log('\n\n════════════════════════════════════════');
    console.log('📊 VALIDATION REPORT');
    console.log('════════════════════════════════════════\n');

    console.log(`Total Districts Validated: ${this.totalDistricts}`);
    console.log(`✅ Passed: ${this.passedDistricts}`);
    console.log(`❌ Failed: ${this.failedDistricts}`);
    console.log(
      `Success Rate: ${((this.passedDistricts / this.totalDistricts) * 100).toFixed(1)}%\n`
    );

    // Show critical errors
    const criticalErrors = this.results.filter(r => r.errors.some(e => e.includes('CRITICAL')));

    if (criticalErrors.length > 0) {
      console.log('🚨 CRITICAL ERRORS FOUND:');
      console.log('─────────────────────────');
      for (const result of criticalErrors) {
        console.log(`\n❌ District ${result.districtId}:`);
        for (const error of result.errors.filter(e => e.includes('CRITICAL'))) {
          console.log(`   ${error}`);
        }
      }
    }

    // Show all failures
    const failures = this.results.filter(
      r => !r.passed && !r.errors.some(e => e.includes('CRITICAL'))
    );

    if (failures.length > 0) {
      console.log('\n⚠️ OTHER FAILURES:');
      console.log('──────────────────');
      for (const result of failures.slice(0, 10)) {
        // Show first 10
        console.log(`\n District ${result.districtId}:`);
        for (const error of result.errors) {
          console.log(`   - ${error}`);
        }
      }

      if (failures.length > 10) {
        console.log(`\n   ... and ${failures.length - 10} more`);
      }
    }

    // Summary statistics
    console.log('\n📈 METRICS SUMMARY:');
    console.log('──────────────────');

    const validResults = this.results.filter(r => r.metrics.firstPointLat !== undefined);

    if (validResults.length > 0) {
      const avgLat =
        validResults.reduce((sum, r) => sum + (r.metrics.firstPointLat || 0), 0) /
        validResults.length;
      const avgLon =
        validResults.reduce((sum, r) => sum + (r.metrics.firstPointLon || 0), 0) /
        validResults.length;

      console.log(`Average First Point: [${avgLon.toFixed(4)}, ${avgLat.toFixed(4)}]`);

      const negativeLatCount = validResults.filter(r => (r.metrics.firstPointLat || 0) < 0).length;
      console.log(`Districts with negative latitude: ${negativeLatCount}`);
    }

    // Save detailed report
    this.saveDetailedReport();
  }

  private async saveDetailedReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'validation-report.json');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.totalDistricts,
        passed: this.passedDistricts,
        failed: this.failedDistricts,
        successRate: (this.passedDistricts / this.totalDistricts) * 100,
      },
      results: this.results,
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const validator = new DistrictValidator();

  try {
    await validator.validateAllDistricts();
    console.log('\n✅ Validation complete!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
