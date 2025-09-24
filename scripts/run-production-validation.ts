#!/usr/bin/env tsx

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Production Validation Test Runner
 * Comprehensive test suite for multi-district ZIP code and address search
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

interface TestSuite {
  name: string;
  description: string;
  file: string;
  critical: boolean;
  estimatedDuration: string;
}

interface TestResults {
  suite: string;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Geolocation Browser Validation',
    description: 'Tests geolocation functionality across Chrome, Safari, Firefox',
    file: 'tests/e2e/geolocation-browser-validation.spec.ts',
    critical: true,
    estimatedDuration: '3-5 minutes',
  },
  {
    name: 'Mobile Responsive Validation',
    description: 'Tests mobile layouts, touch interactions, and responsive design',
    file: 'tests/e2e/mobile-responsive-validation.spec.ts',
    critical: true,
    estimatedDuration: '5-8 minutes',
  },
  {
    name: 'User Flow Validation',
    description: 'End-to-end user journey testing from search to results',
    file: 'tests/e2e/user-flow-validation.spec.ts',
    critical: true,
    estimatedDuration: '4-6 minutes',
  },
  {
    name: 'Error Scenario Validation',
    description: 'Network failures, permission denials, and error recovery',
    file: 'tests/e2e/error-scenario-validation.spec.ts',
    critical: true,
    estimatedDuration: '3-4 minutes',
  },
  {
    name: 'Accessibility Validation',
    description: 'WCAG compliance, screen reader support, keyboard navigation',
    file: 'tests/e2e/accessibility-validation.spec.ts',
    critical: false,
    estimatedDuration: '4-7 minutes',
  },
  {
    name: 'Performance Validation',
    description: 'Mobile/slow connection performance benchmarking',
    file: 'tests/e2e/performance-validation.spec.ts',
    critical: false,
    estimatedDuration: '6-10 minutes',
  },
];

class ValidationRunner {
  private results: TestResults[] = [];
  private startTime: number = 0;
  private criticalOnly: boolean = false;
  private parallel: boolean = false;

  constructor(options: { criticalOnly?: boolean; parallel?: boolean } = {}) {
    this.criticalOnly = options.criticalOnly || false;
    this.parallel = options.parallel || false;
  }

  async run(): Promise<boolean> {
    console.log('🚀 Production Validation Test Runner');
    console.log('=====================================\n');

    this.startTime = Date.now();

    // Pre-flight checks
    if (!(await this.preflightChecks())) {
      return false;
    }

    // Determine which suites to run
    const suitesToRun = this.criticalOnly
      ? TEST_SUITES.filter(suite => suite.critical)
      : TEST_SUITES;

    console.log(`📋 Running ${suitesToRun.length} test suite(s):`);
    suitesToRun.forEach(suite => {
      const badge = suite.critical ? '🔴 CRITICAL' : '🟡 STANDARD';
      console.log(`   ${badge} ${suite.name} (${suite.estimatedDuration})`);
    });
    console.log();

    // Run tests
    if (this.parallel && suitesToRun.length > 1) {
      await this.runParallel(suitesToRun);
    } else {
      await this.runSequential(suitesToRun);
    }

    // Generate report
    this.generateReport();

    // Return overall success
    const criticalFailures = this.results.filter(
      result => !result.passed && suitesToRun.find(s => s.file.includes(result.suite))?.critical
    );

    return criticalFailures.length === 0;
  }

  private async preflightChecks(): Promise<boolean> {
    console.log('🔍 Running pre-flight checks...');

    // Check if dev server is running
    try {
      execSync('curl -s http://localhost:3000/ > /dev/null', { timeout: 5000 });
      console.log('   ✅ Dev server running on localhost:3000');
    } catch {
      console.log('   ❌ Dev server not running on localhost:3000');
      console.log('   💡 Start dev server with: npm run dev');
      return false;
    }

    // Check if Playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'ignore' });
      console.log('   ✅ Playwright installed');
    } catch {
      console.log('   ❌ Playwright not installed');
      console.log('   💡 Install with: npx playwright install');
      return false;
    }

    // Check if test files exist
    const missingFiles = TEST_SUITES.filter(suite => !existsSync(suite.file));
    if (missingFiles.length > 0) {
      console.log('   ❌ Missing test files:');
      missingFiles.forEach(suite => console.log(`      - ${suite.file}`));
      return false;
    }
    console.log('   ✅ All test files present');

