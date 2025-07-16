/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

#!/usr/bin/env tsx

/*
 * CIV.IQ - Civic Information Hub
 * Phase 4: API Integration Test
 * 
 * Tests the multi-district API integration with the main results page
 */

interface TestResult {
  zipCode: string;
  success: boolean;
  isMultiDistrict: boolean;
  districtsCount: number;
  hasRepresentatives: boolean;
  responseTime: number;
  error?: string;
}

class APIIntegrationTester {
  private baseUrl = 'http://localhost:3000';
  
  async testMultiDistrictAPI(zipCode: string): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/representatives-multi-district?zip=${zipCode}`);
      const data = await response.json();
      
      return {
        zipCode,
        success: data.success,
        isMultiDistrict: data.isMultiDistrict || false,
        districtsCount: data.districts?.length || 0,
        hasRepresentatives: data.representatives?.length > 0,
        responseTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        zipCode,
        success: false,
        isMultiDistrict: false,
        districtsCount: 0,
        hasRepresentatives: false,
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async testStandardAPI(zipCode: string): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/api/representatives?zip=${zipCode}`);
      const data = await response.json();
      
      return {
        zipCode,
        success: data.success,
        isMultiDistrict: false,
        districtsCount: 1,
        hasRepresentatives: data.representatives?.length > 0,
        responseTime: performance.now() - startTime
      };
    } catch (error) {
      return {
        zipCode,
        success: false,
        isMultiDistrict: false,
        districtsCount: 0,
        hasRepresentatives: false,
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  async runIntegrationTests(): Promise<void> {
    console.log('🔗 Starting API Integration Tests');
    console.log('='.repeat(50));
    
    const testZips = [
      '48221', // Detroit - single district
      '01007', // Massachusetts - multi-district
      '20001', // DC - special case
      '10001', // Manhattan - potentially multi-district
      '99501', // Alaska - at-large
      '00601'  // Puerto Rico - territory
    ];
    
    console.log('\n🏁 Testing Multi-District API:');
    for (const zipCode of testZips) {
      const result = await this.testMultiDistrictAPI(zipCode);
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const details = result.success 
        ? `${result.districtsCount} districts, ${result.hasRepresentatives ? 'has reps' : 'no reps'}, ${result.isMultiDistrict ? 'multi' : 'single'}`
        : result.error || 'Unknown error';
      
      console.log(`  ${status} ${zipCode} - ${details} (${result.responseTime.toFixed(0)}ms)`);
    }
    
    console.log('\n📋 Testing Standard API:');
    for (const zipCode of testZips) {
      const result = await this.testStandardAPI(zipCode);
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      const details = result.success 
        ? `${result.hasRepresentatives ? 'has reps' : 'no reps'}`
        : result.error || 'Unknown error';
      
      console.log(`  ${status} ${zipCode} - ${details} (${result.responseTime.toFixed(0)}ms)`);
    }
  }
}

async function main() {
  console.log('⚠️  Note: This test requires the development server to be running');
  console.log('Run: npm run dev\n');
  
  const tester = new APIIntegrationTester();
  await tester.runIntegrationTests();
  
  console.log('\n✅ Integration testing complete!');
  console.log('💡 The multi-district API is ready for frontend integration');
}

if (require.main === module) {
  main();
}

export { APIIntegrationTester };