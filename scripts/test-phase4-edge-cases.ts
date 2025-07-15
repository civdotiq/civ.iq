#!/usr/bin/env tsx

/*
 * CIV.IQ - Civic Information Hub
 * Phase 4: Edge Case Testing
 * 
 * Comprehensive test suite for edge cases including territories, DC, 
 * multi-district ZIPs, and other special situations.
 */

import { 
  getCongressionalDistrictForZip,
  getPrimaryCongressionalDistrictForZip,
  getAllCongressionalDistrictsForZip,
  isZipMultiDistrict,
  getStateFromZip,
  getZipLookupMetrics,
  resetZipLookupMetrics
} from '../src/lib/data/zip-district-mapping';

interface TestCase {
  zipCode: string;
  expectedState: string;
  expectedDistrict: string;
  category: 'territory' | 'dc' | 'at-large' | 'multi-district' | 'rural' | 'urban' | 'edge-case';
  description: string;
  shouldBeMultiDistrict?: boolean;
  expectedWarnings?: string[];
}

interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualResult?: any;
  error?: string;
  timing: number;
}

class Phase4EdgeCaseTester {
  private testCases: TestCase[] = [
    // District of Columbia
    {
      zipCode: '20001',
      expectedState: 'DC',
      expectedDistrict: '00',
      category: 'dc',
      description: 'Washington D.C. - Non-voting delegate'
    },
    {
      zipCode: '20500',
      expectedState: 'DC',
      expectedDistrict: '00',
      category: 'dc',
      description: 'White House ZIP code'
    },

    // U.S. Territories
    {
      zipCode: '00601',
      expectedState: 'PR',
      expectedDistrict: '00',
      category: 'territory',
      description: 'Puerto Rico - Non-voting delegate'
    },
    {
      zipCode: '96910',
      expectedState: 'GU',
      expectedDistrict: '00',
      category: 'territory',
      description: 'Guam - Non-voting delegate'
    },
    {
      zipCode: '00801',
      expectedState: 'VI',
      expectedDistrict: '00',
      category: 'territory',
      description: 'U.S. Virgin Islands - Non-voting delegate'
    },

    // At-Large Districts
    {
      zipCode: '99501',
      expectedState: 'AK',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'Alaska - At-large district'
    },
    {
      zipCode: '82001',
      expectedState: 'WY',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'Wyoming - At-large district'
    },
    {
      zipCode: '05401',
      expectedState: 'VT',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'Vermont - At-large district'
    },
    {
      zipCode: '19901',
      expectedState: 'DE',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'Delaware - At-large district'
    },
    {
      zipCode: '58001',
      expectedState: 'ND',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'North Dakota - At-large district'
    },
    {
      zipCode: '57001',
      expectedState: 'SD',
      expectedDistrict: '00',
      category: 'at-large',
      description: 'South Dakota - At-large district'
    },

    // Multi-District ZIP Codes (known from Phase 3 data)
    {
      zipCode: '01007',
      expectedState: 'MA',
      expectedDistrict: '01',
      category: 'multi-district',
      description: 'Massachusetts - Multi-district ZIP',
      shouldBeMultiDistrict: true
    },
    {
      zipCode: '10001',
      expectedState: 'NY',
      expectedDistrict: '12',
      category: 'multi-district',
      description: 'Manhattan - Potential multi-district ZIP'
    },

    // Large Urban Areas
    {
      zipCode: '90210',
      expectedState: 'CA',
      expectedDistrict: '30',
      category: 'urban',
      description: 'Beverly Hills - High-profile ZIP'
    },
    {
      zipCode: '10012',
      expectedState: 'NY',
      expectedDistrict: '10',
      category: 'urban',
      description: 'SoHo, Manhattan - Dense urban area'
    },
    {
      zipCode: '60601',
      expectedState: 'IL',
      expectedDistrict: '07',
      category: 'urban',
      description: 'Chicago Loop - Urban center'
    },

    // Rural Areas
    {
      zipCode: '59718',
      expectedState: 'MT',
      expectedDistrict: '01',
      category: 'rural',
      description: 'Montana - Rural district'
    },

    // Edge Cases
    {
      zipCode: '12345',
      expectedState: 'NY',
      expectedDistrict: '20',
      category: 'edge-case',
      description: 'Schenectady, NY - Sequential ZIP'
    },
    {
      zipCode: '48221',
      expectedState: 'MI',
      expectedDistrict: '12',
      category: 'urban',
      description: 'Detroit - Original test ZIP'
    }
  ];

  private results: TestResult[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Phase 4 Edge Case Testing');
    console.log('='.repeat(60));

    // Reset metrics for clean testing
    resetZipLookupMetrics();

    // Test each case
    for (const testCase of this.testCases) {
      await this.runSingleTest(testCase);
    }

    // Run comprehensive analysis
    this.runComprehensiveAnalysis();

    // Print results
    this.printResults();
  }

  private async runSingleTest(testCase: TestCase): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Get basic district info
      const primaryDistrict = getPrimaryCongressionalDistrictForZip(testCase.zipCode);
      const allDistricts = getAllCongressionalDistrictsForZip(testCase.zipCode);
      const isMultiDistrict = isZipMultiDistrict(testCase.zipCode);
      const stateFromZip = getStateFromZip(testCase.zipCode);

      const timing = performance.now() - startTime;

      // Validate results
      const passed = this.validateTestCase(testCase, {
        primaryDistrict,
        allDistricts,
        isMultiDistrict,
        stateFromZip
      });