    console.log('   ✅ Pre-flight checks passed\n');
    return true;
  }

  private async runSequential(suites: TestSuite[]): Promise<void> {
    console.log('🔄 Running tests sequentially...\n');

    for (const suite of suites) {
      await this.runSuite(suite);
    }
  }

  private async runParallel(suites: TestSuite[]): Promise<void> {
    console.log('⚡ Running tests in parallel...\n');

    const promises = suites.map(suite => this.runSuite(suite));
    await Promise.all(promises);
  }

  private async runSuite(suite: TestSuite): Promise<void> {
    const startTime = Date.now();
    const badge = suite.critical ? '🔴' : '🟡';

    console.log(`${badge} Running: ${suite.name}`);
    console.log(`   ${suite.description}`);

    try {
      const output = execSync(`npx playwright test ${suite.file} --reporter=line`, {
        encoding: 'utf8',
        timeout: 600000, // 10 minutes max per suite
      });

      const duration = Date.now() - startTime;
      this.results.push({
        suite: suite.name,
        passed: true,
        duration,
        output,
      });

      console.log(`   ✅ Passed in ${this.formatDuration(duration)}\n`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorOutput = error instanceof Error ? error.message : String(error);

      this.results.push({
        suite: suite.name,
        passed: false,
        duration,
        output: '',
        error: errorOutput,
      });

      console.log(`   ❌ Failed in ${this.formatDuration(duration)}`);
      if (suite.critical) {
        console.log(`   🚨 CRITICAL FAILURE - This may block production deployment\n`);
      } else {
        console.log(`   ⚠️  Non-critical failure - Review recommended\n`);
      }
    }
  }

  private generateReport(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const criticalFailed = this.results.filter(
      r => !r.passed && TEST_SUITES.find(s => s.name === r.suite)?.critical
    ).length;

    console.log('📊 VALIDATION REPORT');
    console.log('===================');
    console.log(`Total Duration: ${this.formatDuration(totalDuration)}`);
    console.log(`Total Suites: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    if (criticalFailed > 0) {
      console.log(`🚨 Critical Failures: ${criticalFailed}`);
    }
    console.log();

    // Detailed results
    console.log('📋 DETAILED RESULTS');
    console.log('==================');
    this.results.forEach(result => {
      const suite = TEST_SUITES.find(s => s.name === result.suite);
      const badge = suite?.critical ? '🔴' : '🟡';
      const status = result.passed ? '✅' : '❌';
      const duration = this.formatDuration(result.duration);

      console.log(`${badge} ${status} ${result.suite} (${duration})`);
      if (!result.passed && result.error) {
        console.log(`   Error: ${result.error.split('\n')[0]}`);
      }
    });
    console.log();

    // Production readiness assessment
    console.log('🎯 PRODUCTION READINESS');
    console.log('======================');
    if (criticalFailed === 0) {
      console.log('✅ READY FOR PRODUCTION');
      console.log('   All critical validation tests passed.');
      if (failed > 0) {
        console.log(`   ${failed} non-critical issue(s) should be addressed when possible.`);
      }
    } else {
      console.log('❌ NOT READY FOR PRODUCTION');
      console.log(`   ${criticalFailed} critical issue(s) must be resolved before deployment.`);
    }
    console.log();

    // Next steps
    if (failed > 0) {
      console.log('🔧 NEXT STEPS');
      console.log('=============');
      this.results
        .filter(r => !r.passed)
        .forEach(result => {
          const suite = TEST_SUITES.find(s => s.name === result.suite);
          console.log(`📝 Review: ${suite?.file}`);
        });
      console.log();
    }
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const criticalOnly = args.includes('--critical-only') || args.includes('-c');
  const parallel = args.includes('--parallel') || args.includes('-p');
  const help = args.includes('--help') || args.includes('-h');

  if (help) {
    console.log('Production Validation Test Runner');
    console.log('Usage: npm run validate:production [options]');
    console.log('');
    console.log('Options:');
    console.log('  -c, --critical-only    Run only critical validation tests');
    console.log('  -p, --parallel         Run tests in parallel (faster but uses more resources)');
    console.log('  -h, --help            Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  npm run validate:production                    # Run all tests');
    console.log('  npm run validate:production -- --critical-only # Run only critical tests');
    console.log('  npm run validate:production -- --parallel      # Run tests in parallel');
    return;
  }

  const runner = new ValidationRunner({ criticalOnly, parallel });
  const success = await runner.run();

  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation runner failed:', error);
    process.exit(1);
  });
}

export { ValidationRunner, TEST_SUITES };
