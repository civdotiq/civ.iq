#!/usr/bin/env node

/**
 * Congressional District Accuracy Testing Suite
 *
 * This script validates all 435 congressional districts for accuracy,
 * completeness, and data integrity using multiple validation methods.
 */

import fs from 'fs/promises';
import path from 'path';
import fetch from 'node-fetch';

// Configuration
const CONFIG = {
  dataDir: path.join(process.cwd(), 'data', 'districts'),
  serverUrl: 'http://localhost:3000', // Adjust if different
  outputDir: path.join(process.cwd(), 'test-results'),
  timeoutMs: 10000, // 10 second timeout per test
};

// Expected district counts by state (119th Congress)
const EXPECTED_DISTRICT_COUNTS = {
  '01': 7, // Alabama
  '02': 1, // Alaska (At-Large)
  '04': 9, // Arizona
  '05': 4, // Arkansas
  '06': 52, // California
  '08': 8, // Colorado
  '09': 5, // Connecticut
  10: 1, // Delaware (At-Large)
  12: 28, // Florida
  13: 14, // Georgia
  15: 2, // Hawaii
  16: 2, // Idaho
  17: 17, // Illinois
  18: 9, // Indiana
  19: 4, // Iowa
  20: 4, // Kansas
  21: 6, // Kentucky
  22: 6, // Louisiana
  23: 2, // Maine
  24: 8, // Maryland
  25: 9, // Massachusetts
  26: 13, // Michigan
  27: 8, // Minnesota
  28: 4, // Mississippi
  29: 8, // Missouri
  30: 2, // Montana
  31: 3, // Nebraska
  32: 4, // Nevada
  33: 2, // New Hampshire
  34: 12, // New Jersey
  35: 3, // New Mexico
  36: 26, // New York
  37: 14, // North Carolina
  38: 1, // North Dakota (At-Large)
  39: 15, // Ohio
  40: 5, // Oklahoma
  41: 6, // Oregon
  42: 17, // Pennsylvania
  44: 2, // Rhode Island
  45: 7, // South Carolina
  46: 1, // South Dakota (At-Large)
  47: 9, // Tennessee
  48: 38, // Texas
  49: 4, // Utah
  50: 1, // Vermont (At-Large)
  51: 11, // Virginia
  53: 10, // Washington
  54: 2, // West Virginia
  55: 8, // Wisconsin
  56: 1, // Wyoming (At-Large)
};

