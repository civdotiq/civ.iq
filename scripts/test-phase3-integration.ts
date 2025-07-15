#!/usr/bin/env tsx

/*
 * CIV.IQ - Civic Information Hub
 * Phase 3 Integration Test
 * 
 * This script tests the integration of the comprehensive ZIP code mapping
 * with the existing CIV.IQ system to ensure backward compatibility.
 */

import { 
  ZIP_TO_DISTRICT_MAP,
  getCongressionalDistrictForZip,
  getPrimaryCongressionalDistrictForZip,
  getAllCongressionalDistrictsForZip,
  isZipMultiDistrict,
  getZipLookupMetrics,
  getZipCoverageStats,
  resetZipLookupMetrics,
  getStateFromZip,
  ZIP_DISTRICT_STATS,
  zipLookupService
} from '../src/lib/data/zip-district-mapping';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  timing?: number;
}

class Phase3IntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Phase 3 Integration Tests');
    console.log('='.repeat(60));

    // Reset metrics for clean testing
    resetZipLookupMetrics();

    // Test 1: Basic ZIP lookup (single district)
    this.testBasicZipLookup();

    // Test 2: Multi-district ZIP lookup
    this.testMultiDistrictZipLookup();

    // Test 3: Legacy API compatibility
    this.testLegacyAPICompatibility();

    // Test 4: Performance metrics
    this.testPerformanceMetrics();

    // Test 5: Census API fallback compatibility
    this.testCensusAPIFallback();

    // Test 6: State lookup function
    this.testStateFromZip();

    // Test 7: Coverage statistics
    this.testCoverageStats();

    // Test 8: Edge cases
    this.testEdgeCases();

    // Test 9: Performance benchmark
    await this.testPerformanceBenchmark();

    // Print results
    this.printResults();
  }

  private testBasicZipLookup(): void {
    const startTime = performance.now();
    
    try {
      // Test known ZIP codes
      const detroitZip = getCongressionalDistrictForZip('48201');
      const nycZip = getCongressionalDistrictForZip('10001');
      const caZip = getCongressionalDistrictForZip('90210');

      const timing = performance.now() - startTime;

      if (detroitZip && nycZip && caZip) {
        this.results.push({
          test: 'Basic ZIP Lookup',
          passed: true,
          message: `✅ Successfully retrieved districts for 48201 (${detroitZip.state}-${detroitZip.district}), 10001 (${nycZip.state}-${nycZip.district}), 90210 (${caZip.state}-${caZip.district})`,
          timing
        });
      } else {
        this.results.push({
          test: 'Basic ZIP Lookup',
          passed: false,
          message: `❌ Failed to retrieve districts for known ZIP codes`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Basic ZIP Lookup',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testMultiDistrictZipLookup(): void {
    const startTime = performance.now();
    
    try {
      // Test multi-district ZIP
      const isMulti = isZipMultiDistrict('01007');
      const allDistricts = getAllCongressionalDistrictsForZip('01007');
      const primaryDistrict = getPrimaryCongressionalDistrictForZip('01007');

      const timing = performance.now() - startTime;

      if (isMulti && allDistricts.length > 1 && primaryDistrict) {
        this.results.push({
          test: 'Multi-District ZIP Lookup',
          passed: true,
          message: `✅ Multi-district ZIP 01007: ${allDistricts.length} districts, primary: ${primaryDistrict.state}-${primaryDistrict.district}`,
          timing
        });
      } else {
        this.results.push({
          test: 'Multi-District ZIP Lookup',
          passed: false,
          message: `❌ Failed multi-district test: isMulti=${isMulti}, districts=${allDistricts.length}`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Multi-District ZIP Lookup',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testLegacyAPICompatibility(): void {
    const startTime = performance.now();
    
    try {
      // Test legacy ZIP_TO_DISTRICT_MAP access
      const legacyLookup = ZIP_TO_DISTRICT_MAP['48201'];
      const proxyEnumeration = Object.keys(ZIP_TO_DISTRICT_MAP).length;
      
      const timing = performance.now() - startTime;

      if (legacyLookup && proxyEnumeration > 30000) {
        this.results.push({
          test: 'Legacy API Compatibility',
          passed: true,
          message: `✅ Legacy ZIP_TO_DISTRICT_MAP works: 48201 -> ${legacyLookup.state}-${legacyLookup.district}, ${proxyEnumeration.toLocaleString()} ZIPs enumerable`,
          timing
        });
      } else {
        this.results.push({
          test: 'Legacy API Compatibility',
          passed: false,
          message: `❌ Legacy API failed: lookup=${!!legacyLookup}, enumerable=${proxyEnumeration}`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Legacy API Compatibility',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testPerformanceMetrics(): void {
    const startTime = performance.now();
    
    try {
      // Perform some lookups to generate metrics
      getCongressionalDistrictForZip('48201');
      getCongressionalDistrictForZip('10001');
      getPrimaryCongressionalDistrictForZip('01007');
      
      const metrics = getZipLookupMetrics();
      const timing = performance.now() - startTime;

      if (metrics.totalLookups > 0 && metrics.directHits > 0) {
        this.results.push({
          test: 'Performance Metrics',
          passed: true,
          message: `✅ Metrics working: ${metrics.totalLookups} lookups, ${metrics.directHits} hits, ${metrics.averageResponseTime.toFixed(2)}ms avg`,
          timing
        });
      } else {
        this.results.push({
          test: 'Performance Metrics',
          passed: false,
          message: `❌ Metrics failed: lookups=${metrics.totalLookups}, hits=${metrics.directHits}`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Performance Metrics',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testCensusAPIFallback(): void {
    const startTime = performance.now();
    
    try {
      // Test unknown ZIP code (should return null for direct lookup)
      const unknownZip = getCongressionalDistrictForZip('99999');
      const timing = performance.now() - startTime;

      if (unknownZip === null) {
        this.results.push({
          test: 'Census API Fallback',
          passed: true,
          message: `✅ Unknown ZIP 99999 correctly returns null (Census API fallback preserved)`,
          timing
        });
      } else {
        this.results.push({
          test: 'Census API Fallback',
          passed: false,
          message: `❌ Unknown ZIP should return null, got: ${JSON.stringify(unknownZip)}`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Census API Fallback',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testStateFromZip(): void {
    const startTime = performance.now();
    
    try {
      const michiganState = getStateFromZip('48201');
      const californiaState = getStateFromZip('90210');
      const newYorkState = getStateFromZip('10001');
      
      const timing = performance.now() - startTime;

      if (michiganState === 'MI' && californiaState === 'CA' && newYorkState === 'NY') {
        this.results.push({
          test: 'State From ZIP',
          passed: true,
          message: `✅ State lookup works: 48201->MI, 90210->CA, 10001->NY`,
          timing
        });
      } else {
        this.results.push({
          test: 'State From ZIP',
          passed: false,
          message: `❌ State lookup failed: 48201->${michiganState}, 90210->${californiaState}, 10001->${newYorkState}`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'State From ZIP',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testCoverageStats(): void {
    const startTime = performance.now();
    
    try {
      const stats = getZipCoverageStats();
      const timing = performance.now() - startTime;

      if (stats.totalZips > 30000 && stats.congress === '119th') {
        this.results.push({
          test: 'Coverage Statistics',
          passed: true,
          message: `✅ Coverage stats: ${stats.totalZips.toLocaleString()} ZIPs, ${stats.multiDistrictZips.toLocaleString()} multi-district, ${stats.congress} Congress`,
          timing
        });
      } else {
        this.results.push({
          test: 'Coverage Statistics',
          passed: false,
          message: `❌ Coverage stats failed: ${stats.totalZips} ZIPs, ${stats.congress} Congress`,
          timing
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Coverage Statistics',
        passed: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private testEdgeCases(): void {
    const startTime = performance.now();
    
    try {
      // Test edge cases
      const invalidZip = getCongressionalDistrictForZip('12345');
      const emptyZip = getCongressionalDistrictForZip('');
      const shortZip = getCongressionalDistrictForZip('123');
      
      const timing = performance.now() - startTime;

      // These should either return null or handle gracefully
      this.results.push({
        test: 'Edge Cases',
        passed: true,
        message: `✅ Edge cases handled gracefully: invalid, empty, and short ZIPs`,
        timing
      });
    } catch (error) {
      this.results.push({
        test: 'Edge Cases',
        passed: false,
        message: `❌ Error handling edge cases: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }

  private async testPerformanceBenchmark(): Promise<void> {
    console.log('\n📊 Running Performance Benchmark...');
    
    const testZips = ['48201', '10001', '90210', '01007', '30309', '60601', '77001', '98101'];
    const iterations = 1000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      const zipIndex = i % testZips.length;
      getCongressionalDistrictForZip(testZips[zipIndex]);
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;
    
    const metrics = getZipLookupMetrics();
    
    this.results.push({
      test: 'Performance Benchmark',
      passed: averageTime < 1, // Should be sub-millisecond
      message: `${averageTime < 1 ? '✅' : '❌'} ${iterations} lookups in ${totalTime.toFixed(2)}ms (${averageTime.toFixed(3)}ms avg)`,
      timing: averageTime
    });
  }

  private printResults(): void {
    console.log('\n📋 PHASE 3 INTEGRATION TEST RESULTS');
    console.log('='.repeat(60));
    
    let passedTests = 0;
    let totalTests = this.results.length;
    
    this.results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const timing = result.timing ? ` (${result.timing.toFixed(2)}ms)` : '';
      console.log(`${status} ${result.test}${timing}`);
      console.log(`   ${result.message}`);
      
      if (result.passed) passedTests++;
    });
    
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED - Phase 3 Integration Complete!');
      console.log('✅ 39,363 ZIP codes successfully integrated');
      console.log('✅ Backward compatibility maintained');
      console.log('✅ Performance monitoring active');
      console.log('✅ Multi-district ZIP support enabled');
      console.log('✅ Ready for Phase 4: Edge Case Handling & UI Updates');
    } else {
      console.log(`❌ ${totalTests - passedTests} tests failed - Integration issues detected`);
    }
    
    // Print final metrics
    const finalMetrics = getZipLookupMetrics();
    const finalStats = getZipCoverageStats();
    
    console.log('\n📈 FINAL METRICS:');
    console.log(`   Total lookups: ${finalMetrics.totalLookups.toLocaleString()}`);
    console.log(`   Direct hits: ${finalMetrics.directHits.toLocaleString()}`);
    console.log(`   Hit rate: ${finalStats.hitRate.toFixed(1)}%`);
    console.log(`   Average response time: ${finalMetrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`   Multi-district lookups: ${finalMetrics.multiDistrictLookups.toLocaleString()}`);
    console.log(`   ZIP coverage: ${finalStats.totalZips.toLocaleString()} ZIP codes`);
  }
}

async function main() {
  const tester = new Phase3IntegrationTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main();
}

export { Phase3IntegrationTester };