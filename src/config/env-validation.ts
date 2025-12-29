/**
 * Environment Variable Validation
 * Validates critical environment variables at startup
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  requiredInProduction: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  {
    name: 'CONGRESS_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Congress.gov API key for bills, votes, and member data',
  },
  {
    name: 'FEC_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'FEC API key for campaign finance data',
  },
  {
    name: 'OPENSTATES_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'OpenStates API key for state legislature data',
  },
  {
    name: 'CENSUS_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Census Bureau API key for demographic data',
  },
  {
    name: 'CACHE_WARM_SECRET',
    required: false,
    requiredInProduction: true,
    description: 'Secret token for cache warming endpoint',
  },
  {
    name: 'ADMIN_API_KEY',
    required: false,
    requiredInProduction: true,
    description: 'Admin API key for administrative endpoints',
  },
];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 * Returns validation result with errors and warnings
 */
export function validateEnvironment(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    const isDefined = value !== undefined && value !== '';

    if (!isDefined) {
      if (envVar.required) {
        errors.push(
          `Missing required environment variable: ${envVar.name} - ${envVar.description}`
        );
      } else if (envVar.requiredInProduction && isProduction) {
        errors.push(
          `Missing production-required environment variable: ${envVar.name} - ${envVar.description}`
        );
      } else if (envVar.requiredInProduction) {
        warnings.push(
          `Missing recommended environment variable: ${envVar.name} - ${envVar.description}`
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Log environment validation results
 * Call this at application startup
 */
export function logEnvironmentValidation(): void {
  const result = validateEnvironment();
  const isProduction = process.env.NODE_ENV === 'production';

  if (result.errors.length > 0) {
    // eslint-disable-next-line no-console
    console.error('❌ Environment validation failed:');
    result.errors.forEach(error => {
      // eslint-disable-next-line no-console
      console.error(`  - ${error}`);
    });

    if (isProduction) {
      // eslint-disable-next-line no-console
      console.error('\n⚠️  Application may not function correctly in production!\n');
    }
  }

  if (result.warnings.length > 0 && !isProduction) {
    // eslint-disable-next-line no-console
    console.warn('⚠️  Environment warnings (not blocking in development):');
    result.warnings.forEach(warning => {
      // eslint-disable-next-line no-console
      console.warn(`  - ${warning}`);
    });
  }

  if (result.isValid && result.warnings.length === 0) {
    // eslint-disable-next-line no-console
    console.log('✅ Environment validation passed');
  }
}

/**
 * Check if a specific environment variable is configured
 */
export function isEnvConfigured(name: string): boolean {
  const value = process.env[name];
  return value !== undefined && value !== '';
}
