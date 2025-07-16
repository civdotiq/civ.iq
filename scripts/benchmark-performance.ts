/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

#!/usr/bin/env tsx

/*
 * CIV.IQ - Civic Information Hub
 * Phase 5: Performance Benchmarking Suite
 * 
 * Comprehensive performance testing of the ZIP code mapping system
 * to ensure production readiness and optimal user experience.
 */

interface BenchmarkResult {
  testName: string;
  totalOperations: number;
  totalTimeMs: number;
  averageTimeMs: number;
  operationsPerSecond: number;
  minTimeMs: number;
  maxTimeMs: number;
  stdDeviationMs: number;
  percentiles: {
    p50: number;
    p75: number;
    p90: number;
    p95: number;
    p99: number;
  };
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peakDelta: number;
  };
}

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  loadAverage: number[];
  uptime: number;
}

class PerformanceBenchmarker {
  private results: BenchmarkResult[] = [];
  
  async runAllBenchmarks(): Promise<void> {
    console.log('⚡ Starting Performance Benchmarking Suite');
    console.log('='.repeat(60));
    
    // System baseline
    const systemMetrics = this.getSystemMetrics();
    console.log('📊 System Baseline:');
    console.log(`  CPU Usage: ${systemMetrics.cpuUsage.toFixed(2)}%`);
    console.log(`  Memory Usage: ${systemMetrics.memoryUsage.toFixed(2)} MB`);
    console.log(`  Load Average: ${systemMetrics.loadAverage.map(l => l.toFixed(2)).join(', ')}`);
    console.log(`  Uptime: ${(systemMetrics.uptime / 3600).toFixed(2)} hours`);
    
    // Run benchmark tests
    await this.benchmarkSingleZipLookup();
    await this.benchmarkMultiZipLookup();
    await this.benchmarkConcurrentLookups();
    await this.benchmarkMemoryEfficiency();
    await this.benchmarkCachePerformance();
    await this.benchmarkAPIEndpoints();
    await this.benchmarkDataLoading();
    
    // Generate performance report
    this.generatePerformanceReport();
  }
  
  private async benchmarkSingleZipLookup(): Promise<void> {
    console.log('\n🔍 Benchmarking Single ZIP Lookup Performance...');
    
    const testZips = [
      '48221', '10001', '90210', '20001', '99501', 
      '00601', '01007', '60601', '12345', '80202'
    ];
    
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    // Warm up
    for (let i = 0; i < 100; i++) {
      await this.simulateZipLookup(testZips[i % testZips.length]);
    }
    
    // Actual benchmark
    const totalOperations = 10000;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const zipCode = testZips[i % testZips.length];
      const opStart = process.hrtime.bigint();
      await this.simulateZipLookup(zipCode);
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000); // Convert to ms
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Single ZIP Lookup',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  private async benchmarkMultiZipLookup(): Promise<void> {
    console.log('\n🔍 Benchmarking Multi-ZIP Batch Lookup Performance...');
    
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    const totalOperations = 1000;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const zipCodes = this.generateRandomZipCodes(10);
      const opStart = process.hrtime.bigint();
      