      this.results.push({
        testCase,
        passed,
        actualResult: {
          primaryDistrict,
          allDistricts,
          isMultiDistrict,
          stateFromZip,
          districtCount: allDistricts.length
        },
        timing
      });

    } catch (error) {
      this.results.push({
        testCase,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: performance.now() - startTime
      });
    }
  }

  private validateTestCase(testCase: TestCase, result: any): boolean {
    const { primaryDistrict, allDistricts, isMultiDistrict, stateFromZip } = result;

    // Check if we found any district
    if (!primaryDistrict && allDistricts.length === 0) {
      return false;
    }

    // Check state
    const actualState = primaryDistrict?.state || stateFromZip;
    if (actualState !== testCase.expectedState) {
      return false;
    }

    // Check district
    const actualDistrict = primaryDistrict?.district;
    if (actualDistrict !== testCase.expectedDistrict) {
      return false;
    }

    // Check multi-district expectation
    if (testCase.shouldBeMultiDistrict !== undefined) {
      if (isMultiDistrict !== testCase.shouldBeMultiDistrict) {
        return false;
      }
    }

    return true;
  }

  private runComprehensiveAnalysis(): void {
    console.log('\n🔍 Running Comprehensive Analysis...');
    
    // Test all 50 states + territories
    const stateTests = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
      'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
      'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'DC', 'GU', 'PR', 'VI'
    ];

    const stateCoverage = new Map<string, number>();
    const sampleZips = [
      '35004', '99501', '85001', '72201', '90210', '80201', '06101', '19901', '32301', '30301',
      '96801', '83701', '60601', '46201', '50301', '67201', '40601', '70801', '04101', '21201',
      '02101', '48201', '55101', '39201', '63101', '59718', '68501', '89501', '03301', '08601',
      '87501', '10001', '27601', '58501', '43201', '73301', '97201', '19101', '02901', '29201',
      '57501', '37201', '75201', '84101', '05601', '23219', '98101', '25301', '53201', '82001',
      '20001', '96910', '00601', '00801'
    ];

    for (let i = 0; i < sampleZips.length && i < stateTests.length; i++) {
      const zip = sampleZips[i];
      const expectedState = stateTests[i];
      
      const state = getStateFromZip(zip);
      if (state === expectedState) {
        stateCoverage.set(expectedState, (stateCoverage.get(expectedState) || 0) + 1);
      }
    }

    // Store coverage results
    this.results.push({
      testCase: {
        zipCode: 'COVERAGE_TEST',
        expectedState: 'ALL',
        expectedDistrict: 'ALL',
        category: 'edge-case',
        description: `State coverage test: ${stateCoverage.size}/54 states/territories`
      },
      passed: stateCoverage.size >= 50,
      actualResult: {
        statesCovered: stateCoverage.size,
        totalStates: 54,
        coveragePercentage: (stateCoverage.size / 54) * 100
      },
      timing: 0
    });
  }

  private printResults(): void {
    console.log('\n📋 PHASE 4 EDGE CASE TEST RESULTS');
    console.log('='.repeat(60));

    // Group results by category
    const categories = new Map<string, TestResult[]>();
    this.results.forEach(result => {
      const category = result.testCase.category;
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    });

    let totalTests = 0;
    let passedTests = 0;

    // Print results by category
    categories.forEach((results, category) => {
      console.log(`\n📁 ${category.toUpperCase().replace('-', ' ')}:`);
      
      results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        const timing = result.timing.toFixed(2);
        
        console.log(`  ${status} ${result.testCase.zipCode} - ${result.testCase.description} (${timing}ms)`);
        
        if (!result.passed) {
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          } else if (result.actualResult) {
            console.log(`    Expected: ${result.testCase.expectedState}-${result.testCase.expectedDistrict}`);
            console.log(`    Actual: ${result.actualResult.primaryDistrict?.state || 'N/A'}-${result.actualResult.primaryDistrict?.district || 'N/A'}`);
          }
        }
        
        totalTests++;
        if (result.passed) passedTests++;
      });
    });

    // Summary
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    
    // Edge case statistics
    const edgeCaseStats = {
      territories: this.results.filter(r => r.testCase.category === 'territory').length,
      dc: this.results.filter(r => r.testCase.category === 'dc').length,
      atLarge: this.results.filter(r => r.testCase.category === 'at-large').length,
      multiDistrict: this.results.filter(r => r.testCase.category === 'multi-district').length,
      rural: this.results.filter(r => r.testCase.category === 'rural').length,
      urban: this.results.filter(r => r.testCase.category === 'urban').length
    };

    console.log('\n📈 EDGE CASE COVERAGE:');
    Object.entries(edgeCaseStats).forEach(([type, count]) => {
      const passed = this.results.filter(r => r.testCase.category === type && r.passed).length;
      console.log(`  ${type}: ${passed}/${count} passed`);
    });

    // Performance metrics
    const metrics = getZipLookupMetrics();
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`  Total lookups: ${metrics.totalLookups.toLocaleString()}`);
    console.log(`  Average response time: ${metrics.averageResponseTime.toFixed(3)}ms`);
    console.log(`  Multi-district lookups: ${metrics.multiDistrictLookups.toLocaleString()}`);
    console.log(`  Hit rate: ${((metrics.directHits / metrics.totalLookups) * 100).toFixed(1)}%`);

    // Final assessment
    if (passedTests === totalTests) {
      console.log('\n🎉 ALL EDGE CASE TESTS PASSED!');
      console.log('✅ Phase 4 edge case handling is working correctly');
      console.log('✅ Territories, DC, and at-large districts supported');
      console.log('✅ Multi-district ZIP codes handled properly');
      console.log('✅ Ready for Phase 5: Testing & Documentation');
    } else {
      console.log(`\n⚠️  ${totalTests - passedTests} tests failed - Edge case handling needs improvement`);
    }
  }
}

async function main() {
  const tester = new Phase4EdgeCaseTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main();
}

export { Phase4EdgeCaseTester };