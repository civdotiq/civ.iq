#!/usr/bin/env node

/**
 * Simple Load Testing Script for civic-intel-hub
 * Simulates concurrent users and measures performance under load
 */

import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { performance } from 'perf_hooks';
import fs from 'fs';
import path from 'path';

class LoadTester {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3002';
    this.endpoints = options.endpoints || [
      '/api/districts/all?limit=5',
      '/api/representatives?zip=48221',
      '/api/representative/K000367'
    ];
    this.concurrency = options.concurrency || 10;
    this.duration = options.duration || 30000; // 30 seconds
    this.rampUp = options.rampUp || 5000; // 5 seconds
    
    this.results = {
      startTime: null,
      endTime: null,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      requestsPerSecond: 0,
      averageResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0
    };
  }

  async runLoadTest() {
    console.log('🚀 Starting Load Test');
    console.log(`Base URL: ${this.baseUrl}`);
    console.log(`Endpoints: ${this.endpoints.length} endpoints`);
    console.log(`Concurrency: ${this.concurrency} users`);
    console.log(`Duration: ${this.duration / 1000}s`);
    console.log(`Ramp-up: ${this.rampUp / 1000}s\n`);

    this.results.startTime = Date.now();
    const workers = [];
    const workerResults = [];

    // Create workers with staggered start (ramp-up)
    for (let i = 0; i < this.concurrency; i++) {
      const delay = (this.rampUp / this.concurrency) * i;
      
      setTimeout(() => {
        const worker = new Worker(new URL(import.meta.url), {
          workerData: {
            baseUrl: this.baseUrl,
            endpoints: this.endpoints,
            duration: this.duration - delay,
            workerId: i + 1
          }
        });

        worker.on('message', (result) => {
          workerResults.push(result);
        });

        worker.on('error', (error) => {
          console.error(`Worker ${i + 1} error:`, error);
        });

        workers.push(worker);
      }, delay);
    }

    // Wait for all workers to complete
    await new Promise(resolve => {
      const checkCompletion = () => {
        if (workerResults.length === this.concurrency) {
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      setTimeout(checkCompletion, this.duration + this.rampUp + 1000);
    });

    this.results.endTime = Date.now();
    this.aggregateResults(workerResults);
    this.displayResults();
    await this.saveResults();

    return this.results;
  }

  aggregateResults(workerResults) {
    const allResponses = [];
    
    for (const result of workerResults) {
      this.results.totalRequests += result.totalRequests;
      this.results.successfulRequests += result.successfulRequests;
      this.results.failedRequests += result.failedRequests;
      allResponses.push(...result.responseTimes);
      this.results.errors.push(...result.errors);
    }

    // Sort response times for percentile calculations
    allResponses.sort((a, b) => a - b);
    this.results.responseTimes = allResponses;

    // Calculate metrics
    const totalDuration = (this.results.endTime - this.results.startTime) / 1000;
    this.results.requestsPerSecond = this.results.totalRequests / totalDuration;
    
    if (allResponses.length > 0) {
      this.results.averageResponseTime = allResponses.reduce((a, b) => a + b, 0) / allResponses.length;
      this.results.p95ResponseTime = allResponses[Math.floor(allResponses.length * 0.95)];
      this.results.p99ResponseTime = allResponses[Math.floor(allResponses.length * 0.99)];
    }
  }

  displayResults() {
    console.log('\n📊 Load Test Results');
    console.log('═'.repeat(50));
    console.log(`Duration: ${((this.results.endTime - this.results.startTime) / 1000).toFixed(2)}s`);
    console.log(`Total Requests: ${this.results.totalRequests}`);
    console.log(`Successful: ${this.results.successfulRequests} (${((this.results.successfulRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Failed: ${this.results.failedRequests} (${((this.results.failedRequests / this.results.totalRequests) * 100).toFixed(2)}%)`);
    console.log(`Requests/sec: ${this.results.requestsPerSecond.toFixed(2)}`);
    
    if (this.results.responseTimes.length > 0) {
      console.log('\nResponse Times:');
      console.log(`Average: ${this.results.averageResponseTime.toFixed(2)}ms`);
      console.log(`P95: ${this.results.p95ResponseTime.toFixed(2)}ms`);
      console.log(`P99: ${this.results.p99ResponseTime.toFixed(2)}ms`);
    }

    if (this.results.errors.length > 0) {
      console.log('\nTop Errors:');
      const errorCounts = {};
      this.results.errors.forEach(error => {
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      });
      
      Object.entries(errorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([error, count]) => {
          console.log(`  ${error}: ${count} occurrences`);
        });
    }
  }

  async saveResults() {
    const resultsDir = path.join(process.cwd(), 'performance-results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `load-test-${timestamp}.json`;
    const filepath = path.join(resultsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`\nResults saved to: ${filepath}`);
  }
}

// Worker thread implementation
async function workerThread() {
  const { baseUrl, endpoints, duration, workerId } = workerData;
  const startTime = Date.now();
  const results = {
    workerId,
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: []
  };

  console.log(`Worker ${workerId} started`);

  while (Date.now() - startTime < duration) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const url = baseUrl + endpoint;
    
    const requestStart = performance.now();
    
    try {
      const response = await fetch(url);
      const requestEnd = performance.now();
      const responseTime = requestEnd - requestStart;
      
      results.totalRequests++;
      results.responseTimes.push(responseTime);
      
      if (response.ok) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        results.errors.push(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
      results.errors.push(error.message);
    }
    
    // Small delay to prevent overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`Worker ${workerId} completed: ${results.totalRequests} requests`);
  parentPort.postMessage(results);
}

// Main execution
if (isMainThread) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    
    if (key && value) {
      if (key === 'concurrency' || key === 'duration' || key === 'rampUp') {
        options[key] = parseInt(value);
      } else {
        options[key] = value;
      }
    }
  }

  const loadTester = new LoadTester(options);
  
  loadTester.runLoadTest().catch(console.error);
} else {
  workerThread();
}

export default LoadTester;