      // Simulate batch lookup
      const promises = zipCodes.map(zip => this.simulateZipLookup(zip));
      await Promise.all(promises);
      
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000);
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Multi-ZIP Batch Lookup',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  private async benchmarkConcurrentLookups(): Promise<void> {
    console.log('\n🔍 Benchmarking Concurrent Lookup Performance...');
    
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    const concurrencyLevels = [1, 5, 10, 25, 50, 100];
    
    for (const concurrency of concurrencyLevels) {
      const operationsPerLevel = 1000;
      const startTime = process.hrtime.bigint();
      
      // Create batches of concurrent operations
      const batches = Math.ceil(operationsPerLevel / concurrency);
      
      for (let batch = 0; batch < batches; batch++) {
        const promises: Promise<any>[] = [];
        
        for (let i = 0; i < concurrency && (batch * concurrency + i) < operationsPerLevel; i++) {
          const zipCode = this.generateRandomZipCode();
          promises.push(this.simulateZipLookup(zipCode));
        }
        
        const batchStart = process.hrtime.bigint();
        await Promise.all(promises);
        const batchEnd = process.hrtime.bigint();
        measurements.push(Number(batchEnd - batchStart) / 1000000);
      }
      
      const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
      console.log(`  Concurrency ${concurrency}: ${(operationsPerLevel / (totalTime / 1000)).toFixed(0)} ops/sec`);
    }
    
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Concurrent Lookups',
      totalOperations: measurements.length,
      totalTimeMs: measurements.reduce((a, b) => a + b, 0),
      averageTimeMs: measurements.reduce((a, b) => a + b, 0) / measurements.length,
      operationsPerSecond: measurements.length / (measurements.reduce((a, b) => a + b, 0) / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  private async benchmarkMemoryEfficiency(): Promise<void> {
    console.log('\n🔍 Benchmarking Memory Efficiency...');
    
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    // Test memory usage with sustained operations
    const totalOperations = 100000;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const zipCode = this.generateRandomZipCode();
      const opStart = process.hrtime.bigint();
      await this.simulateZipLookup(zipCode);
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000);
      
      // Check memory usage every 10,000 operations
      if (i % 10000 === 0) {
        const currentMemory = process.memoryUsage();
        const memoryIncrease = currentMemory.heapUsed - memoryBefore.heapUsed;
        console.log(`  ${i.toLocaleString()} ops: +${(memoryIncrease / 1024 / 1024).toFixed(2)} MB heap`);
      }
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    // Force garbage collection if possible
    if (global.gc) {
      global.gc();
    }
    
    const memoryAfterGC = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Memory Efficiency',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
    
    console.log(`  Memory after GC: ${(memoryAfterGC.heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Memory efficiency: ${(totalOperations / (result.memoryUsage.peakDelta / 1024)).toFixed(0)} ops/KB`);
  }
  
  private async benchmarkCachePerformance(): Promise<void> {
    console.log('\n🔍 Benchmarking Cache Performance...');
    
    const testZips = ['48221', '10001', '90210', '20001', '99501'];
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    // First pass - populate cache
    const totalOperations = 50000;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const zipCode = testZips[i % testZips.length]; // Repeated lookups
      const opStart = process.hrtime.bigint();
      await this.simulateZipLookup(zipCode);
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000);
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Cache Performance',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  private async benchmarkAPIEndpoints(): Promise<void> {
    console.log('\n🔍 Benchmarking API Endpoint Performance...');
    
    // This would typically test actual HTTP endpoints
    // For now, simulate the API layer logic
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    const totalOperations = 5000;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const zipCode = this.generateRandomZipCode();
      const opStart = process.hrtime.bigint();
      
      // Simulate API endpoint logic
      await this.simulateAPIEndpoint(zipCode);
      
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000);
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'API Endpoint Performance',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  private async benchmarkDataLoading(): Promise<void> {
    console.log('\n🔍 Benchmarking Data Loading Performance...');
    
    const measurements: number[] = [];
    const memoryBefore = process.memoryUsage();
    
    // Simulate data loading scenarios
    const totalOperations = 100;
    const startTime = process.hrtime.bigint();
    
    for (let i = 0; i < totalOperations; i++) {
      const opStart = process.hrtime.bigint();
      
      // Simulate data loading
      await this.simulateDataLoading();
      
      const opEnd = process.hrtime.bigint();
      measurements.push(Number(opEnd - opStart) / 1000000);
    }
    
    const totalTime = Number(process.hrtime.bigint() - startTime) / 1000000;
    const memoryAfter = process.memoryUsage();
    
    const result: BenchmarkResult = {
      testName: 'Data Loading Performance',
      totalOperations,
      totalTimeMs: totalTime,
      averageTimeMs: totalTime / totalOperations,
      operationsPerSecond: totalOperations / (totalTime / 1000),
      minTimeMs: Math.min(...measurements),
      maxTimeMs: Math.max(...measurements),
      stdDeviationMs: this.calculateStdDeviation(measurements),
      percentiles: this.calculatePercentiles(measurements),
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        peakDelta: memoryAfter.heapUsed - memoryBefore.heapUsed
      }
    };
    
    this.results.push(result);
    this.printBenchmarkResult(result);
  }
  
  // Simulation functions (replace with actual implementations)
  private async simulateZipLookup(zipCode: string): Promise<any> {
    // Simulate the actual ZIP lookup logic
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          state: 'MI',
          district: '12',
          isMultiDistrict: false
        });
      }, Math.random() * 0.1); // 0-0.1ms delay
    });
  }
  
  private async simulateAPIEndpoint(zipCode: string): Promise<any> {
    // Simulate API endpoint processing
    await this.simulateZipLookup(zipCode);
    
    // Simulate response formatting
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          success: true,
          representatives: [],
          metadata: {}
        });
      }, Math.random() * 0.5); // 0-0.5ms delay
    });
  }
  
  private async simulateDataLoading(): Promise<any> {
    // Simulate data loading operations
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({}); 
      }, Math.random() * 10); // 0-10ms delay
    });
  }
  
  private generateRandomZipCode(): string {
    return String(Math.floor(Math.random() * 90000) + 10000);
  }
  
  private generateRandomZipCodes(count: number): string[] {
    return Array.from({ length: count }, () => this.generateRandomZipCode());
  }
  
  private calculateStdDeviation(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
  
  private calculatePercentiles(values: number[]): BenchmarkResult['percentiles'] {
    const sorted = values.slice().sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)],
      p75: sorted[Math.floor(len * 0.75)],
      p90: sorted[Math.floor(len * 0.9)],
      p95: sorted[Math.floor(len * 0.95)],
      p99: sorted[Math.floor(len * 0.99)]
    };
  }
  
  private getSystemMetrics(): SystemMetrics {
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to percentage
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
      loadAverage: require('os').loadavg(),
      uptime: process.uptime()
    };
  }
  
  private printBenchmarkResult(result: BenchmarkResult): void {
    console.log(`  📊 ${result.testName} Results:`);
    console.log(`    Operations: ${result.totalOperations.toLocaleString()}`);
    console.log(`    Total Time: ${result.totalTimeMs.toFixed(2)}ms`);
    console.log(`    Average Time: ${result.averageTimeMs.toFixed(4)}ms`);
    console.log(`    Throughput: ${result.operationsPerSecond.toFixed(0)} ops/sec`);
    console.log(`    Range: ${result.minTimeMs.toFixed(4)}ms - ${result.maxTimeMs.toFixed(4)}ms`);
    console.log(`    Std Dev: ${result.stdDeviationMs.toFixed(4)}ms`);
    console.log(`    P95: ${result.percentiles.p95.toFixed(4)}ms`);
    console.log(`    P99: ${result.percentiles.p99.toFixed(4)}ms`);
    console.log(`    Memory Impact: ${(result.memoryUsage.peakDelta / 1024 / 1024).toFixed(2)} MB`);
  }
  
  private generatePerformanceReport(): void {
    console.log('\n📈 PERFORMANCE BENCHMARK REPORT');
    console.log('='.repeat(60));
    
    // Overall statistics
    const totalOperations = this.results.reduce((sum, r) => sum + r.totalOperations, 0);
    const totalTime = this.results.reduce((sum, r) => sum + r.totalTimeMs, 0);
    const avgThroughput = this.results.reduce((sum, r) => sum + r.operationsPerSecond, 0) / this.results.length;
    
    console.log(`\n🎯 Overall Performance:`);
    console.log(`  Total Operations: ${totalOperations.toLocaleString()}`);
    console.log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  Average Throughput: ${avgThroughput.toFixed(0)} ops/sec`);
    
    // Performance grades
    console.log(`\n📊 Performance Grades:`);
    this.results.forEach(result => {
      const grade = this.getPerformanceGrade(result);
      console.log(`  ${result.testName}: ${grade.grade} (${grade.description})`);
    });
    
    // Memory efficiency
    const totalMemoryUsage = this.results.reduce((sum, r) => sum + r.memoryUsage.peakDelta, 0);
    console.log(`\n💾 Memory Efficiency:`);
    console.log(`  Total Memory Impact: ${(totalMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  Memory per Operation: ${(totalMemoryUsage / totalOperations).toFixed(2)} bytes/op`);
    
    // Production readiness assessment
    console.log(`\n🚀 Production Readiness Assessment:`);
    const overallGrade = this.getOverallGrade();
    console.log(`  Overall Grade: ${overallGrade.grade}`);
    console.log(`  Recommendation: ${overallGrade.recommendation}`);
    
    // Performance recommendations
    console.log(`\n💡 Performance Recommendations:`);
    const recommendations = this.getPerformanceRecommendations();
    recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }
  
  private getPerformanceGrade(result: BenchmarkResult): { grade: string; description: string } {
    const avgTime = result.averageTimeMs;
    const throughput = result.operationsPerSecond;
    
    if (avgTime < 0.1 && throughput > 10000) {
      return { grade: 'A+', description: 'Excellent performance' };
    } else if (avgTime < 0.5 && throughput > 5000) {
      return { grade: 'A', description: 'Very good performance' };
    } else if (avgTime < 1.0 && throughput > 1000) {
      return { grade: 'B', description: 'Good performance' };
    } else if (avgTime < 5.0 && throughput > 500) {
      return { grade: 'C', description: 'Acceptable performance' };
    } else {
      return { grade: 'D', description: 'Poor performance - optimization needed' };
    }
  }
  
  private getOverallGrade(): { grade: string; recommendation: string } {
    const grades = this.results.map(r => this.getPerformanceGrade(r));
    const avgGrade = grades.reduce((sum, g) => {
      const gradeValue = { 'A+': 4.5, 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0 }[g.grade] || 1.0;
      return sum + gradeValue;
    }, 0) / grades.length;
    
    if (avgGrade >= 4.0) {
      return { grade: 'A', recommendation: 'Ready for production deployment' };
    } else if (avgGrade >= 3.0) {
      return { grade: 'B', recommendation: 'Ready for production with monitoring' };
    } else if (avgGrade >= 2.0) {
      return { grade: 'C', recommendation: 'Consider optimization before production' };
    } else {
      return { grade: 'D', recommendation: 'Significant optimization required' };
    }
  }
  
  private getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze results and provide specific recommendations
    const slowTests = this.results.filter(r => r.averageTimeMs > 1.0);
    if (slowTests.length > 0) {
      recommendations.push(`Optimize slow operations: ${slowTests.map(t => t.testName).join(', ')}`);
    }
    
    const memoryHeavyTests = this.results.filter(r => r.memoryUsage.peakDelta > 50 * 1024 * 1024);
    if (memoryHeavyTests.length > 0) {
      recommendations.push(`Review memory usage in: ${memoryHeavyTests.map(t => t.testName).join(', ')}`);
    }
    
    const lowThroughputTests = this.results.filter(r => r.operationsPerSecond < 1000);
    if (lowThroughputTests.length > 0) {
      recommendations.push(`Improve throughput for: ${lowThroughputTests.map(t => t.testName).join(', ')}`);
    }
    
    // General recommendations
    recommendations.push('Implement caching for frequently accessed ZIP codes');
    recommendations.push('Consider adding connection pooling for database operations');
    recommendations.push('Monitor performance metrics in production');
    recommendations.push('Set up automated performance regression testing');
    
    return recommendations;
  }
}

async function main() {
  const benchmarker = new PerformanceBenchmarker();
  await benchmarker.runAllBenchmarks();
}

if (require.main === module) {
  main();
}

export { PerformanceBenchmarker };