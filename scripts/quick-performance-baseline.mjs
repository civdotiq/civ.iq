#!/usr/bin/env node

/**
 * Quick Performance Baseline Script for civic-intel-hub
 * Measures API response times for baseline metrics
 */

import { performance } from 'perf_hooks';

class QuickPerformanceTester {
  constructor(baseUrl = 'http://localhost:3002') {
    this.baseUrl = baseUrl;
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl,
      api: {},
      meta: {
        nodeVersion: process.version,
        platform: process.platform
      }
    };
  }

  async measureApiEndpoint(url, label, iterations = 3) {
    const measurements = [];
    
    console.log(`Testing ${label}: ${url}`);
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      try {
        const response = await fetch(url);
        const end = performance.now();
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const responseTime = end - start;
        const dataSize = JSON.stringify(data).length;
        
        measurements.push({
          responseTime,
          status: response.status,
          size: dataSize
        });
        
        console.log(`  Iteration ${i + 1}: ${responseTime.toFixed(2)}ms (${(dataSize / 1024).toFixed(2)}KB)`);
        
      } catch (error) {
        console.error(`  Iteration ${i + 1} failed:`, error.message);
        measurements.push({
          responseTime: null,
          error: error.message
        });
      }
      
      // Small delay between requests
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const validMeasurements = measurements.filter(m => m.responseTime !== null);
    const responseTimes = validMeasurements.map(m => m.responseTime);
    
    if (responseTimes.length === 0) {
      return {
        label,
        url,
        error: 'All requests failed',
        measurements
      };
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const avgSize = validMeasurements.length > 0 ? 
      validMeasurements.reduce((a, b) => a + (b.size || 0), 0) / validMeasurements.length : 0;
    
    return {
      label,
      url,
      average: avgResponseTime,
      min: Math.min(...responseTimes),
      max: Math.max(...responseTimes),
      successRate: validMeasurements.length / measurements.length,
      averageSize: avgSize,
      measurements
    };
  }

  async runApiTests() {
    const endpoints = [
      { url: `${this.baseUrl}/api/districts/all?limit=10`, label: 'Districts API (limited)' },
      { url: `${this.baseUrl}/api/representatives?zip=48221`, label: 'Representatives by ZIP' },
      { url: `${this.baseUrl}/api/representative/K000367`, label: 'Individual Representative' },
      { url: `${this.baseUrl}/api/representative/K000367/bills?limit=5`, label: 'Representative Bills (limited)' }
    ];
    
    console.log('=== Quick API Performance Baseline ===');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Timestamp: ${this.results.timestamp}\n`);
    
    for (const endpoint of endpoints) {
      try {
        this.results.api[endpoint.label] = await this.measureApiEndpoint(endpoint.url, endpoint.label);
        console.log(''); // Add spacing between tests
      } catch (error) {
        console.error(`Failed to test ${endpoint.label}:`, error);
        this.results.api[endpoint.label] = { error: error.message };
      }
    }
  }

  formatResults() {
    console.log('=== BASELINE RESULTS SUMMARY ===');
    console.log(`Platform: ${this.results.meta.platform}`);
    console.log(`Node: ${this.results.meta.nodeVersion}\n`);
    
    for (const [label, data] of Object.entries(this.results.api)) {
      if (data.error) {
        console.log(`❌ ${label}: ERROR - ${data.error}`);
      } else {
        console.log(`✅ ${label}:`);
        console.log(`   Average: ${data.average.toFixed(2)}ms`);
        console.log(`   Range: ${data.min.toFixed(2)}ms - ${data.max.toFixed(2)}ms`);
        console.log(`   Success Rate: ${(data.successRate * 100).toFixed(1)}%`);
        console.log(`   Avg Size: ${(data.averageSize / 1024).toFixed(2)}KB`);
      }
      console.log('');
    }
  }

  async run() {
    console.log('Starting quick performance baseline measurement...\n');
    
    try {
      await this.runApiTests();
      this.formatResults();
      
      // Save results
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `performance-baseline-${timestamp}.json`;
      
      console.log(`Results saved to: performance-results/${filename}`);
      console.log('Performance baseline measurement completed!');
      
      return this.results;
      
    } catch (error) {
      console.error('Performance baseline test failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const tester = new QuickPerformanceTester();
  tester.run().catch(console.error);
}

export default QuickPerformanceTester;