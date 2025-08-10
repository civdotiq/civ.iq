#!/usr/bin/env tsx
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data Validation Script for 119th Congress
 *
 * This script validates all data sources to ensure they're properly configured
 * for the 119th Congress (2025-2027) session.
 */

/* eslint-disable no-console */

import { dataValidator } from '../lib/data-validation';
import logger from '../lib/logging/simple-logger';

interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  sources: string[];
  issues: Array<{
    type: 'error' | 'warning';
    source: string;
    message: string;
  }>;
}

class DataValidationRunner {
  private summary: ValidationSummary = {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    sources: [],
    issues: [],
  };

  async run(): Promise<void> {
    console.log('🔍 Starting data validation for 119th Congress...\n');

    await this.validateEnvironmentVariables();
    await this.validateApiConnections();
    await this.validateSampleData();
    await this.generateReport();

    this.printSummary();
  }

  private async validateEnvironmentVariables(): Promise<void> {
    console.log('🔧 Validating environment variables...');

    const requiredVars = ['CONGRESS_API_KEY', 'CENSUS_API_KEY', 'FEC_API_KEY'];

    const optionalVars = [
      'CURRENT_CONGRESS',
      'CONGRESS_START_DATE',
      'CONGRESS_END_DATE',
      'OPENSTATES_API_KEY',
      'OPENAI_API_KEY',
    ];

    this.summary.totalChecks += requiredVars.length + optionalVars.length;

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.recordIssue(
          'error',
          'environment',
          `Missing required environment variable: ${varName}`
        );
        this.summary.failed++;
      } else {
        console.log(`  ✅ ${varName}: Present`);
        this.summary.passed++;
      }
    }

    for (const varName of optionalVars) {
      if (!process.env[varName]) {
        this.recordIssue(
          'warning',
          'environment',
          `Optional environment variable not set: ${varName}`
        );
        this.summary.warnings++;
      } else {
        console.log(`  ✅ ${varName}: ${process.env[varName]}`);
        this.summary.passed++;
      }
    }

    // Validate 119th Congress configuration
    const currentCongress = process.env.CURRENT_CONGRESS;
    if (currentCongress && currentCongress !== '119') {
      this.recordIssue(
        'error',
        'environment',
        `CURRENT_CONGRESS should be 119, got ${currentCongress}`
      );
      this.summary.failed++;
    } else if (currentCongress === '119') {
      console.log('  ✅ CURRENT_CONGRESS: Correctly set to 119');
      this.summary.passed++;
    }

    this.summary.totalChecks++;
  }

  private async validateApiConnections(): Promise<void> {
    console.log('\n🌐 Testing API connections...');

    const apis = [
      {
        name: 'Congress.gov',
        url: `https://api.congress.gov/v3/member?api_key=${process.env.CONGRESS_API_KEY}&limit=1`,
        source: 'congress-api',
      },
      {
        name: 'Census Bureau',
        url: 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=1600+Pennsylvania+Avenue+Washington+DC&benchmark=Public_AR_Current&vintage=Current_Current&format=json',
        source: 'census-api',
      },
      {
        name: 'FEC',
        url: `https://api.open.fec.gov/v1/candidates/?api_key=${process.env.FEC_API_KEY}&per_page=1`,
        source: 'fec-api',
      },
    ];

    this.summary.totalChecks += apis.length;

    for (const api of apis) {
      try {
        const response = await fetch(api.url, {
          headers: {
            'User-Agent': 'CIV.IQ/1.0 (Data Validation)',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          console.log(`  ✅ ${api.name}: Connection successful (${response.status})`);
          this.summary.passed++;
          this.summary.sources.push(api.source);
        } else {
          this.recordIssue(
            'error',
            api.source,
            `${api.name} API returned status ${response.status}`
          );
          this.summary.failed++;
        }
      } catch (error) {
        this.recordIssue(
          'error',
          api.source,
          `${api.name} API connection failed: ${(error as Error).message}`
        );
        this.summary.failed++;
      }
    }
  }

  private async validateSampleData(): Promise<void> {
    console.log('\n📊 Validating sample data for 119th Congress...');

    // Sample representative data
    const sampleRepData = {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'Democratic',
      state: 'CA',
      chamber: 'House',
      congress: 119,
    };

    this.summary.totalChecks++;
    const repValidation = dataValidator.validate119thCongress(sampleRepData);

    if (repValidation.isValid) {
      console.log(
        `  ✅ Representative data validation passed (${repValidation.confidence}% confidence)`
      );
      this.summary.passed++;
    } else {
      repValidation.errors.forEach(error => this.recordIssue('error', 'data-validation', error));
      this.summary.failed++;
    }

    repValidation.warnings.forEach(warning =>
      this.recordIssue('warning', 'data-validation', warning)
    );

    // Sample finance data
    const sampleFinanceData = {
      candidate_id: 'H6CA12148',
      total_receipts: 1000000,
      total_disbursements: 800000,
      cash_on_hand: 200000,
      coverage_start_date: '2025-01-01',
      coverage_end_date: '2025-12-31',
    };

    this.summary.totalChecks++;
    const financeValidation = dataValidator.validateFinanceData(sampleFinanceData, 'fec-api');

    if (financeValidation.isValid) {
      console.log(
        `  ✅ Finance data validation passed (${financeValidation.confidence}% confidence)`
      );
      this.summary.passed++;
    } else {
      financeValidation.errors.forEach(error =>
        this.recordIssue('error', 'data-validation', error)
      );
      this.summary.failed++;
    }

    // Sample news data
    const sampleNewsData = {
      title: 'House Passes Important Legislation for 119th Congress',
      url: 'https://example.com/news/article',
      source: 'Reuters',
      publishedDate: new Date().toISOString(),
      description: 'Sample news article description',
    };

    this.summary.totalChecks++;
    const newsValidation = dataValidator.validateNewsData(sampleNewsData, 'gdelt-api');

    if (newsValidation.isValid) {
      console.log(`  ✅ News data validation passed (${newsValidation.confidence}% confidence)`);
      this.summary.passed++;
    } else {
      newsValidation.errors.forEach(error => this.recordIssue('error', 'data-validation', error));
      this.summary.failed++;
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n📋 Generating data quality report...');

    const report = dataValidator.generateQualityReport(this.summary.sources);

    console.log(`  📊 Total validations: ${report.totalRecords}`);
    console.log(`  ✅ Valid records: ${report.validRecords}`);
    console.log(`  ❌ Error rate: ${report.errorRate.toFixed(1)}%`);
    console.log(`  🎯 Average confidence: ${report.averageConfidence.toFixed(1)}%`);

    if (report.commonIssues.length > 0) {
      console.log('\n  🔍 Common issues found:');
      report.commonIssues.slice(0, 5).forEach(issue => {
        console.log(`    • ${issue.type}: ${issue.count} occurrences`);
      });
    }
  }

  private recordIssue(type: 'error' | 'warning', source: string, message: string): void {
    this.summary.issues.push({ type, source, message });

    const icon = type === 'error' ? '❌' : '⚠️';
    console.log(`  ${icon} ${source}: ${message}`);

    if (type === 'error') {
      logger.error(`Validation error in ${source}`, { message });
    } else {
      logger.warn(`Validation warning in ${source}`, { message });
    }
  }

  private printSummary(): void {
    console.log('\n📋 Validation Summary');
    console.log('═'.repeat(50));

    console.log(`🔍 Total checks: ${this.summary.totalChecks}`);
    console.log(`✅ Passed: ${this.summary.passed}`);
    console.log(`❌ Failed: ${this.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.summary.warnings}`);

    const successRate =
      this.summary.totalChecks > 0
        ? ((this.summary.passed / this.summary.totalChecks) * 100).toFixed(1)
        : '0';

    console.log(`📊 Success rate: ${successRate}%`);

    if (this.summary.failed > 0) {
      console.log('\n❌ Critical Issues:');
      this.summary.issues
        .filter(issue => issue.type === 'error')
        .forEach(issue => {
          console.log(`  • ${issue.source}: ${issue.message}`);
        });

      console.log('\n🔧 Recommended Actions:');
      console.log('  1. Check .env.local file for missing API keys');
      console.log('  2. Verify API keys are valid and active');
      console.log('  3. Check network connectivity to government APIs');
      console.log('  4. Review data formats and validation rules');
    } else if (this.summary.warnings > 0) {
      console.log('\n⚠️  Warnings (non-critical):');
      this.summary.issues
        .filter(issue => issue.type === 'warning')
        .forEach(issue => {
          console.log(`  • ${issue.source}: ${issue.message}`);
        });
    }

    if (this.summary.failed === 0 && this.summary.warnings === 0) {
      console.log('\n🎉 All validations passed successfully!');
      console.log('✨ Your data sources are ready for 119th Congress.');
    }

    console.log('\n📝 For detailed logs, check the application log files.');
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new DataValidationRunner();
  validator.run().catch(error => {
    console.error('❌ Data validation failed:', error);
    process.exit(1);
  });
}

export { DataValidationRunner };