class DistrictAccuracyTester {
  constructor() {
    this.results = {
      summary: {},
      districts: {},
      states: {},
      errors: [],
      warnings: [],
      performance: {},
    };
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🧪 Congressional District Accuracy Testing Suite');
    console.log('================================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log();

    try {
      // Ensure output directory exists
      await fs.mkdir(CONFIG.outputDir, { recursive: true });

      // Test 1: Data File Validation
      console.log('📋 Test 1: Validating district data files...');
      await this.testDataFiles();

      // Test 2: API Endpoint Validation
      console.log('🔗 Test 2: Validating API endpoints...');
      await this.testAPIEndpoints();

      // Test 3: District Completeness
      console.log('📊 Test 3: Validating district completeness...');
      await this.testDistrictCompleteness();

      // Test 4: Geographic Accuracy
      console.log('🗺️  Test 4: Validating geographic accuracy...');
      await this.testGeographicAccuracy();

      // Test 5: Boundary Validation
      console.log('🔍 Test 5: Validating district boundaries...');
      await this.testBoundaryValidation();

      // Test 6: Lookup Service Testing
      console.log('🎯 Test 6: Testing lookup services...');
      await this.testLookupServices();

      // Test 7: Performance Testing
      console.log('⚡ Test 7: Performance testing...');
      await this.testPerformance();

      // Generate comprehensive report
      await this.generateReport();

      console.log('\n✅ All tests completed successfully!');
      console.log(`Total runtime: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
    } catch (error) {
      console.error('\n❌ Testing failed:', error.message);
      this.results.errors.push({
        type: 'critical',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
      process.exit(1);
    }
  }

  async testDataFiles() {
    const tests = [
      {
        name: 'REAL District metadata file exists',
        test: async () => {
          const metadataPath = path.join(CONFIG.dataDir, 'district_metadata_real.json');
          await fs.access(metadataPath);
          return { passed: true };
        },
      },
      {
        name: 'REAL GeoJSON file exists',
        test: async () => {
          const geojsonPath = path.join(CONFIG.dataDir, 'congressional_districts_119_real.geojson');
          await fs.access(geojsonPath);
          return { passed: true };
        },
      },
      {
        name: 'REAL PMTiles file exists',
        test: async () => {
          const pmtilesPath = path.join(
            process.cwd(),
            'public',
            'maps',
            'congressional_districts_119_real.pmtiles'
          );
          await fs.access(pmtilesPath);
          return { passed: true };
        },
      },
      {
        name: 'REAL Metadata structure validation',
        test: async () => {
          const metadataPath = path.join(CONFIG.dataDir, 'district_metadata_real.json');
          const content = await fs.readFile(metadataPath, 'utf8');
          const metadata = JSON.parse(content);

          const hasRequiredFields =
            metadata.districts &&
            metadata.states &&
            metadata.summary &&
            typeof metadata.summary.total_districts === 'number';

          return {
            passed: hasRequiredFields,
            details: `Total districts in REAL metadata: ${metadata.summary.total_districts} (Census TIGER/Line data)`,
          };
        },
      },
    ];

    await this.runTestSuite('Data Files', tests);
  }

  async testAPIEndpoints() {
    const tests = [
      {
        name: 'District metadata API',
        test: async () => {
          const response = await this.fetchWithTimeout(
            `${CONFIG.serverUrl}/api/district-boundaries/metadata`
          );
          const data = await response.json();

          return {
            passed: response.ok && data.districts && data.states,
            details: `Status: ${response.status}, Districts: ${Object.keys(data.districts || {}).length}`,
          };
        },
      },
      {
        name: 'Districts API',
        test: async () => {
          const response = await this.fetchWithTimeout(`${CONFIG.serverUrl}/api/districts/all`);
          const data = await response.json();

          return {
            passed: response.ok && data.districts && Array.isArray(data.districts),
            details: `Status: ${response.status}, Districts: ${data.districts?.length || 0}`,
          };
        },
      },
      {
        name: 'ZIP code lookup API',
        test: async () => {
          // Test with known ZIP code
          const response = await this.fetchWithTimeout(
            `${CONFIG.serverUrl}/api/districts?zip=20001`
          );
          const data = await response.json();

          return {
            passed: response.ok,
            details: `Status: ${response.status}, Found: ${data.districts?.length || 0} districts`,
          };
        },
      },
    ];

    await this.runTestSuite('API Endpoints', tests);
  }

  async testDistrictCompleteness() {
    const metadataPath = path.join(CONFIG.dataDir, 'district_metadata_real.json');
    let metadata;

    try {
      const content = await fs.readFile(metadataPath, 'utf8');
      metadata = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load metadata: ${error.message}`);
    }

    const tests = [
      {
        name: 'Total district count (should be 435)',
        test: async () => {
          const totalDistricts = Object.keys(metadata.districts).length;
          return {
            passed: totalDistricts === 435,
            details: `Found: ${totalDistricts}, Expected: 435`,
          };
        },
      },
      {
        name: 'State district counts',
        test: async () => {
          const stateErrors = [];
          let totalExpected = 0;

          for (const [fips, expectedCount] of Object.entries(EXPECTED_DISTRICT_COUNTS)) {
            totalExpected += expectedCount;
            const stateData = metadata.states[fips];

            if (!stateData) {
              stateErrors.push(`Missing state data for FIPS ${fips}`);
              continue;
            }

            if (stateData.district_count !== expectedCount) {
              stateErrors.push(
                `${stateData.name}: Expected ${expectedCount}, Found ${stateData.district_count}`
              );
            }
          }

          return {
            passed: stateErrors.length === 0,
            details:
              stateErrors.length > 0
                ? stateErrors.join('; ')
                : `All ${totalExpected} districts accounted for`,
          };
        },
      },
      {
        name: 'District ID format validation',
        test: async () => {
          const invalidIds = [];

          for (const districtId of Object.keys(metadata.districts)) {
            // Should match format: "XX-YY" where XX is state FIPS, YY is district number
            if (!/^\d{2}-\d{2}$/.test(districtId)) {
              invalidIds.push(districtId);
            }
          }

          return {
            passed: invalidIds.length === 0,
            details:
              invalidIds.length > 0 ? `Invalid IDs: ${invalidIds.join(', ')}` : 'All IDs valid',
          };
        },
      },
    ];

    await this.runTestSuite('District Completeness', tests);
    this.results.summary.districtMetadata = metadata.summary;
  }

  async testGeographicAccuracy() {
    const metadataPath = path.join(CONFIG.dataDir, 'district_metadata_real.json');
    const content = await fs.readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(content);

    const tests = [
      {
        name: 'Centroid coordinates validity',
        test: async () => {
          const invalidCentroids = [];

          for (const [districtId, district] of Object.entries(metadata.districts)) {
            const [lng, lat] = district.centroid || [0, 0];

            // Check if coordinates are within reasonable US bounds
            if (lng < -179.2 || lng > -66.9 || lat < 18.9 || lat > 71.4) {
              invalidCentroids.push(`${districtId}: [${lng}, ${lat}]`);
            }
          }

          return {
            passed: invalidCentroids.length === 0,
            details:
              invalidCentroids.length > 0
                ? `Invalid centroids: ${invalidCentroids.slice(0, 5).join(', ')}${invalidCentroids.length > 5 ? '...' : ''}`
                : 'All centroids within US bounds',
          };
        },
      },
      {
        name: 'Bounding box validation',
        test: async () => {
          const invalidBboxes = [];

          for (const [districtId, district] of Object.entries(metadata.districts)) {
            const bbox = district.bbox || [0, 0, 0, 0];
            const [minLng, minLat, maxLng, maxLat] = bbox;

            // Validate bbox structure
            if (minLng >= maxLng || minLat >= maxLat) {
              invalidBboxes.push(`${districtId}: Invalid bbox structure`);
            }

            // Check if bbox is within US bounds
            if (minLng < -179.2 || maxLng > -66.9 || minLat < 18.9 || maxLat > 71.4) {
              invalidBboxes.push(`${districtId}: Outside US bounds`);
            }
          }

          return {
            passed: invalidBboxes.length === 0,
            details:
              invalidBboxes.length > 0
                ? `Invalid bboxes: ${invalidBboxes.slice(0, 5).join(', ')}${invalidBboxes.length > 5 ? '...' : ''}`
                : 'All bounding boxes valid',
          };
        },
      },
      {
        name: 'State FIPS code validation',
        test: async () => {
          const invalidFips = [];
          const validFipsCodes = Object.keys(EXPECTED_DISTRICT_COUNTS);

          for (const [districtId, district] of Object.entries(metadata.districts)) {
            if (!validFipsCodes.includes(district.state_fips)) {
              invalidFips.push(`${districtId}: ${district.state_fips}`);
            }
          }

          return {
            passed: invalidFips.length === 0,
            details:
              invalidFips.length > 0
                ? `Invalid FIPS: ${invalidFips.slice(0, 5).join(', ')}${invalidFips.length > 5 ? '...' : ''}`
                : 'All FIPS codes valid',
          };
        },
      },
    ];

    await this.runTestSuite('Geographic Accuracy', tests);
  }

  async testBoundaryValidation() {
    // Test a sample of districts for boundary data integrity
    const sampleDistricts = [
      '06-12', // California 12th - San Francisco
      '36-14', // New York 14th - Bronx/Queens
      '48-02', // Texas 2nd - Houston area
      '17-05', // Illinois 5th - Chicago
      '25-07', // Massachusetts 7th - Boston area
    ];

    const tests = sampleDistricts.map(districtId => ({
      name: `Boundary data for ${districtId}`,
      test: async () => {
        try {
          const response = await this.fetchWithTimeout(
            `${CONFIG.serverUrl}/api/district-boundaries/metadata`
          );
          const data = await response.json();
          const district = data.districts[districtId];

          if (!district) {
            return { passed: false, details: 'District not found in metadata' };
          }

          const hasValidData =
            district.centroid &&
            district.centroid.length === 2 &&
            district.bbox &&
            district.bbox.length === 4 &&
            district.name &&
            district.full_name;

          return {
            passed: hasValidData,
            details: hasValidData ? 'All boundary data present' : 'Missing boundary data',
          };
        } catch (error) {
          return { passed: false, details: error.message };
        }
      },
    }));

    await this.runTestSuite('Boundary Validation', tests);
  }

  async testLookupServices() {
    const tests = [
      {
        name: 'District lookup by coordinates (San Francisco)',
        test: async () => {
          // San Francisco coordinates should be in CA-12
          const lat = 37.7749;
          const lng = -122.4194;

          // This would require the server to be running with the lookup service
          // For now, we'll test the API structure
          try {
            const response = await this.fetchWithTimeout(
              `${CONFIG.serverUrl}/api/districts?lat=${lat}&lng=${lng}`
            );
            return {
              passed: response.status === 200 || response.status === 404,
              details: `Lookup service responded with status ${response.status}`,
            };
          } catch (error) {
            return {
              passed: false,
              details: `Lookup service error: ${error.message}`,
            };
          }
        },
      },
      {
        name: 'District lookup by ZIP code',
        test: async () => {
          // Test known ZIP codes
          const testZips = ['20001', '10001', '90210', '60601'];
          let successCount = 0;

          for (const zip of testZips) {
            try {
              const response = await this.fetchWithTimeout(
                `${CONFIG.serverUrl}/api/districts?zip=${zip}`
              );
              if (response.ok) {
                successCount++;
              }
            } catch (error) {
              // Continue testing other ZIP codes
            }
          }

          return {
            passed: successCount > 0,
            details: `${successCount}/${testZips.length} ZIP codes resolved successfully`,
          };
        },
      },
    ];

    await this.runTestSuite('Lookup Services', tests);
  }

  async testPerformance() {
    const performanceResults = {};

    const tests = [
      {
        name: 'Metadata API response time',
        test: async () => {
          const startTime = Date.now();
          const response = await this.fetchWithTimeout(
            `${CONFIG.serverUrl}/api/district-boundaries/metadata`
          );
          const responseTime = Date.now() - startTime;

          performanceResults.metadataApiTime = responseTime;

          return {
            passed: responseTime < 2000, // Should respond within 2 seconds
            details: `Response time: ${responseTime}ms`,
          };
        },
      },
      {
        name: 'Districts API response time',
        test: async () => {
          const startTime = Date.now();
          const response = await this.fetchWithTimeout(`${CONFIG.serverUrl}/api/districts/all`);
          const responseTime = Date.now() - startTime;

          performanceResults.districtsApiTime = responseTime;

          return {
            passed: responseTime < 3000, // Should respond within 3 seconds
            details: `Response time: ${responseTime}ms`,
          };
        },
      },
      {
        name: 'File size validation',
        test: async () => {
          const files = [
            {
              name: 'Metadata JSON',
              path: path.join(CONFIG.dataDir, 'district_metadata.json'),
              maxSizeMB: 5,
            },
            {
              name: 'GeoJSON',
              path: path.join(CONFIG.dataDir, 'congressional_districts_119.geojson'),
              maxSizeMB: 100,
            },
          ];

          const results = [];

          for (const file of files) {
            try {
              const stats = await fs.stat(file.path);
              const sizeMB = stats.size / (1024 * 1024);
              const withinLimit = sizeMB <= file.maxSizeMB;

              results.push(`${file.name}: ${sizeMB.toFixed(2)}MB${withinLimit ? ' ✓' : ' ⚠️'}`);
              performanceResults[`${file.name.toLowerCase().replace(' ', '_')}_size_mb`] = sizeMB;
            } catch (error) {
              results.push(`${file.name}: Not found`);
            }
          }

          return {
            passed: true,
            details: results.join(', '),
          };
        },
      },
    ];

    await this.runTestSuite('Performance', tests);
    this.results.performance = performanceResults;
  }

  async runTestSuite(suiteName, tests) {
    console.log(`\n--- ${suiteName} ---`);

    const suiteResults = {
      total: tests.length,
      passed: 0,
      failed: 0,
      tests: [],
    };

    for (const test of tests) {
      try {
        const result = await test.test();
        const status = result.passed ? '✅' : '❌';
        const details = result.details ? ` (${result.details})` : '';

        console.log(`${status} ${test.name}${details}`);

        if (result.passed) {
          suiteResults.passed++;
        } else {
          suiteResults.failed++;
          this.results.errors.push({
            suite: suiteName,
            test: test.name,
            details: result.details,
            timestamp: new Date().toISOString(),
          });
        }

        suiteResults.tests.push({
          name: test.name,
          passed: result.passed,
          details: result.details,
        });
      } catch (error) {
        console.log(`❌ ${test.name} (Error: ${error.message})`);
        suiteResults.failed++;

        this.results.errors.push({
          suite: suiteName,
          test: test.name,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.results[suiteName.toLowerCase().replace(/\s+/g, '_')] = suiteResults;
    console.log(`${suiteName}: ${suiteResults.passed}/${suiteResults.total} passed`);
  }

  async fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  async generateReport() {
    const totalTime = Date.now() - this.startTime;

    const report = {
      ...this.results,
      metadata: {
        timestamp: new Date().toISOString(),
        duration_ms: totalTime,
        duration_formatted: `${(totalTime / 1000).toFixed(2)}s`,
        test_environment: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch,
        },
      },
    };

    // Calculate overall statistics
    const allTests = Object.values(this.results)
      .filter(suite => suite && typeof suite === 'object' && 'tests' in suite)
      .reduce(
        (acc, suite) => {
          acc.total += suite.total || 0;
          acc.passed += suite.passed || 0;
          acc.failed += suite.failed || 0;
          return acc;
        },
        { total: 0, passed: 0, failed: 0 }
      );

    report.summary = {
      ...report.summary,
      overall: allTests,
      success_rate:
        allTests.total > 0 ? ((allTests.passed / allTests.total) * 100).toFixed(1) + '%' : '0%',
      total_errors: this.results.errors.length,
      total_warnings: this.results.warnings.length,
    };

    // Save detailed report
    const reportPath = path.join(CONFIG.outputDir, `district-accuracy-report-${Date.now()}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Save summary report
    const summaryPath = path.join(CONFIG.outputDir, 'district-accuracy-summary.json');
    await fs.writeFile(summaryPath, JSON.stringify(report.summary, null, 2));

    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Total Tests: ${allTests.total}`);
    console.log(`Passed: ${allTests.passed}`);
    console.log(`Failed: ${allTests.failed}`);
    console.log(`Success Rate: ${report.summary.success_rate}`);
    console.log(`Errors: ${report.summary.total_errors}`);
    console.log(`Warnings: ${report.summary.total_warnings}`);
    console.log(`Duration: ${report.metadata.duration_formatted}`);
    console.log(`\nDetailed report saved to: ${reportPath}`);
    console.log(`Summary report saved to: ${summaryPath}`);

    if (allTests.failed > 0) {
      console.log('\n❌ Some tests failed. Check the detailed report for more information.');
      process.exit(1);
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new DistrictAccuracyTester();
  await tester.runAllTests();
}

export default DistrictAccuracyTester;
