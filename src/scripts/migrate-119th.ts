#!/usr/bin/env tsx
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Migration Script: Migrate to 119th Congress Data
 *
 * This script migrates all congressional data to the 119th Congress (2025-2027)
 * by clearing outdated caches and validating current data sources.
 */

/* eslint-disable no-console */

import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../lib/logging/simple-logger';

const execAsync = promisify(exec);

interface MigrationResult {
  step: string;
  success: boolean;
  message: string;
  details?: unknown;
}

class Congress119Migrator {
  private results: MigrationResult[] = [];

  async migrate(): Promise<void> {
    console.log('🚀 Starting migration to 119th Congress...\n');

    await this.clearCaches();
    await this.validateDataSources();
    await this.updateConfiguration();
    await this.verifyMigration();

    this.printSummary();
  }

  private async clearCaches(): Promise<void> {
    console.log('🧹 Clearing outdated caches...');

    try {
      // Clear Redis caches with 118th Congress patterns
      await this.runCommand(
        'redis-cli --scan --pattern "*118*" | xargs -r redis-cli del',
        'Clear 118th Congress Redis keys'
      );

      await this.runCommand(
        'redis-cli --scan --pattern "*2023*" | xargs -r redis-cli del',
        'Clear 2023 dated Redis keys'
      );

      await this.runCommand(
        'redis-cli --scan --pattern "*2024*" | xargs -r redis-cli del',
        'Clear 2024 dated Redis keys'
      );

      this.recordResult('Clear Caches', true, 'Successfully cleared outdated caches');
    } catch (error) {
      this.recordResult(
        'Clear Caches',
        false,
        `Failed to clear caches: ${(error as Error).message}`
      );
    }
  }

  private async validateDataSources(): Promise<void> {
    console.log('📊 Validating data sources for 119th Congress...');

    const requiredEnvVars = ['CONGRESS_API_KEY', 'CENSUS_API_KEY', 'FEC_API_KEY'];

    const missingVars: string[] = [];
    for (const varName of requiredEnvVars) {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    }

    if (missingVars.length > 0) {
      this.recordResult(
        'Validate Environment',
        false,
        `Missing environment variables: ${missingVars.join(', ')}`
      );
    } else {
      this.recordResult('Validate Environment', true, 'All required environment variables present');
    }

    // Test API connections (basic connectivity)
    await this.testApiConnections();
  }

  private async testApiConnections(): Promise<void> {
    const apis = [
      {
        name: 'Congress.gov',
        url:
          'https://api.congress.gov/v3/member?api_key=' + process.env.CONGRESS_API_KEY + '&limit=1',
        required: true,
      },
      {
        name: 'Census Bureau',
        url: 'https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=1600+Pennsylvania+Avenue+Washington+DC&benchmark=Public_AR_Current&vintage=Current_Current&format=json',
        required: true,
      },
      {
        name: 'FEC',
        url:
          'https://api.open.fec.gov/v1/candidates/?api_key=' +
          process.env.FEC_API_KEY +
          '&per_page=1',
        required: true,
      },
    ];

    for (const api of apis) {
      try {
        const response = await fetch(api.url, {
          headers: {
            'User-Agent': 'CIV.IQ/1.0 (Migration Script)',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        if (response.ok) {
          this.recordResult(`Test ${api.name} API`, true, `${api.name} API is accessible`);
        } else {
          this.recordResult(
            `Test ${api.name} API`,
            false,
            `${api.name} API returned status ${response.status}`
          );
        }
      } catch (error) {
        this.recordResult(
          `Test ${api.name} API`,
          api.required ? false : true,
          `${api.name} API error: ${(error as Error).message}`
        );
      }
    }
  }

  private async updateConfiguration(): Promise<void> {
    console.log('⚙️  Updating configuration for 119th Congress...');

    try {
      // Set current congress environment variable
      process.env.CURRENT_CONGRESS = '119';
      process.env.CONGRESS_START_DATE = '2025-01-03';
      process.env.CONGRESS_END_DATE = '2027-01-03';

      this.recordResult('Update Configuration', true, 'Configuration updated for 119th Congress');
    } catch (error) {
      this.recordResult(
        'Update Configuration',
        false,
        `Failed to update configuration: ${(error as Error).message}`
      );
    }
  }

  private async verifyMigration(): Promise<void> {
    console.log('✅ Verifying migration...');

    try {
      // Count successful steps
      const successfulSteps = this.results.filter(r => r.success).length;
      const totalSteps = this.results.length;

      if (successfulSteps === totalSteps) {
        this.recordResult(
          'Migration Verification',
          true,
          `All ${totalSteps} migration steps completed successfully`
        );
      } else {
        const failedSteps = totalSteps - successfulSteps;
        this.recordResult(
          'Migration Verification',
          false,
          `${failedSteps} out of ${totalSteps} steps failed`
        );
      }
    } catch (error) {
      this.recordResult(
        'Migration Verification',
        false,
        `Verification failed: ${(error as Error).message}`
      );
    }
  }

  private async runCommand(command: string, description: string): Promise<void> {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && stderr.trim()) {
        console.warn(`Warning from ${description}: ${stderr}`);
      }
      logger.info(`Command succeeded: ${description}`, { stdout: stdout.trim() });
    } catch (error) {
      logger.error(`Command failed: ${description}`, { error: error as Error });
      throw error;
    }
  }

  private recordResult(step: string, success: boolean, message: string, details?: unknown): void {
    this.results.push({ step, success, message, details });

    const icon = success ? '✅' : '❌';
    console.log(`  ${icon} ${step}: ${message}`);

    if (!success) {
      logger.error(`Migration step failed: ${step}`, { message, details });
    } else {
      logger.info(`Migration step completed: ${step}`, { message });
    }
  }

  private printSummary(): void {
    console.log('\n📋 Migration Summary');
    console.log('═'.repeat(50));

    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);

    console.log(`✅ Successful steps: ${successful.length}`);
    console.log(`❌ Failed steps: ${failed.length}`);
    console.log(`📊 Total steps: ${this.results.length}`);

    if (failed.length > 0) {
      console.log('\n❌ Failed Steps:');
      failed.forEach(result => {
        console.log(`  • ${result.step}: ${result.message}`);
      });

      console.log('\n🔧 Recommended Actions:');
      console.log('  1. Check environment variables in .env.local');
      console.log('  2. Verify API keys are valid for 119th Congress');
      console.log('  3. Ensure Redis is running and accessible');
      console.log('  4. Check network connectivity to government APIs');
    } else {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n🚀 Next Steps:');
      console.log('  1. Restart the application');
      console.log('  2. Clear browser cache');
      console.log('  3. Verify all pages show 119th Congress data');
      console.log('  4. Run integration tests if available');
    }

    console.log('\n📝 For more details, check the application logs.');
  }
}

// Run migration if called directly
if (require.main === module) {
  const migrator = new Congress119Migrator();
  migrator.migrate().catch(error => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { Congress119Migrator };
